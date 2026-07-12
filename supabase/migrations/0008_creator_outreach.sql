-- Outreach-tracking table for the admin creator-targeting panel
-- (app/admin/targeting). Records which creators the founder has manually
-- DMed. Deliberately does NOT store claim status — "claimed" is derived live
-- from whether a creator_profiles row exists for the creator; the admin
-- never sets it here.
--
-- Same lockdown philosophy as brand_brackets (0007_brand_brackets.sql): RLS
-- enabled with NO policies. With RLS on and no policies, PostgREST denies
-- all access to anon/authenticated callers by default, so only the
-- service-role client (lib/supabase-admin.ts's createSupabaseAdminClient())
-- can read or write this table — exclusively via app/api/admin/targeting/*
-- route handlers, which re-check admin auth themselves before touching it.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0007. Idempotent: safe to rerun
-- (IF NOT EXISTS throughout).

create table if not exists creator_outreach (
  creator_id uuid primary key references creators(id) on delete cascade,
  status     text not null default 'not_contacted' check (status in ('not_contacted', 'dmed')),
  dmed_at    timestamptz,
  dmed_by    uuid references auth.users(id),
  notes      text,
  updated_at timestamptz not null default now()
);

alter table creator_outreach enable row level security;

comment on table creator_outreach is
  'Manual outreach-tracking flag for the admin creator-targeting panel (/admin/targeting) — records who the founder has DMed. Claim status is NOT stored here; it is derived live from whether a creator_profiles row exists for the creator. RLS enabled with no policies: only the service-role client can read/write, via app/api/admin/targeting/* route handlers.';
comment on column creator_outreach.status is
  'not_contacted (default) or dmed. Deliberately minimal for MVP — richer states (responded/declined) were considered and left out; extend the check constraint if needed later.';
comment on column creator_outreach.dmed_at is
  'Set when status transitions to dmed. Null while not_contacted.';
comment on column creator_outreach.dmed_by is
  'auth.users.id of the admin who marked this creator DMed.';
comment on column creator_outreach.notes is
  'Optional free-text admin notes (e.g. which platform the DM was sent on, follow-up reminders).';
