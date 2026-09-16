import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'react-email';

/**
 * The confirmation a brand receives after filing an inquiry, sent from
 * app/api/inquiries/route.ts. Ported from the inline HTML that used to go out
 * over Gmail SMTP with two deliberate copy changes (decided 2026-09-14):
 *
 *  - the dashboard link now points at `${SITE_URL}/dashboard`; it used to be
 *    the stale https://influenceit.vercel.app hostname
 *  - the sentence promising a reply "within 24 hours" is gone — nothing in the
 *    product enforces that, and we don't promise what we can't do
 */

export type BrandInquiryConfirmationProps = {
  greetingName?: string | null;
  creatorHandle: string;
  campaignType?: string | null;
  budgetRange?: string | null;
  timeline?: string | null;
  dashboardUrl: string;
};

export function brandInquiryConfirmationSubject(creatorHandle: string): string {
  return `Inquiry Confirmed: @${creatorHandle}`;
}

export function BrandInquiryConfirmation(props: BrandInquiryConfirmationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`We've received your inquiry about working with @${props.creatorHandle}.`}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Section style={{ background: '#FFD700', color: 'white', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Heading as="h1" style={{ margin: 0, fontSize: '20px' }}>Inquiry Received</Heading>
          </Section>
          <Section style={{ background: '#f9fafb', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '0 0 8px 8px' }}>
            <Text>Hi {props.greetingName},</Text>
            <Text>We&apos;ve received your inquiry about working with <strong>@{props.creatorHandle}</strong>.</Text>
            <Text style={{ marginTop: '20px' }}>
              <strong>Campaign Type:</strong> {props.campaignType || 'Not specified'}<br />
              <strong>Budget:</strong> {props.budgetRange || 'Not specified'}<br />
              <strong>Timeline:</strong> {props.timeline || 'Not specified'}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
              You can view your inquiries anytime in your{' '}
              <Link href={props.dashboardUrl} style={{ color: '#FFD700' }}>dashboard</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BrandInquiryConfirmation;
