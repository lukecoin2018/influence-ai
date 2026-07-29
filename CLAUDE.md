# CLAUDE.md — influence-ai / InfluenceIT

Read this before doing anything. These conventions were learned the hard way;
each one exists because skipping it caused a real problem.

---

## Who you're working with

Lukas is the founder, not a strong coder. Explain decisions in plain terms and
make the call on technical questions — but surface genuine strategic choices for
him to decide.

He verifies in production with screenshots. Trust those over any tool's report,
including your own. If your plan doesn't match his understanding, he'll say so —
that check has caught real errors.

---

## Non-negotiable workflow

### Step 0 — prove your ref, every session

Before reading or writing anything:

```
git rev-parse HEAD
git rev-parse origin/main
git fetch origin && git rev-parse origin/main
git log origin/main..HEAD --oneline
git status --short
```

**The fetch is mandatory and the pre-fetch SHA proves nothing.** `origin/main` is
a cached local pointer; it only means something after fetching. A checkout has
been silently stale multiple times, and once a PR believed to be merged was not —
which meant a fix was thought live in production when it wasn't.

If HEAD doesn't match what the prompt expects, STOP and say so. If `main` has
moved *ahead* of you, verify the trees with `git diff --quiet <HEAD> origin/main`
before assuming it matters — main catching up is the opposite of the risk this
gate exists for.

### Two phases, always

**Investigate → STOP for review → build → show the full diff → STOP.**

Never build before the diagnosis is approved. Never commit before the diff is
seen. Never merge or deploy — that's Lukas's, always.

### One concern per branch

No unrelated fixes riding along, however tempting or small. Note them in the
report instead.

### Read-only means read-only

No writes, no edits, no build, no SQL, no browser. If you find something broken
during an investigation, write it down and keep going.

### Evidence, not assertion

Cite file paths and line numbers for every claim. **UNKNOWN is a good answer;
a plausible-sounding guess is not.** If the code can't tell you, say what would
settle it — a specific query, a specific file — and don't run it.

### Never enter credentials

Don't type passwords into forms, don't ask for a Postgres connection string.
If a test needs a login, hand it back to Lukas.

---

## Database

**No migration runner exists.** Migrations are numbered SQL files in
`supabase/migrations/` that Lukas applies **by hand** in the Supabase SQL editor.
Write the file, show the paste-ready SQL, he pastes it, he confirms. The manual
checkpoint is deliberate and has caught real bugs.

- Next migration number: check the folder, don't assume.
- Include `IF NOT EXISTS` throughout — files must be safe to rerun.
- Supabase's SQL editor runs statements in a transaction, so no
  `CREATE INDEX CONCURRENTLY`.
- **Strip leading comment blocks from anything Lukas has to paste.** Comments
  have caused syntax errors on the round trip. Documentation belongs in the repo
  file; the paste should be bare statements, one at a time.
- Code that reads a new column must tolerate it being absent or NULL. The
  migration is applied out of band, so ordering isn't guaranteed.

### Things that are true about this schema

- `public_stats()` and `top_creators()` are defined **in Supabase directly**, not
  in the repo. Both are SECURITY DEFINER.
- The `anon` role has `statement_timeout = 3s`; `authenticated` has 8s;
  `postgres` (the SQL editor) has none. A query that looks instant in the editor
  can be killed in the app. This caused an intermittent empty homepage for weeks.
- `creators`, `social_profiles` and `creator_posts` have RLS filtering to
  `status = 'active'`. `service_role` bypasses it — so anywhere the admin client
  replaces the anon client, replicate the filter explicitly in application code
  and comment which policy it mirrors.
- Person + profiles model: `creators` is the person, `social_profiles` holds one
  row per platform. `handle` lives on `social_profiles`, not on `creators` or
  `creator_profiles`.
- `creator_profiles` is the **claimed-account** table, keyed on the auth user id.
  It is not the scraped-creator table. `creator_profiles.id` is the trustworthy
  join key.
- `creator_profiles.claimed_at` means "when the claim became **verified**", not
  when it happened. Use `created_at` for claim time.

---

## Deploying

Vercel deploys `main` automatically. The VPS is manual and **the obvious command
is wrong**.

```
cd /home/lukelmg/public_html/influenceit.app \
  && git pull origin main \
  && npm install \
  && rm -rf .next \
  && npm run build
```

Then restart **InfluenceIT** in the Webuzo dashboard.

- There are four Webuzo apps on that VPS. InfluenceIT is **port 30001**.
  `lmg.media` is 30000, the scraper 30002, creators 30003.
- The old chain ended with `fuser -k 30000/tcp && pm2 restart all`, which
  restarts a *different site*. InfluenceIT kept serving its old build from memory
  while `.next` was replaced underneath it — producing `ChunkLoadError` and, once,
  a stale client running against a new server for a whole day.
- `rm -rf .next` before building is required; stale chunks otherwise.
- Hard-refresh (Cmd+Shift+R) after deploying, and remember an incognito window is
  the cleanest way to tell a cache problem from a real one.
- Vercel green before VPS.

---

## Product rules — non-negotiable

These govern anything a creator sees:

- Everything is **"detected"** from a sample. Never absolute.
- **No hardcoded or fabricated numbers** shown to creators. Watch fallback
  constants especially — a stale fallback under a line claiming "read from the
  live database" is the failure this rule exists to prevent.
- Engagement uses **median-post**, not first-15. The cap exists because TikTok
  produced rates above 100%.
- Region, niche and recency are **additive, never penalizing**.
- Category is **a lens the creator looks through**, never a niche assumed about
  them.
- **Don't promise what the product can't do.** Two live examples to avoid
  repeating: copy telling a creator "we'll notify you when your profile is ready"
  (there is no notification system), and a card claiming both tools arrive
  "pre-filled with {brand}'s context" (neither does).

---

## Localization

- Two locales only: `en` and `es`. Neutral Spanish — roughly 1,500 LatAm
  creators and 550 from Spain, and the wording must read naturally to both.
- `/es-es/discover` is a **separate geographic SEO tree**, not a dialect variant.
  Out of scope unless explicitly named.
- Locale is persisted on `creator_profiles.locale` at claim time, and resolved
  client-side elsewhere via path → `?locale=` → DB → `'en'`.
- String tables are typed with a `Record<Locale, T>` so a missing key is a
  **compile error**. Follow that pattern; don't introduce an i18n library.
- The dashboard is **partly** translated, and the line is drawn by destination,
  not by file. Bilingual: the chrome (sidebar nav, the layout's verification
  gate), the Overview, Brands Hiring, `/creator-dashboard/verify` and
  `/creator-dashboard/outreach`. Still English: Rate Calculator, Negotiation,
  Contract Builder, Edit Profile, Media Kit — plus **anything that names or
  describes one of those five**, wherever it appears. So the sidebar's five tool
  labels, both "Edit Profile" controls and the whole Creator Tools block on the
  Overview stay English on a Spanish page, on purpose: a label that disagrees
  with its own destination is worse than an untranslated one. Translating a tool
  is what earns its label a translation.
- The sidebar token box and plan badge are English in both locales — tokens gate
  the five English tools, so the token chrome belongs with them. This is why
  `TIER_LABELS[tier] + " Plan"` is allowed to keep its English word order.
- Consolidated category buckets have **two identities**: the English bucket name
  is the data identity (filtering, niche-lead matching) and must never be
  translated; `categoryBucketLabel(bucket, locale)` is the display label. Wrap
  render sites only. Same rule for `BrandsHiring.tsx`'s `ALL_CATEGORY` sentinel.
- `useSearchParams()` in root-layout chrome would de-opt every static route from
  prerendering. Read `window.location.search` via `useSyncExternalStore` instead.

---

## Render modes — check before you touch

Several routes are statically prerendered and must stay that way:

| Route | Mode |
|---|---|
| `/` | `revalidate = 3600` |
| `/discover`, `/es/discover`, `/es-es/discover` | `revalidate = 86400` |
| `/report/[slug]` | `revalidate = 60` |
| `/claim/[handle]`, `/es/claim/[handle]` | `force-dynamic` |
| `/auth/signup` | `force-dynamic` (deliberate — needed for funnel capture) |

`cookies()` and `headers()` de-opt a route to dynamic. If a shared helper reads
them internally, importing it into a static route breaks that route **silently**.
Have the caller read them and pass them as arguments.

---

## Instrumentation

`funnel_events` records four events server-side: `teaser_viewed`,
`signup_arrived`, `claim_completed`, `verified`.

- Written fire-and-forget via `after()` from `next/server`, wrapped in try/catch
  (it throws E468 outside a request scope).
- **Deliberately not sessionised** — `teaser_viewed` counts renders, not people.
  Don't add a session column without revisiting that decision.
- `signup_arrived` is named for what's observable: the four teaser CTAs share one
  href, so no server-side capture can attribute a click to a control.
- Bot classification is **user-agent only** — the one signal identical on Vercel
  and the VPS. Instagram's crawler hits every DMed link.
- Never let an event write break or slow a page.

---

## Known open items

Not urgent, but don't re-raise as discoveries:

- `/api/creators/claim` trusts `detectedEmail` from the request body, so
  auto-verification can be bypassed. Fix before any public batch.
- Private Instagram accounts can never verify; nothing tells the creator this.
- `top_creators()` may not filter `status = 'active'` — unverified.
- No graceful chunk-load-error recovery for creators with a page open during a
  deploy.
- `FALLBACK_STATS` is stale, and the tagline above it claims live data.
- The homepage hero card reads a raw uncapped `engagement_rate` while the ticker
  beside it uses the capped median.
