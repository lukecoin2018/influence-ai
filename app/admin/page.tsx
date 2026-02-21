'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AdminOverviewPage() {
  const { user, userRole, loading } = useAuth()
  const [debug, setDebug] = useState<string>('waiting...')

  useEffect(() => {
    setDebug(`loading=${loading} | user=${user?.id ?? 'null'} | userRole=${userRole}`)
  }, [loading, user, userRole])

  useEffect(() => {
    async function check() {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData?.session?.user?.id
      if (!uid) {
        setDebug(prev => prev + '\n[NO SESSION FOUND]')
        return
      }
      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', uid)
      setDebug(prev => prev + `\n[user_roles query] uid=${uid}\ndata=${JSON.stringify(data)}\nerror=${JSON.stringify(error)}`)
    }
    check()
  }, [])

  return (
    <div style={{ padding: '32px', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', background: '#f9fafb', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>🔍 Admin Debug Page</h2>
      <div style={{ background: '#1f2937', color: '#10b981', padding: '16px', borderRadius: '8px', lineHeight: '1.8' }}>
        {debug}
      </div>
    </div>
  )
}
