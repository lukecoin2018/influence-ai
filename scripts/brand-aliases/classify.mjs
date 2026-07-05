// AI batch classification for aliases the pre-pass couldn't resolve.
// Only classifies aliases with classified_at IS NULL AND creators_count >= 2
// (single-creator aliases are almost always mis-detections or one-offs not
// worth an AI call — they stay 'unknown' and surface in the review queue).
//
// Batches of ~50, each alias annotated with its creator/post counts. Strict
// JSON out: [{alias, canonical_name, entity_type, category, region}, ...].
// Uses the same raw-fetch + regex-fallback JSON parsing pattern as
// app/api/match/route.ts (this codebase's existing precedent for
// JSON-structured Claude output).
//
// Idempotent: only ever selects classified_at IS NULL rows, so already-
// classified aliases are skipped on rerun regardless of how many times this
// is run.
//
// Run: node scripts/brand-aliases/classify.mjs [--limit N]
//   --limit N   process at most N batches (~50 aliases each) then stop —
//               useful for reviewing raw model output before committing to
//               a full run. Omit to process every eligible batch.
import { supabase, paginate, env_ } from './_supabase.mjs';
import { aggregateDetectedBrands } from './_aggregate.mjs';

const BATCH_SIZE = 50;
const MIN_CREATORS = 2;
const MODEL = 'claude-sonnet-4-5-20250929';
const VALID_ENTITY_TYPES = new Set(['brand', 'creator', 'celebrity', 'media', 'fragment', 'unknown']);
const DELAY_BETWEEN_BATCHES_MS = 500;

const ANTHROPIC_API_KEY = env_.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

function parseLimitArg() {
  const args = process.argv.slice(2);
  const eqArg = args.find((a) => a.startsWith('--limit='));
  if (eqArg) return Number(eqArg.split('=')[1]);
  const flagIndex = args.indexOf('--limit');
  if (flagIndex !== -1 && args[flagIndex + 1]) return Number(args[flagIndex + 1]);
  return null;
}

async function loadEligibleAliases() {
  const aliases = [];
  await paginate(
    () =>
      supabase
        .from('brand_aliases')
        .select('alias, creators_count')
        .is('classified_at', null)
        .gte('creators_count', MIN_CREATORS)
        .order('creators_count', { ascending: false }),
    1000,
    (rows) => aliases.push(...rows)
  );
  return aliases;
}

function buildPrompt(batch) {
  const lines = batch
    .map((item) => `- "${item.alias}" — ${item.creators_count} distinct creators, ${item.posts} sponsored posts`)
    .join('\n');

  return `You are classifying strings detected as "brands" in influencer posts (scraped from captions/tags — many are not actually brands). For each alias below, classify it.

entity_type must be exactly one of: brand, creator, celebrity, media, fragment, unknown.
- brand: an actual commercial brand/company/product line.
- creator: an influencer/creator handle, not a brand (should be rare here — most creator handles were already filtered out before this batch).
- celebrity: a public figure/celebrity being mentioned, not a brand they run.
- media: a publication, TV show, movie, or media property.
- fragment: leftover text noise (partial words, generic terms) that isn't a real entity.
- unknown: you genuinely cannot tell — do not guess.

Merge rule for canonical_name: if multiple aliases are clearly the same marketing team/company operating regional or sub-brand accounts (e.g. "sheinus", "sheinuk", "shein_official" all belong to Shein), give them the SAME canonical_name ("Shein") and put the region in the region field (e.g. "US", "UK") if it's evident from the alias — otherwise leave region null. Do NOT merge genuinely distinct product lines or sister brands that operate independently (e.g. "lorealparis" and "lorealpro" are both L'Oréal but are different product lines — keep them as separate canonical_names: "L'Oréal Paris" and "L'Oréal Pro").

category is a short free-text label (e.g. "Beauty", "Fashion", "Fitness & Wellness", "Tech", "Food") — your best guess, or null if entity_type isn't "brand".

Aliases to classify:
${lines}

Return ONLY a JSON array, no prose, no markdown fences, one object per alias, in this exact shape:
[{"alias": "...", "canonical_name": "...", "entity_type": "...", "category": "...", "region": "..."}]

canonical_name and category may be null if not applicable (e.g. for fragment/unknown). region is almost always null unless merging regional accounts as described above.`;
}

function parseJsonArray(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON array from model response');
  }
}

async function classifyBatch(batch) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(batch) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content[0].text;
  const parsed = parseJsonArray(text);
  if (!Array.isArray(parsed)) throw new Error('Model response was not a JSON array');
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Aggregating post counts from creator_posts...');
  const aggregate = await aggregateDetectedBrands();

  console.log('Loading eligible aliases (classified_at IS NULL, creators_count >= 2)...');
  const eligible = await loadEligibleAliases();
  console.log(`  ${eligible.length} aliases eligible for AI classification.`);

  if (eligible.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const allBatches = [];
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) allBatches.push(eligible.slice(i, i + BATCH_SIZE));

  const limit = parseLimitArg();
  const batches = limit != null ? allBatches.slice(0, limit) : allBatches;
  console.log(
    `Processing ${batches.length} of ${allBatches.length} batches of up to ${BATCH_SIZE}` +
      (limit != null ? ` (--limit ${limit})` : '') +
      '...'
  );

  const now = new Date().toISOString();
  let classifiedCount = 0;
  let failedBatches = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b].map((item) => ({
      alias: item.alias,
      creators_count: item.creators_count,
      posts: aggregate.get(item.alias)?.posts ?? 0,
    }));
    const aliasSet = new Set(batch.map((item) => item.alias));

    console.log(`Batch ${b + 1}/${batches.length} (${batch.length} aliases)...`);
    let results;
    try {
      results = await classifyBatch(batch);
    } catch (err) {
      console.error(`  FAILED: ${err.message} — leaving this batch unclassified for retry.`);
      failedBatches++;
      continue;
    }

    console.log(`\n--- RAW MODEL OUTPUT (batch ${b + 1}) ---`);
    console.log(JSON.stringify(results, null, 2));
    console.log('--- END RAW OUTPUT ---\n');

    const updates = [];
    for (const result of results) {
      if (!result || typeof result.alias !== 'string' || !aliasSet.has(result.alias)) {
        console.warn(`  Skipping unrecognized/hallucinated result: ${JSON.stringify(result)}`);
        continue;
      }
      const entityType = VALID_ENTITY_TYPES.has(result.entity_type) ? result.entity_type : 'unknown';
      updates.push({
        alias: result.alias,
        canonical_name: result.canonical_name || result.alias,
        entity_type: entityType,
        category: result.category || null,
        region: result.region || null,
        classified_at: now,
      });
    }

    const missing = batch.filter((item) => !updates.some((u) => u.alias === item.alias));
    if (missing.length > 0) {
      console.warn(`  Model omitted ${missing.length} alias(es) from this batch — left unclassified for retry.`);
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('brand_aliases').upsert(updates, { onConflict: 'alias' });
      if (error) {
        console.error(`  Upsert failed: ${error.message}`);
        failedBatches++;
        continue;
      }
      classifiedCount += updates.length;
    }

    if (b < batches.length - 1) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`\nDone. Classified ${classifiedCount}/${eligible.length} aliases. ${failedBatches} batch failure(s) left for the next run.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
