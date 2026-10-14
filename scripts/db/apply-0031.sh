#!/usr/bin/env bash
#
# scripts/db/apply-0031.sh — apply migration 0031 to the database in ONE
# transaction, from the repo root on the Mac:
#
#   scripts/db/apply-0031.sh --dry-run   # FIRST: everything, a full compute, ROLLBACK
#   scripts/db/apply-0031.sh             # only after a clean dry run: everything, COMMIT
#
# Runs supabase/migrations/0031_homepage_snapshot.sql, then
# scripts/db/0031-setup.psql (Vault secret, first refresh request, role
# timeouts, a summary), between one BEGIN and one COMMIT, with
# ON_ERROR_STOP=1: the first error stops psql, the connection closes, and the
# server rolls back everything, so production cannot be left half-migrated.
#
# --dry-run runs exactly the same statements, then
# scripts/db/0031-dry-run-check.psql (computes the payload once against the
# real data and selects its stats and homepage_snapshot_refusal() of it,
# timed), then ROLLBACK. A clean dry run ends with a NULL refusal and
# non-zero board and pool counts; anything else, do not apply.
#
# Needs psql 15 or newer: `brew install libpq` (keg-only; this script also
# looks in /opt/homebrew/opt/libpq/bin).
#
# Reads, and never prints or writes anywhere:
#   REVALIDATE_SECRET  from the environment, else from .env.local. Must match
#                      the value set on Vercel and the VPS.
#   SUPABASE_DB_URL    the "Session pooler" connection string (Dashboard ->
#                      Connect -> Session pooler, port 5432), from the
#                      environment or a hidden prompt. Paste it as shown, with the
#                      [YOUR-PASSWORD] placeholder or no password: the
#                      password is then asked for separately, hidden, and
#                      passed in PGPASSWORD, so a password with @ or / in it
#                      needs no URL-encoding and never appears in the process
#                      list.

set -euo pipefail

die() { printf 'apply-0031: %s\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")/../.."
MIGRATION=supabase/migrations/0031_homepage_snapshot.sql
SETUP=scripts/db/0031-setup.psql
DRY_RUN_CHECK=scripts/db/0031-dry-run-check.psql
for f in "$MIGRATION" "$SETUP" "$DRY_RUN_CHECK"; do
  [ -f "$f" ] || die "run from a checkout that has $f"
done

case "${1:-}" in
  --dry-run) finish=rollback ;;
  "")        finish=commit ;;
  *)         die "usage: scripts/db/apply-0031.sh [--dry-run]" ;;
esac

# ── psql ────────────────────────────────────────────────────────────────────
PSQL="$(command -v psql || true)"
[ -n "$PSQL" ] || { [ -x /opt/homebrew/opt/libpq/bin/psql ] && PSQL=/opt/homebrew/opt/libpq/bin/psql; } || true
[ -n "$PSQL" ] || die "psql not found. Install it with: brew install libpq"
major="$("$PSQL" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
[ "$major" -ge 15 ] || die "psql $major found; 15 or newer is needed (\\getenv). brew install libpq"

# ── the secret ──────────────────────────────────────────────────────────────
if [ -z "${REVALIDATE_SECRET:-}" ] && [ -f .env.local ]; then
  REVALIDATE_SECRET="$(grep -E '^REVALIDATE_SECRET=' .env.local | tail -1 | cut -d= -f2- | sed -E "s/^[\"']//; s/[\"']\$//")"
fi
[ -n "${REVALIDATE_SECRET:-}" ] || die "REVALIDATE_SECRET is not set (environment or .env.local). Generate one with: openssl rand -hex 32"
[ "${#REVALIDATE_SECRET}" -ge 32 ] || die "REVALIDATE_SECRET is shorter than 32 characters; generate one with: openssl rand -hex 32"
export REVALIDATE_SECRET

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
export PGCONNECT_TIMEOUT=15 PGAPPNAME=apply-0031

printf 'apply-0031: running %s and %s in one transaction, then %s\n' "$MIGRATION" "$SETUP" "$(printf '%s' "$finish" | tr a-z A-Z)" >&2

files=(-f "$MIGRATION" -f "$SETUP")
[ "$finish" = rollback ] && files+=(-f "$DRY_RUN_CHECK")

if ! "$PSQL" "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 \
  -c 'begin' \
  "${files[@]}" \
  -c "$finish"; then
  die "psql stopped on the error above. The transaction was rolled back: nothing was changed."
fi

if [ "$finish" = rollback ]; then
  printf '\napply-0031: dry run complete, ROLLED BACK. Nothing was changed.\n' >&2
  printf 'apply-0031: apply for real only if the refusal above is empty and the board and pool counts are above 0.\n' >&2
else
  printf '\napply-0031: COMMITTED. Within 5 minutes, check:\n' >&2
  printf '  select id, trigger, outcome, reason, duration_ms, analyzed, forced from homepage_snapshot_runs order by id desc limit 5;\n' >&2
fi
