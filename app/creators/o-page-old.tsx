'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { CreatorCard } from '@/components/CreatorCard';
import { CompareBar } from '@/components/CompareBar';
import { IntelligenceFilters } from '@/components/discovery/IntelligenceFilters';
import { CreatorGridSkeleton } from '@/components/LoadingSkeleton';
import type { Creator, CreatorListResponse } from '@/lib/types';


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
    if (country)  params.set('country', country);
    if (hasEmail) params.set('hasEmail', 'true');
    if (sortBy !== 'follower_count') params.set('sortBy', sortBy);
    if (page > 1) params.set('page', String(page));
    return params.toString();
  }, [search, minFollowers, maxFollowers, minEngagement, category, verified, sortBy, page, language, country, hasEmail]);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const qs = buildQueryString();
    router.replace(`/creators${qs ? `?${qs}` : ''}`, { scroll: false });
    try {
      const res = await fetch(`/api/creators?${qs}&limit=24`);
      const data: CreatorListResponse = await res.json();
      setCreators(data.creators ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
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
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Creator Discovery
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
            {loading ? 'Loading...' : `${total.toLocaleString()} creator${total !== 1 ? 's' : ''} in our network`}
          </p>
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
              if (updates.country !== undefined)  { setCountry(updates.country);  handleFilterChange(); }
              if (updates.hasEmail !== undefined) { setHasEmail(updates.hasEmail); handleFilterChange(); }
            }}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <CreatorGridSkeleton count={24} />
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
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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

            {/* Page numbers — desktop only */}
            <div className="hidden sm:flex" style={{ gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
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

            {/* Page counter — mobile only */}
            <span className="flex sm:hidden" style={{ fontSize: '14px', color: '#6B7280', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Compare bar */}
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
