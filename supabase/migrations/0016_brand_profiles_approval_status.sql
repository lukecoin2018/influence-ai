-- 0016_brand_profiles_approval_status.sql
--
-- STATUS: APPLIED. Confirmed live in production 2026-09-12.
--
-- Hardens brand_profiles.approval_status so that "nobody has decided yet"
-- cannot be mistaken for "approved" at the database level, matching the check
-- lib/auth/api-guards.ts now applies in code.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
--
-- brand_profiles is defined directly in Supabase, not in this repo, so the
-- column arrived out of band and nothing ever wrote it: both signup paths tried
-- to write a `status` column that does not exist, and the insert failed
-- outright. Every row therefore carries whatever the database default was.
--
-- requireApprovedBrand() checks `approval_status === 'approved'` positively, so
-- NULL already denies. This migration is defence in depth for the other
-- direction — a future INSERT that omits the column should land on 'pending',
-- not on NULL, and a typo like 'aproved' should be rejected by the database
-- rather than silently denying access forever.
--
-- ── STATE AT TIME OF WRITING ───────────────────────────────────────────────
--
-- Verified in production by Lukas, 2026-08-24: brand_profiles has exactly one
-- row — LMG Media, creators@lmg.media, approval_status 'approved', created
-- 16 Feb. No NULLs. So statement 2 below is expected to update 0 rows and
-- statement 3 is expected to find no violations. If either does something, the
-- table is not in the state this file assumes — stop and re-check before
-- continuing.
--
-- ── HOW TO APPLY ───────────────────────────────────────────────────────────
--
-- Paste ONE statement at a time into the Supabase SQL editor, in order.
-- Idempotent: safe to rerun.


-- Statement 1 — new rows default to 'pending'.
-- Approval is something a human grants; an INSERT that says nothing about it
-- has not been granted anything.
ALTER TABLE public.brand_profiles
  ALTER COLUMN approval_status SET DEFAULT 'pending';


-- Statement 2 — backfill any NULL to 'pending'.
-- Expected to affect 0 rows. Never touches a row that already has a value, so
-- the existing approved account is not disturbed.
UPDATE public.brand_profiles
SET approval_status = 'pending'
WHERE approval_status IS NULL;


-- Statement 3 — constrain the column to the four values the app understands.
--
-- These are exactly the values app/admin/brands/page.tsx can write: 'approved'
-- and 'rejected' from its two buttons, 'suspended' from the third, plus
-- 'pending' as the default. Guarded by a DO block because Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS, and this file must be safe to rerun.
--
-- NOT NULL is deliberately NOT added. The default above covers new rows, and
-- the code treats NULL as unapproved anyway, so a NOT NULL here would buy
-- nothing and would fail loudly against any row this file has not seen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_profiles_approval_status_check'
      AND conrelid = 'public.brand_profiles'::regclass
  ) THEN
    ALTER TABLE public.brand_profiles
      ADD CONSTRAINT brand_profiles_approval_status_check
      CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;


-- Statement 4 — verification. Read-only; run it last and eyeball the result.
-- Expect a single row: 'approved', count 1.
SELECT COALESCE(approval_status, '(null)') AS approval_status, COUNT(*)
FROM public.brand_profiles
GROUP BY 1
ORDER BY 2 DESC;
