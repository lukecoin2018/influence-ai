import type { PipelineClient } from './types';
import { paginate } from './paginate';

/**
 * Shared creator_posts.detected_brands aggregation, used by seed (to populate
 * creators_count) and classify (to give the AI prompt creator/post counts per
 * alias without persisting post counts in the table). Moved unchanged from
 * scripts/brand-aliases/_aggregate.mjs; the only difference is that the client
 * is passed in.
 */
const PROFILE_PAGE_SIZE = 1000;
const POST_PAGE_SIZE = 1000;

export type AliasStats = { posts: number; creatorIds: Set<string> };

type ProfileRow = { id: string; creator_id: string };
type PostRow = { id: string; social_profile_id: string; detected_brands: unknown };

export function normalizeAlias(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns Map<alias, { posts, creatorIds }>. Reads social_profiles and every
 * creator_posts row, and counts only posts by ACTIVE creators: the
 * creators!inner embed + status filter replicate social_profiles' RLS policy,
 * which the service-role client bypasses. A brand account hidden as
 * 'non_creator' (migration 0027) — often tagging its own brand — adds nothing
 * to an alias's creators_count.
 */
export async function aggregateDetectedBrands(client: PipelineClient): Promise<Map<string, AliasStats>> {
  const creatorIdByProfileId = new Map<string, string>();
  await paginate<ProfileRow>(
    () => client.from('social_profiles').select('id, creator_id, creators!inner(status)').eq('creators.status', 'active'),
    { key: 'id', pageSize: PROFILE_PAGE_SIZE },
    (rows) => {
      for (const row of rows) creatorIdByProfileId.set(row.id, row.creator_id);
    },
  );

  const stats = new Map<string, AliasStats>();
  await paginate<PostRow>(
    () => client.from('creator_posts').select('id, social_profile_id, detected_brands'),
    { key: 'id', pageSize: POST_PAGE_SIZE },
    (rows) => {
      for (const row of rows) {
        const brands = Array.isArray(row.detected_brands) ? row.detected_brands : [];
        if (brands.length === 0) continue;
        // Not in the map = the post's creator is not active. Skipped: falling
        // back to the profile id as a stand-in creator id, as this used to,
        // would count exactly those posts under a made-up creator.
        const creatorId = creatorIdByProfileId.get(row.social_profile_id);
        if (!creatorId) continue;
        const seenInThisPost = new Set<string>();
        for (const raw of brands) {
          const alias = normalizeAlias(raw);
          if (!alias || seenInThisPost.has(alias)) continue;
          seenInThisPost.add(alias);
          let entry = stats.get(alias);
          if (!entry) {
            entry = { posts: 0, creatorIds: new Set() };
            stats.set(alias, entry);
          }
          entry.posts++;
          entry.creatorIds.add(creatorId);
        }
      }
    },
  );

  return stats;
}
