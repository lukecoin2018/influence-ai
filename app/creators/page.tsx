'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { CreatorCard } from '@/components/CreatorCard';
import { CompareBar } from '@/components/CompareBar';
import { IntelligenceFilters } from '@/components/discovery/IntelligenceFilters';
import { CreatorGridSkeleton } from '@/components/LoadingSkeleton';
import type { Creator, CreatorListResponse } from '@/lib/types';

// Extended response type to include token info
interface TokenInfo {
  withinFree: boolean;
  used: number;
  limit: number;
  balance: number;
  profile_views_used?: number;
}

interface ExtendedCreatorListResponse extends CreatorListResponse {
  locked?: boolean;
  reason?: string;
  balance?: number;
  needed?: number;
  tokenInfo?: TokenInfo | null;
}

// ── Token gate overlay ────────────────────────────────────────────────────────
function TokenGateOverlay({ balance, needed }: { balance: number; needed: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, rgba(250,250,250,0.1) 0%, rgba(250,250,250,0.95) 30%)',
      borderRadius: '12px',
    }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          backgroundColor: '#FEF3C7', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Lock size={22} color="#92400E" />
        </div>

        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>
          You're out of tokens
        </h3>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 6px', lineHeight: 1.5 }}>
          Browsing the directory costs <strong>{needed} tokens</strong> per page.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 24px' }}>
          Your balance: <strong>{balance} tokens</strong>
        </p>

        <a
          href="/pricing"
          style={{
            display: 'block', width: '100%', padding: '11px',
            backgroundColor: '#FFD700', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700, color: '#3A3A3A',
            textDecoration: 'none', marginBottom: '10px',
            boxSizing: 'border-box',
          }}
        >
          Get More Tokens
        </a>
        <a
          href="/about"
          style={{
            display: 'block', fontSize: '13px', color: '#6B7280',
            textDecoration: 'none',
          }}
        >
          Learn more about tokens
        </a>
      </div>
    </div>
  );
}

// ── Free allowance indicator ──────────────────────────────────────────────────
function AllowanceIndicator({ tokenInfo }: { tokenInfo: TokenInfo }) {
  const remaining = tokenInfo.limit - tokenInfo.used;
  const isExhausted = !tokenInfo.withinFree;

  if (isExhausted) return null; // Don't show once on paid pages

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '5px 10px', borderRadius: '999px',
      backgroundColor: remaining <= 3 ? '#FEF3C7' : '#F0FDF4',
      border: `1px solid ${remaining <= 3 ? '#FDE68A' : '#BBF7D0'}`,
      fontSize: '12px', fontWeight: 500,
      color: remaining <= 3 ? '#92400E' : '#166534',
    }}>
      <span>🪙</span>
      <span>
        {remaining} of {tokenInfo.limit} free pages remaining
      </span>
    </div>
  );
}

// ── Main page content ─────────────────────────────────────────────────────────
function CreatorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [minFollowers, setMinFollowers] = useState(searchParams.get('minFollowers') ?? '');
  const [maxFollowers, setMaxFollowers] = useState(searchParams.get('maxFollowers') ?? '');
  const [minEngagement, setMinEngagement] = useState(searchParams.get('minEngagement') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [verified, setVerified] = useState(searchParams.get('verified') === 'true');
  const [language, setLanguage] = useState(searchParams.get('language') ?? '');
  const [country, setCountry] = useState(searchParams.get('country') ?? '');
  const [hasEmail, setHasEmail] = useState(searchParams.get('hasEmail') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'follower_count');
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1', 10));

  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [compareHandles, setCompareHandles] = useState<string[]>([]);

  // Token gate state
  const [locked, setLocked] = useState(false);
  const [lockBalance, setLockBalance] = useState(0);
  const [lockNeeded, setLockNeeded] = useState(5);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  // Profile views are locked when free allowance is used up AND balance < 3
  const profilesLocked = tokenInfo
    ? (tokenInfo.profile_views_used ?? 0) >= 5 && tokenInfo.balance < 3
    : false;

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (minFollowers) params.set('minFollowers', minFollowers);
    if (maxFollowers) params.set('maxFollowers', maxFollowers);
    if (minEngagement) params.set('minEngagement', minEngagement);
    if (category) params.set('category', category);
    if (verified) params.set('verified', 'true');
    if (language) params.set('language', language);
    if (country) params.set('country', country);
    if (hasEmail) params.set('hasEmail', 'true');
    if (sortBy !== 'follower_count') params.set('sortBy', sortBy);
    if (page > 1) params.set('page', String(page));
    return params.toString();
  }, [search, minFollowers, maxFollowers, minEngagement, category, verified, sortBy, page, language, country, hasEmail]);

  const fetchCreators = useCallback(async (paginate = false) => {
    setLoading(true);
    const qs = buildQueryString();
    router.replace(`/creators${qs ? `?${qs}` : ''}`, { scroll: false });

    try {
      const res = await fetch(`/api/creators?${qs}&limit=24${paginate ? '&paginate=true' : ''}`);
      const data: ExtendedCreatorListResponse = await res.json();

      if (data.locked) {
        setLocked(true);
        setLockBalance(data.balance ?? 0);
        setLockNeeded(data.needed ?? 5);
        setLoading(false);
        return;
      }

      setLocked(false);
      setCreators(data.creators ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setTokenInfo(data.tokenInfo ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, router]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  const handleFilterChange = () => setPage(1);

  const toggleCompare = (handle: string) => {
    setCompareHandles((prev) => {
      if (prev.includes(handle)) return prev.filter((h) => h !== handle);
      if (prev.length >= 4) return prev;
      return [...prev, handle];
    });
  };

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Creator Discovery
            </h1>
            <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
              {loading ? 'Loading...' : `${total.toLocaleString()} creator${total !== 1 ? 's' : ''} in our network`}
            </p>
          </div>

          {/* Free allowance indicator — shows while within free pages */}
          {tokenInfo && <AllowanceIndicator tokenInfo={tokenInfo} />}
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>

            {/* Search */}
            <div style={{ flex: '1 1 200px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
                  placeholder="Handle, name, category..."
                  style={{
                    width: '100%', paddingLeft: '32px', paddingRight: '12px',
                    paddingTop: '8px', paddingBottom: '8px',
                    border: '1px solid #E5E7EB', borderRadius: '8px',
                    fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Category */}
            <div style={{ flex: '1 1 140px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); handleFilterChange(); }}
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Min followers */}
            <div style={{ flex: '1 1 120px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Min Followers
              </label>
              <input
                type="number"
                value={minFollowers}
                onChange={(e) => { setMinFollowers(e.target.value); handleFilterChange(); }}
                placeholder="10,000"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Max followers */}
            <div style={{ flex: '1 1 120px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Max Followers
              </label>
              <input
                type="number"
                value={maxFollowers}
                onChange={(e) => { setMaxFollowers(e.target.value); handleFilterChange(); }}
                placeholder="500,000"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Min engagement */}
            <div style={{ flex: '1 1 120px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Min Eng. %
              </label>
              <input
                type="number"
                step="0.1"
                value={minEngagement}
                onChange={(e) => { setMinEngagement(e.target.value); handleFilterChange(); }}
                placeholder="2.0"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Sort */}
            <div style={{ flex: '1 1 140px', minWidth: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); handleFilterChange(); }}
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white',
                  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                <option value="follower_count">Most Followers</option>
                <option value="engagement_rate">Highest Engagement</option>
                <option value="last_updated_at">Recently Added</option>
              </select>
            </div>

            {/* Verified toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
              <input
                type="checkbox"
                id="verified"
                checked={verified}
                onChange={(e) => { setVerified(e.target.checked); handleFilterChange(); }}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3AAFF4' }}
              />
              <label htmlFor="verified" style={{ fontSize: '14px', color: '#3A3A3A', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Verified only
              </label>
            </div>
          </div>
        </div>

        {/* Intelligence Filters */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <IntelligenceFilters
            language={language}
            country={country}
            hasEmail={hasEmail}
            onChange={(updates) => {
              if (updates.language !== undefined) { setLanguage(updates.language); handleFilterChange(); }
              if (updates.country !== undefined) { setCountry(updates.country); handleFilterChange(); }
              if (updates.hasEmail !== undefined) { setHasEmail(updates.hasEmail); handleFilterChange(); }
            }}
          />
        </div>

        {/* Grid — with token gate overlay when locked */}
        <div style={{ position: 'relative' }}>
          {loading ? (
            <CreatorGridSkeleton count={24} />
          ) : locked ? (
            // Show blurred placeholder grid behind the overlay
            <div style={{ position: 'relative', minHeight: '400px' }}>
              <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                <CreatorGridSkeleton count={24} />
              </div>
              <TokenGateOverlay balance={lockBalance} needed={lockNeeded} />
            </div>
          ) : creators.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 24px',
              border: '1px dashed #E5E7EB', borderRadius: '12px',
              backgroundColor: 'white',
            }}>
              <SlidersHorizontal size={32} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 8px' }}>
                No creators match your filters
              </p>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Try adjusting your search or removing some filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.creator_id}
                  creator={creator}
                  onCompareToggle={toggleCompare}
                  isSelectedForCompare={compareHandles.includes(creator.instagram_handle ?? creator.tiktok_handle ?? '')}
                  profilesLocked={profilesLocked}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination — hidden when locked */}
        {!loading && !locked && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); fetchCreators(true); }}
              disabled={page === 1}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '8px 14px', borderRadius: '8px',
                border: '1px solid #E5E7EB', backgroundColor: 'white',
                fontSize: '14px', fontWeight: 500, color: page === 1 ? '#D1D5DB' : '#3A3A3A',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <div className="hidden sm:flex" style={{ gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => { setPage(pageNum); fetchCreators(true); }}
                    style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      border: pageNum === page ? 'none' : '1px solid #E5E7EB',
                      backgroundColor: pageNum === page ? '#3AAFF4' : 'white',
                      color: pageNum === page ? 'white' : '#3A3A3A',
                      fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <span className="flex sm:hidden" style={{ fontSize: '14px', color: '#6B7280', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); fetchCreators(true); }}
              disabled={page === totalPages}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '8px 14px', borderRadius: '8px',
                border: '1px solid #E5E7EB', backgroundColor: 'white',
                fontSize: '14px', fontWeight: 500, color: page === totalPages ? '#D1D5DB' : '#3A3A3A',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <CompareBar
        selectedHandles={compareHandles}
        onRemove={(h) => setCompareHandles((prev) => prev.filter((x) => x !== h))}
        onClear={() => setCompareHandles([])}
      />
    </div>
  );
}

export default function CreatorsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}><CreatorGridSkeleton count={24} /></div>}>
      <CreatorsContent />
    </Suspense>
  );
}
