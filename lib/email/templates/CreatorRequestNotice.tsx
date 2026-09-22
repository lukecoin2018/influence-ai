import { Body, Container, Head, Html, Link, Preview, Text } from 'react-email';
import { platformLabel, profileUrl } from '@/lib/creator-requests/shared';

/**
 * The admin half of a creator request: one line per fact, to ADMIN_EMAIL, with
 * the creator's address as Reply-To so answering from the admin inbox reaches
 * them directly — the same arrangement BrandInquiry.tsx uses.
 *
 * Contains exactly what the queue at /admin/creators shows, so the mail is
 * actionable without opening the queue. The profile link is there because the
 * first thing to do with a request is look at the account, and the platform is
 * spelled out because it decides which scraper the handle goes into — the two
 * are not interchangeable, and the URL shapes differ (TikTok carries the @ in
 * the path). Both come from lib/creator-requests/shared.ts so this mail and
 * the queue can never disagree about either.
 */

export const creatorRequestNoticeSubject = (handle: string) => `Creator request: @${handle}`;

export type CreatorRequestNoticeProps = {
  handle: string;
  /** 'instagram' | 'tiktok' — the stored value, not a label. */
  platform: string;
  email: string;
  source: string;
  note?: string | null;
};

const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function CreatorRequestNotice({ handle, platform, email, source, note }: CreatorRequestNoticeProps) {
  const url = profileUrl(platform, handle);
  return (
    <Html lang="en">
      <Head />
      {/* The platform is in the preview line because it is what decides
          whether this request is actionable at a glance. */}
      <Preview>{`@${handle} on ${platformLabel(platform)} asked to be added (${source}).`}</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>
            <strong>@{handle}</strong> asked to be added to the database.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 4px' }}>
            Platform: <strong>{platformLabel(platform)}</strong>
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 4px' }}>
            Profile:{' '}
            <Link href={url} style={{ color: GREY }}>
              {url.replace('https://', '')}
            </Link>
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 4px' }}>Email: {email}</Text>
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }}>Source: {source}</Text>
          {note ? (
            <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 16px', color: MUTED }}>
              Note: {note}
            </Text>
          ) : null}
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: 0, color: MUTED }}>
            Decline or mark added in /admin/creators. Marking added is not what sends the creator their claim link — the daily cron does that once the handle actually appears in the database.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default CreatorRequestNotice;
