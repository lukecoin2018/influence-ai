import type { PipelineClient, PipelineOptions } from '../pipeline/types';
import { noopProgress } from '../pipeline/types';
import { paginate } from '../pipeline/paginate';

/**
 * Loads every creator with its social profile and any brand_aliases row that
 * matches its handle — the raw material for heuristics.ts and classify.ts.
 *
 * The summary is social_profiles.ai_summary, not v_creator_summary's
 * per-platform column: they were identical on 8,716 of 8,716 profiles
 * (measured 2026-10-04), and reading the table directly keeps an opaque view
 * out of the path. Creators with no profile (11 on 2026-10-04) are kept, with
 * `profile: null`, so they still get a verdict.
 */
const PAGE_SIZE = 1000;
/** PostgREST `in.()` lists go in the URL; same chunk size the recon used. */
const IN_CHUNK = 200;

/** brand_aliases entity types that count as an alias match. */
const ALIAS_MATCH_TYPES = ['brand', 'media', 'venue'];

export type CreatorProfile = {
  platform: string;
  handle: string;
  followerCount: number | null;
  bio: string | null;
  /** Instagram externalUrl (or the profile URL when there is none). Empty on TikTok. */
  website: string | null;
  /** TikTok link-in-bio, from enrichment. Empty on Instagram. */
  bioLink: string | null;
  summary: string | null;
  /** platform_data.is_business_account — Instagram only, null elsewhere. */
  isBusinessAccount: boolean | null;
  /** platform_data.category_name, raw — may be "None" or comma-joined ("None,Digital creator"). */
  category: string | null;
};

export type AliasMatch = {
  alias: string;
  entityType: string;
  canonicalName: string | null;
  verified: boolean;
};

export type CreatorRecord = {
  creatorId: string;
  displayName: string | null;
  profile: CreatorProfile | null;
  alias: AliasMatch | null;
};

export type LoadOptions = PipelineOptions & {
  /** Load only these creator ids instead of every creator. */
  ids?: readonly string[] | null;
};

type CreatorRow = { id: string; display_name: string | null };

type ProfileRow = {
  id: string;
  creator_id: string;
  platform: string;
  handle: string | null;
  follower_count: number | string | null;
  bio: string | null;
  website: string | null;
  bio_link: string | null;
  ai_summary: string | null;
  platform_data: { is_business_account?: unknown; category_name?: unknown } | null;
};

type AliasRow = { alias: string; entity_type: string; canonical_name: string | null; verified: boolean };

const PROFILE_SELECT = 'id, creator_id, platform, handle, follower_count, bio, website, bio_link, ai_summary, platform_data';

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toProfile(row: ProfileRow): CreatorProfile | null {
  if (!row.handle) return null;
  const data = row.platform_data ?? {};
  const followers = row.follower_count == null ? null : Number(row.follower_count);
  return {
    platform: row.platform,
    handle: row.handle,
    followerCount: followers != null && Number.isFinite(followers) ? followers : null,
    bio: row.bio,
    website: row.website,
    bioLink: row.bio_link,
    summary: row.ai_summary,
    isBusinessAccount: row.platform === 'instagram' && typeof data.is_business_account === 'boolean' ? data.is_business_account : null,
    category: typeof data.category_name === 'string' ? data.category_name : null,
  };
}

async function loadCreators(client: PipelineClient, ids: readonly string[] | null): Promise<CreatorRow[]> {
  const rows: CreatorRow[] = [];
  if (ids) {
    for (const part of chunk(ids, IN_CHUNK)) {
      const { data, error } = await client.from('creators').select('id, display_name').in('id', part);
      if (error) throw new Error(`Loading creators failed: ${error.message}`);
      rows.push(...((data ?? []) as CreatorRow[]));
    }
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  }
  await paginate<CreatorRow>(
    () => client.from('creators').select('id, display_name'),
    { key: 'id', pageSize: PAGE_SIZE },
    (page) => {
      rows.push(...page);
    },
  );
  return rows;
}

async function loadProfiles(client: PipelineClient, ids: readonly string[] | null): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  if (ids) {
    for (const part of chunk(ids, IN_CHUNK)) {
      const { data, error } = await client.from('social_profiles').select(PROFILE_SELECT).in('creator_id', part);
      if (error) throw new Error(`Loading social_profiles failed: ${error.message}`);
      rows.push(...((data ?? []) as ProfileRow[]));
    }
    return rows;
  }
  await paginate<ProfileRow>(
    () => client.from('social_profiles').select(PROFILE_SELECT),
    { key: 'id', pageSize: PAGE_SIZE },
    (page) => {
      rows.push(...page);
    },
  );
  return rows;
}

async function loadAliases(client: PipelineClient, handles: readonly string[]): Promise<Map<string, AliasMatch>> {
  const byAlias = new Map<string, AliasMatch>();
  for (const part of chunk(handles, IN_CHUNK)) {
    const { data, error } = await client
      .from('brand_aliases')
      .select('alias, entity_type, canonical_name, verified')
      .in('alias', part)
      .in('entity_type', ALIAS_MATCH_TYPES);
    if (error) throw new Error(`Loading brand_aliases failed: ${error.message}`);
    for (const row of (data ?? []) as AliasRow[]) {
      byAlias.set(row.alias, {
        alias: row.alias,
        entityType: row.entity_type,
        canonicalName: row.canonical_name,
        verified: row.verified,
      });
    }
  }
  return byAlias;
}

export async function loadCreatorRecords(client: PipelineClient, options: LoadOptions = {}): Promise<CreatorRecord[]> {
  const onProgress = options.onProgress ?? noopProgress;
  const ids = options.ids && options.ids.length > 0 ? options.ids : null;

  onProgress(ids ? `Loading ${ids.length} creator(s) by id...` : 'Loading creators...');
  const creators = await loadCreators(client, ids);
  onProgress(`  ${creators.length} creators.`);

  onProgress('Loading social profiles...');
  const profileRows = await loadProfiles(client, ids);
  // Creators are single-platform by scrape source and none has two profiles
  // (0 on 2026-10-04). If that ever changes, the larger account is the one
  // the creator is known by, so keep the highest follower count.
  const profileByCreator = new Map<string, CreatorProfile>();
  for (const row of profileRows) {
    const profile = toProfile(row);
    if (!profile) continue;
    const existing = profileByCreator.get(row.creator_id);
    if (!existing || (profile.followerCount ?? -1) > (existing.followerCount ?? -1)) {
      profileByCreator.set(row.creator_id, profile);
    }
  }
  onProgress(`  ${profileByCreator.size} profiles.`);

  onProgress('Matching handles against brand_aliases (brand / media / venue)...');
  const handles = [...new Set([...profileByCreator.values()].map((p) => p.handle))];
  const aliases = await loadAliases(client, handles);
  onProgress(`  ${aliases.size} alias matches.`);

  return creators.map((creator) => {
    const profile = profileByCreator.get(creator.id) ?? null;
    return {
      creatorId: creator.id,
      displayName: creator.display_name,
      profile,
      alias: profile ? aliases.get(profile.handle) ?? null : null,
    };
  });
}
