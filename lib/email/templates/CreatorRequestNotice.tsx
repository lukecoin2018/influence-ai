import { Body, Container, Head, Html, Link, Preview, Text } from 'react-email';

/**
 * The admin half of a creator request: one line per fact, to ADMIN_EMAIL, with
 * the creator's address as Reply-To so answering from the admin inbox reaches
 * them directly — the same arrangement BrandInquiry.tsx uses.
 *
 * Contains exactly what the queue at /admin/creators shows, so the mail is
 * actionable without opening the queue. The Instagram link is there because
 * the first thing to do with a request is look at the account.
 */

export const creatorRequestNoticeSubject = (handle: string) => `Creator request: @${handle}`;

export type CreatorRequestNoticeProps = {
  handle: string;
  email: string;
  source: string;
  note?: string | null;
};

const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function CreatorRequestNotice({ handle, email, source, note }: CreatorRequestNoticeProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`@${handle} asked to be added (${source}).`}</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>
            <strong>@{handle}</strong> asked to be added to the database.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '22px', margin: '0 0 4px' }}>
            Instagram:{' '}
            <Link href={`https://instagram.com/${handle}`} style={{ color: GREY }}>
              instagram.com/{handle}
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
