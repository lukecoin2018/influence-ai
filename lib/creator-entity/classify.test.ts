import { describe, expect, it } from 'vitest';
import { buildInputs, hashInputs, parseJsonArray, signalsDiffer, validateVerdicts } from './classify';
import { computeSignals } from './heuristics';
import type { CreatorRecord } from './load';

const record: CreatorRecord = {
  creatorId: 'c1',
  displayName: '  Rel Beauty ',
  alias: null,
  profile: {
    platform: 'instagram',
    handle: 'relbeauty',
    followerCount: 59253,
    bio: 'clean beauty',
    website: 'https://relbeauty.com',
    bioLink: null,
    summary: 'x'.repeat(900),
    isBusinessAccount: true,
    category: 'None,Health/beauty',
  },
};

describe('buildInputs', () => {
  it('builds the record the model sees, with follower_count as a number and the summary capped', () => {
    const inputs = buildInputs(record, computeSignals(record));
    expect(inputs).toMatchObject({
      platform: 'instagram',
      handle: 'relbeauty',
      display_name: 'Rel Beauty',
      follower_count: 59253,
      category: 'Health/beauty',
      is_business_account: true,
      link_domain: 'relbeauty.com',
    });
    expect(typeof inputs.follower_count).toBe('number');
    expect(Array.from(inputs.summary ?? '').length).toBe(801); // 800 + the ellipsis
  });

  it('nulls the Instagram-only fields for TikTok', () => {
    const tiktok: CreatorRecord = { ...record, profile: { ...record.profile!, platform: 'tiktok', category: null, isBusinessAccount: null } };
    const inputs = buildInputs(tiktok, computeSignals(tiktok));
    expect(inputs.is_business_account).toBeNull();
    expect(inputs.category).toBeNull();
  });
});

describe('hashInputs', () => {
  it('is stable across key order and changes when any input changes', () => {
    const inputs = buildInputs(record, computeSignals(record));
    const reordered = Object.fromEntries(Object.entries(inputs).reverse()) as typeof inputs;
    expect(hashInputs(reordered)).toBe(hashInputs(inputs));
    expect(hashInputs({ ...inputs, follower_count: 59254 })).not.toBe(hashInputs(inputs));
  });
});

describe('validateVerdicts', () => {
  it('accepts a complete, valid reply', () => {
    const { verdicts, problems } = validateVerdicts(
      [
        { id: 'r1', entity_type: 'brand', confidence: 'high', reason: 'Bio names the company.' },
        { id: 'r2', entity_type: 'creator', confidence: 'medium', reason: 'Personal\nvlog.' },
      ],
      ['r1', 'r2'],
    );
    expect(problems).toEqual([]);
    expect(verdicts.get('r2')).toEqual({ entityType: 'creator', confidence: 'medium', reason: 'Personal vlog.' });
  });

  it('reports missing, unknown, duplicate and invalid entries, keeping the valid ones', () => {
    const { verdicts, problems } = validateVerdicts(
      [
        { id: 'r1', entity_type: 'brand', confidence: 'high', reason: 'ok' },
        { id: 'r1', entity_type: 'brand', confidence: 'high', reason: 'dup' },
        { id: 'r9', entity_type: 'brand', confidence: 'high', reason: 'unknown id' },
        { id: 'r2', entity_type: 'celebrity', confidence: 'high', reason: 'not a type here' },
      ],
      ['r1', 'r2', 'r3'],
    );
    expect([...verdicts.keys()]).toEqual(['r1']);
    expect(problems).toEqual(['duplicate id r1', 'unknown id "r9"', 'r2: invalid entity_type "celebrity"', 'r3: missing']);
  });

  it('rejects a reply that is not an array', () => {
    expect(validateVerdicts({ id: 'r1' }, ['r1']).problems).toEqual(['response is not a JSON array']);
  });
});

describe('parseJsonArray', () => {
  it('recovers an array wrapped in prose or fences', () => {
    expect(parseJsonArray('Here you go:\n```json\n[{"id":"r1"}]\n```')).toEqual([{ id: 'r1' }]);
    expect(() => parseJsonArray('no json here')).toThrow();
  });
});

describe('signalsDiffer', () => {
  it('ignores jsonb key order and notices a changed flag or count', () => {
    const computed = computeSignals(record);
    const reordered = JSON.parse(JSON.stringify(computed.signals, Object.keys(computed.signals).reverse()));
    expect(signalsDiffer({ signals: reordered, flag_count: computed.flagCount }, computed)).toBe(false);
    expect(signalsDiffer({ signals: { ...computed.signals, alias_match: !computed.signals.alias_match }, flag_count: computed.flagCount }, computed)).toBe(true);
    expect(signalsDiffer({ signals: computed.signals, flag_count: computed.flagCount + 1 }, computed)).toBe(true);
    expect(signalsDiffer({ signals: {}, flag_count: computed.flagCount }, computed)).toBe(true);
  });
});
