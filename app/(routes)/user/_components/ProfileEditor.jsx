"use client"

import React, { useEffect, useRef, useState } from 'react'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ProfileEditor({ section = 'personal' }) {
  const user = useSupabaseUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const autosaveTimer = useRef(null)

  useEffect(() => {
    if (!user?.email) return
    fetchProfile()
  }, [user?.email])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
      const res = await fetch(`/api/profiles?email=${encodeURIComponent(user.email)}`, { headers })
      const json = await res.json()
      setProfile(json.profile || { id: user.id, email: user.email, role: user?.user_metadata?.role || 'student' })
      setDirty(false)
    } catch (e) {
      console.error('Failed to load profile', e)
    }
    setLoading(false)
  }

  const saveProfile = async (silent = false) => {
    if (!profile?.id) return
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    setSaving(true)
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
      const payload = {
        ...profile,
        phone: profile.phone || profile.phone_number || '',
        phone_number: profile.phone || profile.phone_number || '',
        company: profile.company || profile.company_name || '',
        company_name: profile.company || profile.company_name || '',
      }
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok) {
        setProfile(json.profile || profile)
        setDirty(false)
        if (!silent) toast.success('Profile saved successfully')
      } else {
        console.error('Save failed', json)
        if (!silent) toast.error(json.error || 'Save failed')
      }
    } catch (e) {
      console.error('Save error', e)
      if (!silent) toast.error('Unable to save profile')
    }
    setSaving(false)
  }

  const updateProfile = (changes) => {
    setProfile((prev) => ({ ...prev, ...changes }))
    setDirty(true)
  }

  const deleteProfile = async () => {
    if (!profile?.id) return
    const confirmed = window.confirm('Delete this profile? This cannot be undone.')
    if (!confirmed) return
    setSaving(true)
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
      const res = await fetch('/api/profiles', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setProfile(null)
        toast.success('Profile deleted')
      } else {
        console.error('Delete failed', json)
        toast.error(json.error || 'Delete failed')
      }
    } catch (e) {
      console.error('Delete error', e)
      toast.error('Unable to delete profile')
    }
    setSaving(false)
  }

  useEffect(() => {
    if (!dirty) return
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
    }

    autosaveTimer.current = setTimeout(() => {
      saveProfile(true)
    }, 1000)

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
      }
    }
  }, [profile?.id, profile, dirty])

  if (loading) return <div className='text-sm text-slate-500'>Loading profile...</div>
  if (!profile) return null

  const role = profile.role || user?.user_metadata?.role || 'student'

  return (
    <div className='mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <h3 className='font-semibold text-slate-900 mb-2'>Profile details</h3>
      <div className='grid gap-3 md:grid-cols-2'>
        {section === 'personal' && <>
          <div><label className='text-sm text-slate-600'>Full name</label><Input value={profile.full_name || ''} onChange={(e) => updateProfile({ full_name: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Phone</label><Input value={profile.phone || profile.phone_number || ''} onChange={(e) => updateProfile({ phone: e.target.value, phone_number: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Email</label><Input value={profile.email || ''} disabled /></div>
          <div><label className='text-sm text-slate-600'>Role</label><Input value={role} disabled /></div>
          <div><label className='text-sm text-slate-600'>Avatar URL</label><Input value={profile.avatar_url || ''} onChange={(e) => updateProfile({ avatar_url: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Gender</label><Input value={profile.gender || ''} onChange={(e) => updateProfile({ gender: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Date of birth</label><Input type='date' value={profile.date_of_birth || ''} onChange={(e) => updateProfile({ date_of_birth: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Nationality</label><Input value={profile.nationality || ''} onChange={(e) => updateProfile({ nationality: e.target.value })} /></div>
          <div className='md:col-span-2'><label className='text-sm text-slate-600'>Short bio</label><Textarea value={profile.bio || ''} onChange={(e) => updateProfile({ bio: e.target.value })} /></div>
        </>}

        {section === 'education' && role === 'student' && <>
          <div><label className='text-sm text-slate-600'>University</label><Input value={profile.university || ''} onChange={(e) => updateProfile({ university: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Course</label><Input value={profile.course || ''} onChange={(e) => updateProfile({ course: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Program</label><Input value={profile.program || ''} onChange={(e) => updateProfile({ program: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Major</label><Input value={profile.major || ''} onChange={(e) => updateProfile({ major: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Year of study</label><Input value={profile.year || ''} onChange={(e) => updateProfile({ year: e.target.value })} /></div>
        </>}

        {section === 'accommodation' && role === 'student' && <>
          <div><label className='text-sm text-slate-600'>Preferred move-in date</label><Input type='date' value={profile.preferred_move_in_date || ''} onChange={(e) => updateProfile({ preferred_move_in_date: e.target.value })} /></div>
          <div className='md:col-span-2'><label className='text-sm text-slate-600'>Additional accommodation information</label><Textarea value={profile.additional_info || ''} onChange={(e) => updateProfile({ additional_info: e.target.value })} /></div>
        </>}

        {section === 'organization' && role === 'owner' && <>
          <div><label className='text-sm text-slate-600'>Company / Owner name</label><Input value={profile.company || profile.company_name || ''} onChange={(e) => updateProfile({ company: e.target.value, company_name: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Address</label><Input value={profile.address || ''} onChange={(e) => updateProfile({ address: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Bank details</label><Input value={profile.bank_details || ''} onChange={(e) => updateProfile({ bank_details: e.target.value })} /></div>
        </>}

        {section === 'organization' && role === 'agent' && <>
          <div><label className='text-sm text-slate-600'>Agency</label><Input value={profile.agency || ''} onChange={(e) => updateProfile({ agency: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>License number</label><Input value={profile.license_number || ''} onChange={(e) => updateProfile({ license_number: e.target.value })} /></div>
        </>}

        {section === 'organization' && role === 'university' && <>
          <div><label className='text-sm text-slate-600'>Institution name</label><Input value={profile.institution_name || ''} onChange={(e) => updateProfile({ institution_name: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>Contact person</label><Input value={profile.contact_person || ''} onChange={(e) => updateProfile({ contact_person: e.target.value })} /></div>
          <div><label className='text-sm text-slate-600'>University</label><Input value={profile.university || ''} onChange={(e) => updateProfile({ university: e.target.value })} /></div>
        </>}

        {section === 'organization' && role === 'admin' && <div className='md:col-span-2'><label className='text-sm text-slate-600'>Notes</label><Textarea value={profile.notes || ''} onChange={(e) => updateProfile({ notes: e.target.value })} /></div>}

      </div>

      <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center'>
        <Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
        <p className='text-sm text-slate-500'>
          {saving ? 'Saving changes…' : dirty ? 'Unsaved changes will save automatically.' : 'All changes saved.'}
        </p>
      </div>
    </div>
  )
}
