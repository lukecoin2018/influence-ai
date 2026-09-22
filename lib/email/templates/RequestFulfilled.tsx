import { Body, Button, Container, Head, Hr, Html, Preview, Text } from 'react-email';

/**
 * Sent once per request, ever, from the fulfil pass in
 * app/api/cron/verification-nudge/route.ts, when a handle someone asked for
 * has appeared in `creators`.
 *
 * "If we add @handle, you'll get one more email" — RequestReceived's only
 * promise — is this email. Claim-then-send, like the nudge: the row is flipped
 * to 'added' before the send, so a failure loses the mail rather than risking
 * a second one.
 *
 * The last line matters. A request can be made by anyone who knows a handle,
 * including someone who is not that creator, so this may land in an inbox that
 * never asked for it.
 *
 * Same visual rules as CreatorApproved.tsx: flat, no images, no tracking
 * pixels, solid gold button (#FFD700 fill, #3A3A3A text — --color-lmg-gold and
 * --color-lmg-grey in app/globals.css).
 */

export const requestFulfilledSubject = (handle: string) => `@${handle} is now on InfluenceIT`;

export type RequestFulfilledProps = {
  handle: string;
  claimUrl: string;
};

const GOLD = '#FFD700';
const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function RequestFulfilled({ handle, claimUrl }: RequestFulfilledProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Claim your profile to unlock the creator dashboard.</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>Hi,</Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>
            Good news: @{handle} is now in the InfluenceIT database.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>
            Claim your profile to unlock the creator dashboard: brands hiring in your niche, media kit upload, and direct outreach.
          </Text>
          <Button
            href={claimUrl}
            style={{ backgroundColor: GOLD, color: GREY, fontSize: '15px', fontWeight: 600, textDecoration: 'none', borderRadius: '8px', padding: '12px 20px', display: 'inline-block' }}
          >
            Claim your profile
          </Button>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '24px 0 16px' }}>
            If you didn&apos;t request this, just ignore this email.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>— The InfluenceIT team</Text>
          <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 16px' }} />
          <Text style={{ fontSize: '12px', lineHeight: '18px', color: MUTED, margin: 0 }}>
            You&apos;re receiving this because this address was used to request a listing on influenceit.app.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RequestFulfilled;
