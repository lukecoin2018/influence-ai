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
import { Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/creator-dashboard/Sidebar';
import { MobileChrome } from '@/components/creator-dashboard/MobileChrome';
import { useCreatorTokens } from '@/components/creator-dashboard/tokens';

interface AdminPreviewShellProps {
  handle: string;
  /** creators.id of the previewed creator — the mobile Profile sheet's identity row reads it. */
  creatorId: string;
  /**
   * creators.status. Anything but 'active' (today: 'non_creator', migration
   * 0027) is hidden from the product, and both banners say so — the preview
   * renders a hidden account so an admin can still review it.
   */
  creatorStatus?: string | null;
  children: React.ReactNode;
}

/** The marker both banners show for a hidden account, or null for an active one. */
function hiddenLabel(status: string | null | undefined): string | null {
  if (status == null || status === 'active') return null;
  return status === 'non_creator' ? 'Hidden · non-creator' : `Hidden · ${status}`;
}

function HiddenMarker({ label }: { label: string }) {
  return (
    <span style={{
      flexShrink: 0, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FEF3C7', color: '#92400E',
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  );
}

/**
 * Below 1024px only (the `.cd-mobile` wrapper hides it on desktop, where the
 * full-width banner below is unchanged). One line, 36px: "Preview" already
 * says read-only, so the parenthetical is dropped; the handle truncates and
 * never wraps. The Exit control is drawn at 26px inside a 44px-tall hit area.
 */
function CompactPreviewBanner({ handle, hidden }: { handle: string; hidden: string | null }) {
  return (
    <div style={{
      height: '36px', padding: '0 8px 0 14px', boxSizing: 'border-box',
      backgroundColor: '#3A3A3A', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, fontSize: '13px', fontWeight: 600 }}>
        <Search size={14} strokeWidth={2} aria-hidden="true" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Preview · @{handle}</span>
        {hidden && <HiddenMarker label={hidden} />}
      </span>
      <Link href="/admin/creators" style={{
        display: 'inline-flex', alignItems: 'center', height: '44px', padding: '0 4px', flexShrink: 0,
        textDecoration: 'none',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px', height: '26px', padding: '0 10px',
          borderRadius: '8px', border: '1px solid #6B7280', color: '#D1D5DB', fontSize: '12px', fontWeight: 500,
        }}>
          <X size={12} strokeWidth={2} aria-hidden="true" />
          Exit
        </span>
      </Link>
    </div>
  );
}

export function AdminPreviewShell({ handle, creatorId, creatorStatus, children }: AdminPreviewShellProps) {
  const hidden = hiddenLabel(creatorStatus);
  // `null` = viewport decides, see components/creator-dashboard/sidebar.css.
  // Unlike the creator layout this shell is rendered per page, so an admin's
  // choice does not survive moving between the two preview routes — the same
  // as before this change, and admin-only.
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const { user } = useAuth();
  // The ADMIN's balance, which is to say none: no creator_profiles row, so the
  // token box and pill stay hidden — same as before this change.
  const tokens = useCreatorTokens(user);

  return (
    <div
      className="cd-shell"
      data-open={sidebarOpen === null ? undefined : String(sidebarOpen)}
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAFAFA' }}
    >
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} previewHandle={handle} tokens={tokens} />
      <main style={{
        flex: 1,
        marginLeft: 'var(--cd-sidebar-w, 240px)',
        transition: 'margin-left 0.2s ease',
        minWidth: 0,
      }}>
        <MobileChrome
          creatorId={creatorId}
          tokenBalance={tokens.tokenBalance}
          subscriptionTier={tokens.subscriptionTier}
          previewHandle={handle}
          banner={<CompactPreviewBanner handle={handle} hidden={hidden} />}
        />

        {/* Desktop banner — unchanged; sidebar.css switches it off below 1024px. */}
        <div style={{
          backgroundColor: '#3A3A3A', color: 'white',
          display: 'var(--cd-preview-banner-display, flex)', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', position: 'sticky', top: 0, zIndex: 10,
          fontSize: '13px', fontWeight: 600,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔍 Admin Preview — viewing @{handle}&apos;s dashboard (read-only)</span>
            {hidden && <HiddenMarker label={hidden} />}
          </span>
          <Link href="/admin/creators" style={{
            fontSize: '12px', fontWeight: 500, color: '#D1D5DB', textDecoration: 'none',
            padding: '5px 12px', borderRadius: '8px', border: '1px solid #6B7280',
          }}>
            ← Back to admin
          </Link>
        </div>

        <div style={{ padding: 'var(--cd-content-pad, 32px 32px 80px)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
