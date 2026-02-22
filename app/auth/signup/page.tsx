'use client';

// app/auth/signup/page.tsx
// Updated signup with role selector: Brand or Creator
// Replaces your existing signup page entirely.

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Role = 'brand' | 'creator' | null;
type Step = 'role' | 'form';

function SignUpContent() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [step, setStep] = useState<Step>('role');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from URL params
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
  }, [searchParams]);
  
  // Brand fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  // Creator fields
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'found' | 'not-found'>('idle');
  const [foundCreatorId, setFoundCreatorId] = useState<string | null>(null);
  const [detectedEmail, setDetectedEmail] = useState<string | null>(null);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Handle lookup for creators ──────────────────────────────────────────────
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
      .select('creator_id, detected_email')
      .eq('handle', cleaned)
      .limit(1)
      .single();

    if (data) {
      setHandleStatus('found');
      setFoundCreatorId(data.creator_id);
      setDetectedEmail(data.detected_email ?? null);
    } else {
      setHandleStatus('not-found');
      setFoundCreatorId(null);
      setDetectedEmail(null);
    }
  }

  // ── Brand signup ────────────────────────────────────────────────────────────
  async function handleBrandSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Signup failed.');
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // Create user_roles entry
    await supabase.from('user_roles').insert({ user_id: userId, role: 'brand' });

    // Create brand_profiles entry
    await supabase.from('brand_profiles').insert({
      id: userId,
      company_name: companyName,
      industry,
    });

    router.push('/dashboard');
  }

  // ── Creator signup ──────────────────────────────────────────────────────────
  async function handleCreatorSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (handleStatus === 'not-found') {
      setError("We don't have a profile for this handle yet. We'll add you to our database and notify you when your profile is ready.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Signup failed.');
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // Determine auto-verification
    const isAutoVerified =
      detectedEmail != null &&
      detectedEmail.toLowerCase() === email.toLowerCase();

    // Create user_roles entry
    await supabase.from('user_roles').insert({ user_id: userId, role: 'creator' });

    // Create creator_profiles entry
    await supabase.from('creator_profiles').insert({
      id: userId,
      creator_id: foundCreatorId,
      claim_status: isAutoVerified ? 'verified' : 'pending',
      claimed_at: isAutoVerified ? new Date().toISOString() : null,
    });

    window.location.href = '/creator-dashboard';
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
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: '22px', fontWeight: 800, color: '#FFD700', letterSpacing: '-0.02em' }}>
            InfluenceIT
          </Link>
        </div>

        <div className="card" style={{ padding: '32px' }}>

          {/* ── STEP 1: Role selector ─────────────────────────────────── */}
          {step === 'role' && (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0', textAlign: 'center' }}>
                Join InfluenceIT
              </h1>
              <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '0 0 28px 0' }}>
                I am a...
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
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
                onClick={() => { if (role) setStep('form'); }}
                disabled={!role}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '8px', border: 'none',
                  backgroundColor: role ? '#FFD700' : '#E5E7EB',
                  color: role ? 'white' : '#9CA3AF',
                  fontSize: '15px', fontWeight: 600,
                  cursor: role ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Continue →
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', margin: '20px 0 0 0' }}>
                Already have an account?{' '}
                <Link href="/auth/login" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>
                  Log in
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: Brand form ────────────────────────────────────── */}
          {step === 'form' && role === 'brand' && (
            <>
              <button
                onClick={() => setStep('role')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6B7280', padding: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0' }}>
                🏢 Create Brand Account
              </h1>

              <form onSubmit={handleBrandSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Acme Inc." />
                </div>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <select style={inputStyle} value={industry} onChange={(e) => setIndustry(e.target.value)} required>
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
                  <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" minLength={8} />
                </div>
                {error && <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Creator form ──────────────────────────────────── */}
          {step === 'form' && role === 'creator' && (
            <>
              <button
                onClick={() => setStep('role')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6B7280', padding: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0' }}>
                ✨ Claim Your Profile
              </h1>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
                We'll verify you own this account before activating your creator dashboard.
              </p>

              <form onSubmit={handleCreatorSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Instagram or TikTok Handle</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '14px' }}>@</span>
                    <input
                      style={{ ...inputStyle, paddingLeft: '28px', borderColor: handleStatus === 'found' ? '#059669' : handleStatus === 'not-found' ? '#DC2626' : '#E5E7EB' }}
                      value={handle}
                      onChange={(e) => checkHandle(e.target.value)}
                      required
                      placeholder="yourhandle"
                    />
                  </div>
                  {handleStatus === 'checking' && (
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>Checking...</p>
                  )}
                  {handleStatus === 'found' && (
                    <p style={{ fontSize: '12px', color: '#059669', margin: '4px 0 0 0' }}>✓ Profile found in our database</p>
                  )}
                  {handleStatus === 'not-found' && (
                    <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>Profile not found. You can still sign up and we'll add you.</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                  {detectedEmail && email && detectedEmail.toLowerCase() === email.toLowerCase() && (
                    <p style={{ fontSize: '12px', color: '#059669', margin: '4px 0 0 0' }}>✓ Email matches — you'll be auto-verified!</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" minLength={8} />
                </div>
                {error && <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Role selector card ────────────────────────────────────────────────────────
function RoleCard({
  selected, onClick, emoji, title, description,
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
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#6B7280' }}>{description}</div>
    </button>
  );
}
export default function SignUpPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}