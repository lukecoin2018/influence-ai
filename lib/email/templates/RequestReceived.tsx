import { Body, Container, Head, Hr, Html, Preview, Text } from 'react-email';

/**
 * Sent once, from app/api/creators/request/route.ts, to a creator who asked to
 * be added to the database.
 *
 * Deliberately promises nothing. We review by hand, we add creators who fit,
 * and we do not commit to adding this one — the copy that this whole feature
 * replaces ("we'll add you to our database and notify you when your profile is
 * ready") is exactly the promise the product cannot keep. The only forward
 * commitment here is conditional: IF we add the handle, one more email
 * follows. That one is RequestFulfilled, and the cron pass is what sends it.
 *
 * Same visual rules as CreatorApproved.tsx and VerificationNudge.tsx: flat, no
 * images, no tracking pixels. No button — there is nothing for the creator to
 * do, and a button would imply there is.
 */

export const requestReceivedSubject = (handle: string) => `We got your request, @${handle}`;

export type RequestReceivedProps = {
  handle: string;
};

const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function RequestReceived({ handle }: RequestReceivedProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>We review every request by hand. Nothing to do now.</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>Hi,</Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>
            Thanks for asking to be added to InfluenceIT. We review every request by hand and add Instagram creators who fit the database.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>
            If we add @{handle}, you&apos;ll get one more email with a link to claim your profile. No need to do anything now.
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

export default RequestReceived;
