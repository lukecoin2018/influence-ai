import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render } from 'react-email';
import { HomepageSnapshotAlert } from '@/lib/email/templates/HomepageSnapshotAlert';
import type { AlertRun, StaleState } from './health-rules';

/** The alert email renders, and its plain-text body carries what it is for. */

const run: AlertRun = {
  id: 41,
  trigger: 'request',
  startedAt: '2026-10-14T12:20:01.000Z',
  outcome: 'failed',
  reason: '57014: canceling statement due to statement timeout',
  durationMs: 55012,
};
const stale: StaleState = { computedAt: '2026-10-13T22:17:03.000Z', ageHours: 14.2, readError: null };

describe('HomepageSnapshotAlert', () => {
  it('lists the run, the staleness and the two SQL lines', async () => {
    const text = await render(createElement(HomepageSnapshotAlert, { runs: [run], stale }), { plainText: true });
    expect(text).toContain('#41 failed');
    expect(text).toContain('request · 2026-10-14 12:20 UTC · 55.0 s');
    expect(text).toContain('57014: canceling statement due to statement timeout');
    expect(text).toContain('last computed 14 hours ago (2026-10-13 22:17 UTC)');
    expect(text).toContain("select request_homepage_refresh('manual');");
    expect(text).toContain('from homepage_snapshot_runs');
  });

  it('renders a staleness-only alert, including an unreadable row', async () => {
    const text = await render(
      createElement(HomepageSnapshotAlert, { runs: [], stale: { computedAt: null, ageHours: null, readError: 'relation does not exist' } }),
      { plainText: true },
    );
    expect(text).toContain('The snapshot row could not be read: relation does not exist');
    expect(text).not.toContain('did not save');
  });
});
