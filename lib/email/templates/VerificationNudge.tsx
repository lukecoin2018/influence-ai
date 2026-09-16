import { Body, Button, Container, Head, Hr, Html, Preview, Text } from 'react-email';

/**
 * Sent once per profile, from app/api/cron/verification-nudge/route.ts, to a
 * creator who claimed a profile, was issued a bio-verification code, and let
 * it expire unused. The button lands on /creator-dashboard/verify, which
 * mints a fresh code on load when the stored one has expired.
 *
 * Same visual rules as CreatorApproved.tsx: flat, no images, no tracking
 * pixels, solid gold button (#FFD700 fill, #3A3A3A text — --color-lmg-gold
 * and --color-lmg-grey in app/globals.css).
 */

export const VERIFICATION_NUDGE_SUBJECT = 'Your InfluenceIT verification code expired';

export type VerificationNudgeProps = {
  firstName?: string;
  handle?: string;
  verifyUrl: string;
};

const GOLD = '#FFD700';
const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function VerificationNudge({ firstName, handle, verifyUrl }: VerificationNudgeProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your verification code expired before it was confirmed. Get a new one in about a minute.</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>Hi {firstName || 'there'},</Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>
            You claimed {handle ? `the profile @${handle}` : 'your creator profile'} on InfluenceIT, but the verification code expired before it was confirmed, so the profile is still pending.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>
            Finishing takes about a minute: request a new code and paste the short line we show you into your bio. Once it&apos;s picked up, you can remove it again and your dashboard unlocks — brands hiring in your niche, media kit upload, and direct outreach.
          </Text>
          <Button
            href={verifyUrl}
            style={{ backgroundColor: GOLD, color: GREY, fontSize: '15px', fontWeight: 600, textDecoration: 'none', borderRadius: '8px', padding: '12px 20px', display: 'inline-block' }}
          >
            Get a new code
          </Button>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '24px 0 16px' }}>
            If you didn&apos;t make this claim, or want it removed, just reply to this email.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>— The InfluenceIT team</Text>
          <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 16px' }} />
          <Text style={{ fontSize: '12px', lineHeight: '18px', color: MUTED, margin: 0 }}>
            You&apos;re receiving this because you started a profile claim on influenceit.app.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerificationNudge;
