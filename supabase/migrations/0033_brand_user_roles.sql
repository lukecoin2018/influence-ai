-- 0033_brand_user_roles.sql
--
-- STATUS: APPLIED 2026-10-18, in the SQL editor, after the route change was
-- deployed. Results as Lukas reported them: statement 1 returned only
-- admin_user_add, admin_user_remove and is_admin_user; statement 2 listed the
-- 10 brands; statement 3 returned no rows; statement 5 read 11 | 11 | 0 | 0
-- with a test brand signed up through the new route, and 10 | 10 | 0 | 0 once
-- that test account was deleted.
--
-- Gives every brand account its user_roles row, role 'brand'.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
--
-- /api/auth/signup created the auth user and the brand_profiles row and never
-- a user_roles row, so no brand account had one. AuthContext then reads the
-- role as null, and the header link that shows a brand its company name
-- checks userRole === 'brand' (components/Navigation.tsx desktop and mobile,
-- app/_components/Nav.tsx), so no brand ever saw it. Access was unaffected:
-- approval reads brand_profiles.approval_status, and login sends null and
-- 'brand' alike to /dashboard (lib/auth/login-target.ts).
--
-- The route writes the row itself from fix/brand-role-rows on, before the
-- profile. This file backfills the accounts made before that.
--
-- ── STATE AT TIME OF WRITING ───────────────────────────────────────────────
--
-- Measured 2026-10-18 with the service-role client: 10 brand_profiles rows
-- (2 approved, 6 rejected, 2 pending). Every one has an auth user, and none
-- has a user_roles, creator_profiles or admin_users row. user_roles held 9
-- rows: 2 admin (the owner and one additional admin, 0032), 7 creator,
-- 0 brand. So statement 2 expects 10 rows, statement 3 none, statement 4
-- INSERT 0 10 (fewer if brands signed up after the route change deployed:
-- they already have their row), statement 5 equal first two columns and two
-- zeros.
--
-- ── RULES ──────────────────────────────────────────────────────────────────
--
-- user_roles has PRIMARY KEY (user_id): one role per account. This file never
-- changes a role. An account that already has a row, whatever its role, is
-- left alone. Nor does it give 'brand' to an account that also has a creator
-- profile or an admin_users row: none does today, and such an account needs a
-- person, not a default. Statement 3 lists any it skips.
--
-- No admin check here, and none changes. 0032's rule stands: a database admin
-- check calls is_admin_user(), never user_roles. is_admin_user() counts only
-- role 'admin', so a 'brand' row cannot make anyone an admin, and
-- admin_user_add() already refuses a brand account (has_brand_profile).
--
-- ── HOW TO APPLY ───────────────────────────────────────────────────────────
--
-- Paste ONE statement at a time into the Supabase SQL editor, in order,
-- without the comments above it. Statements 1–3 and 5 are read-only.
-- Rerunnable: statement 4 inserts only rows that are missing, and a second
-- run reports INSERT 0 0.


-- Statement 1 — nothing else reads user_roles. Read-only.
-- Expect exactly three rows, all functions: admin_user_add, admin_user_remove
-- (0032) and is_admin_user (0001, 0032). No policy reads user_roles directly
-- since 0032, and no trigger sits on it. Any other row is something the repo
-- does not know about that would see the new brand rows: stop and look at it
-- before statement 4.
select 'policy' as kind, tablename || '.' || policyname as name
from pg_policies
where qual ilike '%user_roles%' or with_check ilike '%user_roles%'
union all
select 'function', p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%user_roles%'
union all
select 'trigger on user_roles', tgname
from pg_trigger
where tgrelid = 'public.user_roles'::regclass and not tgisinternal
order by 1, 2;


-- Statement 2 — preview: the accounts statement 4 adds a row for. Read-only.
-- Expect the 10 listed above, minus any that have a row by now.
select bp.id, bp.company_name, bp.approval_status, bp.created_at
from public.brand_profiles bp
where not exists (select 1 from public.user_roles r where r.user_id = bp.id)
  and not exists (select 1 from public.creator_profiles cp where cp.id = bp.id)
  and not exists (select 1 from public.admin_users a where a.user_id = bp.id)
  and exists (select 1 from auth.users u where u.id = bp.id)
order by bp.created_at;


-- Statement 3 — the brand accounts statement 4 skips and that have no brand
-- row already. Read-only. Expect no rows. Any row is an account that needs a
-- person: another role, a creator profile, an admin_users row, or no auth user
-- (user_roles.user_id references auth.users, so it could not take a row).
select bp.id, bp.company_name,
       r.role as existing_role,
       exists (select 1 from public.creator_profiles cp where cp.id = bp.id) as has_creator_profile,
       exists (select 1 from public.admin_users a where a.user_id = bp.id) as has_admin_users_row,
       not exists (select 1 from auth.users u where u.id = bp.id) as no_auth_user
from public.brand_profiles bp
left join public.user_roles r on r.user_id = bp.id
where r.role is distinct from 'brand'
  and (r.user_id is not null
       or exists (select 1 from public.creator_profiles cp where cp.id = bp.id)
       or exists (select 1 from public.admin_users a where a.user_id = bp.id)
       or not exists (select 1 from auth.users u where u.id = bp.id));


-- Statement 4 — the backfill. Same conditions as statement 2.
-- ON CONFLICT covers a brand signing up between the NOT EXISTS and the insert.
insert into public.user_roles (user_id, role)
select bp.id, 'brand'
from public.brand_profiles bp
where not exists (select 1 from public.user_roles r where r.user_id = bp.id)
  and not exists (select 1 from public.creator_profiles cp where cp.id = bp.id)
  and not exists (select 1 from public.admin_users a where a.user_id = bp.id)
  and exists (select 1 from auth.users u where u.id = bp.id)
on conflict (user_id) do nothing;


-- Statement 5 — check. Read-only.
-- Expect brand_accounts = with_brand_role, and without_role and
-- brand_role_without_profile both 0. "Exactly one row each" is guaranteed by
-- the primary key; this checks that the one row is 'brand'.
select
  (select count(*) from public.brand_profiles) as brand_accounts,
  (select count(*) from public.brand_profiles bp
     join public.user_roles r on r.user_id = bp.id and r.role = 'brand') as with_brand_role,
  (select count(*) from public.brand_profiles bp
     where not exists (select 1 from public.user_roles r where r.user_id = bp.id)) as without_role,
  (select count(*) from public.user_roles r
     where r.role = 'brand'
       and not exists (select 1 from public.brand_profiles bp where bp.id = r.user_id)) as brand_role_without_profile;
