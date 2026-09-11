"use client"
import { supabase } from '@/utils/supabase/client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Slider from '../_components/Slider'
import Details from '../_components/Details'
import { supabase as supabaseClient } from '@/utils/supabase/client'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

function ViewListing({ params }) {
  const [listingDetail, setListingDetail] = useState()
  const [availableRooms, setAvailableRooms] = useState(0)
  const [leaseNote, setLeaseNote] = useState('')
  const [applicationFile, setApplicationFile] = useState(null)
  const [leasing, setLeasing] = useState(false)
  const user = useSupabaseUser()

  useEffect(() => {
    GetListingDetail()
  }, [params.id])

  const GetListingDetail = async () => {
    try {
      const response = await fetch(`/api/listings-public?id=${encodeURIComponent(params.id)}`)
      const { listings } = await response.json()
      const selectedListing = listings?.[0]

      if (selectedListing) {
        setListingDetail(selectedListing)
        const totalRooms = Number(selectedListing?.bedroom || 1)
        const { data: bookingData } = await supabase.from('bookings').select('id').eq('listing_id', params.id)
        const bookedRooms = bookingData?.length || 0
        setAvailableRooms(Math.max(totalRooms - bookedRooms, 0))
        return
      }

      toast('Listing not found.')
    } catch (error) {
      console.error('Error loading listing details:', error)
      toast('Server side error!')
    }
  }

  const handleLeaseRequest = async () => {
    if (!user) {
      toast('Please sign in to request a lease.')
      return
    }
    if (!listingDetail) {
      toast('Listing details not loaded yet.')
      return
    }

    setLeasing(true)
    let applicationDocumentUrl = ''

    if (applicationFile) {
      const fileName = `application_${user.id}_${Date.now()}_${applicationFile.name}`
      const { error: uploadError } = await supabaseClient.storage
        .from('lease_documents')
        .upload(fileName, applicationFile, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        toast('Document upload failed. Please try again.')
        setLeasing(false)
        return
      }

      const { data: publicUrlData } = await supabaseClient.storage.from('lease_documents').getPublicUrl(fileName)
      applicationDocumentUrl = publicUrlData?.publicUrl || ''
    }

    const payload = {
      listing_id: params.id,
      listing_title: listingDetail?.title || listingDetail?.address || '',
      student_email: user.email,
      student_id: user.id,
      note: leaseNote,
      application_document_url: applicationDocumentUrl,
      status: applicationDocumentUrl ? 'documents_uploaded' : 'requested',
    }

    const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
    const res = await fetch('/api/lease-requests', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setLeasing(false)

    if (!res.ok) {
      toast(json.error || 'Failed to send lease request.')
      return
    }

    toast('Lease request sent to the owner.')
    setLeaseNote('')
    setApplicationFile(null)
  }

  return (
    <div className='px-4 md:px-32 lg:px-56 py-5'>
      <Slider imageList={listingDetail?.listingImages} />
      <Details listingDetail={listingDetail} />
      <div className='mt-6'>
        <BookingWidget
          listingId={params.id}
          listingTitle={listingDetail?.title || listingDetail?.address}
          availableRooms={availableRooms}
          onAvailabilityChange={setAvailableRooms}
        />
      </div>
      <div className='mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h3 className='mb-3 text-xl font-semibold'>Request lease agreement</h3>
        <p className='mb-4 text-sm text-slate-600'>Submit a lease request to the listing owner. The owner can upload the lease document when they approve your request.</p>
        <label className='block text-sm font-medium text-slate-700'>Message for owner</label>
        <textarea
          value={leaseNote}
          onChange={(e) => setLeaseNote(e.target.value)}
          className='mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800'
          rows={4}
          placeholder='Describe your booking needs and preferred move-in date'
        />
        <label className='mt-4 block text-sm font-medium text-slate-700'>Supporting document (optional)</label>
        <input
          type='file'
          accept='application/pdf,image/*'
          onChange={(event) => setApplicationFile(event.target.files?.[0] || null)}
          className='mt-2 block w-full text-sm text-slate-600'
        />
        <p className='mt-1 text-xs text-slate-500'>Proof of registration, identity, funding, or another document requested by the owner.</p>
        <button
          onClick={handleLeaseRequest}
          disabled={!leaseNote.trim() || leasing}
          className='mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-white disabled:opacity-60'
        >
          {leasing ? 'Sending...' : 'Send lease request'}
        </button>
      </div>
    </div>
  )
}

export default ViewListing

function BookingWidget({ listingId, listingTitle, availableRooms, onAvailabilityChange }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState(null)
  const [roomGender, setRoomGender] = useState('no-preference')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // try to load current user's profile to read gender
    ;(async () => {
      const { data } = await supabaseClient.auth.getUser()
      const user = data?.user
      if (!user) return
      try {
        const res = await fetch(`/api/profiles?email=${encodeURIComponent(user.email)}`)
        const json = await res.json()
        if (res.ok && json.profile) setProfile(json.profile)
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  const handleRequest = async () => {
    if (availableRooms <= 0) {
      toast('No rooms are available for this listing right now.')
      return
    }

    const { data } = await supabaseClient.auth.getUser()
    const user = data?.user
    if (!user) {
      toast('Please sign in to request a booking')
      return
    }

    setLoading(true)
    const payload = { listing_id: listingId, listing_title: listingTitle || null, user_id: user.id, contact_email: user.email, move_in_date: date || null, message, room_gender_preference: roomGender }
    const res = await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    setLoading(false)

    if (res.ok) {
      toast('Booking request sent')
      onAvailabilityChange?.(Math.max(availableRooms - 1, 0))
      // notify listeners (e.g., My Bookings) that a booking was created
      try { window.dispatchEvent(new CustomEvent('booking:created')) } catch (e) { /* ignore */ }
      setOpen(false)
      setDate('')
      setMessage('')
    } else {
      toast(json?.error || 'Booking failed')
    }
  }

  return (
    <div>
      <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <p className='text-sm font-semibold text-slate-800'>
          {availableRooms > 0 ? `${availableRooms} room${availableRooms === 1 ? '' : 's'} available` : 'No rooms available right now'}
        </p>
        <p className='text-sm text-slate-600'>Tenants can reserve a room directly from this page.</p>
      </div>
      <button
        onClick={() => setOpen(true)}
        disabled={availableRooms <= 0}
        className='mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:bg-slate-400'
      >
        Request Booking
      </button>
      {open && (
        <div className='mt-4 p-4 border rounded bg-white max-w-md'>
          <h3 className='font-bold'>Request booking for</h3>
          <p className='text-sm text-gray-600'>{listingTitle}</p>
          <label className='block mt-2'>
            Move-in date
            <input type='date' value={date} onChange={(e) => setDate(e.target.value)} className='block mt-1' />
          </label>
          <label className='block mt-2'>
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className='block mt-1 w-full' />
          </label>
          <label className='block mt-2'>
            Room gender preference
            <select value={roomGender} onChange={(e) => setRoomGender(e.target.value)} className='block mt-1'>
              <option value='no-preference'>No preference</option>
              <option value='male'>Male only</option>
              <option value='female'>Female only</option>
              <option value='other'>Other / mixed</option>
            </select>
            {profile?.gender && (
              <p className='mt-1 text-sm text-slate-500'>Your profile gender: {profile.gender}</p>
            )}
          </label>
          <div className='mt-3 flex gap-2'>
            <button onClick={handleRequest} disabled={loading} className='bg-blue-600 text-white px-3 py-2 rounded'>
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button onClick={() => setOpen(false)} className='px-3 py-2 border rounded'>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
