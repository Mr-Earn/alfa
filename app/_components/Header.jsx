"use client"
import { Button } from '@/components/ui/button'
import useSupabaseUser from '@/utils/supabase/useUser'
import { supabase } from '@/utils/supabase/client'
import { normalizeRole } from '@/lib/permissions'
import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function Header() {
  const path = usePathname();
  const user = useSupabaseUser();
  const isSignedIn = !!user;
  const role = isSignedIn ? normalizeRole(user?.user_metadata?.role || 'student') : 'guest'
  const showPostAd = isSignedIn && ['owner', 'admin', 'university'].includes(role)
  const showStudentHub = isSignedIn && role === 'student'
  const showRentNav = !['owner', 'admin'].includes(role)
  const showAgentFinderNav = !['owner', 'admin'].includes(role)
  const isUniversityRoute = path?.startsWith('/user/university')
  const universityTabs = [
    { href: '/user/university', label: 'Overview' },
    { href: '/user/university/students', label: 'Students' },
    { href: '/user/university/communications', label: 'Communications' },
    { href: '/user/university/compliance', label: 'Compliance' },
    { href: '/user/university/events', label: 'Events' },
  ]

  return (
    <div className='fixed top-0 z-30 w-full border-b border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur md:px-10'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-4'>
        <div className='flex items-center gap-6'>
          <Link href='/' className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white'>A</div>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Alfa Housing</p>
              <p className='text-xs text-slate-500'>Student accommodation</p>
            </div>
          </Link>
          <ul className='hidden items-center gap-6 md:flex'>
          {showRentNav && (
            <Link href={'/rent'} >
              <li className={`cursor-pointer text-sm font-medium transition ${path == '/rent' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>For Rent</li>
            </Link>
          )}
          {showStudentHub && (
            <Link href={'/student-hub'} >
              <li className={`cursor-pointer text-sm font-medium transition ${path == '/student-hub' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Student Hub</li>
            </Link>
          )}
          {role === 'student' && (
            <>
              <Link href={'/user#my-bookings'}>
                <li className={`cursor-pointer text-sm font-medium transition ${path === '/user#my-bookings' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>My Bookings</li>
              </Link>
              <Link href={'/user/messages'}>
                <li className={`cursor-pointer text-sm font-medium transition ${path === '/user/messages' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Messages</li>
              </Link>
              <Link href={'/user/events'}>
                <li className={`cursor-pointer text-sm font-medium transition ${path === '/user/events' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Events</li>
              </Link>
              <Link href={'/user/marketplace'}>
                <li className={`cursor-pointer text-sm font-medium transition ${path === '/user/marketplace' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Marketplace</li>
              </Link>
            </>
          )}
          {showAgentFinderNav && (
            <li className='cursor-pointer text-sm font-medium text-slate-600 transition hover:text-slate-900'>Agent Finder</li>
          )}
          {role === 'university' && universityTabs.map((tab) => (
            <Link key={tab.href} href={tab.href}>
              <li className={`cursor-pointer text-sm font-medium transition ${path === tab.href ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
                {tab.label}
              </li>
            </Link>
          ))}
          {role === 'owner' && (
            <>
              <Link href={'/user#my-listings'}>
                <li className={`hover:text-primary font-medium text-sm cursor-pointer ${path === '/user#my-listings' ? 'text-primary' : ''}`}>My Listings</li>
              </Link>
              <Link href={'/user#owner-bookings'}>
                <li className={`hover:text-primary font-medium text-sm cursor-pointer ${path === '/user#owner-bookings' ? 'text-primary' : ''}`}>Bookings</li>
              </Link>
              <Link href={'/user#lease-requests'}>
                <li className={`hover:text-primary font-medium text-sm cursor-pointer ${path === '/user#lease-requests' ? 'text-primary' : ''}`}>Lease Requests</li>
              </Link>
              <Link href={'/user/messages'}>
                <li className={`hover:text-primary font-medium text-sm cursor-pointer ${path === '/user#owner-chat' ? 'text-primary' : ''}`}>Messages</li>
              </Link>
            </>
          )}
        </ul>
      </div>
      <div className='flex items-center gap-2'>
        {showPostAd && (
          <Link href={'/add-new-listing'}>
            <Button className="flex gap-2 rounded-full px-4"><Plus className='h-4 w-4' /> Post Your Ad</Button>
          </Link>
        )}
        {isSignedIn ?
        
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white'>
              {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
             <Link href={'/user/profile'}>Profile</Link> 
            </DropdownMenuItem>
            {role === 'student' ? (
              <>
                <DropdownMenuItem>
                  <Link href={'/user#my-bookings'}>My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={'/user/messages'}>Messages</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={'/user/events'}>Events</Link>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem>
                <Link href={'/user#my-listings'}>My Listings</Link>
              </DropdownMenuItem>
            )}
             
            <DropdownMenuItem>
              <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/' }} className="w-full text-left">Logout</button>
            </DropdownMenuItem>
           
          </DropdownMenuContent>
        </DropdownMenu>

          : 
          <div className='flex gap-2'>
            <Link href={'/sign-in'}>
              <Button variant="outline">Login</Button>
            </Link>
            <Link href={'/sign-up'}>
              <Button>Sign Up</Button>
            </Link>
          </div>
        }

      </div>
    </div>
    </div>
  )
}

export default Header