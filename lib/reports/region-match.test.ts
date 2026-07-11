import { describe, expect, it } from 'vitest';
import { matchRegion } from './region-match';

describe('matchRegion', () => {
  it('matches a full country name against a brand region already stored as the same ISO2 code (real Shein shape)', () => {
    // Live-verified: Shein's regions include "BR" directly (from the 2b checkpoint).
    const result = matchRegion('Brazil', ['AR', 'BR', 'CA', 'CL', 'CO', 'DE', 'ES', 'GB', 'Italy', 'MX', 'US', 'ZA']);
    expect(result).toEqual({ label: 'Brazil' });
  });

  it('matches when the brand region is stored as a full name instead of a code (e.g. "Italy")', () => {
    expect(matchRegion('Italy', ['US', 'Italy'])).toEqual({ label: 'Italy' });
  });

  it('matches "UK" against "United Kingdom" via the GB alias', () => {
    expect(matchRegion('United Kingdom', ['UK'])).toEqual({ label: 'United Kingdom' });
    expect(matchRegion('United Kingdom', ['GB'])).toEqual({ label: 'United Kingdom' });
  });

  it('returns null (no tag, never a filter) when the creator has no country', () => {
    expect(matchRegion(null, ['US', 'BR'])).toBeNull();
  });

  it('returns null when the creator country has no entry in the map (unmapped, safe degrade)', () => {
    expect(matchRegion('Atlantis', ['US'])).toBeNull();
  });

  it('returns null when the country is real but the brand has no matching region', () => {
    expect(matchRegion('Japan', ['US', 'BR'])).toBeNull();
  });

  it('does not expand LATAM to member countries (explicit founder open item, not decided here)', () => {
    expect(matchRegion('Colombia', ['LATAM'])).toBeNull();
    expect(matchRegion('Colombia', ['CO'])).toEqual({ label: 'Colombia' });
  });
});
