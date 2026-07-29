-- 0013_funnel_events_outreach_types.sql
-- Extends funnel_events.event_type to cover the creator outreach tool.
--
-- 0011 created the column with a CHECK listing the four claim-funnel events,
-- and its own column comment says the constraint and lib/funnel/events.ts's
-- FunnelEventType are meant to move together. This is that move: three new
-- values for app/creator-dashboard/outreach.
--
--   outreach_opened     — the tool opened for a specific brand. Fired once per
--                         brand, not once per render.
--   message_copied      — a message copied to the clipboard. NOT a send: the
--                         creator may copy and never paste.
--   message_marked_sent — the creator marked a message as sent, alongside the
--                         creator_brand_outreach row (0012). Still not
--                         observed — see that file's header.
--
-- Same non-sessionised design as the rest of the table: these count events, not
-- people. Per-brand and per-step context goes in `details`, which is already
-- jsonb and already unindexed.
--
-- Already applied by hand 2026-07-29, ahead of this code shipping. The reverse
-- order is also safe and was the assumption this was written under: with the
-- constraint not yet widened, the three new event types simply fail it on
-- insert, lib/funnel/events.ts logs that in its warned branch and continues,
-- and the outreach tool works either way. It is instrumentation, and
-- instrumentation must never be a dependency of the surface it measures.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0012. Idempotent: safe to rerun. Drop and
-- recreate is the only way to widen a CHECK; funnel_events_event_type_check is
-- the name Postgres generated for the inline constraint in 0011.

alter table funnel_events
  drop constraint if exists funnel_events_event_type_check;

alter table funnel_events
  add constraint funnel_events_event_type_check
  check (event_type in (
    'teaser_viewed',
    'signup_arrived',
    'claim_completed',
    'verified',
    'outreach_opened',
    'message_copied',
    'message_marked_sent'
  ));

comment on column funnel_events.event_type is
  'Claim funnel: teaser_viewed, signup_arrived, claim_completed, verified. Creator outreach (0013): outreach_opened, message_copied, message_marked_sent. Extend the check constraint AND lib/funnel/events.ts''s FunnelEventType together — the two are meant to stay in lockstep.';
