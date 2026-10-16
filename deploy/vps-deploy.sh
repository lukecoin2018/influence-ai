#!/usr/bin/env bash
#
# deploy/vps-deploy.sh — deploy InfluenceIT on the VPS without taking the site
# down when the build fails.
#
# Run as root on the VPS:
#
#   bash /home/lukelmg/public_html/influenceit.app/deploy/vps-deploy.sh
#
# ── Why ─────────────────────────────────────────────────────────────────────
#
# The old chain ran `rm -rf .next && npm run build` inside the live app
# directory. The running process serves its static chunks from that .next, so
# from the `rm` until a successful build the live site had no chunks, and a
# FAILED build left it that way. Since 2026-10-14 the homepage build fails on
# purpose when its snapshot row is missing (supabase/migrations/0031), so a
# failed build has to be survivable.
#
# ── What it does ────────────────────────────────────────────────────────────
#
#   1. Fresh clone of origin/main into $RELEASES_DIR/build-<stamp>, copy
#      .env.local in, `npm ci`, `npm run build`. The live directory is not
#      touched. If anything fails the script stops here: the site keeps
#      serving, and the failed build stays on disk until the next run.
#   2. Swap: rename the live directory to $RELEASES_DIR/prev-<stamp>, rename
#      the build into its place. Two renames on one filesystem; the running
#      process keeps working until it is restarted, because its working
#      directory moves with the rename.
#   3. Restart by port (fuser -k 30001/tcp, then setsid nohup next start), as
#      CLAUDE.md requires; never by process name, never pm2.
#   4. Wait for the port to answer, then the chunk-file check: the chunk the
#      new process serves must exist in the new .next.
#   5. Keep the newest $KEEP_PREVIOUS prev-* directories; delete older ones.
#
# Rollback (prints the exact commands at the end of every run):
#   fuser -k 30001/tcp; mv LIVE RELEASES/failed-<stamp>; mv RELEASES/prev-<stamp> LIVE; restart.
#
# ── Overrides (env) ─────────────────────────────────────────────────────────
#
#   LIVE_DIR, RELEASES_DIR, APP_USER, APP_PORT, LOG_FILE, BRANCH,
#   KEEP_PREVIOUS, BUILD_CMD, SKIP_RESTART=1 (test the clone/build/swap logic
#   off the VPS; no restart and no port checks).

set -euo pipefail

LIVE_DIR="${LIVE_DIR:-/home/lukelmg/public_html/influenceit.app}"
RELEASES_DIR="${RELEASES_DIR:-/home/lukelmg/releases/influenceit.app}"
APP_USER="${APP_USER:-lukelmg}"
APP_PORT="${APP_PORT:-30001}"
LOG_FILE="${LOG_FILE:-/home/lukelmg/next-30001.log}"
BRANCH="${BRANCH:-main}"
KEEP_PREVIOUS="${KEEP_PREVIOUS:-2}"
BUILD_CMD="${BUILD_CMD:-npm ci && npm run build}"
SKIP_RESTART="${SKIP_RESTART:-0}"

stamp="$(date -u +%Y%m%d-%H%M%S)"
build_dir="$RELEASES_DIR/build-$stamp"
prev_dir="$RELEASES_DIR/prev-$stamp"

say() { printf '\n[deploy] %s\n' "$*"; }
die() { printf '\n[deploy] STOPPED: %s\n' "$*" >&2; exit 1; }

# GNU stat on the VPS, BSD stat on a Mac (SKIP_RESTART test runs).
dev_of()   { stat -c %d "$1" 2>/dev/null || stat -f %d "$1"; }
owner_of() { stat -c %U:%G "$1" 2>/dev/null || stat -f %Su:%Sg "$1"; }

# ── 0. Preconditions ─────────────────────────────────────────────────────────

[ -d "$LIVE_DIR/.git" ] || die "$LIVE_DIR is not a git checkout"
[ -f "$LIVE_DIR/.env.local" ] || die "$LIVE_DIR/.env.local is missing"
if [ -n "$(tail -c1 "$LIVE_DIR/.env.local")" ]; then
  die "$LIVE_DIR/.env.local does not end with a newline (two variables were glued together this way on 2026-09-14). Add one and rerun."
fi
if [ "$SKIP_RESTART" != "1" ] && [ "$(id -u)" != "0" ]; then
  die "run as root (the restart needs fuser and su)"
fi

mkdir -p "$RELEASES_DIR"
[ "$(dev_of "$RELEASES_DIR")" = "$(dev_of "$(dirname "$LIVE_DIR")")" ] \
  || die "$RELEASES_DIR and $LIVE_DIR are on different filesystems; the swap would copy instead of rename"

# Failed builds from earlier runs were kept for inspection until now.
for old in "$RELEASES_DIR"/build-*; do
  [ -e "$old" ] || continue
  say "removing the failed build kept from an earlier run: $old"
  rm -rf "$old"
done

# Anything in the live directory that the fresh clone will not carry over.
# The old directory is kept as prev-<stamp>, so nothing is lost; this is so
# a hand edit on the box does not vanish unnoticed.
extras="$(git -C "$LIVE_DIR" status --porcelain --ignored 2>/dev/null \
  | grep -vE '^!! (node_modules/|\.next/|\.env\.local$|next-env\.d\.ts$|tsconfig\.tsbuildinfo$)' || true)"
if [ -n "$extras" ]; then
  say "not carried over from the live directory (kept in $prev_dir after the swap):"
  printf '%s\n' "$extras"
fi

# ── 1. Build somewhere else ──────────────────────────────────────────────────

origin_url="$(git -C "$LIVE_DIR" remote get-url origin)"
say "cloning $BRANCH into $build_dir"
git clone --quiet --branch "$BRANCH" "$origin_url" "$build_dir"
cp -p "$LIVE_DIR/.env.local" "$build_dir/.env.local"
say "building $(git -C "$build_dir" rev-parse --short HEAD) (live is $(git -C "$LIVE_DIR" rev-parse --short HEAD))"

if ! (cd "$build_dir" && bash -c "$BUILD_CMD"); then
  die "build failed. The live site was not touched and is still serving $(git -C "$LIVE_DIR" rev-parse --short HEAD). The failed build is in $build_dir until the next run."
fi
[ -d "$build_dir/.next" ] || die "build reported success but produced no .next. Live site untouched."

# Same owner as the live directory, so the app user can write Next's ISR cache.
chown -R "$(owner_of "$LIVE_DIR")" "$build_dir"

# ── 2. Swap ──────────────────────────────────────────────────────────────────

say "swapping: live -> $prev_dir, build -> live"
mv "$LIVE_DIR" "$prev_dir"
if ! mv "$build_dir" "$LIVE_DIR"; then
  mv "$prev_dir" "$LIVE_DIR"
  die "could not move the build into place; the live directory was put back"
fi

rollback="fuser -k ${APP_PORT}/tcp; mv '$LIVE_DIR' '$RELEASES_DIR/failed-$stamp' && mv '$prev_dir' '$LIVE_DIR' && su - $APP_USER -c \"cd '$LIVE_DIR' && setsid nohup npx next start -p $APP_PORT > '$LOG_FILE' 2>&1 < /dev/null &\""

if [ "$SKIP_RESTART" = "1" ]; then
  say "SKIP_RESTART=1: not restarting. Rollback would be:"
  printf '  %s\n' "$rollback"
  exit 0
fi

# ── 3. Restart by port ───────────────────────────────────────────────────────

say "restarting port $APP_PORT"
fuser -k "${APP_PORT}/tcp" || true
sleep 3
su - "$APP_USER" -c "cd '$LIVE_DIR' && setsid nohup npx next start -p $APP_PORT > '$LOG_FILE' 2>&1 < /dev/null &"

# ── 4. Is the new build being served? ────────────────────────────────────────

code=""
for _ in $(seq 1 30); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/" 2>/dev/null || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
if [ "$code" != "200" ]; then
  say "port $APP_PORT answered '$code' after 60 s. Check $LOG_FILE. To roll back:"
  printf '  %s\n' "$rollback"
  exit 1
fi

chunk="$(curl -sS "http://127.0.0.1:${APP_PORT}/?buildcheck=$stamp" | grep -o '_next/static/chunks/[a-zA-Z0-9_.-]*\.js' | head -1 || true)"
if [ -n "$chunk" ] && [ -f "$LIVE_DIR/.next/static/chunks/${chunk##*/}" ]; then
  say "new build is live: $chunk exists in $LIVE_DIR/.next ($(git -C "$LIVE_DIR" rev-parse --short HEAD))"
else
  say "chunk check FAILED (served '${chunk:-nothing}', not in the new .next): the old process may still be serving. To roll back:"
  printf '  %s\n' "$rollback"
  exit 1
fi

# ── 5. Keep the newest $KEEP_PREVIOUS previous releases ──────────────────────

{ ls -1d "$RELEASES_DIR"/prev-* 2>/dev/null || true; } | sort -r | tail -n +"$((KEEP_PREVIOUS + 1))" | while read -r old; do
  say "removing old release $old"
  rm -rf "$old"
done

say "done. Rollback, if needed:"
printf '  %s\n' "$rollback"
say "if this deploy changed cache headers: rm -rf /var/webuzo-data/nginx_proxy_cache/lukelmg/*   (CLAUDE.md)"
