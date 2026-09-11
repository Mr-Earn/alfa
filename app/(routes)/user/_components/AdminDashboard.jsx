"use client"

import React, { useEffect, useState } from 'react'
import { ShieldAlert, TrendingUp, Users } from 'lucide-react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

export default function AdminDashboard() {
  const [summary, setSummary] = useState({
    maintenanceCount: 0,
    visitorCount: 0,
    waitingListCount: 0,
    activeStudents: 0,
    activeAgents: 0,
    communicationsCount: 0,
    invoiceCount: 0,
    nfasStatus: 'Pending review',
    outstandingBalance: 'R0',
  })
  const [profiles, setProfiles] = useState([])
  const [studentHub, setStudentHub] = useState({})

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [studentHubResponse, profileResponse, bookingResponse] = await Promise.all([
          fetch('/api/student-hub'),
          fetch('/api/profiles'),
          fetch('/api/bookings'),
        ])

        const studentHubData = await studentHubResponse.json()
        const profileData = await profileResponse.json()
        const bookingData = await bookingResponse.json()
        const profiles = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const bookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const activeStudents = profiles.filter((profile) => profile.role === 'student').length
        const activeAgents = profiles.filter((profile) => profile.role === 'agent' || profile.role === 'owner').length
        const assignedGenderCounts = bookings.reduce((counts, booking) => {
          const gender = booking.assigned_gender
          if (gender) {
            counts[gender] = (counts[gender] || 0) + 1
          }
          return counts
        }, {})

        setStudentHub(studentHubData || {})
        setSummary({
          maintenanceCount: studentHubData?.maintenance?.length || 0,
          visitorCount: studentHubData?.visitors?.length || 0,
          waitingListCount: studentHubData?.waitingList?.length || 0,
          activeStudents,
          activeAgents,
          communicationsCount: studentHubData?.communications?.length || 0,
          invoiceCount: studentHubData?.invoices?.length || 0,
          nfasStatus: activeStudents > 0 ? 'Approved' : 'Pending review',
          outstandingBalance: `R${(bookings.length * 1200).toLocaleString()}`,
          assignedGenderCounts,
        })
        setProfiles(profiles)
      } catch (error) {
        console.warn('Unable to load admin dashboard summary', error)
      }
    }

    loadSummary()
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <h3 className="text-lg font-semibold text-slate-900">Platform oversight</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Monitor fraud alerts and suspicious listings.</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Review compliance, verification, and policy violations.</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Approve university and property onboarding requests.</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Student Hub activity: {summary.maintenanceCount} maintenance requests, {summary.visitorCount} visitor entries, {summary.waitingListCount} waiting-list records, {summary.communicationsCount} resident communications.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
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
                  <li key={c.id || c.title} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{c.title || c.subject || 'Message'}</p>
                      <p className="text-xs text-slate-500 truncate">{c.message || c.body || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                  <li key={w.id || w.email} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{w.full_name || w.email || 'Applicant'}</p>
                      <p className="text-xs text-slate-500 truncate">{w.note || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-indigo-600" onClick={async () => {
                        const newNote = window.prompt('Edit note', w.note || '')
                        if (newNote === null) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders('admin')
                          await fetch('/api/student-hub', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'waitingList', id: w.id || w.email, entry: { ...w, note: newNote } }) })
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
                          await fetch('/api/student-hub', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'waitingList', id: w.id || w.email }) })
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
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">User activity</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{summary.activeStudents} active students</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{summary.activeAgents} agents and property owners</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{Math.max(1, summary.maintenanceCount + summary.waitingListCount)} pending admin tasks</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">NSFAS status: {summary.nfasStatus} • Outstanding balance {summary.outstandingBalance}</div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          Assigned gender counts: male {summary.assignedGenderCounts?.male || 0}, female {summary.assignedGenderCounts?.female || 0}, other {summary.assignedGenderCounts?.other || 0}
        </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
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
            <p className="text-sm text-slate-500">Resident communications</p>
            <p className="text-xl font-semibold text-slate-900">{summary.communicationsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Invoices</p>
            <p className="text-xl font-semibold text-slate-900">{summary.invoiceCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Fraud risk alerts</p>
            <p className="text-xl font-semibold text-slate-900">4</p>
          </div>
        </div>
      </section>
    </div>
  )
}
