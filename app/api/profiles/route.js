import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { canAccessResource, getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions'

const PROFILE_FIELDS = [
  'id', 'email', 'role', 'full_name', 'phone', 'phone_number', 'avatar_url', 'bio', 'gender', 'date_of_birth', 'nationality',
  'university', 'course', 'year', 'program', 'major', 'preferred_move_in_date', 'roommate_preferences', 'additional_info', 'notes',
  'company', 'company_name', 'address', 'bank_details', 'agency', 'license_number', 'institution_name', 'contact_person',
]

let fallbackProfiles = [
  {
    id: 'demo-student-1',
    email: 'student1@example.com',
    role: 'student',
    full_name: 'Anele Ndlovu',
    university: 'Cape Town University',
    course: 'Computer Science',
    program: 'Computer Science',
  },
  {
    id: 'demo-student-2',
    email: 'student2@example.com',
    role: 'student',
    full_name: 'Mandla Khumalo',
    university: 'Cape Town University',
    course: 'Mechanical Engineering',
    program: 'Mechanical Engineering',
  },
]

function sanitizeProfilePayload(body) {
  const payload = {}
  PROFILE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  })
  return payload
}

export async function GET(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    if (!canAccessResource(role, 'profiles', 'read')) {
      return NextResponse.json({ profiles: [] }, { status: 403 })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get('id')
    const email = url.searchParams.get('email')

    if (!supabaseAdmin) {
      const filteredProfiles = fallbackProfiles.filter((profile) => {
        if (userId) return String(profile.id) === String(userId)
        if (email) return String(profile.email).toLowerCase() === String(email).toLowerCase()
        return true
      })

      if (userId || email) {
        return NextResponse.json({ profile: filteredProfiles[0] || null }, { status: 200 })
      }

      return NextResponse.json({ profiles: filteredProfiles }, { status: 200 })
    }

    // If an id or email is provided, return the single profile
    if (userId || email) {
      let query = supabaseAdmin.from('profiles').select('*')
      if (userId) query = query.eq('id', userId).maybeSingle()
      if (email) query = query.eq('email', email).maybeSingle()
      const { data, error } = await query
      if (error) return NextResponse.json({ profile: null }, { status: 200 })
      return NextResponse.json({ profile: data || null }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin.from('profiles').select('*')
    if (error) {
      return NextResponse.json({ profiles: [] }, { status: 200 })
    }

    return NextResponse.json({ profiles: data || [] }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ profiles: [] }, { status: 200 })
  }
}

export async function POST(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    const body = await req.json()
    const { id, email, role: requestedRole } = body
    if (!id || !email) return NextResponse.json({ error: 'user id and email required' }, { status: 400 })

    if (!canAccessResource(role, 'profiles', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      const upsertPayload = sanitizeProfilePayload(body)
      upsertPayload.role = normalizeRole(requestedRole || role || 'student')
      if (upsertPayload.phone && !upsertPayload.phone_number) upsertPayload.phone_number = upsertPayload.phone
      if (upsertPayload.phone_number && !upsertPayload.phone) upsertPayload.phone = upsertPayload.phone_number
      if (upsertPayload.company && !upsertPayload.company_name) upsertPayload.company_name = upsertPayload.company
      if (upsertPayload.company_name && !upsertPayload.company) upsertPayload.company = upsertPayload.company_name

      fallbackProfiles = fallbackProfiles.filter((profile) => String(profile.id) !== String(id) && String(profile.email).toLowerCase() !== String(email).toLowerCase())
      fallbackProfiles = [
        { ...upsertPayload, id, email },
        ...fallbackProfiles,
      ]
      return NextResponse.json({ profile: fallbackProfiles.find((profile) => String(profile.id) === String(id) || String(profile.email).toLowerCase() === String(email).toLowerCase()) || null }, { status: 200 })
    }

    const upsertPayload = sanitizeProfilePayload(body)
    upsertPayload.role = normalizeRole(requestedRole || role || 'student')
    if (upsertPayload.phone && !upsertPayload.phone_number) upsertPayload.phone_number = upsertPayload.phone
    if (upsertPayload.phone_number && !upsertPayload.phone) upsertPayload.phone = upsertPayload.phone_number
    if (upsertPayload.company && !upsertPayload.company_name) upsertPayload.company_name = upsertPayload.company
    if (upsertPayload.company_name && !upsertPayload.company) upsertPayload.company = upsertPayload.company_name

    const { data, error } = await supabaseAdmin.from('profiles').upsert([upsertPayload]).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data?.[0] || null }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    const body = await req.json()
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'user id required' }, { status: 400 })

    if (!canAccessResource(role, 'profiles', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      const updatePayload = sanitizeProfilePayload(body)
      updatePayload.role = normalizeRole(body.role || role || 'student')
      if (updatePayload.phone && !updatePayload.phone_number) updatePayload.phone_number = updatePayload.phone
      if (updatePayload.phone_number && !updatePayload.phone) updatePayload.phone = updatePayload.phone_number
      if (updatePayload.company && !updatePayload.company_name) updatePayload.company_name = updatePayload.company
      if (updatePayload.company_name && !updatePayload.company) updatePayload.company = updatePayload.company_name

      fallbackProfiles = fallbackProfiles.filter((profile) => String(profile.id) !== String(id))
      fallbackProfiles = [{ ...(fallbackProfiles.find((profile) => String(profile.id) === String(id)) || {}), ...updatePayload, id }, ...fallbackProfiles]
      return NextResponse.json({ profile: fallbackProfiles.find((profile) => String(profile.id) === String(id)) || null }, { status: 200 })
    }

    const updatePayload = sanitizeProfilePayload(body)
    updatePayload.role = normalizeRole(body.role || role || 'student')
    if (updatePayload.phone && !updatePayload.phone_number) updatePayload.phone_number = updatePayload.phone
    if (updatePayload.phone_number && !updatePayload.phone) updatePayload.phone = updatePayload.phone_number
    if (updatePayload.company && !updatePayload.company_name) updatePayload.company_name = updatePayload.company
    if (updatePayload.company_name && !updatePayload.company) updatePayload.company = updatePayload.company_name

    const { data, error } = await supabaseAdmin.from('profiles').upsert([updatePayload]).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data?.[0] || null }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    const body = await req.json()
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'user id required' }, { status: 400 })

    // Only admin may delete arbitrary profiles; users can delete their own via authenticated token if desired
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      fallbackProfiles = fallbackProfiles.filter((profile) => String(profile.id) !== String(id))
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
