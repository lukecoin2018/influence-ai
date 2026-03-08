import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | InfluenceIT',
  description: 'Privacy Policy for InfluenceIT — the influencer-brand marketplace.',
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}>

        <Link href="/" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
          ← Back to InfluenceIT
        </Link>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 48px 0' }}>
          Last updated: March 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

          <Section title="1. Introduction">
            InfluenceIT ("we", "our", "us") operates the website influenceit.app. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform. By using InfluenceIT, you agree to the collection and use of information in accordance with this policy.
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following types of information:</p>
            <ul>
              <li><strong>Account information:</strong> Email address, password, company name, and contact details provided during signup.</li>
              <li><strong>Creator profile data:</strong> Publicly available social media profile information including handles, follower counts, engagement rates, and bio content scraped from Instagram and TikTok.</li>
              <li><strong>Usage data:</strong> Information about how you interact with our platform, including pages visited, tools used, and features accessed.</li>
              <li><strong>Communications:</strong> Messages and inquiries sent through the platform between brands and creators.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li>To provide and operate the InfluenceIT platform</li>
              <li>To verify creator profile ownership through our bio verification system</li>
              <li>To connect brands with relevant creators</li>
              <li>To improve and personalise your experience</li>
              <li>To send important service notifications</li>
              <li>To prevent fraud and maintain platform security</li>
            </ul>
          </Section>

          <Section title="4. Creator Profile Data">
            InfluenceIT aggregates publicly available data from social media platforms including Instagram and TikTok. This data includes profile information, follower statistics, and engagement metrics that are publicly visible. If you are a creator and wish to have your data removed from our platform, please contact us at the email address below.
          </Section>

          <Section title="5. Data Sharing">
            We do not sell your personal information to third parties. We may share data with:
            <ul>
              <li><strong>Service providers:</strong> Third-party services that help us operate the platform (e.g. Supabase for database hosting, Apify for data collection).</li>
              <li><strong>Other platform users:</strong> Brand profiles are visible to creators and vice versa as part of normal platform operation.</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our legal rights.</li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            We retain your personal data for as long as your account is active. If you delete your account, we will remove your personal information within 30 days, except where retention is required by law.
          </Section>

          <Section title="7. Cookies">
            We use cookies and similar tracking technologies to maintain your session and improve platform functionality. You can control cookie settings through your browser, though disabling cookies may affect platform functionality.
          </Section>

          <Section title="8. Security">
            We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
          </Section>

          <Section title="9. Your Rights">
            Depending on your location, you may have the right to:
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
            To exercise any of these rights, please contact us at the address below.
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date.
          </Section>

          <Section title="11. Contact Us">
            If you have any questions about this Privacy Policy or how we handle your data, please contact us at:{' '}
            <a href="mailto:hello@influenceit.app" style={{ color: '#3AAFF4', textDecoration: 'none', fontWeight: 600 }}>
              hello@influenceit.app
            </a>
          </Section>

        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '16px' }}>
          <Link href="/terms" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none' }}>Terms of Service</Link>
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
