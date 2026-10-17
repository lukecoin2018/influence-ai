'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminRow {
  user_id: string;
  email: string | null;
  status: string;
  added_by_email: string | null;
  created_at: string;
  updated_at: string;
}

type Action = 'add' | 'block' | 'unblock' | 'remove';

/** What each answer from /api/admin/admins means, in plain words. */
const DONE_TEXT: Record<string, string> = {
  added: 'Added. They sign in at /login and land on the admin dashboard.',
  blocked: 'Blocked. Their next click in the admin loads nothing, and a reload shows them a paused screen. They stay signed in.',
  unblocked: 'Unblocked. Their access is back on their next reload.',
  unchanged: 'No change: they were already in that state.',
  removed: 'Removed. Their sign-in account still exists; delete it in Supabase if you want it gone.',
};

const REFUSED_TEXT: Record<string, string> = {
  not_found: 'No Supabase account has that email. Create it first in Supabase → Authentication → Add user, then add it here.',
  ambiguous_email: 'More than one Supabase account has that email. Check Supabase → Authentication.',
  is_self: 'That is your own account. Your access comes from ADMIN_USER_ID and cannot be changed here.',
  already_admin: 'That account is already an admin.',
  has_creator_profile: 'That account has a creator profile. An admin must be a separate account that only uses the admin dashboard.',
  has_brand_profile: 'That account has a brand profile. An admin must be a separate account that only uses the admin dashboard.',
  has_other_role: 'That account already has a brand or creator role. An admin must be a separate account that only uses the admin dashboard.',
  invalid_email: 'Enter a valid email address.',
  migration_missing: 'Migration 0032 is not applied yet, so admins cannot be managed.',
  not_owner: 'Only the owner can manage admins.',
  auth_required: 'Your session has ended. Sign in again.',
  auth_unavailable: 'Could not check your session. Try again in a moment.',
};

const FAILED_TEXT = 'Something went wrong and nothing was changed. Try again.';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminsManager({
  rows,
  loadError,
}: {
  rows: AdminRow[];
  loadError: 'migration_missing' | 'failed' | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: Action, payload: { email?: string; userId?: string }, busyKey: string) {
    setBusy(busyKey);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const body = (await res.json().catch(() => ({}))) as { outcome?: string; reason?: string };
      if (res.ok && body.outcome) {
        setNotice({ ok: true, text: DONE_TEXT[body.outcome] ?? 'Done.' });
        if (action === 'add') setEmail('');
        router.refresh();
      } else {
        setNotice({ ok: false, text: (body.reason && REFUSED_TEXT[body.reason]) || FAILED_TEXT });
      }
    } catch {
      setNotice({ ok: false, text: 'Could not reach the server. Reload the page to see the current state.' });
    } finally {
      setBusy(null);
    }
  }

  function block(row: AdminRow) {
    if (!window.confirm(`Block ${row.email ?? 'this admin'}?\n\nTheir admin access stops on their next click. They stay signed in, and you can unblock them at any time.`)) return;
    run('block', { userId: row.user_id }, row.user_id + 'block');
  }

  function remove(row: AdminRow) {
    if (!window.confirm(`Remove ${row.email ?? 'this admin'} as an admin?\n\nThey lose admin access at once. Their sign-in account stays; you can delete it in Supabase afterwards. To give access back, add them again.`)) return;
    run('remove', { userId: row.user_id }, row.user_id + 'remove');
  }

  const button = (bg: string, color: string) => ({
    padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: busy ? 'default' : 'pointer', border: 'none', backgroundColor: bg, color,
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Admins</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0', lineHeight: 1.6, maxWidth: '640px' }}>
        Additional admins have the same access as you everywhere except this page. You can block, unblock or remove
        them at any time, and nothing they do can change your access. Only you see this page.
      </p>

      {loadError === 'migration_missing' ? (
        <p style={{ color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', margin: 0 }}>
          Migration 0032 is not applied yet, so there is nothing to manage. Run scripts/db/apply-0032.sh first.
        </p>
      ) : loadError === 'failed' ? (
        <p style={{ color: '#DC2626', fontSize: '14px', margin: 0 }}>Failed to load the admin list. Reload the page to try again.</p>
      ) : (
        <>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: '24px', maxWidth: '640px' }}>
            <label htmlFor="admin-email" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Add an admin
            </label>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              The email of an existing Supabase account (Authentication → Add user). It must not be a brand or creator account.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); if (!busy && email.trim()) run('add', { email: email.trim() }, 'add'); }}
              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            >
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="off"
                style={{ flex: '1 1 240px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#3A3A3A' }}
              />
              <button type="submit" disabled={!!busy || !email.trim()} style={button('#FFD700', '#3A3A3A')}>
                {busy === 'add' ? 'Adding...' : 'Add admin'}
              </button>
            </form>
          </div>

          {notice && (
            <p role="status" style={{ color: notice.ok ? '#065F46' : '#DC2626', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '640px' }}>
              {notice.text}
            </p>
          )}

          {rows.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No additional admins. You are the only one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
              {rows.map((row) => {
                const blocked = row.status !== 'active';
                return (
                  <div key={row.user_id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A' }}>{row.email ?? 'Account no longer exists'}</span>
                          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, backgroundColor: blocked ? '#FEF2F2' : '#ECFDF5', color: blocked ? '#991B1B' : '#065F46' }}>
                            {blocked ? 'Blocked' : 'Active'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                          Added {formatDate(row.created_at)}{row.added_by_email ? ` by ${row.added_by_email}` : ''}
                          {row.updated_at !== row.created_at ? ` · last changed ${formatDate(row.updated_at)}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {blocked ? (
                          <button onClick={() => run('unblock', { userId: row.user_id }, row.user_id + 'unblock')} disabled={!!busy} style={button('#ECFDF5', '#065F46')}>
                            {busy === row.user_id + 'unblock' ? 'Unblocking...' : 'Unblock'}
                          </button>
                        ) : (
                          <button onClick={() => block(row)} disabled={!!busy} style={button('#FFFBEB', '#92400E')}>
                            {busy === row.user_id + 'block' ? 'Blocking...' : 'Block'}
                          </button>
                        )}
                        <button onClick={() => remove(row)} disabled={!!busy} style={button('#FEF2F2', '#991B1B')}>
                          {busy === row.user_id + 'remove' ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
