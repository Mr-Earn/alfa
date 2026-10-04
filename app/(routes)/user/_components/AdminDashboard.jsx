"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, TrendingUp, Users, Building2, BellRing, ClipboardList, Activity, RefreshCw, Download, Home, Search } from 'lucide-react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const isPendingBooking = (booking) => ['pending', 'requested', 'awaiting approval'].includes(String(booking.status || '').toLowerCase())

const defaultSummary = {
  maintenanceCount: 0,
  visitorCount: 0,
  waitingListCount: 0,
  activeStudents: 0,
  activeAgents: 0,
  communicationsCount: 0,
  invoiceCount: 0,
  listingCount: 0,
  pendingBookings: 0,
  activeListings: 0,
  totalBookings: 0,
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(defaultSummary)
  const [profiles, setProfiles] = useState([])
  const [studentHub, setStudentHub] = useState({})
  const [listings, setListings] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshCount, setRefreshCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [listingSearch, setListingSearch] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [profileRoleFilter, setProfileRoleFilter] = useState('all')
  const [updatingBookingIds, setUpdatingBookingIds] = useState([])

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const headers = await getAuthenticatedRequestHeaders('admin')
        const [studentHubResponse, profileResponse, bookingResponse, listingResponse] = await Promise.all([
          fetch('/api/student-hub', { headers }),
          fetch('/api/profiles', { headers }),
          fetch('/api/bookings?limit=100', { headers }),
          fetch('/api/listings', { headers }),
        ])

        const failedResponse = [studentHubResponse, profileResponse, bookingResponse, listingResponse].find((response) => !response.ok)
        if (failedResponse) throw new Error(`Dashboard data request failed (${failedResponse.status})`)

        const studentHubData = await studentHubResponse.json()
        const profileData = await profileResponse.json()
        const bookingData = await bookingResponse.json()
        const listingData = await listingResponse.json()

        const profilesList = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const bookingsList = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const listingList = Array.isArray(listingData?.listings) ? listingData.listings : []

        const activeStudents = profilesList.filter((profile) => profile.role === 'student').length
        const activeAgents = profilesList.filter((profile) => profile.role === 'agent' || profile.role === 'owner').length
        const activeListings = listingList.filter((listing) => listing.active !== false && listing.active !== 'false').length
        const pendingBookings = bookingsList.filter(isPendingBooking).length

        setStudentHub(studentHubData || {})
        setProfiles(profilesList)
        setBookings(bookingsList)
        setListings(listingList)
        setSummary({
          maintenanceCount: Array.isArray(studentHubData?.maintenance) ? studentHubData.maintenance.length : 0,
          visitorCount: Array.isArray(studentHubData?.visitors) ? studentHubData.visitors.length : 0,
          waitingListCount: Array.isArray(studentHubData?.waitingList) ? studentHubData.waitingList.length : 0,
          activeStudents,
          activeAgents,
          communicationsCount: Array.isArray(studentHubData?.communications) ? studentHubData.communications.length : 0,
          invoiceCount: Array.isArray(studentHubData?.invoices) ? studentHubData.invoices.length : 0,
          listingCount: listingList.length,
          activeListings,
          pendingBookings,
          totalBookings: bookingData?.meta?.total ?? bookingsList.length,
        })
      } catch (error) {
        console.warn('Unable to load admin dashboard summary', error)
        setLoadError(error.message || 'Unable to load dashboard data. Try refreshing.')
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [refreshCount])

  const moderationQueue = useMemo(() => {
    const items = []

    const maintenanceItems = Array.isArray(studentHub?.maintenance) ? studentHub.maintenance : []
    maintenanceItems.slice(0, 3).forEach((item) => {
      items.push({
        id: item.id || item.title,
        title: item.title || 'Maintenance task',
        detail: item.status || 'Requires review',
        category: 'Maintenance',
        href: '#student-hub',
      })
    })

    const waitingList = Array.isArray(studentHub?.waitingList) ? studentHub.waitingList : []
    waitingList.slice(0, 3).forEach((item) => {
      items.push({
        id: item.id || item.email || item.name,
        title: item.full_name || item.name || item.email || 'Waiting-list applicant',
        detail: item.note || item.course || 'Awaiting disposition',
        category: 'Waiting list',
        href: '#waiting-list',
      })
    })

    return items.slice(0, 6)
  }, [studentHub])

  const recentActivity = useMemo(() => {
    const items = []

    profiles.slice(0, 4).forEach((profile) => {
      items.push({
        label: profile.role || 'User',
        value: profile.full_name || profile.email || 'Unknown profile',
        tone: 'text-slate-700',
      })
    })

    listings.slice(0, 3).forEach((listing) => {
      items.push({
        label: 'Listing',
        value: listing.title || listing.address || 'Property listing',
        tone: 'text-emerald-700',
      })
    })

    bookings.slice(0, 3).forEach((booking) => {
      items.push({
        label: 'Booking',
        value: booking.listing_title || booking.listing_id || 'Accommodation booking',
        tone: 'text-indigo-700',
      })
    })

    return items.slice(0, 6)
  }, [profiles, listings, bookings])

  const pendingBookingReviews = useMemo(() => bookings.filter(isPendingBooking), [bookings])

  const filteredListings = useMemo(() => {
    const query = listingSearch.trim().toLowerCase()
    if (!query) return listings
    return listings.filter((listing) => `${listing.title || ''} ${listing.address || ''} ${listing.createdBy || listing.createdby || ''}`.toLowerCase().includes(query))
  }, [listings, listingSearch])

  const filteredProfiles = useMemo(() => {
    const query = profileSearch.trim().toLowerCase()
    return profiles.filter((profile) => {
      const matchesRole = profileRoleFilter === 'all' || profile.role === profileRoleFilter
      const matchesSearch = !query || `${profile.full_name || ''} ${profile.email || ''} ${profile.university || ''}`.toLowerCase().includes(query)
      return matchesRole && matchesSearch
    })
  }, [profiles, profileRoleFilter, profileSearch])

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Generated at', new Date().toISOString()],
      ['Students', summary.activeStudents],
      ['Property partners', summary.activeAgents],
      ['Active listings', summary.activeListings],
      ['Total listings', summary.listingCount],
      ['Total bookings', summary.totalBookings],
      ['Pending bookings in current page', summary.pendingBookings],
      ['Waiting list', summary.waitingListCount],
      ['Maintenance requests', summary.maintenanceCount],
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `admin-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const updateListingAvailability = async (listing) => {
    const nextActive = listing.active === false || listing.active === 'false'
    setActionMessage('')
    try {
      const headers = await getAuthenticatedRequestHeaders('admin')
      const response = await fetch('/api/listings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: listing.id, active: nextActive }),
      })
      if (!response.ok) throw new Error('Unable to update listing availability.')
      const data = await response.json()
      setListings((current) => current.map((item) => String(item.id) === String(listing.id) ? { ...item, ...(data.listing || {}), active: nextActive } : item))
      setSummary((current) => ({ ...current, activeListings: current.activeListings + (nextActive ? 1 : -1) }))
      setActionMessage(`Listing ${nextActive ? 'published' : 'paused'}.`)
    } catch (error) {
      setActionMessage(error.message || 'Unable to update listing availability.')
    }
  }

  const reviewBooking = async (booking, status) => {
    setActionMessage('')
    setUpdatingBookingIds((current) => [...current, booking.id])
    try {
      const headers = await getAuthenticatedRequestHeaders('admin')
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: booking.id, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update booking status.')

      setBookings((current) => current.map((item) => String(item.id) === String(booking.id) ? { ...item, ...(data.booking || {}), status } : item))
      setSummary((current) => ({ ...current, pendingBookings: Math.max(0, current.pendingBookings - 1) }))
      setActionMessage(`Booking ${status}.`)
    } catch (error) {
      setActionMessage(error.message || 'Unable to update booking status.')
    } finally {
      setUpdatingBookingIds((current) => current.filter((id) => String(id) !== String(booking.id)))
    }
  }

  const mutateStudentHubEntry = async ({ method, type, id, entry }) => {
    try {
      const headers = await getAuthenticatedRequestHeaders('admin')
      const response = await fetch('/api/student-hub', {
        method,
        headers,
        body: JSON.stringify({ type, id, ...(entry ? { entry } : {}) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update student hub record.')

      const refreshed = await fetch('/api/student-hub', { headers })
      if (!refreshed.ok) throw new Error('The record changed, but the dashboard could not refresh.')
      const data = await refreshed.json()
      setStudentHub(data)
      setSummary((current) => ({
        ...current,
        maintenanceCount: Array.isArray(data?.maintenance) ? data.maintenance.length : current.maintenanceCount,
        waitingListCount: Array.isArray(data?.waitingList) ? data.waitingList.length : current.waitingListCount,
        communicationsCount: Array.isArray(data?.communications) ? data.communications.length : current.communicationsCount,
      }))
      setActionMessage(`${type === 'waitingList' ? 'Waiting-list record' : 'Communication'} ${method === 'DELETE' ? 'removed' : 'updated'}.`)
    } catch (error) {
      setActionMessage(error.message || 'Unable to update student hub record.')
    }
  }

  return (
    <div className="space-y-5">
      <div id="admin-overview" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Admin overview</h2>
          <p className="mt-1 text-sm text-slate-500">Platform operations and review queue</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRefreshCount((count) => count + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={exportReport} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>
      {loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>}
      {actionMessage && <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{actionMessage}</p>}

      <nav aria-label="Admin dashboard sections" className="sticky top-[88px] z-20 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        {[
          ['Overview', '#admin-overview'],
          ['Booking review', '#booking-review'],
          ['Moderation', '#moderation'],
          ['Student hub', '#student-hub'],
          ['Listings', '#listings'],
          ['Profiles', '#profiles'],
          ['Analytics', '#analytics'],
        ].map(([label, href]) => (
          <a key={href} href={href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">{label}</a>
        ))}
      </nav>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Active students</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? '...' : summary.activeStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Property partners</p>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? '...' : summary.activeAgents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Open cases</p>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? '...' : summary.maintenanceCount + summary.waitingListCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Pending bookings</p>
            <ClipboardList className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{loading ? '...' : summary.pendingBookings}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <h3 className="text-lg font-semibold text-slate-900">Platform oversight</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-500">Active listings</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.activeListings} / {summary.listingCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-500">Complaints / issues</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.maintenanceCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-500">Resident comms</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.communicationsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-500">Visitors & approvals</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.visitorCount}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Review listing availability and pause properties that should not appear in search.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Use the moderation queue to follow maintenance and waiting-list records.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Dashboard totals reflect records returned by the connected services.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <a href="#listings" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Review listings</a>
            <a href="#profiles" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Browse profiles</a>
            <a href="#waiting-list" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Check waiting list</a>
            <button type="button" onClick={exportReport} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Export operations report</button>
          </div>
        </div>
      </section>

      <section id="moderation" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Moderation queue</h3>
          </div>
          <div className="space-y-3">
            {moderationQueue.length > 0 ? moderationQueue.map((item) => (
              <div key={`${item.category}-${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.category} • {item.detail}</p>
                </div>
                <a href={item.href} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Review</a>
              </div>
            )) : <p className="text-sm text-slate-500">No moderation items right now.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Platform records</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((item, index) => (
              <div key={`${item.label}-${item.value}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-1 text-sm font-medium ${item.tone}`}>{item.value}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No recent activity yet.</p>}
          </div>
        </div>
      </section>

      <section id="booking-review" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-rose-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Booking review</h3>
              <p className="text-sm text-slate-500">Approve or reject incoming accommodation requests.</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{pendingBookingReviews.length} pending</span>
        </div>
        {loading ? <p className="text-sm text-slate-500">Loading booking requests...</p> : pendingBookingReviews.length ? (
          <div className="divide-y divide-slate-200">
            {pendingBookingReviews.map((booking) => (
              <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{booking.listing_title || booking.listing_id || 'Accommodation request'}</p>
                  <p className="truncate text-sm text-slate-500">{booking.student_profile?.full_name || booking.contact_email || 'Student'} · Move-in {booking.move_in_date || 'date not set'}</p>
                  {booking.message && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{booking.message}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={updatingBookingIds.includes(booking.id)} onClick={() => reviewBooking(booking, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">Approve</button>
                  <button type="button" disabled={updatingBookingIds.includes(booking.id)} onClick={() => reviewBooking(booking, 'rejected')} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No pending booking requests.</p>}
      </section>

      <section id="student-hub" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Student Hub — quick actions</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Recent communications</p>
            {Array.isArray(studentHub?.communications) && studentHub.communications.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {studentHub.communications.slice(0, 5).map((c) => (
                  <li key={c.id || c.title} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{c.title || c.subject || 'Message'}</p>
                      <p className="text-xs text-slate-500 truncate">{c.message || c.body || ''}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <button className="text-sm text-indigo-600" onClick={async () => {
                        const newMessage = window.prompt('Edit communication details', c.detail || c.message || c.body || '')
                        if (newMessage === null) return
                        await mutateStudentHubEntry({ method: 'PUT', type: 'communication', id: c.id || c.title, entry: { ...c, detail: newMessage } })
                      }}>Edit</button>
                      <button className="text-sm text-rose-600" onClick={async () => {
                        if (!window.confirm('Delete this communication?')) return
                        await mutateStudentHubEntry({ method: 'DELETE', type: 'communication', id: c.id || c.title })
                      }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No communications available.</p>
            )}
          </div>

          <div id="waiting-list" className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Waiting list (recent)</p>
            {Array.isArray(studentHub?.waitingList) && studentHub.waitingList.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {studentHub.waitingList.slice(0, 5).map((w) => (
                  <li key={w.id || w.email || w.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{w.full_name || w.name || w.email || 'Applicant'}</p>
                      <p className="text-xs text-slate-500 truncate">{w.note || w.course || ''}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <button className="text-sm text-indigo-600" onClick={async () => {
                        const newCourse = window.prompt('Edit course', w.course || '')
                        if (newCourse === null) return
                        await mutateStudentHubEntry({ method: 'PUT', type: 'waitingList', id: w.id || w.email || w.name, entry: { ...w, course: newCourse } })
                      }}>Edit</button>
                      <button className="text-sm text-rose-600" onClick={async () => {
                        if (!window.confirm('Remove from waiting list?')) return
                        await mutateStudentHubEntry({ method: 'DELETE', type: 'waitingList', id: w.id || w.email || w.name })
                      }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Waiting list is empty.</p>
            )}
          </div>
        </div>
      </section>

      <section id="listings" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Listings & availability</h3>
              <p className="text-sm text-slate-500">Publish or pause properties in public search.</p>
            </div>
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search listings by title, address, or owner" value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Search title, address, owner" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
          </label>
        </div>
        {loading ? <p className="text-sm text-slate-500">Loading listings...</p> : filteredListings.length ? (
          <div className="divide-y divide-slate-200">
            {filteredListings.map((listing) => {
              const isActive = listing.active !== false && listing.active !== 'false'
              return (
                <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{listing.title || 'Untitled listing'}</p>
                    <p className="truncate text-sm text-slate-500">{listing.address || 'No address'} · {listing.createdBy || listing.createdby || 'Owner not recorded'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isActive ? 'Published' : 'Paused'}
                    </span>
                    <button type="button" onClick={() => updateListingAvailability(listing)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {isActive ? 'Pause' : 'Publish'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-sm text-slate-500">No listings match this search.</p>}
      </section>

      <section id="analytics" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Analytics summary</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Registered users</p>
            <p className="text-xl font-semibold text-slate-900">{profiles.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Bookings</p>
            <p className="text-xl font-semibold text-slate-900">{summary.totalBookings}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Waiting-list queue</p>
            <p className="text-xl font-semibold text-slate-900">{summary.waitingListCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Invoices</p>
            <p className="text-xl font-semibold text-slate-900">{summary.invoiceCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Visitors</p>
            <p className="text-xl font-semibold text-slate-900">{summary.visitorCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Active listings</p>
            <p className="text-xl font-semibold text-slate-900">{summary.activeListings}</p>
          </div>
        </div>
      </section>

      <section id="profiles" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Registered profiles</h3>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search profiles by name, email, or university" value={profileSearch} onChange={(event) => setProfileSearch(event.target.value)} placeholder="Search name, email, university" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
          </label>
          <select value={profileRoleFilter} onChange={(event) => setProfileRoleFilter(event.target.value)} aria-label="Filter profiles by role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="owner">Owners</option>
            <option value="agent">Agents</option>
            <option value="university">Universities</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        {profiles.length > 0 ? (
          <>
          <p className="mb-2 text-xs text-slate-500">Showing {filteredProfiles.length} of {profiles.length} profiles</p>
          {filteredProfiles.length ? <div className="grid gap-3 md:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-500">{profile.role || 'student'}</p>
                <p className="font-semibold text-slate-900 truncate">{profile.full_name || profile.email || 'Unknown'}</p>
                <p className="text-sm text-slate-600 truncate">{profile.email || 'No email'}</p>
              </div>
            ))}
          </div> : <p className="text-sm text-slate-500">No profiles match these filters.</p>}
          </>
        ) : (
          <p className="text-sm text-slate-500">No registered profiles found.</p>
        )}
      </section>
    </div>
  )
}
