-- 0022_creator_requests.sql
--
-- STATUS: APPLIED 2026-09-22, by hand in the Supabase SQL editor, and verified
-- there: the partial unique index rejected a second open request for the same
-- handle with 23505 and accepted one after the first was declined, and an
-- anon-key select returns zero rows.
--
-- Creators asking to be ADDED to the database — the other end of the claim
-- funnel. Before this, a creator whose handle we had not scraped reached the
-- signup form, was told "we'll add you and notify you when your profile is
-- ready", and nothing happened: there was no notification system and nothing
-- recorded the request. This table is what records it.
--
-- Instagram only for now. The `platform` column exists, defaults to
-- 'instagram' and is part of the unique index, but the form's TikTok option
-- is disabled and the route rejects anything else — TikTok verification has
-- never run successfully (CLAUDE.md, "Known open items"), so inviting TikTok
-- creators in would fill the queue with people we cannot finish serving.
--
-- ── WHAT WRITES HERE ───────────────────────────────────────────────────────
--
--   app/api/creators/request/route.ts        public POST, service-role insert
--   app/api/admin/creator-requests/status/   owner-only Decline / Mark added
--   app/api/cron/verification-nudge/route.ts the auto-fulfil pass
--
-- All three are service_role. There is no client-side insert and no anon-key
-- write, same lockdown as funnel_events (0011) and creator_dashboard_events
-- (0020).
--
-- ── ONE OPEN REQUEST PER HANDLE ────────────────────────────────────────────
--
-- The unique index is PARTIAL, on status = 'new'. That is the whole point: a
-- handle may be requested again after a previous request was declined or
-- fulfilled (a declined creator can grow into the database; a fulfilled one
-- can be re-scraped), but only one request can be open at a time. A full
-- unique constraint would make the second request a permanent error.
--
-- The route relies on this rather than on a read-then-write check, so two
-- simultaneous submissions for the same handle cannot both insert: the loser
-- gets 23505 and is answered as "already requested".
--
-- ── ip_hash ────────────────────────────────────────────────────────────────
--
-- SHA-256 of the client IP, never the IP itself. It exists for one purpose —
-- the per-hour submission limit the route enforces by counting recent rows —
-- and a hash is enough for counting. Nullable, because a request that arrives
-- with no forwarding header at all is still a real creator asking to be
-- listed; the route logs that case and skips the limit for it rather than
-- bucketing every such request together under one shared key.
--
-- RLS: enabled, with one admin-only SELECT policy so /admin/creators can read
-- the queue from the browser under the admin's session. is_admin_user() is
-- the same predicate 0001, 0004, 0017 and 0020 use. No insert/update/delete
-- policy for anon or authenticated.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0021. Idempotent: safe to rerun.

create table if not exists creator_requests (
  id          uuid primary key default gen_random_uuid(),
  platform    text        not null default 'instagram',
  handle      text        not null,
  email       text        not null,
  note        text,
  status      text        not null default 'new',
  source      text        not null,
  ip_hash     text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  creator_id  uuid references creators(id)
);

-- new | added | declined. A CHECK rather than the TypeScript-union approach
-- 0020 took: unlike an event type, these three drive branching in the admin
-- route and in the cron pass, and a fourth value appearing silently would
-- make rows invisible to both.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_requests_status_check'
  ) then
    alter table creator_requests
      add constraint creator_requests_status_check
      check (status in ('new', 'added', 'declined'));
  end if;
end
$$;

-- One OPEN request per handle per platform. See the header.
create unique index if not exists idx_creator_requests_open_handle
  on creator_requests (platform, handle)
  where status = 'new';

-- The admin queue: status = 'new' first, oldest first within it.
create index if not exists idx_creator_requests_status_created
  on creator_requests (status, created_at desc);

-- The route's per-hour rate-limit count: one ip_hash over a recent window.
create index if not exists idx_creator_requests_ip_hash_created
  on creator_requests (ip_hash, created_at desc);

alter table creator_requests enable row level security;

drop policy if exists admins_can_read_creator_requests on creator_requests;
create policy admins_can_read_creator_requests
  on creator_requests for select to authenticated
  using (is_admin_user());

comment on table creator_requests is
  'Creators asking to be added to the database. Written only by service_role (app/api/creators/request, app/api/admin/creator-requests/status, the auto-fulfil pass in app/api/cron/verification-nudge). RLS: no write policy for anon/authenticated; one admin-only SELECT policy for /admin/creators.';
comment on column creator_requests.platform is
  'instagram only today. The column and the unique index are ready for tiktok; the route rejects it until TikTok verification works.';
comment on column creator_requests.handle is
  'Normalized the same way every other handle in this repo is: @ stripped, URL stripped, lowercased. Matches social_profiles.handle so the fulfil pass can join on it directly.';
comment on column creator_requests.status is
  'new | added | declined. Only new rows are unique per handle, and only new rows are considered by the fulfil pass.';
comment on column creator_requests.source is
  'Which entry point produced the request: signup_not_found | claim_not_found | footer | direct. Whitelisted in the route; anything else is stored as direct.';
comment on column creator_requests.ip_hash is
  'SHA-256 of the client IP, for the per-hour submission limit only. Never the IP itself. NULL when no forwarding header was present, in which case the limit was skipped for that request.';
comment on column creator_requests.creator_id is
  'Set by the fulfil pass when a creators row with this handle appears. NULL until then.';

-- ── VERIFICATION ───────────────────────────────────────────────────────────
--
-- READ THIS FIRST: step 3 below is SUPPOSED to raise an error. Every other
-- statement in this file must succeed, so an error there is a failure — but in
-- step 3 the error IS the passing result, and a silent success would mean the
-- partial unique index is not doing its job. Run the five steps ONE AT A TIME:
-- the SQL editor wraps a multi-statement run in a transaction, so pasting them
-- together rolls the whole sequence back on step 3's expected error and proves
-- nothing.
--
-- 1. MUST return exactly one row —
--      admins_can_read_creator_requests | SELECT | {authenticated}
--    select policyname, cmd, roles from pg_policies where tablename = 'creator_requests';
--
-- 2. MUST succeed:
--    insert into creator_requests (handle, email, source) values ('x', 'a@b.c', 'direct');
--
-- 3. MUST FAIL, with: 23505 duplicate key value violates unique constraint
--    "idx_creator_requests_open_handle". This is the passing result — one OPEN
--    request per handle. If it succeeds, the index is missing or not partial.
--    insert into creator_requests (handle, email, source) values ('x', 'a@b.c', 'direct');
--
-- 4. MUST succeed, both of them — a handle is requestable again once the
--    previous request is resolved, which is why the index is partial:
--    update creator_requests set status = 'declined' where handle = 'x';
--    insert into creator_requests (handle, email, source) values ('x', 'a@b.c', 'direct');
--
-- 5. Clean up. MUST remove the two rows steps 2 and 4 left behind:
--    delete from creator_requests where handle = 'x';
