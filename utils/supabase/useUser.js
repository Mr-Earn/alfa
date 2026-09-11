"use client"
import { useEffect, useState } from 'react'
import { supabase } from './client'

export default function useSupabaseUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null)
    }).catch(() => {
      if (mounted) setUser(null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      try { sub?.subscription?.unsubscribe?.() } catch (e) {}
    }
  }, [])

  return user
}
