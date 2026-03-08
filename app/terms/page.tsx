import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | InfluenceIT',
  description: 'Terms of Service for InfluenceIT — the influencer-brand marketplace.',
};

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}>

        <Link href="/" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
          ← Back to InfluenceIT
        </Link>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 48px 0' }}>
          Last updated: March 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

          <Section title="1. Acceptance of Terms">
            By accessing or using InfluenceIT ("the platform", "we", "us") at influenceit.app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </Section>

          <Section title="2. Description of Service">
            InfluenceIT is a two-sided marketplace that connects brands with social media creators. We provide tools for creator discovery, campaign planning, rate calculation, negotiation assistance, and contract building. We do not participate in or guarantee the outcome of any deals made between brands and creators through our platform.
          </Section>

          <Section title="3. User Accounts">
            <ul>
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 18 years old to use the platform.</li>
              <li>One person or entity may not maintain more than one account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </Section>

          <Section title="4. Creator Profile Claims">
            Creators may claim profiles that have been aggregated from public social media data. By claiming a profile, you confirm that you are the rightful owner of the associated social media account. You agree to complete our bio verification process to prove ownership. Fraudulent claims are strictly prohibited and will result in immediate account termination.
          </Section>

          <Section title="5. Brand Accounts">
            Brands using InfluenceIT agree to:
            <ul>
              <li>Provide accurate company and contact information</li>
              <li>Use creator data only for legitimate campaign and partnership purposes</li>
              <li>Not misrepresent their identity or intentions when contacting creators</li>
              <li>Honour agreed payment terms in any deals made through the platform</li>
            </ul>
          </Section>

          <Section title="6. Token System">
            InfluenceIT operates a token-based system for accessing certain platform tools. Tokens are non-refundable once used. Free tokens may be granted upon signup or through platform actions and have no cash value. Purchased tokens (when available) are subject to our refund policy.
          </Section>

          <Section title="7. Prohibited Conduct">
            You agree not to:
            <ul>
              <li>Use the platform for any unlawful purpose</li>
              <li>Scrape, copy, or reproduce platform data without permission</li>
              <li>Attempt to gain unauthorised access to any part of the platform</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Submit false or misleading information</li>
              <li>Use automated tools to access the platform without our consent</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            All content, features, and functionality on InfluenceIT — including but not limited to text, graphics, logos, and software — are owned by InfluenceIT and protected by applicable intellectual property laws. Creator and brand profile data remains the property of the respective individuals and companies.
          </Section>

          <Section title="9. Disclaimer of Warranties">
            InfluenceIT is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the platform will be uninterrupted, error-free, or that any deals facilitated through the platform will be successful. Analytics and engagement data shown on the platform are estimates based on publicly available information and should not be relied upon as definitive figures.
          </Section>

          <Section title="10. Limitation of Liability">
            To the maximum extent permitted by law, InfluenceIT shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability to you for any claim shall not exceed the amount you have paid us in the twelve months preceding the claim.
          </Section>

          <Section title="11. Third-Party Services">
            The platform may integrate with or link to third-party services. We are not responsible for the content, privacy practices, or terms of any third-party services. Your use of third-party services is at your own risk.
          </Section>

          <Section title="12. Modifications to the Service">
            We reserve the right to modify, suspend, or discontinue any part of the platform at any time. We will provide reasonable notice of significant changes where possible. Continued use of the platform after changes constitutes acceptance of the new terms.
          </Section>

          <Section title="13. Governing Law">
            These Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through good-faith negotiation before pursuing formal legal action.
          </Section>

          <Section title="14. Contact Us">
            If you have any questions about these Terms of Service, please contact us at:{' '}
            <a href="mailto:hello@influenceit.app" style={{ color: '#3AAFF4', textDecoration: 'none', fontWeight: 600 }}>
              hello@influenceit.app
            </a>
          </Section>

        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '16px' }}>
          <Link href="/privacy" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none' }}>← Back to InfluenceIT</Link>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 12px 0' }}>{title}</h2>
      <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
}
