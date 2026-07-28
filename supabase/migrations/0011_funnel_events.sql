-- 0011_funnel_events.sql
-- First-party claim-funnel instrumentation: one row per captured funnel event.
--
-- Why: before running a real DM batch there is no way to answer "of the
-- creators I DMed, how many opened the teaser, and how many finished a claim".
-- Nothing in the schema records a view or a step. activity_log is the admin
-- audit feed, written client-side with the anon key from four call sites, and
-- creator_outreach (0008) records only that a DM was sent — one upserted row
-- per creator, no history. This table is the missing middle.
--
-- FOUR events, deliberately: teaser_viewed, signup_arrived, claim_completed,
-- verified. The creator-dashboard surface is about to be rebuilt, so it is not
-- instrumented here. 'signup_arrived' is named for what is actually observable
-- server-side — the four CTAs on the teaser all point at the same href, so no
-- server-side capture can attribute a click to a specific control.
--
-- Deliberately NOT sessionised: teaser_viewed counts RENDERS, not people.
-- There is no session id and no cookie, because the ratio this exists to serve
-- is "DMs sent (creator_outreach) -> claims completed", and that denominator
-- does not need one. Reload noise is accepted; cookies for anonymous visitors
-- were not. Do not add a session column without revisiting that decision.
--
-- Join keys: `handle` pre-claim (the only identifier a teaser visitor has, and
-- normalized by the writer to match social_profiles.handle), `creator_profile_id`
-- post-claim. creator_profile_id is the auth user id and is creator_profiles'
-- PRIMARY KEY, so it is the trustworthy side of the join. `creator_id` is
-- carried as a secondary dimension, for joining back to creator_outreach.
--
-- Nullable everywhere past the first three columns, and NO foreign keys. Both
-- are deliberate: rows are written fire-and-forget off the request path
-- (lib/funnel/events.ts). A funnel row must never be the reason a teaser
-- render, a claim, or a verification fails — and an FK to creators or
-- creator_profiles could do exactly that, besides cascading away the
-- teaser_viewed rows for a handle that is later deleted, which are precisely
-- the rows a funnel needs to keep.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0010. Idempotent: safe to rerun
-- (IF NOT EXISTS throughout). gen_random_uuid() is built into Postgres 13+,
-- so no pgcrypto extension is needed on Supabase.

create table if not exists funnel_events (
  id                 uuid primary key default gen_random_uuid(),
  event_type         text not null check (event_type in ('teaser_viewed', 'signup_arrived', 'claim_completed', 'verified')),
  occurred_at        timestamptz not null default now(),
  handle             text,
  creator_id         uuid,
  creator_profile_id uuid,
  locale             text,
  user_agent         text,
  is_bot             boolean not null default false,
  teaser_variant     text check (teaser_variant in ('full', 'zero_match')),
  details            jsonb
);

-- The primary funnel query: count by step over a date range, humans only.
-- Partial on is_bot = false because that is the only side anyone counts —
-- bot rows are kept for auditing the classifier, never for the numerator.
create index if not exists idx_funnel_events_type_occurred
  on funnel_events (event_type, occurred_at desc)
  where is_bot = false;

-- "What happened to @handle" — the pre-claim walk, and the only way to join a
-- teaser_viewed to anything, since it has no creator_profile_id yet.
create index if not exists idx_funnel_events_handle
  on funnel_events (handle)
  where handle is not null;

-- Joining the post-claim half back to creator_outreach / creators.
create index if not exists idx_funnel_events_creator_id
  on funnel_events (creator_id)
  where creator_id is not null;

-- Same lockdown philosophy as brand_brackets (0007) and creator_outreach
-- (0008): RLS enabled with deliberately NO policies. With RLS on and no
-- policies, PostgREST denies all access to anon/authenticated callers, so only
-- the service-role client can read or write this table. That matters more here
-- than elsewhere — an anon-writable event table is a funnel anyone can forge,
-- which is exactly the flaw that rules activity_log out for this purpose.
alter table funnel_events enable row level security;

comment on table funnel_events is
  'First-party claim-funnel events: teaser_viewed, signup_arrived, claim_completed, verified. Written server-side and fire-and-forget by lib/funnel/events.ts. Not sessionised — teaser_viewed counts renders, not people. RLS enabled with no policies: service-role only.';
comment on column funnel_events.event_type is
  'One of teaser_viewed, signup_arrived, claim_completed, verified. Extend the check constraint AND lib/funnel/events.ts''s FunnelEventType together — the two are meant to stay in lockstep.';
comment on column funnel_events.occurred_at is
  'Server default now(), never set by the app: the writer runs after the response on both Vercel and the VPS, and a client- or edge-supplied timestamp would carry that skew into the data.';
comment on column funnel_events.handle is
  'Normalized creator handle (trimmed, leading @ stripped, lowercased) — matches social_profiles.handle. The only identifier a pre-claim teaser visitor has. Null for events where the handle is unknown.';
comment on column funnel_events.creator_id is
  'creators.id when known. Secondary dimension only, for joining to creator_outreach — NOT the join key. Deliberately no FK (see file header).';
comment on column funnel_events.creator_profile_id is
  'creator_profiles.id, i.e. the auth user id. THE post-claim join key: it is that table''s primary key, so it is unique by construction. Null pre-claim.';
comment on column funnel_events.locale is
  'UI locale the creator was shown: en, es, or NULL (unknown, read as en) — same convention as creator_profiles.locale (0009).';
comment on column funnel_events.user_agent is
  'Raw request user-agent, kept so is_bot can be re-derived if the classifier changes. Null when the request sent none.';
comment on column funnel_events.is_bot is
  'Classified from user_agent alone (lib/funnel/bot-detection.ts) — the one signal identical on Vercel and the VPS. Instagram''s link preview crawler (facebookexternalhit) hits every DMed teaser link and is the reason this column exists. A missing user-agent is classified NOT a bot, so a proxy that strips the header degrades to over-counting rather than silently zeroing real traffic.';
comment on column funnel_events.teaser_variant is
  'full or zero_match — which of the two teaser states rendered. Null for non-teaser events. The two convert differently, so a blended teaser_viewed number hides more than it shows.';
comment on column funnel_events.details is
  'Free-form per-event context, e.g. {"path":"auto_email_match"} distinguishing the two routes to verified. Deliberately unindexed.';
