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
  && git pull origin main \
  && npm install \
  && rm -rf .next \
  && npm run build
```

Then restart **InfluenceIT** in the Webuzo dashboard.

- Four Webuzo apps run on that box. **InfluenceIT is port 30001.** `lmg.media` is
  30000, the scraper 30002, `creators.lmg.media` 30003.
- The old chain ended `fuser -k 30000/tcp && pm2 restart all`, which restarts a
  *different site*. InfluenceIT kept serving its old build from memory while
  `.next` was replaced underneath — producing `ChunkLoadError` and, for a whole
  day, a stale client running against a new server.
- pm2 manages only the old `lmgmedia` app. Its logs are not InfluenceIT's.
- Nothing supervises the Node process. Killing it does **not** respawn it; use the
  Webuzo dashboard.
- `rm -rf .next` before building is required.
- Hard-refresh after deploying. An incognito window is the cleanest way to tell a
  cache problem from a real one.
- Vercel green before VPS.

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

Six public GETs stay deliberately cacheable, because their body depends only on
the URL: `creators/[handle]`, `creators/compare`, `creators/featured`,
`creators/featured/featured`, `stats`, `categories`.

**Purge the cache** after any deploy that changes cache headers, or a poisoned
entry outlives your verification pass:

```
rm -rf /var/webuzo-data/nginx_proxy_cache/lukelmg/*
```

**Post-deploy check**, run twice:

```
curl -sS -D- -o /dev/null 'https://influenceit.app/api/creator/brand-matches'
```

`X-Cache-Status` must never be `HIT`. No cookie needed — the headers apply on
every branch, so a 401 proves it.

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

- Next number: check the folder. 0013 is taken.
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

- `public_stats()` and `top_creators()` are defined **in Supabase directly**, not
  in the repo. Both are SECURITY DEFINER.
- `anon` has `statement_timeout = 3s`; `authenticated` 8s; `postgres` (the SQL
  editor) none. **A query that looks instant in the editor can be killed in the
  app.** This caused an intermittent empty homepage for weeks. The homepage's
  build-time calls now use the service-role client.
- `creators`, `social_profiles` and `creator_posts` have RLS filtering to
  `status = 'active'`. `service_role` bypasses it — so anywhere the admin client
  replaces the anon client, replicate the filter explicitly in code and comment
  which policy it mirrors. **But do not read that filter as a protection:** all
  6,214 creators are currently active, so it excludes nothing, and
  `v_creator_summary` bypasses it entirely. See *Row-level security — measured*.
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

- **`brand_aliases`** (~12,600) — the classification layer. `alias` **is the
  Instagram handle**; `canonical_name` is the display name; `entity_type`
  separates brand from creator/celebrity/media; `verified` is a human-only trust
  flag the pipeline never touches.
- **`brand_brackets`** — built by `scripts/brand-brackets/refresh.ts` from
  `brand_aliases` + `creator_posts` + `social_profiles`. PK is
  `(canonical_name, platform)`. This is what brand cards read.
- **`brands`** (~11,464) — **do not use.** `brand_name` is NULL for ~99% of rows,
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

---

## Row-level security — measured 2026-08-24, not assumed

This was the most expensive unknown in the project. For months the repo could
not say what an anonymous caller could read, and application-layer gates were
built without knowing what the database allowed underneath. Some of them were
built on a false premise. What follows is measured, with the method, so the
next session verifies rather than guesses.

**RLS is enabled on all 28 public tables.** `relrowsecurity = true` everywhere,
`relforcerowsecurity = false` everywhere (normal — that only affects the table
owner; `service_role` bypasses RLS regardless). Nothing is exposed because RLS
is off. Everything below is a *permissive policy*.

### How to re-measure

```sql
select relname, relrowsecurity, relforcerowsecurity from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' order by relrowsecurity, relname;

select tablename, policyname, roles::text, cmd, qual::text, with_check::text
  from pg_policies where schemaname = 'public' order by tablename, cmd, policyname;

select c.relname, c.reloptions from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v';
```

For the read surface, count each table twice — once with
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, once with `SUPABASE_SERVICE_ROLE_KEY` — and
compare. A gap means RLS filters; equal counts mean anon sees everything. Zero
against a non-empty table means blocked. **Zero against an empty table proves
nothing**, so always print both numbers.

### The anon read surface

Anyone holding the publishable anon key — it ships in the client bundle:

| Table / view | anon | service | |
|---|---|---|---|
| `creators` | 6,214 | 6,214 | fully readable |
| `social_profiles` | 6,102 | 6,102 | fully readable |
| `creator_posts` | 135,742 | 135,742 | fully readable |
| `v_creator_summary` | 6,214 | 6,214 | fully readable, **incl. `contact_email` on 2,765** |
| `v_brand_summary` | 454 | 454 | fully readable |
| `campaign_briefs` | 6 | 6 | fully readable |
| `creator_profiles` | 1 | 5 | filtered to `claim_status = 'verified'` |
| `brand_profiles` | 0 | 1 | blocked |
| `user_roles`, `shortlists`, `shortlist_items`, `inquiries`, `activity_log`, `contact_submissions`, `brand_aliases` (12,642), `brand_brackets` (1,614), `brands` (11,856), `funnel_events` (26,984), `creator_outreach`, `v_brand_partnerships` (2,242) | 0 | non-zero | blocked |

Most policies target the `{public}` Postgres role, which means **everyone,
including `anon`** — not "the public website". That is harmless where the
`USING` clause is `auth.uid() = id`, since `auth.uid()` is null for anon and it
fails closed. It is total exposure where the clause is `true`.

### Views bypass RLS unless `security_invoker` is set

A view runs with its **owner's** privileges by default, so RLS on the tables
underneath does not apply. Of the four views, only `v_brand_partnerships` sets
`security_invoker=true` — and it is the only one anon cannot read.

`v_creator_summary`, `v_brand_summary` and `v_partnerships_detail` do **not**
set it. That is the mechanism behind the `contact_email` exposure above, and it
also means the `status = 'active'` filter on `creators` does not reach the view:
deactivate a creator and the table hides them while `v_creator_summary` keeps
serving them.

### What the route gates actually are

The `status = 'active'` policies on `creators`, `social_profiles` and
`creator_posts` are real, but **all 6,214 creators are currently active**, so
the filter excludes nothing and its correctness is unfalsifiable with today's
data. Do not read it as a protection.

Consequently, **for creator data the application gates are billing and product
boundaries, not security boundaries.** `requireApprovedBrand()` decides who is
metered and who sees the product; it does not decide who can obtain the data,
because the same rows are reachable from PostgREST with the anon key and no
account at all. PR #54 gated `/creators/[handle]` and its API twin behind a
session — that gate expresses an intent the database does not enforce.

State this plainly in any future security claim. A comment in
`lib/auth/api-guards.ts` asserting that RLS refused the anon key was **false**
and is corrected.

### `brand_profiles` is self-writable — the gate is bypassable

```
brands_update_own | {public} | UPDATE | USING (auth.uid() = id) | with_check: null
brands_insert_own | {public} | INSERT |                          | with_check: (auth.uid() = id)
```

`with_check` is null on the UPDATE, so `USING` governs the new values too, and
**no column is pinned**. A brand can set its own `approval_status` to
`'approved'` from the browser with the anon key, and then pass
`requireApprovedBrand()`. It can equally set its own `token_balance`,
`subscription_tier` and usage counters.

Migration 0015 added a trigger guarding exactly this class of column — but only
on `creator_profiles` (`claim_status`, `verification_code`, `token_balance`,
`subscription_tier`, …). **There is no equivalent on `brand_profiles`.**

This only became reachable on 2026-08-24, when brand signup started creating
rows again after months of failing.

### `user_roles` is browser-insertable, but the role is pinned

```
users_insert_own_role | INSERT |
  with_check: ((auth.uid() = user_id) AND (role = ANY (ARRAY['brand','creator'])))
```

A client can insert its own role row — `_SignUpForm.tsx:142` does exactly that —
but `'admin'` is excluded, and there is **no UPDATE and no DELETE policy on
`user_roles` at all**, so an existing row cannot be escalated (RLS denies when
no policy matches). Admin is therefore not self-assignable today.

`ADMIN_USER_ID` still stands on its own merits — defence in depth, and the
window before the policy was patched on 2026-08-12 — but do not repeat the
claim that a signup could currently write itself admin.

### Policies that look unintended

- **`brand_reports`** — `{authenticated} DELETE USING true` and
  `{authenticated} INSERT with_check true`. Any logged-in account can delete
  every brand report. The admin reports page depends on these two policies for
  its own insert and delete, so they need replacing with `is_admin_user()`,
  not simply dropping.
- **`activity_log`** — `anyone_can_log | {public} | INSERT | with_check true`.
  The audit log is anonymously forgeable. Approvals are written here.
- **`campaign_briefs`** — `public_read_briefs USING (true)` sits alongside
  `briefs_read_own`; permissive policies OR together, so every brand's
  `brief_text` is public. `public_insert_briefs` lets anyone write them.

### Dependencies to check before changing any of this

Measured 2026-08-24: the public surfaces — `/`, `/discover`, `/compare`,
`/api/creators/featured`, `/api/stats`, `/api/categories` — read only
`creators`, `social_profiles`, `creator_posts`, `v_creator_summary` and
`public_stats()`. **None of them touches `campaign_briefs`, `brand_reports`,
`activity_log` or `brand_profiles`**, so those four can be tightened without
touching the public site. The homepage goes through
`createSupabaseAdminClient()` in `app/_queries.ts` and bypasses RLS anyway.

Two couplings do exist, and both need a code change alongside any policy change:

- `/api/match` inserts into `campaign_briefs` **with the anon client**
  (`import { supabase } from '@/lib/supabase'`), so it has no `auth.uid()` and
  relies on `public_insert_briefs`. Removing that policy breaks matching unless
  the route moves to the service-role client first.
- `app/contact/page.tsx` and `app/admin/creators/page.tsx` write `activity_log`
  from the **browser**, so they rely on `anyone_can_log`. The contact form is
  anonymous by nature; constrain it by `event_type` rather than removing anon
  insert outright.

### Open, deliberately not decided here

`v_creator_summary` exposing `contact_email` on 2,765 creators is a **product**
decision, not a bug to patch quietly — it is the surface the public directory is
built on. Do not fold it into a security change.

---

## Product rules — non-negotiable

- Everything is **"detected"** from a sample. Never absolute.
- **No hardcoded or fabricated numbers** shown to creators. Watch fallback
  constants — a stale fallback under a line claiming "read from the live
  database" is the failure this rule exists to prevent.
- Region, niche and recency are **additive, never penalizing**.
- Category is **a lens the creator looks through**, never a niche assumed about
  them.
- **Don't promise what the product can't do.** Live examples to avoid repeating:
  copy telling a creator "we'll notify you when your profile is ready" (there is
  no notification system), and a card claiming tools arrive "pre-filled with
  {brand}'s context" when they didn't.
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

---

## Known open items — parked deliberately, don't re-raise as discoveries

- **`/api/creators/claim` trusts `detectedEmail` from the request body**, so
  auto-verification can be bypassed by anyone posting two matching values. Also no
  validation of any field. Fix before any public batch.
- **TikTok verification has never run successfully.** The code path exists
  (`apifyTikTokBio`, the platform branch in `verify-bio`, translated instructions)
  but the only verified creator is Instagram. Blocked on there being no way to add
  a TikTok account to the scraper manually, so there's no account to test with.
  Until it's proven, **don't DM TikTok creators** — ~55% of the database.
- **Private Instagram accounts can never verify** and nothing tells the creator. A
  private profile returning an empty bio field classifies as `absent` and costs an
  attempt. Settling it needs one real Apify response body to confirm the privacy
  field name.
- **`verification_attempts` has no reset path** other than the 1-hour window.
  `verify-bio` still points lockouts at a support channel the UI doesn't offer.
- **`top_creators()` may not filter `status = 'active'`** — unverified. If it
  doesn't, the leaderboard and ticker already show inactive creators.
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
