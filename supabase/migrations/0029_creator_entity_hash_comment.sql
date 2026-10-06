-- 0029_creator_entity_hash_comment.sql
--
-- STATUS: APPLIED 2026-10-06, by hand in the Supabase SQL editor, one
-- statement at a time. Verified there the same day:
-- `select attname, col_description('creator_entity'::regclass, attnum) from
-- pg_attribute where attrelid = 'creator_entity'::regclass and attname in
-- ('inputs', 'input_hash');` returns both comments below, word for word.
--
-- Comments only: no schema or data change. Brings the column comments on
-- creator_entity in line with what the classifier does since 2026-10-06
-- (lib/creator-entity/classify.ts):
--
--   * input_hash covers every input EXCEPT follower_count. Follower counts
--     move on every re-scrape and say nothing about what kind of account it
--     is, so a re-scrape that only moves them no longer costs a model call.
--     0026 left input_hash without a comment and described it on inputs as
--     "sha256 over it", which is no longer exact.
--   * inputs.follower_count is refreshed on rows whose verdict stands, so it
--     can be newer than the verdict; every other field in inputs is still
--     exactly what the model saw.
--
-- The stored hashes themselves are rewritten by
-- `npm run creator-entity:rehash -- --write`, not by SQL: the hash is computed
-- in TypeScript and is not reproducible byte for byte in Postgres.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, one statement at a time, same as 0001-0028. Rerunnable:
-- COMMENT ON replaces the previous comment.

comment on column creator_entity.inputs is
  'The record sent to the model: platform, handle, display_name, follower_count, bio, category, business flag, link domain, truncated summary. Every field is exactly what the model saw except follower_count, which a classify run refreshes on rows whose verdict stands, so it can be newer than the verdict. The review page displays from this, not from social_profiles.';

comment on column creator_entity.input_hash is
  'sha256 over inputs EXCEPT follower_count, keys sorted (hashInputs in lib/creator-entity/classify.ts, since 2026-10-06). A classify run skips the model call for rows whose input_hash and prompt_version both match; their signals, flag_count and inputs.follower_count are still refreshed. After any change to what the hash covers, npm run creator-entity:rehash -- --write rewrites stored hashes without calling the model.';
