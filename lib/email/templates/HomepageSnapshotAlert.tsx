import { Body, Container, Head, Html, Preview, Text } from 'react-email';
import type { AlertRun, StaleState } from '@/lib/homepage-snapshot/health-rules';

/**
 * To ADMIN_EMAIL when a homepage snapshot refresh is refused or fails, or when
 * the snapshot is more than 12 hours old (lib/homepage-snapshot/health.ts).
 *
 * Says what the site is doing meanwhile — still serving the last good
 * snapshot — and gives the two SQL-editor lines that answer "what happened"
 * and "try again", so the mail is actionable without opening the repo.
 */

export type HomepageSnapshotAlertProps = {
  runs: AlertRun[];
  stale: StaleState | null;
};

const GREY = '#3A3A3A';
const MUTED = '#6B7280';

function utc(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function HomepageSnapshotAlert({ runs, stale }: HomepageSnapshotAlertProps) {
  const line = { fontSize: '14px', lineHeight: '22px', margin: '0 0 8px' };
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {runs.length > 0
          ? `${runs.length} homepage snapshot refresh${runs.length === 1 ? '' : 'es'} did not save.`
          : 'The homepage snapshot is out of date.'}
      </Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
          {runs.length > 0 ? (
            <>
              <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 12px' }}>
                {runs.length === 1 ? 'A refresh' : `${runs.length} refreshes`} of the homepage snapshot did not save:
              </Text>
              {runs.map((r) => (
                <Text key={r.id} style={line}>
                  <strong>#{r.id} {r.outcome}</strong> · {r.trigger} · {utc(r.startedAt)} · {(r.durationMs / 1000).toFixed(1)} s
                  <br />
                  {r.reason ?? 'no reason recorded'}
                </Text>
              ))}
            </>
          ) : null}
          {stale ? (
            <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '16px 0 12px' }}>
              {stale.readError
                ? `The snapshot row could not be read: ${stale.readError}`
                : stale.computedAt && stale.ageHours !== null
                  ? `The snapshot was last computed ${Math.floor(stale.ageHours)} hours ago (${utc(stale.computedAt)}). Refreshes are scheduled every 6 hours.`
                  : 'There is no snapshot row yet.'}
            </Text>
          ) : null}
          <Text style={{ ...line, margin: '16px 0 8px' }}>
            The homepage keeps showing the last snapshot that saved; nothing is replaced with made-up figures. It is only out of date.
          </Text>
          <Text style={{ ...line, color: MUTED }}>
            What happened: select id, trigger, outcome, reason, duration_ms from homepage_snapshot_runs order by id desc limit 10;
          </Text>
          <Text style={{ ...line, color: MUTED }}>
            Is pg_cron running: select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
          </Text>
          <Text style={{ ...line, color: MUTED, margin: 0 }}>
            Try again (runs within 5 minutes): select request_homepage_refresh(&apos;manual&apos;);
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default HomepageSnapshotAlert;
