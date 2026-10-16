import 'server-only';
import { getPublicStats } from '@/app/_queries';
import type { AggregateProof } from './_data';

// Kept out of _data.ts on purpose: client components (admin/targeting,
// BrandMatchCard via signup and Brands Hiring) import helpers from _data.ts,
// and _queries.ts brings in the service-role client, which is server-only.

/**
 * Platform-wide reassurance numbers for the zero-match state — "we haven't
 * detected a match for YOU yet, but here's proof the platform has real
 * activity." Read from the homepage snapshot (migration 0031) through the
 * homepage's own getPublicStats(), so the teaser and the homepage can never
 * disagree. It used to call public_stats() directly, which read all of
 * creator_posts on every zero-match view of this force-dynamic page.
 *
 * Throws when the snapshot cannot be read; the teaser catches that and omits
 * the block rather than showing a number it does not have.
 */
export async function resolveAggregateProof(): Promise<AggregateProof> {
  const stats = await getPublicStats();
  return { creators: stats.creators, brandDeals: stats.brandDeals };
}
