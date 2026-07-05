'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type EntityType = 'brand' | 'creator' | 'celebrity' | 'media' | 'fragment' | 'unknown';

type BrandAlias = {
  alias: string;
  canonical_name: string | null;
  entity_type: EntityType;
  category: string | null;
  region: string | null;
  verified: boolean;
  creators_count: number;
  classified_at: string | null;
};

type FilterType = 'all' | 'review';

const ENTITY_TYPES: EntityType[] = ['brand', 'creator', 'celebrity', 'media', 'fragment', 'unknown'];
const ROW_LIMIT = 500;

const ENTITY_TYPE_COLORS: Record<EntityType, { color: string; bg: string }> = {
  brand: { color: '#065F46', bg: '#ECFDF5' },
  creator: { color: '#3730A3', bg: '#EEF2FF' },
  celebrity: { color: '#92400E', bg: '#FFFBEB' },
  media: { color: '#1E40AF', bg: '#EFF6FF' },
  fragment: { color: '#6B7280', bg: '#F3F4F6' },
  unknown: { color: '#991B1B', bg: '#FEF2F2' },
};

export default function AdminBrandIndexPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<BrandAlias[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [savingAlias, setSavingAlias] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, userRole, filter]);

  // Counts for both tabs are fetched independently of which tab is active, so
  // the "Needs Review" badge is always accurate even while looking at "All".
  async function loadCounts() {
    const [{ count: total }, { count: review }] = await Promise.all([
      supabase.from('brand_aliases').select('*', { count: 'exact', head: true }),
      supabase.from('brand_aliases').select('*', { count: 'exact', head: true }).or('entity_type.eq.unknown,verified.eq.false'),
    ]);
    setTotalCount(total ?? 0);
    setReviewCount(review ?? 0);
  }

  async function load() {
    setDataLoading(true);
    let query = supabase.from('brand_aliases').select('*').order('creators_count', { ascending: false }).limit(ROW_LIMIT);
    if (filter === 'review') query = query.or('entity_type.eq.unknown,verified.eq.false');
    const [{ data }] = await Promise.all([query, loadCounts()]);
    setRows((data ?? []) as BrandAlias[]);
    setDataLoading(false);
  }

  async function saveField(alias: string, patch: Partial<BrandAlias>) {
    setSavingAlias(alias);
    const { error } = await supabase.from('brand_aliases').update(patch).eq('alias', alias);
    if (!error) {
      setRows((prev) => prev.map((r) => (r.alias === alias ? { ...r, ...patch } : r)));
      // entity_type/verified changes can move a row in or out of the review
      // queue, so the badge counts need refreshing even though we skip a
      // full row refetch for snappier inline editing.
      if ('entity_type' in patch || 'verified' in patch) loadCounts();
    }
    setSavingAlias(null);
  }

  const filterBtn = (value: FilterType, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', backgroundColor: filter === value ? '#FFD700' : '#F3F4F6', color: filter === value ? 'white' : '#374151' }}
    >
      {label}
    </button>
  );

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Brand Index</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
        Normalized brand/creator/celebrity entities detected across creator posts. Separate from Brands (customer accounts).
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterBtn('all', `All (${totalCount})`)}
        {filterBtn('review', `Needs Review (${reviewCount})`)}
      </div>

      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
          {filter === 'review' ? 'Nothing needs review right now.' : 'No aliases found — run the seed script first.'}
        </p>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={thStyle}>Alias</th>
                <th style={thStyle}>Canonical name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Region</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Creators</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const typeColors = ENTITY_TYPE_COLORS[row.entity_type] ?? ENTITY_TYPE_COLORS.unknown;
                const isSaving = savingAlias === row.alias;
                return (
                  <tr key={row.alias} style={{ borderBottom: '1px solid #F3F4F6', opacity: isSaving ? 0.6 : 1 }}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#6B7280' }}>{row.alias}</td>
                    <td style={tdStyle}>
                      <input
                        defaultValue={row.canonical_name ?? ''}
                        placeholder="—"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value !== (row.canonical_name ?? '')) saveField(row.alias, { canonical_name: value || null });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        style={inputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={row.entity_type}
                        onChange={(e) => saveField(row.alias, { entity_type: e.target.value as EntityType })}
                        style={{ ...inputStyle, color: typeColors.color, backgroundColor: typeColors.bg, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input
                        defaultValue={row.category ?? ''}
                        placeholder="—"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value !== (row.category ?? '')) saveField(row.alias, { category: value || null });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        style={inputStyle}
                      />
                    </td>
                    <td style={{ ...tdStyle, color: '#9CA3AF' }}>{row.region ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#3A3A3A' }}>{row.creators_count}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.verified}
                        onChange={(e) => saveField(row.alias, { verified: e.target.checked })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === ROW_LIMIT && (
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px' }}>
          Showing the top {ROW_LIMIT} by creator count{filter === 'review' ? ' within this filter' : ` of ${totalCount}`}.
        </p>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle: React.CSSProperties = { padding: '8px 14px', color: '#3A3A3A' };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', fontFamily: 'inherit' };
