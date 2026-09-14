import { Body, Button, Container, Head, Hr, Html, Preview, Text } from '@react-email/components';

/**
 * Sent once, from app/api/admin/creators/status/route.ts, when a creator's
 * claim goes from anything else to 'verified'. Reject sends nothing.
 *
 * Flat, no gradients, no images, no tracking pixels. The button is the solid
 * gold the dashboard's "View Profile" uses (app/compare/page.tsx:283):
 * #FFD700 fill, #3A3A3A text — --color-lmg-gold and --color-lmg-grey in
 * app/globals.css.
 */

export const CREATOR_APPROVED_SUBJECT = "You're verified on InfluenceIT";

export type CreatorApprovedProps = {
  firstName?: string;
  dashboardUrl: string;
};

const GOLD = '#FFD700';
const GREY = '#3A3A3A';
const MUTED = '#6B7280';

export function CreatorApproved({ firstName, dashboardUrl }: CreatorApprovedProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your creator profile on InfluenceIT has been verified.</Preview>
      <Body style={{ backgroundColor: '#FFFFFF', margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: GREY }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>Hi {firstName || 'there'},</Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>
            Your creator profile on InfluenceIT has been verified. Your dashboard is now unlocked: see which brands are hiring in your niche, upload your media kit, and reach out directly.
          </Text>
          <Button
            href={dashboardUrl}
            style={{ backgroundColor: GOLD, color: GREY, fontSize: '15px', fontWeight: 600, textDecoration: 'none', borderRadius: '8px', padding: '12px 20px', display: 'inline-block' }}
          >
            Open your dashboard
          </Button>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '24px 0 16px' }}>
            If anything looks wrong on your profile, just reply to this email.
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 24px' }}>— The InfluenceIT team</Text>
          <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 16px' }} />
          <Text style={{ fontSize: '12px', lineHeight: '18px', color: MUTED, margin: 0 }}>
            You&apos;re receiving this because you claimed your creator profile on influenceit.app.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default CreatorApproved;
