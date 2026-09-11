"use client"

import { useEffect, useState } from 'react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

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
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(defaultAccommodationForm)
  const [message, setMessage] = useState('')

  const loadListings = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/listings', { headers })
      const data = await response.json()
      setListings(Array.isArray(data?.listings) ? data.listings : [])
    } catch (error) {
      console.warn('Unable to load university accommodations', error)
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
      setForm(defaultAccommodationForm)
      setMessage('Accommodation created and available to the university workspace.')
    } catch (error) {
      console.warn('Unable to create accommodation', error)
      setMessage('Unable to create accommodation right now.')
    } finally {
      setCreating(false)
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
