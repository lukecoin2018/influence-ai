'use client';

// app/creator-dashboard/verify/page.tsx
// Verification page for creators who clicked "I'll do this later"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { HtmlLangSync } from '@/app/claim/[handle]/_HtmlLangSync';
import type { Locale } from '@/app/claim/[handle]/_strings';
import { getAuthStrings } from '@/lib/i18n/auth-strings';

/**
 * creator_profiles.locale is nullable — NULL means "unknown", which covers
 * every row claimed before the locale plumbing landed, plus any claim where
 * the param didn't survive. Those read as 'en'.
 */
function localeFromRecord(raw: string | null | undefined): Locale {
  return raw === 'es' ? 'es' : 'en';
}

export default function VerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  // Read back from the creator record, not from a URL — this page is reached
  // long after the claim link is gone.
  const [locale, setLocale] = useState<Locale>('en');
  // Client component, so it resolves its own strings rather than receiving them
  // as a prop — function-valued entries don't cross the server/client boundary.
  const t = getAuthStrings(locale);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUserId(user.id);

      // Get creator profile
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select(
          'claim_status, verification_code, verification_code_expires_at, creator_id, locale'
        )
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/creator-dashboard');
        return;
      }

      // Before the already-verified early return below, so the <html lang>
      // signal is set on that branch too. Kept in a local as well as state:
      // `t` in this closure is the value from the render that mounted this
      // effect, so it is still 'en' here even after setLocale — anything shown
      // from inside load() has to resolve its strings from this local.
      const nextLocale = localeFromRecord(profile.locale);
      setLocale(nextLocale);

      // Already verified
      if (profile.claim_status === 'verified') {
        setAlreadyVerified(true);
        setLoading(false);
        return;
      }

      // Get handle and platform from social_profiles
      if (profile.creator_id) {
        const { data: socialProfile } = await supabase
          .from('social_profiles')
          .select('handle, platform')
          .eq('creator_id', profile.creator_id)
          .limit(1)
          .single();

        if (socialProfile) {
          setHandle(socialProfile.handle ?? '');
          setPlatform(socialProfile.platform ?? 'instagram');
        }
      }

      // Regenerate code if expired or missing
      const isExpired =
        !profile.verification_code ||
        (profile.verification_code_expires_at &&
          new Date(profile.verification_code_expires_at) < new Date());

      if (isExpired) {
        // No body: the endpoint resolves whose code to mint from the session
        // cookie, so there is nothing here a caller could point at another row.
        const res = await fetch('/api/creators/regenerate-code', { method: 'POST' });
        const data = await res.json().catch(() => null);

        if (res.ok && data?.code) {
          setCode(data.code);
        } else {
          // Previously this failure was invisible: res.ok went unchecked, so a
          // 400 left `code` empty and the box showed its loading placeholder
          // for good, with no explanation and both buttons disabled.
          setVerifyError(getAuthStrings(nextLocale).errors.codeRegenerationFailed);
        }
      } else {
        setCode(profile.verification_code ?? '');
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleVerify() {
    setVerifying(true);
    setVerifyError('');

    const res = await fetch('/api/creators/verify-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorProfileId: userId,
        handle,
        platform,
        code,
      }),
    });

    const data = await res.json();
    setVerifying(false);

    if (data.verified) {
      window.location.href = '/creator-dashboard';
      return;
    }

    setVerifyError(
      data.message ?? data.error ?? t.errors.verificationFailed
    );
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#9CA3AF' }}>{t.common.loading}</p>
      </div>
    );
  }

  if (alreadyVerified) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <HtmlLangSync lang={locale} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#3A3A3A',
              margin: '0 0 8px 0',
            }}
          >
            {t.standaloneVerify.alreadyVerifiedTitle}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#6B7280',
              margin: '0 0 20px 0',
            }}
          >
            {t.standaloneVerify.alreadyVerifiedBody}
          </p>
          <Link
            href="/creator-dashboard"
            style={{
              color: '#FFD700',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {t.standaloneVerify.goToDashboard} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <HtmlLangSync lang={locale} />
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              fontSize: '22px',
              fontWeight: 800,
              color: '#FFD700',
              letterSpacing: '-0.02em',
            }}
          >
            InfluenceIT
          </Link>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔐</div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#3A3A3A',
                margin: '0 0 6px 0',
              }}
            >
              {t.standaloneVerify.title}
            </h1>
            {handle && (
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                {t.standaloneVerify.subtitle(handle)}
              </p>
            )}
          </div>

          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px 0' }}>
            {t.bioCode.addCodePrompt(
              platform === 'instagram' ? 'Instagram' : 'TikTok'
            )}
          </p>

          {/* Code display */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '2px dashed #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#3A3A3A',
                letterSpacing: '0.08em',
                fontFamily: 'monospace',
              }}
            >
              {code || t.common.loading}
            </div>
          </div>

          <button
            onClick={copyCode}
            disabled={!code}
            style={{
              width: '100%',
              padding: '9px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            {copied ? `✓ ${t.bioCode.copied}` : `📋 ${t.bioCode.copyCode}`}
          </button>

          {/* Instructions */}
          <div
            style={{
              backgroundColor: '#EBF7FF',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <ol
              style={{
                margin: 0,
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {platform === 'instagram' ? (
                <>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.instagram.openProfile}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.instagram.pasteCode}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.instagram.save}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.comeBack}
                  </li>
                </>
              ) : (
                <>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.tiktok.openProfile}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.tiktok.pasteCode}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.tiktok.save}
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    {t.bioCode.comeBack}
                  </li>
                </>
              )}
            </ol>
            <p
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '10px 0 0 0',
              }}
            >
              {t.standaloneVerify.codeNote}
            </p>
          </div>

          {verifyError && (
            <p
              style={{
                fontSize: '13px',
                color: '#DC2626',
                margin: '0 0 12px 0',
                padding: '10px',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
              }}
            >
              {verifyError}
            </p>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying || !code}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#FFD700',
              color: '#3A3A3A',
              fontSize: '15px',
              fontWeight: 600,
              cursor: verifying ? 'not-allowed' : 'pointer',
              opacity: verifying ? 0.7 : 1,
              marginBottom: '10px',
            }}
          >
            {verifying ? t.bioCode.verifying : t.bioCode.verifyButton}
          </button>

          <Link
            href="/creator-dashboard"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
              color: '#6B7280',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {t.standaloneVerify.backToDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}
