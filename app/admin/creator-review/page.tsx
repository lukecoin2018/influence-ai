'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { CreatorEntityRow } from '@/lib/types';
import { CREATOR_ENTITY_TYPES, SIGNAL_FLAGS, type CreatorEntityType, type SignalFlag } from '@/lib/creator-entity/types';
import { platformLabel, profileUrl } from '@/lib/creator-requests/shared';

/**
 * Review of creator_entity (migration 0026): what kind of account each
 * scraped creator is, as classified by scripts/creator-entity/classify.ts.
 *
 * Reads creator_entity ONLY. Everything shown (handle, name, followers,
 * summary) comes from the row's `inputs`, i.e. what the model saw — never
 * from social_profiles or v_creator_summary, which will hide these rows from
 * the admin session once phase 2 sets creators.status = 'non_creator'.
 *
 * Reads and writes go through the admin's browser session, like
 * /admin/brand-index: 0026's SELECT and UPDATE policies admit
 * is_admin_user(). A write sets review_entity_type (the effective type is
 * review_entity_type ?? entity_type) and reviewed_at; clearing sets both back
 * to null, which returns the row to the Review tab.
 */

type Tab = 'review' | 'non_creators' | 'all';

const PAGE_SIZE = 100;

/**
 * Unreviewed rows (reviewed_at is null) that need a human — any of:
 *  - medium or low confidence, whatever the verdict;
 *  - entity_type 'other' — phase 2 will not exclude 'other' automatically;
 *  - a creator verdict with 2+ non-creator flags (flag_count excludes ig_business);
 *  - a non-creator verdict with nothing corroborating it: no non-creator flag
 *    and not even a business account;
 *  - a creator verdict on a handle brand_aliases knows as a brand, media or
 *    venue (@gymsharkwomen: the AI summary called it a creator).
 */
const REVIEW_FILTER = [
  'confidence.in.(medium,low)',
  'entity_type.eq.other',
  'and(entity_type.eq.creator,flag_count.gte.2)',
  'and(entity_type.neq.creator,flag_count.eq.0,signals->>ig_business.eq.false)',
  'and(entity_type.eq.creator,signals->>alias_match.eq.true)',
].join(',');

/** Effective type is not 'creator': an override other than creator, or no override and a non-creator verdict. */
const NON_CREATOR_FILTER = 'review_entity_type.neq.creator,and(review_entity_type.is.null,entity_type.neq.creator)';

const TABS: { value: Tab; label: string }[] = [
  { value: 'review', label: 'Review' },
  { value: 'non_creators', label: 'Non-creators' },
  { value: 'all', label: 'All' },
];

const TYPE_COLORS: Record<CreatorEntityType, { color: string; bg: string }> = {
  creator: { color: '#3730A3', bg: '#EEF2FF' },
  brand: { color: '#065F46', bg: '#ECFDF5' },
  media: { color: '#1E40AF', bg: '#EFF6FF' },
  venue: { color: '#0E7490', bg: '#ECFEFF' },
  other: { color: '#991B1B', bg: '#FEF2F2' },
};

const FLAG_LABELS: Record<SignalFlag, string> = {
  ig_business: 'IG business',
  business_category: 'Business category',
  summary_self_description: 'Summary: self-description',
  summary_official: 'Summary: official',
  handle_suffix: 'Handle suffix',
  display_name_suffix: 'Name suffix',
  domain_matches_name: 'Domain = name',
  alias_match: 'Brand alias',
  creator_category: 'Creator category',
};

function flagStyle(flag: SignalFlag): { color: string; bg: string } {
  if (flag === 'creator_category') return { color: '#166534', bg: '#DCFCE7' };
  if (flag === 'ig_business') return { color: '#4B5563', bg: '#F3F4F6' };
  return { color: '#92400E', bg: '#FEF3C7' };
}

function tabQuery(tab: Tab, count?: 'exact') {
  const base = supabase.from('creator_entity').select('*', count ? { count, head: true } : undefined);
  if (tab === 'review') return base.is('reviewed_at', null).or(REVIEW_FILTER);
  if (tab === 'non_creators') return base.or(NON_CREATOR_FILTER);
  return base;
}

type Loaded = {
  key: string;
  rows: CreatorEntityRow[];
  counts: Record<Tab, number>;
  error: string | null;
  /** creator_entity not found: migration 0026 has not been applied. */
  tableMissing: boolean;
};

export default function AdminCreatorReviewPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('review');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const requestKey = `${tab}|${page}|${reloadKey}`;
  const isAdmin = !!user && userRole === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/login');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (loading || !isAdmin) return;
    let cancelled = false;
    const offset = (page - 1) * PAGE_SIZE;
    const key = `${tab}|${page}|${reloadKey}`;

    Promise.all([
      tabQuery(tab)
        .order('inputs->follower_count', { ascending: false, nullsFirst: false })
        .order('creator_id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      tabQuery('review', 'exact'),
      tabQuery('non_creators', 'exact'),
      tabQuery('all', 'exact'),
    ]).then(([data, review, nonCreators, all]) => {
      if (cancelled) return;
      const error = data.error ?? review.error ?? nonCreators.error ?? all.error;
      const tableMissing = error?.code === 'PGRST205' || error?.code === '42P01';
      if (error && !tableMissing) console.error('Failed to load creator_entity:', error);
      setLoaded({
        key,
        rows: error ? [] : ((data.data ?? []) as CreatorEntityRow[]),
        counts: { review: review.count ?? 0, non_creators: nonCreators.count ?? 0, all: all.count ?? 0 },
        error: error && !tableMissing ? error.message : null,
        tableMissing,
      });
    });

    return () => { cancelled = true; };
  }, [loading, isAdmin, tab, page, reloadKey]);

  async function setOverride(row: CreatorEntityRow, value: CreatorEntityType | null) {
    setSavingId(row.creator_id);
    setSaveError(null);
    const patch = { review_entity_type: value, reviewed_at: value ? new Date().toISOString() : null };
    // .select() so an update RLS silently filtered out (0 rows) is reported, not mistaken for success.
    const { data, error } = await supabase.from('creator_entity').update(patch).eq('creator_id', row.creator_id).select('creator_id');
    setSavingId(null);
    if (error || !data || data.length === 0) {
      setSaveError(error?.message ?? 'Not saved: no row was updated. Is this account an admin in user_roles?');
      return;
    }
    setLoaded((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.creator_id === row.creator_id ? { ...r, ...patch } : r)) } : prev));
    // Refetch so counts update and a reviewed row leaves the Review tab.
    setReloadKey((k) => k + 1);
  }

  if (loading || !isAdmin) {
    return <div style={{ padding: '32px', color: '#6B7280', fontSize: '14px' }}>Loading...</div>;
  }

  const counts = loaded?.counts ?? { review: 0, non_creators: 0, all: 0 };
  const refreshing = loaded?.key !== requestKey;
  const totalPages = Math.max(1, Math.ceil(counts[tab] / PAGE_SIZE));

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>Creator Review</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '6px 0 20px', maxWidth: '760px', lineHeight: 1.5 }}>
        What kind of account each scraped creator is, as classified by the model, with the heuristic flags beside it.
        Shows what the model saw, not live profile data. Setting a type here overrides the model; nothing is excluded from the
        product yet.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setTab(value); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', backgroundColor: tab === value ? '#FFD700' : '#F3F4F6', color: tab === value ? 'white' : '#374151' }}
          >
            {label} ({counts[value].toLocaleString('en-US')})
          </button>
        ))}
        {loaded && refreshing && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Refreshing…</span>}
      </div>

      {loaded?.tableMissing && (
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FFFBEB', color: '#92400E', fontSize: '13px', marginBottom: '16px' }}>
          The creator_entity table does not exist yet. Apply supabase/migrations/0026_creator_entity.sql, then run
          npm run creator-entity:classify.
        </div>
      )}
      {loaded?.error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', marginBottom: '16px' }}>
          Failed to load: {loaded.error}
        </div>
      )}
      {saveError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', marginBottom: '16px' }}>
          {saveError}
        </div>
      )}

      {!loaded ? (
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</div>
      ) : loaded.rows.length === 0 && !loaded.tableMissing && !loaded.error ? (
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Nothing here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: refreshing ? 0.6 : 1 }}>
          {loaded.rows.map((row) => (
            <ReviewRow key={row.creator_id} row={row} saving={savingId === row.creator_id} onSet={(value) => setOverride(row, value)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', fontSize: '13px', color: '#374151' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pagerButton(page <= 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pagerButton(page >= totalPages)}>Next</button>
        </div>
      )}
    </div>
  );
}

function pagerButton(disabled: boolean): CSSProperties {
  return { padding: '5px 12px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 };
}

function TypeBadge({ type }: { type: CreatorEntityType }) {
  const { color, bg } = TYPE_COLORS[type];
  return <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color, backgroundColor: bg }}>{type}</span>;
}

function ReviewRow({ row, saving, onSet }: { row: CreatorEntityRow; saving: boolean; onSet: (value: CreatorEntityType | null) => void }) {
  const inputs = row.inputs;
  const signals = row.signals;
  const effective = row.review_entity_type ?? row.entity_type;
  const summary = inputs.summary ?? '';
  const flags = SIGNAL_FLAGS.filter((flag) => signals[flag]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: '16px', padding: '14px 16px', border: '1px solid #E5E7EB', borderRadius: '10px', backgroundColor: 'white' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {inputs.platform ? platformLabel(inputs.platform) : 'No profile'}
        </div>
        {inputs.platform && inputs.handle ? (
          <a href={profileUrl(inputs.platform, inputs.handle)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 600, color: '#1D4ED8', textDecoration: 'none', wordBreak: 'break-all' }}>
            @{inputs.handle}
          </a>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>—</div>
        )}
        <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>{inputs.display_name ?? '—'}</div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
          {inputs.follower_count != null ? `${inputs.follower_count.toLocaleString('en-US')} followers` : 'followers unknown'}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <TypeBadge type={effective} />
          {row.review_entity_type ? (
            <span style={{ fontSize: '12px', color: '#6B7280' }}>reviewed · model said {row.entity_type}/{row.confidence}</span>
          ) : (
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{row.confidence} confidence</span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#111827', marginTop: '6px' }}>{row.reason}</div>
        {flags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {flags.map((flag) => {
              const { color, bg } = flagStyle(flag);
              return (
                <span key={flag} title={signals.matches?.[flag] ?? undefined} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, color, backgroundColor: bg }}>
                  {FLAG_LABELS[flag]}
                </span>
              );
            })}
          </div>
        )}
        {summary && (
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', lineHeight: 1.5 }}>
            {summary.length > 200 ? `${summary.slice(0, 200)}…` : summary}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
        <button
          disabled={saving}
          onClick={() => onSet('creator')}
          style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', backgroundColor: row.review_entity_type === 'creator' ? '#3730A3' : '#4F46E5', color: 'white', opacity: saving ? 0.6 : 1 }}
        >
          {row.review_entity_type === 'creator' ? '✓ Creator' : 'Creator'}
        </button>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {CREATOR_ENTITY_TYPES.filter((t) => t !== 'creator').map((type) => {
            const active = row.review_entity_type === type;
            return (
              <button
                key={type}
                disabled={saving}
                onClick={() => onSet(type)}
                style={{ flex: '1 1 0', padding: '4px 6px', borderRadius: '6px', fontSize: '12px', cursor: saving ? 'default' : 'pointer', border: `1px solid ${active ? TYPE_COLORS[type].color : '#E5E7EB'}`, backgroundColor: active ? TYPE_COLORS[type].bg : 'white', color: active ? TYPE_COLORS[type].color : '#374151', fontWeight: active ? 600 : 400, opacity: saving ? 0.6 : 1 }}
              >
                {type}
              </button>
            );
          })}
        </div>
        {row.review_entity_type && (
          <button
            disabled={saving}
            onClick={() => onSet(null)}
            style={{ padding: '2px', border: 'none', background: 'none', fontSize: '12px', color: '#6B7280', textDecoration: 'underline', cursor: saving ? 'default' : 'pointer' }}
          >
            Clear override
          </button>
        )}
      </div>
    </div>
  );
}
