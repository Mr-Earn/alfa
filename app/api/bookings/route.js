import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { canAccessResource, getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions'

const ROOM_GENDER_VALUES = ['male', 'female', 'other', 'no-preference']
const ASSIGNED_GENDER_VALUES = ['male', 'female', 'other']

let fallbackBookings = [
  {
    id: 'demo-booking-1',
    listing_id: 'demo-listing-1',
    user_id: 'demo-student-1',
    contact_email: 'student1@example.com',
    move_in_date: '2026-09-01',
    message: 'Need a room close to campus',
    room_gender_preference: 'female',
    assigned_university: 'Cape Town University',
    assigned_accommodation: 'University Approved',
    status: 'approved',
  },
  {
    id: 'demo-booking-2',
    listing_id: 'demo-listing-2',
    user_id: 'demo-student-2',
    contact_email: 'student2@example.com',
    move_in_date: '2026-08-20',
    message: 'Need a shared flat',
    room_gender_preference: 'male',
    assigned_university: null,
    assigned_accommodation: null,
    status: 'pending',
  },
]

function normalizeGenderValue(value) {
  if (value == null) return null
  const normalized = String(value).trim().toLowerCase()
  if (ROOM_GENDER_VALUES.includes(normalized)) return normalized
  if (ASSIGNED_GENDER_VALUES.includes(normalized)) return normalized
  return null
}

async function getListingTableName() {
  if (!supabaseAdmin) return null

  const tableCandidates = ['listing', 'listings']
  for (const tableName of tableCandidates) {
    try {
      const { error } = await supabaseAdmin.from(tableName).select('id').limit(1)
      if (!error) return tableName
    } catch {
      // Ignore and try the next candidate.
    }
  }

  return null
}

export async function GET(req) {
  try {
    const { role, user } = await getAuthenticatedRequestContext(req)
    const url = new URL(req.url)
    const mineOnly = url.searchParams.get('mine') === 'true'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    if (!canAccessResource(role, 'bookings', 'read')) {
      return NextResponse.json({ bookings: [] }, { status: 403 })
    }

    if (!supabaseAdmin) {
      let fb = fallbackBookings.map((booking) => ({ ...booking, student_profile: null }))
      if (mineOnly) {
        if (!user?.id && !user?.email) return NextResponse.json({ bookings: [], meta: { total: 0, page, per_page: perPage, total_pages: 0 } }, { status: 200 })
        fb = fb.filter((b) => String(b.user_id) === String(user.id) || String((b.contact_email || '').toLowerCase()) === String((user.email || '').toLowerCase()))
      }
      const total = fb.length
      const paged = fb.slice(from, to + 1)
      return NextResponse.json({ bookings: paged, meta: { total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } }, { status: 200 })
    }

    let query = supabaseAdmin.from('bookings').select('*')

    if (mineOnly) {
      if (!user?.id && !user?.email) return NextResponse.json({ bookings: [] }, { status: 200 })
      try {
        const email = (user.email || '').toLowerCase()
        const ownershipFilters = []
        if (user.id) ownershipFilters.push(`user_id.eq.${user.id}`)
        if (email) ownershipFilters.push(`contact_email.eq.${email}`)
        const { data: bookings, error, count } = await supabaseAdmin
          .from('bookings')
          .select('*', { count: 'exact' })
          .or(ownershipFilters.join(','))
          .range(from, to)
        if (error) throw error

        // enrich bookings with listing images and owner info
        const listingTableName = await getListingTableName()
        const listingsMap = {}
        if (listingTableName && bookings.length) {
          const listingIds = Array.from(new Set(bookings.map((b) => b.listing_id).filter(Boolean)))
          if (listingIds.length) {
            const { data: listingRows } = await supabaseAdmin.from(listingTableName).select('id,title,createdby,listingImages(url,listing_id)').in('id', listingIds);
            (listingRows || []).forEach((row) => { listingsMap[String(row.id)] = row })
          }
        }

        const ownerEmails = Array.from(new Set(Object.values(listingsMap).map((l) => (l && (l.createdby || l.createdBy)) || '').filter(Boolean)))
        let owners = []
        if (ownerEmails.length) {
          const { data: ownerRows } = await supabaseAdmin.from('profiles').select('email,full_name,phone').in('email', ownerEmails)
          owners = ownerRows || []
        }
        const ownerMap = {}
        owners.forEach((o) => { ownerMap[(o.email || '').toLowerCase()] = o })

        const merged = (bookings || []).map((b) => {
          const listing = listingsMap[String(b.listing_id)] || null
          const ownerEmail = (listing && (listing.createdby || listing.createdBy)) || ''
          const owner = ownerEmail && ownerMap[ownerEmail.toLowerCase()] ? ownerMap[ownerEmail.toLowerCase()] : null
          return {
            ...b,
            listing_title: b.listing_title || (listing && listing.title) || null,
            listing_images: listing && listing.listingImages ? listing.listingImages.map((li) => li.url) : [],
            owner_name: owner?.full_name || null,
            owner_phone: owner?.phone || null,
          }
        })

        const total = count || merged.length
        return NextResponse.json({ bookings: merged, meta: { total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } }, { status: 200 })
      } catch (err) {
        console.warn('Error loading mine bookings', err)
        return NextResponse.json({ bookings: [] }, { status: 200 })
      }
    }

    if (role === 'owner') {
      const ownerEmail = user?.email
      const listingTableName = await getListingTableName()
      if (!listingTableName) {
        return NextResponse.json({ bookings: fallbackBookings.map((booking) => ({ ...booking, student_profile: null })) }, { status: 200 })
      }

      const { data: ownerListings, error: ownerListingError } = await supabaseAdmin
        .from(listingTableName)
        .select('id')
        .eq('createdby', ownerEmail)

      if (ownerListingError) {
        return NextResponse.json({ bookings: [] }, { status: 500 })
      }

      const listingIds = Array.isArray(ownerListings) ? ownerListings.map((listing) => listing.id) : []
      if (listingIds.length === 0) {
        return NextResponse.json({ bookings: [] }, { status: 200 })
      }

      query = query.in('listing_id', listingIds)
    }

    if (role === 'university') {
      const universityEmail = user?.email
      let universityName = null

      if (universityEmail) {
        const { data: universityProfile } = await supabaseAdmin
          .from('profiles')
          .select('university,institution_name,full_name')
          .eq('email', universityEmail)
          .maybeSingle()

        universityName = universityProfile?.university || universityProfile?.institution_name || universityProfile?.full_name || null
      }

      if (!universityName) {
        return NextResponse.json({ bookings: [] }, { status: 200 })
      }

      const { data: studentProfiles, error: studentError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, university')
        .eq('university', universityName)

      if (studentError) {
        return NextResponse.json({ bookings: [] }, { status: 200 })
      }

      const studentIds = Array.from(new Set((studentProfiles || []).map((profile) => profile.id).filter(Boolean)))
      const studentEmails = Array.from(new Set((studentProfiles || []).map((profile) => profile.email).filter(Boolean).map((email) => email.toLowerCase())))

      // Build OR filter across user_ids, emails and assigned_university to let the DB do the heavy lifting and support pagination
      const orParts = []
      studentIds.forEach((id) => orParts.push(`user_id.eq.${id}`))
      studentEmails.forEach((e) => orParts.push(`contact_email.eq.${e}`))
      orParts.push(`assigned_university.eq.${universityName}`)
      const orQuery = orParts.join(',')
      if (!orQuery) return NextResponse.json({ bookings: [], meta: { total: 0, page, per_page: perPage, total_pages: 0 } }, { status: 200 })
      const { data: rows, error: rowsErr, count: rowsCount } = await supabaseAdmin.from('bookings').select('*', { count: 'exact' }).or(orQuery).range(from, to)
      if (rowsErr) return NextResponse.json({ bookings: [], meta: { total: 0, page, per_page: perPage, total_pages: 0 } }, { status: 200 })
      const merged = (rows || []).map((booking) => ({ ...booking, student_profile: null }))
      const total = rowsCount || merged.length
      return NextResponse.json({ bookings: merged, meta: { total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } }, { status: 200 })
    }

    const { data, error, count } = await query.select('*', { count: 'exact' }).range(from, to)
    if (error) {
      return NextResponse.json({ bookings: [], meta: { total: 0, page, per_page: perPage, total_pages: 0 } }, { status: 200 })
    }

    // Merge student profile info for consumers (owner/university/admin)
    const bookings = data || []
    try {
      const userIds = Array.from(new Set(bookings.map((b) => b.user_id).filter(Boolean)))
      const emails = Array.from(new Set(bookings.map((b) => b.contact_email).filter(Boolean)))

      let profiles = []
      if (userIds.length > 0) {
        const { data: pData } = await supabaseAdmin.from('profiles').select('*').in('id', userIds)
        profiles = pData || []
      }
      // also fetch by email for profiles that may not have user_id
      if (emails.length > 0) {
        const { data: pByEmail } = await supabaseAdmin.from('profiles').select('*').in('email', emails)
        profiles = profiles.concat(pByEmail || [])
      }

      const profileMapById = {}
      const profileMapByEmail = {}
      profiles.forEach((p) => {
        if (p.id) profileMapById[String(p.id)] = p
        if (p.email) profileMapByEmail[String(p.email).toLowerCase()] = p
      })

      const merged = bookings.map((b) => {
        const profile = profileMapById[String(b.user_id)] || profileMapByEmail[String(b.contact_email || '').toLowerCase()] || null
        return { ...b, student_profile: profile }
      })

      // enrich with listing & owner info
      const listingTableName = await getListingTableName()
      const listingsMap = {}
      if (listingTableName && merged.length) {
        const listingIds = Array.from(new Set(merged.map((b) => b.listing_id).filter(Boolean)))
        if (listingIds.length) {
          const { data: listingRows } = await supabaseAdmin.from(listingTableName).select('id,title,createdby,listingImages(url,listing_id)').in('id', listingIds);
          (listingRows || []).forEach((row) => { listingsMap[String(row.id)] = row })
        }
      }

      const ownerEmails = Array.from(new Set(Object.values(listingsMap).map((l) => (l && (l.createdby || l.createdBy)) || '').filter(Boolean)))
      let owners = []
      if (ownerEmails.length) {
        const { data: ownerRows } = await supabaseAdmin.from('profiles').select('email,full_name,phone').in('email', ownerEmails)
        owners = ownerRows || []
      }
      const ownerMap = {}
      owners.forEach((o) => { ownerMap[(o.email || '').toLowerCase()] = o })

      const fullyMerged = merged.map((b) => {
        const listing = listingsMap[String(b.listing_id)] || null
        const ownerEmail = (listing?.createdby || listing?.createdBy || '').toLowerCase()
        const owner = listing && ownerMap[ownerEmail] ? ownerMap[ownerEmail] : null
        return {
          ...b,
          listing_title: b.listing_title || (listing && listing.title) || null,
          listing_images: listing && listing.listingImages ? listing.listingImages.map((li) => li.url) : [],
          owner_name: owner?.full_name || null,
          owner_phone: owner?.phone || null,
        }
      })

      const total = count || fullyMerged.length
      return NextResponse.json({ bookings: fullyMerged, meta: { total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } }, { status: 200 })
    } catch (e) {
      return NextResponse.json({ bookings }, { status: 200 })
    }
  } catch (e) {
    return NextResponse.json({ bookings: [] }, { status: 200 })
  }
}

export async function POST(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    const body = await req.json()
    const { listing_id, user_id, contact_email, move_in_date, message } = body
    if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

    if (body.room_gender_preference != null) {
      const normalizedPreference = normalizeGenderValue(body.room_gender_preference)
      if (normalizedPreference == null || normalizedPreference === 'no-preference' && String(body.room_gender_preference).trim().toLowerCase() !== 'no-preference') {
        return NextResponse.json({ error: 'Invalid room_gender_preference' }, { status: 400 })
      }
      body.room_gender_preference = normalizedPreference
    }

    if (!canAccessResource(role, 'bookings', 'write', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      const booking = {
        id: `demo-booking-${Date.now()}`,
        listing_id,
        listing_title: body.listing_title || null,
        user_id,
        contact_email,
        move_in_date,
        message,
        room_gender_preference: body.room_gender_preference || null,
        status: 'pending',
      }
      fallbackBookings = [booking, ...fallbackBookings]
      return NextResponse.json({ data: [booking], availableRooms: 1, student_profile: null }, { status: 201 })
    }

    const listingTableName = await getListingTableName()
    if (!listingTableName) {
      return NextResponse.json({ data: [{ id: `demo-booking-${Date.now()}`, listing_id, user_id, contact_email, move_in_date, message, room_gender_preference: body.room_gender_preference || null, status: 'pending' }], availableRooms: 1, student_profile: null }, { status: 201 })
    }

    const { data: listingData, error: listingError } = await supabaseAdmin
      .from(listingTableName)
      .select('bedroom,title,createdby')
      .eq('id', listing_id)
      .single()

    if (listingError || !listingData) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const totalRooms = Number(listingData.bedroom || 1)
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('listing_id', listing_id)

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    const bookedRooms = bookingData?.length || 0
    if (bookedRooms >= totalRooms) {
      return NextResponse.json({ error: 'No rooms available for this listing right now.' }, { status: 409 })
    }

    const insertPayload = { listing_id, listing_title: listingData?.title || null, user_id, contact_email, move_in_date, message, room_gender_preference: body.room_gender_preference || null }
    const { data, error } = await supabaseAdmin.from('bookings').insert([insertPayload]).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch student profile to return alongside booking for owner visibility
    let studentProfile = null
    try {
      const { data: pData } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle()
      studentProfile = pData || null
    } catch (e) {
      studentProfile = null
    }

    // Include listing title and owner info in response if available
    const inserted = (data || [])[0]
    if (role === 'student') {
      return NextResponse.json({ data: [inserted], availableRooms: Math.max(totalRooms - (bookedRooms + 1), 0) }, { status: 201 })
    }
    return NextResponse.json({ data: [inserted], availableRooms: Math.max(totalRooms - (bookedRooms + 1), 0), student_profile: studentProfile }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const { role, user } = await getAuthenticatedRequestContext(req)
    if (!canAccessResource(role, 'bookings', 'write', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'booking id required' }, { status: 400 })

    // Owners can only update bookings for their listings
    if (role === 'owner') {
      const { data: bookingData, error: bookingErr } = await supabaseAdmin.from('bookings').select('listing_id').eq('id', id).maybeSingle()
      if (bookingErr || !bookingData) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const listingId = bookingData.listing_id
      const listingTableName = await getListingTableName()
      const { data: listingRow } = listingTableName
        ? await supabaseAdmin.from(listingTableName).select('createdBy').eq('id', listingId).maybeSingle()
        : { data: null }
      const ownerEmail = user?.email
      if (!listingRow || (listingRow.createdBy || listingRow.createdby) !== ownerEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (body.assigned_gender != null) {
      if (String(body.assigned_gender).trim() === '') {
        body.assigned_gender = null
      } else {
        const normalizedAssigned = normalizeGenderValue(body.assigned_gender)
        if (!ASSIGNED_GENDER_VALUES.includes(normalizedAssigned)) {
          return NextResponse.json({ error: 'Invalid assigned_gender' }, { status: 400 })
        }
        body.assigned_gender = normalizedAssigned
      }
    }

    if (body.assigned_university != null && String(body.assigned_university).trim() === '') {
      body.assigned_university = null
    }

    if (body.assigned_accommodation != null && String(body.assigned_accommodation).trim() === '') {
      body.assigned_accommodation = null
    }

    if (body.room_gender_preference != null) {
      const normalizedPreference = normalizeGenderValue(body.room_gender_preference)
      if (normalizedPreference == null) {
        return NextResponse.json({ error: 'Invalid room_gender_preference' }, { status: 400 })
      }
      body.room_gender_preference = normalizedPreference
    }

    const updatePayload = { ...body }
    delete updatePayload.id

    const { data: updated, error: updateErr } = await supabaseAdmin.from('bookings').update(updatePayload).eq('id', id).select()
    if (updateErr && (body.assigned_university != null || body.assigned_accommodation != null)) {
      const fallbackPayload = {}
      if (body.assigned_gender != null) fallbackPayload.assigned_gender = body.assigned_gender
      if (body.status != null) fallbackPayload.status = body.status
      if (Object.keys(fallbackPayload).length > 0) {
        const { data: fallbackUpdated, error: fallbackErr } = await supabaseAdmin.from('bookings').update(fallbackPayload).eq('id', id).select()
        if (!fallbackErr) {
          return NextResponse.json({ booking: fallbackUpdated?.[0] || null }, { status: 200 })
        }
      }
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // attach student profile if possible
    const updatedBooking = updated?.[0] || null
    let studentProfile = null
    if (updatedBooking?.user_id) {
      try {
        const { data: pData } = await supabaseAdmin.from('profiles').select('*').eq('id', updatedBooking.user_id).maybeSingle()
        studentProfile = pData || null
      } catch (e) {
        studentProfile = null
      }
    }

    if (role === 'student') {
      return NextResponse.json({ booking: updatedBooking }, { status: 200 })
    }
    return NextResponse.json({ booking: updatedBooking, student_profile: studentProfile }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
