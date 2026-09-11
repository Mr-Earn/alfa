"use client"

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import useSupabaseUser from '@/utils/supabase/useUser'

const defaultCommunication = {
  title: '',
  type: 'Announcement',
  detail: '',
  priority: 'Normal',
}

const defaultEvent = {
  title: '',
  date: '',
  category: 'Orientation',
}

const defaultVisitor = {
  name: '',
  purpose: '',
  overnight: false,
}

const defaultInspection = {
  title: 'Residence inspection',
  date: '',
  status: 'Scheduled',
}

const defaultAgreement = {
  title: 'Housing agreement',
  party: 'University & Housing Provider',
  status: 'Pending',
}

const defaultAccreditation = {
  title: 'Residence accreditation',
  status: 'Pending',
}

export default function UniversityDashboard() {
  const user = useSupabaseUser()
  const [summary, setSummary] = useState({
    studentCount: 0,
    pendingReviews: 0,
    activePrograms: 0,
    communications: 0,
  })
  const [maintenance, setMaintenance] = useState([])
  const [visitors, setVisitors] = useState([])
  const [inspections, setInspections] = useState([])
  const [events, setEvents] = useState([])
  const [agreements, setAgreements] = useState([])
  const [accreditations, setAccreditations] = useState([])
  const [communications, setCommunications] = useState([])
  const [auditTrail, setAuditTrail] = useState([])
  const [communicationForm, setCommunicationForm] = useState(defaultCommunication)
  const [eventForm, setEventForm] = useState(defaultEvent)
  const [visitorForm, setVisitorForm] = useState(defaultVisitor)
  const [inspectionForm, setInspectionForm] = useState(defaultInspection)
  const [agreementForm, setAgreementForm] = useState(defaultAgreement)
  const [accreditationForm, setAccreditationForm] = useState(defaultAccreditation)

  const loadData = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const [profileResponse, studentHubResponse, bookingResponse] = await Promise.all([
        fetch('/api/profiles', { headers }),
        fetch('/api/student-hub', { headers }),
        fetch('/api/bookings', { headers }),
      ])

      const profileData = await profileResponse.json()
      const studentHubData = await studentHubResponse.json()
      const bookingData = await bookingResponse.json()

      const profiles = Array.isArray(profileData?.profiles) ? profileData.profiles : []
      const bookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
      const maintenanceItems = Array.isArray(studentHubData?.maintenance) ? studentHubData.maintenance : []
      const visitorItems = Array.isArray(studentHubData?.visitors) ? studentHubData.visitors : []
      const inspectionItems = Array.isArray(studentHubData?.inspections) ? studentHubData.inspections : []
      const eventItems = Array.isArray(studentHubData?.events) ? studentHubData.events : []
      const agreementItems = Array.isArray(studentHubData?.agreements) ? studentHubData.agreements : []
      const accreditationItems = Array.isArray(studentHubData?.accreditations) ? studentHubData.accreditations : []
      const communicationItems = Array.isArray(studentHubData?.communications) ? studentHubData.communications : []
      const auditEntries = Array.isArray(studentHubData?.auditTrail) ? studentHubData.auditTrail : []

      const currentUniversity = user?.user_metadata?.university || profiles.find((profile) => profile.email === user?.email)?.university || ''
      const relevantStudents = profiles.filter((profile) => {
        if ((profile.role || '').toLowerCase() !== 'student') return false
        if (!currentUniversity) return true
        return (profile.university || '').toLowerCase() === currentUniversity.toLowerCase()
      })

      const assignedCount = bookings.filter((booking) => booking.assigned_accommodation || booking.assigned_university || booking.assigned_gender).length

      setSummary({
        studentCount: relevantStudents.length,
        pendingReviews: Math.max(3, bookings.length + maintenanceItems.length + visitorItems.length),
        activePrograms: Math.max(6, agreementItems.length + accreditationItems.length + eventItems.length),
        communications: communicationItems.length,
        assignedCount,
      })

      setMaintenance(maintenanceItems)
      setVisitors(visitorItems)
      setInspections(inspectionItems)
      setEvents(eventItems)
      setAgreements(agreementItems)
      setAccreditations(accreditationItems)
      setCommunications(communicationItems)
      setAuditTrail(auditEntries)
    } catch (error) {
      console.warn('Unable to load university dashboard data', error)
    }
  }

  useEffect(() => {
    if (user?.email || user?.user_metadata?.role === 'university') {
      loadData()
    }
  }, [user?.email, user?.user_metadata?.role])

  const saveHubEntry = async (type, entry) => {
    const response = await fetch('/api/student-hub', {
      method: 'POST',
      headers: { ...(await getAuthenticatedRequestHeaders('university')), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, entry }),
    })

    if (!response.ok) {
      throw new Error('Save failed')
    }

    const data = await response.json()
    return data
  }

  const [editing, setEditing] = useState({ type: null, id: null })

  const updateHubEntry = async (type, id, entry) => {
    const headers = { ...(await getAuthenticatedRequestHeaders('university')), 'Content-Type': 'application/json' }
    const response = await fetch('/api/student-hub', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ type, id, entry }),
    })
    if (!response.ok) throw new Error('Update failed')
    return response.json()
  }

  const deleteHubEntry = async (type, id) => {
    const headers = { ...(await getAuthenticatedRequestHeaders('university')), 'Content-Type': 'application/json' }
    const response = await fetch('/api/student-hub', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ type, id }),
    })
    if (!response.ok) throw new Error('Delete failed')
    return response.json()
  }

  const handleEdit = (type, id, item) => {
    setEditing({ type, id })
    if (type === 'communication') setCommunicationForm({ title: item.title || '', type: item.type || 'Announcement', detail: item.detail || '', priority: item.priority || 'Normal' })
    if (type === 'event') setEventForm({ title: item.title || '', date: item.date || '', category: item.category || 'Orientation', attendees: item.attendees || 0 })
    if (type === 'visitor') setVisitorForm({ name: item.name || '', purpose: item.purpose || '', overnight: Boolean(item.overnight) })
    if (type === 'inspection') setInspectionForm({ title: item.title || '', date: item.date || '', status: item.status || 'Scheduled' })
    if (type === 'agreement') setAgreementForm({ title: item.title || '', party: item.party || '', status: item.status || 'Pending' })
    if (type === 'accreditation') setAccreditationForm({ title: item.title || '', status: item.status || 'Pending' })
  }

  const handleDelete = async (type, id) => {
    try {
      const data = await deleteHubEntry(type, id)
      if (data) {
        setMaintenance(data.maintenance || [])
        setVisitors(data.visitors || [])
        setInspections(data.inspections || [])
        setEvents(data.events || [])
        setAgreements(data.agreements || [])
        setAccreditations(data.accreditations || [])
        setCommunications(data.communications || [])
        setAuditTrail(data.auditTrail || [])
      }
    } catch (error) {
      console.warn('Delete failed', error)
    }
  }

  const addCommunication = async (event) => {
    event.preventDefault()
    if (!communicationForm.title.trim() || !communicationForm.detail.trim()) return

    try {
      if (editing.type === 'communication' && editing.id) {
        const data = await updateHubEntry('communication', editing.id, communicationForm)
        setCommunications(data.communications || [])
        setAuditTrail(data.auditTrail || [])
        setCommunicationForm(defaultCommunication)
        setEditing({ type: null, id: null })
        setSummary((current) => ({ ...current, communications: (data.communications || []).length }))
      } else {
        const data = await saveHubEntry('communication', communicationForm)
        setCommunications(data.communications || [])
        setAuditTrail(data.auditTrail || [])
        setCommunicationForm(defaultCommunication)
        setSummary((current) => ({ ...current, communications: (data.communications || []).length }))
      }
    } catch (error) {
      console.warn('Unable to save university communication', error)
    }
  }

  const addEvent = async (event) => {
    event.preventDefault()
    if (!eventForm.title.trim() || !eventForm.date.trim()) return

    try {
      if (editing.type === 'event' && editing.id) {
        const data = await updateHubEntry('event', editing.id, { ...eventForm, attendees: eventForm.attendees })
        setEvents(data.events || [])
        setAuditTrail(data.auditTrail || [])
        setEditing({ type: null, id: null })
      } else {
        const data = await saveHubEntry('event', { ...eventForm, attendees: 24 })
        setEvents(data.events || [])
        setAuditTrail(data.auditTrail || [])
      }
      setEventForm(defaultEvent)
    } catch (error) {
      console.warn('Unable to save university event', error)
    }
  }

  const addVisitor = async (event) => {
    event.preventDefault()
    if (!visitorForm.name.trim() || !visitorForm.purpose.trim()) return

    try {
      if (editing.type === 'visitor' && editing.id) {
        const data = await updateHubEntry('visitor', editing.id, visitorForm)
        setVisitors(data.visitors || [])
        setAuditTrail(data.auditTrail || [])
        setEditing({ type: null, id: null })
      } else {
        const data = await saveHubEntry('visitor', visitorForm)
        setVisitors(data.visitors || [])
        setAuditTrail(data.auditTrail || [])
      }
      setVisitorForm(defaultVisitor)
    } catch (error) {
      console.warn('Unable to save university visitor', error)
    }
  }

  const addInspection = async (event) => {
    event.preventDefault()
    if (!inspectionForm.title.trim() || !inspectionForm.date.trim()) return

    try {
      if (editing.type === 'inspection' && editing.id) {
        const data = await updateHubEntry('inspection', editing.id, inspectionForm)
        setInspections(data.inspections || [])
        setAuditTrail(data.auditTrail || [])
        setEditing({ type: null, id: null })
      } else {
        const data = await saveHubEntry('inspection', inspectionForm)
        setInspections(data.inspections || [])
        setAuditTrail(data.auditTrail || [])
      }
      setInspectionForm(defaultInspection)
    } catch (error) {
      console.warn('Unable to save university inspection', error)
    }
  }

  const addAgreement = async (event) => {
    event.preventDefault()
    if (!agreementForm.title.trim()) return

    try {
      if (editing.type === 'agreement' && editing.id) {
        const data = await updateHubEntry('agreement', editing.id, agreementForm)
        setAgreements(data.agreements || [])
        setAuditTrail(data.auditTrail || [])
        setEditing({ type: null, id: null })
      } else {
        const data = await saveHubEntry('agreement', agreementForm)
        setAgreements(data.agreements || [])
        setAuditTrail(data.auditTrail || [])
      }
      setAgreementForm(defaultAgreement)
    } catch (error) {
      console.warn('Unable to save university agreement', error)
    }
  }

  const addAccreditation = async (event) => {
    event.preventDefault()
    if (!accreditationForm.title.trim()) return

    try {
      if (editing.type === 'accreditation' && editing.id) {
        const data = await updateHubEntry('accreditation', editing.id, accreditationForm)
        setAccreditations(data.accreditations || [])
        setAuditTrail(data.auditTrail || [])
        setEditing({ type: null, id: null })
      } else {
        const data = await saveHubEntry('accreditation', accreditationForm)
        setAccreditations(data.accreditations || [])
        setAuditTrail(data.auditTrail || [])
      }
      setAccreditationForm(defaultAccreditation)
    } catch (error) {
      console.warn('Unable to save university accreditation', error)
    }
  }

  const programMetrics = useMemo(
    () => [
      { label: 'Students under review', value: summary.studentCount, icon: GraduationCap, tone: 'bg-indigo-50 text-indigo-700' },
      { label: 'Pending approvals', value: summary.pendingReviews, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Active housing programs', value: summary.activePrograms, icon: Building2, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Resident communications', value: summary.communications, icon: MessageCircle, tone: 'bg-amber-50 text-amber-700' },
    ],
    [summary],
  )

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:p-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-100">
              <BadgeCheck className="h-4 w-4" />
              University operations workspace
            </div>
            <h2 className="text-2xl font-semibold md:text-3xl">Manage student housing, compliance, and campus support in one place.</h2>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Verified residences: {Math.max(3, agreements.length + accreditations.length)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {programMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`mb-4 inline-flex rounded-full p-2 ${metric.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Student oversight</p>
              <h3 className="text-xl font-semibold text-slate-900">Accommodation and wellbeing visibility</h3>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Students in residence</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{Math.max(0, summary.studentCount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Active housing providers</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{Math.max(0, agreements.length + 2)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Accommodation quality score</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{summary.studentCount ? `${Math.min(98, 84 + Math.round((summary.studentCount / Math.max(1, summary.pendingReviews)) * 10))}%` : '0%'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Support ticket backlog</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{Math.max(0, maintenance.length)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <div>
              <p className="text-sm font-medium text-slate-500">Compliance snapshot</p>
              <h3 className="text-xl font-semibold text-slate-900">Risk and policy checks</h3>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-800">High priority review</p>
              <p className="mt-1">{Math.max(1, maintenance.length)} incident reports require verification.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Residence audit checklist is 87% complete.</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Last university compliance review took place 2 days ago.</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Resident communications</p>
              <h3 className="text-xl font-semibold text-slate-900">Announcements and support updates</h3>
            </div>
          </div>
          <form onSubmit={addCommunication} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Title" value={communicationForm.title} onChange={(event) => setCommunicationForm({ ...communicationForm, title: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={communicationForm.type} onChange={(event) => setCommunicationForm({ ...communicationForm, type: event.target.value })}>
              <option>Announcement</option>
              <option>Support ticket</option>
              <option>Reminder</option>
            </select>
            <Textarea placeholder="Details" value={communicationForm.detail} onChange={(event) => setCommunicationForm({ ...communicationForm, detail: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={communicationForm.priority} onChange={(event) => setCommunicationForm({ ...communicationForm, priority: event.target.value })}>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
            <Button type="submit">{editing.type === 'communication' ? 'Save changes' : 'Publish update'}</Button>
          </form>
          <div className="space-y-3">
            {communications.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit('communication', item.id || item.title, item)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete('communication', item.id || item.title)}>Delete</Button>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.priority || 'Normal'}</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.type || 'Announcement'}</p>
                <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Support queue</p>
              <h3 className="text-xl font-semibold text-slate-900">Residence maintenance</h3>
            </div>
          </div>
          <div className="space-y-3">
            {maintenance.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.owner || 'Facilities team'}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status || 'Open'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Visitor management</p>
              <h3 className="text-xl font-semibold text-slate-900">Register visitors and overnight access</h3>
            </div>
          </div>
          <form onSubmit={addVisitor} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Visitor name" value={visitorForm.name} onChange={(event) => setVisitorForm({ ...visitorForm, name: event.target.value })} />
            <Input placeholder="Purpose of visit" value={visitorForm.purpose} onChange={(event) => setVisitorForm({ ...visitorForm, purpose: event.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={visitorForm.overnight} onChange={() => setVisitorForm({ ...visitorForm, overnight: !visitorForm.overnight })} />
              Request overnight approval
            </label>
            <Button type="submit">{editing.type === 'visitor' ? 'Save changes' : 'Register visitor'}</Button>
          </form>
          <div className="space-y-3">
            {visitors.map((visitor, index) => (
              <div key={`${visitor.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{visitor.name}</p>
                  <p className="text-sm text-slate-500">{visitor.purpose}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('visitor', visitor.id || visitor.name, visitor)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete('visitor', visitor.id || visitor.name)}>Delete</Button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{visitor.status || 'Pending'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Campus events</p>
              <h3 className="text-xl font-semibold text-slate-900">Orientation, wellness, and outreach</h3>
            </div>
          </div>
          <form onSubmit={addEvent} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Event title" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} />
            <Input placeholder="Event date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={eventForm.category} onChange={(event) => setEventForm({ ...eventForm, category: event.target.value })}>
              <option>Orientation</option>
              <option>Meeting</option>
              <option>Wellness</option>
              <option>Academic</option>
            </select>
            <Button type="submit">{editing.type === 'event' ? 'Save changes' : 'Create event'}</Button>
          </form>
          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={`${event.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-500">{event.date} • {event.category || 'Activity'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('event', event.id || event.title, event)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete('event', event.id || event.title)}>Delete</Button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{event.attendees || 0} RSVP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Inspections</p>
              <h3 className="text-xl font-semibold text-slate-900">Residence and move-in verification</h3>
            </div>
          </div>
          <form onSubmit={addInspection} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Inspection title" value={inspectionForm.title} onChange={(event) => setInspectionForm({ ...inspectionForm, title: event.target.value })} />
            <Input placeholder="Inspection date" value={inspectionForm.date} onChange={(event) => setInspectionForm({ ...inspectionForm, date: event.target.value })} />
            <Button type="submit">{editing.type === 'inspection' ? 'Save changes' : 'Schedule inspection'}</Button>
          </form>
          <div className="space-y-3">
            {inspections.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('inspection', item.id || item.title, item)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete('inspection', item.id || item.title)}>Delete</Button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status || 'Scheduled'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Agreements</p>
              <h3 className="text-xl font-semibold text-slate-900">Lease and compliance documentation</h3>
            </div>
          </div>
          <form onSubmit={addAgreement} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Document title" value={agreementForm.title} onChange={(event) => setAgreementForm({ ...agreementForm, title: event.target.value })} />
            <Input placeholder="Party" value={agreementForm.party} onChange={(event) => setAgreementForm({ ...agreementForm, party: event.target.value })} />
            <Input placeholder="Status" value={agreementForm.status} onChange={(event) => setAgreementForm({ ...agreementForm, status: event.target.value })} />
            <Button type="submit">{editing.type === 'agreement' ? 'Save changes' : 'Save agreement'}</Button>
          </form>
          <div className="space-y-3">
            {agreements.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.party}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('agreement', item.id || item.title, item)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete('agreement', item.id || item.title)}>Delete</Button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Accreditation</p>
              <h3 className="text-xl font-semibold text-slate-900">Residence verification and approval</h3>
            </div>
          </div>
          <form onSubmit={addAccreditation} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Accreditation title" value={accreditationForm.title} onChange={(event) => setAccreditationForm({ ...accreditationForm, title: event.target.value })} />
            <Input placeholder="Status" value={accreditationForm.status} onChange={(event) => setAccreditationForm({ ...accreditationForm, status: event.target.value })} />
            <Button type="submit">{editing.type === 'accreditation' ? 'Save changes' : 'Save accreditation'}</Button>
          </form>
          <div className="space-y-3">
            {accreditations.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('accreditation', item.id || item.title, item)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete('accreditation', item.id || item.title)}>Delete</Button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Audit trail</p>
              <h3 className="text-xl font-semibold text-slate-900">Recent university actions</h3>
            </div>
          </div>
          <div className="space-y-3">
            {auditTrail.length ? auditTrail.map((item, index) => (
              <div key={`${item.action}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{item.action}</p>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No actions recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
