-- Adds the missing UPDATE policy for brand_reports.
--
-- The admin editor's "Save changes" (competitor_names / excluded_creator_ids
-- / pinned_creator_ids, added in brand-reports-v2) is the first-ever UPDATE
-- this table has needed — brand_reports previously only saw SELECT, INSERT,
-- and DELETE from the admin page, and apparently only those got a policy
-- when RLS was set up (directly in Supabase Studio; there's no earlier
-- migration for this table in this repo). Without an UPDATE policy, Postgres
-- RLS denies the operation by default: PostgREST doesn't error in that case,
-- it just matches zero rows, so every "Save changes" click has been
-- silently no-op-ing — the toast says "Report updated," the admin UI's own
-- local state updates optimistically, but the database row never changes.
-- That's the real cause of "I added a competitor and saved, but the public
-- report still shows the old list" — not a Tier 2 creator-count floor
-- leaking into the render path (confirmed it isn't; see
-- lib/reports/brand-activity.ts's getCompetitorActivities).
--
-- Deliberately NOT touching `enable row level security` here — if
-- brand_reports doesn't already have RLS enabled, adding a policy alone is a
-- harmless no-op (Postgres only enforces policies on tables with RLS turned
-- on). Blindly enabling RLS on a table whose other policies (or lack
-- thereof) haven't been fully audited here risks locking out the public
-- /report/[slug] page's anonymous SELECT or the admin page's existing
-- INSERT/DELETE. If it turns out RLS is currently off, this policy has no
-- effect and that's a separate, deliberate decision to make later.
--
-- No migration runner exists in this repo — apply this file manually via
-- the Supabase SQL editor, same as 0001/0002/0003. Idempotent: safe to
-- rerun (DROP POLICY IF EXISTS first).

drop policy if exists "Admins can update brand_reports" on brand_reports;
create policy "Admins can update brand_reports"
  on brand_reports for update
  to authenticated
  using (is_admin_user())
  with check (is_admin_user());
