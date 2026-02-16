'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { formatCount } from '@/lib/formatters';
import { EngagementIndicator } from '@/components/EngagementIndicator';

interface ShortlistItem {
  id: string;
  creator_id: string;
  notes: string | null;
  match_score: number | null;
  match_explanation: string | null;
  created_at: string;
  creator: {
    name: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    total_followers: number;
    instagram_engagement: number | null;
    tiktok_engagement: number | null;
  } | null;
}

interface Shortlist {
  id: string;
  name: string;
  description: string | null;
}

function AvatarFallback({ name }: { name: string }) {
  const initials = (name ?? '??').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

export default function ShortlistDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user && id) loadShortlist();
  }, [user, id]);

  async function loadShortlist() {
    setDataLoading(true);

    const { data: shortlistData } = await supabase
      .from('shortlists')
      .select('*')
      .eq('id', id)
      .eq('brand_id', user!.id)
      .single();

    if (!shortlistData) { router.push('/dashboard'); return; }
    setShortlist(shortlistData);

    const { data: itemData } = await supabase
      .from('shortlist_items')
      .select('*')
      .eq('shortlist_id', id)
      .order('created_at', { ascending: false });

    if (itemData && itemData.length > 0) {
      const creatorIds = itemData.map((i: any) => i.creator_id);
      const { data: creators } = await supabase
        .from('v_creator_summary')
        .select('*')
        .in('creator_id', creatorIds);

      const merged = itemData.map((item: any) => ({
        ...item,
        creator: creators?.find((c: any) => c.creator_id === item.creator_id) ?? null,
      }));
      setItems(merged);
    } else {
      setItems([]);
    }

    setDataLoading(false);
  }

  async function removeItem(itemId: string) {
    await supabase.from('shortlist_items').delete().eq('id', itemId);
    setItems(items.filter((i) => i.id !== itemId));
  }

  async function saveNote(itemId: string) {
    await supabase.from('shortlist_items').update({ notes: noteText }).eq('id', itemId);
    setItems(items.map((i) => i.id === itemId ? { ...i, notes: noteText } : i));
    setEditingNote(null);
  }

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (!shortlist) return null;

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: '48px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B7280', textDecoration: 'none', marginBottom: '16px' }}>
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>{shortlist.name}</h1>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>{items.length} creator{items.length !== 1 ? 's' : ''} saved</p>
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '16px' }}>No creators saved yet.</p>
            <Link href="/creators" style={{ fontSize: '14px', fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>Browse creators →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item) => {
              const creator = item.creator as any;
              const handle = creator?.instagram_handle ?? creator?.tiktok_handle ?? '';
              const engagement = creator?.instagram_engagement ?? creator?.tiktok_engagement;

              return (
                <div key={item.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <AvatarFallback name={creator?.name ?? '?'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>{creator?.name ?? 'Unknown'}</p>
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>@{handle}</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px 0' }}>Followers</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>{formatCount(creator?.total_followers)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px 0' }}>Engagement</p>
                          <EngagementIndicator rate={engagement} showLabel={false} size="sm" />
                        </div>
                        {item.match_score && (
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px 0' }}>Match Score</p>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#7C3AED', margin: 0 }}>{item.match_score}/100</p>
                          </div>
                        )}
                      </div>

                      {item.match_explanation && (
                        <div style={{ backgroundColor: '#F5F3FF', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', borderLeft: '3px solid #7C3AED' }}>
                          <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', margin: 0 }}>{item.match_explanation}</p>
                        </div>
                      )}

                      {editingNote === item.id ? (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note..."
                            style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
                            onKeyDown={(e) => e.key === 'Enter' && saveNote(item.id)}
                          />
                          <button onClick={() => saveNote(item.id)} style={{ padding: '7px 12px', borderRadius: '6px', backgroundColor: '#7C3AED', color: 'white', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingNote(null)} style={{ padding: '7px 12px', borderRadius: '6px', backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <p
                          onClick={() => { setEditingNote(item.id); setNoteText(item.notes ?? ''); }}
                          style={{ fontSize: '13px', color: item.notes ? '#374151' : '#9CA3AF', cursor: 'pointer', margin: '0 0 10px 0', fontStyle: item.notes ? 'normal' : 'italic' }}
                        >
                          {item.notes ?? 'Add a note...'}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href={`/creators/${handle}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', backgroundColor: '#7C3AED', color: 'white', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                          <ExternalLink size={11} /> View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}