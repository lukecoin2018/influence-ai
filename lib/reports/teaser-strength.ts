/**
 * Teaser-strength ranking for the admin creator-targeting panel
 * (app/admin/targeting/page.tsx). Ranks creators by how compelling their
 * /claim/[handle] teaser would be, reusing getCreatorBrandMatches's own
 * output — no new matching logic here.
 *
 * Multi-key sort (confirmed with the founder in Phase 1), mirroring the
 * read layer's own compareMatches philosophy rather than an arbitrary
 * weighted score:
 *   1. programCount desc     — creators with real ongoing programs (>=3
 *      distinct-creator brands) are better DM targets than a big-but-thin
 *      total match count.
 *   2. totalMatchCount desc  — overall breadth, the literal headline number
 *      the teaser leads with.
 *   3. strongestMatch recency bucket asc (active < window < neutral) —
 *      freshness of the one match the teaser hero renders.
 *   4. hasRegionMatch desc   — tiebreak only, never lets a weaker-but-local
 *      creator's teaser outrank a genuinely stronger one.
 *   5. hasDetectedNiche desc — final tiebreak; affects teaser copy quality
 *      (category pills), not compellingness, so it's last.
 */
import type { CreatorBrandMatches } from './creator-brand-matches';
import { recencyBucketRank } from './recency-bucket';

export type TeaserStrengthInput = {
  totalMatchCount: number;
  programCount: number;
  /** recencyBucketRank of strongestMatch, or Infinity when there's no match to anchor a recency to. */
  strongestRecencyRank: number;
  hasRegionMatch: boolean;
  hasDetectedNiche: boolean;
};

export function computeTeaserStrengthInput(matches: CreatorBrandMatches, detectedNiche: string | null): TeaserStrengthInput {
  return {
    totalMatchCount: matches.totalMatchCount,
    programCount: matches.matches.filter((m) => m.isProgram).length,
    strongestRecencyRank: matches.strongestMatch ? recencyBucketRank(matches.strongestMatch.recencyBucket) : Infinity,
    hasRegionMatch: matches.strongestMatch?.regionMatch != null,
    hasDetectedNiche: detectedNiche != null,
  };
}

export function compareTeaserStrength(a: TeaserStrengthInput, b: TeaserStrengthInput): number {
  if (a.programCount !== b.programCount) return b.programCount - a.programCount;
  if (a.totalMatchCount !== b.totalMatchCount) return b.totalMatchCount - a.totalMatchCount;
  if (a.strongestRecencyRank !== b.strongestRecencyRank) return a.strongestRecencyRank - b.strongestRecencyRank;

  const aRegion = a.hasRegionMatch ? 1 : 0;
  const bRegion = b.hasRegionMatch ? 1 : 0;
  if (aRegion !== bRegion) return bRegion - aRegion;

  const aNiche = a.hasDetectedNiche ? 1 : 0;
  const bNiche = b.hasDetectedNiche ? 1 : 0;
  return bNiche - aNiche;
}
