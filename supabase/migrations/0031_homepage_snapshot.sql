-- 0031_homepage_snapshot.sql
--
-- STATUS: NOT YET APPLIED. Apply with scripts/db/apply-0031.sh from the repo
-- root on the Mac, `--dry-run` first (see "Applying" below), BEFORE deploying
-- the app code that reads it (the homepage build fails on purpose while the
-- snapshot row is missing). Not in the Supabase SQL editor: it stops every
-- query at 1 minute, the dry run reads all of creator_posts twice, and the
-- setup and check files use psql-only commands.
--
-- The homepage, its share image, the report pages and the claim teaser stop
-- running aggregate queries while they render. They read one precomputed row
-- instead, written by refresh_homepage_snapshot().
--
-- ── Why ────────────────────────────────────────────────────────────────────
--
-- Measured 2026-10-14, 10:50-10:57 UTC, service-role API calls from a Mac,
-- during an enrich run: public_stats() 23.3 s and twice cancelled at its 30 s
-- limit (0030); top_creators() 14-31 s per platform, once cancelled; the
-- homepage's whole call sequence 61.3 s, against Next's 60 s build limit.
-- Every one of those queries reads all of creator_posts (~318k rows), and a
-- plain count(*) over that table did not finish inside the 8 s API limit,
-- while the same count on creators or social_profiles took 0.1-0.4 s.
-- Planner row estimates matched exact counts within 1% on nine predicates
-- across the three tables, so stale statistics were not the cause that day.
--
-- The page caught every failure and rendered hardcoded July figures (5,112
-- creators, "Jul 3, 2026") or an empty "Top 0" leaderboard, and ISR then
-- cached that for an hour. Four earlier fixes each raised a timeout; the
-- queries kept growing with the table. This removes them from the render
-- path instead.
--
-- ── What is here ───────────────────────────────────────────────────────────
--
-- Extensions (Supabase's documented forms):
--   pg_cron, in pg_catalog, with the grants Supabase's install guide gives;
--   pg_net, in extensions (it creates its own `net` schema), for the HTTP
--   call to /api/revalidate-home after each refresh.
--
-- Tables, all RLS-enabled with NO policies (service_role and the SQL editor
-- only, same lockdown as pipeline_runs, 0023):
--   homepage_snapshot           one row (id = true): payload jsonb,
--                               computed_at, duration_ms.
--   homepage_snapshot_runs      one row per refresh ATTEMPT: trigger,
--                               outcome ok | skipped | refused | failed,
--                               reason, analyzed, alerted_at (written by the
--                               app's alert check, never by these functions).
--   homepage_snapshot_requests  "please refresh soon" rows, inserted by
--                               request_homepage_refresh() after an import.
--   homepage_snapshot_alerts    alert bookkeeping for the staleness email,
--                               one row per kind ('stale').
--
-- Functions:
--   compute_homepage_snapshot()      the numbers, as one jsonb. Read-only.
--   homepage_snapshot_refusal(p, prev)
--                                    why a payload must not be saved, or null.
--   refresh_homepage_snapshot(trigger, analyze, force)
--                                    compute, check, save, and log the
--                                    attempt. Never raises: a failure is a
--                                    'failed' row, so it is never silent.
--   request_homepage_refresh(source, analyze, force)
--                                    queue a refresh; what the scraper calls
--                                    when an import finishes. force skips
--                                    the drop guard (see Refusals).
--   ping_homepage_revalidate()       POST https://influenceit.app/api/revalidate-home
--                                    via pg_net, bearer token from Vault.
--   run_homepage_snapshot_job(mode)  what the two cron jobs run.
--
-- Cron jobs:
--   homepage-snapshot-refresh     17 */6 * * *  refresh every 6 hours
--   homepage-snapshot-requests    */5 * * * *   pick up queued requests; an
--                                               idle tick reads one index and
--                                               writes nothing
--   cron-job-run-details-cleanup  41 3 * * *    delete cron.job_run_details
--                                               rows older than 7 days, for
--                                               every job (the 5-minute job
--                                               alone adds ~288 rows a day)
--
-- ── The payload ────────────────────────────────────────────────────────────
--
-- jsonb so a later page (/for-creators) can add its own figures to the same
-- row without another table. Version 1:
--
--   { "version": 1,
--     "stats": { creators, posts_analyzed, brand_deals, ig_median,
--                tiktok_median, last_index },
--     "leaderboards": { "instagram": [row x10], "tiktok": [row x10] },
--     "featured_pool": [entry x<=8] }
--
--   row   = { handle, display_name, category, followers, engagement,
--             med_views, posts }
--   entry = { display_name, handle, platform, followers, engagement,
--             location, posts_per_week, avg_views, detected_brands,
--             post_types: [{ post_type, n }] }
--
-- Definitions are 0027's public_stats() and top_creators(), with two
-- differences:
--   * creator_posts is read ONCE. One per-profile aggregate (post count,
--     sponsored count, median likes+comments, median views) feeds the post
--     and brand-deal totals and both leaderboards. public_stats() and two
--     top_creators() calls read it three times.
--   * last_index is max(last_updated_at) over ACTIVE creators' profiles
--     (public_stats() took every profile, hidden accounts included). It is
--     the date the page shows as "Index updated": the last time a profile
--     in the public index actually changed. computed_at is when the snapshot
--     ran, kept for monitoring and never shown.
-- Ties in a leaderboard are broken by handle, so the order is deterministic.
-- The featured pool is what app/_queries.ts built at render time: up to 8
-- featured active Instagram creators by display_order, else the first 8 of
-- the Instagram leaderboard, each with its profile's enrichment fields and
-- post-type counts. The app does the formatting (initials, content-mix
-- buckets, brand de-duplication) on read.
--
-- public_stats() and top_creators() are left in place, unused by the app,
-- for comparison in the SQL editor (see "After applying").
--
-- ── Refusals ───────────────────────────────────────────────────────────────
--
-- A payload is refused, and the previous row kept, when any of: creators is
-- 0 or missing, posts_analyzed is 0 or missing, either leaderboard is empty,
-- either platform median is null, last_index is null. Those are the
-- conditions under which the page would render a zero, an empty board or
-- "null%". A refusal is logged and emailed like a failure.
--
-- The drop guard: also refused when creators, posts_analyzed or brand_deals
-- is more than 20% below the last good snapshot (the row being replaced). A
-- fall that size is far more likely a broken import or a bad filter than the
-- index really shrinking. A deliberate cleanup (say a mass hide through
-- creator-entity:apply) is pushed through with a FORCED refresh, which skips
-- only this check, never the ones above:
--
--   select request_homepage_refresh('cleanup', p_force => true);
--
-- homepage_snapshot_runs.forced records which runs were forced.
--
-- ── Timeouts ───────────────────────────────────────────────────────────────
--
-- refresh_homepage_snapshot() carries statement_timeout = 55s. Supabase caps
-- API and dashboard queries at 60 s, and PostgREST hoists a called function's timeout
-- (0030), so if it is ever called over the API it fails inside the function
-- (logged as 'failed') rather than at the gateway. A function's own SET does
-- not arm a timer for the statement that called it (0030's header), so for
-- the cron path the limit is whatever the job's session has. The postgres
-- role is expected to have no statement_timeout (CLAUDE.md, measured
-- 2026-10-06), but that is a role setting nobody here controls, so the cron
-- commands do not depend on it: each sets statement_timeout = '15min' itself,
-- first, in the same command. When pg_cron runs a job over a connection it
-- sends the command as one simple query, and since PostgreSQL 13 the timeout
-- is armed per statement, so the SET governs the select that follows; a role
-- default can therefore never cut a refresh short of 15 minutes. 15 minutes
-- is far above the 23-31 s measured per query and still stops a refresh that
-- hangs (it then logs 'failed'). Check after applying: cron.job.command shows
-- the SET, and the apply script prints rolconfig for postgres.
--
-- That gap is why the scraper QUEUES a refresh instead of running one over
-- the API: the measured queries took 23-31 s each during an import, exactly
-- when the post-import refresh runs.
--
-- ── ANALYZE ────────────────────────────────────────────────────────────────
--
-- A request with run_analyze = true (the default) runs ANALYZE on creators,
-- social_profiles and creator_posts first, inside the refresh. ANALYZE may
-- run in a function; VACUUM may not, so this never vacuums. ANALYZE skips,
-- with only a WARNING, a table the function owner (postgres) does not own:
-- check pg_stat_user_tables.last_analyze after the first request.
--
-- ── Alerting (app side) ────────────────────────────────────────────────────
--
-- After every scheduled or requested attempt, ping_homepage_revalidate()
-- POSTs to /api/revalidate-home, which revalidates `/` and runs the alert
-- check in lib/homepage-snapshot/health.ts: one email to ADMIN_EMAIL for
-- every refused or failed run not yet alerted, and one when computed_at is
-- more than 12 hours old (repeated at most every 24 hours). The daily Vercel
-- cron runs the same check, so a dead pg_cron is still caught.
--
-- The bearer token is the app's REVALIDATE_SECRET, stored in Vault under the
-- name 'revalidate_secret'. It is NOT in this file. Without it the ping is
-- skipped with a WARNING; the page still picks up a new snapshot within its
-- 300 s revalidate, and the daily cron still alerts.
--
-- ── Applying ───────────────────────────────────────────────────────────────
--
-- One command, from the repo root on the Mac (scripts/db/apply-0031.sh), dry
-- run first:
--
--   scripts/db/apply-0031.sh --dry-run     # BEGIN, everything, a full
--                                          # compute, ROLLBACK
--   scripts/db/apply-0031.sh               # BEGIN, everything, COMMIT
--
-- It runs this file, then scripts/db/0031-setup.psql (stores the app's
-- REVALIDATE_SECRET in Vault as 'revalidate_secret', queues the first
-- refresh, prints the role timeouts and what the transaction contains),
-- through psql with ON_ERROR_STOP=1 in ONE transaction: an error anywhere
-- rolls all of it back, so production cannot be left half-migrated. The dry
-- run then also runs scripts/db/0031-dry-run-check.psql, which computes the
-- payload once and selects its stats and homepage_snapshot_refusal() of it,
-- before rolling everything back.
-- The secret is read from the environment or .env.local and never appears in
-- this file, the command line or the process list.
--
-- Rerunnable: IF NOT EXISTS / OR REPLACE throughout, cron.schedule() updates
-- a job of the same name, the extension creates are no-ops once installed,
-- and the setup file updates the Vault secret if it already exists.
--
-- The first refresh is queued, not run: the 5-minute cron job runs it inside
-- the database with no time limit. Not `select refresh_homepage_snapshot()`
-- from the SQL editor: Supabase documents a 60 s cap on dashboard queries too,
-- and the measured queries took 23-31 s each during an import.
--
-- ── After applying ─────────────────────────────────────────────────────────
--
--   select id, trigger, outcome, reason, duration_ms, analyzed, forced from homepage_snapshot_runs order by id desc limit 10;
--   select computed_at, payload -> 'stats' from homepage_snapshot;
--   select jobname, schedule, active from cron.job where jobname like 'homepage-snapshot-%';
--   select status, return_message, start_time from cron.job_run_details where jobid in (select jobid from cron.job where jobname like 'homepage-snapshot-%') order by start_time desc limit 10;
--   select id, status_code, error_msg, created from net._http_response order by created desc limit 5;
--
-- Comparison with the functions this replaces on the render path:
--
--   select public_stats();
--   select array_agg(handle) from top_creators('instagram', 10);
--   select array_agg(e ->> 'handle') from homepage_snapshot, jsonb_array_elements(payload #> '{leaderboards,instagram}') e;
--
-- Expected: identical except last_index (active profiles only, above) and
-- the order of exact ties.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net with schema extensions;

create table if not exists public.homepage_snapshot (
  id          boolean primary key default true check (id),
  payload     jsonb not null,
  computed_at timestamptz not null,
  duration_ms integer
);

alter table public.homepage_snapshot enable row level security;

create table if not exists public.homepage_snapshot_runs (
  id          bigint generated always as identity primary key,
  trigger     text not null,
  started_at  timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null,
  outcome     text not null check (outcome in ('ok', 'skipped', 'refused', 'failed')),
  reason      text,
  analyzed    boolean not null default false,
  forced      boolean not null default false,
  alerted_at  timestamptz
);

create index if not exists homepage_snapshot_runs_unalerted
  on public.homepage_snapshot_runs (id)
  where outcome in ('refused', 'failed') and alerted_at is null;

alter table public.homepage_snapshot_runs enable row level security;

create table if not exists public.homepage_snapshot_requests (
  id           bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  source       text not null,
  run_analyze  boolean not null default true,
  force        boolean not null default false,
  handled_at   timestamptz,
  run_id       bigint references public.homepage_snapshot_runs (id)
);

create index if not exists homepage_snapshot_requests_pending
  on public.homepage_snapshot_requests (id)
  where handled_at is null;

alter table public.homepage_snapshot_requests enable row level security;

create table if not exists public.homepage_snapshot_alerts (
  kind         text primary key,
  last_sent_at timestamptz
);

insert into public.homepage_snapshot_alerts (kind) values ('stale') on conflict (kind) do nothing;

alter table public.homepage_snapshot_alerts enable row level security;

create or replace function public.compute_homepage_snapshot()
 returns jsonb
 language sql
 stable
 set search_path = public
as $function$
  with active_profiles as (
    select sp.id,
           sp.platform::text as platform,
           sp.handle::text as handle,
           sp.follower_count,
           sp.engagement_rate,
           sp.import_status,
           sp.last_updated_at,
           sp.enrichment_data,
           sp.detected_city::text as detected_city,
           sp.creator_id,
           coalesce(nullif(c.display_name, ''), nullif(c.full_name, ''), sp.handle)::text as display_name,
           c.category_name::text as category_name
    from social_profiles sp
    join creators c on c.id = sp.creator_id
    where c.status = 'active'
  ),
  per_profile as (
    select cp.social_profile_id as spid,
           count(*) as n,
           count(*) filter (where cp.is_sponsored) as sponsored,
           percentile_cont(0.5) within group (order by cp.likes_count + cp.comments_count) as med_eng,
           percentile_cont(0.5) within group (order by coalesce(cp.views_count, 0)) as med_views
    from creator_posts cp
    join active_profiles ap on ap.id = cp.social_profile_id
    group by cp.social_profile_id
  ),
  board as (
    select ap.platform,
           ap.handle,
           ap.display_name,
           coalesce(nullif(ap.category_name, ''), 'Uncategorized') as category,
           ap.follower_count as followers,
           round((pp.med_eng / nullif(ap.follower_count, 0) * 100)::numeric, 1) as engagement,
           round(pp.med_views)::int as med_views,
           pp.n::int as posts,
           pp.med_eng / nullif(ap.follower_count, 0) as eng_ratio,
           pp.med_views as med_views_raw
    from active_profiles ap
    join per_profile pp on pp.spid = ap.id
    where ap.follower_count >= 10000
      and coalesce(ap.category_name, '') not ilike '%fan%'
      and pp.n >= 8
      and pp.med_eng / nullif(ap.follower_count, 0) * 100
          between 0.5 and case when ap.platform = 'tiktok' then 40 else 20 end
  ),
  top_instagram as (
    select row_number() over (order by eng_ratio desc, handle) as ord, *
    from board
    where platform = 'instagram'
    order by eng_ratio desc, handle
    limit 10
  ),
  top_tiktok as (
    select row_number() over (order by med_views_raw desc, handle) as ord, *
    from board
    where platform = 'tiktok'
    order by med_views_raw desc, handle
    limit 10
  ),
  featured_cores as (
    select row_number() over (order by c.display_order, c.id) as ord,
           c.id as creator_id,
           c.display_name::text as display_name,
           c.instagram_handle::text as handle,
           'instagram'::text as platform,
           c.follower_count as followers,
           c.engagement_rate as engagement,
           c.city::text as location
    from creators c
    where c.status = 'active'
      and c.is_featured
      and c.primary_platform = 'instagram'
      and coalesce(c.instagram_handle, '') <> ''
  ),
  cores as (
    select ord, creator_id, display_name, handle, platform, followers, engagement, location
    from featured_cores
    where ord <= 8
    union all
    select ord, null::uuid, display_name, handle, 'instagram'::text, followers, engagement, null::text
    from top_instagram
    where ord <= 8
      and not exists (select 1 from featured_cores)
  ),
  pool as (
    select k.ord,
           jsonb_build_object(
             'display_name',    k.display_name,
             'handle',          k.handle,
             'platform',        k.platform,
             'followers',       k.followers,
             'engagement',      k.engagement,
             'location',        coalesce(k.location, p.detected_city),
             'posts_per_week',  p.enrichment_data -> 'posting_frequency_per_week',
             'avg_views',       p.enrichment_data -> 'avg_views',
             'detected_brands', coalesce(p.enrichment_data -> 'detected_brands', '[]'::jsonb),
             'post_types',      coalesce(pt.types, '[]'::jsonb)
           ) as entry
    from cores k
    left join lateral (
      select ap.id, ap.enrichment_data, ap.detected_city
      from active_profiles ap
      where ap.platform = k.platform
        and case when k.creator_id is not null then ap.creator_id = k.creator_id
                 else ap.handle = k.handle end
      order by ap.id
      limit 1
    ) p on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('post_type', t.post_type, 'n', t.n) order by t.post_type) as types
      from (
        select cp.post_type::text as post_type, count(*) as n
        from creator_posts cp
        where cp.social_profile_id = p.id
        group by cp.post_type
      ) t
    ) pt on true
  ),
  stats as (
    select jsonb_build_object(
      'creators',       (select count(*) from creators
                         where import_status = 'active' and status = 'active'),
      'posts_analyzed', (select coalesce(sum(n), 0) from per_profile),
      'brand_deals',    (select coalesce(sum(sponsored), 0) from per_profile),
      'ig_median',      (select round(percentile_cont(0.5) within group (order by engagement_rate)::numeric, 1)
                         from active_profiles
                         where platform = 'instagram' and engagement_rate > 0 and import_status = 'active'),
      'tiktok_median',  (select round(percentile_cont(0.5) within group (order by engagement_rate)::numeric, 1)
                         from active_profiles
                         where platform = 'tiktok' and engagement_rate > 0 and import_status = 'active'),
      'last_index',     (select max(last_updated_at)::date from active_profiles)
    ) as v
  )
  select jsonb_build_object(
    'version', 1,
    'stats', (select v from stats),
    'leaderboards', jsonb_build_object(
      'instagram', coalesce((select jsonb_agg(jsonb_build_object(
                     'handle', handle, 'display_name', display_name, 'category', category,
                     'followers', followers, 'engagement', engagement, 'med_views', med_views,
                     'posts', posts) order by ord) from top_instagram), '[]'::jsonb),
      'tiktok',    coalesce((select jsonb_agg(jsonb_build_object(
                     'handle', handle, 'display_name', display_name, 'category', category,
                     'followers', followers, 'engagement', engagement, 'med_views', med_views,
                     'posts', posts) order by ord) from top_tiktok), '[]'::jsonb)
    ),
    'featured_pool', coalesce((select jsonb_agg(entry order by ord) from pool), '[]'::jsonb)
  );
$function$;

create or replace function public.homepage_snapshot_refusal(p jsonb, p_prev jsonb default null)
 returns text
 language sql
 immutable
as $function$
  select coalesce(
    case
      when coalesce((p #>> '{stats,creators}')::numeric, 0) <= 0 then 'stats.creators is 0 or missing'
      when coalesce((p #>> '{stats,posts_analyzed}')::numeric, 0) <= 0 then 'stats.posts_analyzed is 0 or missing'
      when (p #>> '{stats,ig_median}') is null then 'stats.ig_median is null'
      when (p #>> '{stats,tiktok_median}') is null then 'stats.tiktok_median is null'
      when (p #>> '{stats,last_index}') is null then 'stats.last_index is null'
      when jsonb_array_length(coalesce(p #> '{leaderboards,instagram}', '[]'::jsonb)) = 0 then 'Instagram leaderboard is empty'
      when jsonb_array_length(coalesce(p #> '{leaderboards,tiktok}', '[]'::jsonb)) = 0 then 'TikTok leaderboard is empty'
    end,
    (select format(
              'stats.%s fell %s%% below the last good snapshot (%s -> %s). If that is deliberate, force it: select request_homepage_refresh(''cleanup'', p_force => true);',
              m.k, round((1 - v.n / v.o) * 100, 1), v.o, v.n)
       from (values (1, 'creators'), (2, 'posts_analyzed'), (3, 'brand_deals')) as m(ord, k)
       cross join lateral (
         select (p_prev #>> array['stats', m.k])::numeric as o,
                (p #>> array['stats', m.k])::numeric as n
       ) v
      where p_prev is not null
        and v.o > 0
        and v.n < v.o * 0.8
      order by m.ord
      limit 1)
  );
$function$;

create or replace function public.refresh_homepage_snapshot(p_trigger text default 'manual', p_analyze boolean default false, p_force boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path = public
 set statement_timeout = '55s'
as $function$
declare
  v_started  timestamptz := clock_timestamp();
  v_payload  jsonb;
  v_prev     jsonb;
  v_outcome  text;
  v_reason   text;
  v_analyzed boolean := false;
  v_ms       integer;
  v_run_id   bigint;
begin
  if not pg_try_advisory_xact_lock(hashtext('public.refresh_homepage_snapshot')) then
    v_outcome := 'skipped';
    v_reason := 'another refresh holds the lock';
  else
    begin
      if p_analyze then
        analyze public.creators, public.social_profiles, public.creator_posts;
        v_analyzed := true;
      end if;

      v_payload := public.compute_homepage_snapshot();

      -- The row about to be replaced is the last good snapshot: only an 'ok'
      -- outcome ever writes it. A forced refresh compares against nothing,
      -- which skips the drop guard and nothing else.
      if not coalesce(p_force, false) then
        select payload into v_prev from public.homepage_snapshot where id;
      end if;

      v_reason := public.homepage_snapshot_refusal(v_payload, v_prev);

      if v_reason is null then
        insert into public.homepage_snapshot (id, payload, computed_at, duration_ms)
        values (true, v_payload, v_started, (extract(epoch from clock_timestamp() - v_started) * 1000)::integer)
        on conflict (id) do update
          set payload     = excluded.payload,
              computed_at = excluded.computed_at,
              duration_ms = excluded.duration_ms;
        v_outcome := 'ok';
      else
        v_outcome := 'refused';
      end if;
    exception
      when query_canceled then
        v_outcome := 'failed';
        v_reason := sqlstate || ': ' || sqlerrm;
      when others then
        v_outcome := 'failed';
        v_reason := sqlstate || ': ' || sqlerrm;
    end;
  end if;

  v_ms := (extract(epoch from clock_timestamp() - v_started) * 1000)::integer;

  insert into public.homepage_snapshot_runs (trigger, started_at, finished_at, duration_ms, outcome, reason, analyzed, forced)
  values (coalesce(nullif(p_trigger, ''), 'manual'), v_started, clock_timestamp(), v_ms, v_outcome, v_reason, v_analyzed, coalesce(p_force, false))
  returning id into v_run_id;

  return jsonb_build_object(
    'run_id',      v_run_id,
    'outcome',     v_outcome,
    'reason',      v_reason,
    'duration_ms', v_ms,
    'computed_at', case when v_outcome = 'ok' then v_started end
  );
end;
$function$;

create or replace function public.request_homepage_refresh(p_source text, p_analyze boolean default true, p_force boolean default false)
 returns bigint
 language sql
 security definer
 set search_path = public
as $function$
  insert into public.homepage_snapshot_requests (source, run_analyze, force)
  values (coalesce(nullif(p_source, ''), 'unknown'), coalesce(p_analyze, true), coalesce(p_force, false))
  returning id;
$function$;

create or replace function public.ping_homepage_revalidate()
 returns bigint
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_secret     text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'revalidate_secret';

  if v_secret is null then
    raise warning 'homepage snapshot: vault secret revalidate_secret is missing; /api/revalidate-home not called';
    return null;
  end if;

  select net.http_post(
    url                  := 'https://influenceit.app/api/revalidate-home',
    body                 := '{}'::jsonb,
    headers              := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  ) into v_request_id;

  return v_request_id;
exception
  when others then
    raise warning 'homepage snapshot: revalidate ping failed: % %', sqlstate, sqlerrm;
    return null;
end;
$function$;

create or replace function public.run_homepage_snapshot_job(p_mode text)
 returns jsonb
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_ids     bigint[];
  v_analyze boolean := false;
  v_force   boolean := false;
  v_result  jsonb;
begin
  if p_mode = 'request' then
    select array_agg(id order by id), coalesce(bool_or(run_analyze), false), coalesce(bool_or(force), false)
      into v_ids, v_analyze, v_force
      from public.homepage_snapshot_requests
     where handled_at is null;

    if v_ids is null then
      return null;
    end if;
  elsif p_mode is distinct from 'cron' then
    raise exception 'run_homepage_snapshot_job: unknown mode %', p_mode;
  end if;

  v_result := public.refresh_homepage_snapshot(p_mode, v_analyze, v_force);

  if p_mode = 'request' and v_result ->> 'outcome' <> 'skipped' then
    update public.homepage_snapshot_requests
       set handled_at = now(),
           run_id = (v_result ->> 'run_id')::bigint
     where id = any (v_ids);
  end if;

  perform public.ping_homepage_revalidate();

  return v_result;
end;
$function$;

revoke execute on function public.compute_homepage_snapshot() from public, anon, authenticated;

revoke execute on function public.homepage_snapshot_refusal(jsonb, jsonb) from public, anon, authenticated;

revoke execute on function public.refresh_homepage_snapshot(text, boolean, boolean) from public, anon, authenticated;

revoke execute on function public.request_homepage_refresh(text, boolean, boolean) from public, anon, authenticated;

revoke execute on function public.ping_homepage_revalidate() from public, anon, authenticated, service_role;

revoke execute on function public.run_homepage_snapshot_job(text) from public, anon, authenticated, service_role;

grant execute on function public.refresh_homepage_snapshot(text, boolean, boolean) to service_role;

grant execute on function public.request_homepage_refresh(text, boolean, boolean) to service_role;

select cron.schedule('homepage-snapshot-refresh', '17 */6 * * *', $$set statement_timeout = '15min'; select public.run_homepage_snapshot_job('cron')$$);

select cron.schedule('homepage-snapshot-requests', '*/5 * * * *', $$set statement_timeout = '15min'; select public.run_homepage_snapshot_job('request')$$);

select cron.schedule('cron-job-run-details-cleanup', '41 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

notify pgrst, 'reload schema';
