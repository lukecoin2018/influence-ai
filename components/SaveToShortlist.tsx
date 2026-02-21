'use client';

import { useState, useEffect } from 'react';
import { BookMarked, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Props {
  creatorId: string;
  matchScore?: number;
  matchExplanation?: string;
  size?: 'sm' | 'md';
}

interface Shortlist {
  id: string;
  name: string;
  isSaved: boolean;
}

export function SaveToShortlist({ creatorId, matchScore, matchExplanation, size = 'md' }: Props) {
  const { user } = useAuth();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSavedAnywhere = shortlists.some((s) => s.isSaved);

  useEffect(() => {
    if (user && open) loadShortlists();
  }, [user, open]);

  async function loadShortlists() {
    setLoading(true);
    const { data: lists } = await supabase
      .from('shortlists')
      .select('id, name')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false });

    if (lists) {
      const { data: saved } = await supabase
        .from('shortlist_items')
        .select('shortlist_id')
        .eq('creator_id', creatorId)
        .in('shortlist_id', lists.map((l) => l.id));

      const savedIds = new Set((saved ?? []).map((s: any) => s.shortlist_id));
      setShortlists(lists.map((l) => ({ ...l, isSaved: savedIds.has(l.id) })));
    }
    setLoading(false);
  }

  async function toggleSave(shortlistId: string, isSaved: boolean) {
    if (isSaved) {
      await supabase
        .from('shortlist_items')
        .delete()
        .eq('shortlist_id', shortlistId)
        .eq('creator_id', creatorId);
    } else {
      await supabase.from('shortlist_items').insert({
        shortlist_id: shortlistId,
        creator_id: creatorId,
        match_score: matchScore ?? null,
        match_explanation: matchExplanation ?? null,
      });
    }
    setShortlists(shortlists.map((s) =>
      s.id === shortlistId ? { ...s, isSaved: !isSaved } : s
    ));
  }

  if (!user) {
    return (
      <Link
        href="/login"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: size === 'sm' ? '5px 10px' : '7px 14px',
          borderRadius: '6px', border: '1px solid #E5E7EB',
          backgroundColor: 'white', color: '#6B7280',
          fontSize: size === 'sm' ? '12px' : '13px', fontWeight: 600,
          textDecoration: 'none', cursor: 'pointer',
        }}
      >
        <BookMarked size={size === 'sm' ? 11 : 13} />
        Save
      </Link>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: size === 'sm' ? '5px 10px' : '7px 14px',
          borderRadius: '6px',
          border: `1px solid ${isSavedAnywhere ? '#FFD700' : '#E5E7EB'}`,
          backgroundColor: isSavedAnywhere ? '#FFF9E0' : 'white',
          color: isSavedAnywhere ? '#FFD700' : '#6B7280',
          fontSize: size === 'sm' ? '12px' : '13px', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isSavedAnywhere ? <Check size={size === 'sm' ? 11 : 13} /> : <BookMarked size={size === 'sm' ? 11 : 13} />}
        {isSavedAnywhere ? 'Saved' : 'Save'}
        <ChevronDown size={10} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
            backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '180px', zIndex: 50,
            overflow: 'hidden',
          }}>
            {loading ? (
              <p style={{ padding: '12px 14px', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>Loading...</p>
            ) : shortlists.length === 0 ? (
              <p style={{ padding: '12px 14px', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No shortlists found</p>
            ) : (
              shortlists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => toggleSave(list.id, list.isSaved)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 14px', border: 'none',
                    backgroundColor: list.isSaved ? '#FFF9E0' : 'white',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#3A3A3A' }}>{list.name}</span>
                  {list.isSaved && <Check size={13} color="#FFD700" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}