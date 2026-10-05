"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, TrendingUp, Users, Building2, BellRing, ClipboardList, Activity, RefreshCw, Download, Home, Search, Pencil, Mail } from 'lucide-react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const isPendingBooking = (booking) => ['pending', 'requested', 'awaiting approval'].includes(String(booking.status || '').toLowerCase())
const adminSections = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'bookings', label: 'Booking review' },
  { slug: 'moderation', label: 'Moderation' },
  { slug: 'communications', label: 'Communications' },
  { slug: 'student-hub', label: 'Student hub' },
  { slug: 'listings', label: 'Listings' },
  { slug: 'profiles', label: 'Profiles' },
  { slug: 'analytics', label: 'Analytics' },
]

const defaultSummary = {
  maintenanceCount: 0,
  visitorCount: 0,
  pendingVisitorCount: 0,
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

export default function AdminDashboard({ section = 'overview' }) {
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
  const [communicationForm, setCommunicationForm] = useState({ title: '', detail: '', type: 'Announcement', priority: 'Normal' })
  const [savingCommunication, setSavingCommunication] = useState(false)
  const [recipientRoleFilter, setRecipientRoleFilter] = useState('all')
  const [recipientProfileId, setRecipientProfileId] = useState('')
  const [directMessageDraft, setDirectMessageDraft] = useState('')
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false)
  const [adminMessages, setAdminMessages] = useState([])
  const [adminEmail, setAdminEmail] = useState('')
  const [loadingAdminMessages, setLoadingAdminMessages] = useState(false)
  const [adminMessagesError, setAdminMessagesError] = useState('')
  const [editingProfileId, setEditingProfileId] = useState(null)
  const [profileForm, setProfileForm] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)

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

        const bookingPageCount = Math.max(1, Number(bookingData?.meta?.total_pages) || 1)
        const additionalBookingResponses = await Promise.all(
          Array.from({ length: bookingPageCount - 1 }, (_, index) =>
            fetch(`/api/bookings?page=${index + 2}&limit=100`, { headers })
          )
        )
        const failedBookingResponse = additionalBookingResponses.find((response) => !response.ok)
        if (failedBookingResponse) throw new Error(`Booking data request failed (${failedBookingResponse.status})`)
        const additionalBookingPages = await Promise.all(additionalBookingResponses.map((response) => response.json()))

        const profilesList = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const bookingsList = [
          ...(Array.isArray(bookingData?.bookings) ? bookingData.bookings : []),
          ...additionalBookingPages.flatMap((page) => Array.isArray(page?.bookings) ? page.bookings : []),
        ]
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
          pendingVisitorCount: Array.isArray(studentHubData?.visitors)
            ? studentHubData.visitors.filter((visitor) => String(visitor.status || '').toLowerCase() === 'pending').length
            : 0,
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

  useEffect(() => {
    if (section !== 'communications') return
    let active = true

    const loadAdminMessages = async () => {
      setLoadingAdminMessages(true)
      setAdminMessagesError('')
      try {
        const headers = await getAuthenticatedRequestHeaders('admin')
        const response = await fetch('/api/messages', { headers })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load recent messages.')
        if (active) {
          setAdminEmail(String(headers['x-user-email'] || '').toLowerCase())
          setAdminMessages(Array.isArray(data?.messages) ? data.messages.filter((message) => message.recipient) : [])
        }
      } catch (error) {
        if (active) setAdminMessagesError(error.message || 'Unable to load recent messages.')
      } finally {
        if (active) setLoadingAdminMessages(false)
      }
    }

    loadAdminMessages()
    return () => {
      active = false
    }
  }, [section])

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
  const communicationRecipients = useMemo(() => profiles.filter((profile) => (
    profile.email && (recipientRoleFilter === 'all' || profile.role === recipientRoleFilter)
  )), [profiles, recipientRoleFilter])
  const activeSection = adminSections.find((item) => item.slug === section) || adminSections[0]

  const filteredListings = useMemo(() => {
    const query = listingSearch.trim().toLowerCase()
    if (!query) return listings
    return listings.filter((listing) => `${listing.title || ''} ${listing.address || ''} ${listing.createdBy || listing.createdby || ''}`.toLowerCase().includes(query))
  }, [listings, listingSearch])

  const filteredProfiles = useMemo(() => {
    const query = profileSearch.trim().toLowerCase()
    return profiles.filter((profile) => {
      const matchesRole = profileRoleFilter === 'all' || profile.role === profileRoleFilter
      const matchesSearch = !query || `${profile.full_name || ''} ${profile.email || ''} ${profile.university || ''} ${profile.institution_name || ''} ${profile.course || ''} ${profile.phone || profile.phone_number || ''}`.toLowerCase().includes(query)
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
      ['Pending visitors', summary.pendingVisitorCount],
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
        visitorCount: Array.isArray(data?.visitors) ? data.visitors.length : current.visitorCount,
        pendingVisitorCount: Array.isArray(data?.visitors)
          ? data.visitors.filter((visitor) => String(visitor.status || '').toLowerCase() === 'pending').length
          : current.pendingVisitorCount,
      }))
      const labels = { waitingList: 'Waiting-list record', communication: 'Communication', maintenance: 'Maintenance request', visitor: 'Visitor request' }
      const action = method === 'DELETE' ? 'removed' : method === 'POST' ? 'created' : 'updated'
      setActionMessage(`${labels[type] || 'Student Hub record'} ${action}.`)
      return true
    } catch (error) {
      setActionMessage(error.message || 'Unable to update student hub record.')
      return false
    }
  }

  const handleCommunicationSubmit = async (event) => {
    event.preventDefault()
    setSavingCommunication(true)
    const created = await mutateStudentHubEntry({ method: 'POST', type: 'communication', entry: communicationForm })
    if (created) setCommunicationForm({ title: '', detail: '', type: 'Announcement', priority: 'Normal' })
    setSavingCommunication(false)
  }

  const startEditingProfile = (profile) => {
    setEditingProfileId(profile.id)
    setProfileForm({
      full_name: profile.full_name || '',
      phone: profile.phone || profile.phone_number || '',
      university: profile.university || '',
      course: profile.course || '',
      program: profile.program || '',
      year: profile.year || '',
      nationality: profile.nationality || '',
      date_of_birth: profile.date_of_birth || '',
      preferred_move_in_date: profile.preferred_move_in_date || '',
      company_name: profile.company_name || profile.company || '',
      agency: profile.agency || '',
      license_number: profile.license_number || '',
      institution_name: profile.institution_name || '',
      contact_person: profile.contact_person || '',
      address: profile.address || '',
      bio: profile.bio || '',
      additional_info: profile.additional_info || '',
    })
  }

  const saveProfile = async (event, profile) => {
    event.preventDefault()
    setSavingProfile(true)
    setActionMessage('')
    try {
      const headers = await getAuthenticatedRequestHeaders('admin')
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: profile.id, email: profile.email, role: profile.role, ...profileForm }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save profile changes.')
      setProfiles((current) => current.map((item) => String(item.id) === String(profile.id) ? { ...item, ...(data.profile || profileForm) } : item))
      setEditingProfileId(null)
      setActionMessage(`Profile updated for ${profile.full_name || profile.email || 'user'}.`)
    } catch (error) {
      setActionMessage(error.message || 'Unable to save profile changes.')
    } finally {
      setSavingProfile(false)
    }
  }

  const sendDirectMessage = async (event) => {
    event.preventDefault()
    const recipient = communicationRecipients.find((profile) => String(profile.id) === String(recipientProfileId))
    const body = directMessageDraft.trim()
    if (!recipient?.email || !body) return

    setSendingDirectMessage(true)
    setActionMessage('')
    try {
      const headers = await getAuthenticatedRequestHeaders('admin')
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient: recipient.email,
          recipient_name: recipient.full_name || recipient.email,
          body,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send message.')
      setDirectMessageDraft('')
      setAdminEmail(String(headers['x-user-email'] || '').toLowerCase())
      setAdminMessages(Array.isArray(data?.messages) ? data.messages.filter((message) => message.recipient) : [])
      setActionMessage(`Message sent to ${recipient.full_name || recipient.email}.`)
    } catch (error) {
      setActionMessage(error.message || 'Unable to send message.')
    } finally {
      setSendingDirectMessage(false)
    }
  }

  return (
    <div className="space-y-5">
      <div id="admin-overview" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{section === 'overview' ? 'Admin overview' : activeSection.label}</h2>
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
        {adminSections.map(({ slug, label }) => (
          <Link key={slug} href={slug === 'overview' ? '/user/admin' : `/user/admin/${slug}`} aria-current={section === slug ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${section === slug ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{label}</Link>
        ))}
      </nav>

      {section === 'overview' && <>
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
            <Link href="/user/admin/listings" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Review listings</Link>
            <Link href="/user/admin/profiles" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Browse profiles</Link>
            <Link href="/user/admin/student-hub" className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100">Check waiting list</Link>
            <button type="button" onClick={exportReport} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Export operations report</button>
          </div>
        </div>
      </section>
      </>}

      {['overview', 'moderation'].includes(section) && <section id="moderation" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {section === 'moderation' && (
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
        )}

        {section === 'overview' && (
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
        )}
      </section>}

      {section === 'communications' && <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={sendDirectMessage} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Send a direct message</h3>
            <p className="mt-1 text-sm text-slate-500">Contact a student, owner, agent, university, or admin.</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Recipient role
            <select value={recipientRoleFilter} onChange={(event) => { setRecipientRoleFilter(event.target.value); setRecipientProfileId('') }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="owner">Owners</option>
              <option value="agent">Agents</option>
              <option value="university">Universities</option>
              <option value="admin">Admins</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Recipient
            <select required value={recipientProfileId} onChange={(event) => setRecipientProfileId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Choose a user</option>
              {communicationRecipients.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.full_name || profile.email} · {profile.role || 'student'}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Message
            <textarea required maxLength={5000} rows={6} value={directMessageDraft} onChange={(event) => setDirectMessageDraft(event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2" placeholder="Write your message" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{directMessageDraft.length}/5000</span>
            <button type="submit" disabled={sendingDirectMessage || !recipientProfileId || !directMessageDraft.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{sendingDirectMessage ? 'Sending...' : 'Send message'}</button>
          </div>
        </form>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Role directory</h3>
          <p className="mt-1 text-sm text-slate-500">{communicationRecipients.length} users available for direct contact.</p>
          <ul className="mt-3 divide-y divide-slate-200">
            {communicationRecipients.slice(0, 12).map((profile) => (
              <li key={profile.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-slate-800">{profile.full_name || profile.email}</span>
                <span className="shrink-0 text-xs capitalize text-slate-500">{profile.role || 'student'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent conversations</h3>
            <p className="text-sm text-slate-500">Messages sent or received by this admin account.</p>
          </div>
          <span className="text-xs text-slate-500">Latest {Math.min(adminMessages.length, 10)} of {adminMessages.length}</span>
        </div>
        {adminMessagesError ? <p role="alert" className="text-sm text-rose-700">{adminMessagesError}</p> : loadingAdminMessages ? <p className="text-sm text-slate-500">Loading conversations...</p> : adminMessages.length ? (
          <ul className="divide-y divide-slate-200">
            {adminMessages.slice(0, 10).map((message) => {
              const sentByAdmin = String(message.sender || '').toLowerCase() === adminEmail
              const contactEmail = sentByAdmin ? message.recipient : message.sender
              const contactName = sentByAdmin ? message.recipient_name || contactEmail : message.sender_name || contactEmail
              return (
                <li key={message.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{sentByAdmin ? 'To' : 'From'} {contactName}</p>
                    <p className="text-xs text-slate-500">{contactEmail} · {message.created_at ? new Date(message.created_at).toLocaleString() : 'Time unavailable'}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                  </div>
                  {contactEmail && <Link href={`/user/messages?recipient=${encodeURIComponent(contactEmail)}`} className="shrink-0 text-sm font-medium text-blue-700 hover:underline">Open conversation</Link>}
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">No direct messages yet.</p>}
      </section>
      </>}

      {section === 'bookings' && <section id="booking-review" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </section>}

      {section === 'student-hub' && <section id="student-hub" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Student Hub — quick actions</h3>
        </div>
        <form onSubmit={handleCommunicationSubmit} className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Create communication</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700 sm:col-span-2">
              Title
              <input required value={communicationForm.title} onChange={(event) => setCommunicationForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              Type
              <select value={communicationForm.type} onChange={(event) => setCommunicationForm((current) => ({ ...current, type: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="Announcement">Announcement</option>
                <option value="Support ticket">Support ticket</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 sm:col-span-3">
              Details
              <textarea required rows={3} value={communicationForm.detail} onChange={(event) => setCommunicationForm((current) => ({ ...current, detail: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm text-slate-700">
              Priority
              <select value={communicationForm.priority} onChange={(event) => setCommunicationForm((current) => ({ ...current, priority: event.target.value }))} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </label>
            <button type="submit" disabled={savingCommunication} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
              {savingCommunication ? 'Publishing...' : 'Publish communication'}
            </button>
          </div>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Recent communications</p>
            {Array.isArray(studentHub?.communications) && studentHub.communications.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {studentHub.communications.slice(0, 5).map((c) => (
                  <li key={c.id || c.title} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{c.title || c.subject || 'Message'}</p>
                      <p className="text-xs text-slate-500 truncate">{c.detail || c.message || c.body || ''}</p>
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Maintenance requests</p>
            {Array.isArray(studentHub?.maintenance) && studentHub.maintenance.length ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {studentHub.maintenance.slice(0, 8).map((item) => (
                  <li key={item.id || item.title} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{item.title || 'Maintenance request'}</p>
                      <p className="truncate text-xs text-slate-500">{item.owner || 'Facilities'} · {item.status || 'Open'}</p>
                    </div>
                    <select aria-label={`Update status for ${item.title || 'maintenance request'}`} value={item.status || 'Open'} onChange={(event) => mutateStudentHubEntry({ method: 'PUT', type: 'maintenance', id: item.id || item.title, entry: { status: event.target.value } })} className="max-w-36 rounded-md border border-slate-300 px-2 py-1 text-xs">
                      <option value="Open">Open</option>
                      <option value="In Progress">In progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No maintenance requests.</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-700">Visitor approvals</p>
            {Array.isArray(studentHub?.visitors) && studentHub.visitors.length ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {studentHub.visitors.slice(0, 8).map((visitor) => {
                  const pending = String(visitor.status || 'Pending').toLowerCase() === 'pending'
                  return (
                    <li key={visitor.id || visitor.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{visitor.name || 'Visitor'}</p>
                        <p className="truncate text-xs text-slate-500">{visitor.purpose || 'Visit'}{visitor.overnight ? ' · Overnight' : ''}</p>
                      </div>
                      {pending ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => mutateStudentHubEntry({ method: 'PUT', type: 'visitor', id: visitor.id || visitor.name, entry: { status: 'Approved' } })} className="text-xs font-medium text-emerald-700 hover:underline">Approve</button>
                          <button type="button" onClick={() => mutateStudentHubEntry({ method: 'PUT', type: 'visitor', id: visitor.id || visitor.name, entry: { status: 'Rejected' } })} className="text-xs font-medium text-rose-700 hover:underline">Reject</button>
                        </div>
                      ) : <span className="text-xs font-medium text-slate-500">{visitor.status}</span>}
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-sm text-slate-500">No visitor requests.</p>}
          </div>
        </div>
      </section>}

      {section === 'listings' && <section id="listings" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </section>}

      {section === 'analytics' && <section id="analytics" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </section>}

      {section === 'profiles' && <section id="profiles" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            {filteredProfiles.map((profile) => {
              const email = String(profile.email || '').trim().toLowerCase()
              const profileBookings = bookings.filter((booking) =>
                (profile.id && String(booking.user_id) === String(profile.id)) ||
                (email && String(booking.contact_email || '').trim().toLowerCase() === email)
              )
              const ownerListings = listings.filter((listing) => {
                const ownerEmail = String(listing.createdBy || listing.createdby || '').trim().toLowerCase()
                return email && ownerEmail === email
              })
              const associatedListings = [
                ...ownerListings.map((listing) => ({
                  key: `owned-${listing.id}`,
                  listing,
                  booking: null,
                  relationship: 'Owner',
                })),
                ...profileBookings.map((booking) => ({
                  key: `booking-${booking.id}`,
                  listing: listings.find((listing) => String(listing.id) === String(booking.listing_id)) || null,
                  booking,
                  relationship: 'Booking',
                })),
              ]
              const university = profile.university || profile.institution_name
              const universityStudents = profile.role === 'university' && university
                ? profiles.filter((candidate) => candidate.role === 'student' && String(candidate.university || '').trim().toLowerCase() === String(university).trim().toLowerCase())
                : []
              const profileFacts = [
                ['Profile ID', profile.id],
                ['Phone', profile.phone || profile.phone_number],
                ['University / institution', university],
                ['Course / program', profile.course || profile.program || profile.major],
                ['Year', profile.year],
                ['Nationality', profile.nationality],
                ['Date of birth', profile.date_of_birth],
                ['Preferred move-in', profile.preferred_move_in_date],
                ['Organization', profile.company_name || profile.company || profile.agency],
                ['License number', profile.license_number],
                ['Contact person', profile.contact_person],
                ['Address', profile.address],
                ['Bio', profile.bio],
                ['Additional information', profile.additional_info],
              ].filter(([, value]) => value != null && value !== '')

              return (
                <details key={profile.id || profile.email} className="rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-4 marker:hidden">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase text-slate-500">{profile.role || 'student'}</p>
                      <h4 className="mt-1 truncate font-semibold text-slate-900">{profile.full_name || profile.email || 'Unknown user'}</h4>
                      <p className="truncate text-sm text-slate-600">{profile.email || 'No email'}</p>
                      <p className="mt-1 text-xs text-slate-500">{university || 'University not provided'}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600">View details · {associatedListings.length} accommodation records</span>
                  </summary>

                  <div className="space-y-4 border-t border-slate-200 p-4">
                    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                      {profileFacts.map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs text-slate-500">{label}</dt>
                          <dd className="break-words text-slate-800">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="border-t border-slate-200 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Associated accommodation</p>
                      {associatedListings.length ? (
                        <ul className="divide-y divide-slate-200">
                          {associatedListings.map(({ key, listing, booking, relationship }) => (
                            <li key={key} className="py-3 text-sm">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                {listing?.id ? <Link href={`/view-listing/${encodeURIComponent(listing.id)}`} className="font-medium text-blue-700 hover:underline">{listing.title || 'View full listing'}</Link> : <p className="font-medium text-slate-900">{booking?.listing_title || 'Listing details unavailable'}</p>}
                                <span className="text-xs text-slate-500">{relationship}{booking?.status ? ` · ${booking.status}` : ''}</span>
                              </div>
                              {listing ? (
                                <>
                                  <p className="mt-1 text-slate-600">{listing.address || 'Address not provided'} · {listing.propertyType || listing.propertytype || 'Type not listed'} · R{Number(listing.price || 0).toLocaleString()}</p>
                                  <p className="text-xs text-slate-500">Listing ID: {listing.id} · {listing.bedroom ?? '—'} bedrooms · {listing.bathroom ?? '—'} bathrooms · {listing.parking ?? '—'} parking · {listing.active === false || listing.active === 'false' ? 'Paused' : 'Published'}</p>
                                  {(listing.area || listing.lotSize || listing.builtIn || listing.hoa) && <p className="text-xs text-slate-500">{listing.area ? `Area: ${listing.area} sq ft · ` : ''}{listing.lotSize ? `Lot: ${listing.lotSize} sq ft · ` : ''}{listing.builtIn ? `Built: ${listing.builtIn} · ` : ''}{listing.hoa ? `HOA: R${listing.hoa}` : ''}</p>}
                                  {listing.description && <p className="mt-1 whitespace-pre-wrap text-slate-600">{listing.description}</p>}
                                </>
                              ) : booking ? <p className="text-xs text-slate-500">Listing ID: {booking.listing_id || 'Unknown'}</p> : null}
                              {booking && <p className="text-xs text-slate-500">Move-in: {booking.move_in_date || 'Not set'}{booking.assigned_university ? ` · University: ${booking.assigned_university}` : ''}{booking.assigned_accommodation ? ` · Accommodation: ${booking.assigned_accommodation}` : ''}</p>}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-slate-500">No linked bookings or owned listings.</p>}
                    </div>

                    {profile.role === 'university' && (
                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Registered students ({universityStudents.length})</p>
                        {universityStudents.length ? <p className="mt-1 text-sm text-slate-700">{universityStudents.map((student) => student.full_name || student.email).join(', ')}</p> : <p className="mt-1 text-sm text-slate-500">No students linked to this institution.</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                      <button type="button" aria-expanded={String(editingProfileId) === String(profile.id)} onClick={() => editingProfileId === profile.id ? setEditingProfileId(null) : startEditingProfile(profile)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
                        <Pencil className="h-4 w-4" /> {editingProfileId === profile.id ? 'Close editor' : 'Edit profile'}
                      </button>
                      {profile.email && <Link href={`/user/messages?recipient=${encodeURIComponent(profile.email)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"><Mail className="h-4 w-4" /> Message user</Link>}
                    </div>

                    {editingProfileId === profile.id && (
                      <form onSubmit={(event) => saveProfile(event, profile)} className="space-y-3 border-t border-slate-200 pt-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h5 className="font-semibold text-slate-900">Edit user information</h5>
                          <p className="text-xs text-slate-500">Account role and sign-in credentials are not changed here.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            ['full_name', 'Full name', 'text'],
                            ['phone', 'Phone', 'tel'],
                            ['university', 'University', 'text'],
                            ['course', 'Course', 'text'],
                            ['program', 'Program', 'text'],
                            ['year', 'Year', 'text'],
                            ['nationality', 'Nationality', 'text'],
                            ['date_of_birth', 'Date of birth', 'date'],
                            ['preferred_move_in_date', 'Preferred move-in', 'date'],
                            ['company_name', 'Company / organization', 'text'],
                            ['agency', 'Agency', 'text'],
                            ['license_number', 'License number', 'text'],
                            ['institution_name', 'Institution name', 'text'],
                            ['contact_person', 'Contact person', 'text'],
                            ['address', 'Address', 'text'],
                          ].map(([field, label, type]) => (
                            <label key={field} className="text-sm text-slate-700">
                              {label}
                              <input type={type} value={profileForm[field] || ''} onChange={(event) => setProfileForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                            </label>
                          ))}
                          <label className="text-sm text-slate-700 sm:col-span-2 lg:col-span-3">
                            Bio
                            <textarea rows={2} value={profileForm.bio || ''} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2" />
                          </label>
                          <label className="text-sm text-slate-700 sm:col-span-2 lg:col-span-3">
                            Additional information
                            <textarea rows={2} value={profileForm.additional_info || ''} onChange={(event) => setProfileForm((current) => ({ ...current, additional_info: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2" />
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingProfileId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">Cancel</button>
                          <button type="submit" disabled={savingProfile} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{savingProfile ? 'Saving...' : 'Save profile'}</button>
                        </div>
                      </form>
                    )}
                  </div>
                </details>
              )
            })}
          </div> : <p className="text-sm text-slate-500">No profiles match these filters.</p>}
          </>
        ) : (
          <p className="text-sm text-slate-500">No registered profiles found.</p>
        )}
      </section>}
    </div>
  )
}
