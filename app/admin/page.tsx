'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { describeActivity, targetTableFor, type ActivityRow } from '@/lib/admin/activity-log'
import { CREATOR_HANDLE_SELECT, primaryHandle } from '@/lib/admin/primary-handle'

interface Stats {
  totalCreators: number
  totalBrands: number
  pendingApprovals: number
  totalInquiries: number
}

// Mirrors the real activity_log columns. The previous version declared an
// `action` field, which does not exist on the table — that is why every row
// rendered a blank headline and showed only the raw JSON of `details`.

export default function AdminOverviewPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  // target_id -> display name. Empty until the lookups below resolve; the
  // wording falls back to a subject-less form for anything missing, so a failed
  // lookup costs detail rather than breaking the row.
  const [targetNames, setTargetNames] = useState<Record<string, string>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user || userRole !== 'admin') { router.push('/login'); return }
    fetchData()
  }, [loading, user, userRole])

  async function fetchData() {
    try {
      setDataLoading(true)
      setError(null)
      const [
        { count: creatorsCount },
        { count: brandsCount },
        { count: pendingBrands },
        { count: pendingCreators },
        { count: inquiriesCount },
        { data: activityData },
      ] = await Promise.all([
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('brand_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('brand_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('claim_status', 'pending'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      ])
      setStats({
        totalCreators: creatorsCount ?? 0,
        totalBrands: brandsCount ?? 0,
        pendingApprovals: (pendingBrands ?? 0) + (pendingCreators ?? 0),
        totalInquiries: inquiriesCount ?? 0,
      })
      const rows = (activityData ?? []) as ActivityRow[]
      setActivity(rows)
      void loadTargetNames(rows)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setDataLoading(false)
    }
  }

  /**
   * Resolves the activity rows' target_id values to names, so the log reads
   * "Approved LMG Media" rather than "Brand approved".
   *
   * Two batched queries at most — one per target table — never one per row.
   * Deliberately not awaited by fetchData: the log is readable without names,
   * so this must not hold up the page or turn a failed lookup into a failed
   * render. Errors are swallowed for the same reason; the fallback wording
   * covers it.
   */
  async function loadTargetNames(rows: ActivityRow[]) {
    const brandIds = new Set<string>()
    const creatorIds = new Set<string>()

    for (const r of rows) {
      if (!r.target_id) continue
      const table = targetTableFor(r.event_type)
      if (table === 'brand') brandIds.add(r.target_id)
      if (table === 'creator') creatorIds.add(r.target_id)
    }

    if (!brandIds.size && !creatorIds.size) return

    const [brands, creators] = await Promise.all([
      brandIds.size
        ? supabase.from('brand_profiles').select('id, company_name').in('id', [...brandIds])
        : Promise.resolve({ data: [] as any[] }),
      creatorIds.size
        // Same name precedence the Creators admin page uses: the claimed
        // profile's own display_name first, then the scraped creator record,
        // then the handle.
        ? supabase
            .from('creator_profiles')
            .select(`id, display_name, ${CREATOR_HANDLE_SELECT}`)
            .in('id', [...creatorIds])
        : Promise.resolve({ data: [] as any[] }),
    ])

    const next: Record<string, string> = {}

    for (const b of brands.data ?? []) {
      if (b?.id && b.company_name) next[b.id] = b.company_name
    }

    for (const c of (creators.data ?? []) as any[]) {
      const joined = Array.isArray(c.creators) ? c.creators[0] : c.creators
      const handle = primaryHandle(joined?.social_profiles)
      const name = c.display_name ?? joined?.display_name ?? (handle ? `@${handle}` : null)
      if (c?.id && name) next[c.id] = name
    }

    setTargetNames(next)
  }

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user || userRole !== 'admin') return null

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#dc2626' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>Error loading dashboard</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>{error}</p>
          <button onClick={fetchData} style={{ marginTop: '12px', fontSize: '14px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>Try again</button>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Creators', value: stats?.totalCreators ?? 0, href: '/admin/creators' },
    { label: 'Total Brands', value: stats?.totalBrands ?? 0, href: '/admin/brands' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, href: '/admin/brands' },
    { label: 'Total Inquiries', value: stats?.totalInquiries ?? 0, href: '/admin/inquiries' },
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0, letterSpacing: '-0.02em' }}>Dashboard Overview</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px', margin: '4px 0 0' }}>Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {statCards.map((card) => (
          <a key={card.label} href={card.href} style={{ display: 'block', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px 24px', textDecoration: 'none', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280', margin: 0 }}>{card.label}</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#3A3A3A', margin: '4px 0 0' }}>{card.value}</p>
          </a>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#3A3A3A', marginBottom: '12px' }}>Recent Activity</h2>
        {activity.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>No recent activity.</p>
        ) : (
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            {activity.map((item, i) => {
              const { title, detail } = describeActivity(item, (id) => targetNames[id])
              return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D1D5DB', marginTop: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>{title}</p>
                  {detail && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detail}
                    </p>
                  )}
                </div>
                <time style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}