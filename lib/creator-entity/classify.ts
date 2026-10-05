import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import type { PipelineClient, PipelineOptions } from '../pipeline/types';
import { noopProgress } from '../pipeline/types';
import { paginate } from '../pipeline/paginate';
import { loadCreatorRecords, type CreatorRecord } from './load';
import { computeSignals, splitCategory, summarizeSignals, type ComputedSignals, type HeuristicsSummary } from './heuristics';
import {
  CREATOR_ENTITY_CONFIDENCES,
  CREATOR_ENTITY_TYPES,
  type CreatorEntityConfidence,
  type CreatorEntityInputs,
  type CreatorEntitySignals,
  type CreatorEntityType,
} from './types';

/**
 * Classifies every scraped creator ACCOUNT as creator / brand / media / venue
 * / other and writes the verdict, with the heuristic flags beside it, to
 * creator_entity (migration 0026). Shaped after lib/pipeline/classify.ts:
 * the Supabase client and the API key are passed in, progress goes through
 * onProgress, and nothing here touches Next or reads .env.local.
 *
 * Differences from the brand-alias classifier:
 *  - The official SDK instead of a raw fetch, with the SDK's own retries
 *    turned off (maxRetries: 0) so every retry is counted here: at most
 *    MAX_RETRIES on 429, 5xx, a dropped connection, or output that does not
 *    parse or validate. After that the batch is left for the next run.
 *  - Token usage is logged per batch and in total (failed attempts included —
 *    they are billed too).
 *  - Resume is by input_hash, not classified_at: a creator whose stored
 *    input_hash and prompt_version both match skips the MODEL CALL, so a
 *    rerun only pays for new or changed creators (or a new PROMPT_VERSION).
 *    It does not skip the row: its signals and flag_count are recomputed on
 *    every run and written back when they differ, so the heuristics can be
 *    tuned after the full run without paying for the model again. `ids`
 *    bypasses the skip, to re-run a chosen sample on purpose.
 *  - Writes are one upsert per batch on creator_id, so a run that dies keeps
 *    everything before the failed batch. The upsert never sends
 *    review_entity_type or reviewed_at, so a human override survives any
 *    rerun.
 *  - dryRun writes nothing and works before 0026 is applied: a missing table
 *    reads as empty.
 */
export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/** Bump when the prompt changes in a way that should re-classify everything. */
export const PROMPT_VERSION = 'creator-entity-v1';

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;
/** Stop the run after this many batches in a row fail outright — something systematic is wrong. */
const MAX_CONSECUTIVE_FAILED_BATCHES = 3;
const SUMMARY_MAX_CHARS = 800;
const BIO_MAX_CHARS = 500;
const REASON_MAX_CHARS = 300;
/** 20 short verdicts are ~1.5k tokens; this leaves room without inviting rambling. */
const MAX_TOKENS = 4000;
const REQUEST_TIMEOUT_MS = 60_000;

export type ClassifyCreatorsOptions = PipelineOptions & {
  /** Required unless heuristicsOnly. Passed in, like the client, rather than read from the environment. */
  anthropicApiKey?: string | null;
  model?: string;
  /** Load, compute and (unless heuristicsOnly) call the model, but write nothing. */
  dryRun?: boolean;
  /** Process at most this many creators (after the unchanged ones are skipped). */
  limit?: number | null;
  /** Only these creator ids; also bypasses the input_hash skip. */
  ids?: readonly string[] | null;
  /**
   * No model calls. Computes the flags and the summary, and (unless dryRun)
   * refreshes signals/flag_count on stored rows whose inputs are unchanged.
   * Never inserts a row: a creator without a verdict needs a model run.
   */
  heuristicsOnly?: boolean;
  /** Called once per classified creator, for the CLI's dry-run listing. */
  onVerdict?: (verdict: VerdictReport) => void;
};

export type VerdictReport = {
  creatorId: string;
  inputs: CreatorEntityInputs;
  signals: CreatorEntitySignals;
  flagCount: number;
  entityType: CreatorEntityType;
  confidence: CreatorEntityConfidence;
  reason: string;
};

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type ClassifyCreatorsResult = {
  model: string;
  promptVersion: string;
  dryRun: boolean;
  loaded: number;
  heuristics: HeuristicsSummary;
  /** Per-creator signals, in load order — the CLI prints them for small runs. */
  computed: { record: CreatorRecord; signals: ComputedSignals }[];
  /** Model call skipped because input_hash and prompt_version matched the stored row. */
  unchanged: number;
  /** Unchanged rows whose stored signals or flag_count differed and were rewritten (dry run: would be). */
  signalsRefreshed: number;
  /** Signal refreshes that failed to write; they are retried on the next run. */
  signalsRefreshFailed: number;
  /** Sent to the model this run (after unchanged and limit). */
  sent: number;
  classified: number;
  written: number;
  batches: number;
  failedBatches: number;
  /** Creators left without a verdict this run (failed batches plus ids the model left out). */
  leftForNextRun: number;
  byEntityType: Record<CreatorEntityType, number>;
  byConfidence: Record<CreatorEntityConfidence, number>;
  usage: TokenUsage;
  /** True when creator_entity was not found and dryRun read it as empty. */
  tableMissing: boolean;
};

type StoredState = { input_hash: string | null; prompt_version: string | null; signals: unknown; flag_count: number | null };
type StoredRow = StoredState & { creator_id: string };

type WorkItem = {
  shortId: string;
  record: CreatorRecord;
  computed: ComputedSignals;
  inputs: CreatorEntityInputs;
  inputHash: string;
};

type Verdict = { entityType: CreatorEntityType; confidence: CreatorEntityConfidence; reason: string };

/** One upserted creator_entity row. review_entity_type and reviewed_at are deliberately absent. */
type CreatorEntityWrite = {
  creator_id: string;
  entity_type: CreatorEntityType;
  confidence: CreatorEntityConfidence;
  reason: string;
  signals: CreatorEntitySignals;
  flag_count: number;
  inputs: CreatorEntityInputs;
  model: string;
  prompt_version: string;
  input_hash: string;
  classified_at: string;
};

// ── Inputs ──────────────────────────────────────────────────────────────────

/** Truncates by code point (never splits an emoji) and marks the cut. */
function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : trimmed;
}

/** The record sent to the model, and stored as creator_entity.inputs. Key order is fixed; the hash sorts keys anyway. */
export function buildInputs(record: CreatorRecord, computed: ComputedSignals): CreatorEntityInputs {
  const profile = record.profile;
  const isInstagram = profile?.platform === 'instagram';
  const categories = isInstagram ? splitCategory(profile?.category) : [];
  return {
    platform: profile?.platform ?? null,
    handle: profile?.handle ?? null,
    display_name: record.displayName?.trim() || null,
    follower_count: profile?.followerCount ?? null,
    bio: truncate(profile?.bio, BIO_MAX_CHARS),
    category: categories.length > 0 ? categories.join(' / ') : null,
    is_business_account: isInstagram ? profile?.isBusinessAccount ?? null : null,
    link_domain: computed.linkHost,
    summary: truncate(profile?.summary, SUMMARY_MAX_CHARS),
  };
}

export function hashInputs(inputs: CreatorEntityInputs): string {
  const stable = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash('sha256').update(stable).digest('hex');
}

// ── Prompt ──────────────────────────────────────────────────────────────────

function promptLine(item: WorkItem): string {
  const i = item.inputs;
  return JSON.stringify({
    id: item.shortId,
    platform: i.platform,
    handle: i.handle,
    display_name: i.display_name,
    followers: i.follower_count,
    bio: i.bio,
    ig_category: i.category,
    ig_business_account: i.is_business_account,
    link_domain: i.link_domain,
    summary: i.summary,
  });
}

export function buildPrompt(items: readonly WorkItem[]): string {
  return `You are classifying social media accounts that were scraped into a database of influencer
creators. Most of them are creators, but some are accounts run by companies, publications or
places that were picked up by mistake. Say what kind of ACCOUNT each one is.

Classify the account, not the person behind it. A founder's personal account is a creator
account even when they talk about their company; the company's own account is a brand account.

## entity_type — exactly one of: creator, brand, media, venue, other

- creator: an individual, couple, family or small group publishing as themselves. This includes
  creators who sell products, run a shop or founded a brand, as long as this account is their
  personal presence.
- brand: an account run by or for a company, product line, store, service, app, club, team,
  agency or organisation.
- media: publications, magazines, news, aggregator / meme / fan / repost pages, and "TV"-style
  channels.
- venue: a physical place such as a hotel, restaurant, bar, mall, gym, salon or clinic.
- other: there is not enough information to tell.

## Weighing the evidence

- summary is an AI-written description of the account's recent posts. AI summaries can be wrong
  in either direction, so weigh the handle, display name, bio and category against it instead of
  adopting its framing.
- A business-account flag alone is not evidence: many creators switch to a business account for
  the analytics. ig_business_account is null for TikTok, which has no such flag.
- ig_category is picked by the account owner from Instagram's list. It is one signal among
  several and is often generic.
- link_domain is the domain of the link in the bio. A link-in-bio tool or storefront (linktr.ee,
  beacons.ai, shopltk.com, ...) says nothing either way; a company's own website can.
- followers is context only. Large accounts can be creators and small ones can be brands.
- null means the field is missing. An account with almost nothing to go on is "other".

## confidence — exactly one of: high, medium, low

- high: the inputs say it outright.
- medium: strong indirect evidence.
- low: a guess.

## reason

One short line, at most about 20 words, naming the evidence the verdict rests on.

## Accounts — one JSON object per line

${items.map(promptLine).join('\n')}

## Output

Return ONLY a JSON array — no prose, no markdown fences — with one object per account and every
id present exactly once, in this shape:

[{"id": "r1", "entity_type": "creator", "confidence": "high", "reason": "..."}]`;
}

// ── Response handling ───────────────────────────────────────────────────────

/** JSON.parse, then the regex fallback lib/pipeline/classify.ts uses for a reply with stray prose around the array. */
export function parseJsonArray(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse a JSON array from the model response');
  }
}

/**
 * Checks the parsed reply against the batch: every id present exactly once,
 * entity_type and confidence from the allowed sets, a non-empty reason.
 * Returns the valid verdicts and a list of problems; the caller decides
 * whether the problems are worth a retry.
 */
export function validateVerdicts(parsed: unknown, ids: readonly string[]): { verdicts: Map<string, Verdict>; problems: string[] } {
  const verdicts = new Map<string, Verdict>();
  const problems: string[] = [];
  if (!Array.isArray(parsed)) return { verdicts, problems: ['response is not a JSON array'] };

  const wanted = new Set(ids);
  for (const item of parsed) {
    const obj = (item ?? {}) as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id : null;
    if (!id || !wanted.has(id)) {
      problems.push(`unknown id ${JSON.stringify(obj.id)}`);
      continue;
    }
    if (verdicts.has(id)) {
      problems.push(`duplicate id ${id}`);
      continue;
    }
    const entityType = CREATOR_ENTITY_TYPES.find((t) => t === obj.entity_type);
    const confidence = CREATOR_ENTITY_CONFIDENCES.find((c) => c === obj.confidence);
    const reason = typeof obj.reason === 'string' ? obj.reason.replace(/\s+/g, ' ').trim().slice(0, REASON_MAX_CHARS) : '';
    if (!entityType) problems.push(`${id}: invalid entity_type ${JSON.stringify(obj.entity_type)}`);
    if (!confidence) problems.push(`${id}: invalid confidence ${JSON.stringify(obj.confidence)}`);
    if (!reason) problems.push(`${id}: empty reason`);
    if (entityType && confidence && reason) verdicts.set(id, { entityType, confidence, reason });
  }
  for (const id of ids) {
    if (!verdicts.has(id) && !problems.some((p) => p.startsWith(`${id}:`))) problems.push(`${id}: missing`);
  }
  return { verdicts, problems };
}

class FatalApiError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** retry-after (seconds) when the API sent one, else exponential backoff with a little jitter. */
function backoffMs(attempt: number, error: unknown): number {
  if (error instanceof Anthropic.APIError) {
    const header = error.headers?.get?.('retry-after');
    const seconds = header ? Number(header) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 60_000);
  }
  return BACKOFF_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 500);
}

/** 429, 5xx (529 overloaded included) and connection failures/timeouts are worth another attempt. */
function isRetryable(error: unknown): boolean {
  return (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError
  );
}

/** A bad key, missing permission or unknown model fails every batch the same way: stop the run. */
function isFatal(error: unknown): boolean {
  return (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError ||
    error instanceof Anthropic.NotFoundError
  );
}

type BatchOutcome = {
  verdicts: Map<string, Verdict>;
  problems: string[];
  attempts: number;
  usage: TokenUsage;
  /** Set when no attempt produced a parsable reply; the whole batch is left for the next run. */
  error?: string;
};

async function classifyBatch(
  anthropic: Anthropic,
  model: string,
  items: readonly WorkItem[],
  onProgress: (message: string) => void,
): Promise<BatchOutcome> {
  const ids = items.map((item) => item.shortId);
  const prompt = buildPrompt(items);
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let best: { verdicts: Map<string, Verdict>; problems: string[] } | null = null;
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) onProgress(`    retry ${attempt}/${MAX_RETRIES}: ${lastError}`);
    let retryDelayFrom: unknown = null;
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });
      usage.inputTokens += response.usage.input_tokens;
      usage.outputTokens += response.usage.output_tokens;

      if (response.stop_reason === 'max_tokens') throw new Error('response hit max_tokens');
      const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
      const result = validateVerdicts(parseJsonArray(text), ids);
      if (!best || result.verdicts.size > best.verdicts.size) best = result;
      if (result.problems.length === 0) return { ...result, attempts: attempt + 1, usage };
      lastError = `${result.problems.length} problem(s): ${result.problems.slice(0, 3).join('; ')}`;
    } catch (error) {
      if (isFatal(error)) throw new FatalApiError(error instanceof Error ? error.message : String(error));
      if (error instanceof Anthropic.APIError && !isRetryable(error)) {
        // A 400 can be specific to this batch's content; give up on the batch, not the run.
        return { verdicts: new Map(), problems: [], attempts: attempt + 1, usage, error: `${error.status ?? ''} ${error.message}`.trim() };
      }
      lastError = error instanceof Error ? error.message : String(error);
      retryDelayFrom = error;
    }
    if (attempt < MAX_RETRIES) await sleep(backoffMs(attempt, retryDelayFrom));
  }

  if (best) return { ...best, attempts: MAX_RETRIES + 1, usage };
  return { verdicts: new Map(), problems: [], attempts: MAX_RETRIES + 1, usage, error: lastError };
}

// ── Stored state ────────────────────────────────────────────────────────────

/** PostgREST's "table not in the schema cache" (migration 0026 not applied) or Postgres' 42P01. */
function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

async function loadStoredState(
  client: PipelineClient,
  ids: readonly string[] | null,
): Promise<{ state: Map<string, StoredState>; missing: boolean }> {
  const state = new Map<string, StoredState>();
  const select = 'creator_id, input_hash, prompt_version, signals, flag_count';
  try {
    if (ids) {
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await client.from('creator_entity').select(select).in('creator_id', ids.slice(i, i + 200));
        if (isMissingTable(error)) return { state, missing: true };
        if (error) throw new Error(error.message);
        for (const row of (data ?? []) as StoredRow[]) state.set(row.creator_id, row);
      }
      return { state, missing: false };
    }
    // paginate() throws a plain Error, so probe once for the missing-table case first.
    const probe = await client.from('creator_entity').select('creator_id').limit(1);
    if (isMissingTable(probe.error)) return { state, missing: true };
    if (probe.error) throw new Error(probe.error.message);
    await paginate<StoredRow>(
      () => client.from('creator_entity').select(select),
      { key: 'creator_id', pageSize: 1000 },
      (rows) => {
        for (const row of rows) state.set(row.creator_id, row);
      },
    );
    return { state, missing: false };
  } catch (error) {
    throw new Error(`Loading creator_entity failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ── Signal refresh ──────────────────────────────────────────────────────────

/** JSON with object keys sorted at every level, so jsonb's key reordering does not read as a change. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function signalsDiffer(stored: Pick<StoredState, 'signals' | 'flag_count'>, computed: ComputedSignals): boolean {
  return stored.flag_count !== computed.flagCount || stableStringify(stored.signals) !== stableStringify(computed.signals);
}

/** Parallel single-row updates are enough for a few thousand rows; this keeps them polite. */
const REFRESH_CONCURRENCY = 10;

type Refresh = { creatorId: string; computed: ComputedSignals };

/**
 * Rewrites signals and flag_count on rows whose verdict stands (inputs
 * unchanged). An UPDATE of those two columns only, never an upsert, so it can
 * neither create a row nor touch the verdict or a human review.
 */
async function refreshSignals(client: PipelineClient, refreshes: readonly Refresh[]): Promise<{ written: number; failed: number }> {
  let written = 0;
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < refreshes.length) {
      const { creatorId, computed } = refreshes[next++];
      const { error } = await client
        .from('creator_entity')
        .update({ signals: computed.signals, flag_count: computed.flagCount })
        .eq('creator_id', creatorId);
      if (error) failed++;
      else written++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(REFRESH_CONCURRENCY, refreshes.length) }, worker));
  return { written, failed };
}

// ── Run ─────────────────────────────────────────────────────────────────────

function emptyByType(): Record<CreatorEntityType, number> {
  return { creator: 0, brand: 0, media: 0, venue: 0, other: 0 };
}

function emptyByConfidence(): Record<CreatorEntityConfidence, number> {
  return { high: 0, medium: 0, low: 0 };
}

export async function runCreatorEntityClassify(
  client: PipelineClient,
  options: ClassifyCreatorsOptions = {},
): Promise<ClassifyCreatorsResult> {
  const onProgress = options.onProgress ?? noopProgress;
  const model = options.model ?? DEFAULT_MODEL;
  const dryRun = options.dryRun ?? false;
  const heuristicsOnly = options.heuristicsOnly ?? false;
  const ids = options.ids && options.ids.length > 0 ? options.ids : null;
  const limit = options.limit ?? null;

  if (!heuristicsOnly && !options.anthropicApiKey) {
    throw new Error('Missing Anthropic API key (ClassifyCreatorsOptions.anthropicApiKey).');
  }

  const records = await loadCreatorRecords(client, { ids, onProgress });
  const computed = records.map((record) => ({ record, signals: computeSignals(record) }));
  const heuristics = summarizeSignals(records, computed.map((c) => c.signals));

  const result: ClassifyCreatorsResult = {
    model,
    promptVersion: PROMPT_VERSION,
    dryRun,
    loaded: records.length,
    heuristics,
    computed,
    unchanged: 0,
    signalsRefreshed: 0,
    signalsRefreshFailed: 0,
    sent: 0,
    classified: 0,
    written: 0,
    batches: 0,
    failedBatches: 0,
    leftForNextRun: 0,
    byEntityType: emptyByType(),
    byConfidence: emptyByConfidence(),
    usage: { inputTokens: 0, outputTokens: 0 },
    tableMissing: false,
  };

  const { state, missing } = await loadStoredState(client, ids);
  if (missing) {
    if (!dryRun && !heuristicsOnly) throw new Error('creator_entity does not exist. Apply supabase/migrations/0026_creator_entity.sql first.');
    onProgress('creator_entity not found (0026 not applied) — read as empty.');
    result.tableMissing = true;
  }

  // A hash match skips the model call, not the row: its signals are compared
  // and refreshed below. `ids` re-classifies on purpose, except in a
  // heuristics-only run, which never calls the model.
  const reclassifyIds = ids != null && !heuristicsOnly;
  const pending: Omit<WorkItem, 'shortId'>[] = [];
  const refreshes: Refresh[] = [];
  for (const { record, signals } of computed) {
    const inputs = buildInputs(record, signals);
    const inputHash = hashInputs(inputs);
    const stored = state.get(record.creatorId);
    if (!reclassifyIds && stored && stored.input_hash === inputHash && stored.prompt_version === PROMPT_VERSION) {
      result.unchanged++;
      if (signalsDiffer(stored, signals)) refreshes.push({ creatorId: record.creatorId, computed: signals });
      continue;
    }
    pending.push({ record, computed: signals, inputs, inputHash });
  }

  if (refreshes.length > 0) {
    if (dryRun) {
      result.signalsRefreshed = refreshes.length;
      onProgress(`${refreshes.length} unchanged row(s) have stale signals — dry run, not refreshed.`);
    } else {
      const { written, failed } = await refreshSignals(client, refreshes);
      result.signalsRefreshed = written;
      result.signalsRefreshFailed = failed;
      onProgress(`Refreshed signals on ${written} unchanged row(s)` + (failed > 0 ? `, ${failed} failed (retried next run)` : '') + '.');
    }
  }

  if (heuristicsOnly) {
    onProgress(
      `Heuristics only: no model calls. ${result.unchanged} row(s) with a current verdict, ` +
        `${pending.length} new or changed creator(s) left for a model run.`,
    );
    return result;
  }

  // Short ids (r1..r20) per batch, so the model never has to echo a uuid.
  const work = limit != null && limit >= 0 ? pending.slice(0, limit) : pending;
  result.sent = work.length;
  onProgress(
    `${result.unchanged} unchanged (model call skipped), ${pending.length} to classify` +
      (work.length < pending.length ? `, capped at ${work.length} by --limit` : '') +
      `. Model ${model}, prompt ${PROMPT_VERSION}${dryRun ? ', DRY RUN (nothing written)' : ''}.`,
  );
  if (work.length === 0) return result;

  const anthropic = new Anthropic({ apiKey: options.anthropicApiKey ?? undefined, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });
  const batchCount = Math.ceil(work.length / BATCH_SIZE);
  let consecutiveFailures = 0;

  for (let b = 0; b < batchCount; b++) {
    const items: WorkItem[] = work
      .slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
      .map((item, i) => ({ ...item, shortId: `r${i + 1}` }));
    result.batches++;
    onProgress(`Batch ${b + 1}/${batchCount} (${items.length} creators)...`);

    let outcome: BatchOutcome;
    try {
      outcome = await classifyBatch(anthropic, model, items, onProgress);
    } catch (error) {
      if (error instanceof FatalApiError) {
        result.failedBatches++;
        result.leftForNextRun += work.length - b * BATCH_SIZE;
        onProgress(`  FATAL: ${error.message} — stopping the run.`);
        break;
      }
      throw error;
    }
    result.usage.inputTokens += outcome.usage.inputTokens;
    result.usage.outputTokens += outcome.usage.outputTokens;

    if (outcome.error || outcome.verdicts.size === 0) {
      result.failedBatches++;
      result.leftForNextRun += items.length;
      consecutiveFailures++;
      onProgress(`  FAILED after ${outcome.attempts} attempt(s): ${outcome.error ?? outcome.problems.join('; ')} — left for the next run.`);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILED_BATCHES) {
        result.leftForNextRun += Math.max(0, work.length - (b + 1) * BATCH_SIZE);
        onProgress(`  ${consecutiveFailures} batches in a row failed — stopping the run.`);
        break;
      }
      continue;
    }
    consecutiveFailures = 0;

    const now = new Date().toISOString();
    const rows: CreatorEntityWrite[] = [];
    const batchByType = emptyByType();
    for (const item of items) {
      const verdict = outcome.verdicts.get(item.shortId);
      if (!verdict) continue;
      rows.push({
        creator_id: item.record.creatorId,
        entity_type: verdict.entityType,
        confidence: verdict.confidence,
        reason: verdict.reason,
        signals: item.computed.signals,
        flag_count: item.computed.flagCount,
        inputs: item.inputs,
        model,
        prompt_version: PROMPT_VERSION,
        input_hash: item.inputHash,
        classified_at: now,
      });
      batchByType[verdict.entityType]++;
      options.onVerdict?.({
        creatorId: item.record.creatorId,
        inputs: item.inputs,
        signals: item.computed.signals,
        flagCount: item.computed.flagCount,
        entityType: verdict.entityType,
        confidence: verdict.confidence,
        reason: verdict.reason,
      });
    }
    const omitted = items.length - rows.length;
    result.leftForNextRun += omitted;

    if (!dryRun) {
      const { error } = await client.from('creator_entity').upsert(rows, { onConflict: 'creator_id' });
      if (error) {
        result.failedBatches++;
        result.leftForNextRun += rows.length;
        onProgress(`  Upsert failed: ${error.message} — left for the next run.`);
        continue;
      }
      result.written += rows.length;
    }
    result.classified += rows.length;
    for (const row of rows) {
      result.byEntityType[row.entity_type]++;
      result.byConfidence[row.confidence]++;
    }

    const breakdown = (Object.entries(batchByType) as [CreatorEntityType, number][])
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `${type} ${n}`)
      .join(', ');
    onProgress(
      `  ${rows.length} ${dryRun ? 'classified' : 'written'} (${breakdown})` +
        (omitted > 0 ? `, ${omitted} left for the next run` : '') +
        `, ${outcome.attempts} attempt(s), tokens in ${outcome.usage.inputTokens.toLocaleString('en-US')} / out ${outcome.usage.outputTokens.toLocaleString('en-US')}`,
    );
  }

  onProgress(
    `\nDone. ${result.classified}/${result.sent} classified${dryRun ? ' (dry run, nothing written)' : `, ${result.written} written`}, ` +
      `${result.failedBatches} failed batch(es), ${result.leftForNextRun} left for the next run, ` +
      `signals ${dryRun ? 'stale on' : 'refreshed on'} ${result.signalsRefreshed} unchanged row(s). ` +
      `Tokens in ${result.usage.inputTokens.toLocaleString('en-US')} / out ${result.usage.outputTokens.toLocaleString('en-US')}.`,
  );
  return result;
}
