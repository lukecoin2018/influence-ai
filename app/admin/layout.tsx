'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BarChart2, Building2, Users, MessageSquare, Mail, Activity, ArrowLeft, LogOut, FileText, Tags, Target } from 'lucide-react';

const sidebarLinks = [
  { href: '/admin', label: 'Overview', icon: BarChart2, exact: true },
  { href: '/admin/brands', label: 'Brands', icon: Building2 },
  { href: '/admin/brand-index', label: 'Brand Index', icon: Tags },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/targeting', label: 'Targeting', icon: Target },
  { href: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
  { href: '/admin/contact', label: 'Contact', icon: Mail },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div style={{ width: '220px', minHeight: '100vh', backgroundColor: '#3A3A3A', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #374151' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={14} color="white" />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>InfluenceIT Admin</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sidebarLinks.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, backgroundColor: isActive ? '#374151' : 'transparent', color: isActive ? 'white' : '#9CA3AF' }}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
          <ArrowLeft size={15} />
          Back to Site
        </Link>
        <button
          onClick={() => { if (!signingOut) { setSigningOut(true); signOut(); } }}
          disabled={signingOut}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#9CA3AF', background: 'none', border: 'none', cursor: signingOut ? 'default' : 'pointer', width: '100%', textAlign: 'left', opacity: signingOut ? 0.6 : 1 }}
        >
          <LogOut size={15} />
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, authError, retryAuth } = useAuth();

  // While loading, show a minimal shell with sidebar so it doesn't flash
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '32px', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
        </main>
      </div>
    );
  }

  // Auth check itself failed (e.g. a hung/timed-out session refresh) — show
  // a retry instead of either spinning forever or force-signing out someone
  // who might still have a perfectly valid session.
  if (authError) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '32px', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 12px 0' }}>{authError} — retry</p>
            <button onClick={retryAuth} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' }}>
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Auth resolved — redirect if not admin
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'admin') { window.location.href = '/'; return null; }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '32px', backgroundColor: '#F9FAFB', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
