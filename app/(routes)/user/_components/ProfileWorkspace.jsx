"use client"

import Link from 'next/link'
import useSupabaseUser from '@/utils/supabase/useUser'
import { normalizeRole } from '@/lib/permissions'
import ProfileEditor from './ProfileEditor'
import UniversityLinkRequest from './UniversityLinkRequest'

export default function ProfileWorkspace({ section = 'personal' }) {
  const user = useSupabaseUser()
  const role = normalizeRole(user?.user_metadata?.role || 'student')
  const roleSections = {
    student: [
      { slug: 'personal', label: 'Personal', editorSection: 'personal' },
      { slug: 'education', label: 'Education', editorSection: 'education' },
      { slug: 'accommodation', label: 'Accommodation', editorSection: 'accommodation' },
    ],
    owner: [
      { slug: 'personal', label: 'Personal', editorSection: 'personal' },
      { slug: 'organization', label: 'Property details', editorSection: 'organization' },
    ],
    agent: [
      { slug: 'personal', label: 'Personal', editorSection: 'personal' },
      { slug: 'organization', label: 'Professional details', editorSection: 'organization' },
    ],
    university: [
      { slug: 'personal', label: 'Personal', editorSection: 'personal' },
      { slug: 'organization', label: 'Institution', editorSection: 'organization' },
    ],
    admin: [
      { slug: 'personal', label: 'Personal', editorSection: 'personal' },
      { slug: 'organization', label: 'Admin details', editorSection: 'organization' },
    ],
  }
  const sections = roleSections[role] || roleSections.student
  const currentSection = sections.find((item) => item.slug === section)

  if (!user) {
    return <main className="mx-auto my-8 max-w-7xl px-4 text-sm text-slate-500 md:px-8">Please sign in to view your profile.</main>
  }

  if (!currentSection) {
    return (
      <main className="mx-auto my-8 max-w-7xl px-4 md:px-8">
        <p className="text-sm text-slate-600">This profile section is not available for your account.</p>
        <Link href="/user/profile" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">Open personal profile</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto my-8 w-full max-w-7xl space-y-5 px-4 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal and role-specific information.</p>
        </div>
        <Link href="/user" className="text-sm font-medium text-blue-700 hover:underline">Back to workspace</Link>
      </header>

      <nav aria-label="Profile sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
        {sections.map((item) => {
          const href = item.slug === 'personal' ? '/user/profile' : `/user/profile/${item.slug}`
          return <Link key={item.slug} href={href} aria-current={section === item.slug ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${section === item.slug ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</Link>
        })}
      </nav>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">{currentSection.label}</h2>
        </div>
        <ProfileEditor section={currentSection.editorSection} />
      </section>

      {role === 'student' && section === 'education' && <UniversityLinkRequest role={role} />}

      {role === 'student' && section === 'accommodation' && (
        <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Link href="/user/recommendations" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Accommodation recommendations</Link>
          <Link href="/user#my-bookings" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">My bookings</Link>
        </section>
      )}
    </main>
  )
}