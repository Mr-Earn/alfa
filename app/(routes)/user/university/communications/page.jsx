"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const defaultForm = {
  title: '',
  type: 'Announcement',
  detail: '',
  priority: 'Normal',
}

export default function UniversityCommunicationsPage() {
  const [communications, setCommunications] = useState([])
  const [form, setForm] = useState(defaultForm)

  const loadCommunications = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/student-hub', { headers })
      const data = await response.json()
      setCommunications(Array.isArray(data?.communications) ? data.communications : [])
    } catch (error) {
      console.warn('Unable to load communications', error)
    }
  }

  useEffect(() => {
    loadCommunications()
  }, [])

  const submitCommunication = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.detail.trim()) return

    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'communication', entry: form }),
      })

      if (response.ok) {
        const data = await response.json()
        setCommunications(Array.isArray(data?.communications) ? data.communications : [])
        setForm(defaultForm)
      }
    } catch (error) {
      console.warn('Unable to submit communication', error)
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h3 className='text-xl font-semibold text-slate-900'>Communications</h3>
      <p className='mt-2 text-sm text-slate-600'>Send announcements, share updates, and monitor resident support conversations.</p>

      <form onSubmit={submitCommunication} className='mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <Input placeholder='Title' value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <select className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm' value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option>Announcement</option>
          <option>Support ticket</option>
          <option>Reminder</option>
        </select>
        <Textarea placeholder='Message details' value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} />
        <select className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm' value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
          <option>Normal</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
        <Button type='submit'>Publish update</Button>
      </form>

      <div className='mt-6 space-y-3'>
        {communications.length ? (
          communications.map((item, index) => (
            <div key={`${item.title}-${index}`} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <p className='font-medium text-slate-900'>{item.title}</p>
                <span className='rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700'>{item.priority || 'Normal'}</span>
              </div>
              <p className='mt-1 text-sm text-slate-500'>{item.type || 'Announcement'}</p>
              <p className='mt-2 text-sm text-slate-600'>{item.detail}</p>
            </div>
          ))
        ) : (
          <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>No communication updates yet.</div>
        )}
      </div>
    </div>
  )
}
