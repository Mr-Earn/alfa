'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ownerNavItems = [
  { href: '/user/owner', label: 'My listings' },
  { href: '/user#owner-bookings', label: 'Bookings' },
  { href: '/user/owner/lease-requests', label: 'Lease requests' },
  { href: '/user/owner/chat', label: 'Owner chat' },
  { href: '/user/owner/overview', label: 'Overview' },
]

export default function OwnerLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className='my-6 md:px-10 lg:px-32 w-full'>
      <div className='mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-slate-900'>Owner workspace</h2>
            <p className='mt-1 text-sm text-slate-600'>Manage your listings, lease requests, chat, and performance from the owner portal.</p>
          </div>
          <nav className='flex flex-wrap gap-2'>
            {ownerNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/user/owner' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {item.label}
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
