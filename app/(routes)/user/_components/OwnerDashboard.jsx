"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import useSupabaseUser from '@/utils/supabase/useUser'
import { supabase } from '@/utils/supabase/client'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { DollarSign, Home, KeyRound, TrendingUp, Users, Wrench, MessageSquare, FileText, UploadCloud, CheckCircle } from 'lucide-react'

export default function OwnerDashboard({ section = 'overview' }) {
  const user = useSupabaseUser()
  const [summary, setSummary] = useState({
    occupancy: 82,
    revenue: 0,
    activeTenants: 0,
    maintenanceOpen: 0,
    pendingApprovals: 0,
    bookings: [],
    maintenance: [],
    parentPortal: [],
    invoices: [],
  })
  const [leaseRequests, setLeaseRequests] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [selectedLeaseFile, setSelectedLeaseFile] = useState(null)
  const [chatRecipient, setChatRecipient] = useState('')
  const [chatText, setChatText] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [assignments, setAssignments] = useState({})
  const [assignLoading, setAssignLoading] = useState(false)

  const getStudentUniversity = (booking) => booking?.assigned_university || booking?.student_profile?.university || booking?.university || ''

  const showOverview = section === 'overview'
  const showLeaseRequests = section === 'lease-requests'
  const showChat = section === 'chat'

  useEffect(() => {
    if (!user?.email) return

    const loadDashboardData = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')

        const [bookingResponse, studentHubResponse, profileResponse, leaseResponse, chatResponse] = await Promise.all([
          fetch('/api/bookings', { headers }),
          fetch('/api/student-hub', { headers }),
          fetch('/api/profiles', { headers }),
          fetch('/api/lease-requests', { headers }),
          fetch('/api/messages', { headers }),
        ])

        const bookingData = await bookingResponse.json()
        const studentHubData = await studentHubResponse.json()
        const profileData = await profileResponse.json()
        const leaseData = await leaseResponse.json()
        const chatData = await chatResponse.json()

        const bookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const maintenance = Array.isArray(studentHubData?.maintenance) ? studentHubData.maintenance : []
        const profiles = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const studentCount = profiles.filter((profile) => profile.role === 'student').length

        const ownerBookingCount = bookings.length

        setSummary({
          occupancy: Math.min(98, 74 + ownerBookingCount * 4),
          revenue: ownerBookingCount * 6500,
          activeTenants: Math.max(ownerBookingCount, studentCount),
          maintenanceOpen: maintenance.length,
          pendingApprovals: Math.max(1, ownerBookingCount + (studentHubData?.waitingList?.length || 0)),
          bookings,
          maintenance,
          parentPortal: Array.isArray(studentHubData?.parentPortal) ? studentHubData.parentPortal : [],
          invoices: Array.isArray(studentHubData?.invoices) ? studentHubData.invoices : [],
        })

        setLeaseRequests(Array.isArray(leaseData?.requests) ? leaseData.requests : [])
        setChatMessages(Array.isArray(chatData?.messages) ? chatData.messages : [])
      } catch (error) {
        console.error('Failed to load owner dashboard data', error)
      }
    }

    loadDashboardData()
  }, [user?.email])

  // Prefill chat recipient from query param (e.g. ?recipient=student@example.com)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const recipient = params.get('recipient')
      if (recipient) setChatRecipient(recipient)
    } catch (e) {
      // ignore
    }
  }, [])

  const selectedRequest = leaseRequests.find((request) => String(request.id) === String(selectedRequestId))

  const handleUploadLease = async () => {
    if (!selectedRequestId || !selectedLeaseFile) return
    setUploadLoading(true)

    const fileName = `lease_${Date.now()}_${selectedLeaseFile.name}`
    const { data: storageData, error: storageError } = await supabase.storage
      .from('lease_documents')
      .upload(fileName, selectedLeaseFile, { cacheControl: '3600', upsert: false })

    if (storageError) {
      console.error('Lease upload failed', storageError)
      setUploadLoading(false)
      return
    }

    const { data: publicUrlData } = await supabase.storage.from('lease_documents').getPublicUrl(fileName)
    const leaseUrl = publicUrlData?.publicUrl || ''
    const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')

    const response = await fetch('/api/lease-requests', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedRequestId, lease_url: leaseUrl, status: 'lease_uploaded' }),
    })

    const json = await response.json()
    if (!response.ok) {
      console.error('Lease request update failed', json)
    }

    setUploadLoading(false)
    const refreshResponse = await fetch('/api/lease-requests', { headers })
    const refreshData = await refreshResponse.json()
    setLeaseRequests(refreshData.requests || [])
  }

  const handleRequestDecision = async (requestId, status) => {
    const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
    const response = await fetch('/api/lease-requests', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, status }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast(data.error || 'Unable to update application')
      return
    }

    const refreshed = await fetch('/api/lease-requests', { headers })
    const data = await refreshed.json()
    setLeaseRequests(data.requests || [])
    toast(status === 'approved' ? 'Application approved' : 'Application rejected')
  }

  const handleSendChat = async () => {
    if (!chatRecipient || !chatText) return
    setChatLoading(true)

    const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: chatRecipient, body: chatText }),
    })

    const json = await response.json()
    if (!response.ok) {
      console.error('Chat send failed', json)
    } else {
      setChatText('')
      const refreshed = await fetch('/api/messages', { headers })
      const data = await refreshed.json()
      setChatMessages(data.messages || [])
    }

    setChatLoading(false)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={showOverview ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Property owner operations</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Active tenants</p>
            <p className="text-xl font-semibold text-slate-900">{summary.activeTenants}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Pending approvals</p>
            <p className="text-xl font-semibold text-slate-900">{summary.pendingApprovals}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Monthly rent</p>
            <p className="text-xl font-semibold text-slate-900">R{summary.revenue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Maintenance open</p>
            <p className="text-xl font-semibold text-slate-900">{summary.maintenanceOpen}</p>
          </div>
        </div>
      </section>

      <section className={showOverview ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Occupancy & access</h3>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span>Occupancy rate</span>
              <span className="font-semibold text-slate-900">{summary.occupancy}%</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Digital key handover and check-in status are ready for new arrivals.</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Visitor approval workflow is live and linked to the Student Hub.</div>
        </div>
      </section>

      <section className={showOverview ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">Parent & sponsor updates</span>
            </div>
            {summary.parentPortal.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {summary.parentPortal.slice(0, 3).map((item, index) => (
                      <li key={`${item.title}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                        <span>{item.title} • {item.amount} • {item.status}</span>
                        <span className="flex items-center gap-2">
                          <button className="text-sm text-indigo-600" onClick={async () => {
                            const newStatus = window.prompt('Update status', item.status || 'Sent')
                            if (!newStatus) return
                            try {
                              const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                              await fetch('/api/student-hub', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'parentPortal', id: item.id || item.title, entry: { ...item, status: newStatus } }) })
                              const refreshed = await fetch('/api/student-hub', { headers: await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner') })
                              const data = await refreshed.json()
                              setSummary((s) => ({ ...s, parentPortal: Array.isArray(data.parentPortal) ? data.parentPortal : s.parentPortal }))
                            } catch (e) { console.error(e) }
                          }}>Edit</button>
                          <button className="text-sm text-rose-600" onClick={async () => {
                            if (!window.confirm('Delete this entry?')) return
                            try {
                              const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                              await fetch('/api/student-hub', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'parentPortal', id: item.id || item.title }) })
                              const refreshed = await fetch('/api/student-hub', { headers: await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner') })
                              const data = await refreshed.json()
                              setSummary((s) => ({ ...s, parentPortal: Array.isArray(data.parentPortal) ? data.parentPortal : s.parentPortal }))
                            } catch (e) { console.error(e) }
                          }}>Delete</button>
                        </span>
                      </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No parent updates yet.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">Outstanding invoices</span>
            </div>
            {summary.invoices.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {summary.invoices.slice(0, 3).map((item, index) => (
                  <li key={`${item.title}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                    <span>{item.title} • {item.amount} • {item.status}</span>
                    <span className="flex items-center gap-2">
                      <button className="text-sm text-indigo-600" onClick={async () => {
                        const newStatus = window.prompt('Update invoice status', item.status || 'Pending')
                        if (!newStatus) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                          await fetch('/api/student-hub', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'invoice', id: item.id || item.title, entry: { ...item, status: newStatus } }) })
                          const refreshed = await fetch('/api/student-hub', { headers: await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner') })
                          const data = await refreshed.json()
                          setSummary((s) => ({ ...s, invoices: Array.isArray(data.invoices) ? data.invoices : s.invoices }))
                        } catch (e) { console.error(e) }
                      }}>Edit</button>
                      <button className="text-sm text-rose-600" onClick={async () => {
                        if (!window.confirm('Delete this invoice?')) return
                        try {
                          const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                          await fetch('/api/student-hub', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'invoice', id: item.id || item.title }) })
                          const refreshed = await fetch('/api/student-hub', { headers: await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner') })
                          const data = await refreshed.json()
                          setSummary((s) => ({ ...s, invoices: Array.isArray(data.invoices) ? data.invoices : s.invoices }))
                        } catch (e) { console.error(e) }
                      }}>Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No invoice activity yet.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <Users className="h-4 w-4" />
              <span className="font-semibold">Latest bookings</span>
            </div>
            {summary.bookings.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {summary.bookings.slice(0, 3).map((booking, index) => (
                  <li key={`${booking.listing_id}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Listing #{booking.listing_id}</p>
                        <p className="font-semibold text-slate-900">{(booking.student_profile && (booking.student_profile.full_name || booking.student_profile.email)) || booking.contact_email || 'Pending contact'}</p>
                        {booking.student_profile?.gender && <p className="text-xs text-slate-500">Gender: {booking.student_profile.gender}</p>}
                        <p className="text-xs text-slate-500">University: {getStudentUniversity(booking) || 'Not linked to a university'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/user/messages?recipient=${encodeURIComponent(booking.contact_email || (booking.student_profile && booking.student_profile.email) || '')}`} className="text-sm text-indigo-600">Message student</Link>
                        {booking.student_profile?.id ? (
                          <a href={`/user/owner/student-profile/${booking.student_profile.id}`} className="text-sm text-slate-700 hover:text-indigo-600">View profile</a>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <select className="text-sm border rounded px-2 py-1" value={assignments[booking.id] ?? (booking.assigned_accommodation || booking.assigned_university || booking.assigned_gender || '')} onChange={(e) => setAssignments((s) => ({ ...s, [booking.id]: e.target.value }))}>
                            <option value=''>No accommodation assignment</option>
                            <option value='university-approved'>University approved</option>
                            <option value='awaiting-review'>Awaiting review</option>
                            <option value='assigned'>Assigned to university accommodation</option>
                          </select>
                          <button disabled={assignLoading} onClick={async () => {
                            const value = assignments[booking.id] ?? (booking.assigned_accommodation || booking.assigned_university || booking.assigned_gender || '')
                            const studentUniversity = getStudentUniversity(booking)
                            setAssignLoading(true)
                            try {
                              const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                              const payload = {
                                id: booking.id,
                                assigned_gender: value === 'university-approved' || value === 'awaiting-review' || value === 'assigned' ? 'other' : booking.assigned_gender || null,
                                assigned_accommodation: value === 'assigned' ? 'university-accommodation' : value || null,
                                assigned_university: studentUniversity || 'University-linked accommodation',
                              }
                              const res = await fetch('/api/bookings', {
                                method: 'PUT',
                                headers: { ...headers, 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                              })
                              const json = await res.json()
                              if (res.ok) {
                                setSummary((s) => ({
                                  ...s,
                                  bookings: s.bookings.map((b) =>
                                    String(b.id) === String(booking.id)
                                      ? {
                                          ...b,
                                          assigned_gender: payload.assigned_gender,
                                          assigned_accommodation: payload.assigned_accommodation,
                                          assigned_university: payload.assigned_university,
                                        }
                                      : b
                                  ),
                                }))
                                toast.success(value ? 'University accommodation assignment saved' : 'Assignment cleared')
                              } else {
                                console.error('Assign update failed', json)
                                toast.error(json.error || 'Failed to update assignment')
                              }
                            } catch (e) {
                              console.error(e)
                              toast.error('Unable to save assignment')
                            }
                            setAssignLoading(false)
                          }} className="text-sm bg-slate-100 px-2 py-1 rounded">Save</button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No booking activity yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <Wrench className="h-4 w-4" />
              <span className="font-semibold">Open maintenance</span>
            </div>
            {summary.maintenance.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {summary.maintenance.slice(0, 3).map((item, index) => (
                  <li key={`${item.title}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    {item.title} • {item.status || 'Open'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No maintenance issues reported.</p>
            )}
          </div>
        </div>
      </section>

      <section id="lease-requests" className={showLeaseRequests ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-900">Lease requests</h3>
        </div>
        {leaseRequests.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {leaseRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">Student</p>
                    <p className="font-semibold text-slate-900">{request.student_email}</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">{request.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Listing: {request.listing_title || `#${request.listing_id}`}</p>
                {request.note && <p className="mt-2 text-sm text-slate-600">Note: {request.note}</p>}
                {['requested', 'documents_uploaded'].includes(request.status) && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleRequestDecision(request.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequestDecision(request.id, 'rejected')}>Reject</Button>
                  </div>
                )}
                {request.application_document_url && (
                  <a href={request.application_document_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4" /> View student documents
                  </a>
                )}
                {request.lease_url && (
                  <a href={request.lease_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600">
                    <CheckCircle className="h-4 w-4" /> View lease document
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No lease requests have arrived yet.</p>
        )}
      </section>

      <section id="owner-chat" className={showChat ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-900">Owner chat</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-sm font-medium text-slate-700">Chat with student</label>
            <Input
              placeholder="Student email"
              value={chatRecipient}
              onChange={(event) => setChatRecipient(event.target.value)}
            />
            <Textarea
              placeholder="Write a message to a student or applicant"
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              className="h-32"
            />
            <Button onClick={handleSendChat} disabled={chatLoading || !chatRecipient || !chatText}>
              {chatLoading ? 'Sending...' : 'Send message'}
            </Button>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Recent chat</p>
            <div className="space-y-2 overflow-auto max-h-80">
              {chatMessages.length > 0 ? (
                chatMessages.slice().reverse().map((message) => (
                  <div key={message.id || `${message.created_at}-${message.sender || message.sender_email}`} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">{message.sender || message.sender_email} → {message.recipient || message.receiver_email}</p>
                    <p className="mt-1 text-sm text-slate-700">{message.body || message.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No messages yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={showLeaseRequests ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2' : 'hidden'}>
        <div className="mb-4 flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-900">Upload lease agreement</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-sm font-medium text-slate-700">Select lease request</label>
            <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lease request" />
              </SelectTrigger>
              <SelectContent>
                {leaseRequests.map((request) => (
                  <SelectItem key={request.id} value={String(request.id)}>
                    {request.student_email} • {request.listing_title || `#${request.listing_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="block text-sm font-medium text-slate-700">Lease file</label>
            <input type="file" accept="application/pdf,image/*" onChange={(event) => setSelectedLeaseFile(event.target.files?.[0] || null)} className="block w-full text-sm" />
            <Button onClick={handleUploadLease} disabled={uploadLoading || !selectedRequestId || !selectedLeaseFile}>
              {uploadLoading ? 'Uploading...' : 'Upload lease'}
            </Button>
            {selectedRequest && selectedRequest.lease_url && (
              <a href={selectedRequest.lease_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">
                Current lease document
              </a>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Selected request</p>
            {selectedRequest ? (
              <div className="rounded-lg bg-white p-3 text-sm text-slate-600">
                <p><strong>Student:</strong> {selectedRequest.student_email}</p>
                <p><strong>Listing:</strong> {selectedRequest.listing_title || `#${selectedRequest.listing_id}`}</p>
                <p><strong>Status:</strong> {selectedRequest.status}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a lease request to upload a document to it.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
