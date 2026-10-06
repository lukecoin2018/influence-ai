import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from 'next/constants';
import { buildOnlyFallback, isBuildPhase } from './buildOnlyFallback';

const env = (phase?: string): NodeJS.ProcessEnv => ({ NODE_ENV: 'production', ...(phase ? { NEXT_PHASE: phase } : {}) });
const build = env(PHASE_PRODUCTION_BUILD);
const server = env(PHASE_PRODUCTION_SERVER);
const unset = env();

afterEach(() => vi.restoreAllMocks());

describe('isBuildPhase', () => {
  it('is true only while next build prerenders', () => {
    expect(isBuildPhase(build)).toBe(true);
    expect(isBuildPhase(server)).toBe(false);
    expect(isBuildPhase(unset)).toBe(false);
  });
});

describe('buildOnlyFallback', () => {
  const error = Object.assign(new Error('public_stats() failed: canceling statement due to statement timeout'), { name: 'Error' });

  it('returns the fallback during next build, so a slow database cannot fail a deploy', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(buildOnlyFallback('getPublicStats', { creators: 1 }, build)(error)).toEqual({ creators: 1 });
    expect(log.mock.calls[0][0]).toContain('[home] getPublicStats failed, using fallback (build)');
  });

  it('rethrows during a revalidation, so Next keeps the last good page', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => buildOnlyFallback('getPublicStats', { creators: 1 }, server)(error)).toThrow(error);
    expect(() => buildOnlyFallback('getTopCreators(tiktok)', [], unset)(error)).toThrow(error);
    expect(log.mock.calls[0][0]).toContain('keeping the last good page (revalidation)');
  });

  it('logs what failed and why', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    buildOnlyFallback('getTopCreators(instagram)', [], build)(Object.assign(new Error('Timed out after 30000ms'), { name: 'TimeoutError' }));
    expect(log.mock.calls[0][0]).toBe('[home] getTopCreators(instagram) failed, using fallback (build) — TimeoutError: Timed out after 30000ms');
  });
});
