import Link from 'next/link';
import type { BrandAccessState } from '@/lib/auth/server-guards';

/**
 * What a signed-in brand sees instead of the dashboard.
 *
 * A server component with no client JavaScript at all — every action is a
 * plain link. That is deliberate: this screen stands in front of an
 * unapproved account, so the less of the dashboard's machinery it needs, the
 * smaller the surface for something below it to mount by accident.
 *
 * ── ON THE COPY ────────────────────────────────────────────────────────────
 *
 * It deliberately does NOT say "we'll email you when you're approved".
 *
 * Approval currently records state and calls a notification hook that does not
 * send anything (lib/notifications/brand-approval.ts). Promising a message the
 * product cannot deliver is the exact failure already on the known-issues list
 * — copy telling a creator "we'll notify you when your profile is ready" when
 * no notification system exists. When real sending lands, this copy can gain
 * the promise, and not before.
 *
 * So it tells the brand what is true — a person reviews each application —
 * and gives them a way to reach one.
 */

const CONTACT_HREF = '/contact';

export default function BrandGateScreen({ state }: { state: Exclude<BrandAccessState, 'approved'> }) {
  // 'pending' and 'no_profile' read identically to the visitor. A brand whose
  // row was never written did apply — the signup simply failed underneath them
  // — so telling them their application is being looked at is accurate, and
  // "we have no record of you" would be both alarming and our fault.
  const underReview = state === 'pending' || state === 'no_profile';

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '44px 36px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '18px' }} aria-hidden="true">
            {underReview ? '⏳' : '🔒'}
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#3A3A3A',
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {underReview ? 'Your application is under review' : 'This account does not have access'}
          </h1>

          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 28px 0', lineHeight: 1.65 }}>
            {underReview
              ? 'We review each brand by hand before opening the creator database. Someone will look at your application shortly — get in touch if you would like to check on it.'
              : 'Your account is not currently able to use the brand dashboard. If you think that is a mistake, get in touch and we will take a look.'}
          </p>

          <Link
            href={CONTACT_HREF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#FFD700',
              color: '#3A3A3A',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Get in touch
          </Link>

          <div style={{ marginTop: '18px' }}>
            <Link href="/" style={{ fontSize: '13px', color: '#9CA3AF', textDecoration: 'none' }}>
              Back to site
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
