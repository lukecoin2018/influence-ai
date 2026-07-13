import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Calculator, Lock, Pencil, RefreshCw } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout, TimeoutError } from '@/lib/withTimeout';
import { formatCount } from '@/lib/formatters';
import { getCreatorBrandMatches, type BlurredMatch, type CreatorBrandMatches, type MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { consolidateCategory, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories, type CategoryCount } from '@/lib/reports/category-consolidation';
import { Badge, BrandMatchCard } from '@/components/brand-matches/BrandMatchCard';
import {
  badgeFor,
  recencyLineCompact,
  resolveAggregateProof,
  resolveCreatorProfileInfo,
  resolveGreetingName,
  type AggregateProof,
} from './_data';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's page.
export const dynamic = 'force-dynamic';

const READ_TIMEOUT_MS = 15_000;

// Canonical LMG brand accents (app/globals.css's @theme) — full-strength,
// referenced by CSS variable rather than inline hex so this page can't drift
// from the source of truth again. Reserved for identity-carrying elements
// (CTA, logo, badges, active-state markers) per the founder's correction —
// backgrounds/surfaces stay neutral, deliberately not tokenized here.
const YELLOW = 'var(--color-lmg-yellow)'; // #FFD700
const PINK = 'var(--color-lmg-pink)'; // #FF4D94
const BLUE = 'var(--color-lmg-blue)'; // #3AAFF4
const GREY = 'var(--color-lmg-grey)'; // #3A3A3A

function signupHref(handle: string): string {
  return `/auth/signup?handle=${encodeURIComponent(handle)}&role=creator`;
}

/**
 * A minimal legitimacy line, not a site footer — this route deliberately
 * opts out of the shared SiteShell chrome (see components/SiteShell.tsx)
 * since it's a cold-DM conversion landing page and the site nav's exit
 * routes compete with its one job. Privacy/Terms are the one exception: a
 * standard legal footer reads as legitimate, not as a competing action.
 */
function LegalFooter() {
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: '#9C9A91' }}>
      <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Privacy
      </Link>
      {' · '}
      <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Terms
      </Link>
    </div>
  );
}

function TeaserCard({ children }: { children: React.ReactNode }) {
  // <main>, not <div>: this route opts out of SiteShell entirely (see
  // components/SiteShell.tsx), which is where the page's <main> landmark
  // used to come from — without one here, the page loses that accessibility
  // landmark entirely.
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'center', padding: '56px 20px' }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: '#FDFDFB', border: '1px solid #E8E6DF', borderRadius: 24,
            boxShadow: '0 18px 48px rgba(20,18,12,0.12), 0 4px 12px rgba(20,18,12,0.06)',
            padding: '36px 36px 32px', display: 'flex', flexDirection: 'column', gap: 24,
          }}
        >
          {children}
        </div>
        <LegalFooter />
      </div>
    </main>
  );
}

function TopBar({ handle }: { handle: string }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: GREY }}>
        Influence<span style={{ color: YELLOW }}>IT</span>
      </span>
      <span
        style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          borderRadius: 999, background: '#F4F3EF', border: '1px solid #E8E6DF', fontSize: 12, fontWeight: 600, color: '#6D6B65',
        }}
      >
        Prepared for @{handle}
      </span>
    </header>
  );
}

function Headline({ greetingName, totalMatchCount, creatorFollowers }: { greetingName: string | null; totalMatchCount: number; creatorFollowers: number | null }) {
  const brandsWord = totalMatchCount === 1 ? 'brand' : 'brands';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em', color: GREY }}>
        {greetingName ? `${greetingName} — ` : ''}
        <span style={{ color: PINK }}>
          {totalMatchCount} {brandsWord}
        </span>{' '}
        we&apos;ve detected hiring creators your size.
      </h1>
      {creatorFollowers != null && (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#6D6B65' }}>
          Real hires we detected around {formatCount(creatorFollowers)} followers. Your strongest match, in full:
        </p>
      )}
    </div>
  );
}

/**
 * Read-only brand-category breakdown (design 2a) — NOT the tappable dashboard
 * filter (2b), which is out of scope until the dashboard itself exists. Shows
 * the *brand's* category, never a creator-niche lookup: the copy is always
 * "N {category} brands", identical for a creator with no assigned niche.
 */
function CategoryPills({ categories, handle }: { categories: CategoryCount[]; handle: string }) {
  if (categories.length === 0) return null;
  const shown = categories.slice(0, 4);
  const moreCount = categories.length - shown.length;

  const [first, second] = shown;
  const incentiveText = second
    ? `Claim your profile to filter by category — see just the ${first.name} ones, or just ${second.name}.`
    : `Claim your profile to filter by category — see just the ${first.name} ones.`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {shown.map((c) => (
          <span
            key={c.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
              background: '#fff', border: '1px solid #CFCDC4', fontSize: 13, fontWeight: 600, color: GREY, whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ fontWeight: 800, color: PINK }}>{c.count}</strong> {c.name}
          </span>
        ))}
        {moreCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#6D6B65', whiteSpace: 'nowrap' }}>
            + {moreCount} more categor{moreCount === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>
      <Link href={signupHref(handle)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#6D6B65', textDecoration: 'none' }}>
        <Lock size={12} aria-hidden="true" />
        {incentiveText}
      </Link>
    </div>
  );
}

function BadgeLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4, fontSize: 12, lineHeight: 1.5, color: '#6D6B65' }}>
      <span>
        <strong style={{ fontWeight: 700, color: GREY }}>Program</strong> — hires multiple creators your size, ongoing
      </span>
      <span>
        <strong style={{ fontWeight: 700, color: GREY }}>Repeat hirer</strong> — works with creators repeatedly, often ambassador-style
      </span>
      <span>
        <strong style={{ fontWeight: 700, color: GREY }}>Sighting</strong> — spotted hiring your size at least once
      </span>
    </div>
  );
}

// Cycled per row position through the full canonical palette — not tied to
// real per-brand identity (we don't have that data for a blurred row), just
// a decorative echo of the mock's row-to-row color variety, at full strength.
const BLURRED_AVATAR_PALETTE = [
  { bg: YELLOW, fg: GREY },
  { bg: BLUE, fg: '#FFFFFF' },
  { bg: PINK, fg: '#FFFFFF' },
];

function BlurredRow({ match, index, faded }: { match: BlurredMatch; index: number; faded: boolean }) {
  const badge = badgeFor(match.isProgram, match.isRepeatHirer);
  const palette = BLURRED_AVATAR_PALETTE[index % BLURRED_AVATAR_PALETTE.length];
  const shadow = index === 0 ? '0 2px 6px rgba(20,18,12,0.06), 0 1px 2px rgba(20,18,12,0.04)' : index === 1 ? '0 1px 2px rgba(20,18,12,0.04)' : 'none';

  return (
    <article
      style={{
        position: 'relative', background: '#FFFFFF', border: '1px solid #E8E6DF', borderRadius: 16,
        boxShadow: faded ? 'none' : shadow, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden',
        opacity: faded ? 0.55 : 1,
        maskImage: faded ? 'linear-gradient(180deg, #000 0%, transparent 92%)' : undefined,
        WebkitMaskImage: faded ? 'linear-gradient(180deg, #000 0%, transparent 92%)' : undefined,
      }}
    >
      {/* No real brand name/initial ever reaches this row (BlurredMatch never carries canonicalName) —
          this blurs a static placeholder, not withheld real data, to match the mock's visual treatment honestly. */}
      <div
        style={{
          width: 40, height: 40, borderRadius: 12, background: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, color: palette.fg, filter: 'blur(7px)', userSelect: 'none', flexShrink: 0,
        }}
        aria-hidden="true"
      >
        •
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GREY, filter: 'blur(7px)', userSelect: 'none' }} aria-hidden="true">
          Hidden brand
        </div>
        <div style={{ fontSize: 12, color: '#6D6B65' }}>
          {consolidateCategory(match.category)} · {match.distinctCreators} creator{match.distinctCreators === 1 ? '' : 's'} detected · {recencyLineCompact(match.recencyBucket)}
        </div>
      </div>
      <Badge kind={badge} />
    </article>
  );
}

function MoreBrandsSection({ teaserPreview, totalMatchCount }: { teaserPreview: BlurredMatch[]; totalMatchCount: number }) {
  if (teaserPreview.length === 0) return null;
  const moreCount = totalMatchCount - 1;
  // Fade only the last visible row, and only when there are even more matches
  // beyond what's shown (mirrors the design: Maya's 11-remaining/3-shown row
  // fades to hint at more; Priya's 2-remaining/2-shown case shows nothing faded
  // since the preview already IS the whole remainder).
  const hasMoreBeyondPreview = moreCount > teaserPreview.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: GREY }}>
        + {moreCount} more brand{moreCount === 1 ? '' : 's'} we&apos;ve detected hiring creators your size
      </span>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {teaserPreview.map((m, i) => (
          <BlurredRow key={i} match={m} index={i} faded={hasMoreBeyondPreview && i === teaserPreview.length - 1} />
        ))}
      </div>
    </div>
  );
}

function ClaimCta({ handle, totalMatchCount, strongestMatchName }: { handle: string; totalMatchCount: number; strongestMatchName: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 4 }}>
      <Link
        href={signupHref(handle)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, padding: '0 28px',
          borderRadius: 999, border: 'none', background: YELLOW, color: GREY, fontSize: 15, fontWeight: 800,
          textDecoration: 'none', boxShadow: '0 8px 24px rgba(20,18,12,0.08)',
        }}
      >
        Claim your profile to see all {totalMatchCount}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#9C9A91', textAlign: 'center' }}>
        Free for creators. Every count above is a real, detected hirer — {strongestMatchName} is 1 of {totalMatchCount}.
      </p>
    </div>
  );
}

/**
 * Deliberately takes only the narrow fields it needs — never the full
 * CreatorBrandMatches object. Next's RSC flight payload serializes whatever
 * gets passed as a prop between component calls into the raw HTML response,
 * regardless of whether the JSX actually renders it — passing the whole
 * `result` (including its un-blurred, all-N-entries `matches` array) here
 * would leak every match's canonicalName/p25/p75 into the page source, even
 * though only strongestMatch and the already-blurred teaserPreview are ever
 * meant to reach the browser. Verified via the real HTML response during the
 * rendered checkpoint — this was caught as a live bug, not a hypothetical.
 */
function TeaserPage({
  handle,
  greetingName,
  strongestMatch,
  totalMatchCount,
  teaserPreview,
  creatorFollowers,
  categoryBreakdown,
}: {
  handle: string;
  greetingName: string | null;
  strongestMatch: MatchedBrand;
  totalMatchCount: number;
  teaserPreview: BlurredMatch[];
  creatorFollowers: number | null;
  categoryBreakdown: CategoryCount[];
}) {
  return (
    <TeaserCard>
      <TopBar handle={handle} />
      <Headline greetingName={greetingName} totalMatchCount={totalMatchCount} creatorFollowers={creatorFollowers} />
      <CategoryPills categories={categoryBreakdown} handle={handle} />
      <BrandMatchCard
        match={strongestMatch}
        creatorFollowers={creatorFollowers}
        actions={[
          { label: 'Draft outreach', href: signupHref(handle), icon: Pencil },
          { label: 'Calculate my rate', href: signupHref(handle), icon: Calculator },
        ]}
      />
      <BadgeLegend />
      <MoreBrandsSection teaserPreview={teaserPreview} totalMatchCount={totalMatchCount} />
      <ClaimCta handle={handle} totalMatchCount={totalMatchCount} strongestMatchName={strongestMatch.canonicalName} />
    </TeaserCard>
  );
}

function ZeroMatchState({
  handle,
  greetingName,
  creatorFollowers,
  proof,
}: {
  handle: string;
  greetingName: string | null;
  creatorFollowers: number | null;
  proof: AggregateProof | null;
}) {
  return (
    <TeaserCard>
      <TopBar handle={handle} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em', color: GREY }}>
          {greetingName ? `${greetingName}, ` : ''}we haven&apos;t detected a brand match for you yet.
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#6D6B65' }}>
          {creatorFollowers != null
            ? `We looked at real hires around ${formatCount(creatorFollowers)} followers and came up empty — that can change as we scan more brands and creators.`
            : "We came up empty this time — that can change as we scan more brands and creators."}
        </p>
      </div>

      {proof && (
        <div style={{ display: 'flex', gap: 24, padding: '16px 18px', borderRadius: 12, background: '#FAFAF8', border: '1px solid #E8E6DF' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: GREY }}>{formatCount(proof.creators)}</div>
            <div style={{ fontSize: 12, color: '#6D6B65' }}>creators indexed</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: GREY }}>{formatCount(proof.brandDeals)}</div>
            <div style={{ fontSize: 12, color: '#6D6B65' }}>real brand deals detected</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <Link
          href={signupHref(handle)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, padding: '0 28px',
            borderRadius: 999, border: 'none', background: YELLOW, color: GREY, fontSize: 15, fontWeight: 800, textDecoration: 'none',
          }}
        >
          Claim your profile anyway
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#9C9A91', textAlign: 'center' }}>
          Free for creators. We rescan regularly — claiming means you&apos;ll see new matches the moment we detect them.
        </p>
      </div>
    </TeaserCard>
  );
}

function RetryState({ handle }: { handle: string }) {
  return (
    <TeaserCard>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <RefreshCw size={40} color="#CFCDC4" style={{ margin: '0 auto 16px' }} aria-hidden="true" />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: GREY, margin: '0 0 8px 0' }}>This is taking longer than expected</h1>
        <p style={{ fontSize: 14, color: '#6D6B65', margin: '0 0 20px 0' }}>
          We couldn&apos;t load @{handle}&apos;s matches in time. This is usually temporary.
        </p>
        <Link
          href={`/claim/${encodeURIComponent(handle)}`}
          style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: 8, backgroundColor: YELLOW, color: GREY, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          Try again
        </Link>
      </div>
    </TeaserCard>
  );
}

export default async function ClaimHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = createSupabaseAdminClient();

  let result: CreatorBrandMatches | null;
  try {
    result = await withTimeout(getCreatorBrandMatches(supabase, handle), READ_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof TimeoutError) return <RetryState handle={handle} />;
    throw err;
  }

  if (!result) notFound();

  const profileInfo = await resolveCreatorProfileInfo(supabase, handle).catch(() => ({ displayName: null, detectedNiche: null }));
  const greetingName = resolveGreetingName(profileInfo.displayName, handle);

  if (result.totalMatchCount === 0 || !result.strongestMatch) {
    const proof = await resolveAggregateProof(supabase).catch(() => null);
    return <ZeroMatchState handle={handle} greetingName={greetingName} creatorFollowers={result.creatorFollowers} proof={proof} />;
  }

  // Computed here, from the full result.matches[], and never passed further
  // than this narrow {name,count}[] summary — same discipline as
  // strongestMatch/teaserPreview below: the full match list itself never
  // becomes a prop anywhere (see TeaserPage's docstring for why).
  const categoryBreakdown = summarizeCategories(result.matches);
  // Lead with the creator's own detected niche when it maps to a bucket they
  // actually have matches in; otherwise unchanged (top-by-count).
  const leadBucket = nicheLeadBucket(profileInfo.detectedNiche);
  const orderedCategoryBreakdown = orderCategoriesForDisplay(categoryBreakdown, leadBucket);

  return (
    <TeaserPage
      handle={handle}
      greetingName={greetingName}
      strongestMatch={result.strongestMatch}
      totalMatchCount={result.totalMatchCount}
      teaserPreview={result.teaserPreview}
      creatorFollowers={result.creatorFollowers}
      categoryBreakdown={orderedCategoryBreakdown}
    />
  );
}
