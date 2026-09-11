'use client'

import React, { useEffect, useState } from 'react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import useSupabaseUser from '@/utils/supabase/useUser'

async function fetchProfile(profileId, headers) {
  const res = await fetch(`/api/profiles?id=${encodeURIComponent(profileId)}`, { headers, cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data.profile || null
}

export default function OwnerStudentProfilePage({ params }) {
  const user = useSupabaseUser()
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    if (!params?.id || !user?.email) return

    const loadProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
        const profileData = await fetchProfile(params.id, headers)
        if (!profileData) {
          setError('Unable to load student profile.')
        } else {
          setProfile(profileData)
        }
      } catch (e) {
        setError('Unable to load student profile.')
      }
      setLoading(false)
    }

    loadProfile()
  }, [params?.id, user?.email])

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-700">Loading profile…</div>
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>
  }

  if (!profile) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-700">Student profile not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Student profile</h1>
        <p className="mt-1 text-sm text-slate-500">Profile details for {profile.full_name || profile.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Basic details</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div><span className="font-semibold">Full name:</span> {profile.full_name || 'N/A'}</div>
            <div><span className="font-semibold">Email:</span> {profile.email || 'N/A'}</div>
            <div><span className="font-semibold">Phone:</span> {profile.phone || profile.phone_number || 'N/A'}</div>
            <div><span className="font-semibold">Gender:</span> {profile.gender || 'N/A'}</div>
            <div><span className="font-semibold">Role:</span> {profile.role || 'N/A'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">University & housing</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div><span className="font-semibold">University:</span> {profile.university || 'N/A'}</div>
            <div><span className="font-semibold">Program / major:</span> {profile.program || profile.major || 'N/A'}</div>
            <div><span className="font-semibold">Preferred move-in:</span> {profile.preferred_move_in_date || 'N/A'}</div>
            <div><span className="font-semibold">Notes:</span> {profile.notes || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Profile summary</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div><span className="font-semibold">Nationality:</span> {profile.nationality || 'N/A'}</div>
          <div><span className="font-semibold">Date of birth:</span> {profile.date_of_birth || 'N/A'}</div>
          <div><span className="font-semibold">Additional info:</span> {profile.additional_info || 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
