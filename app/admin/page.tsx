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
  user_id?: string
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

  // Auth loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  // Not admin
  if (!user || userRole !== 'admin') return null

  // Data loading
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Creators', value: stats?.totalCreators ?? 0, href: '/admin/creators', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Total Brands', value: stats?.totalBrands ?? 0, href: '/admin/brands', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, href: '/admin/brands', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { label: 'Total Inquiries', value: stats?.totalInquiries ?? 0, href: '/admin/inquiries', color: 'bg-green-50 border-green-200 text-green-700' },
  ]

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className={`block border rounded-xl p-5 hover:shadow-md transition-shadow ${card.color}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </a>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{item.action}</p>
                  {item.details && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.details}</p>
                  )}
                </div>
                <time className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
