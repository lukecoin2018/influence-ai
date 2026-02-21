'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminContactPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load();
  }, [loading, user, userRole]);

  async function load() {
    setDataLoading(true);
    const { data } = await supabase.from('contact_submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data ?? []);
    setDataLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from('contact_submissions').update({ status: 'read' }).eq('id', id);
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'read' } : s));
  }

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Contact Submissions</h1>
      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : submissions.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No contact submissions yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.map((sub) => (
            <div key={sub.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${sub.status === 'read' ? '#E5E7EB' : '#FFE44D'}`, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A' }}>{sub.name}</span>
                    {sub.status !== 'read' && <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FFF9E0', fontSize: '11px', fontWeight: 700, color: '#FFD700' }}>NEW</span>}
                    {sub.type && <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#F3F4F6', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>{sub.type}</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 4px 0' }}>{sub.email}</p>
                  {sub.subject && <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>{sub.subject}</p>}
                  {sub.message && <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{sub.message}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {sub.status !== 'read' && <button onClick={() => markRead(sub.id)} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#F3F4F6', color: '#374151' }}>Mark Read</button>}
                  <a href={`mailto:${sub.email}`} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', backgroundColor: '#F3F4F6', color: '#374151' }}>Reply</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
