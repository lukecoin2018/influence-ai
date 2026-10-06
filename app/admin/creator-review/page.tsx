'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { CreatorEntityRow } from '@/lib/types';
import {
  CREATOR_ENTITY_TYPES,
  SIGNAL_FLAGS,
  type CreatorEntityStatusChange,
  type CreatorEntityType,
  type SignalFlag,
} from '@/lib/creator-entity/types';
import {
  PLATFORM_FILTERS,
  REVIEW_TABS,
  acceptableRows,
  isMissingColumnError,
  overrideHidesClaimed,
  tabFilter,
  type PlatformFilter,
  type ReviewTab,
} from '@/lib/creator-entity/review';
import { platformLabel, profileUrl } from '@/lib/creator-requests/shared';

/**
 * Review of creator_entity (migration 0026): what kind of account each
 * scraped creator is, as classified by scripts/creator-entity/classify.ts —
 * and, since 0027, which accounts that hides from the product
 * (creators.status = 'non_creator').
 *
 * Reads creator_entity ONLY for what it shows. Everything shown (handle, name,
 * followers, summary) comes from the row's `inputs`, i.e. what the model saw —
 * never from social_profiles or v_creator_summary, which hide exactly the
 * rows this page exists to review once they are 'non_creator'. What is hidden
 * comes from creator_entity.excluded, written by apply_creator_entity()
 * alongside creators.status, so the rule has one copy, in SQL.
 *
 * Also reads creator_profiles (claimed accounts) for the Review tab's R6, the
 * Claimed badge, and the two guards around hiding a claimed account.
 *
 * Reads and writes go through the admin's browser session, like
 * /admin/brand-index: 0026's SELECT and UPDATE policies admit
 * is_admin_user(), and 0027's two functions refuse anyone else. An override
 * sets review_entity_type and reviewed_at, then calls apply_creator_entity()
 * for that row so the product follows at once; clearing sets both back to
 * null, which returns the row to the rule's unreviewed branch.
 *
 * Tab and filter logic lives in lib/creator-entity/review.ts.
 */

const PAGE_SIZE = 100;

type Counts = Record<ReviewTab, number>;

type Loaded = {
  key: string;
  rows: CreatorEntityRow[];
  counts: Counts;
  claimedIds: string[];
  /** creator_profiles could not be read: R6 is missing and bulk accept is off. */
  claimedError: string | null;
  error: string | null;
  /** creator_entity not found: migration 0026 has not been applied. */
  tableMissing: boolean;
  /** creator_entity.excluded not found: migration 0027 has not been applied. */
  exclusionMissing: boolean;
};

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

/**
 * A tab's rows, or with `count` its total. Counts are a one-row GET with an
 * exact count, not `head: true`: a HEAD response has no body, so its error
 * arrives with no code and no message (measured 2026-10-06), and the page
 * needs 42703 to tell "0027 not applied" from a real failure.
 */
function tabQuery(tab: ReviewTab, options: { platform: PlatformFilter; claimedIds: readonly string[] }, count?: 'exact') {
  const filter = tabFilter(tab, options);
  let query = supabase.from('creator_entity').select(count ? 'creator_id' : '*', count ? { count } : undefined);
  if (filter.platform) query = query.eq('inputs->>platform', filter.platform);
  if (filter.unreviewedOnly) query = query.is('reviewed_at', null);
  if (filter.or) query = query.or(filter.or);
  if (filter.excludedOnly) query = query.eq('excluded', true);
  return count ? query.limit(1) : query;
}

function handleOf(row: CreatorEntityRow): string {
  return row.inputs.handle ? `@${row.inputs.handle}` : row.inputs.display_name ?? 'This account';
}

export default function AdminCreatorReviewPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ReviewTab>('review');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestKey = `${tab}|${platform}|${page}|${reloadKey}`;
  const isAdmin = !!user && userRole === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/login');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (loading || !isAdmin) return;
    let cancelled = false;
    const offset = (page - 1) * PAGE_SIZE;
    const key = `${tab}|${platform}|${page}|${reloadKey}`;

    // Claimed accounts first: the Review tab's R6 is built from them.
    supabase
      .from('creator_profiles')
      .select('creator_id')
      .not('creator_id', 'is', null)
      .then((claimedResult) => {
        if (cancelled) return;
        if (claimedResult.error) console.error('Failed to load claimed accounts:', claimedResult.error);
        const claimedIds = claimedResult.error ? [] : ((claimedResult.data ?? []) as { creator_id: string }[]).map((r) => r.creator_id);
        const options = { platform, claimedIds };

        return Promise.all([
          tabQuery(tab, options)
            .order('inputs->follower_count', { ascending: false, nullsFirst: false })
            .order('creator_id', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1),
          tabQuery('review', options, 'exact'),
          tabQuery('non_creators', options, 'exact'),
          tabQuery('hidden', options, 'exact'),
          tabQuery('all', options, 'exact'),
        ]).then(([data, review, nonCreators, hidden, all]) => {
          if (cancelled) return;
          // Before 0027 the Hidden tab's filter names a column that does not
          // exist. That costs the Hidden tab, not the page.
          const exclusionMissing = isMissingColumnError(hidden.error, 'excluded');
          const dataError = tab === 'hidden' && exclusionMissing ? null : data.error;
          const error = dataError ?? review.error ?? nonCreators.error ?? (exclusionMissing ? null : hidden.error) ?? all.error;
          const tableMissing = error?.code === 'PGRST205' || error?.code === '42P01';
          if (error && !tableMissing) console.error('Failed to load creator_entity:', error);
          setLoaded({
            key,
            rows: error || data.error ? [] : ((data.data ?? []) as CreatorEntityRow[]),
            counts: {
              review: review.count ?? 0,
              non_creators: nonCreators.count ?? 0,
              hidden: exclusionMissing ? 0 : hidden.count ?? 0,
              all: all.count ?? 0,
            },
            claimedIds,
            claimedError: claimedResult.error ? claimedResult.error.message : null,
            error: error && !tableMissing ? error.message : null,
            tableMissing,
            exclusionMissing,
          });
        });
      });

    return () => { cancelled = true; };
  }, [loading, isAdmin, tab, platform, page, reloadKey]);

  async function setOverride(row: CreatorEntityRow, value: CreatorEntityType | null) {
    const claimed = new Set(loaded?.claimedIds ?? []);
    if (overrideHidesClaimed(row.creator_id, value, claimed)) {
      const ok = window.confirm(
        `${handleOf(row)} is a claimed account. Marking it "${value}" hides it from the product, and the creator's dashboard ` +
          'will go blank: its stats, profile details and outreach tool all read the hidden profile.\n\nHide it?',
      );
      if (!ok) return;
    }

    setSavingId(row.creator_id);
    setSaveError(null);
    setNotice(null);
    const patch = { review_entity_type: value, reviewed_at: value ? new Date().toISOString() : null };
    // .select() so an update RLS silently filtered out (0 rows) is reported, not mistaken for success.
    const { data, error } = await supabase.from('creator_entity').update(patch).eq('creator_id', row.creator_id).select('creator_id');
    if (error || !data || data.length === 0) {
      setSavingId(null);
      setSaveError(error?.message ?? 'Not saved: no row was updated. Is this account an admin in user_roles?');
      return;
    }

    // The review is saved; now make the product follow it.
    const applied = await supabase.rpc('apply_creator_entity', { p_ids: [row.creator_id], p_dry_run: false });
    setSavingId(null);
    if (applied.error) {
      setSaveError(
        `Saved, but the exclusion rule did not run: ${applied.error.message}. ` +
          (applied.error.code === 'PGRST202' ? 'Apply supabase/migrations/0027_creator_exclusion.sql.' : 'Saving again retries it.'),
      );
    } else {
      const change = ((applied.data ?? []) as CreatorEntityStatusChange[])[0];
      if (change) setNotice(`${handleOf(row)} ${change.to_status === 'non_creator' ? 'is now hidden' : 'is visible again'}.`);
    }
    setLoaded((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.creator_id === row.creator_id ? { ...r, ...patch } : r)) } : prev));
    // Refetch so counts and the Hidden badge update and a reviewed row leaves the Review tab.
    setReloadKey((k) => k + 1);
  }

  async function acceptPage() {
    if (!loaded) return;
    const claimed = new Set(loaded.claimedIds);
    const rows = acceptableRows(loaded.rows, claimed);
    if (rows.length === 0) return;
    const hiding = rows.filter((r) => r.entity_type !== 'creator').length;
    const skipped = loaded.rows.filter((r) => r.reviewed_at == null && claimed.has(r.creator_id)).length;
    const ok = window.confirm(
      `Accept the model's verdict on ${rows.length} unreviewed row(s) on this page?\n\n` +
        `${hiding} of them have a non-creator verdict and will be hidden from the product.` +
        (skipped > 0 ? `\n${skipped} claimed account(s) on this page are skipped; review those one at a time.` : ''),
    );
    if (!ok) return;

    setBulkSaving(true);
    setSaveError(null);
    setNotice(null);
    const { data, error } = await supabase.rpc('accept_creator_entity', { p_ids: rows.map((r) => r.creator_id) });
    setBulkSaving(false);
    if (error) {
      setSaveError(
        `Accept failed: ${error.message}` + (error.code === 'PGRST202' ? ' Apply supabase/migrations/0027_creator_exclusion.sql.' : ''),
      );
      return;
    }
    const changes = (data ?? []) as CreatorEntityStatusChange[];
    const hidden = changes.filter((c) => c.to_status === 'non_creator').length;
    const unhidden = changes.filter((c) => c.to_status === 'active').length;
    setNotice(`Accepted ${rows.length} · ${hidden} hidden` + (unhidden > 0 ? ` · ${unhidden} visible again` : '') + '.');
    setReloadKey((k) => k + 1);
  }

  if (loading || !isAdmin) {
    return <div style={{ padding: '32px', color: '#6B7280', fontSize: '14px' }}>Loading...</div>;
  }

  const counts = loaded?.counts ?? { review: 0, non_creators: 0, hidden: 0, all: 0 };
  const refreshing = loaded?.key !== requestKey;
  const totalPages = Math.max(1, Math.ceil(counts[tab] / PAGE_SIZE));
  const claimedSet = new Set(loaded?.claimedIds ?? []);
  const acceptable = loaded ? acceptableRows(loaded.rows, claimedSet).length : 0;
  const acceptDisabled = bulkSaving || refreshing || !!loaded?.claimedError || !!loaded?.exclusionMissing;

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>Creator Review</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '6px 0 20px', maxWidth: '760px', lineHeight: 1.5 }}>
        What kind of account each scraped creator is, as classified by the model, with the heuristic flags beside it.
        Shows what the model saw, not live profile data. Hidden accounts are out of every public and brand-facing surface;
        setting a type here, or accepting, applies that at once.
      </p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', fontSize: '13px', color: '#6B7280' }}>
        <span style={{ marginRight: '4px' }}>Platform:</span>
        {PLATFORM_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setPlatform(value); setPage(1); }}
            style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${platform === value ? '#111827' : '#E5E7EB'}`, backgroundColor: platform === value ? '#111827' : 'white', color: platform === value ? 'white' : '#374151' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {REVIEW_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setTab(value); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', backgroundColor: tab === value ? '#FFD700' : '#F3F4F6', color: tab === value ? 'white' : '#374151' }}
          >
            {label} ({value === 'hidden' && loaded?.exclusionMissing ? '—' : counts[value].toLocaleString('en-US')})
          </button>
        ))}
        {loaded && refreshing && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Refreshing…</span>}
        {acceptable > 0 && (
          <button
            disabled={acceptDisabled}
            onClick={acceptPage}
            title={loaded?.claimedError ? 'Claimed accounts could not be loaded, so bulk accept is off.' : undefined}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: acceptDisabled ? 'default' : 'pointer', border: '1px solid #4F46E5', backgroundColor: 'white', color: '#4F46E5', opacity: acceptDisabled ? 0.5 : 1 }}
          >
            {bulkSaving ? 'Accepting…' : `Accept all on this page (${acceptable})`}
          </button>
        )}
      </div>

      {loaded?.tableMissing && (
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FFFBEB', color: '#92400E', fontSize: '13px', marginBottom: '16px' }}>
          The creator_entity table does not exist yet. Apply supabase/migrations/0026_creator_entity.sql, then run
          npm run creator-entity:classify.
        </div>
      )}
      {loaded?.exclusionMissing && !loaded.tableMissing && (
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FFFBEB', color: '#92400E', fontSize: '13px', marginBottom: '16px' }}>
          Migration 0027 is not applied, so nothing is hidden yet: the Hidden tab, the Hidden badge and bulk accept are
          unavailable. Overrides still save. Apply supabase/migrations/0027_creator_exclusion.sql.
        </div>
      )}
      {loaded?.claimedError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', marginBottom: '16px' }}>
          Could not load claimed accounts ({loaded.claimedError}): the Review tab is missing claimed accounts with a non-creator
          verdict, Claimed badges are missing, and bulk accept is off.
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
      {notice && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '13px', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {!loaded ? (
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</div>
      ) : loaded.rows.length === 0 && !loaded.tableMissing && !loaded.error ? (
        <div style={{ color: '#6B7280', fontSize: '14px' }}>Nothing here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: refreshing ? 0.6 : 1 }}>
          {loaded.rows.map((row) => (
            <ReviewRow
              key={row.creator_id}
              row={row}
              claimed={claimedSet.has(row.creator_id)}
              saving={savingId === row.creator_id || bulkSaving}
              onSet={(value) => setOverride(row, value)}
            />
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

function StateBadge({ label, color, bg, title }: { label: string; color: string; bg: string; title: string }) {
  return (
    <span title={title} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

function ReviewRow({ row, claimed, saving, onSet }: { row: CreatorEntityRow; claimed: boolean; saving: boolean; onSet: (value: CreatorEntityType | null) => void }) {
  const inputs = row.inputs;
  const signals = row.signals;
  const effective = row.review_entity_type ?? row.entity_type;
  const summary = inputs.summary ?? '';
  const flags = SIGNAL_FLAGS.filter((flag) => signals[flag]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: '16px', padding: '14px 16px', border: '1px solid #E5E7EB', borderRadius: '10px', backgroundColor: row.excluded ? '#FAFAFA' : 'white' }}>
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
          {row.excluded && (
            <StateBadge label="Hidden" color="#FFFFFF" bg="#6B7280" title="creators.status = 'non_creator': out of every public and brand-facing surface." />
          )}
          {claimed && (
            <StateBadge label="Claimed" color="#92400E" bg="#FEF3C7" title="Someone has claimed this account. Never hidden unreviewed; hiding it blanks their dashboard." />
          )}
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
