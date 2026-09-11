import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions'

let fallbackLinks = []

function clean(value) {
  return String(value || '').trim()
}

function responseLinks(links) {
  return (links || []).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
}

async function getProfile(email) {
  if (!supabaseAdmin || !email) return null
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', email).maybeSingle()
  return data || null
}

async function syncApprovedProfile(link) {
  if (!supabaseAdmin || link?.status !== 'approved') return
  await supabaseAdmin
    .from('profiles')
    .update({ university: link.university_name || link.university_email, updated_at: new Date().toISOString() })
    .eq('email', link.requester_email)
}

export async function GET(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)
    const email = clean(user?.email).toLowerCase()
    if (!email || !['student', 'owner', 'university'].includes(normalizeRole(role))) {
      return NextResponse.json({ links: [] }, { status: 403 })
    }

    if (supabaseAdmin) {
      const query = supabaseAdmin.from('university_links').select('*')
      const scoped = normalizeRole(role) === 'university'
        ? query.eq('university_email', email)
        : query.eq('requester_email', email)
      const { data, error } = await scoped.order('created_at', { ascending: false })
      if (!error) return NextResponse.json({ links: data || [] })
    }

    const links = normalizeRole(role) === 'university'
      ? fallbackLinks.filter((link) => link.university_email === email)
      : fallbackLinks.filter((link) => link.requester_email === email)
    return NextResponse.json({ links: responseLinks(links) })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unable to load university links' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)
    const requesterRole = normalizeRole(role)
    const requesterEmail = clean(user?.email).toLowerCase()
    if (!requesterEmail || !['student', 'owner'].includes(requesterRole)) {
      return NextResponse.json({ error: 'Only students and owners can request a university link.' }, { status: 403 })
    }

    const body = await request.json()
    const universityEmail = clean(body.university_email).toLowerCase()
    if (!universityEmail) return NextResponse.json({ error: 'Select a university.' }, { status: 400 })

    const universityProfile = await getProfile(universityEmail)
    if (supabaseAdmin && (!universityProfile || normalizeRole(universityProfile.role) !== 'university')) {
      return NextResponse.json({ error: 'Selected account is not a university.' }, { status: 400 })
    }

    const link = {
      requester_id: user.id || requesterEmail,
      requester_email: requesterEmail,
      requester_role: requesterRole,
      university_id: universityProfile?.id || null,
      university_email: universityEmail,
      university_name: clean(body.university_name) || universityProfile?.institution_name || universityProfile?.full_name || universityEmail,
      status: 'pending',
      decision_note: null,
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('university_links').insert([link]).select().single()
      if (!error) return NextResponse.json({ link: data }, { status: 201 })
      if (!String(error.message || '').toLowerCase().includes('does not exist')) {
        if (error.code === '23505') return NextResponse.json({ error: 'A pending request already exists.' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const duplicate = fallbackLinks.find((item) => item.requester_email === requesterEmail && item.university_email === universityEmail && item.status === 'pending')
    if (duplicate) return NextResponse.json({ error: 'A pending request already exists.' }, { status: 409 })
    const saved = { ...link, id: `link-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    fallbackLinks = [saved, ...fallbackLinks]
    return NextResponse.json({ link: saved }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unable to request university link' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)
    const universityEmail = clean(user?.email).toLowerCase()
    if (normalizeRole(role) !== 'university' || !universityEmail) {
      return NextResponse.json({ error: 'Only universities can approve or reject link requests.' }, { status: 403 })
    }

    const body = await request.json()
    const id = clean(body.id)
    const status = clean(body.status).toLowerCase()
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'A link id and decision are required.' }, { status: 400 })
    }

    const decision = { status, decision_note: clean(body.decision_note) || null, updated_at: new Date().toISOString() }
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('university_links')
        .update(decision)
        .eq('id', id)
        .eq('university_email', universityEmail)
        .eq('status', 'pending')
        .select()
        .single()
      if (!error) {
        await syncApprovedProfile(data)
        return NextResponse.json({ link: data })
      }
      if (!String(error.message || '').toLowerCase().includes('does not exist')) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const index = fallbackLinks.findIndex((link) => String(link.id) === id && link.university_email === universityEmail)
    if (index < 0) return NextResponse.json({ error: 'Link request not found.' }, { status: 404 })
    fallbackLinks[index] = { ...fallbackLinks[index], ...decision }
    if (status === 'approved') {
      fallbackLinks[index].profile_university = fallbackLinks[index].university_name || universityEmail
    }
    return NextResponse.json({ link: fallbackLinks[index] })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unable to update university link' }, { status: 500 })
  }
}
