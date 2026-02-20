'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BarChart2, Building2, Users, MessageSquare, Mail, Activity, ArrowLeft, LogOut } from 'lucide-react';

const sidebarLinks = [
  { href: '/admin', label: 'Overview', icon: BarChart2, exact: true },
  { href: '/admin/brands', label: 'Brands', icon: Building2 },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
  { href: '/admin/contact', label: 'Contact', icon: Mail },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
];

function AdminAuthCheck({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
      <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
    </div>
  );

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (userRole === null) {
    // Still resolving — keep waiting instead of redirecting
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    window.location.href = '/';
    return null;
  }

  return <>{children}</>;
}

function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div style={{ width: '220px', minHeight: '100vh', backgroundColor: '#1F2937', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #374151' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={14} color="white" />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>InfluenceAI Admin</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sidebarLinks.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '13px', fontWeight: 500,
                backgroundColor: isActive ? '#374151' : 'transparent',
                color: isActive ? 'white' : '#9CA3AF',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
          <ArrowLeft size={15} />
          Back to Site
        </Link>
        <button
          onClick={signOut}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthCheck>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '32px', backgroundColor: '#F9FAFB', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </AdminAuthCheck>
  );
}
