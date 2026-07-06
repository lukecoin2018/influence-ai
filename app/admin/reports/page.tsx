// app/admin/reports/page.tsx
'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  resolveCanonicalBrand,
  getBrandActivity,
  suggestCompetitors,
  getCompetitorActivities,
  type BrandActivity,
  type ResolvedBrand,
} from '@/lib/reports/brand-activity';
import { getMatchedCreators, type MatchedCreator } from '@/lib/reports/matching';

const MAX_COMPETITORS = 3;
const TIER3_PREVIEW_LIMIT = 10;

interface BrandReport {
  id: string;
  brand_name: string;
  slug: string;
  brand_handle: string | null;
  category: string | null;
  mode: 'auto' | 'manual';
  competitor_names: string[] | null;
  excluded_creator_ids: string[] | null;
  pinned_creator_ids: string[] | null;
  created_at: string;
}

type ReportDetail = {
  loading: boolean;
  resolved: ResolvedBrand | null;
  tier1: BrandActivity | null;
  competitors: BrandActivity[];
};

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function loadDetail(report: Pick<BrandReport, 'brand_handle' | 'brand_name' | 'competitor_names'>): Promise<ReportDetail> {
  const resolved = await resolveCanonicalBrand(supabase, { brandHandle: report.brand_handle, brandName: report.brand_name });
  const tier1 = resolved ? await getBrandActivity(supabase, resolved.canonicalName) : null;
  let competitors: BrandActivity[] = [];
  if (report.competitor_names) {
    competitors = await getCompetitorActivities(supabase, report.competitor_names);
  } else if (resolved) {
    competitors = await suggestCompetitors(supabase, { excludeCanonicalName: resolved.canonicalName, category: resolved.category });
  }
  return { loading: false, resolved, tier1, competitors };
}

/** Recomputes the Tier 3 preview for the report editor exactly as the live report page would, given the in-progress edits. */
async function loadTier3Preview(
  report: Pick<BrandReport, 'mode' | 'brand_handle' | 'category'>,
  competitorNames: string[],
  excludedIds: string[],
  pinnedIds: string[],
): Promise<MatchedCreator[]> {
  const competitors = competitorNames.length > 0 ? await getCompetitorActivities(supabase, competitorNames) : [];
  const excludeCreatorIds = new Set([...competitors.flatMap((c) => c.allCreatorIds), ...excludedIds]);
  return getMatchedCreators(supabase, {
    mode: report.mode,
    brandHandle: report.brand_handle,
    category: report.category,
    excludeCreatorIds,
    pinnedCreatorIds: pinnedIds,
    limit: TIER3_PREVIEW_LIMIT,
  });
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

function ActivitySummary({ detail }: { detail: ReportDetail | undefined }) {
  if (!detail || detail.loading) return <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Checking activity…</span>;
  if (!detail.tier1) return <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No detected activity</span>;
  return (
    <span style={{ fontSize: '12px', color: '#16a34a' }}>
      {detail.tier1.sponsoredPosts.toLocaleString()} posts · {detail.tier1.distinctCreators.toLocaleString()} creators
    </span>
  );
}

function Tier3Summary({ report }: { report: BrandReport }) {
  const pinned = report.pinned_creator_ids?.length ?? 0;
  const excluded = report.excluded_creator_ids?.length ?? 0;
  if (pinned === 0 && excluded === 0) return <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Auto (no manual curation)</span>;
  return (
    <span style={{ fontSize: '12px', color: '#3A3A3A' }}>
      {pinned > 0 && `${pinned} pinned`}{pinned > 0 && excluded > 0 && ' · '}{excluded > 0 && `${excluded} removed`}
    </span>
  );
}

function CompetitorPicker({
  id,
  names,
  onChange,
  verifiedOptions,
  onSuggest,
  suggesting,
}: {
  id: string;
  names: string[];
  onChange: (names: string[]) => void;
  verifiedOptions: string[];
  onSuggest: () => void;
  suggesting: boolean;
}) {
  const [addValue, setAddValue] = useState('');
  const available = verifiedOptions.filter((n) => !names.includes(n));
  const datalistId = `verified-brand-options-${id}`;

  const addCompetitor = () => {
    const trimmed = addValue.trim();
    if (!trimmed || names.includes(trimmed) || names.length >= MAX_COMPETITORS) return;
    if (!verifiedOptions.includes(trimmed)) return; // only verified brands may ever be named in Tier 2
    onChange([...names, trimmed]);
    setAddValue('');
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {names.length === 0 && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No competitors chosen yet.</span>}
        {names.map((name) => (
          <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, backgroundColor: 'rgba(255,215,0,0.15)', color: '#92660b' }}>
            {name}
            <button type="button" onClick={() => onChange(names.filter((n) => n !== name))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92660b', fontWeight: 700, padding: 0, lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSuggest}
          disabled={suggesting}
          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#3A3A3A', cursor: suggesting ? 'not-allowed' : 'pointer', opacity: suggesting ? 0.6 : 1 }}
        >
          {suggesting ? 'Suggesting…' : 'Auto-suggest'}
        </button>
        {names.length < MAX_COMPETITORS && (
          <>
            <input
              list={datalistId}
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(); } }}
              placeholder="Add a verified competitor…"
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#3A3A3A', width: '220px' }}
            />
            <datalist id={datalistId}>
              {available.map((n) => <option key={n} value={n} />)}
            </datalist>
            <button
              type="button"
              onClick={addCompetitor}
              disabled={!addValue.trim() || !verifiedOptions.includes(addValue.trim())}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', backgroundColor: '#FFD700', color: '#3A3A3A', cursor: 'pointer' }}
            >
              Add
            </button>
          </>
        )}
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{names.length}/{MAX_COMPETITORS} · verified brands only</span>
      </div>
    </div>
  );
}

function Tier3Editor({
  matches,
  loading,
  pinnedIds,
  excludedCount,
  onTogglePin,
  onRemove,
  onClearRemovals,
}: {
  matches: MatchedCreator[];
  loading: boolean;
  pinnedIds: string[];
  excludedCount: number;
  onTogglePin: (creatorId: string) => void;
  onRemove: (creatorId: string) => void;
  onClearRemovals: () => void;
}) {
  return (
    <div>
      {loading ? (
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Computing matches…</p>
      ) : matches.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>No matches — nothing to curate yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {matches.map((m) => {
            const isPinned = pinnedIds.includes(m.creatorId);
            return (
              <div key={m.creatorId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', backgroundColor: isPinned ? 'rgba(255,215,0,0.12)' : '#F9FAFB', border: '1px solid #F3F4F6' }}>
                <button
                  type="button"
                  onClick={() => onTogglePin(m.creatorId)}
                  title={isPinned ? 'Unpin' : 'Pin to always appear first'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0, opacity: isPinned ? 1 : 0.35 }}
                >
                  📌
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#3A3A3A' }}>{m.displayName}</span>
                  <span style={{ fontSize: '11.5px', color: '#9CA3AF', marginLeft: '6px' }}>@{m.handle} · {m.platform} · {m.engagementRate.toFixed(1)}% eng.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(m.creatorId)}
                  title="Remove from Tier 3"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 700, fontSize: '13px', padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      {excludedCount > 0 && (
        <button type="button" onClick={onClearRemovals} style={{ marginTop: '8px', fontSize: '11px', color: '#3AAFF4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Clear {excludedCount} manual removal{excludedCount === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<BrandReport[]>([]);
  const [details, setDetails] = useState<Record<string, ReportDetail>>({});
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingCompetitorNames, setEditingCompetitorNames] = useState<string[]>([]);
  const [editingExcludedIds, setEditingExcludedIds] = useState<string[]>([]);
  const [editingPinnedIds, setEditingPinnedIds] = useState<string[]>([]);
  const [tier3Preview, setTier3Preview] = useState<{ loading: boolean; matches: MatchedCreator[] }>({ loading: false, matches: [] });
  const [savingReport, setSavingReport] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [brandHandle, setBrandHandle] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [slugEdited, setSlugEdited] = useState(false);

  const [verifiedBrandOptions, setVerifiedBrandOptions] = useState<string[]>([]);
  const [formCompetitors, setFormCompetitors] = useState<string[]>([]);
  const [formSuggesting, setFormSuggesting] = useState(false);
  const [rowSuggesting, setRowSuggesting] = useState(false);

  // Wait for auth exactly like other admin pages do
  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    loadReports();
    loadVerifiedBrandOptions();
  }, [loading, user, userRole]);

  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(brandName));
  }, [brandName, slugEdited]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  async function loadVerifiedBrandOptions() {
    const { data } = await supabase
      .from('brand_aliases')
      .select('canonical_name')
      .eq('entity_type', 'brand')
      .eq('verified', true)
      .not('canonical_name', 'is', null);
    const names = [...new Set((data ?? []).map((r) => r.canonical_name as string))].sort();
    setVerifiedBrandOptions(names);
  }

  const loadReportDetails = useCallback((rows: BrandReport[]) => {
    for (const report of rows) {
      setDetails((prev) => ({ ...prev, [report.id]: { loading: true, resolved: null, tier1: null, competitors: [] } }));
      loadDetail(report).then((detail) => {
        setDetails((prev) => ({ ...prev, [report.id]: detail }));
      });
    }
  }, []);

  async function loadReports() {
    setDataLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.from('brand_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as BrandReport[];
      setReports(rows);
      loadReportDetails(rows);
    } catch (err) {
      console.error('Failed to load brand_reports:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setDataLoading(false);
    }
  }

  async function handleFormSuggest() {
    if (!brandName.trim() && !brandHandle.trim()) return;
    setFormSuggesting(true);
    try {
      const resolved = await resolveCanonicalBrand(supabase, { brandHandle: brandHandle.trim() || null, brandName: brandName.trim() });
      if (!resolved) {
        setToast({ message: 'Could not resolve this brand against brand_aliases — no suggestions available', type: 'error' });
        return;
      }
      const suggestions = await suggestCompetitors(supabase, { excludeCanonicalName: resolved.canonicalName, category: resolved.category });
      setFormCompetitors(suggestions.map((s) => s.canonicalName));
      if (suggestions.length === 0) setToast({ message: 'No qualifying competitors found (same category, verified, ≥5 creators)', type: 'error' });
    } finally {
      setFormSuggesting(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    if (mode === 'manual' && !category.trim()) { setToast({ message: 'Category is required for manual mode', type: 'error' }); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('brand_reports').insert({
        brand_name: brandName.trim(),
        slug: slug.trim() || toSlug(brandName),
        brand_handle: brandHandle.trim() || null,
        category: category.trim() || null,
        mode,
        competitor_names: formCompetitors.length > 0 ? formCompetitors : null,
      });
      if (error) throw error;
      setToast({ message: 'Report created!', type: 'success' });
      setBrandName(''); setSlug(''); setBrandHandle(''); setCategory(''); setMode('auto'); setSlugEdited(false);
      setFormCompetitors([]);
      loadReports();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create report';
      setToast({ message: message.includes('unique') ? 'A report with that slug already exists' : message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('brand_reports').delete().eq('id', id);
      if (error) throw error;
      setToast({ message: 'Report deleted', type: 'success' });
      loadReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
      setToast({ message: 'Failed to delete report', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  async function refreshTier3Preview(report: BrandReport, competitorNames: string[], excludedIds: string[], pinnedIds: string[]) {
    setTier3Preview({ loading: true, matches: [] });
    const matches = await loadTier3Preview(report, competitorNames, excludedIds, pinnedIds);
    setTier3Preview({ loading: false, matches });
  }

  function startEditingReport(report: BrandReport) {
    const competitorNames = report.competitor_names ?? details[report.id]?.competitors.map((c) => c.canonicalName) ?? [];
    const excludedIds = report.excluded_creator_ids ?? [];
    const pinnedIds = report.pinned_creator_ids ?? [];
    setEditingReportId(report.id);
    setEditingCompetitorNames(competitorNames);
    setEditingExcludedIds(excludedIds);
    setEditingPinnedIds(pinnedIds);
    refreshTier3Preview(report, competitorNames, excludedIds, pinnedIds);
  }

  function handleEditCompetitorsChange(report: BrandReport, names: string[]) {
    setEditingCompetitorNames(names);
    refreshTier3Preview(report, names, editingExcludedIds, editingPinnedIds);
  }

  async function handleRowSuggest(report: BrandReport) {
    setRowSuggesting(true);
    try {
      const resolved = await resolveCanonicalBrand(supabase, { brandHandle: report.brand_handle, brandName: report.brand_name });
      if (!resolved) { setToast({ message: 'Could not resolve this brand', type: 'error' }); return; }
      const suggestions = await suggestCompetitors(supabase, { excludeCanonicalName: resolved.canonicalName, category: resolved.category });
      const names = suggestions.map((s) => s.canonicalName);
      setEditingCompetitorNames(names);
      refreshTier3Preview(report, names, editingExcludedIds, editingPinnedIds);
    } finally {
      setRowSuggesting(false);
    }
  }

  function handleTogglePin(report: BrandReport, creatorId: string) {
    const newPinned = editingPinnedIds.includes(creatorId)
      ? editingPinnedIds.filter((id) => id !== creatorId)
      : [...editingPinnedIds, creatorId];
    setEditingPinnedIds(newPinned);
    refreshTier3Preview(report, editingCompetitorNames, editingExcludedIds, newPinned);
  }

  function handleRemoveMatch(report: BrandReport, creatorId: string) {
    const newExcluded = [...editingExcludedIds, creatorId];
    const newPinned = editingPinnedIds.filter((id) => id !== creatorId);
    setEditingExcludedIds(newExcluded);
    setEditingPinnedIds(newPinned);
    refreshTier3Preview(report, editingCompetitorNames, newExcluded, newPinned);
  }

  function handleClearRemovals(report: BrandReport) {
    setEditingExcludedIds([]);
    refreshTier3Preview(report, editingCompetitorNames, [], editingPinnedIds);
  }

  async function saveReportChanges(report: BrandReport) {
    setSavingReport(true);
    try {
      // .select() after .update() isn't just for the return value — it's the only way to
      // detect a write silently blocked by RLS. Postgres/PostgREST doesn't error when a
      // policy excludes the row from an UPDATE; it just matches zero rows, and `error`
      // stays null. Without checking the returned rows, a blocked save looks identical to
      // a successful one (this exact bug: saves appeared to succeed but never persisted).
      const { data, error } = await supabase
        .from('brand_reports')
        .update({
          competitor_names: editingCompetitorNames,
          excluded_creator_ids: editingExcludedIds,
          pinned_creator_ids: editingPinnedIds,
        })
        .eq('id', report.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Update affected no rows — check that brand_reports has an UPDATE policy for admins.');
      }
      const updated = {
        ...report,
        competitor_names: editingCompetitorNames,
        excluded_creator_ids: editingExcludedIds,
        pinned_creator_ids: editingPinnedIds,
      };
      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)));
      loadReportDetails([updated]);
      setEditingReportId(null);
      setToast({ message: 'Report updated', type: 'success' });
    } catch (err) {
      console.error('Failed to update report:', err);
      setToast({ message: 'Failed to update report', type: 'error' });
    } finally {
      setSavingReport(false);
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://influenceit.app';
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#3A3A3A', backgroundColor: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: 600 as const, color: '#6B7280', marginBottom: '4px' };

  return (
    <div style={{ maxWidth: '1080px' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50, padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, color: 'white', backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Brand Reports</h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Create personalised, evidence-based creator reports to send to prospective brand partners.</p>
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

          <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}>
            <label style={labelStyle}>Competitors (Tier 2)</label>
            <CompetitorPicker
              id="create-form"
              names={formCompetitors}
              onChange={setFormCompetitors}
              verifiedOptions={verifiedBrandOptions}
              onSuggest={handleFormSuggest}
              suggesting={formSuggesting}
            />
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
        ) : loadError ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
            <button onClick={loadReports} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' }}>
              Retry
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No reports yet. Create one above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {['Brand', 'Detected activity', 'Competitors', 'Tier 3', 'URL', 'Mode', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(report => {
                const url = `${baseUrl}/report/${report.slug}`;
                const detail = details[report.id];
                const isEditing = editingReportId === report.id;
                return (
                  <Fragment key={report.id}>
                    <tr style={{ borderTop: '1px solid #F3F4F6', verticalAlign: 'top' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: 0 }}>{report.brand_name}</p>
                        {report.brand_handle && <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>@{report.brand_handle}</p>}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <ActivitySummary detail={detail} />
                      </td>
                      <td style={{ padding: '14px 20px', minWidth: '160px' }}>
                        {!detail || detail.loading ? (
                          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Loading…</span>
                        ) : detail.competitors.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>None{report.competitor_names === null ? ' (no auto-suggestion qualified)' : ''}</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {detail.competitors.map((c) => (
                              <span key={c.canonicalName} style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, backgroundColor: 'rgba(255,215,0,0.15)', color: '#92660b' }}>
                                {c.canonicalName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <Tier3Summary report={report} />
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
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button onClick={() => (isEditing ? setEditingReportId(null) : startEditingReport(report))} style={{ fontSize: '12px', color: '#3AAFF4', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {isEditing ? 'Close' : 'Edit'}
                          </button>
                          <button onClick={() => handleDelete(report.id)} disabled={deletingId === report.id} style={{ fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', opacity: deletingId === report.id ? 0.4 : 1 }}>
                            {deletingId === report.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr key={`${report.id}-editor`} style={{ borderTop: '1px solid #F3F4F6', backgroundColor: '#FAFAFA' }}>
                        <td colSpan={7} style={{ padding: '20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 10px' }}>Competitors (Tier 2)</p>
                              <CompetitorPicker
                                id={report.id}
                                names={editingCompetitorNames}
                                onChange={(names) => handleEditCompetitorsChange(report, names)}
                                verifiedOptions={verifiedBrandOptions}
                                onSuggest={() => handleRowSuggest(report)}
                                suggesting={rowSuggesting}
                              />
                            </div>
                            <div>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 10px' }}>Recommended for you (Tier 3)</p>
                              <Tier3Editor
                                matches={tier3Preview.matches}
                                loading={tier3Preview.loading}
                                pinnedIds={editingPinnedIds}
                                excludedCount={editingExcludedIds.length}
                                onTogglePin={(creatorId) => handleTogglePin(report, creatorId)}
                                onRemove={(creatorId) => handleRemoveMatch(report, creatorId)}
                                onClearRemovals={() => handleClearRemovals(report)}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                            <button onClick={() => saveReportChanges(report)} disabled={savingReport} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', backgroundColor: '#16a34a', color: 'white', cursor: 'pointer' }}>
                              {savingReport ? 'Saving…' : 'Save changes'}
                            </button>
                            <button onClick={() => setEditingReportId(null)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#6B7280', cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
