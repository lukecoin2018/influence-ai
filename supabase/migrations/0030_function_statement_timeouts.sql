-- 0030_function_statement_timeouts.sql
--
-- STATUS: APPLIED 2026-10-06, by hand in the Supabase SQL editor, one
-- statement at a time. Verified the same day:
--   * pg_proc.proconfig shows apply_creator_entity statement_timeout=60s
--     (search_path=public kept), public_stats 30s, top_creators 30s;
--   * `npm run creator-entity:apply -- --write` passed all 9 chunks with no
--     timeout and wrote 0 changes. Chunk 1 of the same run had failed twice
--     that morning, before this was applied — so the hoisted timeout is in
--     effect on this project's PostgREST.
--
-- Gives three functions their own statement_timeout, so the API calls that
-- need longer than 8 s get it without widening every service-role call.
--
-- ── Why ────────────────────────────────────────────────────────────────────
--
-- Every API (PostgREST) call runs in authenticator's session, which sets
-- statement_timeout = 8s and lock_timeout = 8s. service_role sets neither, so
-- service-role calls inherit both (Supabase timeouts guide; role settings
-- checked 2026-10-06: anon 3s, authenticated 8s, service_role none,
-- authenticator 8s, postgres none). Two things run past 8 s:
--   * public_stats() on a cold database — cancelled at 8.2 s twice in a row on
--     2026-10-06, which left the VPS homepage on its fallback figures;
--   * apply_creator_entity() — `npm run creator-entity:apply -- --write`
--     failed on chunk 1 (1,000 ids) twice on the morning of 2026-10-06, with
--     nothing left to change.
-- top_creators() is ~0.5 s warm and ~1 s cold today, and gets the same
-- headroom as public_stats() because the homepage reads both cold.
--
-- ── How it works ───────────────────────────────────────────────────────────
--
-- A function's own SET statement_timeout would not, on its own, extend the
-- timer of the statement that calls it. PostgREST closes that gap: it
-- "hoists" a called function's settings into transaction-scoped settings,
-- overriding the role's, for the settings listed in db-hoisted-tx-settings —
-- statement_timeout by default since v12 (PostgREST docs, "Transactions";
-- Supabase timeouts guide, "Function level"). This project runs PostgREST
-- v14.5 (OpenAPI info.version at /rest/v1/, 2026-10-06). The longer timeout
-- therefore applies only when one of these functions is the RPC being
-- called; every other service-role call keeps 8 s.
--
-- PostgREST reads function settings into its schema cache, hence the reload
-- at the end. lock_timeout is not changed: a call that waits on a lock still
-- gives up at 8 s.
--
-- accept_creator_entity() is deliberately not listed: it calls
-- apply_creator_entity() internally, and only the RPC'd function's settings
-- are hoisted, so a bulk accept keeps 8 s. It handles at most one page
-- (100 rows) from /admin/creator-review and has never come near that.
--
-- ── Keep in mind ───────────────────────────────────────────────────────────
--
-- CREATE OR REPLACE FUNCTION replaces a function's SET clauses. Rerunning
-- 0027 (which defines all three) would drop these timeouts; rerun this file
-- after it.
--
-- To check the settings after applying:
--   select proname, proconfig from pg_proc
--    where proname in ('public_stats', 'top_creators', 'apply_creator_entity');
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, one statement at a time, same as 0001-0029. Rerunnable: ALTER
-- FUNCTION ... SET replaces the previous value.

alter function public.public_stats() set statement_timeout = '30s';

alter function public.top_creators(text, integer) set statement_timeout = '30s';

alter function public.apply_creator_entity(uuid[], boolean) set statement_timeout = '60s';

notify pgrst, 'reload schema';
