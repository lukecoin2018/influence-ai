// AI batch classification for aliases the pre-pass couldn't resolve.
// Only classifies aliases with classified_at IS NULL AND creators_count >=
// --min-count (default 2 — single-creator aliases are almost always
// mis-detections or one-offs not worth an AI call by default). Pass
// --min-count 1 to run the singleton sweep, which also scores brand/venue
// entities (recognizability, im_intensity) as scraping targets.
//
// Batches of ~50, each alias annotated with its creator/post counts. Strict
// JSON out: [{alias, canonical_name, entity_type, category, region,
// recognizability, im_intensity, notes}, ...]. Uses the same raw-fetch +
// regex-fallback JSON parsing pattern as app/api/match/route.ts (this
// codebase's existing precedent for JSON-structured Claude output).
//
// Idempotent: only ever selects classified_at IS NULL rows, so already-
// classified aliases are skipped on rerun regardless of how many times this
// is run.
//
// This pipeline never writes `verified` — that flag is human-only and gates
// visitor-facing data; the columns here are internal discovery signal only.
//
// Run: node scripts/brand-aliases/classify.mjs [--limit N] [--min-count N] [--preview] [--test-sample]
//   --limit N       process at most N batches (~50 aliases each) then stop —
//                   useful for reviewing raw model output before committing
//                   to a full run. Omit to process every eligible batch.
//   --min-count N   minimum creators_count to be eligible (default 2).
//   --preview       write the full verdict to classification_preview
//                   instead of the live columns, and don't set
//                   classified_at — for stress-testing the prompt on a test
//                   batch before a real run.
//   --test-sample   swap the normal eligible-alias query for a stratified
//                   ~80-row sample (regional-suffix / handle-shaped /
//                   clean-word / random control) drawn from the same
//                   eligible pool — stress-tests prompt boundary cases
//                   instead of sampling whatever happens to sort first.
//                   Only the row selection changes; prompt, batching, and
//                   writeback are untouched. Requires --preview (refuses to
//                   write a hand-picked boundary-case sample to live
//                   columns).
import { supabase, paginate, env_ } from './_supabase.mjs';
import { aggregateDetectedBrands } from './_aggregate.mjs';

const BATCH_SIZE = 50;
const MODEL = 'claude-sonnet-4-5-20250929';
const VALID_ENTITY_TYPES = new Set(['brand', 'creator', 'celebrity', 'media', 'venue', 'fragment', 'unknown']);
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

function parseMinCountArg() {
  const args = process.argv.slice(2);
  const eqArg = args.find((a) => a.startsWith('--min-count='));
  if (eqArg) return Number(eqArg.split('=')[1]);
  const flagIndex = args.indexOf('--min-count');
  if (flagIndex !== -1 && args[flagIndex + 1]) return Number(args[flagIndex + 1]);
  return 2;
}

async function loadEligibleAliases(minCount) {
  const aliases = [];
  await paginate(
    () =>
      supabase
        .from('brand_aliases')
        .select('alias, creators_count')
        .is('classified_at', null)
        .gte('creators_count', minCount)
        .order('creators_count', { ascending: false }),
    1000,
    (rows) => aliases.push(...rows)
  );
  return aliases;
}

function shuffle(items) {
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
async function loadStratifiedTestSample(minCount) {
  const pool = await loadEligibleAliases(minCount);

  const regional = pool.filter((row) => REGIONAL_SUFFIX_RE.test(row.alias)).slice(0, 15);
  const handleShaped = pool
    .filter((row) => HANDLE_SHAPED_RE.test(row.alias) && !REGIONAL_SUFFIX_RE.test(row.alias))
    .slice(0, 20);
  const cleanWord = pool
    .filter((row) => !CLEAN_WORD_NOISE_RE.test(row.alias) && row.alias.length >= 4 && row.alias.length <= 12)
    .slice(0, 25);
  const random = shuffle(pool).slice(0, 20);

  console.log(
    `  Stratified test sample: ${regional.length} regional-suffix, ${handleShaped.length} handle-shaped, ` +
      `${cleanWord.length} clean-word, ${random.length} random control (buckets may overlap, matching the reference SQL).`
  );
  return [...regional, ...handleShaped, ...cleanWord, ...random];
}

function buildPrompt(batch) {
  const lines = batch
    .map((item) => `- "${item.alias}" — ${item.creators_count} distinct creators, ${item.posts} sponsored posts`)
    .join('\n');

  return `You are classifying strings that were detected as "brands" in influencer posts. Each string
was scraped from a caption or tag, and MANY are not brands at all — they are personal creator
handles, public figures, media properties, events/venues, or plain text noise. Your job is to
classify each one accurately and, for real brands and venues, score how worthwhile it is as a
target for finding MORE creators who post about it.

Every alias below has exactly one detected creator so far. That single creator count carries NO
signal about the entity's real-world importance — a globally famous brand and a random typo look
identical at count = 1. Judge each alias purely on your own world knowledge of what the string
refers to, NOT on the count.

## entity_type — exactly one of: brand, creator, celebrity, media, venue, fragment, unknown

- brand: an actual commercial brand, company, or product line (Prada, Gymshark, The Honest Company).
- creator: an influencer/creator personal handle, not a brand. EXPECT MANY of these — this batch is
  dominated by single-creator aliases, and personal handles are common here (e.g. "aleaalvarezz",
  "katiedaisy", "gabriellaelio"). A handle that reads as a person's name/username is a creator.
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

## canonical_name

Resolve to the CONSUMER-FACING brand a creator would actually tag — the recognizable name, at its
own level. Never substitute or append the corporate parent or holding company: "louisvuitton" →
"Louis Vuitton", never "LVMH"; "maybelline" → "Maybelline", never "L'Oréal".

Collapse LOCALE variants of the same brand into ONE canonical name, and put the locale in \`region\`:
"sheinbrasil" → canonical "Shein", region "BR"; "moulinex_es" → canonical "Moulinex", region "ES";
"whirlpoolusa" → canonical "Whirlpool", region "US". Only collapse when the suffix is clearly just a
country/locale. Do NOT merge genuinely distinct product lines or sister brands that operate
independently ("lorealparis" and "lorealpro" stay separate: "L'Oréal Paris" and "L'Oréal Pro").

canonical_name is null for creator, celebrity, media, fragment, and unknown — leave it null, do NOT
fall back to echoing the raw alias.

## category

Short label for brands and venues — "Beauty", "Fashion", "Fitness & Wellness", "Tech", "Food",
"Hospitality", "Jewelry", etc. null for everything else.

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

If you are confident it's a real brand but unsure of an exact score, pick the middle (3) rather than
guessing high. Do not inflate scores for names you only half-recognize — low recognizability should
pull the score down honestly.

## Aliases to classify:
${lines}

## Output

Return ONLY a JSON array — no prose, no markdown fences — one object per alias, every alias present,
in this exact shape:

[{"alias": "...", "canonical_name": "...", "entity_type": "...", "category": "...", "region": "...", "recognizability": N, "im_intensity": N, "notes": "..."}]

Rules for the shape:
- entity_type is always one of the seven allowed values.
- canonical_name / category / region are null when not applicable (see above).
- recognizability and im_intensity are integers 1–5 for brand and venue, and null for every other type.
- notes is a short one-line string explaining the classification and score (e.g. "recognized global fashion brand, heavy creator programs"); always present, never null.
- Include an object for EVERY alias in the list, even ones you mark unknown or fragment.`;
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

function clampScore(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

// Live run: write the real columns.
async function writeLive(updates) {
  const { error } = await supabase.from('brand_aliases').upsert(updates, { onConflict: 'alias' });
  return error;
}

// --preview: stash the full verdict in the scratch classification_preview
// column instead of the live columns, and don't set classified_at, so
// preview rows stay eligible for the real run.
async function writePreview(updates) {
  const previewUpdates = updates.map((u) => {
    const verdict = { ...u };
    delete verdict.classified_at;
    return { alias: u.alias, classification_preview: verdict };
  });
  const { error } = await supabase.from('brand_aliases').upsert(previewUpdates, { onConflict: 'alias' });
  return error;
}

async function main() {
  const minCount = parseMinCountArg();
  const preview = process.argv.includes('--preview');
  const testSample = process.argv.includes('--test-sample');

  if (testSample && !preview) {
    throw new Error('--test-sample requires --preview (refusing to write a hand-picked boundary-case sample to live columns).');
  }

  console.log('Aggregating post counts from creator_posts...');
  const aggregate = await aggregateDetectedBrands();

  console.log(
    `Loading eligible aliases (classified_at IS NULL, creators_count >= ${minCount})` +
      (testSample ? ', stratified test sample...' : '...')
  );
  const eligible = testSample ? await loadStratifiedTestSample(minCount) : await loadEligibleAliases(minCount);
  console.log(`  ${eligible.length} aliases eligible for AI classification.${preview ? ' (--preview: writing to classification_preview only)' : ''}`);

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
      const scorable = entityType === 'brand' || entityType === 'venue';
      updates.push({
        alias: result.alias,
        canonical_name: result.canonical_name ?? null, // do NOT echo raw alias for junk singletons
        entity_type: entityType,
        category: result.category ?? null,
        region: result.region ?? null,
        recognizability: scorable ? clampScore(result.recognizability) : null,
        im_intensity: scorable ? clampScore(result.im_intensity) : null,
        classification_notes: typeof result.notes === 'string' ? result.notes : null,
        classified_at: now,
      });
    }

    const missing = batch.filter((item) => !updates.some((u) => u.alias === item.alias));
    if (missing.length > 0) {
      console.warn(`  Model omitted ${missing.length} alias(es) from this batch — left unclassified for retry.`);
    }

    if (updates.length > 0) {
      const writeError = preview ? await writePreview(updates) : await writeLive(updates);
      if (writeError) {
        console.error(`  Upsert failed: ${writeError.message}`);
        failedBatches++;
        continue;
      }
      classifiedCount += updates.length;
    }

    if (b < batches.length - 1) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(
    `\nDone. ${preview ? 'Previewed' : 'Classified'} ${classifiedCount}/${eligible.length} aliases. ${failedBatches} batch failure(s) left for the next run.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
