"use client"

import useSupabaseUser from '@/utils/supabase/useUser'
import StudentRecommendations from '../_components/StudentRecommendations'

export default function RecommendationsPage() {
  const user = useSupabaseUser()
  const role = user?.user_metadata?.role ?? 'student'

  if (role !== 'student') {
    return <main className="mx-auto my-8 max-w-7xl px-4 text-sm text-slate-500 md:px-8">Accommodation recommendations are available to students.</main>
  }

  return <StudentRecommendations />
}