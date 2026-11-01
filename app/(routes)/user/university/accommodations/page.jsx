"use client"

import { useEffect, useState } from 'react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { isNsfasAccreditationVerified } from '@/lib/recommendation-engine.mjs'

const defaultAccommodationForm = {
  title: '',
  address: '',
  bedroom: '1',
  price: '',
  propertyType: 'House',
}

export default function UniversityAccommodationsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(defaultAccommodationForm)
  const [message, setMessage] = useState('')
  const [accreditationDrafts, setAccreditationDrafts] = useState({})
  const [savingAccreditationId, setSavingAccreditationId] = useState(null)
  const [accreditationMessage, setAccreditationMessage] = useState('')

  const loadListings = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/listings', { headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Unable to load accommodation records')
      const accommodationListings = Array.isArray(data?.listings) ? data.listings : []
      setListings(accommodationListings)
      setAccreditationDrafts(Object.fromEntries(accommodationListings.map((listing) => [
        listing.id,
        {
          status: listing.nsfas_accreditation_status || 'unverified',
          source: listing.nsfas_accreditation_source || '',
          expiresOn: listing.nsfas_accredited_until || '',
        },
      ])))
    } catch (error) {
      console.warn('Unable to load university accommodations', error)
      setLoadError(error.message || 'Unable to load accommodation records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadListings()
  }, [])

  const handleCreateAccommodation = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.address.trim()) {
      setMessage('Please provide an accommodation title and address.')
      return
    }

    try {
      setCreating(true)
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          address: form.address.trim(),
          bedroom: Number(form.bedroom || 1),
          price: Number(form.price || 0),
          propertyType: form.propertyType,
          createdBy: 'university@demo.local',
        }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || 'Unable to create accommodation')

      setListings((current) => [json.listing, ...current].filter(Boolean))
      setAccreditationDrafts((current) => ({
        ...current,
        [json.listing.id]: { status: 'unverified', source: '', expiresOn: '' },
      }))
      setForm(defaultAccommodationForm)
      setMessage('Accommodation created and available to the university workspace.')
    } catch (error) {
      console.warn('Unable to create accommodation', error)
      setMessage('Unable to create accommodation right now.')
    } finally {
      setCreating(false)
    }
  }

  const saveAccreditation = async (event, listing) => {
    event.preventDefault()
    const draft = accreditationDrafts[listing.id] || { status: 'unverified', source: '', expiresOn: '' }

    try {
      setSavingAccreditationId(listing.id)
      setAccreditationMessage('')
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/listings', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: listing.id,
          nsfas_accreditation_status: draft.status,
          nsfas_accreditation_source: draft.source,
          nsfas_accredited_until: draft.expiresOn,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Unable to save accreditation review')

      setListings((current) => current.map((item) => item.id === listing.id ? data.listing : item))
      setAccreditationMessage(`${listing.title || 'Accommodation'} accreditation record saved.`)
    } catch (error) {
      console.error('Unable to save accommodation accreditation', error)
      setAccreditationMessage(error.message || 'Unable to save accreditation review.')
    } finally {
      setSavingAccreditationId(null)
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h3 className='text-xl font-semibold text-slate-900'>Create accommodations</h3>
      <p className='mt-2 text-sm text-slate-600'>Add housing options that can be linked to student placements and university-managed assignments.</p>

      <form onSubmit={handleCreateAccommodation} className='mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2'>
        <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Accommodation title' value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Address' value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Bedrooms' value={form.bedroom} onChange={(event) => setForm({ ...form, bedroom: event.target.value })} />
        <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Price' value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        <select className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' value={form.propertyType} onChange={(event) => setForm({ ...form, propertyType: event.target.value })}>
          <option value='House'>House</option>
          <option value='Apartment'>Apartment</option>
          <option value='Dorm'>Dorm</option>
        </select>
        <div className='flex items-center gap-3 md:col-span-2'>
          <button type='submit' disabled={creating} className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'>
            {creating ? 'Creating...' : 'Create accommodation'}
          </button>
          {message ? <span className='text-sm text-slate-600'>{message}</span> : null}
        </div>
      </form>

      <section className='mt-8'>
        <div className='mb-3'>
          <h3 className='text-xl font-semibold text-slate-900'>NSFAS accreditation review</h3>
          <p className='mt-1 text-sm text-slate-600'>Only mark a listing verified after checking an authoritative NSFAS or institutional source. Verified records require an HTTPS evidence URL and an expiry date.</p>
        </div>
        {!loading && (
          <div className='mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700'>
            Currently eligible listings: {listings.filter((listing) => isNsfasAccreditationVerified(listing)).length} of {listings.length}
          </div>
        )}
        {loadError && <p role='alert' className='mb-3 text-sm text-rose-700'>{loadError}</p>}
        {accreditationMessage && <p role='status' className='mb-3 text-sm text-slate-700'>{accreditationMessage}</p>}
        <div className='space-y-3'>
          {listings.map((listing) => {
            const draft = accreditationDrafts[listing.id] || { status: 'unverified', source: '', expiresOn: '' }
            return (
              <form key={listing.id} onSubmit={(event) => saveAccreditation(event, listing)} className='grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2'>
                <div className='md:col-span-2'>
                  <p className='font-medium text-slate-900'>{listing.title || 'Accommodation'}</p>
                  <p className='text-sm text-slate-500'>{listing.address || 'Address not set'}</p>
                </div>
                <label className='text-sm text-slate-700'>
                  Review status
                  <select
                    className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2'
                    value={draft.status}
                    onChange={(event) => setAccreditationDrafts((current) => ({
                      ...current,
                      [listing.id]: { ...draft, status: event.target.value },
                    }))}
                  >
                    <option value='unverified'>Unverified</option>
                    <option value='verified'>Verified</option>
                    <option value='rejected'>Rejected</option>
                  </select>
                </label>
                <label className='text-sm text-slate-700'>
                  Accreditation expiry date
                  <input
                    type='date'
                    className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2'
                    value={draft.expiresOn}
                    onChange={(event) => setAccreditationDrafts((current) => ({
                      ...current,
                      [listing.id]: { ...draft, expiresOn: event.target.value },
                    }))}
                  />
                </label>
                <label className='text-sm text-slate-700 md:col-span-2'>
                  Evidence source URL
                  <input
                    type='url'
                    placeholder='https://...'
                    className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2'
                    value={draft.source}
                    onChange={(event) => setAccreditationDrafts((current) => ({
                      ...current,
                      [listing.id]: { ...draft, source: event.target.value },
                    }))}
                  />
                </label>
                <div className='flex items-center gap-3 md:col-span-2'>
                  <button type='submit' disabled={savingAccreditationId === listing.id} className='rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'>
                    {savingAccreditationId === listing.id ? 'Saving review...' : 'Save review'}
                  </button>
                  <span className='text-xs text-slate-500'>
                    {isNsfasAccreditationVerified(listing) ? `Verified until ${listing.nsfas_accredited_until}` : 'Not eligible for NSFAS-only recommendations'}
                  </span>
                </div>
              </form>
            )
          })}
        </div>
      </section>

      <div className='mt-6 overflow-hidden rounded-xl border border-slate-200'>
        <table className='min-w-full divide-y divide-slate-200 text-left text-sm'>
          <thead className='bg-slate-50 text-slate-600'>
            <tr>
              <th className='px-4 py-3 font-medium'>Title</th>
              <th className='px-4 py-3 font-medium'>Address</th>
              <th className='px-4 py-3 font-medium'>Bedrooms</th>
              <th className='px-4 py-3 font-medium'>Price</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-200 bg-white'>
            {loading ? (
              <tr><td className='px-4 py-6 text-slate-500' colSpan={4}>Loading accommodations...</td></tr>
            ) : listings.length ? listings.map((listing) => (
              <tr key={listing.id || listing.title}>
                <td className='px-4 py-3'>{listing.title || 'Accommodation'}</td>
                <td className='px-4 py-3'>{listing.address || 'Not set'}</td>
                <td className='px-4 py-3'>{listing.bedroom || 1}</td>
                <td className='px-4 py-3'>{listing.price ? `R${listing.price}` : 'TBD'}</td>
              </tr>
            )) : (
              <tr><td className='px-4 py-6 text-slate-500' colSpan={4}>No accommodations created yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
