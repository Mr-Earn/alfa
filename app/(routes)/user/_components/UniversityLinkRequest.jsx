"use client"

import { useEffect, useState } from 'react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

export default function UniversityLinkRequest({ role }) {
  const [universities, setUniversities] = useState([])
  const [links, setLinks] = useState([])
  const [universityEmail, setUniversityEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders(role)
        const [profilesResponse, linksResponse] = await Promise.all([
          fetch('/api/profiles', { headers }),
          fetch('/api/university-links', { headers }),
        ])
        const profileData = await profilesResponse.json()
        const linkData = await linksResponse.json()
        setUniversities((profileData.profiles || []).filter((profile) => profile.role === 'university'))
        setLinks(linkData.links || [])
      } catch (error) {
        console.warn('Unable to load university links', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  const requestLink = async (event) => {
    event.preventDefault()
    if (!universityEmail) return
    setSending(true)
    setMessage('')
    try {
      const headers = await getAuthenticatedRequestHeaders(role)
      const university = universities.find((item) => item.email === universityEmail)
      const response = await fetch('/api/university-links', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ university_email: universityEmail, university_name: university?.institution_name || university?.full_name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send request')
      setLinks((current) => [data.link, ...current])
      setUniversityEmail('')
      setMessage('Link request sent. The university must approve it.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSending(false)
    }
  }

  if (!['student', 'owner'].includes(role)) return null

  return (
    <section className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h2 className='text-lg font-semibold text-slate-900'>University linking</h2>
      <p className='mt-1 text-sm text-slate-500'>Request a connection with a university. Your profile will be linked only after approval.</p>
      <form onSubmit={requestLink} className='mt-4 flex flex-col gap-3 sm:flex-row'>
        <select value={universityEmail} onChange={(event) => setUniversityEmail(event.target.value)} className='flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'>
          <option value=''>Select a university</option>
          {universities.map((university) => <option key={university.id || university.email} value={university.email}>{university.institution_name || university.full_name || university.email}</option>)}
        </select>
        <button type='submit' disabled={sending || !universityEmail} className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'>
          {sending ? 'Sending...' : 'Request link'}
        </button>
      </form>
      {message && <p className='mt-3 text-sm text-slate-600'>{message}</p>}
      {!loading && links.length > 0 && (
        <div className='mt-5 space-y-2'>
          {links.map((link) => <div key={link.id} className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm'><span>{link.university_name || link.university_email}</span><span className={`rounded-full px-2 py-1 text-xs font-medium ${link.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : link.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{link.status}</span></div>)}
        </div>
      )}
    </section>
  )
}
