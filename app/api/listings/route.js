import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions'

const fallbackListings = [
  {
    id: 'demo-listing-1',
    address: '123 Campus Road',
    title: 'Demo University Accommodation',
    bedroom: 1,
    price: 4200,
    propertyType: 'House',
    createdBy: 'demo@university.com',
    coordinates: null,
  },
]

function normalizeListingRow(row = {}) {
  return {
    ...row,
    createdBy: row.createdBy ?? row.createdby ?? null,
    propertyType: row.propertyType ?? row.propertytype ?? null,
  }
}

async function getListingSchemaColumns(listingTableName) {
  if (!supabaseAdmin || !listingTableName) return new Set()

  try {
    const { data, error } = await supabaseAdmin.from(listingTableName).select('*').limit(1)
    if (error || !data || !data.length) return new Set()
    return new Set(Object.keys(data[0]))
  } catch {
    return new Set()
  }
}

async function listingHasColumn(listingTableName, columnName) {
  if (!supabaseAdmin || !listingTableName) return false
  const { error } = await supabaseAdmin.from(listingTableName).select(columnName).limit(0)
  return !error
}

async function getOwnerColumnName(listingTableName, supportedColumns) {
  if (supportedColumns.has('createdby')) return 'createdby'
  if (supportedColumns.has('createdBy')) return 'createdBy'
  if (await listingHasColumn(listingTableName, 'createdBy')) return 'createdBy'
  return 'createdby'
}

function filterSupportedFields(payload = {}, supportedColumns = new Set()) {
  const nextPayload = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue
    if (supportedColumns.size > 0 && !supportedColumns.has(key)) continue
    nextPayload[key] = value
  }
  return nextPayload
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

export async function GET(request) {
  const { user, role } = await getAuthenticatedRequestContext(request)
  if (!user) {
    return NextResponse.json({ listings: [] }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ listings: fallbackListings }, { status: 200 })
  }

  if (!['owner', 'university', 'admin'].includes(role)) {
    return NextResponse.json({ listings: [] }, { status: 403 })
  }

  const listingTableName = await getListingTableName()
  if (!listingTableName) {
    return NextResponse.json({ listings: fallbackListings }, { status: 200 })
  }

  const listingId = new URL(request.url).searchParams.get('id')
  let query = supabaseAdmin.from(listingTableName).select('*').order('created_at', { ascending: false })

  if (role === 'owner') {
    const supportedColumns = await getListingSchemaColumns(listingTableName)
    const ownerColumn = await getOwnerColumnName(listingTableName, supportedColumns)
    query = query.eq(ownerColumn, user.email)
    console.log(`Owner listing query for email: ${user.email}`)
  }

  if (listingId) {
    query = query.eq('id', listingId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error fetching listings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const listingRows = data || []
  let imageRows = []

  if (listingRows.length) {
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('listingImages')
      .select('listing_id,url')
      .in('listing_id', listingRows.map((listing) => listing.id))

    if (imagesError) {
      console.error('Supabase error fetching listing images:', imagesError)
      return NextResponse.json({ error: 'Unable to load listing images' }, { status: 500 })
    }

    imageRows = images || []
  }

  const imagesByListingId = new Map()
  for (const image of imageRows) {
    const listingKey = String(image.listing_id)
    const listingImages = imagesByListingId.get(listingKey) || []
    listingImages.push(image)
    imagesByListingId.set(listingKey, listingImages)
  }

  const listings = listingRows.map((row) => ({
    ...normalizeListingRow(row),
    listingImages: imagesByListingId.get(String(row.id)) || [],
  }))
  console.log(`Fetched ${listings.length} listings for user ${user.email} (role: ${role})`)
  return NextResponse.json({ listings }, { status: 200 })
}

export async function POST(request) {
  const { user, role } = await getAuthenticatedRequestContext(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'university', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Listing storage is not configured' }, { status: 503 })
  }

  const body = await request.json()
  const address = String(body?.address || '').trim()
  if (!address) {
    return NextResponse.json({ error: 'Property address is required' }, { status: 400 })
  }

  const listingTableName = await getListingTableName()
  if (!listingTableName) {
    return NextResponse.json({ error: 'The listings table is unavailable' }, { status: 503 })
  }

  const supportedColumns = await getListingSchemaColumns(listingTableName)

  const payload = {
    id: randomUUID(),
    address,
    title: body?.title || 'University accommodation',
    description: body?.description || '',
    bedroom: Number(body?.bedroom || 1),
    bathroom: body?.bathroom ? Number(body.bathroom) : undefined,
    price: Number(body?.price || 0),
    propertyType: body?.propertyType || body?.propertytype || 'House',
    type: body?.type || 'Rent',
    active: body?.active !== undefined ? body.active : true,
    status: body?.status || 'published',
    createdby: body?.createdby || body?.createdBy || user.email || null,
    coordinates: body?.coordinates || null,
    area: body?.area !== undefined && body?.area !== null ? Number(body.area) : undefined,
    builtIn: body?.builtIn !== undefined && body?.builtIn !== null ? Number(body.builtIn) : undefined,
    parking: body?.parking !== undefined && body?.parking !== null ? Number(body.parking) : undefined,
    lotSize: body?.lotSize !== undefined && body?.lotSize !== null ? Number(body.lotSize) : undefined,
    hoa: body?.hoa !== undefined && body?.hoa !== null ? Number(body.hoa) : undefined,
  }

  console.log(`Creating listing for user ${user.email}:`, { title: payload.title, createdby: payload.createdby })

  const payloadWithAliases = { ...payload }
  const ownerColumn = await getOwnerColumnName(listingTableName, supportedColumns)
  if (ownerColumn === 'createdBy') {
    payloadWithAliases.createdBy = payloadWithAliases.createdby
    delete payloadWithAliases.createdby
  }
  if (supportedColumns.has('propertytype') && !supportedColumns.has('propertyType')) {
    payloadWithAliases.propertytype = payloadWithAliases.propertyType
    delete payloadWithAliases.propertyType
  }
  if (supportedColumns.has('builtin') && !supportedColumns.has('builtIn')) {
    payloadWithAliases.builtin = payloadWithAliases.builtIn
    delete payloadWithAliases.builtIn
  }
  if (supportedColumns.has('lotsize') && !supportedColumns.has('lotSize')) {
    payloadWithAliases.lotsize = payloadWithAliases.lotSize
    delete payloadWithAliases.lotSize
  }
  const safePayload = filterSupportedFields(payloadWithAliases, supportedColumns)

  const { data, error } = await supabaseAdmin.from(listingTableName).insert([safePayload]).select()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const listing = data?.[0]
  if (!listing) {
    return NextResponse.json({ error: 'The listing could not be saved' }, { status: 500 })
  }

  return NextResponse.json({ listing: normalizeListingRow(listing) }, { status: 201 })
}

export async function PUT(request) {
  let { user, role } = await getAuthenticatedRequestContext(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'university', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const listingId = body?.id
  if (!listingId) {
    return NextResponse.json({ error: 'Listing id is required' }, { status: 400 })
  }

  const updatesAccreditation = Object.hasOwn(body, 'nsfas_accreditation_status')
  let accreditationFields = {}
  if (updatesAccreditation) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token || !supabaseAdmin) {
      return NextResponse.json({ error: 'A valid university sign-in is required to update accreditation records' }, { status: 401 })
    }

    const { data: { user: authenticatedUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authenticatedUser) {
      return NextResponse.json({ error: 'A valid university sign-in is required to update accreditation records' }, { status: 401 })
    }

    user = authenticatedUser
    role = normalizeRole(authenticatedUser.app_metadata?.role || authenticatedUser.user_metadata?.role)
    if (!['university', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Only university staff can update accreditation records' }, { status: 403 })
    }

    const status = String(body.nsfas_accreditation_status || '')
    const source = String(body.nsfas_accreditation_source || '').trim()
    const expiresOn = String(body.nsfas_accredited_until || '').trim()
    if (!['unverified', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid accreditation status' }, { status: 400 })
    }

    let sourceUrl = null
    if (source) {
      try {
        const parsedSource = new URL(source)
        if (parsedSource.protocol !== 'https:') throw new Error('HTTPS required')
        sourceUrl = parsedSource.toString()
      } catch {
        return NextResponse.json({ error: 'Accreditation evidence must be a valid HTTPS URL' }, { status: 400 })
      }
    }

    const expiryIsValid = /^\d{4}-\d{2}-\d{2}$/.test(expiresOn)
      && !Number.isNaN(Date.parse(`${expiresOn}T00:00:00Z`))
      && new Date(`${expiresOn}T00:00:00Z`).toISOString().slice(0, 10) === expiresOn
    if (status === 'verified' && (!sourceUrl || !expiryIsValid || expiresOn < new Date().toISOString().slice(0, 10))) {
      return NextResponse.json({ error: 'Verified accreditation requires an HTTPS evidence URL and a current expiry date' }, { status: 400 })
    }

    accreditationFields = {
      nsfas_accreditation_status: status,
      nsfas_accreditation_source: sourceUrl,
      nsfas_accredited_until: expiryIsValid ? expiresOn : null,
      nsfas_verified_at: status === 'verified' ? new Date().toISOString() : null,
      nsfas_verified_by: status === 'verified' ? user.id : null,
    }
  }

  const listingTableName = await getListingTableName()
  const supportedColumns = await getListingSchemaColumns(listingTableName)
  if (updatesAccreditation) {
    const requiredColumns = Object.keys(accreditationFields)
    if (!supabaseAdmin || !listingTableName || requiredColumns.some((column) => !supportedColumns.has(column))) {
      return NextResponse.json({ error: 'Apply sql/add_nsfas_accreditation.sql before updating accreditation records' }, { status: 503 })
    }
  }

  const payload = {
    address: body?.address,
    title: body?.title,
    description: body?.description,
    bedroom: body?.bedroom !== undefined ? Number(body.bedroom) : undefined,
    bathroom: body?.bathroom !== undefined ? Number(body.bathroom) : undefined,
    price: body?.price !== undefined ? Number(body.price) : undefined,
    active: body?.active !== undefined ? Boolean(body.active) : undefined,
    propertyType: body?.propertyType ?? body?.propertytype,
    type: body?.type,
    coordinates: body?.coordinates,
    area: body?.area !== undefined && body?.area !== null ? Number(body.area) : undefined,
    builtIn: body?.builtIn !== undefined && body?.builtIn !== null ? Number(body.builtIn) : undefined,
    parking: body?.parking !== undefined && body?.parking !== null ? Number(body.parking) : undefined,
    lotSize: body?.lotSize !== undefined && body?.lotSize !== null ? Number(body.lotSize) : undefined,
    hoa: body?.hoa !== undefined && body?.hoa !== null ? Number(body.hoa) : undefined,
    ...accreditationFields,
  }

  const payloadWithAliases = { ...payload }
  if (supportedColumns.has('propertytype') && !supportedColumns.has('propertyType')) {
    payloadWithAliases.propertytype = payloadWithAliases.propertyType
    delete payloadWithAliases.propertyType
  }
  if (supportedColumns.has('builtin') && !supportedColumns.has('builtIn')) {
    payloadWithAliases.builtin = payloadWithAliases.builtIn
    delete payloadWithAliases.builtIn
  }
  const safePayload = filterSupportedFields(payloadWithAliases, supportedColumns)

  if (!supabaseAdmin) {
    return NextResponse.json({ listing: safePayload }, { status: 200 })
  }

  if (!listingTableName) {
    return NextResponse.json({ listing: safePayload }, { status: 200 })
  }

  // If owner, ensure they own the listing
  if (role === 'owner') {
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from(listingTableName)
      .select('*')
      .eq('id', listingId)
      .single()
    if (listingError || !listingData) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if ((listingData.createdBy ?? listingData.createdby) !== user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin.from(listingTableName).update(safePayload).eq('id', listingId).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ listing: normalizeListingRow(data?.[0] || null) }, { status: 200 })
}

export async function DELETE(request) {
  const { user, role } = await getAuthenticatedRequestContext(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const listingId = body?.id

  if (!listingId) {
    return NextResponse.json({ error: 'Listing id is required' }, { status: 400 })
  }

  const listingTableName = await getListingTableName()
  if (!listingTableName) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  const { data: listingData, error: listingError } = await supabaseAdmin
    .from(listingTableName)
    .select('*')
    .eq('id', listingId)
    .single()

  if (listingError || !listingData) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if ((listingData.createdBy ?? listingData.createdby) !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await supabaseAdmin.from('listingImages').delete().eq('listing_id', listingId)
  } catch {
    // Ignore if the image table is missing in some projects.
  }
  const { error } = await supabaseAdmin.from(listingTableName).delete().eq('id', listingId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
