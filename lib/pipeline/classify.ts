import type { PipelineClient, PipelineOptions } from './types';
import { noopProgress } from './types';
import { paginate } from './paginate';
import { normalizeAlias } from './aggregate';

/**
 * Step 3 of the brand-aliases pipeline — AI batch classification for aliases
 * the pre-pass couldn't resolve. Only classifies aliases with classified_at IS
 * NULL AND creators_count >= minCount (default 2 — single-creator aliases are
 * almost always mis-detections or one-offs not worth an AI call by default).
 * minCount 1 is the singleton sweep, which also scores brand/venue entities
 * (recognizability, im_intensity) as scraping targets.
 *
 * Batches of ~50, each alias annotated with its creator/post counts. Strict
 * JSON out: [{alias, canonical_name, entity_type, category, region,
 * recognizability, im_intensity, notes}, ...]. Uses the same raw-fetch +
 * regex-fallback JSON parsing pattern as app/api/match/route.ts.
 *
 * Idempotent: only ever selects classified_at IS NULL rows, so already-
 * classified aliases are skipped on rerun regardless of how many times this
 * is run.
 *
 * This pipeline never writes `verified` — that flag is human-only and gates
 * visitor-facing data; the columns here are internal discovery signal only.
 *
 * Logic moved from scripts/brand-aliases/classify.mjs with four changes:
 *  1. Eligible rows are COUNTED first (one HEAD request). Zero eligible returns
 *     immediately.
 *  0. There is no creator_posts aggregation any more. The prompt needs a
 *     sponsored-post count per alias, and only for the aliases in the batch,
 *     so each batch runs one `detected_brands && aliases` query against the
 *     GIN index (loadBatchPostCounts) instead of paging the whole table. The
 *     full scan took about a minute and, on 2026-10-03, hit PostgREST's
 *     8-second statement timeout in production before any Anthropic call.
 *  2. The prompt's opening paragraph no longer hardcodes "exactly one detected
 *     creator"; it describes the actual minCount of the run.
 *  3. The raw model output is printed only with `verbose: true` (the CLI sets
 *     it); every batch gets a one-line summary regardless.
 */
const BATCH_SIZE = 50;
const MODEL = 'claude-sonnet-4-5-20250929';
const VALID_ENTITY_TYPES = new Set(['brand', 'creator', 'celebrity', 'media', 'venue', 'fragment', 'unknown']);
const DELAY_BETWEEN_BATCHES_MS = 500;

export type EntityType = 'brand' | 'creator' | 'celebrity' | 'media' | 'venue' | 'fragment' | 'unknown';

export type ClassifyOptions = PipelineOptions & {
  /** Anthropic API key. Passed in rather than read from the environment, like the client. */
  anthropicApiKey: string;
  /** Minimum creators_count to be eligible. Default 2. */
  minCount?: number;
  /** Process at most this many batches (~50 aliases each), then stop. Default: every eligible batch. The CLI's --limit. */
  limit?: number | null;
  /**
   * Process at most this many aliases, applied before batching, so a cap of 5
   * is one batch of 5 rather than one batch of 50. The admin page's cap; it
   * combines with `limit` (whichever is smaller wins).
   */
  maxAliases?: number | null;
  /** Called after each batch with what it did, for callers that want one line per batch and nothing else. */
  onBatch?: (batch: BatchOutcome) => void;
  /** Write the verdict to classification_preview instead of the live columns, and don't set classified_at. */
  preview?: boolean;
  /**
   * Swap the normal eligible-alias query for a stratified ~80-row sample
   * (regional-suffix / handle-shaped / clean-word / random control) drawn from
   * the same eligible pool. Requires `preview`; refuses otherwise.
   */
  testSample?: boolean;
  /** Also emit the full raw model output for every batch. The CLI passes true. */
  verbose?: boolean;
};

export type BatchOutcome = {
  /** 1-based batch number and the number of batches this run will process. */
  index: number;
  total: number;
  /** Aliases sent in this batch. */
  aliases: number;
  /** Rows written (or previewed) from this batch; 0 when the batch failed. */
  classified: number;
  /** Set when the API call or the upsert failed; the batch's rows stay unclassified. */
  error?: string;
};

export type ClassifyResult = {
  minCount: number;
  preview: boolean;
  /** Aliases eligible for this run (after the testSample swap, if any). */
  eligible: number;
  /** Batches actually processed (after --limit). */
  batches: number;
  /** Batches the eligible set would have needed without --limit. */
  batchesTotal: number;
  /** Rows written (live or preview). */
  classified: number;
  /** Batches that failed on the API call or the upsert; their rows stay unclassified for the next run. */
  failedBatches: number;
  /** Rows the model omitted from a batch; also left for the next run. */
  omitted: number;
  /** Written rows per entity_type after the invariant guard. */
  byEntityType: Record<EntityType, number>;
};

type EligibleRow = { alias: string; creators_count: number };
type BatchItem = EligibleRow & { posts: number };

type ModelVerdict = {
  alias?: unknown;
  canonical_name?: unknown;
  entity_type?: unknown;
  category?: unknown;
  region?: unknown;
  recognizability?: unknown;
  im_intensity?: unknown;
  notes?: unknown;
};

type LiveUpdate = {
  alias: string;
  canonical_name: string | null;
  entity_type: EntityType;
  category: string | null;
  region: string | null;
  recognizability: number | null;
  im_intensity: number | null;
  classification_notes: string | null;
  classified_at: string;
};

function emptyBreakdown(): Record<EntityType, number> {
  return { brand: 0, creator: 0, celebrity: 0, media: 0, venue: 0, fragment: 0, unknown: 0 };
}

function eligibleQuery(client: PipelineClient, minCount: number) {
  return client
    .from('brand_aliases')
    .select('alias, creators_count')
    .is('classified_at', null)
    .gte('creators_count', minCount);
}

async function countEligible(client: PipelineClient, minCount: number): Promise<number> {
  const { count, error } = await client
    .from('brand_aliases')
    .select('*', { count: 'exact', head: true })
    .is('classified_at', null)
    .gte('creators_count', minCount);
  if (error) throw new Error(`Counting eligible aliases failed: ${error.message}`);
  return count ?? 0;
}

/**
 * Loads every eligible alias, highest creators_count first, with alias as a
 * deterministic tiebreak. Paged by alias (keyset) and sorted in memory: the
 * eligible set is the unclassified slice of brand_aliases, small enough to
 * hold, and a creators_count-ordered cursor would need a compound key.
 */
async function loadEligibleAliases(client: PipelineClient, minCount: number): Promise<EligibleRow[]> {
  const aliases: EligibleRow[] = [];
  await paginate<EligibleRow>(
    () => eligibleQuery(client, minCount),
    { key: 'alias', pageSize: 1000 },
    (rows) => {
      aliases.push(...rows);
    },
  );
  return aliases.sort((a, b) => b.creators_count - a.creators_count || a.alias.localeCompare(b.alias));
}

/**
 * A Postgres text[] literal, every element double-quoted with `\` and `"`
 * escaped, for PostgREST's `ov.{...}` filter. supabase-js's overlaps(column,
 * string[]) joins values with commas unquoted, so an alias containing a comma,
 * quote, brace or space would corrupt the literal; this is the safe form.
 */
export function pgTextArrayLiteral(values: readonly string[]): string {
  return `{${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
}

type ContextPostRow = { id: string; detected_brands: unknown };

/**
 * Sponsored-post counts for ONE batch of aliases, from the posts that mention
 * any of them (detected_brands && aliases — a GIN index scan, migration 0005)
 * instead of the full creator_posts aggregation seed uses. Measured
 * 2026-10-03: ~0.4 s for 50 aliases, against ~1 minute and one statement
 * timeout for the full scan. A post is counted once per alias it names, as
 * the aggregation did. creators_count comes from the alias row, so this is
 * the only context the prompt still needs.
 */
export async function loadBatchPostCounts(client: PipelineClient, aliases: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(aliases.map((alias) => [alias, 0]));
  if (aliases.length === 0) return counts;
  const wanted = new Set(aliases);
  await paginate<ContextPostRow>(
    () => client.from('creator_posts').select('id, detected_brands').overlaps('detected_brands', pgTextArrayLiteral(aliases)),
    { key: 'id', pageSize: 1000 },
    (rows) => {
      for (const row of rows) {
        const brands = Array.isArray(row.detected_brands) ? row.detected_brands : [];
        const seenInThisPost = new Set<string>();
        for (const raw of brands) {
          const alias = normalizeAlias(raw);
          if (!alias || !wanted.has(alias) || seenInThisPost.has(alias)) continue;
          seenInThisPost.add(alias);
          counts.set(alias, (counts.get(alias) ?? 0) + 1);
        }
      }
    },
  );
  return counts;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Loose, heuristic bucket shapes mirroring the SQL in the handoff doc —
// they only need to guarantee a spread of shapes for the model to be
// tested against, not classify anything themselves.
const REGIONAL_SUFFIX_RE = /(brasil|_es|_uk|usa|_us|_de|_fr|_it)$/i;
const HANDLE_SHAPED_RE = /_/;
const CLEAN_WORD_NOISE_RE = /[_0-9]/;

// Same eligible pool as a normal run — only the row selection differs, so
// this exercises the exact selection/prompt/writeback path a real run does.
async function loadStratifiedTestSample(
  client: PipelineClient,
  minCount: number,
  onProgress: (message: string) => void,
): Promise<EligibleRow[]> {
  const pool = await loadEligibleAliases(client, minCount);

  const regional = pool.filter((row) => REGIONAL_SUFFIX_RE.test(row.alias)).slice(0, 15);
  const handleShaped = pool
    .filter((row) => HANDLE_SHAPED_RE.test(row.alias) && !REGIONAL_SUFFIX_RE.test(row.alias))
    .slice(0, 20);
  const cleanWord = pool
    .filter((row) => !CLEAN_WORD_NOISE_RE.test(row.alias) && row.alias.length >= 4 && row.alias.length <= 12)
    .slice(0, 25);
  const random = shuffle(pool).slice(0, 20);

  onProgress(
    `  Stratified test sample: ${regional.length} regional-suffix, ${handleShaped.length} handle-shaped, ` +
      `${cleanWord.length} clean-word, ${random.length} random control (buckets may overlap, matching the reference SQL).`,
  );
  return [...regional, ...handleShaped, ...cleanWord, ...random];
}

/**
 * The one prompt change in this refactor: the old opening paragraph said every
 * alias "has exactly one detected creator so far", which was only true of the
 * singleton sweep (--min-count 1) and was sent verbatim on default runs too.
 * The rest of the prompt is byte-for-byte what classify.mjs sent.
 */
function describeCreatorCounts(minCount: number): string {
  if (minCount <= 1) {
    return `Every alias below has at least one detected creator so far, and most have exactly one. That creator
count carries NO signal about the entity's real-world importance — a globally famous brand and a random
typo look identical at count = 1. Judge each alias purely on your own world knowledge of what the string
refers to, NOT on the count.`;
  }
  return `Every alias below has at least ${minCount} distinct detected creators so far. That creator count is
a weak signal at best about the entity's real-world importance — a globally famous brand and a recurring
mis-detection can look alike at these counts. Judge each alias primarily on your own world knowledge of
what the string refers to, NOT on the count.`;
}

/**
 * Same correction for the creator bullet: "dominated by single-creator
 * aliases" is only true of the singleton sweep.
 */
function describeCreatorBullet(minCount: number): string {
  if (minCount <= 1) {
    return `- creator: an influencer/creator personal handle, not a brand. EXPECT MANY of these — this batch is
  dominated by single-creator aliases, and personal handles are common here (e.g. "aleaalvarezz",
  "katiedaisy", "gabriellaelio"). A handle that reads as a person's name/username is a creator.`;
  }
  return `- creator: an influencer/creator personal handle, not a brand. EXPECT MANY of these — personal handles
  are common in this data even when several creators tagged the same one (e.g. "aleaalvarezz",
  "katiedaisy", "gabriellaelio"). A handle that reads as a person's name/username is a creator.`;
}

function buildPrompt(batch: BatchItem[], minCount: number): string {
  const lines = batch
    .map((item) => `- "${item.alias}" — ${item.creators_count} distinct creators, ${item.posts} sponsored posts`)
    .join('\n');

  return `You are classifying strings that were detected as "brands" in influencer posts. Each string
was scraped from a caption or tag, and MANY are not brands at all — they are personal creator
handles, public figures, media properties, events/venues, or plain text noise. Your job is to
classify each one accurately and, for real brands and venues, score how worthwhile it is as a
target for finding MORE creators who post about it.

${describeCreatorCounts(minCount)}

## entity_type — exactly one of: brand, creator, celebrity, media, venue, fragment, unknown

- brand: an actual commercial brand, company, or product line (Prada, Gymshark, The Honest Company).
${describeCreatorBullet(minCount)}
- celebrity: a public figure being mentioned, not a brand they run.
- media: a publication, TV show, film, festival-as-media-property, or similar.
- venue: a real place, event, or venue that runs creator/influencer marketing but is not a product
  brand — hotels, resorts, racecourses, sporting events, attractions (e.g. "kentuckyderby",
  "goodwood_races", "thegleneagleshotel", "coworthpark").
- fragment: leftover text noise — partial words, generic phrases, keyboard-mash handles, or strings
  that don't resolve to any real entity (e.g. "theeee_chaossss_clubbbb").
- unknown: a plausible-looking name you genuinely cannot place. PREFER THIS over guessing. It is far
  better to leave a real-but-obscure alias as unknown than to invent a brand that doesn't exist.

The single most important rule: DO NOT HALLUCINATE BRANDS. If a string only *might* be a brand but
you have no actual knowledge of it, return unknown — never manufacture a plausible-sounding company.
But note the inverse trap too: some real, well-known brands have names that are ordinary words
("honest" → The Honest Company; "essence" → Essence Cosmetics). If you actually recognize the brand,
classify it as a brand even though the string looks generic — the "prefer unknown" rule is about
uncertainty, not about penalizing common-word names you DO recognize.

A trailing "_official", "_shop", "_store", or "_hq" suffix is weak evidence the string is a
brand or venue rather than a personal creator — lean brand-or-unknown over creator for these, and
make a real effort to resolve the underlying name before falling back to unknown. This is only a
nudge; if you still can't identify it, unknown is correct.

## canonical_name

Resolve to the CONSUMER-FACING brand a creator would actually tag — the recognizable name, at its
own level. Never substitute or append the corporate parent or holding company: "louisvuitton" →
"Louis Vuitton", never "LVMH"; "maybelline" → "Maybelline", never "L'Oréal".

Collapse LOCALE variants of the same brand into ONE canonical name, and put the locale in \`region\`:
"sheinbrasil" → canonical "Shein", region "BR"; "moulinex_es" → canonical "Moulinex", region "ES";
"whirlpoolusa" → canonical "Whirlpool", region "US". Only collapse when the suffix is clearly just a
country/locale. Do NOT merge genuinely distinct product lines or sister brands that operate
independently ("lorealparis" and "lorealpro" stay separate: "L'Oréal Paris" and "L'Oréal Pro").

canonical_name is null for creator, celebrity, media, fragment, and unknown.
For brand and venue, canonical_name MUST be a real, non-null name that you actually know —
NOT a value you produced by cleaning up the alias itself (do not just strip a suffix and title-case
the handle: "wdirara_us" → "WDirara" is NOT a valid canonical). If the only name you can give is one
derived from the alias string because you don't actually recognize the entity, then you don't know it
well enough to call it a brand — return entity_type "unknown" instead, with a null canonical_name.
This applies to VENUES too: if you can tell it's a restaurant, bar, or hotel but cannot identify the
SPECIFIC named place (e.g. "elparche_parrilla" — you know it's a grill but not WHICH one), that is
not a confident venue. Return entity_type "unknown" with null canonical, exactly as for an
unidentifiable brand. Only use "venue" when you can name the actual place.

## category

Pick the SINGLE closest label from this list — do not invent compound labels like
"Fashion & Accessories" or "Tech & Social Media":
Beauty, Fashion, Jewelry, Fitness & Wellness, Food, Spirits, Tech, Home Appliances, Consumer
Electronics, Automotive, Retail, Hospitality, Travel & Tourism, Pet Care, Wellness, Media &
Entertainment, Sportswear, Events. If none fit, use the closest single word (e.g. "Other").
category is null for creator, celebrity, media, fragment, and unknown.

## region

Two-letter locale code ONLY when the alias clearly encodes one (the collapse rule above). Otherwise null.

## Scores — recognizability and im_intensity (integers 1–5)

Score ONLY brand and venue entities. For creator, celebrity, media, fragment, and unknown, set BOTH
scores to null.

The scores describe the entity as a SCRAPING TARGET — "is it worth hunting for more creators who post
about this" — independent of the one creator already attached. For locale variants, score the global
parent brand (all Moulinex locales score the same as Moulinex).

recognizability — how well-known is this brand/venue in the real world:
  5 = globally famous, household name (Prada, Adidas, Sephora, Kentucky Derby)
  4 = well-known within its category or major in one large market (Fashion Nova, Huda Beauty)
  3 = real and findable but niche or regional (a mid-size DTC brand, a regional hotel)
  2 = obscure; real but very little public footprint
  1 = barely resolvable; you can identify it but almost no one would recognize the name

im_intensity — how heavily does this brand/venue run creator/influencer marketing:
  5 = influencer marketing is central to how they go to market (Gymshark, Fashion Nova, Shein)
  4 = runs frequent, visible creator programs (most large beauty/fashion brands)
  3 = does some influencer work but it's not a primary channel
  2 = occasional/light creator activity
  1 = little to no evidence of any influencer marketing

im_intensity cannot exceed recognizability when recognizability is 2 or below. The reason: if you
don't recognize a brand well enough to place it (recognizability <= 2), you cannot actually know how
heavily it runs influencer marketing — a confident im_intensity of 3–4 on a brand you barely recognize
is fabricated. So when recognizability is 1 or 2, im_intensity must be <= recognizability. This is a
CEILING, not a target: a recognizability-2 brand may still be im_intensity 1 if it shows no creator
activity. The ceiling does NOT apply at recognizability 3+ — a well-known brand can score any
im_intensity 1–5 on its own merits.

If you are confident it's a real brand but unsure of an exact score, pick the middle (3) rather than
guessing high. Do not inflate scores for names you only half-recognize.

## notes

A short one-line string (always present, never null) explaining the classification and score —
e.g. "recognized global fashion brand, heavy creator programs" or "reads as a personal handle".

## Aliases to classify:
${lines}

## Output

Return ONLY a JSON array — no prose, no markdown fences — one object per alias, every alias present,
in this exact shape:

[{"alias": "...", "canonical_name": "...", "entity_type": "...", "category": "...", "region": "...", "recognizability": N, "im_intensity": N, "notes": "..."}]

Rules for the shape:
- entity_type is always one of the seven allowed values.
- For brand and venue: canonical_name is a real non-null name (not alias-derived), category is from
  the list above, and both scores are integers 1–5 (with the im_intensity ceiling rule applied).
- For creator, celebrity, media, fragment, unknown: canonical_name, category, region, and BOTH scores
  are null.
- notes is always a non-null one-line string.
- Include an object for EVERY alias in the list.`;
}

function parseJsonArray(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON array from model response');
  }
}

async function classifyBatch(batch: BatchItem[], minCount: number, apiKey: string): Promise<ModelVerdict[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: buildPrompt(batch, minCount) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { content: { text: string }[] };
  const text = data.content[0].text;
  const parsed = parseJsonArray(text);
  if (!Array.isArray(parsed)) throw new Error('Model response was not a JSON array');
  return parsed as ModelVerdict[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampScore(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

// Live run: write the real columns.
async function writeLive(client: PipelineClient, updates: LiveUpdate[]) {
  const { error } = await client.from('brand_aliases').upsert(updates, { onConflict: 'alias' });
  return error;
}

// preview: stash the full verdict in the scratch classification_preview
// column instead of the live columns, and don't set classified_at, so
// preview rows stay eligible for the real run.
async function writePreview(client: PipelineClient, updates: LiveUpdate[]) {
  const previewUpdates = updates.map((u) => {
    const verdict: Partial<LiveUpdate> = { ...u };
    delete verdict.classified_at;
    return { alias: u.alias, classification_preview: verdict };
  });
  const { error } = await client.from('brand_aliases').upsert(previewUpdates, { onConflict: 'alias' });
  return error;
}

export async function runClassify(client: PipelineClient, options: ClassifyOptions): Promise<ClassifyResult> {
  const onProgress = options.onProgress ?? noopProgress;
  const minCount = options.minCount ?? 2;
  const preview = options.preview ?? false;
  const testSample = options.testSample ?? false;
  const verbose = options.verbose ?? false;
  const limit = options.limit ?? null;
  const apiKey = options.anthropicApiKey;

  if (!apiKey) throw new Error('Missing Anthropic API key (ClassifyOptions.anthropicApiKey).');
  if (testSample && !preview) {
    throw new Error('--test-sample requires --preview (refusing to write a hand-picked boundary-case sample to live columns).');
  }

  const byEntityType = emptyBreakdown();
  const base = { minCount, preview, batches: 0, batchesTotal: 0, classified: 0, failedBatches: 0, omitted: 0, byEntityType };

  // Cheap HEAD count first. The aggregation below walks every creator_posts
  // row and used to run even when nothing was eligible.
  const eligibleCount = await countEligible(client, minCount);
  if (eligibleCount === 0) {
    onProgress(`No aliases eligible for AI classification (classified_at IS NULL, creators_count >= ${minCount}).`);
    onProgress('Nothing to do.');
    return { ...base, eligible: 0 };
  }

  onProgress(
    `Loading eligible aliases (classified_at IS NULL, creators_count >= ${minCount})` +
      (testSample ? ', stratified test sample...' : '...'),
  );
  const loaded = testSample
    ? await loadStratifiedTestSample(client, minCount, onProgress)
    : await loadEligibleAliases(client, minCount);
  // The alias cap is applied before batching so a cap of 5 is one batch of 5.
  const maxAliases = options.maxAliases ?? null;
  const eligible = maxAliases != null && maxAliases >= 0 ? loaded.slice(0, maxAliases) : loaded;
  if (maxAliases != null && loaded.length > eligible.length) {
    onProgress(`  Capped at ${eligible.length} of ${loaded.length} eligible aliases for this run.`);
  }
  onProgress(
    `  ${eligible.length} aliases eligible for AI classification.${preview ? ' (--preview: writing to classification_preview only)' : ''}`,
  );

  if (eligible.length === 0) {
    onProgress('Nothing to do.');
    return { ...base, eligible: 0 };
  }

  const allBatches: EligibleRow[][] = [];
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) allBatches.push(eligible.slice(i, i + BATCH_SIZE));

  const batches = limit != null ? allBatches.slice(0, limit) : allBatches;
  onProgress(
    `Processing ${batches.length} of ${allBatches.length} batches of up to ${BATCH_SIZE}` +
      (limit != null ? ` (--limit ${limit})` : '') +
      '...',
  );

  const now = new Date().toISOString();
  let classifiedCount = 0;
  let failedBatches = 0;
  let omittedCount = 0;

  for (let b = 0; b < batches.length; b++) {
    // Context for this batch only: one GIN-indexed overlaps query, not a scan.
    const postCounts = await loadBatchPostCounts(client, batches[b].map((item) => item.alias));
    const batch: BatchItem[] = batches[b].map((item) => ({
      alias: item.alias,
      creators_count: item.creators_count,
      posts: postCounts.get(item.alias) ?? 0,
    }));
    const aliasSet = new Set(batch.map((item) => item.alias));

    onProgress(`Batch ${b + 1}/${batches.length} (${batch.length} aliases)...`);
    let results: ModelVerdict[];
    try {
      results = await classifyBatch(batch, minCount, apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onProgress(`  FAILED: ${message} — leaving this batch unclassified for retry.`);
      failedBatches++;
      options.onBatch?.({ index: b + 1, total: batches.length, aliases: batch.length, classified: 0, error: message });
      continue;
    }

    if (verbose) {
      onProgress(`\n--- RAW MODEL OUTPUT (batch ${b + 1}) ---`);
      onProgress(JSON.stringify(results, null, 2));
      onProgress('--- END RAW OUTPUT ---\n');
    }

    const updates: LiveUpdate[] = [];
    const batchBreakdown = emptyBreakdown();
    let skipped = 0;
    for (const result of results) {
      if (!result || typeof result.alias !== 'string' || !aliasSet.has(result.alias)) {
        onProgress(`  Skipping unrecognized/hallucinated result: ${JSON.stringify(result)}`);
        skipped++;
        continue;
      }
      let entityType: EntityType = VALID_ENTITY_TYPES.has(result.entity_type as string)
        ? (result.entity_type as EntityType)
        : 'unknown';

      // Deterministic invariant guard — runs on every classified row. The
      // prompt has been sharpened twice for these two failure modes and they
      // still slip through some of the time (a prompt guides, it doesn't
      // enforce) — this is the code-level backstop so they can't reach the DB
      // regardless of what the model returns.
      // 1. brand/venue with no real canonical name -> not a confident entity, downgrade to unknown.
      if (
        (entityType === 'brand' || entityType === 'venue') &&
        (result.canonical_name == null || String(result.canonical_name).trim() === '')
      ) {
        entityType = 'unknown';
      }
      // 2. Only brand/venue may carry canonical_name, category, region, and scores. Everything else nulls them.
      const scorable = entityType === 'brand' || entityType === 'venue';
      // Pass-through, not coercion, to write exactly what classify.mjs wrote.
      const canonical = scorable ? ((result.canonical_name ?? null) as string | null) : null;
      const category = scorable ? ((result.category ?? null) as string | null) : null;
      const region = scorable ? ((result.region ?? null) as string | null) : null;
      const recognizability = scorable ? clampScore(result.recognizability) : null;
      const im_intensity = scorable ? clampScore(result.im_intensity) : null;

      updates.push({
        alias: result.alias,
        canonical_name: canonical, // do NOT echo raw alias for junk singletons
        entity_type: entityType,
        category,
        region,
        recognizability,
        im_intensity,
        classification_notes: asNullableString(result.notes),
        classified_at: now,
      });
      batchBreakdown[entityType]++;
    }

    const missing = batch.filter((item) => !updates.some((u) => u.alias === item.alias));
    if (missing.length > 0) {
      onProgress(`  Model omitted ${missing.length} alias(es) from this batch — left unclassified for retry.`);
      omittedCount += missing.length;
    }

    if (updates.length > 0) {
      const writeError = preview ? await writePreview(client, updates) : await writeLive(client, updates);
      if (writeError) {
        onProgress(`  Upsert failed: ${writeError.message}`);
        failedBatches++;
        options.onBatch?.({ index: b + 1, total: batches.length, aliases: batch.length, classified: 0, error: `Upsert failed: ${writeError.message}` });
        continue;
      }
      classifiedCount += updates.length;
      for (const type of Object.keys(batchBreakdown) as EntityType[]) byEntityType[type] += batchBreakdown[type];
    }

    const breakdown = (Object.entries(batchBreakdown) as [EntityType, number][])
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `${type} ${n}`)
      .join(', ');
    onProgress(
      `  Batch ${b + 1}: ${results.length} returned, ${updates.length} ${preview ? 'previewed' : 'written'}` +
        (breakdown ? ` (${breakdown})` : '') +
        (missing.length > 0 ? `, ${missing.length} omitted` : '') +
        (skipped > 0 ? `, ${skipped} skipped` : ''),
    );
    options.onBatch?.({ index: b + 1, total: batches.length, aliases: batch.length, classified: updates.length });

    if (b < batches.length - 1) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  onProgress(
    `\nDone. ${preview ? 'Previewed' : 'Classified'} ${classifiedCount}/${eligible.length} aliases. ${failedBatches} batch failure(s) left for the next run.`,
  );

  return {
    ...base,
    eligible: eligible.length,
    batches: batches.length,
    batchesTotal: allBatches.length,
    classified: classifiedCount,
    failedBatches,
    omitted: omittedCount,
    byEntityType,
  };
}
