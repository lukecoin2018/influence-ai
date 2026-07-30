'use client';

// components/creator-dashboard/AdminPreviewShell.tsx
// Chrome for the admin-only creator-dashboard preview
// (app/admin/preview/creator/[handle]/page.tsx). Deliberately does NOT run
// creator-dashboard/layout.tsx's own claim_status check — that check reads
// `creator_profiles` for the LOGGED-IN user (the admin), which has no row of
// its own, so this route needs its own gate-free shell rather than reusing
// that layout. The verification lock stays fully intact for real creators;
// this is a separate component, not a weakened version of that check.

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/creator-dashboard/Sidebar';

interface AdminPreviewShellProps {
  handle: string;
  children: React.ReactNode;
}

export function AdminPreviewShell({ handle, children }: AdminPreviewShellProps) {
  // `null` = viewport decides, see components/creator-dashboard/sidebar.css.
  // Unlike the creator layout this shell is rendered per page, so an admin's
  // choice does not survive moving between the two preview routes — the same
  // as before this change, and admin-only.
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);

  return (
    <div
      className="cd-shell"
      data-open={sidebarOpen === null ? undefined : String(sidebarOpen)}
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAFAFA' }}
    >
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} previewHandle={handle} />
      <main style={{
        flex: 1,
        marginLeft: 'var(--cd-sidebar-w, 240px)',
        transition: 'margin-left 0.2s ease',
        minWidth: 0,
      }}>
        <div style={{
          backgroundColor: '#3A3A3A', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', position: 'sticky', top: 0, zIndex: 10,
          fontSize: '13px', fontWeight: 600,
        }}>
          <span>🔍 Admin Preview — viewing @{handle}&apos;s dashboard (read-only)</span>
          <Link href="/admin/creators" style={{
            fontSize: '12px', fontWeight: 500, color: '#D1D5DB', textDecoration: 'none',
            padding: '5px 12px', borderRadius: '8px', border: '1px solid #6B7280',
          }}>
            ← Back to admin
          </Link>
        </div>

        <div style={{ padding: '32px 32px 80px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
