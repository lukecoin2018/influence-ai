# InfluenceIT — Creator-Side Brand Intelligence: Project Kickoff Prompt

*(Paste this entire document as the first message of a new chat when ready to build the creator-side feature.)*

---

I'm Lukas, founder of **InfluenceIT** (influenceit.app) — a creator intelligence database. I want your help designing and building a new feature: **brand intelligence for creators**. Below is everything you need to know about the project, the system, and the rules we work by. Read it fully before proposing anything.

## What InfluenceIT is (state as of July 2026)

A database of **5,100+ Instagram & TikTok creators** with ~70K scraped posts (`creator_posts`), real engagement data, and **detected brand partnerships** (sponsored posts with `is_sponsored` flags and `detected_brands` arrays). Three surfaces:

- **Public site** (Next.js 16 App Router, dark/yellow identity): homepage with live leaderboard, creator profile pages (public), `/report/[slug]` Brand Reports.
- **Brand dashboard** (customer product): campaign tools, token system, Stripe subscriptions (`STRIPE_BRAND_*_PRICE_ID` env vars).
- **Creator dashboard** (built but dormant): creators can claim their profile and get an account. Stripe price IDs for creator subscriptions and token top-ups already exist in env (`STRIPE_CREATOR_STARTER_PRICE_ID`, `STRIPE_CREATOR_ACTIVE_PRICE_ID`, `STRIPE_CREATOR_TOPUP_*`). **The original creator acquisition model (creators find their profile via Google and claim it) failed because Google never indexed the site — the product was never the problem, distribution was.**
- **Admin dashboard** (`/admin`): includes a **Brand Index** section managing the brand intelligence layer.

## The brand intelligence layer (recently built — the foundation for this feature)

- `brand_aliases` table: normalizes raw detected-brand strings into canonical entities (`entity_type`: brand/creator/celebrity/media/fragment/unknown; `canonical_name`, `category`, `region`, `verified` boolean set **only by humans**, `creators_count`). Populated by scripts: `npm run brand-aliases:seed` → `prepass` → `classify` (AI batch classification via Anthropic API; idempotent; only aliases with ≥2 creators are classified, ~5K singletons remain 'unknown' pending a future run).
- `v_brand_partnerships` view (security_invoker): canonical brand → distinct creators, sponsored posts (`count(distinct post)`, `is_sponsored` only), most recent post. **Live view — updates automatically as posts are scraped.**
- **RLS**: `brand_aliases` is admin-only (via `user_roles.role='admin'` + `is_admin_user()` security-definer function). Important for this feature: creators are authenticated non-admins, so **any creator-facing surface reading brand data must go server-side via the service-role client, or get deliberate new RLS policies** — the view will return zero rows to creator sessions by design. This was a conscious decision; don't weaken the admin lockdown.
- `engagement_snapshots` table: daily engagement/follower snapshots (pg_cron-able), accumulating toward trend features.
- Brand Reports v2 (`/report/[slug]`): three-tier outbound sales pages for brands (Tier 1: their detected creators; Tier 2: verified competitors' creators; Tier 3: gated recommendations with admin pin/exclude curation via `brand_reports.competitor_names / excluded_creator_ids / pinned_creator_ids`).

## Non-negotiable data rules (learned the hard way — violations have been caught and killed twice)

1. **Never display raw `social_profiles.engagement_rate`.** TikTok values run to 900%+ (viral accounts; the metric breaks). All displayed engagement uses **median-post methodology**: `median(likes+comments per post) / followers × 100`, requiring **≥8 scraped posts**, capped IG ≤20% / TikTok ≤40% as anomaly fences. Shared helpers exist: `computeMedianEngagement()` / `scoreProfilesByMedianEngagement()` in `lib/reports/engagement.ts`. Creators who can't be scored are **omitted, never shown with a fallback number**.
2. **No hardcoded numbers anywhere.** Every stat is computed live (see `public_stats()` RPC pattern). Grep for digit literals before shipping.
3. **Only `verified = true` brands may be named** in anything outbound/product-facing. Unverified classifications are internal.
4. **Never invent.** Missing data → omit the element. No placeholder values on real surfaces.
5. **Emoji/Unicode safety**: creator display names contain emoji, surrogate pairs, mathematical-script characters. All string slicing (initials, truncation, blur) must be code-point-safe (`Array.from`, `\p{L}` filters). This has caused two hydration bugs already.

## Tech & workflow conventions

- **Stack**: Next.js 16.1 App Router, React 19, TypeScript, Tailwind v4 (tokens in `@theme` in globals.css), Supabase (`lib/supabase.ts` browser client, `lib/supabase-server.ts` server client, service-role key in env). Anthropic API key in `.env.local` for AI features.
- **No migration runner**: migrations are numbered SQL files in `supabase/migrations/` (currently 0001–0003) that **I apply manually** in the Supabase SQL editor. Write the file, show me the SQL, I paste it, I confirm. Never ask for a Postgres connection string — the manual checkpoint is deliberate and has caught real bugs.
- **Workflow**: this chat = strategy/spec/review; **Claude Code (CC)** implements. I hand CC prompts we draft together. CC works on **fresh branches off latest origin/main** (this has gone wrong before — always specify), one concern per PR, typecheck/lint clean, PRs created manually by me (no gh CLI in CC's env), Vercel preview review, then merge → VPS deploy (`git pull && npm install && npm run build` + pm2 restart).
- **Admin reliability**: all admin data-fetching must use try/catch/finally with retryable error states and `withTimeout` (see `lib/withTimeout.ts` and the admin-reliability work) — a chronic freeze/deadlock bug was fixed; don't reintroduce naked `Promise.all`.
- **My style**: quality over speed — I'd rather get it right than ship fast. Use checkpoints (test batches, single-page previews) before full runs. I review everything with my own eyes before it reaches users. Push back on me when I'm wrong, but with reasons.

## The feature to design and build: brand intelligence for creators

**Core insight**: brands ask "which creators should I hire?"; creators ask **"which brands are actually paying creators right now?"** — and `v_brand_partnerships` + `creator_posts` answer the second question as directly as the first. To a mid-tier fitness creator, "Gymshark ran 40 sponsored posts across 15 creators (mostly 50–500K followers), most recent 3 weeks ago" is a pitch list with proof of budget.

**MVP scope (start here — mostly a reuse of existing data):**
A "**Brands hiring in your niche**" section in the existing creator dashboard: brands from `v_brand_partnerships` filtered to the creator's category/adjacent categories and rough follower-bracket overlap with the brand's detected creators, sorted by recency and repeat-ratio (`sponsored_posts / distinct_creators` — high ratio = ongoing ambassador programs = brands that keep hiring). Show: brand name, category, how many creators they work with, typical follower bracket of those creators, most recent detected post. **Verified brands only.**

**Things to design carefully (ask me about these):**
- Free vs paid split: what does a free creator account see vs. the paid tier / token spend? (The token system exists.) The strategic answer probably mirrors the brand side: enough free to prove the data is real, depth/freshness/contact-worthy detail gated.
- How this hooks into the **claim funnel**: the plan is outbound DMs to unclaimed creators — "claim your profile to see which brands are hiring creators like you" — this feature is the reason-to-claim the old funnel lacked. The DM copy and the feature should be designed together.
- Whether creators can see **which specific creators** a brand worked with (their competitors!) or only aggregates — sensitivity differs from the brand side.
- Category coverage caveat: only ~430 verified brands and most creators are uncategorized (embeddings exist on `creators` for a future backfill — categorization quality directly limits this feature's matching, may need to be part of the project).

**Explicitly later (don't build now):** full "creator report" mirror of Brand Reports; brand-fit scoring; alerts. MVP first, validated against real claimed creators.

**Strategic context**: the brand-side outbound (Brand Reports to companies like Gymshark) is phase one of the flywheel and [by the time I open this chat, I'll tell you how it went — ask me]. The creator side is phase two: it should launch with "brands on this platform are actively looking at creators" being true.

## How to start

1. Ask me for the current state: how brand outbound went, what changed since this document, current creator-dashboard state, and whether the categorization backfill happened.
2. Then propose the MVP design — data model, free/paid split, page structure — as a discussion, not code. We spec together here; CC builds from our spec.
3. Assume every number shown to a creator obeys the data rules above.
