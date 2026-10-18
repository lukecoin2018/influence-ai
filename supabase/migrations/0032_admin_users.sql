-- 0032_admin_users.sql
--
-- STATUS: APPLIED 2026-10-17. The additional admin it allows has been active
-- since 17:00 UTC that day (admin_users.created_at, read 2026-10-18).
--
-- To rerun it (see the end of this header for when), use
-- scripts/db/apply-0032.sh, `--dry-run` first, never by pasting into the SQL
-- editor: the script wraps this file in one transaction between a row-count
-- check before and after it, and refuses to commit if any count you or a
-- creator can see has changed.
--
-- A second admin, with the owner as master.
--
-- ── What admin meant before this file ──────────────────────────────────────
--
-- The app trusts one account, the server-only ADMIN_USER_ID (unchanged here).
-- The database trusted any user_roles row with role = 'admin', and there was
-- one: the owner's. The database checked it two ways:
--
--   through is_admin_user() (0001): brand_aliases, brand_reports,
--     activity_log INSERT, creator_dashboard_events, creator_requests,
--     creator_entity and 0027's two functions;
--   by reading user_roles itself: 19 policies created in Supabase directly
--     (listed in section 3, from pg_policies on 2026-10-17) and the two
--     column-guard triggers (0015, 0017).
--
-- ── What admin means after it ──────────────────────────────────────────────
--
-- An admin is someone with a user_roles admin row AND no admin_users row whose
-- status is not 'active'. The owner never has an admin_users row, so for the
-- owner nothing changes. A second admin gets both rows from admin_user_add()
-- below. Blocking flips admin_users.status, and since every database check now
-- goes through is_admin_user(), the next query a blocked admin makes sees it:
-- no re-login, no token expiry, no deploy. The login token carries only the
-- user id, never admin status.
--
-- RULE: a database admin check calls is_admin_user(), never user_roles.
-- A check that reads user_roles itself would let a blocked admin through.
--
-- ── Sections ───────────────────────────────────────────────────────────────
--
--   1. admin_users, readable and writable only by service_role
--   2. is_admin_user() learns about blocks
--   3. the 19 policies that read user_roles: one per table and command,
--      calling is_admin_user(), same commands, scoped to authenticated
--   4. the 10 older policies that already called is_admin_user(): the same
--      condition, run once per query instead of once per row
--   5. the two column-guard triggers call is_admin_user()
--   6. creator_outreach.dmed_by: ON DELETE SET NULL
--   7. admin_user_add / _set_status / _remove / admin_users_list,
--      service_role only
--
-- ── Locks ──────────────────────────────────────────────────────────────────
--
-- Sections 3, 4 and 6 take ACCESS EXCLUSIVE on activity_log, brand_aliases,
-- brand_profiles, brand_reports, contact_submissions, creator_dashboard_events,
-- creator_entity, creator_outreach, creator_profiles, creator_requests,
-- creators, inquiries and shortlists, and SHARE ROW EXCLUSIVE on auth.users,
-- until the transaction ends. Reads of those tables and sign-ins wait for those
-- seconds. lock_timeout stops this file from queueing behind a long reader
-- (a homepage snapshot refresh reads creators for minutes), which would
-- otherwise hold every later reader behind it. If it times out, nothing was
-- changed: run it again a few minutes later.
--
-- ── If you ever need to undo the access change ─────────────────────────────
--
-- Restoring the 0001 body of is_admin_user() puts every check back to "has a
-- user_roles admin row", blocks ignored:
--   create or replace function is_admin_user() returns boolean language sql
--   stable security definer set search_path = public as $$ select exists (
--   select 1 from user_roles where user_roles.user_id = auth.uid() and
--   user_roles.role = 'admin'); $$;
--
-- Rerunnable: IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS, ALTER
-- POLICY. None of the functions here is one 0030 gives a statement_timeout,
-- so rerunning 0030 is not needed after this file. Rerunning 0001, 0004, 0017,
-- 0020, 0022 or 0026 recreates their policies in the once-per-row form (and
-- 0015 or 0017 their trigger reading user_roles): rerun this file after.

set local lock_timeout = '5s';


-- ═══ 1. admin_users ═════════════════════════════════════════════════════════

create table if not exists admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'blocked')),
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- No policies, and no table privileges either: Supabase grants every new
-- public table to anon and authenticated by default, and RLS alone would
-- answer them zero rows. Revoked, they get "permission denied" instead.
-- service_role keeps its grant and bypasses RLS: the app reads this table
-- server-side only (lib/auth/admin-access.ts), and writes it only through the
-- functions in section 7.
revoke all on table admin_users from anon, authenticated;

comment on table admin_users is
  'Additional admins (0032). One row per account promoted by the owner from /admin/admins; the owner (ADMIN_USER_ID) is never a row here. status active or blocked. is_admin_user() denies any account with a row here whose status is not active. Written only by admin_user_add / admin_user_set_status / admin_user_remove, read by the app with the service-role key. No access for anon or authenticated.';
comment on column admin_users.added_by is
  'auth.users.id of the owner who added this admin. Who blocked, unblocked or removed is in activity_log (admin_blocked, admin_unblocked, admin_removed, user_id = the actor).';


-- ═══ 2. is_admin_user() learns about blocks ════════════════════════════════
--
-- SECURITY DEFINER is what lets it read admin_users, which no signed-in role
-- can. Its settings are restated because CREATE OR REPLACE drops what it does
-- not repeat.

create or replace function is_admin_user() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from user_roles
           where user_roles.user_id = auth.uid()
             and user_roles.role = 'admin'
         )
     and not exists (
           select 1 from admin_users
           where admin_users.user_id = auth.uid()
             and admin_users.status <> 'active'
         );
$$;

comment on function is_admin_user() is
  'The one database definition of admin (0032): a user_roles admin row and no admin_users row whose status is not active. Every admin policy, trigger and function calls this; none reads user_roles itself, or a blocked admin would get through.';


-- ═══ 3. The 19 policies that read user_roles ═══════════════════════════════
--
-- Each was an EXISTS (... user_roles ...) or auth.uid() IN (... user_roles
-- ...) policy TO public, most of them in duplicate pairs. Replaced by one
-- policy per table and command, same command, TO authenticated (anon never
-- passed them: auth.uid() is null without a session).
--
-- The UPDATE policies keep USING only, as before; Postgres then applies USING
-- to the new row as well.
--
-- (select is_admin_user()), in parentheses with select, runs the check once
-- per query rather than once per row, the form Supabase recommends for RLS.
-- The EXISTS subqueries being replaced were also run once per query, so this
-- keeps their cost.

-- activity_log: 2 SELECT -> 1
drop policy if exists "Admins can read activity log" on activity_log;
drop policy if exists admin_read_activity on activity_log;
drop policy if exists admins_select_activity_log on activity_log;
create policy admins_select_activity_log on activity_log
  for select to authenticated using ((select is_admin_user()));

-- brand_profiles: 2 SELECT -> 1, 2 UPDATE -> 1
drop policy if exists "Admins can read all brand profiles" on brand_profiles;
drop policy if exists admin_read_all_brands on brand_profiles;
drop policy if exists admins_select_brand_profiles on brand_profiles;
create policy admins_select_brand_profiles on brand_profiles
  for select to authenticated using ((select is_admin_user()));

drop policy if exists "Admins can update all brand profiles" on brand_profiles;
drop policy if exists admin_update_all_brands on brand_profiles;
drop policy if exists admins_update_brand_profiles on brand_profiles;
create policy admins_update_brand_profiles on brand_profiles
  for update to authenticated using ((select is_admin_user()));

-- contact_submissions: 2 SELECT -> 1, 2 UPDATE -> 1
drop policy if exists "Admins can read contact submissions" on contact_submissions;
drop policy if exists admin_read_submissions on contact_submissions;
drop policy if exists admins_select_contact_submissions on contact_submissions;
create policy admins_select_contact_submissions on contact_submissions
  for select to authenticated using ((select is_admin_user()));

drop policy if exists "Admins can update contact submissions" on contact_submissions;
drop policy if exists admin_update_submissions on contact_submissions;
drop policy if exists admins_update_contact_submissions on contact_submissions;
create policy admins_update_contact_submissions on contact_submissions
  for update to authenticated using ((select is_admin_user()));

-- creator_profiles: 2 SELECT -> 1, 2 UPDATE -> 1
drop policy if exists "Admins can read all creator profiles" on creator_profiles;
drop policy if exists admin_read_all_creators on creator_profiles;
drop policy if exists admins_select_creator_profiles on creator_profiles;
create policy admins_select_creator_profiles on creator_profiles
  for select to authenticated using ((select is_admin_user()));

drop policy if exists "Admins can update all creator profiles" on creator_profiles;
drop policy if exists admin_update_all_creators on creator_profiles;
drop policy if exists admins_update_creator_profiles on creator_profiles;
create policy admins_update_creator_profiles on creator_profiles
  for update to authenticated using ((select is_admin_user()));

-- creators: 1 SELECT -> 1
drop policy if exists "Admins can read creators" on creators;
drop policy if exists admins_select_creators on creators;
create policy admins_select_creators on creators
  for select to authenticated using ((select is_admin_user()));

-- inquiries: 2 SELECT -> 1, 1 UPDATE -> 1
drop policy if exists "Admins can read all inquiries" on inquiries;
drop policy if exists admin_read_all_inquiries on inquiries;
drop policy if exists admins_select_inquiries on inquiries;
create policy admins_select_inquiries on inquiries
  for select to authenticated using ((select is_admin_user()));

drop policy if exists admin_update_all_inquiries on inquiries;
drop policy if exists admins_update_inquiries on inquiries;
create policy admins_update_inquiries on inquiries
  for update to authenticated using ((select is_admin_user()));

-- shortlists: 1 SELECT -> 1
drop policy if exists admin_read_all_shortlists on shortlists;
drop policy if exists admins_select_shortlists on shortlists;
create policy admins_select_shortlists on shortlists
  for select to authenticated using ((select is_admin_user()));


-- ═══ 4. The 10 older policies: once per query ═══════════════════════════════
--
-- These already called is_admin_user(), written bare, which Postgres runs
-- once for every row it scans. Section 2 gives that function a second lookup,
-- so the bare form would make the admin pages slower: in the 2026-10-17 dry
-- run a full brand_aliases count (53,629 rows, run about six times per Brand
-- Index load) went from 832 to 1,163 ms. Wrapped as (select is_admin_user())
-- it runs once per query.
--
-- ALTER POLICY changes only the condition: each policy keeps its name, its
-- command and its roles (all TO authenticated), and the condition itself is
-- the same function. Rerunnable.

-- activity_log (0017)
alter policy admins_can_log on activity_log
  with check ((select is_admin_user()));

-- brand_aliases (0001)
alter policy "Admins can view brand_aliases" on brand_aliases
  using ((select is_admin_user()));
alter policy "Admins can update brand_aliases" on brand_aliases
  using ((select is_admin_user()))
  with check ((select is_admin_user()));

-- brand_reports (0004, 0017)
alter policy "Admins can update brand_reports" on brand_reports
  using ((select is_admin_user()))
  with check ((select is_admin_user()));
alter policy "Admins can delete brand_reports" on brand_reports
  using ((select is_admin_user()));
alter policy "Admins can insert brand_reports" on brand_reports
  with check ((select is_admin_user()));

-- creator_dashboard_events (0020)
alter policy admins_can_read_dashboard_events on creator_dashboard_events
  using ((select is_admin_user()));

-- creator_requests (0022)
alter policy admins_can_read_creator_requests on creator_requests
  using ((select is_admin_user()));

-- creator_entity (0026)
alter policy "Admins can view creator_entity" on creator_entity
  using ((select is_admin_user()));
alter policy "Admins can update creator_entity" on creator_entity
  using ((select is_admin_user()))
  with check ((select is_admin_user()));


-- ═══ 5. The column-guard triggers call is_admin_user() ═════════════════════
--
-- Bodies as live on 2026-10-17 (pg_get_functiondef), with the user_roles
-- subquery replaced. These run as the signed-in user (SECURITY INVOKER) and
-- admin_users has no policies, so a direct read of admin_users here would see
-- no rows and let a blocked admin through. Only is_admin_user() can see it.

create or replace function creator_profiles_guard_protected_columns()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  if is_admin_user() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.creator_id is distinct from old.creator_id
     or new.claim_status is distinct from old.claim_status
     or new.claimed_at is distinct from old.claimed_at
     or new.verification_code is distinct from old.verification_code
     or new.verification_code_expires_at is distinct from old.verification_code_expires_at
     or new.verification_attempts is distinct from old.verification_attempts
     or new.last_verification_attempt_at is distinct from old.last_verification_attempt_at
     or new.token_balance is distinct from old.token_balance
     or new.earned_first_inquiry is distinct from old.earned_first_inquiry
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.subscription_tier is distinct from old.subscription_tier
  then
    raise exception
      'creator_profiles: claim, verification and billing columns are not directly writable'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create or replace function brand_profiles_guard_protected_columns()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  if is_admin_user() then
    return new;
  end if;

  if new.approval_status is distinct from old.approval_status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.token_balance is distinct from old.token_balance
     or new.subscription_tier is distinct from old.subscription_tier
     or new.directory_pages_used is distinct from old.directory_pages_used
     or new.profile_views_used is distinct from old.profile_views_used
  then
    raise exception
      'brand_profiles: approval and billing columns are not directly writable'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;


-- ═══ 6. creator_outreach.dmed_by: ON DELETE SET NULL ═══════════════════════
--
-- 0008 created it with no ON DELETE rule, the only reference to auth.users
-- that does that (2026-10-17). An admin who ever marked a creator DMed in
-- /admin/targeting could not be deleted in Supabase. Now the DM record stays
-- and only "who" is cleared.

alter table creator_outreach drop constraint if exists creator_outreach_dmed_by_fkey;
alter table creator_outreach
  add constraint creator_outreach_dmed_by_fkey
  foreign key (dmed_by) references auth.users(id) on delete set null;


-- ═══ 7. Managing admins: service_role only ═════════════════════════════════
--
-- Called by app/api/admin/admins/route.ts, which first checks the caller is
-- the owner (ADMIN_USER_ID) and refuses the owner's own id as a target. Each
-- function does its whole change and its activity_log row in one transaction:
-- a change to admin access with no record of it is worse than a failed click.
--
-- None can reach the owner. admin_user_add refuses any account that already
-- has a user_roles row (the owner's is the admin row); the other three act
-- only on accounts that have an admin_users row, which the owner never has.
--
-- EXECUTE is revoked from public, anon and authenticated (Supabase grants new
-- functions to all three), and each body also refuses a signed-in caller that
-- is not service_role, in case a grant ever comes back. A call with no JWT
-- claims at all is a direct connection (the SQL editor, psql) and is allowed,
-- as in 0027.

create or replace function admin_user_add(p_email text, p_actor uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matches int;
  v_id uuid;
  v_email text;
  v_role text;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_user_add: service_role only' using errcode = '42501';
  end if;
  if p_actor is null then
    raise exception 'admin_user_add: p_actor is required';
  end if;

  select count(*) into v_matches
    from auth.users u
   where lower(u.email) = lower(btrim(coalesce(p_email, '')));
  if v_matches = 0 then
    return 'not_found';
  end if;
  if v_matches > 1 then
    return 'ambiguous_email';
  end if;

  select u.id, u.email into v_id, v_email
    from auth.users u
   where lower(u.email) = lower(btrim(p_email));

  if v_id = p_actor then
    return 'is_self';
  end if;

  -- user_roles is one row per user (PRIMARY KEY (user_id)), so ANY existing
  -- row refuses: an admin row is already_admin (today only the owner's), any
  -- other is has_other_role, after the two more specific profile checks.
  select r.role into v_role from user_roles r where r.user_id = v_id;
  if v_role = 'admin' or exists (select 1 from admin_users a where a.user_id = v_id) then
    return 'already_admin';
  end if;
  if exists (select 1 from creator_profiles cp where cp.id = v_id) then
    return 'has_creator_profile';
  end if;
  if exists (select 1 from brand_profiles bp where bp.id = v_id) then
    return 'has_brand_profile';
  end if;
  if v_role is not null then
    return 'has_other_role';
  end if;

  begin
    insert into user_roles (user_id, role) values (v_id, 'admin');
    insert into admin_users (user_id, status, added_by) values (v_id, 'active', p_actor);
    insert into activity_log (event_type, user_id, target_id, details)
      values ('admin_added', p_actor, v_id, jsonb_build_object('email', v_email));
  exception when unique_violation then
    -- A concurrent add of the same account won; this one changed nothing.
    return 'already_admin';
  end;

  return 'added';
end;
$$;

create or replace function admin_user_set_status(p_user_id uuid, p_status text, p_actor uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_email text;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_user_set_status: service_role only' using errcode = '42501';
  end if;
  if p_actor is null then
    raise exception 'admin_user_set_status: p_actor is required';
  end if;
  if p_status is null or p_status not in ('active', 'blocked') then
    raise exception 'admin_user_set_status: status must be active or blocked';
  end if;

  select a.status into v_old from admin_users a where a.user_id = p_user_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_old = p_status then
    return 'unchanged';
  end if;

  update admin_users set status = p_status, updated_at = now() where user_id = p_user_id;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  insert into activity_log (event_type, user_id, target_id, details)
    values (
      case when p_status = 'blocked' then 'admin_blocked' else 'admin_unblocked' end,
      p_actor, p_user_id, jsonb_build_object('email', v_email)
    );

  return case when p_status = 'blocked' then 'blocked' else 'unblocked' end;
end;
$$;

create or replace function admin_user_remove(p_user_id uuid, p_actor uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_user_remove: service_role only' using errcode = '42501';
  end if;
  if p_actor is null then
    raise exception 'admin_user_remove: p_actor is required';
  end if;

  delete from admin_users where user_id = p_user_id;
  if not found then
    return 'not_found';
  end if;
  delete from user_roles where user_id = p_user_id and role = 'admin';

  select u.email into v_email from auth.users u where u.id = p_user_id;
  insert into activity_log (event_type, user_id, target_id, details)
    values ('admin_removed', p_actor, p_user_id, jsonb_build_object('email', v_email));

  return 'removed';
end;
$$;

create or replace function admin_users_list()
returns table (user_id uuid, email text, status text, added_by_email text, created_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin_users_list: service_role only' using errcode = '42501';
  end if;

  return query
    select a.user_id, u.email::text, a.status, ab.email::text, a.created_at, a.updated_at
      from admin_users a
      left join auth.users u on u.id = a.user_id
      left join auth.users ab on ab.id = a.added_by
     order by a.created_at;
end;
$$;

revoke execute on function admin_user_add(text, uuid) from public, anon, authenticated;
revoke execute on function admin_user_set_status(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function admin_user_remove(uuid, uuid) from public, anon, authenticated;
revoke execute on function admin_users_list() from public, anon, authenticated;

grant execute on function admin_user_add(text, uuid) to service_role;
grant execute on function admin_user_set_status(uuid, text, uuid) to service_role;
grant execute on function admin_user_remove(uuid, uuid) to service_role;
grant execute on function admin_users_list() to service_role;

comment on function admin_user_add(text, uuid) is
  'Promotes an existing auth account, found by email (case-insensitive), to additional admin: one user_roles admin row, one admin_users active row and one admin_added activity_log row, in one transaction. Returns added, or the refusal: not_found, ambiguous_email, is_self, already_admin, has_creator_profile, has_brand_profile, has_other_role. service_role only (0032).';
comment on function admin_user_set_status(uuid, text, uuid) is
  'Blocks or unblocks an additional admin: flips admin_users.status and writes admin_blocked or admin_unblocked to activity_log. Acts only on accounts with an admin_users row, so never on the owner. Returns blocked, unblocked, unchanged or not_found. service_role only (0032).';
comment on function admin_user_remove(uuid, uuid) is
  'Removes an additional admin: deletes the admin_users row and the user_roles admin row, writes admin_removed. Leaves the auth account. Acts only on accounts with an admin_users row, so never on the owner. Returns removed or not_found. service_role only (0032).';
comment on function admin_users_list() is
  'Additional admins with their email and who added them, for /admin/admins. service_role only (0032).';
