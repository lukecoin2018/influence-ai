-- 0019_funnel_events_nudge_sent.sql
-- Extends funnel_events.event_type with the expired-code nudge.
--
-- STATUS: NOT YET APPLIED. Lukas applies this by hand in the Supabase SQL
-- editor, after 0018; update this header with the date once it is live.
--
--   nudge_sent — /api/cron/verification-nudge claimed and attempted the
--                one-time "your code expired" email for a pending profile.
--                Fired once per attempt, whether or not Resend accepted it;
--                details carries { email: 'sent' | 'failed' }. Putting it on
--                this table rather than only on activity_log is what makes
--                "did nudged creators go on to verify" a single query joined
--                on creator_profile_id.
--
-- Same lockstep rule as 0011 and 0013: the CHECK here and FunnelEventType in
-- lib/funnel/events.ts move together. Until this is applied the insert fails
-- the constraint, lib/funnel/events.ts warns and continues, and the nudge
-- itself is unaffected — activity_log still has the audit row.
--
-- Drop and recreate is the only way to widen a CHECK;
-- funnel_events_event_type_check is the name 0013 gave it.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0018. Idempotent: safe to rerun.

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
    'message_marked_sent',
    'nudge_sent'
  ));

comment on column funnel_events.event_type is
  'Claim funnel: teaser_viewed, signup_arrived, claim_completed, verified. Creator outreach (0013): outreach_opened, message_copied, message_marked_sent. Expired-code nudge (0019): nudge_sent. Extend the check constraint AND lib/funnel/events.ts''s FunnelEventType together — the two are meant to stay in lockstep.';
