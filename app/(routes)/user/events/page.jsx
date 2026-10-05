"use client"

import React, { useEffect, useState } from 'react'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { Button } from '@/components/ui/button'

export default function UserEventsPage() {
  const user = useSupabaseUser()
  const role = user?.user_metadata?.role ?? 'student'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const headers = await getAuthenticatedRequestHeaders(role)
        const res = await fetch('/api/student-hub', { headers })
        const data = await res.json()
        setEvents(Array.isArray(data?.events) ? data.events : [])
      } catch (err) {
        console.warn('Failed to load events', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  if (role !== 'student') {
    return (
      <div className='p-6'>
        <h3 className='text-lg font-semibold'>Events</h3>
        <p className='mt-2 text-sm text-slate-600'>Events are visible to signed-in students only.</p>
      </div>
    )
  }

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-semibold'>Campus events</h3>
          <p className='mt-2 text-sm text-slate-500'>Events posted by universities and residence staff.</p>
        </div>
        <div>
          <Button variant='outline' onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>

      <div className='mt-6 space-y-3'>
        {loading ? (
          <div className='text-sm text-slate-500'>Loading events...</div>
        ) : events.length ? (
          events.map((ev, idx) => (
            <div key={`${ev.title}-${idx}`} className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4'>
              <div>
                <p className='font-medium text-slate-900'>{ev.title}</p>
                <p className='mt-1 text-sm text-slate-500'>{ev.date} • {ev.category || 'Activity'}</p>
              </div>
              <div className='flex items-center gap-3'>
                <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700'>{ev.attendees || 0} RSVP</span>
                <Button size='sm' variant='outline' onClick={async () => {
                  try {
                    const headers = await getAuthenticatedRequestHeaders(role)
                    const response = await fetch('/api/student-hub', {
                      method: 'POST',
                      headers: { ...(headers), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'attendance', entry: { eventId: ev.id } }),
                    })
                    if (!response.ok) throw new Error('Unable to record RSVP')
                    const data = await response.json()
                    setEvents(data.events || [])
                    alert('RSVP recorded')
                  } catch (e) {
                    console.warn(e)
                    alert('Could not RSVP')
                  }
                }}>RSVP</Button>
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>No events found.</div>
        )}
      </div>
    </div>
  )
}
