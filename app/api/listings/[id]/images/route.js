import { NextResponse } from 'next/server'
import { getAuthenticatedRequestContext } from '@/lib/permissions'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/utils/supabase/admin'

const imageExtensions = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

async function findListing(client, listingId) {
  let lastError = null

  for (const tableName of ['listing', 'listings']) {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('id', listingId)
      .maybeSingle()

    if (data) return { listing: data, error: null }
    if (error) lastError = error
  }

  return { listing: null, error: lastError }
}

export async function POST(request, { params }) {
  const { user, role } = await getAuthenticatedRequestContext(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'university', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const authHeader = request.headers.get('authorization')
  const uploadClient = supabaseAdmin || (authHeader?.startsWith('Bearer ')
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_API_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null)

  if (!uploadClient) {
    return NextResponse.json({ error: 'Listing image uploads are not configured' }, { status: 503 })
  }

  const { listing, error: listingError } = await findListing(uploadClient, params.id)
  if (listingError) {
    console.error('Unable to verify listing before image upload:', listingError)
    return NextResponse.json({ error: 'Unable to verify listing ownership' }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (role === 'owner' && (listing.createdby ?? listing.createdBy) !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid image upload request' }, { status: 400 })
  }

  const files = formData.getAll('images')
  if (!files.length || files.some((file) => !file || typeof file.arrayBuffer !== 'function')) {
    return NextResponse.json({ error: 'Select at least one image to upload' }, { status: 400 })
  }
  if (files.some((file) => !imageExtensions[file.type])) {
    return NextResponse.json({ error: 'Only PNG, JPG, and GIF images are supported' }, { status: 400 })
  }

  const uploadedPaths = []
  const imageRecords = []

  for (const file of files) {
    const extension = imageExtensions[file.type]
    const path = `listings/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await uploadClient.storage
      .from('accommodations')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Listing image upload error:', uploadError)
      if (uploadedPaths.length) {
        const { error: cleanupError } = await uploadClient.storage.from('accommodations').remove(uploadedPaths)
        if (cleanupError) console.error('Listing image cleanup error:', cleanupError)
      }
      return NextResponse.json({ error: 'Unable to upload listing images' }, { status: 500 })
    }

    uploadedPaths.push(path)
    const { data } = uploadClient.storage.from('accommodations').getPublicUrl(path)
    imageRecords.push({ listing_id: params.id, url: data.publicUrl })
  }

  const { data, error: insertError } = await uploadClient
    .from('listingImages')
    .insert(imageRecords)
    .select('listing_id,url')

  if (insertError) {
    console.error('Listing image reference insert error:', insertError)
    const { error: cleanupError } = await uploadClient.storage.from('accommodations').remove(uploadedPaths)
    if (cleanupError) console.error('Listing image cleanup error:', cleanupError)
    return NextResponse.json({ error: 'Unable to save listing images' }, { status: 500 })
  }

  return NextResponse.json({ images: data }, { status: 201 })
}
