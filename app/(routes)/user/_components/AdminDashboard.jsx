"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, TrendingUp, Users, Building2, BellRing, ClipboardList, Wallet, Activity } from 'lucide-react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const defaultSummary = {
  maintenanceCount: 0,
  visitorCount: 0,
  waitingListCount: 0,
  activeStudents: 0,
  activeAgents: 0,
  communicationsCount: 0,
  invoiceCount: 0,
  listingCount: 0,
  nfasStatus: 'Pending review',
  outstandingBalance: 'R0',
  assignedGenderCounts: { male: 0, female: 0, other: 0 },
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(defaultSummary)
  const [profiles, setProfiles] = useState([])
  const [studentHub, setStudentHub] = useState({})
  const [listings, setListings] = useState([])
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [studentHubResponse, profileResponse, bookingResponse, listingResponse] = await Promise.all([
          fetch('/api/student-hub'),
          fetch('/api/profiles'),
          fetch('/api/bookings'),
          fetch('/api/listings'),
        ])

        const studentHubData = await studentHubResponse.json()
        const profileData = await profileResponse.json()
        const bookingData = await bookingResponse.json()
        const listingData = await listingResponse.json()

        const profilesList = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const bookingsList = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const listingList = Array.isArray(listingData?.listings) ? listingData.listings : []

        const activeStudents = profilesList.filter((profile) => profile.role === 'student').length
        const activeAgents = profilesList.filter((profile) => profile.role === 'agent' || profile.role === 'owner').length
        const assignedGenderCounts = bookingsList.reduce((counts, booking) => {
          const gender = booking.assigned_gender
          if (gender) {
            const normalized = String(gender).trim().toLowerCase()
            if (normalized.includes('male')) counts.male += 1
            else if (normalized.includes('female')) counts.female += 1
            else counts.other += 1
          }
          return counts
        }, { male: 0, female: 0, other: 0 })

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
          nfasStatus: activeStudents > 0 ? 'Approved' : 'Pending review',
          outstandingBalance: `R${(bookingsList.length * 1200).toLocaleString()}`,
          assignedGenderCounts,
        })
      } catch (error) {
        console.warn('Unable to load admin dashboard summary', error)
      }
    }

    loadSummary()
  }, [])

  const moderationQueue = useMemo(() => {
    const items = []

    const maintenanceItems = Array.isArray(studentHub?.maintenance) ? studentHub.maintenance : []
    maintenanceItems.slice(0, 3).forEach((item) => {
      items.push({
        id: item.id || item.title,
        title: item.title || 'Maintenance task',
        detail: item.status || 'Requires review',
        category: 'Maintenance',
      })
    })

    const waitingList = Array.isArray(studentHub?.waitingList) ? studentHub.waitingList : []
    waitingList.slice(0, 3).forEach((item) => {
      items.push({
        id: item.id || item.email || item.name,
        title: item.full_name || item.name || item.email || 'Waiting-list applicant',
        detail: item.note || item.course || 'Awaiting disposition',
        category: 'Waiting list',
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

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Active students</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{summary.activeStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Property partners</p>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{summary.activeAgents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Open cases</p>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{summary.maintenanceCount + summary.waitingListCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Outstanding balance</p>
            <Wallet className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{summary.outstandingBalance}</p>
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
              <p className="text-sm font-medium text-slate-500">Verified listings</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.listingCount}</p>
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Monitor fraud alerts and suspicious listings.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Review compliance, verification, and policy violations.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Approve onboarding requests across universities and property partners.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Approve new listings</button>
            <button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Review profile verification</button>
            <button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Check waiting list queue</button>
            <button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">Export monthly finance report</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">Review</span>
              </div>
            )) : <p className="text-sm text-slate-500">No moderation items right now.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                        const newMessage = window.prompt('Edit message', c.message || c.body || '')
                        if (newMessage === null) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders('admin')
                          await fetch('/api/student-hub', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'communication', id: c.id || c.title, entry: { ...c, message: newMessage } }) })
                          const refreshed = await fetch('/api/student-hub', { headers })
                          const data = await refreshed.json()
                          setStudentHub(data)
                          setSummary((s) => ({ ...s, communicationsCount: data?.communications?.length || s.communicationsCount }))
                        } catch (e) { console.error(e) }
                      }}>Edit</button>
                      <button className="text-sm text-rose-600" onClick={async () => {
                        if (!window.confirm('Delete this communication?')) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders('admin')
                          await fetch('/api/student-hub', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'communication', id: c.id || c.title }) })
                          const refreshed = await fetch('/api/student-hub', { headers })
                          const data = await refreshed.json()
                          setStudentHub(data)
                          setSummary((s) => ({ ...s, communicationsCount: data?.communications?.length || s.communicationsCount }))
                        } catch (e) { console.error(e) }
                      }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No communications available.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                        const newNote = window.prompt('Edit note', w.note || '')
                        if (newNote === null) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders('admin')
                          await fetch('/api/student-hub', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'waitingList', id: w.id || w.email || w.name, entry: { ...w, note: newNote } }) })
                          const refreshed = await fetch('/api/student-hub', { headers })
                          const data = await refreshed.json()
                          setStudentHub(data)
                          setSummary((s) => ({ ...s, waitingListCount: data?.waitingList?.length || s.waitingListCount }))
                        } catch (e) { console.error(e) }
                      }}>Edit</button>
                      <button className="text-sm text-rose-600" onClick={async () => {
                        if (!window.confirm('Remove from waiting list?')) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders('admin')
                          await fetch('/api/student-hub', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'waitingList', id: w.id || w.email || w.name }) })
                          const refreshed = await fetch('/api/student-hub', { headers })
                          const data = await refreshed.json()
                          setStudentHub(data)
                          setSummary((s) => ({ ...s, waitingListCount: data?.waitingList?.length || s.waitingListCount }))
                        } catch (e) { console.error(e) }
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Analytics summary</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Placement success</p>
            <p className="text-xl font-semibold text-slate-900">91%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">NSFAS placements</p>
            <p className="text-xl font-semibold text-slate-900">327</p>
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
            <p className="text-sm text-slate-500">Fraud risk alerts</p>
            <p className="text-xl font-semibold text-slate-900">4</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">NSFAS status</p>
            <p className="text-xl font-semibold text-slate-900">{summary.nfasStatus}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Registered profiles</h3>
        </div>
        {profiles.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {profiles.slice(0, 6).map((profile) => (
              <div key={profile.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-500">{profile.role || 'student'}</p>
                <p className="font-semibold text-slate-900 truncate">{profile.full_name || profile.email || 'Unknown'}</p>
                <p className="text-sm text-slate-600 truncate">{profile.email || 'No email'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No registered profiles found.</p>
        )}
      </section>
    </div>
  )
}
