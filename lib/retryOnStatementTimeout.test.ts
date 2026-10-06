import { describe, expect, it, vi } from 'vitest';
import { STATEMENT_TIMEOUT_CODE, retryOnStatementTimeout } from './retryOnStatementTimeout';

const timeout = { data: null, error: { code: STATEMENT_TIMEOUT_CODE, message: 'canceling statement due to statement timeout' } };
const ok = { data: { creators: 7649 }, error: null };

function sequence(...results: { data: unknown; error: { code?: string; message?: string } | null }[]) {
  const calls = { count: 0 };
  const attempt = () => Promise.resolve(results[Math.min(calls.count++, results.length - 1)]);
  return { attempt, calls };
}

describe('retryOnStatementTimeout', () => {
  it('returns the first success without retrying', async () => {
    const { attempt, calls } = sequence(ok);
    expect(await retryOnStatementTimeout(attempt)).toBe(ok);
    expect(calls.count).toBe(1);
  });

  it('retries a statement timeout, as on a cold database (cancelled, cancelled, then fine)', async () => {
    const { attempt, calls } = sequence(timeout, timeout, ok);
    const onRetry = vi.fn();
    expect(await retryOnStatementTimeout(attempt, { attempts: 3, onRetry })).toBe(ok);
    expect(calls.count).toBe(3);
    expect(onRetry.mock.calls.map(([n]) => n)).toEqual([1, 2]);
  });

  it('gives up after `attempts` calls and returns the last timeout', async () => {
    const { attempt, calls } = sequence(timeout, timeout, timeout, ok);
    expect(await retryOnStatementTimeout(attempt, { attempts: 3 })).toBe(timeout);
    expect(calls.count).toBe(3);
  });

  it('does not retry any other error', async () => {
    const other = { data: null, error: { code: '42501', message: 'permission denied' } };
    const { attempt, calls } = sequence(other, ok);
    expect(await retryOnStatementTimeout(attempt)).toBe(other);
    expect(calls.count).toBe(1);
  });

  it('defaults to three attempts and never fewer than one', async () => {
    const three = sequence(timeout, timeout, timeout, ok);
    await retryOnStatementTimeout(three.attempt);
    expect(three.calls.count).toBe(3);
    const one = sequence(timeout, ok);
    await retryOnStatementTimeout(one.attempt, { attempts: 0 });
    expect(one.calls.count).toBe(1);
  });
});
