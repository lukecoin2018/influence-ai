#!/usr/bin/env bash
#
# scripts/db/apply-0032.sh — apply migration 0032 (a second admin) to the
# database in ONE transaction, from the repo root on the Mac:
#
#   scripts/db/apply-0032.sh --dry-run   # FIRST: everything plus the tests, ROLLBACK
#   scripts/db/apply-0032.sh             # only after a clean dry run: COMMIT
#
# Both modes run, between one BEGIN and one COMMIT or ROLLBACK, with
# ON_ERROR_STOP=1 (the first error stops psql and the server rolls back
# everything):
#
#   scripts/db/0032-before.psql   counts the rows you, a creator, a brand and
#                                 a signed-in stranger can each see
#   supabase/migrations/0032_admin_users.sql
#   scripts/db/0032-after.psql    counts again and prints before against
#                                 after; any difference, or you no longer
#                                 being an admin, is an error, so the
#                                 migration cannot be committed that way
#
# --dry-run adds scripts/db/0032-dry-run-check.psql (a blocked admin, the four
# admin functions, a second admin added, blocked, unblocked and removed, and
# whether a second admin can touch your access), then ROLLBACK. A clean dry
# run ends with every ok = t and "failed 0".
#
# The transaction is REPEATABLE READ so before and after are counted on the
# same snapshot: a creator the scraper adds mid-run cannot make them differ.
#
# While it runs (seconds), reads of the tables whose policies change, and
# sign-ins, wait; see the "Locks" note in the migration. If it stops on
# "canceling statement due to lock timeout", nothing was changed: run it
# again a few minutes later.
#
# Needs psql 15 or newer: `brew install libpq` (keg-only; this script also
# looks in /opt/homebrew/opt/libpq/bin).
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

die() { printf 'apply-0032: %s\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")/../.."
BEFORE=scripts/db/0032-before.psql
MIGRATION=supabase/migrations/0032_admin_users.sql
AFTER=scripts/db/0032-after.psql
DRY_RUN_CHECK=scripts/db/0032-dry-run-check.psql
for f in "$BEFORE" "$MIGRATION" "$AFTER" "$DRY_RUN_CHECK"; do
  [ -f "$f" ] || die "run from a checkout that has $f"
done

case "${1:-}" in
  --dry-run) finish=rollback ;;
  "")        finish=commit ;;
  *)         die "usage: scripts/db/apply-0032.sh [--dry-run]" ;;
esac

# ── psql ────────────────────────────────────────────────────────────────────
PSQL="$(command -v psql || true)"
[ -n "$PSQL" ] || { [ -x /opt/homebrew/opt/libpq/bin/psql ] && PSQL=/opt/homebrew/opt/libpq/bin/psql; } || true
[ -n "$PSQL" ] || die "psql not found. Install it with: brew install libpq"
major="$("$PSQL" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
[ "$major" -ge 15 ] || die "psql $major found; 15 or newer is needed. brew install libpq"

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
export PGCONNECT_TIMEOUT=15 PGAPPNAME=apply-0032

printf 'apply-0032: running %s in one transaction, then %s\n' "$MIGRATION" "$(printf '%s' "$finish" | tr a-z A-Z)" >&2

files=(-f "$BEFORE" -f "$MIGRATION" -f "$AFTER")
[ "$finish" = rollback ] && files+=(-f "$DRY_RUN_CHECK")

# pager=off: in a terminal, psql otherwise hands a long result to `less` and
# waits for a keypress with the transaction still open, holding its locks.
# client_min_messages: hides the "policy ... does not exist, skipping"
# notices from the migration's DROP POLICY IF EXISTS lines; warnings and
# errors still show.
if ! "$PSQL" "$SUPABASE_DB_URL" -X -q -P pager=off -v ON_ERROR_STOP=1 \
  -c 'begin isolation level repeatable read' \
  -c 'set local client_min_messages = warning' \
  "${files[@]}" \
  -c "$finish"; then
  die "psql stopped on the error above. The transaction was rolled back: nothing was changed."
fi

if [ "$finish" = rollback ]; then
  printf '\napply-0032: dry run complete, ROLLED BACK. Nothing was changed.\n' >&2
  printf 'apply-0032: apply for real only if every ok above is t and the summary says failed 0.\n' >&2
else
  printf '\napply-0032: COMMITTED. Before and after matched for every account, and you are still an admin.\n' >&2
  printf 'apply-0032: now reload /admin/brand-index in production: it must show the same brands as before.\n' >&2
fi
