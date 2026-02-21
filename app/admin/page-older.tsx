'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalCreators: number
  totalBrands: number
  pendingApprovals: number
  totalInquiries: number
}

interface ActivityItem {
  id: string
  action: string
  created_at: string
  details?: string
}

export default function AdminOverviewPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user || userRole !== 'admin') {
      router.push('/login')
      return
    }
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
      setActivity(activityData ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setDataLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user || userRole !== 'admin') return null

  if (dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#dc2626' }}>
          <p style={{ fontWeight: 600 }}>Error loading dashboard</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>{error}</p>
          <button onClick={fetchData} style={{ marginTop: '12px', fontSize: '14px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Creators', value: stats?.totalCreators ?? 0, href: '/admin/creators', color: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
    { label: 'Total Brands', value: stats?.totalBrands ?? 0, href: '/admin/brands', color: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, href: '/admin/brands', color: '#fffbeb', border: '#fde68a', text: '#b45309' },
    { label: 'Total Inquiries', value: stats?.totalInquiries ?? 0, href: '/admin/inquiries', color: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Dashboard Overview</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {statCards.map((card) => (
          <a key={card.label} href={card.href} style={{ display: 'block', background: card.color, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '20px', textDecoration: 'none', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: card.text, margin: 0 }}>{card.label}</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: card.text, margin: '4px 0 0' }}>{card.value}</p>
          </a>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Recent Activity</h2>
        {activity.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>No recent activity.</p>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            {activity.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', color: '#1f2937', margin: 0 }}>{item.action}</p>
                  {item.details && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.details}</p>}
                </div>
                <time style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
