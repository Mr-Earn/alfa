"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '../_components/AdminDashboard'
import { normalizeRole } from '@/lib/permissions'
import { supabase } from '@/utils/supabase/client'

const adminSectionSlugs = ['overview', 'bookings', 'moderation', 'communications', 'student-hub', 'listings', 'profiles', 'analytics']

export default function AdminRoute({ section }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const checkAccess = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return

        const user = data?.session?.user
        if (error || !user) {
          router.replace('/sign-in')
          return
        }

        if (normalizeRole(user.user_metadata?.role) !== 'admin') {
          router.replace('/user')
          return
        }

        if (!adminSectionSlugs.includes(section)) {
          router.replace('/user/admin')
          return
        }

        setAuthorized(true)
      } catch {
        if (mounted) router.replace('/sign-in')
      }
    }

    checkAccess()
    return () => {
      mounted = false
    }
  }, [router, section])

  if (!authorized) {
    return <main className="mx-auto my-8 max-w-7xl px-4 text-sm text-slate-500 md:px-8" role="status">Checking admin access...</main>
  }

  return (
    <main className="mx-auto my-8 w-full max-w-7xl px-4 md:px-8">
      <AdminDashboard section={section} />
    </main>
  )
}