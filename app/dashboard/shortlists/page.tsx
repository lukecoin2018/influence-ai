'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookMarked, Plus, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

/**
 * The shortlists index.
 *
 * The sidebar has always linked here (components/dashboard/Sidebar.tsx), but
 * the only route under /dashboard/shortlists was [id], so clicking "Shortlists"
 * gave an approved brand a 404. The dashboard home already lists shortlists and
 * links into individual ones — it just caps the list at five — so this is the
 * page that was assumed to exist rather than a new feature.
 *
 * Query and shape are deliberately identical to loadDashboardData() in
 * app/dashboard/page.tsx: same `shortlist_items(count)` join, same
 * brand_id = user.id filter, same newest-first order. Two places reading the
 * same thing two different ways is how they drift.
 *
 * No approval check here: app/dashboard/layout.tsx gates the whole tree, and
 * an unapproved brand never renders any page below it.
 */

interface Shortlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  item_count: number;
}

export default function ShortlistsPage() {
  const { user, loading } = useAuth();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) load();
    // The layout redirects when there is no session, so there is no
    // router.push('/login') here — it would race that redirect.
  }, [user]);

  async function load() {
    setDataLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('shortlists')
      .select('*, shortlist_items(count)')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load shortlists:', error);
      setLoadError('Could not load your shortlists.');
      setDataLoading(false);
      return;
    }

    setShortlists(
      (data ?? []).map((s: any) => ({
        ...s,
        item_count: s.shortlist_items?.[0]?.count ?? 0,
      })),
    );
    setDataLoading(false);
  }

  async function createShortlist() {
    const name = newListName.trim();
    if (!name || creating) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('shortlists')
      .insert({ brand_id: user!.id, name })
      .select()
      .single();

    if (error) {
      // The dashboard home's version of this ignores the error and silently
      // does nothing, which reads as a dead button. Say something instead.
      console.error('Failed to create shortlist:', error);
      setLoadError('Could not create that shortlist.');
    } else if (data) {
      setShortlists([{ ...data, item_count: 0 }, ...shortlists]);
      setNewListName('');
      setShowNewList(false);
    }
    setCreating(false);
  }

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0, letterSpacing: '-0.02em' }}>
          Shortlists
        </h1>
        <button
          onClick={() => setShowNewList(!showNewList)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: '#3A3A3A' }}
        >
          <Plus size={14} />
          New shortlist
        </button>
      </div>

      {showNewList && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createShortlist(); }}
            placeholder="Spring campaign"
            autoFocus
            style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#3A3A3A', outline: 'none' }}
          />
          <button
            onClick={createShortlist}
            disabled={!newListName.trim() || creating}
            style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', backgroundColor: newListName.trim() && !creating ? '#FFD700' : '#E5E7EB', color: newListName.trim() && !creating ? '#3A3A3A' : '#9CA3AF', cursor: newListName.trim() && !creating ? 'pointer' : 'not-allowed' }}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {loadError && (
        <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 12px 0' }}>{loadError}</p>
      )}

      {shortlists.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '48px 24px', textAlign: 'center' }}>
          <BookMarked size={28} color="#D1D5DB" />
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#3A3A3A', margin: '12px 0 4px 0' }}>No shortlists yet</p>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 20px 0' }}>
            Save creators as you browse and group them into lists for a campaign.
          </p>
          <Link href="/creators" style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', textDecoration: 'none', padding: '9px 16px', borderRadius: '8px', backgroundColor: '#FFD700' }}>
            Browse creators
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shortlists.map((list) => (
            <Link key={list.id} href={`/dashboard/shortlists/${list.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <BookMarked size={16} color="#6B7280" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>{list.name}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Created {formatDate(list.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {list.item_count} {list.item_count === 1 ? 'creator' : 'creators'}
                  </span>
                  <ChevronRight size={15} color="#9CA3AF" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
