# CLAUDE.md — influence-ai / InfluenceIT

Read this before doing anything. Every rule here exists because skipping it
caused a real problem.

---

## Who you're working with

Lukas is the founder, not a strong coder. Explain decisions in plain terms and
make the call on technical questions — but surface genuine strategic choices for
him to decide.

He verifies in production with screenshots. Trust those over any tool's report,
including your own. If your plan doesn't match his understanding, he'll say so —
that check has caught real errors, repeatedly.

---

## Non-negotiable workflow

### Step 0 — prove your ref, every session

```
git rev-parse HEAD
git rev-parse origin/main
git fetch origin && git rev-parse origin/main
git log origin/main..HEAD --oneline
git status --short
```

**The fetch is mandatory and the pre-fetch SHA proves nothing.** `origin/main` is
a cached local pointer; it means something only after fetching. A checkout has
been stale several times, and once a PR believed to be merged was not — so a fix
was thought live in production when it wasn't.

If HEAD doesn't match what the prompt expects, STOP. If `main` has moved *ahead*,
verify with `git diff --quiet HEAD origin/main` before assuming it matters — main
catching up is the benign direction.

**A stale checkout is not always harmless.** If files in scope changed in the gap,
reading them from disk gives wrong answers. Read blobs from the ref
(`git show origin/main:<path>`) for investigations, and make Lukas pull before
building.

**Watch for stray worktrees.** `git worktree list` — a detached worktree under
`.claude/worktrees/` once swallowed a `git pull` and made it look like the pull
hadn't run.

### Two phases, always

**Investigate → STOP for review → build → show the full diff → STOP.**

Never build before the diagnosis is approved. Never commit before the diff is
seen. Never merge or deploy — that's Lukas's, always. Opening the PR is his too;
give him the link.

### One concern per branch

No unrelated fixes riding along, however small. Note them in the report instead.

### Read-only means read-only

No writes, no edits, no build, no SQL, no browser. If you find something broken
during an investigation, write it down and keep going.

### Evidence, not assertion

Cite file paths and line numbers for every claim. **UNKNOWN is a good answer; a
plausible-sounding guess is not.** If the code can't tell you, say what would
settle it and don't run it.

Where you can cheaply turn a reading into a measurement, do. Running a helper and
reading its real output beats transcribing what you think it emits. That has
caught things a code review would have missed.

### Never enter credentials

Don't type passwords into forms, don't ask for a Postgres connection string. A
test needing a login goes back to Lukas.

---

## The VPS — three separate incidents came from undocumented infrastructure here

Vercel has been clean throughout. Every environment-specific bug has been the VPS.

### Deploying

```
cd /home/lukelmg/public_html/influenceit.app \
  && git checkout -- package-lock.json \
  && git pull origin main \
  && npm ci \
  && rm -rf .next \
  && npm run build
```

`npm ci`, not `npm install`: install rewrote `package-lock.json` on the VPS
and the dirty file blocked the next `git pull` (2026-09-14). The
`git checkout -- package-lock.json` before the pull is belt and braces for a
box that already has a rewritten lockfile. Node on the VPS is 24.x; the
lockfile is v3 and `npm ci` was verified against it locally on 2026-09-16.

Then restart the process **by port**. Webuzo's Stop/Start for this app
currently errors (support ticket open), and a `pgrep` for `next start` misses
the `next-server` child, so never restart by process name:

```
fuser -k 30001/tcp; sleep 3
su - lukelmg -c 'cd /home/lukelmg/public_html/influenceit.app && setsid nohup npx next start -p 30001 > /home/lukelmg/next-30001.log 2>&1 < /dev/null &'
```

- The app is a Webuzo "Self Managed" Node app. Four `next-server` processes
  run on that box, one per app, and **only 30001 is this repo**: `lmg.media` is
  30000, the scraper 30002, `creators.lmg.media` 30003.
- The old chain ended `fuser -k 30000/tcp && pm2 restart all`, which restarts a
  *different site*. InfluenceIT kept serving its old build from memory while
  `.next` was replaced underneath — producing `ChunkLoadError` and, for a whole
  day, a stale client running against a new server.
- pm2 manages only the old `lmgmedia` app. Its logs are not InfluenceIT's.
- Nothing supervises the Node process. Killing it does **not** respawn it; the
  `setsid nohup` line above is what brings it back.
- The VPS env file is `.env.local` (`next build` prints `Environments:
  .env.local` there). Webuzo panel environment variables **override** it and
  must be unquoted. The file must end with a newline: a missing one glued two
  variables together on 2026-09-14.
- `rm -rf .next` before building is required.
- Hard-refresh after deploying. An incognito window is the cleanest way to tell a
  cache problem from a real one.
- Vercel green before VPS.

### Env var inventory

Names only, from `process.env` reads in `app`, `lib` and `scripts`. Every name
below must exist in all three places: Mac `.env.local`, VPS `.env.local` plus
the Webuzo panel, and Vercel.

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- Admin: `ADMIN_USER_ID`, `ADMIN_EMAIL`
- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- Cron: `CRON_SECRET`
- Scraper and AI: `APIFY_API_TOKEN`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_BRAND_STARTER_PRICE_ID`,
  `STRIPE_BRAND_GROWTH_PRICE_ID`, `STRIPE_BRAND_PRO_PRICE_ID`,
  `STRIPE_CREATOR_STARTER_PRICE_ID`, `STRIPE_CREATOR_ACTIVE_PRICE_ID`,
  `STRIPE_CREATOR_TOPUP_100_PRICE_ID`, `STRIPE_CREATOR_TOPUP_250_PRICE_ID`

Production only: `NEXT_PUBLIC_SITE_URL` (unset on the Mac on purpose).
Dead: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (see Email).

**Confirm the new build is actually being served.** The Node process is not
supervised, so a build with a stale process is the failure mode above. Check
it with the chunk-file method:

```
curl -sS 'https://influenceit.app/?buildcheck=1' \
  | grep -o '_next/static/chunks/[a-zA-Z0-9_.-]*\.js' | head -1
ls -la /home/lukelmg/public_html/influenceit.app/.next/static/chunks/<that filename>
```

If the file exists and its timestamp matches the build you just ran, the new
build is live. If `ls` says no such file, the old process is still serving;
restart InfluenceIT in Webuzo again. The `?buildcheck=1` query keeps this
request out of the cache key you verify with in the next section.

Do **not** grep the homepage for `.next/BUILD_ID`. With the App Router the
HTML never contains the build id, so `grep -c` returns 0 on a perfectly good
deploy. That check was tried on 2026-09-13 and gave a false negative.

### nginx bypass for authenticated routes

`deploy/nginx/influenceit.app.custom.conf` in this repo is the source of truth
for a `location` block that switches the proxy cache off for
`/creator-dashboard`, `/admin`, `/dashboard` and `/api`, and everything under
them. On the VPS it lives at

```
/var/webuzo-data/nginx/custom/domains/influenceit.app.conf
```

which Webuzo includes inside both the `:80` and `:443` server blocks for
influenceit.app, after `location /`. A regex `location` beats the `/` prefix
regardless of order, so the include position is irrelevant. The block repeats
`proxy_pass $webuzoproxy` (set per server block: `http://127.0.0.1:8081` on
`:80`, `https://127.0.0.1:8082` on `:443`) and includes `proxy.conf` for the
proxy headers, because a `location` block does not inherit `proxy_pass`.

- It lives in the custom domains file, not `webuzoVH.conf`, because Webuzo
  regenerates the vhost and leaves the custom file alone.
- It is a second line of defence, not a replacement for `withNoStore()` below.
  Only paths matching the regex are covered; a session-reading route outside
  `/api` would still depend on its own headers.
- `add_header` inside a `location` replaces every server-level `add_header`
  for that location. Before installing, check what `webuzoVH.conf` sets at
  server level and repeat anything beyond `X-Cache-Status` inside the block.
- After changing it: test, reload, purge the cache (below), then curl
  `/creator-dashboard` and `/api/creator/brand-matches`. Both must answer
  `X-Cache-Status: BYPASS`. `/` must still go `MISS` then `HIT`.

  ```
  /usr/local/apps/nginx/sbin/nginx -t -c /usr/local/apps/nginx/etc/nginx.conf
  nginx -s reload
  ```

- **Test with that full path, never the bare `nginx -t`.** Measured
  2026-10-06 as root: two nginx masters run, and neither reads the config the
  bare command checks.
  - `/usr/local/apps/nginx/sbin/nginx -c /usr/local/apps/nginx/etc/nginx.conf`
    serves the sites, influenceit.app included. Its config is the one that
    loads `webuzoVH.conf` and this include.
  - `/usr/local/emps/sbin/nginx -c /usr/local/emps/etc/nginx/nginx.conf` is
    the other master, probably Webuzo's own panel (unconfirmed).
  - The bare `nginx` on PATH reads `/etc/nginx/nginx.conf`, which no running
    master uses and which has no `proxy_cache_path`. Its "syntax is ok" says
    nothing about the site's config, so a broken edit to this block would pass
    it. The note this replaces said the include "is picked up either way";
    that was wrong about the test.
- **The bare `nginx -s reload` does reach the sites' nginx.** It signals the pid
  in `/run/nginx.pid`, and on 2026-10-06 that restarted the workers of the
  `/usr/local/apps/nginx` master and nothing else — which is why the 2026-09-13
  procedure appeared to work. A reload is fire-and-forget: with a broken config
  the master logs an error and keeps the old one, and the command still prints
  nothing. That is what the full-path test is for.

### nginx caches everything, and this caused a cross-user data leak

Config: `/usr/local/apps/nginx/etc/conf.d/webuzoVH.conf`

```
proxy_cache_key "$scheme://$host$request_uri"   # URI ONLY — no cookie
proxy_cache_valid 200 301 302 60m
proxy_cache_min_uses 1
```

Any 200 arriving with no `Cache-Control` is stored for an hour and replayed to
**every session**. That is how one creator's brand matches were served to
another. There is no `proxy_ignore_headers`, so nginx does honour `Cache-Control`
from the app — which is why the fix is application-side.

**The rule: every API route that reads a session must send**

```
Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate
Vary: Cookie
```

Use `withNoStore()` from `lib/http/no-store.ts` — wrap the handler, don't add
headers per return. There were 63 return sites across 13 routes; wrapping covers
every branch by construction, including 401/403/504. A cached 401 would lock out
a valid session.

`export const dynamic = 'force-dynamic'` does **not** write a Cache-Control
header on the route-handler path — Next derives `isIsr` from the prerender
manifest, and the header is only written inside the ISR branch. Adding it looks
like a fix and does nothing.

Four public GETs stay deliberately cacheable, because their body depends only on
the URL: `creators/featured`, `creators/featured/featured`, `stats`,
`categories`. `creators/[handle]` and `creators/compare` used to be on this
list; both are now wrapped in `withNoStore()`.

**Purge the cache** after any deploy that changes cache headers, or a poisoned
entry outlives your verification pass. The zone is defined in
`webuzoVH.conf:66`:

```
proxy_cache_path /var/webuzo-data/nginx_proxy_cache/lukelmg levels=1:2 keys_zone=lukelmg:10m inactive=60m;
```

so, as root:

```
rm -rf /var/webuzo-data/nginx_proxy_cache/lukelmg/*
```

- Empty the directory; never remove it. It is `nobody:lukelmg` 770, which is
  how the cache workers can write into it; a recreated one would not be.
- **No reload.** A deleted entry is just a miss. Verified 2026-10-06: `/` went
  `MISS` then `HIT` straight after the purge.
- The zone is named for the Webuzo user, not the site, so `lmg.media` and
  `creators.lmg.media` probably share it and start cold too (unverified).
  Harmless either way.
- It does not refresh Next's own copy of `/` (`revalidate = 3600`). The homepage
  can show old figures for up to an hour after a purge.

**Post-deploy check**, run twice:

```
curl -sS -D- -o /dev/null 'https://influenceit.app/api/creator/brand-matches'
```

`X-Cache-Status` must never be `HIT`; with the bypass block installed it is
`BYPASS`. No cookie needed — the headers apply on every branch, so a 401
proves it.

### Testing habit

**Test with two accounts.** The cache leak was invisible with one user and obvious
with two. Check the `creatorId` in an API response matches who you're logged in
as.

---

## Database

**No migration runner exists.** Migrations are numbered SQL files in
`supabase/migrations/` that Lukas applies **by hand** in the Supabase SQL editor.
Write the file, show paste-ready SQL, he pastes it, he confirms. The manual
checkpoint is deliberate and has caught real bugs.

- Next number: check the folder. 0030 is taken (2026-10-06), so the next is 0031.
- `IF NOT EXISTS` throughout — files must be safe to rerun.
- The SQL editor runs statements in a transaction, so no
  `CREATE INDEX CONCURRENTLY`.
- **Strip leading comment blocks from anything Lukas pastes**, and give one
  statement at a time. Comments have caused syntax errors on the round trip, and a
  stray line above the statement shifts the reported line number. Documentation
  belongs in the repo file.
- Code reading a new column must tolerate it being absent or NULL — the migration
  is applied out of band.
- Write the migration file even when already applied, and **say in its header that
  it is applied, with the date**. A file claiming "NOT YET APPLIED" when it is live
  is the stale record this convention exists to prevent.

### Facts about this schema

- `public_stats()` and `top_creators()` are SECURITY DEFINER. They were defined
  **in Supabase directly**; 0027 (applied 2026-10-06) restates both in the repo
  with a `status = 'active'` filter added, so that file is now the source.
- `anon` has `statement_timeout = 3s`; `authenticated` 8s; `postgres` (the SQL
  editor) none. **A query that looks instant in the editor can be killed in the
  app.** This caused an intermittent empty homepage for weeks. The homepage's
  build-time calls now use the service-role client.
- `creators`, `social_profiles` and `creator_posts` have RLS filtering to
  `status = 'active'`. `service_role` bypasses it — so anywhere the admin client
  replaces the anon client, replicate the filter explicitly in code and comment
  which policy it mirrors.
- **Function-level timeouts (0030).** API calls run in `authenticator`'s session
  (`statement_timeout` and `lock_timeout` both 8 s), and `service_role` sets
  neither, so every service-role RPC stops at 8 s unless the function has its own
  `statement_timeout`. These do: `public_stats()` and `top_creators()` 30 s,
  `apply_creator_entity()` 60 s.
  - PostgREST hoists a called function's `statement_timeout` into the
    transaction (`db-hoisted-tx-settings`, v12+; this project runs v14.5), so the
    longer limit applies only when that function is the RPC. Everything else
    keeps 8 s, and lock waits still stop at 8 s.
  - Only the RPC'd function's settings are hoisted: `accept_creator_entity()`
    calls `apply_creator_entity()` but keeps 8 s itself.
  - **`CREATE OR REPLACE FUNCTION` drops a function's SET clauses.** Rerun 0030
    after anything that recreates these three, 0027 included.
  - Give a function its own timeout this way rather than widening a role: an
    `alter role service_role set statement_timeout` would apply to every
    service-role call in every route, cron and script.
- Person + profiles model: `creators` is the person, `social_profiles` one row per
  platform. `handle` lives on `social_profiles`.
- **Creators are single-platform by scrape source** — scraped from either
  Instagram or TikTok, and their whole record derives from that. No creator has
  rows for both. ~2,677 Instagram, ~3,347 TikTok, 91%+ in the 40K–500K band.
- `creator_profiles` is the **claimed-account** table, keyed on the auth user id.
  Not the scraped-creator table. `creator_profiles.id` is the trustworthy join
  key. `creator_id` now has a unique partial index (`WHERE creator_id IS NOT
  NULL`), added after duplicate rows silently broke the admin preview and public
  profile pages.
- `creator_profiles.claimed_at` means "when the claim became **verified**". Use
  `created_at` for claim time.

### The brand data model — three layers, and only two are usable

- **`brand_aliases`** (~34,700 on 2026-10-04) — the classification layer. `alias` **is the
  Instagram handle**; `canonical_name` is the display name; `entity_type`
  separates brand from creator/celebrity/media; `verified` is a human-only trust
  flag the pipeline never touches.
  - It is seeded from `creator_posts.detected_brands`, which **only sponsored
    posts carry**: 19,670 sponsored posts have it, no non-sponsored post does
    (2026-10-06). It equals the post's tagged accounts. Ordinary tags
    (`tagged_accounts` on 68,744 non-sponsored posts) and caption @mentions
    never reach brand data, by design: a brand here is a detected deal.
  - The seed writes `creators_count` only for aliases it finds, and never lowers
    the count of one it no longer finds (6,422 such rows on 2026-10-06), so
    that count can be stale for an alias nobody tags any more.
- **`brand_brackets`** — built by `scripts/brand-brackets/refresh.ts` from
  `brand_aliases` + `creator_posts` + `social_profiles`. PK is
  `(canonical_name, platform)`. This is what brand cards read.
- **`brands`** (~32,000 on 2026-10-04) — **do not use.** `brand_name` is NULL for ~99% of rows,
  so it joins to anything at ~2%. It's a raw scrape of tagged accounts,
  pre-classification, and includes people and places.

To get a brand's Instagram handle: join `brand_brackets.canonical_name` →
`brand_aliases.canonical_name` where `entity_type = 'brand' AND verified = true`.
Coverage is 1052/1052 — structural, since brackets are built from verified
aliases. 84.6% of brands have exactly one handle, 95% one or two, one (Shein) has
22. Show all of them ordered by region match; don't narrow to one — a creator may
deliberately approach a regional account, and someone at Shein Mexico can forward
a message.

`https://ig.me/m/<handle>` opens straight into a DM thread. Verified on desktop
and mobile web. On mobile it opens the browser, not the app; don't try to force
the app with an `instagram://` scheme.

### Brand accounts among the creators — `creator_entity` (0026, 0027)

Some scraped "creators" are brand, media or venue accounts (GLOWERY, Rel Beauty,
Cosmopolitan UK, W Amsterdam). `brand_aliases` cannot find them:
`lib/pipeline/prepass.ts` labels any alias equal to a `social_profiles.handle`
as `creator`, so for every handle already in the database the join is circular.
On 2026-10-04 an exact handle-to-alias join found 2 brand and 1 media accounts
among 8,716 profiles, and GLOWERY and Rel have no alias row at all.

- **`creator_entity`** is a side table keyed on `creator_id`, not a column on
  `creators`. A creators column would trip `creators_archive` (built `LIKE
  creators`), `v_creators_all`'s explicit column list and `promote_creator()`'s
  35-column pin (all in influ-scrape's migrations).
- **Written by** `npm run creator-entity:classify` (`scripts/creator-entity/`,
  logic in `lib/creator-entity/`). It runs a Claude Haiku 4.5 verdict per
  creator (`creator | brand | media | venue | other`, a confidence and a
  one-line reason) plus deterministic heuristic flags in `signals`.
  - `flag_count` is the number of true non-creator flags, not counting
    `ig_business` or `creator_category`.
  - `inputs` is the record the model saw. `input_hash` is sha256 over every
    input **except `follower_count`** (since 2026-10-06), so a re-scrape that
    only moves follower numbers costs no model call. A rerun skips the model
    call for creators whose `input_hash` and `prompt_version` both match, so
    it only pays for new or changed ones.
  - It skips the call, not the row. Every run recomputes `signals` and
    `flag_count` for those creators and rewrites them when they differ, so a
    heuristic can be retuned after the full run for free. It also rewrites
    `inputs.follower_count` when it moved, so the review page and the apply
    report show today's count; that one field can be newer than the verdict.
  - **Changing what `hashInputs()` covers changes every stored hash.** Run
    `npm run creator-entity:rehash` (dry run) then `-- --write` before the
    next classify run. It rewrites `input_hash` without a model call on rows
    whose stored inputs and today's inputs hash the same under the new scheme,
    and leaves the rest for the next classify run. A classify run before the
    rehash would see every hash as stale and re-classify every creator.
    Measured before the 2026-10-06 change: 8,716 rows, all 8,716 to rewrite,
    0 changed.
  - `domain_matches_name` is the link flag: the link's main domain label must
    contain, or be contained in, the normalised handle or display name (4+
    characters). Link-in-bio tools, platforms and email providers never count
    (`NOT_OWN_DOMAINS`), and affiliate or agency links fail the name test.
  - Flags: `--dry-run` (works before 0026 is applied), `--heuristics-only` (no
    model calls; still refreshes stored signals unless `--dry-run`),
    `--limit N`, `--ids a,b`, `--model`, and `--apply` (run the exclusion rule
    over what it wrote; see Phase 2 below).
- **Effective type is `review_entity_type ?? entity_type`.** The script never
  writes the two review columns, so a rerun cannot undo a human decision.
- **Reviewed at `/admin/creator-review`**, which reads `creator_entity` only and
  shows `inputs`, never `social_profiles` or `v_creator_summary`.
  - The reason: both filter on `creators.status = 'active'`, so they hide
    exactly the rows this page exists to review.
  - RLS matches `brand_aliases`: admin-only SELECT and UPDATE on
    `is_admin_user()`, writes from the script as service_role.
  - Tab and filter logic is in `lib/creator-entity/review.ts` (unit-tested).
    Tabs: Review, Non-creators, Hidden (`excluded = true`), All. A platform
    filter (All / Instagram / TikTok) applies to every tab and every count.
  - **The Review tab is the complement of the rule below**: every unreviewed
    non-creator verdict the rule does not hide is on it. Unreviewed rows with
    any of:
    - R1 medium or low confidence, whatever the verdict
    - R2 `entity_type = 'other'`
    - R3 a creator verdict with 2+ flags
    - R4 a non-creator verdict with `flag_count = 0` — an IG business account
      alone is not support
    - R5 a creator verdict with an `alias_match` (`@gymsharkwomen`, a brand
      account its AI summary called a creator)
    - R6 a claimed account with a non-creator verdict. Claimed ids come from
      `creator_profiles`, read under the admin session.
  - Measured 2026-10-06, nothing reviewed yet: Review 1,237; held non-creator
    verdicts 618 (R4 359, R2 175, R1 81, R6 3); overlap with the hidden set 0,
    non-creator verdicts in neither 0.
  - An override or a clear runs `apply_creator_entity` for that row at once.
    **An override that would hide a claimed account asks first**, saying the
    creator's dashboard goes blank: its stats, profile details and outreach
    tool all read the hidden profile.
  - **"Accept all on this page"** confirms with the count and how many it
    hides, then calls `accept_creator_entity` for the unreviewed, unclaimed
    rows shown. A claimed row gets a Claimed badge and is reviewed one at a
    time. Hidden rows get a Hidden badge.

### Phase 2 — hiding them: `creators.status = 'non_creator'` (0027)

- **The rule lives in one place**, `apply_creator_entity()` in
  `supabase/migrations/0027_creator_exclusion.sql`. A creator is
  `'non_creator'` when its `creator_entity` row is either:
  - reviewed (`reviewed_at` not null) with `review_entity_type <> 'creator'` —
    a human choosing `other` hides; or
  - unreviewed with **all** of: `entity_type` in brand / media / venue,
    `confidence = 'high'`, `flag_count > 0`, and no `creator_profiles` row.

  Every other creator is `'active'`, including one with no `creator_entity` row
  and a reviewed row with a NULL type. The rule only moves creators between
  those two values and never touches another status. `signals.ig_business`
  does not count as support: on 2026-10-05 it was the only support for 60
  high-confidence verdicts, one of them a person (Vogue Australia's editor).
  The dry run on 2026-10-06 said 995. The write hid **993** — brand 710, media
  134, venue 149; Instagram 788, TikTok 205 — because @unbuenmarketing and
  @purienne were set to creator in `/admin/creator-review` in between (04:28
  UTC).
- **`'non_creator'` is ours alone.** `creators.status` is varchar with no CHECK;
  the scraper uses active / archived / flagged / rejected. Typed as
  `CreatorStatus` in `lib/types.ts`.
- **`apply_creator_entity(p_ids uuid[] default null, p_dry_run boolean default
  true)`** applies the rule to those creators (all of them when null), updates
  `creators.status` and `creator_entity.excluded` in one statement, and returns
  one `(creator_id, from_status, to_status)` row per change. **Dry run by
  default.**
- **`accept_creator_entity(p_ids uuid[])`** sets `review_entity_type =
  entity_type` and `reviewed_at = now()` on the given unreviewed, **unclaimed**
  rows, then applies the rule to all of `p_ids`. Null or empty does nothing,
  never "all".
- **Both are SECURITY DEFINER** with `search_path = public`, and EXECUTE is
  revoked from public and anon. The body refuses a JWT caller who is neither
  an admin (`is_admin_user()`) nor `service_role`. A call with no JWT claims at
  all is a direct connection (the SQL editor) and is allowed, so a dry run
  reads there: `select to_status, count(*) from apply_creator_entity() group by 1;`
- **`creator_entity.excluded`** is written only by `apply_creator_entity`. The
  page's Hidden tab and badge read it, so the rule has no second copy, and the
  page never has to read `creators` (whose RLS hides these rows). The classify
  upsert never writes it.
- **Scripts.**
  - `npm run creator-entity:apply` is a dry run by default. It prints counts by
    type and platform and the 50 highest-follower accounts it would hide.
    `--write` applies; `--ids a,b` narrows.
  - It calls the function in chunks of 1,000 ids, because a write call's
    result cannot be paged without running it again. A chunk gets 60 s
    (`apply_creator_entity`'s own timeout, 0030). Before that it got the 8 s
    API limit, and chunk 1 failed twice on 2026-10-06 with nothing to change.
  - `npm run creator-entity:classify -- --apply` runs apply (write) over the
    ids that run wrote, verdicts and refreshed signals alike, for runs after a
    scrape.
- **Rollout order:** apply 0027, deploy, dry run, `--write`, then
  `npm run refresh:brand-brackets` (brackets change only when recomputed), then
  purge the nginx cache. Repeat the last two after any later write that hides
  or unhides something.
- **What hides them** without app code: RLS on `creators`, `social_profiles` and
  `creator_posts`, `v_creator_summary`, `match_creators`, and since 0027
  `public_stats()` (creators, posts, brand deals, both medians) and
  `top_creators()`.
- **Any service-role read of `creators`, `social_profiles` or `creator_posts`
  must filter on `status = 'active'`** — `creators!inner(status)` plus
  `.eq('creators.status', 'active')`, commented as replicating the RLS policy.
  A count query needs the embed in its select too, or the filter has nothing to
  apply to. Filtered since 0027: the claim API, the teaser's two handle
  lookups, `brand-activity.ts` (posts count only through a surviving profile),
  admin targeting (window and both counts), the inquiry guard,
  `/api/creators/request`, `aggregate.ts`, `refresh.ts` and `prepass.ts`.
  **Deliberately unfiltered**, each commented in place:
  - `lib/creator-entity/load.ts`: the classifier has to see hidden accounts.
  - `getCreatorBrandMatches()` by **id**: a claimed creator's own dashboard,
    the admin preview, and targeting (which filters its own list). By
    **handle** it is filtered.
  - The admin preview's handle lookup. It shows a hidden account with a
    "Hidden · non-creator" marker; the stat cards go blank (they read the view).
  - `fulfilRequest()`, which reads the status to answer `hidden` rather than
    `not_in_database`.
  - Claimed-account flows: `verify-bio`, the nudge, `send-creator-approved`,
    `admin/creators/status`, `api/creator/brand-matches`. A claimed account is
    hidden only by a human, and that person still has an account.
- **Claimed accounts are never hidden unreviewed.** Three had non-creator
  verdicts on 2026-10-05: `lmgmedia1`, `lmg.media`, `influenceit_demo`, all on
  the Review tab as R6. Hiding one blanks most of their dashboard and shows
  `@unknown` in `/admin/creators`.
- **Inquiries to a hidden account are refused** before the insert, the token
  grant and both emails: 404 `creator_not_found`.
- **A hidden account that asks to be listed** is treated as not listed by
  `/api/creators/request`: the request is queued and both emails go. Before
  0027 it was told "you're already listed" and sent to a claim page that 404s.
  `fulfilRequest()` then answers `hidden` (nothing written, nothing sent) until
  a human sets it to creator in Creator Review.
- **Prepass:** an alias equal to a hidden account's handle is left
  unclassified for the AI pass, rather than labelled `creator`, so a
  brand/venue row gets the canonical name, category and scores
  `lib/pipeline/classify.ts` requires. The prepass never revisits classified
  rows, so the labels it wrote before 0027 stay until reset.
- **Old `creator` labels on hidden handles: reset by 0028.** Of the 993 hidden
  handles, 407 have an alias row: 366 `creator` (359 written by the prepass, 7
  by the AI classifier), 38 `unknown`, 1 `media`, 2 verified `brand`. 0028
  resets only the 359 to unclassified with `creators_count = 0`, guarded so it
  never touches a handle an active creator also uses. The 7 AI-labelled rows
  and the 38 `unknown` are for a human in `/admin/brand-index`.
  - **After applying 0028, in order:** `npm run brand-aliases:seed` (restores
    the real count for the 107 that active creators tag in sponsored posts),
    `npm run brand-aliases:prepass` (leaves all 359 alone), then
    `npm run brand-aliases:classify -- --min-count 2` (47 aliases) and
    `-- --min-count 1` (60). The other 252 are tagged only by their own
    account and stay unclassified at count 0.
  - Then verify the new brand rows in brand-index and run
    `npm run refresh:brand-brackets`. Expect casting and production agencies
    among them (@dmcasting, @artpartner); keep them off brand cards.
  - Hidden accounts tagged only in ordinary posts (84 with no alias row, 47
    with one) are **not** added: an ordinary tag is not a detected deal. If one
    is later tagged in a sponsored post, the seed creates its row and the
    classifier picks it up. The 502 nobody tags stay out of brand data.
- **The scraper's re-entry hazard is fixed** (inf-scraper PR #16, 2051bc4). A
  failed profile lookup no longer mints a fresh creator, and a trigger on
  `social_profiles` / `social_profiles_archive` refuses to move a profile to a
  different creator, so a re-scraped hidden account stays hidden. The
  scraper's own pipelines key on `import_status`, not `status`, so it may keep
  enriching hidden accounts.

---

## Email

Provider is **Resend over its HTTP API** (`resend` npm package). The domain
influenceit.app is verified in Resend, region eu-west-1, since 2026-09-14.
Never SMTP: the old transport was nodemailer over a Gmail app password, which
caps around 500 a day and lands in spam for anyone who is not us.

- Two env vars, set in `.env.local`, the VPS `.env.local` and Vercel:
  `RESEND_API_KEY` and `EMAIL_FROM` (`InfluenceIT <noreply@influenceit.app>`).
  Never print the key.
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` are **dead** since the nodemailer
  removal. Safe to delete from the VPS `.env` and Vercel.
- One sender, `sendEmail()` in `lib/email/client.ts`. It never throws; every
  failure returns `{ ok: false, error }` and one `[email]` log line with the
  recipient masked. Missing config returns `email_not_configured`.
- Templates are React Email, one file per email under `lib/email/templates/`,
  with the plain-text alternative rendered from the same component.
- **Mail never blocks or rolls back a database write.** The write commits
  first; the send outcome is recorded (on the `activity_log` row's `details`
  for creator approval) and surfaced, and the route returns 200 regardless.
- **Approve emails the creator, Reject sends nothing.** The approval mail goes
  only on a real transition: the route reads `claim_status` before writing and
  skips the send if it was already `verified`, so re-clicking Approve cannot
  resend. Recipient is `auth.users.email` via `auth.admin.getUserById(id)`;
  `creator_profiles` has no email column and its `id` is the auth user id.
- Absolute links use `SITE_URL` from the same module:
  `NEXT_PUBLIC_SITE_URL` with a fallback of `https://influenceit.app`. Unset
  locally on purpose.
- To test delivery without touching the database: a throwaway
  `scripts/email-smoke.ts` that imports `sendEmail` and a template and sends
  to `ADMIN_EMAIL`, run with `npx tsx --env-file=.env.local scripts/email-smoke.ts`.
  Check Resend → Logs for the send. Delete the script before committing.
- To test the approval flow end to end: set the demo profile back to
  `pending` in the SQL editor, click Verify in `/admin/creators`, expect the
  notice `Approved · email sent`; click again and expect
  `Already verified · no email sent` with exactly one send in Resend Logs.

### Cron — one route, two daily jobs

`GET /api/cron/verification-nudge`, run by Vercel Cron at 09:00 UTC daily
(`vercel.json`). The path is historical: it now runs **two** jobs, in separate
functions with separate try/catch and separate `[nudge]` / `[request-fulfil]`
log lines. A throw in one cannot cost the other its run, and the nudge's half
of the response stays at the top level of the body so a hand-run reads as it
always did.

**Job 1 — the expired-code nudge.** It emails a creator who claimed a profile,
was issued a bio-verification code, and let it expire unused, inviting them
back to `/creator-dashboard/verify`, which mints a fresh code on load.

- **Eligibility, all of:** `claim_status = 'pending'`;
  `verification_code_expires_at` not null and more than 24 hours ago;
  `nudge_sent_at` null; `created_at` within the last 14 days (new signups
  only, no backfill of old rows, deliberately); the auth user has an email.
  Codes live 24 hours, so the earliest nudge is ~48 hours after the claim.
- **One nudge per profile unless the creator clears the column.**
  `creator_profiles.nudge_sent_at` (0018) is set *before* the send with
  `WHERE nudge_sent_at IS NULL`; a row that update misses was taken by an
  overlapping run and is skipped. A send failure leaves it set and is only
  logged: a missed nudge is acceptable, a duplicate is not. The column is
  not in 0015's protected list, so a creator could unset it from the browser
  and re-qualify for one more email to themselves. Accepted.
- **Per-run cap 50**, oldest expiry first. The response reports
  `beyondCap` when more rows were eligible.
- **Audit:** one `activity_log` row per attempt, `verification_nudge_sent`,
  `user_id` null (system action), `details` `{ email: 'sent', resend_id }`
  or `{ email: 'failed', error }`. Plus one `nudge_sent` funnel event (0019)
  with `userAgent` null, so it is never classified as a bot.
- **Guard:** `Authorization: Bearer $CRON_SECRET`, checked by
  `requireCronSecret()` in `lib/auth/api-guards.ts`. Vercel sends that
  header itself once `CRON_SECRET` is set on the project. Unset answers 500
  (deliberately not 401, so a missing var is visible in the cron log);
  wrong or missing header answers 401.
- **Run by hand** from any host:

  ```
  curl -H "Authorization: Bearer $CRON_SECRET" https://influenceit.app/api/cron/verification-nudge
  ```

  Response is `{ checked, eligible, beyondCap, sent, failed, skipped, ids,
  requests: { checked, eligible, beyondCap, sent, failed, skipped,
  notInDatabase, hidden, heldByPlatform, ids } }` with masked emails only — the
  nudge's counts at the top level, job 2's in `requests`. Safe to repeat: the
  second call sends nothing.
- **Webuzo panel variables override `.env.local` on the VPS** (learned
  2026-09-14, when a run-together `NEXT_PUBLIC_SITE_URL` came from the
  panel, not the file). If a value on the VPS looks wrong, check the app's
  environment variables in the Webuzo dashboard before the `.env.local` file.

**Job 2 — the creator-request fulfil pass.** Every `creator_requests` row with
`status = 'new'`, oldest first, capped at 50: has the handle appeared in
`social_profiles` (same platform) since it was requested? If it has, the row is
flipped to `added` with `resolved_at` and `creator_id`, and the creator gets
`RequestFulfilled` with a link to `/claim/<handle>`.

- The per-row work is `fulfilRequest()` in `lib/creator-requests/fulfil.ts`,
  **shared with the admin "Mark added" button**. That sharing is the guarantee
  that the two cannot both email the same creator: the status flip carries
  `WHERE status = 'new'` and happens before the send, so whichever runs second
  gets zero rows and sends nothing.
- **Only `FULFIL_ENABLED_PLATFORMS` rows are selected** — Instagram and TikTok,
  i.e. everything real. `requests.heldByPlatform` counts what the filter
  excluded and should read 0; anything else is a row carrying a platform value
  nothing understands.
- `not_in_database` is the outcome for most open rows on most days. It is
  counted in `requests.notInDatabase` and deliberately **not** listed in
  `requests.ids` — 50 "nothing happened" entries bury the ones where something
  did.
- `hidden` means the handle is in the database but its account is hidden as a
  non-creator (0027). Nothing is written or sent and the request stays open.
  Counted in `requests.hidden` **and** listed in `requests.ids`, because it is
  rare and each one waits on a human in `/admin/creator-review`.
- **A failed send still closes the request.** Same trade as the nudge: a missed
  fulfilment email is acceptable, a duplicate is not.
- **Audit:** one `activity_log` row per attempt, `creator_request_fulfilled`,
  `user_id` null when the cron ran it and the admin's id when the button did.
  Declines write `creator_request_declined`. No `funnel_events` row — that
  table's `event_type` CHECK would need a migration, and this is post-request
  admin work, not the pre-claim funnel.
- A missing `creator_requests` table (0022 not applied) comes back as a
  PostgREST error, is reported in `requests.error`, and does not disturb job 1.

---

## Creator requests — asking to be added

The other end of the claim funnel. `/claim/[handle]` and signup serve a creator
we already scraped; **`/get-listed` serves one we did not.** Before it, that
creator hit a dead end and two strings that lied to them.

- **Table `creator_requests` (0022).** Unique index on `(platform, handle)`
  **where `status = 'new'`** — one OPEN request per handle, but a declined or
  fulfilled handle can be requested again. RLS: one admin SELECT policy, writes
  service-role only, same lockdown as `creator_dashboard_events`.
- **Instagram and TikTok.** The form's platform `<select>` is built from
  `REQUEST_PLATFORMS` in `lib/creator-requests/shared.ts` and the route
  validates against the same list — `creator_requests.platform` has no CHECK,
  so that constant is the whitelist. Absent means Instagram, an unknown string
  is a 400. The handle field's label, placeholder and hint all follow the
  selected platform, and `normalizeRequestHandle()` accepts
  `tiktok.com/@handle` as well as `instagram.com/handle`.
- **`profileUrl()` and `platformLabel()`, both in that same module, are the
  only places a profile URL is built.** The two shapes differ by more than the
  domain — TikTok puts the `@` back in the path — and the admin queue and the
  admin notification email must never disagree about where a handle lives.
- **Both platforms are fulfilled.** `FULFIL_ENABLED_PLATFORMS` in
  `lib/creator-requests/shared.ts` is `['instagram', 'tiktok']` since
  2026-09-22, when TikTok bio-code verification was proven end to end, so an
  Instagram and a TikTok request are closed and sent their claim link the same
  way. The gate stays because `creator_requests.platform` has no CHECK: it now
  rejects only a platform value this codebase does not understand, which is
  also the only thing "Mark added" still answers 409 `platform_disabled` for.
- **Six entry points**, each naming itself in `?from=`. The original three sit
  inside the claim funnel: the signup form's handle-not-found line
  (`signup_not_found`), the `/claim/[handle]` not-found page
  (`claim_not_found`), and the footer (`footer`). Three more surface the
  creator paths outside it: the brand signup form (`brand_signup`),
  `/pricing/creators` (`pricing_creators`), and the homepage strip above the
  footer (`home_strip`). Anything else stores as `direct`. Adding another is
  one `<Link>` plus one value in `REQUEST_SOURCES` — `GetListedForm` takes
  `source` as a prop and nothing else.
- **Give each placement its own source value; never reuse a neighbour's.**
  Pointing a new link at `?from=footer` would merge two placements into one
  number and defeat the only reason the column exists.
- **`/get-listed` is bilingual**, because two of its three entry points are. It
  reads `?handle=`, `?from=` and `?locale=` in its **server** component and
  passes them down as props, so the form needs no `useSearchParams()` and
  therefore no Suspense boundary. Copy lives in `app/get-listed/_strings.ts`.
- **`POST /api/creators/request`** is public, no session. Honeypot field
  (`website`) answered 200 with no write. Handle already in `social_profiles`
  for an **active** creator → **200 with `exists: true` and a `claimUrl`, no
  insert** — a legitimate 200
  that the client must not read as failure. New handle → 201 plus two emails.
  Duplicate open request → 200 `already_requested`, **no email** (the one branch
  that could otherwise be driven to mail an address repeatedly).
- **Rate limit: 3 per hour per IP**, counted from `creator_requests.ip_hash`
  rather than held in memory — this runs on Vercel (many lambdas) and on the VPS
  (one process), and an in-memory counter would mean something different on
  each. `ip_hash` is SHA-256 of the **first** `x-forwarded-for` entry, else
  `x-real-ip`. **With neither header the limit is skipped** and the fact is
  logged once per process: bucketing every headerless request under one key
  would let one bot lock out every creator behind a header-stripping proxy. A
  counting error also fails open — this is abuse control, not a boundary.
- **Emails:** `RequestReceived` to the creator, `CreatorRequestNotice` to
  `ADMIN_EMAIL` (Reply-To the creator), and later `RequestFulfilled`. Neither of
  the first two can fail the request; the row is what matters and it is already
  written.
- **Admin queue:** "Add requests" at the TOP of `/admin/creators`, above Creator
  Verification, because it is the only list on that page with someone waiting on
  the other end. Reads the table directly under the admin's session. If 0022 is
  not applied the whole section simply does not render.
- **"Mark added" can refuse, and that is the point.** It runs the same
  `fulfilRequest()` the cron does, so if the handle is not in the database yet it
  answers 409 `not_in_database` and changes nothing; if it belongs to an account
  hidden as a non-creator, 409 `hidden`. A plain status write there
  would take the row out of `'new'` — the only state the fulfil pass looks at —
  and the creator would never get the claim link this whole feature exists to
  send. Once the handle IS in, the button is just "do it now instead of 09:00
  UTC". **Decline sends nothing.**
- The automatic half is **job 2 of the cron** — see "Cron" above.

---

## Product rules — non-negotiable

- Everything is **"detected"** from a sample. Never absolute.
- **No hardcoded or fabricated numbers** shown to creators. Watch fallback
  constants — a stale fallback under a line claiming "read from the live
  database" is the failure this rule exists to prevent.
- Region, niche and recency are **additive, never penalizing**.
- Category is **a lens the creator looks through**, never a niche assumed about
  them.
- **Don't promise what the product can't do.** Live example to avoid repeating:
  a card claiming tools arrive "pre-filled with {brand}'s context" when they
  didn't. The other long-standing one — signup telling a creator "you can still
  sign up and we'll add you" and "we'll notify you when your profile is ready",
  when signup blocked on exactly that state and no notification system existed —
  was **fixed** by `/get-listed` (see "Creator requests"). What replaced it
  promises one thing only, conditionally: *if* we add the handle, one email
  follows. That email is what job 2 of the cron actually sends.
- Where the product records something it can't verify, **say so** — the outreach
  tool says "marked as sent", not "sent".

### Engagement — six figures exist, and they disagree

1. `social_profiles.enrichment_data.calculated_engagement_rate` — **the canonical
   one.** What the dashboard and the outreach message use.
2. The mean of #1 across a creator's profiles — the Rate Calculator.
3. Raw `social_profiles.engagement_rate` — **untrustworthy**, observed at 174.6%
   and 99.5%. `lib/reports/engagement.ts` exists to keep it off report surfaces,
   but the public profile page and homepage leaderboard still show it.
4. Capped median-post — `computeMedianEngagement()`, ≥8 posts, capped 20% IG /
   40% TikTok. Brand-report surfaces only. The cap exists because of TikTok
   outliers above 100%.
5. `creators.instagram_engagement` / `tiktok_engagement` — the stats API.
6. `top_creators()`'s engagement — replicates #4.

**Open:** consolidate on #1 everywhere. A creator's public profile currently shows
0.4% (raw) in one card and 2.4% (calculated) in another. That's the page a brand
lands on, and the pitch is "evidence, not follower counts".

---

## Localization

- Two locales, `en` and `es`. Neutral Spanish — roughly 1,500 LatAm creators and
  550 from Spain, and wording must read naturally to both. Prefer phrasings that
  sidestep regional splits (`Escribir a` over `contactar a`/`contactar con`).
  Avoid gendered greetings (`Hola de nuevo`, not `Bienvenido/a`).
- **Bilingual today:** the claim teaser, signup, verify, the shared site nav, the
  outreach tool, and the dashboard chrome (the three localized sidebar nav items,
  Overview, Brands Hiring, the verification gate modal, brand cards).
- **English by design:** the legacy tools (Rate Calculator, Negotiation, Contract
  Builder, Media Kit, Edit Profile), the sidebar token box, and the plan badge.
  Tokens gate the tools, so the token chrome belongs with them.
- **Creator-facing cross-links live on brand-facing pages**, and they follow
  the page they are on, not the destination: `/signup`, `/pricing/creators` and
  the homepage are all outside the i18n tree, so their lines are English
  literals. Only `/auth/signup`'s mirror line ("Looking to hire creators?
  Sign up as a brand") is in `auth-strings.ts`, because that page is bilingual.
  `/get-listed` resolves its own locale either way.
- **The rule for labels that name a page:** a label must not disagree with its
  destination. A Spanish sidebar entry opening an English tool is a small broken
  promise, so tool names stay English until the tools are translated.
- The sidebar is 240px with `overflow: hidden` and `whiteSpace: nowrap`, so long
  Spanish clips **silently**. Prefer concise phrasings there.
- `/es-es/discover` is a **separate geographic SEO tree**, not a dialect variant.
  Out of scope unless named.
- Locale is persisted on `creator_profiles.locale` at claim time and resolved
  elsewhere by `useLocale()`: path → `?locale=` → DB → `'en'`. NULL means unknown,
  read as `en`, and most pre-migration creators are NULL.
- String tables are typed `Record<Locale, T>` so a missing key is a **compile
  error**. Follow that; don't add an i18n library.
- Keep chrome tables out of `auth-strings.ts` — it's 14 KB of claim-funnel copy
  and the sidebar renders on every dashboard route.
- `useSearchParams()` in root-layout chrome would de-opt every static route from
  prerendering. Read `window.location.search` via `useSyncExternalStore` instead —
  `lib/i18n/use-locale.ts` documents why at length.
- The outreach page's language toggle drives the **whole page**, not just the
  message bodies. `creator_profiles.locale` sets its initial value only.
- Locale-driven chrome renders `en` first and swaps after hydration, because the
  stored locale arrives via AuthContext. Accepted behaviour; visible flicker.
- Server-generated error strings in API routes are English. Return a
  machine-readable `reason` code and let the client map it to a localized string —
  never send prose the client will display. The client must key off the code
  regardless of HTTP status: "checked and absent" is a legitimate 200.

---

## Render modes — check before you touch

| Route | Mode |
|---|---|
| `/` | `revalidate = 3600` |
| `/discover`, `/es/discover`, `/es-es/discover` | `revalidate = 86400` |
| `/report/[slug]` | `revalidate = 60` |
| `/claim/[handle]`, `/es/claim/[handle]` | `force-dynamic` |
| `/auth/signup` | `force-dynamic` — deliberate, needed for funnel capture |

`cookies()` and `headers()` de-opt a route to dynamic. If a shared helper reads
them internally, importing it into a static route breaks that route **silently**.
Have the caller read them and pass them as arguments.

`useSearchParams()` without a Suspense wrapper silently flips a route to
client-rendering at build with no error. Every existing call site wraps it;
follow the pattern.

`tsconfig.json` includes `.next/types/**/*.ts`, so if `.next` is stale or missing
its `types/` directory, **`tsc` never sees Next's generated route validators** —
a change can pass locally and fail the Vercel build.

**Known discrepancy, uninvestigated:** `/discover` and `/report/[slug]` both
export a `revalidate` but build as `ƒ (Dynamic)`. That contradicts the table and
is the exact silent de-opt it exists to prevent.

---

## Instrumentation

`funnel_events` records, server-side: `teaser_viewed`, `signup_arrived`,
`claim_completed`, `verified`, `outreach_opened`, `message_copied`,
`message_marked_sent`. Extending the set means extending the CHECK constraint
**and** the type together.

- Written fire-and-forget via `after()` from `next/server`, wrapped in try/catch
  (it throws E468 outside a request scope). Never a bare unawaited promise.
- **Deliberately not sessionised** — `teaser_viewed` counts renders, not people.
  Don't add a session column without revisiting that decision.
- `signup_arrived` is named for what's observable: the teaser's CTAs share one
  href, so no server-side capture can attribute a click to a control. It also
  fires when a handle is typed into the form directly, so arrivals don't always
  reconcile to views.
- `verified` fires from **two** places — `verify-bio`'s success branch and the
  auto-verify branch in `claim/route.ts`. Missing the second undercounts the
  smoothest conversions.
- Bot classification is **user-agent only** — the one signal identical on Vercel
  and the VPS. Instagram's crawler hits every DMed link. A missing user-agent
  classifies as *not* a bot, so a header-stripping proxy over-counts rather than
  silently zeroing traffic.
- Never let an event write break or slow a page.

`creator_brand_outreach` tracks creator→brand messages: one row per message per
handle, never an upsert, because the follow-up sequence needs history. Not to be
confused with `creator_outreach` (0008), which is admin→creator DM tracking and
means the opposite direction.

Useful queries:

```sql
select event_type, count(*) from funnel_events
where is_bot = false group by event_type order by count(*) desc;

select event_type, occurred_at, details from funnel_events
where handle = 'somehandle' order by occurred_at;
```

### Dashboard events — post-claim usage

`creator_dashboard_events` (0020) is the **other** table: what a creator does
inside `/creator-dashboard` after claiming. Not `funnel_events`, which stops at
`verified` plus the three outreach events, and which stays exactly as it is.

- **Path:** browser → `track()` in `lib/dashboard/track.ts` (fire-and-forget,
  `keepalive`, swallows everything, no-op in SSR) → `POST /api/creator/events`
  (session, then the caller's own `creator_profiles` row, then service-role
  insert via `recordDashboardEvent()` in `lib/dashboard/events.ts`). No client
  insert, no anon-key write. The insert is **awaited**, not `after()`, because
  the route's 2-second per-profile, per-type dedupe reads the latest row first.
- **Event types are the TypeScript union, not a CHECK.** Adding one is a code
  change only: extend `DashboardEventType` and `ALLOWED_DETAIL_KEYS` in
  `lib/dashboard/events.ts`, add the call site. No migration. The view gets a
  `has_<type>` column only if you add one; the counts include it regardless.
- **Events and their `details` keys:**

  | event | fires when | details |
  |---|---|---|
  | `dashboard_opened` | `/creator-dashboard` mounts | — |
  | `brands_hiring_opened` | `/brands-hiring` mounts | — |
  | `brand_card_action` | the card's Contact link is clicked | `canonical_name`, `platform`, `action: 'contact_brand'` |
  | `tool_opened` | calculator / contract / negotiate mounts | `tool` |
  | `tool_used` | rate calculated / preview opened / script generated | `tool` + enums and counts only |
  | `media_kit_opened` | `/media-kit` mounts | — |
  | `media_kit_uploaded` | a PDF is stored | `file_type`, `size_kb` |
  | `profile_edited` | `/edit` save succeeds | `fields_changed: string[]` |

  There is no `brand_id`; brands are keyed by `canonical_name` everywhere.
  `fields_changed` is diffed against the form as loaded (including scraped
  fallbacks), not against the row, so an untouched form reports `[]`.
- **No PII in `details`, ever.** No emails, names, free text, amounts or brand
  contact data. The route strips any key not in the per-type allowlist and
  drops the whole object over 2 KB, so a client bug cannot smuggle any in.
- **Pending creators are counted once.** The lock overlay still mounts every
  page underneath it, so the route records `dashboard_opened` for any
  `claim_status` and answers 204 without inserting for every other type unless
  the claim is `verified`. The rule lives in the route, not in the pages.
- **Mount events fire once per mount** via `useTrackOnMount()`, ref-guarded,
  so dev's Strict Mode double-effect still fires once.
- **Reporting:** `v_creator_engagement`, one row per creator with
  `first_event_at`, `last_event_at`, `event_count`, `distinct_days`, a
  `has_*` per type, plus `claim_status` and `claimed_at` joined in.
  `security_invoker`, readable only by admins (the table's single policy is
  an admin SELECT; writes stay service-role). `/admin/creators` reads it in
  one batched query for its `Last active:` line and the per-type count line
  (`n_<type>` columns, 0021), and its `Activity ▸` toggle reads the last 20
  rows of the table directly. **A new event type needs a `has_`/`n_` column
  added to the view for the count line; the activity list renders it
  automatically**, as the raw type until `lib/admin/dashboard-event-labels.ts`
  gets a wording for it.

  ```sql
  select * from v_creator_engagement where last_event_at > claimed_at;

  select event_type, created_at, details from creator_dashboard_events
  where creator_profile_id = '<uuid>' order by created_at;
  ```

---

## Known open items — parked deliberately, don't re-raise as discoveries

- **`/api/creators/claim` trusts `detectedEmail` from the request body**, so
  auto-verification can be bypassed by anyone posting two matching values. Also no
  validation of any field. Fix before any public batch.
- **TikTok verification is proven on the direct-fetch path only** (2026-09-22,
  `@lmg.media`, from a Mac on a home IP, dev server against the shared
  database: `direct=found apify=skipped`, row flipped to `verified`, funnel
  `verified` event with `platform: tiktok`). Two things are still unproven:
  the abe fallback never ran, because the Apify account behind this repo's
  `APIFY_API_TOKEN` answers `HTTP 403 platform-feature-disabled: Monthly usage
  hard limit exceeded` (that token has zero runs of any actor, ever, and is not
  the scraper's token); and whether TikTok serves the profile page to Vercel
  and VPS IPs at all, which is what decides whether production ever needs the
  fallback. Until the fallback has run once, a TikTok creator in production may
  see "we couldn't check your bio" rather than a verification, and that is the
  safe failure. The Googlebot user-agent gets a bare 403 from TikTok; the
  TikTok path sends a desktop Chrome UA and parses the
  `__UNIVERSAL_DATA_FOR_REHYDRATION__` blob, `lib/apify.ts`.
- **73 handles exist on both platforms, under different creators, and the claim
  funnel resolves by handle alone.** The teaser
  (`lib/reports/creator-brand-matches.ts`, `app/claim/[handle]/_data.ts`), the
  signup existence check (`app/auth/signup/_SignUpForm.tsx`) and the claim API
  (`app/api/creators/claim/route.ts`) all query `social_profiles.handle` with
  `.limit(1)` and no platform filter, so for those 73 the platform that gets
  claimed is whichever row PostgREST returns first. Measured 2026-10-04: 8,716
  rows, 73 handles on two rows, 0 creators with more than one row. The fix is
  carrying `platform` on the claim link (the fulfil email builds it in
  `lib/creator-requests/fulfil.ts`) through signup into the claim API's lookup.
  Not started.
- **Private Instagram accounts can never verify** and nothing tells the creator. A
  private profile returning an empty bio field classifies as `absent` and costs an
  attempt. Settling it needs one real Apify response body to confirm the privacy
  field name.
- **`verification_attempts` has no reset path** other than the 1-hour window.
  `verify-bio` still points lockouts at a support channel the UI doesn't offer.
- **No graceful chunk-load-error recovery** for creators with a page open during a
  deploy.
- **`FALLBACK_STATS` is stale** and the tagline above it claims live data.
- **Brand cards have no path into the tools.** The Rate Calculator has no brand
  field; the Negotiation tool's `brandName` is never filled. The teaser's
  "pre-filled with {brand}'s context" copy is not kept.
- **The Negotiation tool assumes prior contact** — all four of its stage options
  presuppose the brand reached out. It is not a cold-outreach tool; that's what
  `/creator-dashboard/outreach` is for.
- **Satoshi is declared but never loaded** — `app/globals.css:43` and
  `app/home.css:24-25`, with no `@font-face`, no `next/font`, and no font file.
  The whole site renders in system-ui.
- **Five outreach breadcrumb strings** keep "Brands Hiring" in English on the
  reasoning that a crumb shouldn't disagree with its destination. That page is now
  `Marcas que contratan`, so they're the ones disagreeing.
- **Six module-scope service-role Supabase clients** persist for the process
  lifetime, inconsistent with `createSupabaseAdminClient()` elsewhere. Not a leak —
  a service-role client carries no caller identity — but it makes "is this
  per-request?" harder to answer at a glance.
- **Dead files that look in scope:** `DashboardShell.tsx`, `Sidebar-o.tsx`,
  `layout-old.tsx`, `page-old.tsx`, `BudgetCalculator-old.tsx`. Unreferenced.
- **~15 of 21 auth users** never completed anything — consistent with the claim
  flow having 404'd for five months. Worth understanding whether any are bot
  signups before publishing claim links widely.
- **Google ignores the site**, so SEO work (hreflang, sitemap coverage for the
  Spain tree) is parked indefinitely. DMs are the only channel.
