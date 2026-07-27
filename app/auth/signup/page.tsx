'use client';

// app/auth/signup/page.tsx
// Updated: Creator signup now includes bio verification step

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { HtmlLangSync } from '@/app/claim/[handle]/_HtmlLangSync';
import type { Locale } from '@/app/claim/[handle]/_strings';
import { getAuthStrings } from '@/lib/i18n/auth-strings';

type Role = 'brand' | 'creator' | null;
type Step = 'role' | 'form' | 'verify';

/**
 * The `locale` param arrives from /claim/[handle] or /es/claim/[handle] (see
 * signupHref in app/claim/[handle]/_teaser.tsx) and is untrusted URL input.
 * Anything that isn't exactly 'es' — absent, misspelled, a region tag like
 * 'es-ES', a repeated param — reads as 'en'. Never throws: a bad locale must
 * not be able to block a signup.
 */
function normalizeLocale(raw: string | null): Locale {
  return raw === 'es' ? 'es' : 'en';
}

function SignUpContent() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [step, setStep] = useState<Step>('role');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The locale the creator was shown on the claim teaser. Held here so it
  // survives the step: 'form' -> 'verify' transition, which stays on this same
  // URL rather than navigating.
  const [locale, setLocale] = useState<Locale>('en');
  // Client component, so it resolves its own strings rather than receiving them
  // as a prop — function-valued entries don't cross the server/client boundary.
  // Same approach as components/brand-matches/BrandMatchCard.tsx.
  const t = getAuthStrings(locale);

  // Pre-fill from URL params
  // (e.g. /auth/signup?handle=vikyvarga&role=creator&locale=es)
  const searchParams = useSearchParams();
  useEffect(() => {
    const handleParam = searchParams.get('handle');
    const roleParam = searchParams.get('role');

    if (handleParam) {
      setHandle(handleParam);
      checkHandle(handleParam);
    }
    if (roleParam === 'creator') {
      setRole('creator');
      setStep('form');
    }
    // Unconditional: normalizeLocale() folds absent/unknown values to 'en', so
    // there's no case where leaving the previous state in place is correct.
    setLocale(normalizeLocale(searchParams.get('locale')));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Brand fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  // Creator fields
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<
    'idle' | 'checking' | 'found' | 'not-found'
  >('idle');
  const [foundCreatorId, setFoundCreatorId] = useState<string | null>(null);
  const [foundPlatform, setFoundPlatform] = useState<'instagram' | 'tiktok'>(
    'instagram'
  );
  const [detectedEmail, setDetectedEmail] = useState<string | null>(null);

  // Verify step state
  const [verifyCode, setVerifyCode] = useState('');
  const [creatorProfileId, setCreatorProfileId] = useState('');
  const [verifyHandle, setVerifyHandle] = useState('');
  const [verifyPlatform, setVerifyPlatform] = useState<'instagram' | 'tiktok'>(
    'instagram'
  );
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [copied, setCopied] = useState(false);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Handle lookup ─────────────────────────────────────────────────────────
  async function checkHandle(value: string) {
    const cleaned = value.replace(/^@/, '').trim();
    setHandle(cleaned);
    if (!cleaned || cleaned.length < 2) {
      setHandleStatus('idle');
      return;
    }
    setHandleStatus('checking');

    const { data } = await supabase
      .from('social_profiles')
      .select('creator_id, detected_email, platform')
      .eq('handle', cleaned)
      .limit(1)
      .single();

    if (data) {
      setHandleStatus('found');
      setFoundCreatorId(data.creator_id);
      setDetectedEmail(data.detected_email ?? null);
      setFoundPlatform(data.platform ?? 'instagram');
    } else {
      setHandleStatus('not-found');
      setFoundCreatorId(null);
      setDetectedEmail(null);
    }
  }

  // ── Brand signup ──────────────────────────────────────────────────────────
  async function handleBrandSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? t.errors.signupFailed);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;
    await supabase.from('user_roles').insert({ user_id: userId, role: 'brand' });
    await supabase.from('brand_profiles').insert({
      id: userId,
      company_name: companyName,
      industry,
      status: 'approved',
      subscription_tier: 'trial',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    router.push('/dashboard');
  }

  // ── Creator signup → calls server-side claim route ────────────────────────
  async function handleCreatorSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (handleStatus === 'not-found') {
      setError(t.errors.handleNotIndexed);
      setLoading(false);
      return;
    }

    const res = await fetch('/api/creators/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        handle,
        creatorId: foundCreatorId,
        platform: foundPlatform,
        detectedEmail,
        locale,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? t.errors.signupFailed);
      setLoading(false);
      return;
    }

    // Sign in the user now that account has been created via admin client
    await supabase.auth.signInWithPassword({ email, password });

    // Email matched detected email — skip bio verification
    if (data.autoVerified) {
      window.location.href = '/creator-dashboard';
      return;
    }

    // Show bio verification step
    setVerifyCode(data.code);
    setCreatorProfileId(data.userId);
    setVerifyHandle(handle);
    setVerifyPlatform(data.platform);
    setStep('verify');
    setLoading(false);
  }

  // ── Bio verification ──────────────────────────────────────────────────────
  async function handleVerify() {
    setVerifying(true);
    setVerifyError('');

    const res = await fetch('/api/creators/verify-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorProfileId,
        handle: verifyHandle,
        platform: verifyPlatform,
        code: verifyCode,
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
    await navigator.clipboard.writeText(verifyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#3A3A3A',
    backgroundColor: 'white',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  };

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
      {/* Root layout hardcodes <html lang="en"> (app/layout.tsx) — this syncs
          the attribute to the locale carried over from the claim teaser. The
          page's copy is not translated in this phase; this is the plumbing
          signal only. */}
      <HtmlLangSync lang={locale} />
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
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

          {/* ── STEP 1: Role selector ──────────────────────────────────── */}
          {step === 'role' && (
            <>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#3A3A3A',
                  margin: '0 0 8px 0',
                  textAlign: 'center',
                }}
              >
                Join InfluenceIT
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  textAlign: 'center',
                  margin: '0 0 28px 0',
                }}
              >
                I am a...
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <RoleCard
                  selected={role === 'brand'}
                  onClick={() => setRole('brand')}
                  emoji="🏢"
                  title="Brand"
                  description="Find creators for campaigns"
                />
                <RoleCard
                  selected={role === 'creator'}
                  onClick={() => setRole('creator')}
                  emoji="✨"
                  title="Creator"
                  description="Claim your profile"
                />
              </div>

              <button
                onClick={() => {
                  if (role) setStep('form');
                }}
                disabled={!role}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: role ? '#FFD700' : '#E5E7EB',
                  color: role ? '#3A3A3A' : '#9CA3AF',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: role ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Continue →
              </button>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: '20px 0 0 0',
                }}
              >
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  style={{
                    color: '#FFD700',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Log in
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: Brand form ─────────────────────────────────────── */}
          {step === 'form' && role === 'brand' && (
            <>
              <button
                onClick={() => setStep('role')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#6B7280',
                  padding: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← Back
              </button>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#3A3A3A',
                  margin: '0 0 24px 0',
                }}
              >
                🏢 Create Brand Account
              </h1>

              <form
                onSubmit={handleBrandSignup}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input
                    style={inputStyle}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <select
                    style={inputStyle}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                  >
                    <option value="">Select industry</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Travel">Travel</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Tech">Tech</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Work Email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FFD700',
                    color: '#3A3A3A',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Creator form ───────────────────────────────────── */}
          {step === 'form' && role === 'creator' && (
            <>
              <button
                onClick={() => setStep('role')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#6B7280',
                  padding: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← {t.common.back}
              </button>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#3A3A3A',
                  margin: '0 0 6px 0',
                }}
              >
                ✨ {t.claimForm.title}
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: '0 0 24px 0',
                }}
              >
                {t.claimForm.subtitle}
              </p>

              <form
                onSubmit={handleCreatorSignup}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={labelStyle}>{t.claimForm.handleLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9CA3AF',
                        fontSize: '14px',
                      }}
                    >
                      @
                    </span>
                    <input
                      style={{
                        ...inputStyle,
                        paddingLeft: '28px',
                        borderColor:
                          handleStatus === 'found'
                            ? '#059669'
                            : handleStatus === 'not-found'
                            ? '#DC2626'
                            : '#E5E7EB',
                      }}
                      value={handle}
                      onChange={(e) => checkHandle(e.target.value)}
                      required
                      placeholder={t.claimForm.handlePlaceholder}
                    />
                  </div>
                  {handleStatus === 'checking' && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        margin: '4px 0 0 0',
                      }}
                    >
                      {t.claimForm.handleChecking}
                    </p>
                  )}
                  {handleStatus === 'found' && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#059669',
                        margin: '4px 0 0 0',
                      }}
                    >
                      ✓ {t.claimForm.handleFound}
                    </p>
                  )}
                  {handleStatus === 'not-found' && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#DC2626',
                        margin: '4px 0 0 0',
                      }}
                    >
                      {t.claimForm.handleNotFound}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>{t.claimForm.emailLabel}</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t.claimForm.emailPlaceholder}
                  />
                  {detectedEmail &&
                    email &&
                    detectedEmail.toLowerCase() === email.toLowerCase() && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#059669',
                          margin: '4px 0 0 0',
                        }}
                      >
                        ✓ {t.claimForm.emailAutoVerified}
                      </p>
                    )}
                </div>
                <div>
                  <label style={labelStyle}>{t.claimForm.passwordLabel}</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t.claimForm.passwordPlaceholder}
                    minLength={8}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FFD700',
                    color: '#3A3A3A',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? t.claimForm.submitting : t.claimForm.submit}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: Bio verification ───────────────────────────────── */}
          {step === 'verify' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <h1
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#3A3A3A',
                    margin: '0 0 6px 0',
                  }}
                >
                  {t.inlineVerify.title}
                </h1>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  {t.inlineVerify.subtitle(verifyHandle)}
                </p>
              </div>

              <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px 0' }}>
                {t.bioCode.addCodePrompt(
                  verifyPlatform === 'instagram' ? 'Instagram' : 'TikTok'
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
                  {verifyCode}
                </div>
              </div>

              <button
                onClick={copyCode}
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
                  {verifyPlatform === 'instagram' ? (
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
                  {t.inlineVerify.codeNote}
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
                disabled={verifying}
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

            
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Role selector card ────────────────────────────────────────────────────────
function RoleCard({
  selected,
  onClick,
  emoji,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '20px 16px',
        borderRadius: '12px',
        border: selected ? '2px solid #FFD700' : '2px solid #E5E7EB',
        backgroundColor: selected ? '#FFF9E0' : 'white',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#3A3A3A',
          marginBottom: '4px',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '12px', color: '#6B7280' }}>{description}</div>
    </button>
  );
}

export default function SignUpPage() {
  return (
    // This fallback stays English on purpose, and is the one string on the
    // creator path that Phase 2 could not localize. The locale is only
    // knowable from useSearchParams(), and useSearchParams() inside
    // SignUpContent is precisely what forces this Suspense boundary to exist —
    // reading it out here would suspend SignUpPage itself, leaving no boundary
    // to render a fallback. The route is also statically prerendered, so this
    // shell is one shared HTML for every locale. Localizing it would mean
    // changing the render mode, which is out of scope for a string swap.
    <Suspense
      fallback={
        <div
          style={{ padding: '80px', textAlign: 'center', color: '#9CA3AF' }}
        >
          Loading...
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
