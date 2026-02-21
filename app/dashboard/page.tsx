'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Sparkles, BookMarked, Search, Mail, Plus, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface Shortlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  item_count: number;
}

interface Brief {
  id: string;
  brief_text: string;
  candidates_count: number;
  created_at: string;
  matched_creators: any[];
}

interface Inquiry {
  id: string;
  creator_id: string;
  status: string;
  created_at: string;
  handle: string;
}

export default function DashboardPage() {
  const { user, brandProfile, loading } = useAuth();
  const router = useRouter();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    setDataLoading(true);

    // Load shortlists with item counts
    const { data: shortlistData } = await supabase
      .from('shortlists')
      .select('*, shortlist_items(count)')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false });

    if (shortlistData) {
      setShortlists(shortlistData.map((s: any) => ({
        ...s,
        item_count: s.shortlist_items?.[0]?.count ?? 0,
      })));
    }

    // Load recent briefs
    const { data: briefData } = await supabase
      .from('campaign_briefs')
      .select('*')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setBriefs(briefData ?? []);

    // Load recent inquiries
    const { data: inquiryData } = await supabase
      .from('inquiries')
      .select('*')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setInquiries(inquiryData ?? []);
    setDataLoading(false);
  }

  async function createShortlist() {
    if (!newListName.trim()) return;
    const { data } = await supabase.from('shortlists').insert({
      brand_id: user!.id,
      name: newListName.trim(),
    }).select().single();

    if (data) {
      setShortlists([{ ...data, item_count: 0 }, ...shortlists]);
      setNewListName('');
      setShowNewList(false);
    }
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
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: '48px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 4px 0' }}>
            Welcome back, {brandProfile?.company_name ?? 'there'}
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>{brandProfile?.industry ?? 'Brand account'}</p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <Link href="/match" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EBF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={18} color="#3AAFF4" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>Find Creators</span>
            </div>
          </Link>
          <Link href="/creators" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Search size={18} color="#16A34A" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>Browse Creators</span>
            </div>
          </Link>
          <Link href="/dashboard/shortlists" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookMarked size={18} color="#2563EB" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>My Shortlists</span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Shortlists */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>My Shortlists</h2>
              <button onClick={() => setShowNewList(!showNewList)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#3AAFF4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Plus size={13} /> New
              </button>
            </div>

            {showNewList && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Shortlist name..."
                  onKeyDown={(e) => e.key === 'Enter' && createShortlist()}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
                />
                <button onClick={createShortlist} style={{ padding: '7px 12px', borderRadius: '6px', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Create
                </button>
              </div>
            )}

            {shortlists.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>No shortlists yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shortlists.map((list) => (
                  <Link key={list.id} href={`/dashboard/shortlists/${list.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F9FAFB', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookMarked size={14} color="#6B7280" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A' }}>{list.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{list.item_count} creators</span>
                        <ChevronRight size={14} color="#9CA3AF" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Searches */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px 0' }}>Recent Searches</h2>
            {briefs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>No searches yet</p>
                <Link href="/match" style={{ fontSize: '13px', fontWeight: 600, color: '#3AAFF4', textDecoration: 'none' }}>Start your first search →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {briefs.map((brief) => (
                  <div key={brief.id} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
                    <p style={{ fontSize: '13px', color: '#3A3A3A', margin: '0 0 4px 0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{brief.brief_text.slice(0, 60)}..."
                    </p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
                      {brief.matched_creators?.length ?? 0} matches · {formatDate(brief.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inquiries */}
          <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Mail size={15} color="#6B7280" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>My Inquiries</h2>
            </div>
            {inquiries.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>No inquiries yet — browse creators and click "Get in Touch"</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inquiries.map((inq) => (
                  <div key={inq.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A' }}>Creator inquiry</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', backgroundColor: inq.status === 'pending' ? '#FFFBEB' : '#ECFDF5', color: inq.status === 'pending' ? '#D97706' : '#059669', fontWeight: 600 }}>
                        {inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(inq.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}