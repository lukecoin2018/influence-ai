// app/admin/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface BrandReport {
  id: string;
  brand_name: string;
  slug: string;
  brand_handle: string | null;
  category: string | null;
  mode: 'auto' | 'manual';
  created_at: string;
}

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, borderRadius: '8px', border: `1px solid ${copied ? '#22c55e' : '#E5E7EB'}`, color: copied ? '#16a34a' : '#6B7280', backgroundColor: copied ? 'rgba(34,197,94,0.06)' : 'white', cursor: 'pointer' }}
    >
      {copied ? '✓ Copied' : 'Copy URL'}
    </button>
  );
}

export default function AdminReportsPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<BrandReport[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [brandHandle, setBrandHandle] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [slugEdited, setSlugEdited] = useState(false);

  // Wait for auth exactly like other admin pages do
  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    loadReports();
  }, [loading, user, userRole]);

  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(brandName));
  }, [brandName, slugEdited]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  async function loadReports() {
    setDataLoading(true);
    const { data, error } = await supabase.from('brand_reports').select('*').order('created_at', { ascending: false });
    if (error) setToast({ message: 'Failed to load reports', type: 'error' });
    else setReports(data ?? []);
    setDataLoading(false);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    if (mode === 'manual' && !category.trim()) { setToast({ message: 'Category is required for manual mode', type: 'error' }); return; }
    setCreating(true);
    const { error } = await supabase.from('brand_reports').insert({
      brand_name: brandName.trim(),
      slug: slug.trim() || toSlug(brandName),
      brand_handle: brandHandle.trim() || null,
      category: category.trim() || null,
      mode,
    });
    if (error) {
      setToast({ message: error.message.includes('unique') ? 'A report with that slug already exists' : error.message, type: 'error' });
    } else {
      setToast({ message: 'Report created!', type: 'success' });
      setBrandName(''); setSlug(''); setBrandHandle(''); setCategory(''); setMode('auto'); setSlugEdited(false);
      loadReports();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('brand_reports').delete().eq('id', id);
    if (error) setToast({ message: 'Failed to delete report', type: 'error' });
    else { setToast({ message: 'Report deleted', type: 'success' }); loadReports(); }
    setDeletingId(null);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://influenceit.app';
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#3A3A3A', backgroundColor: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: 600 as const, color: '#6B7280', marginBottom: '4px' };

  return (
    <div style={{ maxWidth: '960px' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50, padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, color: 'white', backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Brand Reports</h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Create personalised creator match pages to send to prospective brand partners.</p>
      </div>

      {/* Create form */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 20px' }}>Create new report</h2>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Brand name <span style={{ color: '#EF4444' }}>*</span></label>
              <input style={inputStyle} type="text" required value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Nike" />
            </div>
            <div>
              <label style={labelStyle}>URL slug <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(auto-generated)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#F9FAFB', overflow: 'hidden' }}>
                <span style={{ padding: '8px 4px 8px 12px', fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>/report/</span>
                <input style={{ flex: 1, padding: '8px 12px 8px 0', fontSize: '13px', color: '#3A3A3A', backgroundColor: 'transparent', border: 'none', outline: 'none' }} type="text" value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true); }} placeholder="nike" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Mode</label>
              <select style={inputStyle} value={mode} onChange={e => setMode(e.target.value as 'auto' | 'manual')}>
                <option value="auto">Auto-match from database</option>
                <option value="manual">Manual category match</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Brand Instagram handle <span style={{ color: '#9CA3AF', fontWeight: 400 }}>{mode === 'auto' ? '(used for auto-match)' : '(optional)'}</span></label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#F9FAFB', overflow: 'hidden' }}>
                <span style={{ padding: '8px 4px 8px 12px', fontSize: '13px', color: '#9CA3AF' }}>@</span>
                <input style={{ flex: 1, padding: '8px 12px 8px 0', fontSize: '13px', color: '#3A3A3A', backgroundColor: 'transparent', border: 'none', outline: 'none' }} type="text" value={brandHandle} onChange={e => setBrandHandle(e.target.value)} placeholder="gymshark" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                Category / niche {mode === 'manual' ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional fallback)</span>}
              </label>
              <input style={inputStyle} type="text" required={mode === 'manual'} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. fitness, beauty, tech" />
            </div>
          </div>
          <button type="submit" disabled={creating || !brandName.trim()} style={{ padding: '9px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#3A3A3A', backgroundColor: '#FFD700', border: 'none', cursor: creating || !brandName.trim() ? 'not-allowed' : 'pointer', opacity: creating || !brandName.trim() ? 0.5 : 1 }}>
            {creating ? 'Creating…' : 'Create report'}
          </button>
        </form>
      </div>

      {/* Reports table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A', margin: 0 }}>
            All reports {!dataLoading && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({reports.length})</span>}
          </h2>
        </div>
        {dataLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No reports yet. Create one above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {['Brand', 'URL', 'Mode', 'Created', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(report => {
                const url = `${baseUrl}/report/${report.slug}`;
                return (
                  <tr key={report.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: 0 }}>{report.brand_name}</p>
                      {report.brand_handle && <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>@{report.brand_handle}</p>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#3AAFF4', textDecoration: 'none', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          /report/{report.slug}
                        </a>
                        <CopyButton url={url} />
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, backgroundColor: report.mode === 'auto' ? 'rgba(58,175,244,0.1)' : 'rgba(255,77,148,0.1)', color: report.mode === 'auto' ? '#1e7fbf' : '#c0195d' }}>
                        {report.mode === 'auto' ? 'Auto' : 'Manual'}{report.category && ` · ${report.category}`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button onClick={() => handleDelete(report.id)} disabled={deletingId === report.id} style={{ fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', opacity: deletingId === report.id ? 0.4 : 1 }}>
                        {deletingId === report.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
