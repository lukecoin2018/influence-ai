'use client';

// components/creator-dashboard/AccountLoadError.tsx
//
// The inline state a dashboard page renders when AuthContext could not
// determine who is signed in: `userRole` is undefined and `authError` is set.
//
// It exists to replace a redirect. Before this, a failed user_roles lookup
// resolved as "no role" (context/AuthContext.tsx discarded the query error) and
// app/creator-dashboard/page.tsx read that as "not a creator", sending a
// verified creator to the brand dashboard after a 30-second "Loading...". A
// failed check is not a finding about the account, so the page now says so and
// offers to try again instead of guessing.
//
// `onRetry` defaults to AuthContext's retryAuth(), which re-runs the whole
// session + profile load. A caller with a narrower failure (Brands Hiring's own
// fetch) passes its own retry and its own message.

import { useAuth } from '@/context/AuthContext';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';
import type { Locale } from '@/app/claim/[handle]/_strings';

interface AccountLoadErrorProps {
  locale: Locale;
  /** Overrides the default "Couldn't load your account." line. */
  message?: string;
  /** Overrides the default retryAuth(). */
  onRetry?: () => void;
}

export function AccountLoadError({ locale, message, onRetry }: AccountLoadErrorProps) {
  const { retryAuth } = useAuth();
  const t = getDashboardStrings(locale).common;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 14px 0' }}>{message ?? t.accountLoadFailed}</p>
        <button
          type="button"
          onClick={onRetry ?? retryAuth}
          style={{
            padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '13px', fontWeight: 700,
          }}
        >
          {t.retry}
        </button>
      </div>
    </div>
  );
}
