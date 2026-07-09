'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type EntityType = 'brand' | 'creator' | 'celebrity' | 'media' | 'venue' | 'fragment' | 'unknown';

type BrandAlias = {
  alias: string;
  canonical_name: string | null;
  entity_type: EntityType;
  category: string | null;
  region: string | null;
  verified: boolean;
  creators_count: number;
  classified_at: string | null;
  recognizability: number | null;
  im_intensity: number | null;
};

// Shape of the classification_preview jsonb blob written by
// scripts/brand-aliases/classify.mjs's --preview writeback (see writePreview
// there — the verdict object minus classified_at). Field name is
// classification_notes to match the live column it mirrors, not `notes`
// (the raw model output key gets renamed on the way into this object).
type PreviewVerdict = {
  alias: string;
  canonical_name: string | null;
  entity_type: EntityType;
  category: string | null;
  region: string | null;
  recognizability: number | null;
  im_intensity: number | null;
  classification_notes: string | null;
};

type FilterType = 'all' | 'review' | 'unclassified' | 'unverified_brands' | 'preview';

// `verified` is a purely human-set trust flag — nothing in the classification
// pipeline (prepass.mjs, classify.mjs) ever writes it, so it means exactly
// "an admin looked at this row," not "the AI was confident."
//
// supabase-js's PostgrestFilterBuilder generics don't survive a plain
// function boundary; `any` here matches this codebase's existing convention
// for supabase query intermediates (see app/admin/brands/page.tsx).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, filter: FilterType): any {
  if (filter === 'review') return query.eq('entity_type', 'unknown').not('classified_at', 'is', null);
  if (filter === 'unclassified') return query.is('classified_at', null);
  if (filter === 'unverified_brands') return query.eq('entity_type', 'brand').eq('verified', false);
  return query;
}

const ENTITY_TYPES: EntityType[] = ['brand', 'creator', 'celebrity', 'media', 'venue', 'fragment', 'unknown'];
const ROW_LIMIT = 500;

const ENTITY_TYPE_COLORS: Record<EntityType, { color: string; bg: string }> = {
  brand: { color: '#065F46', bg: '#ECFDF5' },
  creator: { color: '#3730A3', bg: '#EEF2FF' },
  celebrity: { color: '#92400E', bg: '#FFFBEB' },
  media: { color: '#1E40AF', bg: '#EFF6FF' },
  venue: { color: '#0E7490', bg: '#ECFEFF' },
  fragment: { color: '#6B7280', bg: '#F3F4F6' },
  unknown: { color: '#991B1B', bg: '#FEF2F2' },
};

export default function AdminBrandIndexPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<BrandAlias[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewVerdict[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [unverifiedBrandsCount, setUnverifiedBrandsCount] = useState(0);
  const [previewCount, setPreviewCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingAlias, setSavingAlias] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, userRole, filter]);

  // Counts for every tab are fetched independently of which tab is active, so
  // badges stay accurate no matter which one you're looking at.
  async function loadCounts() {
    const [{ count: total }, { count: review }, { count: unclassified }, { count: unverifiedBrands }, { count: preview }] = await Promise.all([
      supabase.from('brand_aliases').select('*', { count: 'exact', head: true }),
      applyFilter(supabase.from('brand_aliases').select('*', { count: 'exact', head: true }), 'review'),
      applyFilter(supabase.from('brand_aliases').select('*', { count: 'exact', head: true }), 'unclassified'),
      applyFilter(supabase.from('brand_aliases').select('*', { count: 'exact', head: true }), 'unverified_brands'),
      supabase.from('brand_aliases').select('*', { count: 'exact', head: true }).not('classification_preview', 'is', null),
    ]);
    setTotalCount(total ?? 0);
    setReviewCount(review ?? 0);
    setUnclassifiedCount(unclassified ?? 0);
    setUnverifiedBrandsCount(unverifiedBrands ?? 0);
    setPreviewCount(preview ?? 0);
  }

  async function load() {
    const seq = ++requestSeq.current;
    setDataLoading(true);
    setLoadError(null);
    try {
      if (filter === 'preview') {
        const query = supabase
          .from('brand_aliases')
          .select('alias, classification_preview')
          .not('classification_preview', 'is', null)
          .order('alias', { ascending: true })
          .limit(ROW_LIMIT);
        const [{ data, error }] = await Promise.all([query, loadCounts()]);
        if (error) throw error;
        if (seq !== requestSeq.current) return; // a newer load() (e.g. filter change) already superseded this one
        setPreviewRows(
          ((data ?? []) as { alias: string; classification_preview: PreviewVerdict }[]).map((r) => ({
            ...r.classification_preview,
            alias: r.alias, // classification_preview.alias should already match, but the row's own alias is authoritative
          }))
        );
      } else {
        const query = applyFilter(
          supabase.from('brand_aliases').select('*').order('creators_count', { ascending: false }).limit(ROW_LIMIT),
          filter
        );
        const [{ data, error }] = await Promise.all([query, loadCounts()]);
        if (error) throw error;
        if (seq !== requestSeq.current) return;
        setRows((data ?? []) as BrandAlias[]);
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load brand_aliases:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (seq === requestSeq.current) setDataLoading(false);
    }
  }

  async function saveField(alias: string, patch: Partial<BrandAlias>) {
    setSavingAlias(alias);
    setSaveError(null);
    try {
      const { error } = await supabase.from('brand_aliases').update(patch).eq('alias', alias);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.alias === alias ? { ...r, ...patch } : r)));
      // entity_type/verified changes can move a row in or out of any of the
      // other tabs, so badge counts need refreshing even though we skip a
      // full row refetch for snappier inline editing.
      if ('entity_type' in patch || 'verified' in patch) loadCounts();
    } catch (err) {
      console.error('Failed to save brand_alias field:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAlias(null);
    }
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

  const activeRowCount = filter === 'preview' ? previewRows.length : rows.length;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Brand Index</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
        Normalized brand/creator/celebrity entities detected across creator posts. Separate from Brands (customer accounts).
        Verified is set by a human only — the classification pipeline never touches it, so it&apos;s the trust flag for what&apos;s safe to use in outbound reports.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterBtn('all', `All (${totalCount})`)}
        {filterBtn('unverified_brands', `Unverified brands (${unverifiedBrandsCount})`)}
        {filterBtn('review', `Review — unknown (${reviewCount})`)}
        {filterBtn('unclassified', `Unclassified (${unclassifiedCount})`)}
        {filterBtn('preview', `Preview (${previewCount})`)}
      </div>

      {saveError && (
        <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 12px 0' }}>{saveError}</p>
      )}

      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : loadError ? (
        <div>
          <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
          <button onClick={load} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' }}>
            Retry
          </button>
        </div>
      ) : filter === 'preview' ? (
        previewRows.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
            No preview data yet — run <code>classify.mjs</code> with <code>--preview</code> to populate this tab.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: '8px', margin: '0 0 12px 0' }}>
              Preview data from test-batch runs — scratch verdicts in <code>classification_preview</code>, not committed to
              live columns. <code>classified_at</code> stays null and the live columns above are untouched for these rows
              until a real (non-preview) run.
            </p>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={thStyle}>Alias</th>
                    <th style={thStyle}>Canonical name</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Region</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Recognizability</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>IM Intensity</th>
                    <th style={thStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const typeColors = ENTITY_TYPE_COLORS[row.entity_type] ?? ENTITY_TYPE_COLORS.unknown;
                    return (
                      <tr key={row.alias} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#6B7280' }}>{row.alias}</td>
                        <td style={tdStyle}>{row.canonical_name ?? '—'}</td>
                        <td style={tdStyle}>
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: typeColors.color, backgroundColor: typeColors.bg }}>
                            {row.entity_type}
                          </span>
                        </td>
                        <td style={tdStyle}>{row.category ?? '—'}</td>
                        <td style={{ ...tdStyle, color: '#9CA3AF' }}>{row.region ?? '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.recognizability ?? '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.im_intensity ?? '—'}</td>
                        <td style={{ ...tdStyle, color: '#6B7280' }}>{row.classification_notes ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : rows.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
          {filter === 'review' && 'No unknown classifications right now.'}
          {filter === 'unverified_brands' && 'Every classified brand has been verified.'}
          {filter === 'unclassified' && 'Nothing unclassified — the AI/pre-pass has covered everything eligible.'}
          {filter === 'all' && 'No aliases found — run the seed script first.'}
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
                <th style={{ ...thStyle, textAlign: 'right' }}>Recognizability</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>IM Intensity</th>
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
                    {/* Pipeline-written, read-only here — Lukas doesn't hand-edit scores, only verified. */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: row.recognizability != null ? '#3A3A3A' : '#D1D5DB' }}>{row.recognizability ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: row.im_intensity != null ? '#3A3A3A' : '#D1D5DB' }}>{row.im_intensity ?? '—'}</td>
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
      {activeRowCount === ROW_LIMIT && (
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px' }}>
          Showing the top {ROW_LIMIT}{filter === 'all' ? ` of ${totalCount}` : ' within this filter'}.
        </p>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle: React.CSSProperties = { padding: '8px 14px', color: '#3A3A3A' };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', fontFamily: 'inherit' };
