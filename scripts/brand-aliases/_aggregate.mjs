// Shared creator_posts.detected_brands aggregation, used by both seed.mjs
// (to populate creators_count) and classify.mjs (to give the AI prompt
// creator/post counts per alias without persisting post counts in the table).
import { supabase, paginate } from './_supabase.mjs';

const PROFILE_PAGE_SIZE = 1000;
const POST_PAGE_SIZE = 1000;

function normalizeAlias(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Returns Map<alias, { posts: number, creatorIds: Set<string> }>. */
export async function aggregateDetectedBrands() {
  const creatorIdByProfileId = new Map();
  await paginate(
    () => supabase.from('social_profiles').select('id, creator_id'),
    PROFILE_PAGE_SIZE,
    (rows) => {
      for (const row of rows) creatorIdByProfileId.set(row.id, row.creator_id);
    }
  );

  const stats = new Map();
  await paginate(
    () => supabase.from('creator_posts').select('social_profile_id, detected_brands'),
    POST_PAGE_SIZE,
    (rows) => {
      for (const row of rows) {
        const brands = Array.isArray(row.detected_brands) ? row.detected_brands : [];
        if (brands.length === 0) continue;
        const creatorId = creatorIdByProfileId.get(row.social_profile_id) ?? row.social_profile_id;
        const seenInThisPost = new Set();
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
    }
  );

  return stats;
}
