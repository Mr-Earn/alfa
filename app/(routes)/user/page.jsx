"use client"
import useSupabaseUser from '@/utils/supabase/useUser'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import UserListing from './_components/UserListing'
import AgentDashboard from './_components/AgentDashboard'
import UniversityDashboard from './_components/UniversityDashboard'
import StudentFeatures from './_components/StudentFeatures'


function User() {
  const user = useSupabaseUser()
  const role = user?.user_metadata?.role ?? 'student'
  const isOwner = role === 'owner'
  const router = useRouter()

  useEffect(() => {
    if (!user?.id || !user?.email) return

    getAuthenticatedRequestHeaders(role).then((headers) => {
      fetch('/api/profiles', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: user.id, email: user.email, role }),
      }).catch(() => undefined)
    }).catch(() => undefined)
  }, [user?.id, user?.email, role])

  useEffect(() => {
    if (role === 'admin') router.replace('/user/admin')
  }, [role, router])

  if (isOwner) {
    return (
      <div className='my-6 md:px-10 lg:px-32 w-full'>
        <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>Owner workspace</h3>
          <p className='mt-2 text-sm text-slate-600'>Your owner dashboard is now split into separate pages. Start with My Listings, then use the tabs for lease requests, chat, and overview.</p>
          <div className='mt-4 flex flex-wrap gap-3'>
            <Link href='/user/owner' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>My listings</Link>
            <Link href='/user#owner-bookings' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Bookings</Link>
            <Link href='/user/owner/lease-requests' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Lease requests</Link>
            <Link href='/user/owner/chat' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Owner chat</Link>
            <Link href='/user/owner/overview' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Overview</Link>
          </div>
        </div>

        <section id='owner-bookings' className='mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <div>
              <h3 className='text-lg font-semibold text-slate-900'>Bookings for your listings</h3>
              <p className='mt-1 text-sm text-slate-500'>Students who have requested or booked properties you own.</p>
            </div>
          </div>
          <OwnerBookings />
        </section>
      </div>
    )
  }

  if (role === 'admin') {
    return <div className='my-6 px-4 text-sm text-slate-500' role='status'>Opening admin console...</div>
  }

  if (role === 'student') {
    return (
      <div className='my-6 md:px-10 lg:px-32 w-full'>
        <StudentFeatures role={role} />
        <section id='my-bookings' className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold'>My Bookings</h3>
          <p className='mt-2 text-sm text-slate-500'>Bookings you created from listing pages.</p>
          <StudentBookings />
        </section>
        <section id='my-lease-requests' className='mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold'>My Lease Requests</h3>
          <p className='mt-2 text-sm text-slate-500'>Track requests sent to property owners and view uploaded lease agreements.</p>
          <StudentLeaseRequests />
        </section>
      </div>
    )
  }

  return (
    <div className='my-6 md:px-10 lg:px-32 w-full'>
      <h2 className='font-bold text-2xl py-3'>Profile</h2>
      <div className='mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h3 className='font-semibold text-slate-900'>{user?.user_metadata?.full_name ?? user?.email}</h3>
            <p className='text-sm text-gray-500'>{user?.email}</p>
          </div>
          <div className='rounded-full bg-blue-50 px-3 py-1 text-sm font-medium capitalize text-blue-700'>
            {role}
          </div>
        </div>
      </div>

      {role === 'agent' ? (
        <AgentDashboard />
      ) : role === 'university' ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>University workspace</h3>
          <p className='mt-2 text-sm text-slate-600'>Your university dashboard has been split into dedicated tabs for overview, students, communications, compliance, and events.</p>
          <div className='mt-4 flex flex-wrap gap-3'>
            <Link href='/user/university' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Overview</Link>
            <Link href='/user/university/students' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Students</Link>
            <Link href='/user/university/communications' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Communications</Link>
            <Link href='/user/messages' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Messages</Link>
            <Link href='/user/university/compliance' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Compliance</Link>
            <Link href='/user/university/events' className='rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>Events</Link>
          </div>
        </div>
      ) : (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>Property management tools</h3>
          <p className='mt-2 text-sm text-slate-600'>Agents, owners, and admins can manage listings, approvals, and verified accommodation workflows from this dashboard.</p>
        </div>
      )}

      <div className='mt-6'>
        <UserListing />
      </div>
    </div>
  )
}

export default User

function OwnerBookings() {
  const user = useSupabaseUser()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      setLoading(true)
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
        const res = await fetch('/api/bookings', { headers })
        const data = await res.json()
        const list = Array.isArray(data?.bookings) ? data.bookings : []
        setBookings(list)
      } catch (error) {
        console.warn('Unable to load owner bookings', error)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.email])

  if (loading) return <p className='mt-3 text-sm text-slate-500'>Loading bookings...</p>
  if (!bookings.length) return <div className='mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500'>No bookings for your listings yet.</div>

  return (
    <div className='mt-4 space-y-3'>
      {bookings.map((booking) => (
        <div key={booking.id || booking.listing_id} className='rounded-2xl border border-slate-200 p-4'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div>
              <p className='text-sm text-slate-500'>Listing</p>
              <p className='font-medium text-slate-900'>{booking.listing_title || booking.listing_id || 'Property booking'}</p>
              <p className='mt-1 text-sm text-slate-600'>Student: {booking.student_profile?.full_name || booking.contact_email || 'Unknown student'}</p>
              <p className='text-sm text-slate-600'>Move-in: {booking.move_in_date || 'TBD'} • Status: {booking.status || 'pending'}</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {booking.contact_email && (
                <Link href={`/user/messages?recipient=${encodeURIComponent(booking.contact_email)}`} className='rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700'>Message student</Link>
              )}
              {booking.student_profile?.id ? (
                <Link href={`/user/owner/student-profile/${booking.student_profile.id}`} className='rounded-full bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700'>View profile</Link>
              ) : null}
            </div>
          </div>
          {booking.message && <p className='mt-3 text-sm text-slate-600'>{booking.message}</p>}
        </div>
      ))}
    </div>
  )
}

function StudentBookings() {
  const user = useSupabaseUser()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage] = useState(6)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    const load = async (opts = { reset: false }) => {
      if (!user?.id && !user?.email) return
      setLoading(true)
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
        const res = await fetch(`/api/bookings?mine=true&page=${page}&limit=${perPage}`, { headers })
        const data = await res.json()
        const list = Array.isArray(data?.bookings) ? data.bookings : data?.data || []
        if (opts.reset) {
          setBookings(list)
        } else {
          setBookings((prev) => (page === 1 ? list : [...prev, ...list]))
        }
        setMeta(data?.meta || null)
      } catch (err) {
        console.warn('Unable to load bookings', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const handler = () => load()
    window.addEventListener('booking:created', handler)
    return () => window.removeEventListener('booking:created', handler)
  }, [user?.id, user?.email])

  useEffect(() => {
    // when page changes, load additional bookings
    if (!user?.id && !user?.email) return
    const loadPage = async () => {
      setLoading(true)
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
        const res = await fetch(`/api/bookings?mine=true&page=${page}&limit=${perPage}`, { headers })
        const data = await res.json()
        const list = Array.isArray(data?.bookings) ? data.bookings : data?.data || []
        setBookings((prev) => (page === 1 ? list : [...prev, ...list]))
        setMeta(data?.meta || null)
      } catch (err) {
        console.warn('Unable to load bookings', err)
      } finally {
        setLoading(false)
      }
    }
    loadPage()
  }, [page])

  if (!user) return <p className='mt-3 text-sm text-slate-500'>Sign in to view your bookings.</p>

  if (loading && bookings.length === 0) return <p className='mt-3 text-sm text-slate-500'>Loading bookings...</p>

  if (!bookings.length) return <div className='mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500'>You have no bookings yet.</div>

  return (
    <>
      <div className='mt-4 space-y-3'>
        {bookings.map((b) => (
          <div key={b.id || b.listing_id} className='rounded-2xl border border-slate-200 p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                {b.listing_images && b.listing_images.length > 0 ? (
                  <img src={b.listing_images[0]} alt='' className='h-16 w-24 rounded object-cover' />
                ) : (
                  <div className='h-16 w-24 rounded bg-slate-100' />
                )}
                <div>
                  <p className='font-medium'>{b.listing_title || b.listing_id}</p>
                  <p className='text-sm text-slate-500 mt-1'>Move-in: {b.move_in_date || 'TBD'} • Status: {b.status || 'pending'}</p>
                  {b.owner_name && <p className='text-sm text-slate-500 mt-1'>Owner: {b.owner_name}{b.owner_phone ? ` • ${b.owner_phone}` : ''}</p>}
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Link href={`/view-listing/${b.listing_id}`} className='text-sm text-blue-600 hover:underline'>View listing</Link>
              </div>
            </div>
            {b.message && <p className='mt-2 text-sm text-slate-600'>{b.message}</p>}
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className='mt-4 flex items-center justify-center'>
        {meta && meta.total_pages > page ? (
          <button
            className='rounded px-4 py-2 bg-blue-600 text-white text-sm'
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        ) : meta && meta.total === 0 ? (
          <div className='text-sm text-slate-500'>You have no bookings.</div>
        ) : null}
      </div>
    </>
  )
}

function StudentLeaseRequests() {
  const user = useSupabaseUser()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      setLoading(true)
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
        const response = await fetch('/api/lease-requests', { headers })
        const data = await response.json()
        setRequests(Array.isArray(data?.requests) ? data.requests : [])
      } catch (error) {
        console.warn('Unable to load lease requests', error)
        setRequests([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email])

  if (loading) return <p className='mt-4 text-sm text-slate-500'>Loading lease requests...</p>
  if (!requests.length) return <div className='mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500'>You have no lease requests yet.</div>

  return (
    <div className='mt-4 space-y-3'>
      {requests.map((request) => (
        <div key={request.id} className='rounded-2xl border border-slate-200 p-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='font-medium text-slate-900'>{request.listing_title || `Listing #${request.listing_id}`}</p>
              <p className='mt-1 text-sm text-slate-500'>Owner: {request.owner_email || 'Pending'} </p>
              {request.note && <p className='mt-2 text-sm text-slate-600'>{request.note}</p>}
            </div>
            <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700'>{request.status || 'requested'}</span>
          </div>
          {request.lease_url && <a href={request.lease_url} target='_blank' rel='noreferrer' className='mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline'>View lease agreement</a>}
          {request.application_document_url && <a href={request.application_document_url} target='_blank' rel='noreferrer' className='mt-2 block text-sm font-medium text-slate-600 hover:underline'>View submitted documents</a>}
        </div>
      ))}
    </div>
  )
}