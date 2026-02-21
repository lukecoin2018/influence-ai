'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const INDUSTRIES = [
  'Fashion & Beauty', 'Health & Wellness', 'Food & Beverage',
  'Technology', 'Travel & Hospitality', 'Home & Living',
  'Sports & Fitness', 'Entertainment', 'Finance', 'Education', 'Other',
];

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!companyName.trim()) { setError('Company name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
  
    setLoading(true);
    setError('');
  
    try {
      // Create account via API route (bypasses RLS)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName, contactName, website, industry }),
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
  
      // Now sign in with the created credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
  
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: '#3A3A3A',
    outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white',
  };

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '6px',
  } as const;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 8px 0' }}>Create Your Brand Account</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Get AI-powered creator matching and build your shortlist.</p>
        </div>

        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Company Name <span style={{ color: '#DC2626' }}>*</span></label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Brand Co." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Your Name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Work Email <span style={{ color: '#DC2626' }}>*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acmebrand.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password <span style={{ color: '#DC2626' }}>*</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acmebrand.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inputStyle, backgroundColor: 'white' }}>
              <option value="">Select industry...</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #FFD700, #E6C200)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', margin: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}