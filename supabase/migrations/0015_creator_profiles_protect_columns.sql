-- 0015_creator_profiles_protect_columns.sql
--
-- STATUS: NOT YET APPLIED.
--
-- Stops a signed-in creator from writing the columns that decide whether their
-- claim is verified, which creator they are, and what they have paid for.
--
-- The hole: creator_profiles' RLS policy creators_update_own is
-- polcmd = 'w', USING (auth.uid() = id), WITH CHECK = NULL (confirmed by query
-- 2026-07-31). USING alone gates which rows may be updated, not which columns
-- or what they may become, and app/creator-dashboard/edit/page.tsx proves the
-- anon-key browser client can already run that UPDATE. So a creator could send
-- one PostgREST request setting claim_status = 'verified' and skip bio
-- verification entirely; or set token_balance; or, because WITH CHECK is NULL
-- and therefore never evaluated on the new row, set id to another user's id and
-- move their row out from under them.
--
-- This is load-bearing for the route-level claim_status checks added in the
-- same branch: without it, a creator can simply grant themselves the status
-- those checks look for. APPLY THIS BEFORE DEPLOYING THE ROUTE CHANGES.
--
-- Why a trigger rather than REVOKE UPDATE + GRANT UPDATE(col, ...):
--
--   1. A grant list must name every column that stays writable, and this
--      table's base DDL is not in this repo — only 0009 and 0010, which add two
--      columns to a table created elsewhere. The list would be reconstructed
--      from application code, not sourced, and a column missed by that
--      reconstruction becomes silently writable forever.
--   2. The failure directions are opposite. A trigger that names too few
--      protected columns leaves a gap that is visible in this file; a grant
--      that names too few writable columns breaks a creator's profile editor
--      at runtime. Enumerating what must not change is the safer of the two
--      lists to get wrong.
--   3. Column grants on this project have already caused two outages today, on
--      social_profiles, for a related reason.
--
-- Two exemptions, and both are load-bearing.
--
--   service_role bypasses RLS but NOT triggers. Every legitimate write to these
--   columns comes from a service-role route handler (claim, verify-bio,
--   regenerate-code, lib/tokens.ts, inquiries, the Stripe webhook), so without
--   this exemption the guard would block the product itself. current_user is
--   the right test: PostgREST SET ROLEs the connection to anon, authenticated
--   or service_role per request. NULL/postgres covers the SQL editor and psql.
--
--   Admins. app/admin/creators/page.tsx:52 sets claim_status from the BROWSER,
--   through the anon-key client as an authenticated admin user — not through a
--   route handler — so the Verify/Reject buttons on /admin/creators would start
--   failing without this. The subquery runs as the caller (SECURITY INVOKER),
--   which is fine because an authenticated user can already read their own
--   user_roles row: context/AuthContext.tsx:154 and app/auth/login/page.tsx:35
--   both do exactly that from the browser.
--
-- Rerunnable: CREATE OR REPLACE plus DROP TRIGGER IF EXISTS.

CREATE OR REPLACE FUNCTION creator_profiles_guard_protected_columns()
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

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.claim_status IS DISTINCT FROM OLD.claim_status
     OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
     OR NEW.verification_code IS DISTINCT FROM OLD.verification_code
     OR NEW.verification_code_expires_at IS DISTINCT FROM OLD.verification_code_expires_at
     OR NEW.verification_attempts IS DISTINCT FROM OLD.verification_attempts
     OR NEW.last_verification_attempt_at IS DISTINCT FROM OLD.last_verification_attempt_at
     OR NEW.token_balance IS DISTINCT FROM OLD.token_balance
     OR NEW.earned_first_inquiry IS DISTINCT FROM OLD.earned_first_inquiry
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
  THEN
    RAISE EXCEPTION
      'creator_profiles: claim, verification and billing columns are not directly writable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_profiles_protect_columns ON creator_profiles;

CREATE TRIGGER creator_profiles_protect_columns
  BEFORE UPDATE ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION creator_profiles_guard_protected_columns();

COMMENT ON FUNCTION creator_profiles_guard_protected_columns() IS
  'Rejects an UPDATE from a non-admin authenticated caller that changes any of the twelve claim, verification or billing columns on creator_profiles. Exists because RLS policy creators_update_own has USING (auth.uid() = id) and no WITH CHECK, so it gates rows but not columns — a creator could self-verify, rewrite creator_id, or move their row onto another user id straight from the browser with the anon key. service_role and admins are exempt: service-role route handlers do every legitimate write, and /admin/creators sets claim_status from the browser. Deliberately NOT a column grant: this table''s base DDL is not in the repo, so the writable-column list would be reconstructed rather than sourced. locale and created_at are left writable.';
