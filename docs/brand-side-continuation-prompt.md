# InfluenceIT — Brand-Side Work: Continuation Prompt

*(Paste this entire document as the first message of a new chat to continue the brand-side work. A companion document exists for the creator side: `docs/creator-side-kickoff-prompt.md`.)*

---

I'm Lukas, founder of **InfluenceIT** (influenceit.app), a creator intelligence database. This document was written by a previous Claude session that worked with me for weeks and knows the project deeply. Treat it as authoritative context. Read fully, then ask me what's changed before proposing anything.

## Project snapshot (as of July 7, 2026 — everything below is DEPLOYED to production)

- **Database**: 5,100+ IG/TikTok creators, ~70K posts in `creator_posts` (with `is_sponsored`, `detected_brands` arrays), Supabase free tier (healthy: ~4% CPU), nightly pg_dump backups via cron on my VPS, `engagement_snapshots` accumulating daily toward future trend features.
- **Brand intelligence layer**: `brand_aliases` (AI-classified canonical entities; 431 brands, ~87+ human-`verified`; ~5,100 single-creator aliases still unclassified), `v_brand_partnerships` live view (auto-updates as posts are scraped; classification of NEW aliases requires rerunning `npm run brand-aliases:seed` → `prepass` → `classify` after scraping runs — idempotent, cheap). Admin **Brand Index** section for review/verify.
- **Brand Reports v2** (`/report/[slug]`): three-tier evidence pages — Tier 1 "Your creator activity" (brand's own detected creators, named, open), Tier 2 "Your competitive landscape" (up to 3 verified competitors with 3 named creator cards each, no outbound links; auto-suggest + manual override), Tier 3 "Recommended for you" (3 named + 9 blurred matches, competitor-overlap excluded, admin pin/✕ curation). Dark hero + yellow stats band, light Tier 2/3, Tier 3 in an elevated white frame. ISR-cached with on-demand revalidation on admin save. Admin generator at `/admin/reports`.
- **The Gymshark prototype report** exists: 40 sponsored posts / 15 creators detected; competitors Alo Yoga + AYBL + DFYNE (the latter two manually added — below the 5-creator auto-suggest floor by design).

## Non-negotiable data rules (violations were caught and killed multiple times — enforce ruthlessly)

1. **Never display raw `social_profiles.engagement_rate`** (TikTok values reach 900%+). All displayed engagement = median-post methodology via `computeMedianEngagement()` / `scoreProfilesByMedianEngagement()` in `lib/reports/engagement.ts`: median(likes+comments)/followers×100, ≥8 posts required, caps IG ≤20% / TikTok ≤40%. Unscoreable creators are omitted, never shown with fallback numbers.
2. **Only `verified = true` brands may be named** anywhere outbound/visitor-facing.
3. **No hardcoded numbers**; every stat computed live.
4. **Never invent**; missing data → omit the element.
5. **All visitor-facing copy must be literally true** (we deleted a false "free forever plan" claim; keep that standard).
6. Unicode/emoji-safe string handling everywhere (`Array.from`, code points — two hydration bugs taught us this).

## Workflow conventions

- This chat = strategy/spec/review. **Claude Code (CC)** implements from prompts we draft together. CC works on **fresh branches off latest origin/main** (specify this explicitly — it's gone wrong before), one concern per PR, typecheck/lint clean. I create PRs manually (no gh CLI in CC's env), review on Vercel preview, merge, then deploy to my VPS (`git pull && npm install && npm run build` + pm2 restart).
- **Migrations**: numbered SQL files in `supabase/migrations/` (0001–0005 applied), applied by ME manually in the Supabase SQL editor. Never give CC direct DB access; the manual checkpoint has caught real bugs. Paste-ready SQL only — no shell prompts in the paste.
- **CC cannot test the authenticated admin** (no credentials in its sandbox) — acceptance tests on admin flows are always mine; have CC tell me exactly what to exercise.
- **My style: quality over speed.** I perfect before I ship. Test batches before full runs. Push back on me with reasons when I'm wrong.

## The plan (my stated sequence)

1. **Perfect the Gymshark prototype** to my quality bar. *(Ask me: is the 5-point design pass done — tier labels removed, honest CTA, internal-vocab sweep, elevated Tier 3 frame, 3+9 grid math? Has my full read-through happened?)*
2. **Replicate with a second brand** — planned candidate: **Maybelline (24 creators) or Sephora (21)**, deliberately a beauty brand: tests auto-suggest working unassisted (beauty has many verified ≥5-creator competitors), deeper Tier 1, and it's the category for a possible **light theme variant** (beauty brands may not vibe with the dark design — idea parked: theme toggle per report, explore via Claude Design, only after two dark prototypes prove the system).
3. **Then outbound.** Three email drafts already exist (below). Send from **lukas@influenceit.app** (mailbox to be created + warmed with a few normal emails first; domain already has mail service via admin@). Recipients found via Google `site:linkedin.com <brand> influencer marketing / creator partnerships` — no LinkedIn account needed for this. Hand-written sends, no bulk tools/tracking pixels. First batch plan: Gymshark + one big beauty brand + one mid-size founder-reachable brand (Peppermayo-type) + one high-repeat-ratio brand (Fashion Nova: 74 posts/24 creators ≈ 3 posts/creator = ongoing ambassador programs). Signal definition set in advance: 5–10 sends → 1 reply is success; silence after 10 good sends = revise report/targeting, not the mission.

## The three email drafts (final polish against the live report before sending; numbers must match the page)

**A — "Lead with their data"** (best for big brands; subject: "15 creators posting sponsored Gymshark content — a report"):
Hi [Name], We run InfluenceIT, a creator intelligence index across Instagram and TikTok. Among the 5,000+ creators we track, we've detected 40 sponsored Gymshark posts from 15 creators — so I put together a short report on your creator landscape: who's posting for you, what Alo Yoga, AYBL and DFYNE are doing, and a few high-engagement creators none of them have touched yet. [report link] No signup needed to read it. If it's useful, happy to hear what you'd want to see more of. — Lukas Langer, InfluenceIT · influenceit.app

**B — "Lead with competitors"** (for scrappier brands; subject: "What AYBL and DFYNE are doing with creators right now"): same structure, opens with the competitor pattern.

**C — "Short & curious"** (A/B wildcard; subject: "Your creator landscape, mapped"): under 60 words, one link, "Worth a look?"

## Known open items / backlog (ask which are done)

- `/admin/creators` and `/admin/inquiries` are broken (query nonexistent `creators.name`, should be `display_name`) — flagged, unfixed.
- PR #9 on GitHub has a mislabeled title/body (auth text on the tier-2 fix merge) — cosmetic.
- Tier 3 admin curation panel lacks a visual divider between named (top 3) and blurred rows — UI nit, spec drafted.
- Singleton classification run (~5,100 one-creator aliases; `--min-count` flag + strengthened "prefer unknown" prompt + attach the alias's creator as context) — planned, valuable for creator discovery via small brands.
- Categorization backfill (only ~240 creators categorized; embeddings exist on `creators`) — limits Tier 3 matching quality and competitor grouping.
- Automate post-scrape pipeline (snapshot insert + seed/prepass/classify) into the scraping tail.
- LinkedIn presence for InfluenceIT — separate chat planned, kickoff prompt exists in an earlier session.
- Light report theme for beauty brands (see plan step 2).
- Site-wide engagement recomputation (profile pages still show raw stored ER, e.g. 146% outliers) — the UPDATE statement was drafted, deferred; needs backup-table first.
- Supabase security review: `brand_profiles` and other admin tables are anon-readable at the DB layer (app-layer gating only) — do before paying customers.

## How to start

1. Ask me: current status vs. this document (design pass done? read-through done? anything shipped since? outbound started?).
2. Then pick up wherever the sequence stands — spec together here, CC builds, I review and deploy.
