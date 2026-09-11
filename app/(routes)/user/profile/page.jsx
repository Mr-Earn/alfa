"use client"

import React from 'react'
import Link from 'next/link'
import useSupabaseUser from '@/utils/supabase/useUser'
import ProfileEditor from '../_components/ProfileEditor'
import UniversityLinkRequest from '../_components/UniversityLinkRequest'

export default function ProfilePage() {
  const user = useSupabaseUser()

  return (
    <div className='my-6 w-full md:px-10 lg:px-32'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Profile</h1>
          <p className='mt-1 text-sm text-slate-500'>Manage your personal information and account details.</p>
        </div>
        <Link href='/user' className='rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
          Back to workspace
        </Link>
      </div>
      {user ? (
        <>
          <ProfileEditor />
          <UniversityLinkRequest role={user?.user_metadata?.role || 'student'} />
        </>
      ) : <p className='text-sm text-slate-500'>Please sign in to view your profile.</p>}
    </div>
  )
}
