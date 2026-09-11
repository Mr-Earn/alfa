"use client"

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Building2, CalendarDays, Clock3, MapPin, Search, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const defaultForm = {
  title: '',
  date: '',
  time: '',
  category: 'Orientation',
  host: 'Residence Team',
  location: '',
  description: '',
  capacity: 40,
  status: 'Open',
  featured: false,
}

const formatEventDate = (value) => {
  if (!value) return 'TBD'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function UniversityEventsPage() {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [submitting, setSubmitting] = useState(false)

  const categories = useMemo(() => {
    const unique = new Set(events.map((event) => event.category || 'General').filter(Boolean))
    return ['All', ...[...unique]]
  }, [events])

  const eventStats = useMemo(() => {
    const upcoming = events.filter((event) => {
      const eventDate = new Date(event.date || '2099-01-01')
      return !Number.isNaN(eventDate.getTime()) && eventDate.getTime() >= Date.now()
    }).length

    const totalAttendees = events.reduce((sum, event) => sum + Number(event.attendees || event.capacity || 0), 0)
    const featured = events.filter((event) => Boolean(event.featured)).length

    return {
      total: events.length,
      upcoming,
      attendees: totalAttendees,
      featured,
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return [...events]
      .filter((event) => {
        const categoryMatch = categoryFilter === 'All' || (event.category || 'General') === categoryFilter
        const searchMatch = !query || [event.title, event.location, event.host, event.description, event.category]
          .join(' ')
          .toLowerCase()
          .includes(query)

        return categoryMatch && searchMatch
      })
      .sort((a, b) => {
        const aDate = new Date(a.date || '2099-01-01').getTime()
        const bDate = new Date(b.date || '2099-01-01').getTime()
        return aDate - bDate
      })
  }, [categoryFilter, events, searchTerm])

  const loadEvents = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/student-hub', { headers })
      const data = await response.json()
      setEvents(Array.isArray(data?.events) ? data.events : [])
    } catch (error) {
      console.warn('Unable to load university events', error)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const submitEvent = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.date.trim()) return

    try {
      setSubmitting(true)
      const headers = await getAuthenticatedRequestHeaders('university')
      const payload = {
        ...form,
        attendees: Number(form.capacity || 0),
        capacity: Number(form.capacity || 0),
        featured: Boolean(form.featured),
        status: form.status || 'Open',
      }

      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event', entry: payload }),
      })

      if (response.ok) {
        const data = await response.json()
        setEvents(Array.isArray(data?.events) ? data.events : [])
        setForm(defaultForm)
      }
    } catch (error) {
      console.warn('Unable to save university event', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h3 className='text-xl font-semibold text-slate-900'>Events planner</h3>
          <p className='mt-2 text-sm text-slate-600'>Coordinate campus activities, orientation sessions, housing updates, and student engagement moments from one command center.</p>
        </div>
        <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'>
          <Sparkles className='h-4 w-4 text-indigo-600' />
          <span>{eventStats.featured} featured</span>
        </div>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-4'>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Total events</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{eventStats.total}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Upcoming</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{eventStats.upcoming}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Attendee capacity</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{eventStats.attendees}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Featured</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{eventStats.featured}</p>
        </div>
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]'>
        <form onSubmit={submitEvent} className='space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
          <div className='flex items-center justify-between'>
            <h4 className='text-base font-semibold text-slate-900'>Create event</h4>
            <BadgeCheck className='h-4 w-4 text-emerald-600' />
          </div>

          <Input placeholder='Event title' value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />

          <div className='grid gap-3 sm:grid-cols-2'>
            <Input type='date' value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <Input type='time' value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <select className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm' value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option>Orientation</option>
              <option>Meeting</option>
              <option>Wellness</option>
              <option>Academic</option>
              <option>Housing</option>
              <option>Social</option>
            </select>
            <select className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm' value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option>Open</option>
              <option>Registration closing</option>
              <option>Full</option>
              <option>Completed</option>
            </select>
          </div>

          <Input placeholder='Host / organizer' value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} />
          <Input placeholder='Location' value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <textarea
            rows='4'
            className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400'
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder='Short description for students and guests'
          />

          <div className='grid gap-3 sm:grid-cols-2'>
            <Input type='number' placeholder='Capacity' value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) || 0 })} />
            <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'>
              Featured
              <input type='checkbox' checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} className='h-4 w-4' />
            </label>
          </div>

          <Button type='submit' className='w-full' disabled={submitting}>
            {submitting ? 'Publishing event...' : 'Publish event'}
          </Button>
        </form>

        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='relative w-full md:max-w-xs'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='Search events'
                className='w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400'
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className='rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className='mt-4 space-y-3'>
            {filteredEvents.length ? (
              filteredEvents.map((item, index) => (
                <div key={`${item.title}-${index}`} className='rounded-2xl border border-slate-200 bg-white p-4'>
                  <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-lg font-semibold text-slate-900'>{item.title}</p>
                        {item.featured && <span className='rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700'>Featured</span>}
                      </div>
                      <p className='mt-1 text-sm text-slate-500'>{item.category || 'General'} • {item.host || 'Residence Team'}</p>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'Full' ? 'bg-rose-100 text-rose-700' : item.status === 'Completed' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.status || 'Open'}
                    </span>
                  </div>

                  <p className='mt-3 text-sm leading-6 text-slate-600'>{item.description || 'No description added yet.'}</p>

                  <div className='mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2'>
                    <div className='flex items-center gap-2'>
                      <CalendarDays className='h-4 w-4 text-slate-400' />
                      <span>{formatEventDate(item.date)}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Clock3 className='h-4 w-4 text-slate-400' />
                      <span>{item.time || 'Time TBD'}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <MapPin className='h-4 w-4 text-slate-400' />
                      <span>{item.location || 'Location TBD'}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Users className='h-4 w-4 text-slate-400' />
                      <span>{Number(item.attendees || item.capacity || 0)} RSVP</span>
                    </div>
                  </div>

                  <div className='mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2'>
                    <div className='flex items-center gap-2 text-sm text-slate-600'>
                      <Building2 className='h-4 w-4 text-slate-400' />
                      <span>{item.location || 'On campus'}</span>
                    </div>
                    <div className='text-sm font-medium text-slate-700'>Capacity: {Number(item.capacity || item.attendees || 0)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className='rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500'>No matching events. Try another search or create a new event.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
