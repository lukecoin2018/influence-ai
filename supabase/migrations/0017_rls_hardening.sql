-- 0017_rls_hardening.sql
--
-- STATUS: APPLIED (both sections). Confirmed live in production 2026-09-12
-- via pg_policies and pg_trigger. The ordering box below is kept as history.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  ORDER OF OPERATIONS — READ THIS FIRST                                   │
-- │                                                                          │
-- │  DEPLOY THE CODE FIRST. THEN APPLY THIS MIGRATION.                       │
-- │                                                                          │
-- │  Not the other way round. BOTH sections depend on code in the same       │
-- │  commit as this file. Applying either one against the previous build     │
-- │  breaks something that currently works:                                  │
-- │                                                                          │
-- │    A1 (the brand_profiles trigger) pins token_balance,                   │
-- │       directory_pages_used and profile_views_used. Until the new         │
-- │       lib/tokens.ts is live, those columns are written on the CALLER'S   │
-- │       OWN SESSION, so the trigger refuses them and token metering        │
-- │       fails — paginating /creators and every /api/tokens/spend call.     │
-- │       This was got wrong once, on 2026-08-24: A1 was applied before the  │
-- │       deploy and broke metering until the trigger was dropped again.     │
-- │                                                                          │
-- │    B1 drops a policy the currently deployed /api/match depends on, so    │
-- │       applying it before the new build is live breaks AI matching.       │
-- │                                                                          │
-- │  A2 and A3 are the only statements with no code dependency — they can    │
-- │  be applied at any time.                                                 │
-- │                                                                          │
-- │  If you need A1 off in a hurry, drop the trigger and leave the function: │
-- │    DROP TRIGGER IF EXISTS brand_profiles_protect_columns ON brand_profiles;│
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- ── NUMBERING COLLISION ────────────────────────────────────────────────────
--
-- 0017 was previously earmarked for the orphan-recovery migration — the one
-- that gives pending brand_profiles rows to the ~18 auth users stranded by the
-- broken signup between April and 2026-08-24. That work is NOT in this file and
-- has NOT been written. When it is, it takes 0018. Do not renumber this file.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
--
-- Measured on 2026-08-24 against the live policy catalogue; see the "Row-level
-- security — measured" section of CLAUDE.md for the full picture and the
-- queries that reproduce it. Four findings, all of them permissive policies
-- rather than absent RLS (RLS is enabled on all 28 tables).
--
-- The most serious one only became reachable on 2026-08-24, the day brand
-- signup started creating rows again after months of failing: with rows to own,
-- a brand could approve itself.


-- ═══════════════════════════════════════════════════════════════════════════
--   SECTION A — A1 NEEDS THE DEPLOY FIRST. A2 and A3 do not.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── A1. brand_profiles: pin the columns a brand must not write ─────────────
--
-- ORDERING: THIS STATEMENT NEEDS THE CODE DEPLOYED FIRST. It pins
-- token_balance, directory_pages_used and profile_views_used, and until the
-- lib/tokens.ts change in this same commit is live those columns are written on
-- the caller's own session — so this trigger refuses them and token metering
-- breaks. Applied ahead of the deploy on 2026-08-24 and did exactly that.
--
-- RLS policy brands_update_own is USING (auth.uid() = id) with a NULL
-- WITH CHECK, so USING governs the new values too and no column is pinned. A
-- brand could set its own approval_status to 'approved' from the browser with
-- the anon key and then pass requireApprovedBrand() — defeating the entire
-- approval gate — and could equally set its own token_balance.
--
-- Mirrors 0015's creator_profiles_guard_protected_columns exactly: same
-- structure, same exemptions, same SECURITY INVOKER, same search_path pinning.
-- A trigger rather than a narrowed policy because it protects whatever path
-- writes, including paths that do not exist yet.
--
-- SCOPE: brand_profiles ONLY. token_balance and subscription_tier exist on
-- creator_profiles too, and those are already covered by 0015's separate
-- trigger. This function touches nothing on creator_profiles, so the creator
-- dashboard, the claim funnel and bio verification are entirely unaffected by
-- it.
--
-- EXEMPTIONS, and they matter:
--
--   * Any caller whose current_user is not 'authenticated' returns early. That
--     is what lets service_role through. Every legitimate write to these
--     columns already runs as service_role:
--         - /api/admin/brands/status  (approval_status)  createSupabaseAdminClient
--         - webhooks/stripe           (token_balance, subscription_tier)
--         - lib/tokens.ts             (token_balance, the usage counters)
--       lib/tokens.ts was moved onto the admin client for its writes in the
--       same commit as this file; before that it wrote as the caller and this
--       trigger would have broken metering.
--
--     FUTURE WRITES MUST USE THE SERVICE-ROLE CLIENT. When the Stripe webhook
--     is extended to credit tokens, or any new billing path is added, it has to
--     use createSupabaseAdminClient() (or the module-scope service-role client
--     the webhook already has). A route that reaches these columns on the
--     caller's own session will be refused by this trigger, and the error will
--     look like a bug rather than a policy. It is a policy.
--
--   * An authenticated caller holding a user_roles row with role = 'admin' is
--     exempt. NOTE THIS IS THE user_roles ROW, NOT ADMIN_USER_ID. The database
--     knows nothing about ADMIN_USER_ID — that env var is an application-layer
--     gate only. The two notions of admin are independent and both must exist:
--     the env var to reach /admin at all, the user_roles row for the database
--     to treat you as admin.
--
--     If the user_roles admin row were ever deleted, approvals would still work
--     (that route is service-role and exempt by the first rule), but the admin
--     panel's own reads would break, since they run on the anon client against
--     policies that check that row.
--
-- stripe_customer_id is deliberately NOT pinned here, unlike on
-- creator_profiles: app/api/checkout/subscription/route.ts writes it and the
-- scope of this change is the list agreed for brand_profiles. Worth revisiting.
--
-- Rerunnable: CREATE OR REPLACE plus DROP TRIGGER IF EXISTS.

CREATE OR REPLACE FUNCTION brand_profiles_guard_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.token_balance IS DISTINCT FROM OLD.token_balance
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.directory_pages_used IS DISTINCT FROM OLD.directory_pages_used
     OR NEW.profile_views_used IS DISTINCT FROM OLD.profile_views_used
  THEN
    RAISE EXCEPTION
      'brand_profiles: approval and billing columns are not directly writable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brand_profiles_protect_columns ON brand_profiles;

CREATE TRIGGER brand_profiles_protect_columns
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION brand_profiles_guard_protected_columns();

COMMENT ON FUNCTION brand_profiles_guard_protected_columns() IS
  'Rejects an UPDATE from a non-admin authenticated caller that changes approval_status, approved_at, approved_by, token_balance, subscription_tier, directory_pages_used or profile_views_used on brand_profiles. Exists because RLS policy brands_update_own has USING (auth.uid() = id) and no WITH CHECK, so it gates rows but not columns — a brand could approve itself or set its own token balance straight from the browser with the anon key. service_role and admins are exempt: every legitimate write to these columns runs as service_role. Scoped to brand_profiles only; creator_profiles has its own trigger from 0015.';


-- ── A2. brand_reports: stop any authenticated user deleting every report ───
--
-- Was:
--   Authenticated users can delete brand_reports | {authenticated} | DELETE | USING true
--   Authenticated users can insert brand_reports | {authenticated} | INSERT | WITH CHECK true
--
-- Any logged-in account could delete every brand report. Replaced rather than
-- dropped, because app/admin/reports/page.tsx does its own insert (:367) and
-- delete (:392) from the browser on the anon client and depends on them.
-- is_admin_user() is the same predicate the existing UPDATE policy on this
-- table already uses, so the admin page keeps working unchanged.
--
-- The public SELECT policy is deliberately untouched: /report/[slug] is a cold
-- link sent to brands with no account.
--
-- A brand report cannot be deleted by a non-admin at all now. That is intended.

DROP POLICY IF EXISTS "Authenticated users can delete brand_reports" ON public.brand_reports;
DROP POLICY IF EXISTS "Authenticated users can insert brand_reports" ON public.brand_reports;

DROP POLICY IF EXISTS "Admins can delete brand_reports" ON public.brand_reports;
CREATE POLICY "Admins can delete brand_reports"
  ON public.brand_reports FOR DELETE TO authenticated
  USING (is_admin_user());

DROP POLICY IF EXISTS "Admins can insert brand_reports" ON public.brand_reports;
CREATE POLICY "Admins can insert brand_reports"
  ON public.brand_reports FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());


-- ── A3. activity_log: stop anonymous callers forging audit rows ────────────
--
-- Was: anyone_can_log | {public} | INSERT | WITH CHECK true — anyone could
-- write any event_type, including brand_approved. Brand approvals are written
-- to this table, so a forgeable audit log is worse than no audit log.
--
-- Not simply dropped: two browser writers depend on anonymous or
-- near-anonymous insert.
--
--   app/contact/page.tsx:38        writes event_type 'contact_form' while the
--                                  visitor is genuinely anonymous. Constrained
--                                  by event_type rather than removed.
--   app/admin/creators/page.tsx:54 writes creator_verified / creator_rejected
--                                  from the admin's browser. Covered by the
--                                  admin policy below.
--
-- /api/admin/brands/status writes as service_role and bypasses RLS entirely, so
-- it needs no policy.

DROP POLICY IF EXISTS anyone_can_log ON public.activity_log;

DROP POLICY IF EXISTS contact_form_can_log ON public.activity_log;
CREATE POLICY contact_form_can_log
  ON public.activity_log FOR INSERT TO public
  WITH CHECK (event_type = 'contact_form');

DROP POLICY IF EXISTS admins_can_log ON public.activity_log;
CREATE POLICY admins_can_log
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());


-- ═══════════════════════════════════════════════════════════════════════════
--   SECTION B — DO NOT RUN THIS SECTION YET.
--
--   Run it only once /api/match on the service-role client is LIVE ON THE VPS.
--
--   The currently deployed /api/match inserts into campaign_briefs with the
--   anon client, which server-side carries no session and no auth.uid(). It
--   succeeds today only because public_insert_briefs is WITH CHECK (true).
--   Dropping that policy before the new build is live makes every AI match
--   fail at the save step.
--
--   To check whether the new build is live, from any machine:
--     curl -s -o /dev/null -w '%{http_code}\n' \
--       -X POST 'https://influenceit.app/api/match' \
--       -H 'Content-Type: application/json' -d '{"briefText":"x"}'
--   That is a 401 either way — the gate runs first — so it does not prove the
--   deploy. Confirm from the VPS instead: `git log -1` in the app directory
--   should show the commit that carries this file.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── B1. campaign_briefs: remove the two wide-open policies ─────────────────
--
-- Was:
--   public_read_briefs   | {public} | SELECT | USING (true)
--   public_insert_briefs | {public} | INSERT | WITH CHECK (true)
--
-- public_read_briefs sits alongside briefs_read_own, and permissive policies
-- OR together, so every brand's brief_text, matched_creators and brand_id were
-- readable by anyone holding the publishable key.
--
-- briefs_read_own remains and covers the legitimate case:
--   (brand_id = auth.uid()) OR (brand_id IS NULL)
--
-- Nothing in the application reads campaign_briefs at all — grepped 2026-08-24 —
-- so removing the read policy breaks no page. The OR brand_id IS NULL branch is
-- a leftover from when /api/match wrote NULL brand_id for anonymous callers;
-- those rows still exist and stay readable. Not narrowed here because that is a
-- data question, not a policy one.

DROP POLICY IF EXISTS public_read_briefs ON public.campaign_briefs;
DROP POLICY IF EXISTS public_insert_briefs ON public.campaign_briefs;


-- ── VERIFICATION ───────────────────────────────────────────────────────────
-- After Section A, expect brand_profiles_protect_columns to be listed:
--   select tgname from pg_trigger where tgrelid = 'public.brand_profiles'::regclass and not tgisinternal;
--
-- After each section, re-run the policy catalogue query from CLAUDE.md and
-- confirm the dropped policies are gone and the replacements are present.
--
-- The trigger itself must be proven by attempting a self-approval as a brand
-- and seeing it refused — not by confirming the trigger exists. A gate assumed
-- to work and not tested is the reason this file exists.
