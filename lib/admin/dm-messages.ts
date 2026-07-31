/**
 * en/es DM text for the admin Creator Targeting panel (app/admin/targeting).
 *
 * DIRECTION: admin -> creator. This is the founder's cold DM inviting a
 * scraped creator to their own /claim/[handle] teaser. It is NOT
 * lib/outreach/messages.ts, which is creator -> brand and lives in the
 * creator dashboard. The two read similarly and mean opposite things — the
 * same trap CLAUDE.md records for creator_outreach vs creator_brand_outreach.
 * Kept in lib/admin/ so the direction is structural, not a header you have to
 * remember to read.
 *
 * Structure follows lib/outreach/messages.ts: one interface both locales must
 * satisfy in a `Record<Locale, T>`, so a missing Spanish key is a compile
 * error rather than a silent English fallback; interpolation by FUNCTION, not
 * {{token}} substitution; and message ASSEMBLY (which lines, in what order)
 * lives OUTSIDE the locale table so the two locales cannot drift apart.
 *
 * ── WHY THE HEADLINE IS NOT WRITTEN OUT HERE ───────────────────────────────
 *
 * The DM's only job is to earn a tap on the link, and the page behind that
 * link opens with the same sentence. So the headline is built from the claim
 * teaser's OWN string table (getClaimStrings(locale).headline) rather than
 * copied into this file. Copying would have produced identical text today and
 * allowed it to drift the first time the page headline was edited — and a DM
 * that promises something slightly different from the page it opens is the
 * whole failure this feature exists to avoid.
 *
 * Reusing it also fixes the singular case for free: at one match the page says
 * "1 brand" / "1 marca" (brandWord(n)), so the DM now does too instead of
 * "1 brands".
 *
 * The follower line IS written out here, because it is the page's sub-line
 * with its trailing clause removed ("… Your strongest match, in full:" /
 * "… Tu mejor match, completo:") — that clause makes no sense in a DM. If the
 * page's `headline.sub` is ever reworded, reword these to match.
 *
 * Product rules this file is bound by:
 *  - Everything is "detected", never asserted. Both locales inherit that from
 *    the page's own wording.
 *  - No fabricated numbers. Every figure is passed in from the live row, and a
 *    figure we do not have removes its line rather than defaulting.
 *  - No greeting. A bare name followed by an em dash mirrors the page headline
 *    and sidesteps the gendered-greeting problem ("Bienvenido/a") that
 *    CLAUDE.md flags for neutral Spanish.
 */

import { getClaimStrings, type Locale } from '@/app/claim/[handle]/_strings';

/** A/B so response rate can be read per variant. B adds the follower line. */
export type DmVariant = 'A' | 'B';

interface DmStrings {
  /**
   * The page's `headline.sub` minus its trailing clause. Keep in sync with
   * app/claim/[handle]/_strings.ts if that sentence is ever reworded.
   */
  followerLine: (followersFormatted: string) => string;
}

const DM_STRINGS: Record<Locale, DmStrings> = {
  en: {
    followerLine: (followers) => `Real hires we detected around ${followers} followers.`,
  },
  es: {
    followerLine: (followers) => `Contrataciones reales que detectamos cerca de ${followers} seguidores.`,
  },
};

/**
 * Deterministic A/B split from the creator's id — A on even, B on odd.
 *
 * Deliberately NOT positional. The panel re-sorts the entire merged result set
 * on every batch (app/admin/targeting/page.tsx, the setResults sort) and the
 * view filters re-index it again, so a row's position is not stable across a
 * "Compute next 150" or a "Hide DMed" toggle. A position-derived variant would
 * therefore flip under the admin between reading the message and marking the
 * creator DMed, and the variant recorded in creator_outreach would no longer
 * be the variant that was actually pasted — which is exactly the number this
 * A/B exists to measure.
 *
 * Hashing the id instead makes the assignment survive re-ranking, filtering,
 * batch appends and a full page reload, at the cost of a split that is
 * approximately rather than exactly 50/50.
 */
export function variantForCreator(creatorId: string): DmVariant {
  let hash = 0;
  for (let i = 0; i < creatorId.length; i += 1) {
    hash = (hash * 31 + creatorId.charCodeAt(i)) | 0;
  }
  return (hash & 1) === 0 ? 'A' : 'B';
}

export type DmMessageInput = {
  locale: Locale;
  variant: DmVariant;
  /**
   * Already resolved by resolveGreetingName() from the claim page — never
   * derived here. null is a supported value, not a caller error: the message
   * then opens at the count with no name and no em dash, matching the page's
   * own nameless headline variant.
   */
  greetingName: string | null;
  /** row.totalMatchCount — the same figure the teaser headline prints. */
  matchCount: number;
  /**
   * Pre-formatted by formatCount() so the DM and the page render the follower
   * count identically ("167K", "1.2M"). An empty string means we have no
   * usable figure, and variant B then drops its follower line entirely rather
   * than defaulting one.
   */
  followersFormatted: string;
  /** Absolute claim URL, built from row.dmLink so body and link share a locale. */
  url: string;
};

/**
 * Assembly lives here rather than in the locale table: both locales build the
 * same message from the same parts in the same order, so the order belongs in
 * one place.
 */
export function buildDmMessage(input: DmMessageInput): string {
  const { locale, variant, greetingName, matchCount, followersFormatted, url } = input;
  const headline = getClaimStrings(locale).headline;

  const claim = `${matchCount} ${headline.brandWord(matchCount)} ${headline.suffix}`;
  const lines = [greetingName ? `${greetingName} — ${claim}` : claim];

  // formatCount() returns '—' when it has nothing; treat that as "no figure"
  // and drop the line rather than printing a dash at a creator.
  if (variant === 'B' && followersFormatted && followersFormatted !== '—') {
    lines.push(DM_STRINGS[locale].followerLine(followersFormatted));
  }

  lines.push(url);
  return lines.join('\n');
}
