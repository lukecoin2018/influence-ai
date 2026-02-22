'use client';

// app/auth/login/page.tsx
// Updated login with role-based routing:
//   brand → /dashboard
//   creator → /creator-dashboard

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError(authError?.message ?? 'Login failed.');
      setLoading(false);
      return;
    }

    // Check role to determine redirect
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    console.log('Login - user_id:', data.user.id);
    console.log('Login - roleData:', roleData);
    console.log('Login - role value:', roleData?.role);

    if (roleData?.role === 'creator') {
      console.log('Redirecting to creator-dashboard');
      window.location.href = '/creator-dashboard';
    } else {
      console.log('Redirecting to dashboard');
      window.location.href = '/dashboard';
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: '22px', fontWeight: 800, color: '#FFD700', letterSpacing: '-0.02em' }}>
            InfluenceIT
          </Link>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', textAlign: 'center' }}>
            Welcome back
          </h1>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: '#FFD700', color: '#3A3A3A',
                fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '4px',
              }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', margin: '20px 0 0 0' }}>
            Don't have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
