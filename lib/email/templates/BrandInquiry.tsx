import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'react-email';

/**
 * The admin notification for a brand → creator inquiry, sent to ADMIN_EMAIL
 * from app/api/inquiries/route.ts. A 1:1 port of the inline HTML string that
 * used to go out over Gmail SMTP: same fields, same subject pattern, same
 * colours. The only change is structural — JSX renders a missing value as
 * nothing where the template literal rendered the word "undefined".
 */

export type BrandInquiryProps = {
  companyName?: string | null;
  contactName?: string | null;
  brandEmail?: string | null;
  industry?: string | null;
  creatorHandle: string;
  creatorName: string;
  creatorFollowers: number;
  creatorPlatform: string;
  campaignType?: string | null;
  budgetRange?: string | null;
  timeline?: string | null;
  message: string;
};

export function brandInquirySubject(companyName: string | null | undefined, creatorHandle: string): string {
  return `New Inquiry: ${companyName} → @${creatorHandle}`;
}

const h2 = { color: '#FFD700', marginTop: 0 } as const;
const p = { margin: '0 0 8px' } as const;
const hr = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' } as const;

export function BrandInquiry(props: BrandInquiryProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New inquiry from ${props.companyName ?? 'a brand'} for @${props.creatorHandle}`}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Section style={{ background: '#FFD700', color: 'white', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Heading as="h1" style={{ margin: 0, fontSize: '20px' }}>New Creator Inquiry</Heading>
          </Section>
          <Section style={{ background: '#f9fafb', padding: '20px', border: '1px solid #e5e7eb' }}>
            <Heading as="h2" style={h2}>Brand</Heading>
            <Text style={p}><strong>Company:</strong> {props.companyName}</Text>
            <Text style={p}><strong>Contact:</strong> {props.contactName || 'Not provided'}</Text>
            <Text style={p}><strong>Email:</strong> {props.brandEmail}</Text>
            <Text style={p}><strong>Industry:</strong> {props.industry || 'Not specified'}</Text>
            <Hr style={hr} />
            <Heading as="h2" style={{ color: '#FFD700' }}>Creator</Heading>
            <Text style={p}><strong>Handle:</strong> @{props.creatorHandle}</Text>
            <Text style={p}><strong>Name:</strong> {props.creatorName}</Text>
            <Text style={p}><strong>Followers:</strong> {props.creatorFollowers.toLocaleString()}</Text>
            <Text style={p}><strong>Platform:</strong> {props.creatorPlatform}</Text>
            <Hr style={hr} />
            <Heading as="h2" style={{ color: '#FFD700' }}>Inquiry Details</Heading>
            <Text style={p}><strong>Campaign Type:</strong> {props.campaignType || 'Not specified'}</Text>
            <Text style={p}><strong>Budget Range:</strong> {props.budgetRange || 'Not specified'}</Text>
            <Text style={p}><strong>Timeline:</strong> {props.timeline || 'Not specified'}</Text>
            <Section style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '12px' }}>
              <Text style={{ margin: 0, color: '#374151' }}>{props.message}</Text>
            </Section>
          </Section>
          <Section style={{ background: '#f3f4f6', padding: '16px', borderRadius: '0 0 8px 8px', border: '1px solid #e5e7eb', borderTop: 'none', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            <Text style={{ margin: 0 }}>InfluenceIT Platform</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BrandInquiry;
