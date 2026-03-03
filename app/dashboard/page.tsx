'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookMarked, Plus, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface Shortlist {
  id: string;
  name: string;
  created_at: string;
  item_count: number;
}

interface Inquiry {
  id: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, brandProfile, loading } = useAuth();
  const router = useRouter();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    setDataLoading(true);
    const { data: shortlistData } = await supabase
      .from('shortlists')
      .select('*, shortlist_items(count)')
      .eq('brand_id', user!.id)
      .order('created_at', { ascending: false });

    if (shortlistData) {
      setShortlists(shortlistData.map((s: any) => ({
        ...s, item_count: s.shortlist_items?.[0]?.count ?? 0,
      })));
    }

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
      brand_id: user!.id, name: newListName.trim(),
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

  const TOOLS = [
    { href: '/dashboard/budget-calculator', icon: '🧮', label: 'Budget Calculator', desc: 'Calculate fair campaign costs', color: '#EEF2FF', iconColor: '#4F46E5' },
    { href: '/dashboard/brief/campaign-type', icon: '📋', label: 'Campaign Brief', desc: 'Build a professional brief', color: '#F0FDF4', iconColor: '#16A34A' },
    { href: '/dashboard/negotiation', icon: '🤝', label: 'Negotiation Assistant', desc: 'Navigate creator negotiations', color: '#FFFBEB', iconColor: '#D97706' },
    { href: '/dashboard/contract', icon: '📄', label: 'Contract Builder', desc: 'Generate campaign contracts', color: '#FFF1F2', iconColor: '#E11D48' },
    { href: '/creators', icon: '🔍', label: 'Browse Creators', desc: 'Find the right creators', color: '#F0F9FF', iconColor: '#0284C7' },
    { href: '/match', icon: '✨', label: 'AI Match', desc: 'Get AI creator recommendations', color: '#FAF5FF', iconColor: '#7C3AED' },
  ];

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 4px' }}>
          Welcome back, {brandProfile?.company_name ?? 'there'} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {brandProfile?.industry ?? 'Brand account'}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Shortlists', value: shortlists.length, icon: '⭐' },
          { label: 'Inquiries Sent', value: inquiries.length, icon: '✉️' },
          { label: 'Pending', value: inquiries.filter(i => i.status === 'pending').length, icon: '⏳' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#3A3A3A' }}>{value}</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tools grid */}
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 12px' }}>Your Tools</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {TOOLS.map(({ href, icon, label, desc, color, iconColor }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '12px',
              }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Shortlists */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>My Shortlists</h2>
            <button onClick={() => setShowNewList(!showNewList)} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 600, color: '#3AAFF4',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
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
              <button onClick={createShortlist} style={{
                padding: '7px 12px', borderRadius: '6px',
                backgroundColor: '#FFD700', color: '#3A3A3A',
                fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>Create</button>
            </div>
          )}

          {shortlists.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>No shortlists yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shortlists.slice(0, 5).map((list) => (
                <Link key={list.id} href={`/dashboard/shortlists/${list.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F9FAFB', cursor: 'pointer',
                  }}>
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

        {/* Recent Inquiries */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px' }}>Recent Inquiries</h2>
          {inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>No inquiries yet</p>
              <Link href="/creators" style={{ fontSize: '13px', fontWeight: 600, color: '#3AAFF4', textDecoration: 'none' }}>
                Browse creators →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inquiries.map((inq) => (
                <div key={inq.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F9FAFB',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A' }}>Creator inquiry</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                      backgroundColor: inq.status === 'pending' ? '#FFFBEB' : '#ECFDF5',
                      color: inq.status === 'pending' ? '#D97706' : '#059669',
                    }}>
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
  );
}