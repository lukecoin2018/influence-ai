'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', data.user.id).single();

      window.location.href = roleData?.role === 'creator' ? '/creator-dashboard' : '/dashboard';
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0' }}>Welcome Back</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Log in to your brand account.</p>
        </div>

        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acmebrand.com" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', margin: 0 }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
