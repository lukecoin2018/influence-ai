-- 0027_creator_exclusion.sql
--
-- STATUS: APPLIED 2026-10-06, by hand in the Supabase SQL editor. Verified
-- there: both functions exist (functions 2) and creator_entity.excluded
-- exists (excluded_column 1); public_stats() returns the same figures as
-- before (creators 8,639, posts_analyzed 243,861, brand_deals 20,534,
-- ig_median 1.1, tiktok_median 1.2, last_index 2026-09-22), as expected while
-- every creator is still active; and the dry run
-- `select to_status, count(*) from apply_creator_entity() group by 1`
-- returns non_creator 995. Nothing written yet: creators.status changes only
-- with `npm run creator-entity:apply -- --write`.
--
-- Phase 2 of creator_entity (0026): hide brand, media and venue accounts that
-- were scraped as if they were creators, by setting creators.status =
-- 'non_creator'. Everything that already filters on status = 'active' hides
-- them at once: the RLS SELECT policies on creators, social_profiles and
-- creator_posts, v_creator_summary and match_creators. The two SECURITY
-- DEFINER functions that did not filter, public_stats() and top_creators(),
-- are replaced below with the filter added. Service-role reads in the app
-- filter by hand (see CLAUDE.md, "Brand accounts among the creators").
--
-- 'non_creator' is ours alone. creators.status is varchar with no CHECK; the
-- scraper's dropdown uses active / archived / flagged / rejected. The rule
-- below only ever moves a creator between 'active' and 'non_creator' and never
-- touches a row with any other status.
--
-- ── The rule (lives here, in apply_creator_entity, and nowhere else) ───────
--
-- A creator is 'non_creator' when its creator_entity row is either
--   * reviewed (reviewed_at not null) with review_entity_type <> 'creator'; or
--   * unreviewed, with ALL of: entity_type in (brand, media, venue),
--     confidence = 'high', flag_count > 0, and no creator_profiles row
--     (not claimed).
-- Every other creator is 'active', including one with no creator_entity row.
--
-- flag_count alone is the support: signals.ig_business does not count (many
-- creators run business accounts for the analytics, and on 2026-10-05 it was
-- the only support for 60 high-confidence verdicts, one of them a person).
-- An unreviewed non-creator verdict the rule does not hide waits in the
-- Review tab of /admin/creator-review, which is built to be the complement:
-- medium/low confidence, entity_type 'other', a non-creator verdict with
-- flag_count = 0, and a claimed account with a non-creator verdict. A human
-- choosing 'other' hides the account. A reviewed row with a NULL
-- review_entity_type stays active (the safe failure).
--
-- ── Statements ─────────────────────────────────────────────────────────────
--
-- 1. creator_entity.excluded: a copy of "the rule put this creator in
--    non_creator", written only by apply_creator_entity, so the review page
--    can show what is hidden without a second copy of the rule and without
--    reading creators (whose RLS would hide exactly these rows).
-- 2. apply_creator_entity(p_ids, p_dry_run): applies the rule to the given
--    creators (all of them when p_ids is null), updating creators.status and
--    creator_entity.excluded in one statement. Returns one row per creator
--    whose status would change (dry run, the default) or did. A write returns
--    only rows its UPDATE actually touched, so anything that silently blocks
--    the write shows up as fewer rows than the dry run, not as a false success.
-- 3. accept_creator_entity(p_ids): for the given unreviewed, UNCLAIMED rows,
--    sets review_entity_type = entity_type and reviewed_at = now(), then
--    applies the rule to all of p_ids. A claimed row is skipped: it is
--    reviewed one at a time on the page, which warns that hiding it blanks the
--    creator's dashboard. A null or empty p_ids does nothing (never "all").
-- 4. public_stats(): counts only active creators, and their posts, brand
--    deals and engagement medians. Posts and brand deals now come from ONE
--    pass over creator_posts joined to active profiles rather than two full
--    scans. Same signature and return shape.
-- 5. top_creators(): adds c.status = 'active'. Nothing else changes.
--
-- ── Security for 2 and 3 ───────────────────────────────────────────────────
--
-- SECURITY DEFINER with search_path = public. EXECUTE is revoked from public
-- and anon, so a PostgREST caller needs an authenticated session or the
-- service role, and the body then refuses an authenticated caller who is not
-- is_admin_user(). A call with no JWT claims at all is a direct database
-- connection (the SQL editor, psql) and is allowed, so a dry run can be read
-- in the editor:
--
--   select to_status, count(*) from apply_creator_entity() group by 1;
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, one statement at a time, same as 0001-0026. Idempotent: safe to
-- rerun.

alter table creator_entity
  add column if not exists excluded boolean not null default false;

comment on column creator_entity.excluded is
  'True when apply_creator_entity() last set this creator to status ''non_creator''. Written only by that function (0027); the classification script never writes it. Lets /admin/creator-review show what is hidden without reading creators, whose RLS hides these rows.';

create or replace function apply_creator_entity(p_ids uuid[] default null, p_dry_run boolean default true)
returns table (creator_id uuid, from_status text, to_status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if (nullif(current_setting('request.jwt.claims', true), '') is not null
      or nullif(current_setting('request.jwt.claim.role', true), '') is not null)
     and coalesce(auth.role(), '') <> 'service_role'
     and not is_admin_user() then
    raise exception 'apply_creator_entity: admins and service_role only'
      using errcode = '42501';
  end if;

  return query
  with target as (
    select c.id,
           c.status::text as cur,
           case
             when e.creator_id is null then 'active'
             when e.reviewed_at is not null then
               case when e.review_entity_type <> 'creator' then 'non_creator' else 'active' end
             when e.entity_type in ('brand', 'media', 'venue')
                  and e.confidence = 'high'
                  and e.flag_count > 0
                  and not exists (select 1 from creator_profiles cp where cp.creator_id = c.id)
               then 'non_creator'
             else 'active'
           end as nxt
    from creators c
    left join creator_entity e on e.creator_id = c.id
    where (p_ids is null or c.id = any(p_ids))
      and c.status in ('active', 'non_creator')
  ),
  set_status as (
    update creators c
       set status = t.nxt
      from target t
     where not p_dry_run
       and c.id = t.id
       and c.status is distinct from t.nxt
    returning c.id
  ),
  set_excluded as (
    update creator_entity e
       set excluded = (t.nxt = 'non_creator')
      from target t
     where not p_dry_run
       and e.creator_id = t.id
       and e.excluded is distinct from (t.nxt = 'non_creator')
    returning e.creator_id
  )
  select t.id, t.cur, t.nxt
    from target t
   where t.cur is distinct from t.nxt
     and (p_dry_run or t.id in (select s.id from set_status s))
   order by t.id;
end;
$$;

revoke execute on function apply_creator_entity(uuid[], boolean) from public, anon;

grant execute on function apply_creator_entity(uuid[], boolean) to authenticated, service_role;

comment on function apply_creator_entity(uuid[], boolean) is
  'Applies the creator exclusion rule (0027) to the given creators, or all when p_ids is null: active <-> non_creator only, other statuses untouched. Updates creators.status and creator_entity.excluded together unless p_dry_run (the default). Returns one row per creator whose status would change or did. Admins, service_role and direct SQL connections only.';

create or replace function accept_creator_entity(p_ids uuid[])
returns table (creator_id uuid, from_status text, to_status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if (nullif(current_setting('request.jwt.claims', true), '') is not null
      or nullif(current_setting('request.jwt.claim.role', true), '') is not null)
     and coalesce(auth.role(), '') <> 'service_role'
     and not is_admin_user() then
    raise exception 'accept_creator_entity: admins and service_role only'
      using errcode = '42501';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  update creator_entity e
     set review_entity_type = e.entity_type,
         reviewed_at = now()
   where e.creator_id = any(p_ids)
     and e.reviewed_at is null
     and not exists (select 1 from creator_profiles cp where cp.creator_id = e.creator_id);

  return query select * from apply_creator_entity(p_ids, false);
end;
$$;

revoke execute on function accept_creator_entity(uuid[]) from public, anon;

grant execute on function accept_creator_entity(uuid[]) to authenticated, service_role;

comment on function accept_creator_entity(uuid[]) is
  'Bulk accept from /admin/creator-review: sets review_entity_type = entity_type and reviewed_at = now() on the given unreviewed, unclaimed creator_entity rows, then applies the exclusion rule to all of p_ids. Null or empty p_ids does nothing. Admins, service_role and direct SQL connections only.';

create or replace function public.public_stats()
 returns json
 language sql
 stable security definer
as $function$
  with active_posts as (
    select count(*) as posts,
           count(*) filter (where cp.is_sponsored) as brand_deals
    from creator_posts cp
    join social_profiles sp on sp.id = cp.social_profile_id
    join creators c on c.id = sp.creator_id
    where c.status = 'active'
  )
  select json_build_object(
    'creators',       (select count(*) from creators
                       where import_status = 'active' and status = 'active'),
    'posts_analyzed', (select posts from active_posts),
    'brand_deals',    (select brand_deals from active_posts),
    'ig_median',      (select round(percentile_cont(0.5) within group
                       (order by sp.engagement_rate)::numeric, 1)
                       from social_profiles sp
                       join creators c on c.id = sp.creator_id
                       where sp.platform = 'instagram' and sp.engagement_rate > 0
                         and sp.import_status = 'active' and c.status = 'active'),
    'tiktok_median',  (select round(percentile_cont(0.5) within group
                       (order by sp.engagement_rate)::numeric, 1)
                       from social_profiles sp
                       join creators c on c.id = sp.creator_id
                       where sp.platform = 'tiktok' and sp.engagement_rate > 0
                         and sp.import_status = 'active' and c.status = 'active'),
    'last_index',     (select max(last_updated_at)::date from social_profiles)
  );
$function$;

create or replace function public.top_creators(p_platform text default 'instagram'::text, p_limit integer default 10)
 returns table(handle text, display_name text, category text, followers integer, engagement numeric, med_views integer, posts integer)
 language sql
 stable security definer
as $function$
  with per_profile as (
    select sp.id as spid,
           sp.handle::text as handle,
           coalesce(nullif(c.display_name,''), nullif(c.full_name,''), sp.handle)::text as display_name,
           coalesce(nullif(c.category_name,''), 'Uncategorized')::text as category,
           sp.follower_count as followers,
           percentile_cont(0.5) within group
             (order by cp.likes_count + cp.comments_count) as med_eng,
           percentile_cont(0.5) within group
             (order by coalesce(cp.views_count, 0)) as med_views,
           count(*) as n
    from social_profiles sp
    join creators c on c.id = sp.creator_id
    join creator_posts cp on cp.social_profile_id = sp.id
    where sp.platform = p_platform
      and c.status = 'active'
      and sp.follower_count >= 10000
      and coalesce(c.category_name,'') not ilike '%fan%'
    group by sp.id, sp.handle, c.display_name, c.full_name,
             c.category_name, sp.follower_count
    having count(*) >= 8
  )
  select handle, display_name, category, followers,
         round((med_eng / nullif(followers,0) * 100)::numeric, 1) as engagement,
         round(med_views)::int as med_views,
         n::int as posts
  from per_profile
  where med_eng / nullif(followers,0) * 100
        between 0.5 and case when p_platform = 'tiktok' then 40 else 20 end
  order by case when p_platform = 'tiktok' then med_views
                else med_eng / nullif(followers,0) end desc
  limit p_limit;
$function$;
