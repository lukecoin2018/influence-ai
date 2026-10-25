#!/usr/bin/env bash
#
# scripts/db/cleanup-2026-10.sh — shrink the database for the move from the
# Supabase Pro plan to Free (read-only above 500 MB), October 2026. From the
# repo root on the Mac, with imports paused:
#
#   scripts/db/cleanup-2026-10.sh --dry-run       # FIRST: everything, measured, ROLLBACK
#   scripts/db/cleanup-2026-10.sh                 # only after a clean dry run
#   scripts/db/cleanup-2026-10.sh --vacuum-only   # if the real run's VACUUM gave up on a lock
#
# What goes, and nothing else:
#
#   1. creator_posts rows outside their profile's 15 newest (posted_at newest
#      first, undated last; 15 is the scraper's own window, RECENT_POSTS_WINDOW
#      in inf-scraper app/api/enrich/process/route.ts), unless the post is
#      evidence of a brand deal: is_sponsored, actor_is_sponsored or
#      actor_is_ad true, or detected_brands not empty. Every brand figure in
#      both repos reads only such posts, so none of them changes.
#   2. Every creator_posts row of a hidden account (creators.status =
#      'non_creator'), whatever its age, under the same brand-deal rule:
#      lib/pipeline/classify.ts and inf-scraper's brand scripts count posts
#      without looking at status. The accounts stay. Their creators,
#      social_profiles and creator_entity rows are how the scraper knows not
#      to import the handle again (discovery skips any handle in
#      v_social_profiles_all) and where the Creator Review decision lives.
#   3. Stage 2: creators.embedding on those hidden accounts. embedded_at stays
#      set, so the scraper's embedding queue does not pick them up again.
#   4. idx_posts_posted_at (0 scans since 2025-12-08), idx_posts_social_profile
#      (same as idx_creator_posts_social_profile_id, 0005), idx_brands_handle
#      (same as the unique brands_instagram_handle_key), idx_brands_last_updated
#      (2 scans), and the constraint partnerships_creator_id_brand_id_post_url_key
#      (same as the unique index partnerships_unique_creator_brand_post, the
#      brand-feed upsert's arbiter). The constraint is skipped if any function
#      in the database names it.
#
#   Never touched: any creator another table references (creator_profiles,
#   creator_requests, shortlists, inquiries, ...; worked out from the foreign
#   keys at run time, so a new table counts too), the archive tables, and
#   every row outside creator_posts except the embeddings in 3.
#
# The real run, in order:
#
#   - preflight, read-only (scripts/db/cleanup-2026-10-preflight.psql): stops
#     on anything unexpected, including a homepage refresh that is running,
#     queued, or due within 40 minutes
#   - pg_dump -Fc -n public into the backup folder: a restorable copy of every
#     table this touches, on this Mac
#   - ONE transaction, REPEATABLE READ, ON_ERROR_STOP=1: the preflight again,
#     the plan (-plan.psql), \copy of every row it removes to CSV (-export),
#     the deletes in batches and the embeddings (-apply), the index drops
#     LAST (-drop), COMMIT. Any error rolls back everything.
#   - outside a transaction (-vacuum): VACUUM (FULL, ANALYZE) creator_posts,
#     then creators, the sizes, and a forced homepage refresh request (the
#     posts count falls by about 40%, which the drop guard would refuse).
#
# The dry run is the preflight, then the same transaction plus a measurement
# (-measure.psql), then ROLLBACK. No dump, no VACUUM, no refresh request. It
# writes the CSVs, so they can be checked. The measurement copies the rows
# that stay into temporary tables and rebuilds their indexes, which is the
# work VACUUM FULL does, so it prints the projected database size after
# stage 1 and after stage 2 and how long each VACUUM FULL will lock its
# table, measured on the live hardware.
#
# Locks. The deletes and the update block no reader. An index drop locks its
# whole table, reads included, until COMMIT, which is why the drops come
# last. VACUUM FULL locks its table for its whole run: creator_posts (only the
# report pages, the homepage refresh and the admin pages read it) and then
# creators (nearly every creator-facing page, and lmg.media's AI match). The
# transaction and the VACUUM give up after waiting 10 s for a lock. If the run
# stops on "canceling statement due to lock timeout": inside the transaction,
# nothing was changed, so run it again later; at the VACUUM, the cleanup is
# committed, so run --vacuum-only later.
#
# Backup folder: $CLEANUP_BACKUP_DIR, else ~/influenceit-db-backup, one
# subfolder per run (the dry run's ends in -dry-run). It must be outside the
# repo. The CSVs and the dump hold creators' emails: keep the folder private.
# To undo a step: \copy the CSV back into its table; hidden_creators.csv holds
# the embeddings; dropped_indexes.csv holds each dropped index's definition.
#
# Needs psql 15 or newer and pg_dump no older than the server's Postgres:
# `brew install libpq` (keg-only; this script also looks in
# /opt/homebrew/opt/libpq/bin). Both checked before anything else.
#
# Reads, and never prints or writes anywhere:
#   SUPABASE_DB_URL    the "Session pooler" connection string (Dashboard ->
#                      Connect -> Session pooler, port 5432), from the
#                      environment or a hidden prompt. Paste it as shown, with
#                      the [YOUR-PASSWORD] placeholder or no password: the
#                      password is then asked for separately, hidden, and
#                      passed in PGPASSWORD, so a password with @ or / in it
#                      needs no URL-encoding and never appears in the process
#                      list.

set -euo pipefail

die() { printf 'cleanup-2026-10: %s\n' "$*" >&2; exit 1; }
say() { printf 'cleanup-2026-10: %s\n' "$*" >&2; }

cd "$(dirname "$0")/../.."
ROOT="$(pwd -P)"
PREFLIGHT="$ROOT/scripts/db/cleanup-2026-10-preflight.psql"
PLAN="$ROOT/scripts/db/cleanup-2026-10-plan.psql"
EXPORT="$ROOT/scripts/db/cleanup-2026-10-export.psql"
APPLY="$ROOT/scripts/db/cleanup-2026-10-apply.psql"
MEASURE="$ROOT/scripts/db/cleanup-2026-10-measure.psql"
DROP="$ROOT/scripts/db/cleanup-2026-10-drop.psql"
VACUUM="$ROOT/scripts/db/cleanup-2026-10-vacuum.psql"
for f in "$PREFLIGHT" "$PLAN" "$EXPORT" "$APPLY" "$MEASURE" "$DROP" "$VACUUM"; do
  [ -f "$f" ] || die "run from a checkout that has $f"
done

case "${1:-}" in
  --dry-run)     mode=dry ;;
  "")            mode=real ;;
  --vacuum-only) mode=vacuum ;;
  *)             die "usage: scripts/db/cleanup-2026-10.sh [--dry-run | --vacuum-only]" ;;
esac

# ── psql and pg_dump ────────────────────────────────────────────────────────
PSQL="$(command -v psql || true)"
[ -n "$PSQL" ] || { [ -x /opt/homebrew/opt/libpq/bin/psql ] && PSQL=/opt/homebrew/opt/libpq/bin/psql; } || true
[ -n "$PSQL" ] || die "psql not found. Install it with: brew install libpq"
psql_major="$("$PSQL" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
[ "$psql_major" -ge 15 ] || die "psql $psql_major found; 15 or newer is needed. brew install libpq"

# pg_dump from the same install as psql first, so the two match.
PG_DUMP="$(dirname "$PSQL")/pg_dump"
[ -x "$PG_DUMP" ] || PG_DUMP="$(command -v pg_dump || true)"
[ -n "$PG_DUMP" ] || { [ -x /opt/homebrew/opt/libpq/bin/pg_dump ] && PG_DUMP=/opt/homebrew/opt/libpq/bin/pg_dump; } || true
if [ "$mode" != vacuum ]; then
  [ -n "$PG_DUMP" ] && [ -x "$PG_DUMP" ] || die "pg_dump not found. Install it with: brew install libpq"
fi

# ── the connection ──────────────────────────────────────────────────────────
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  printf 'Session pooler connection string (hidden, press Enter after pasting): ' >&2
  read -rs SUPABASE_DB_URL
  printf '\n' >&2
fi
[ -n "$SUPABASE_DB_URL" ] || die "no connection string"
SUPABASE_DB_URL="${SUPABASE_DB_URL//:\[YOUR-PASSWORD\]@/@}"
if [[ ! "$SUPABASE_DB_URL" =~ ^postgres(ql)?://[^/@:]+:[^@]+@ ]] && [ -z "${PGPASSWORD:-}" ]; then
  printf 'Database password (hidden): ' >&2
  read -rs PGPASSWORD
  printf '\n' >&2
  export PGPASSWORD
fi
export PGCONNECT_TIMEOUT=15 PGAPPNAME=cleanup-2026-10

# pager=off: in a terminal, psql otherwise hands a long result to `less` and
# waits for a keypress with the transaction still open.
PSQL_ARGS=(-X -q -P pager=off -v ON_ERROR_STOP=1)

run_vacuum() {
  say "VACUUM (FULL, ANALYZE) creator_posts, then creators. Each locks its table while it runs."
  if ! "$PSQL" "$SUPABASE_DB_URL" "${PSQL_ARGS[@]}" -f "$VACUUM"; then
    die "the VACUUM step stopped on the error above. The cleanup itself is committed and complete. Run scripts/db/cleanup-2026-10.sh --vacuum-only in a few minutes; repeating it is harmless."
  fi
  printf '\ncleanup-2026-10: done. In about 10 minutes, check that the forced refresh saved:\n' >&2
  printf '  select id, trigger, outcome, reason, duration_ms, analyzed, forced from homepage_snapshot_runs order by id desc limit 3;\n' >&2
}

if [ "$mode" = vacuum ]; then
  run_vacuum
  exit 0
fi

# ── versions, before anything else ──────────────────────────────────────────
# pg_dump refuses to dump a server newer than itself, so an old one would only
# fail at the real run's backup step. Checked here, in the dry run too.
server_num="$("$PSQL" "$SUPABASE_DB_URL" -X -A -t -q -v ON_ERROR_STOP=1 -c 'show server_version_num' | tr -d '[:space:]')" \
  || die "could not connect (see above). Nothing was changed."
[[ "$server_num" =~ ^[0-9]+$ ]] || die "unexpected server_version_num '$server_num'. Nothing was changed."
server_major=$((server_num / 10000))
dump_major="$("$PG_DUMP" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
if [ "$dump_major" -lt "$server_major" ]; then
  die "pg_dump $dump_major ($PG_DUMP) is older than the server's Postgres $server_major, so the real run could not take its backup. Upgrade it with: brew upgrade libpq. Nothing was changed."
fi
say "server Postgres $server_major; psql $psql_major and pg_dump $dump_major here: OK"

# ── preflight, read-only ────────────────────────────────────────────────────
"$PSQL" "$SUPABASE_DB_URL" "${PSQL_ARGS[@]}" -v check_window=true -f "$PREFLIGHT" \
  || die "the preflight stopped on the message above. Nothing was changed."

# ── the backup folder ───────────────────────────────────────────────────────
BACKUP_BASE="${CLEANUP_BACKUP_DIR:-$HOME/influenceit-db-backup}"
case "$BACKUP_BASE" in /*) ;; *) BACKUP_BASE="$ROOT/$BACKUP_BASE" ;; esac
case "$BACKUP_BASE/" in
  "$ROOT/"*) die "the backup folder $BACKUP_BASE is inside the repo. Set CLEANUP_BACKUP_DIR to a folder outside it." ;;
esac
OUT="$BACKUP_BASE/$(date -u +%Y%m%dT%H%M%SZ)"
[ "$mode" = dry ] && OUT="$OUT-dry-run"
(umask 077 && mkdir -p "$OUT")
say "backup folder: $OUT"

# ── the dump, real run only ─────────────────────────────────────────────────
if [ "$mode" = real ]; then
  say "pg_dump of schema public into $OUT/public.dump (a few minutes) ..."
  "$PG_DUMP" "$SUPABASE_DB_URL" -Fc -n public -f "$OUT/public.dump" \
    || die "pg_dump failed (above). Nothing was changed."
  say "pg_dump done: $(du -h "$OUT/public.dump" | cut -f1)"
fi

# ── the transaction ─────────────────────────────────────────────────────────
finish=commit
files=(-f "$PREFLIGHT" -f "$PLAN" -f "$EXPORT" -f "$APPLY")
if [ "$mode" = dry ]; then
  finish=rollback
  files+=(-f "$MEASURE")
fi
files+=(-f "$DROP")

say "running the cleanup in one transaction, then $(printf '%s' "$finish" | tr a-z A-Z)"

# psql runs from the backup folder, so the \copy files land there.
if ! (cd "$OUT" && "$PSQL" "$SUPABASE_DB_URL" "${PSQL_ARGS[@]}" \
  -v check_window=false -v batch_size=20000 \
  -c 'begin isolation level repeatable read' \
  "${files[@]}" \
  -c "$finish"); then
  die "psql stopped on the error above. The transaction was rolled back: nothing was changed."
fi

if [ "$mode" = dry ]; then
  printf '\ncleanup-2026-10: dry run complete, ROLLED BACK. Nothing was changed.\n' >&2
  printf 'cleanup-2026-10: the CSVs are in %s.\n' "$OUT" >&2
  printf 'cleanup-2026-10: run it for real only if the keep counts, the projection and the lock times above look right.\n' >&2
  exit 0
fi

say "COMMITTED. The CSVs and the dump are in $OUT."
run_vacuum
