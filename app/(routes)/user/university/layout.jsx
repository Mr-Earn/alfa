"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/user/university', label: 'Overview' },
  { href: '/user/university/students', label: 'Students' },
  { href: '/user/university/accommodations', label: 'Accommodations' },
  { href: '/user/university/communications', label: 'Communications' },
  { href: '/user/messages', label: 'Messages' },
  { href: '/user/university/compliance', label: 'Compliance' },
  { href: '/user/university/events', label: 'Events' },
]

export default function UniversityLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className='my-6 md:px-10 lg:px-32 w-full'>
      <div className='mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-slate-900'>University workspace</h2>
            <p className='mt-1 text-sm text-slate-600'>Manage students, housing approvals, events, communications, and compliance from the university portal.</p>
          </div>
          <nav className='flex flex-wrap gap-2'>
            {tabs.map((tab) => {
              const active = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
