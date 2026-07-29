-- 0012_creator_brand_outreach.sql
-- The creator's own log of brand outreach they have MARKED as sent.
--
-- Why: the outreach tool (app/creator-dashboard/outreach) drafts a
-- three-message sequence per brand — first contact, then two follow-ups
-- spaced 5-7 days apart. Without a record, a creator returning a week later
-- has no way to know which brands they already wrote to, or which step they
-- reached, and the whole point of a sequence is that it is spaced out over
-- weeks rather than done in one sitting.
--
-- MARKED as sent, not sent. Nothing here is observed: the creator copies a
-- message into Instagram themselves, and we never see whether they pasted it.
-- Every column name and every string in the UI says "marked" for that reason.
--
-- APPEND-ONLY, never upserted. One row per message per handle per marking.
-- A creator may legitimately send step 1 to a brand's global account and again
-- to its regional one, or re-send after a gap — collapsing those onto one row
-- would destroy exactly the history this table exists to keep. That is also why
-- there is no unique constraint on the index below.
--
-- NOT the same thing as creator_outreach (0008), despite the name. That table
-- tracks the founder DMing CREATORS from /admin/targeting — the opposite
-- direction, one upserted row per creator. This table is creator -> brand.
--
-- No foreign keys, deliberately, and the same reasoning as funnel_events
-- (0011): an FK to creator_profiles would let a profile deletion cascade away
-- the outreach history, and canonical_name is a brand_aliases/brand_brackets
-- value that is recomputed by hand (`npm run refresh:brand-brackets`) — a brand
-- dropping out of the bracket cache must not delete the creator's record of
-- having written to it.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0011. Already applied by hand.
-- Idempotent: safe to rerun (IF NOT EXISTS throughout). gen_random_uuid() is
-- built into Postgres 13+, so no pgcrypto extension is needed on Supabase.

create table if not exists creator_brand_outreach (
  id                 uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null,
  canonical_name     text not null,
  brand_handle       text,
  sequence_step      smallint not null,
  locale             text,
  marked_sent_at     timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- The only read the app does: "what has this creator already marked for this
-- brand, and to which handle". Deliberately NOT unique — see the append-only
-- note in the header.
create index if not exists idx_creator_brand_outreach_lookup
  on creator_brand_outreach (creator_profile_id, canonical_name, brand_handle);

-- Same lockdown philosophy as brand_brackets (0007), creator_outreach (0008)
-- and funnel_events (0011): RLS enabled with deliberately NO policies. With RLS
-- on and no policies, PostgREST denies all access to anon/authenticated
-- callers, so only the service-role client can read or write — exclusively via
-- app/api/creator/outreach/route.ts, which resolves the caller's own
-- creator_profiles row from their session first and scopes every query to it.
alter table creator_brand_outreach enable row level security;

comment on table creator_brand_outreach is
  'Creator -> brand outreach the creator has MARKED as sent, one append-only row per message per handle. Not observed: we never see whether the message was actually sent. Written via app/api/creator/outreach/route.ts. NOT creator_outreach (0008), which is the founder DMing creators. RLS enabled with no policies: service-role only.';
comment on column creator_brand_outreach.creator_profile_id is
  'creator_profiles.id, i.e. the auth user id — that table''s primary key, so it is unique by construction. Deliberately no FK (see file header).';
comment on column creator_brand_outreach.canonical_name is
  'brand_aliases.canonical_name / brand_brackets.canonical_name for the brand written to. A name rather than an id because the brand side has no id — brand_brackets is keyed on (canonical_name, platform).';
comment on column creator_brand_outreach.brand_handle is
  'The brand Instagram handle the message was addressed to (brand_aliases.alias, normalized: trimmed, leading @ stripped, lowercased). Null when the brand has no verified alias, or when the creator marked a message without picking one. 84.6%% of brands have exactly one; one has 22.';
comment on column creator_brand_outreach.sequence_step is
  '1 = first contact, 2 = first follow-up (5-7 days later), 3 = second follow-up (5-7 days after that, then stop). Constrained in app code rather than by a CHECK, so adding a step later is a deploy and not a manual migration.';
comment on column creator_brand_outreach.locale is
  'Locale the marked message was generated in: en, es, or NULL (unknown, read as en) — same convention as creator_profiles.locale (0009) and funnel_events.locale (0011). Chosen per message, so it may differ from the creator''s stored locale.';
comment on column creator_brand_outreach.marked_sent_at is
  'When the creator marked it. Server default now(), never set by the app: the two hosts (Vercel and the VPS) do not share a clock.';
