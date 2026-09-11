import { supabaseAdmin } from '@/utils/supabase/admin';
import { getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions';

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
  const { user, role } = await getAuthenticatedRequestContext(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return Response.json({ error: 'Supabase admin client is not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const listingId = url.searchParams.get('listing_id');

  let query = supabaseAdmin.from('lease_requests').select('*').order('created_at', { ascending: false });

  if (role === 'owner') {
    query = query.eq('owner_email', user.email);
  } else if (role === 'student') {
    query = query.eq('student_email', user.email);
  } else if (role === 'university') {
    const { data: approvedLinks, error: linksError } = await supabaseAdmin
      .from('university_links')
      .select('requester_email')
      .eq('university_email', user.email)
      .eq('status', 'approved');

    if (linksError) {
      return Response.json({ error: linksError.message }, { status: 500 });
    }

    const linkedEmails = Array.from(new Set((approvedLinks || [])
      .map((link) => String(link.requester_email || '').trim().toLowerCase())
      .filter(Boolean)));

    if (!linkedEmails.length) {
      return Response.json({ requests: [] });
    }

    query = query.in('student_email', linkedEmails);
  }

  if (listingId) {
    query = query.eq('listing_id', listingId);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ requests: data || [] });
}

export async function POST(request) {
  const { user, role } = await getAuthenticatedRequestContext(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return Response.json({ error: 'Supabase admin client is not configured' }, { status: 503 });
  }

  const body = await request.json();
  const listingId = body?.listing_id || null;
  const listingTitle = body?.listing_title || 'Unknown listing';
  const note = body?.note || '';
  const leaseUrl = body?.lease_url || '';
  const applicationDocumentUrl = body?.application_document_url || '';
  const studentEmail = String(body?.student_email || user.email || '').trim();
  const studentId = body?.student_id || user.id;
  let ownerEmail = String(body?.owner_email || '').trim();
  let status = String(body?.status || (leaseUrl ? 'lease_uploaded' : 'requested'));

  if (!listingId) {
    return Response.json({ error: 'listing_id is required' }, { status: 400 });
  }

  if (!studentEmail) {
    return Response.json({ error: 'student_email is required' }, { status: 400 });
  }

  if (role === 'student') {
    const listingTableName = await getListingTableName();
    if (listingTableName) {
      const { data: listingData } = await supabaseAdmin
        .from(listingTableName)
        .select('createdby, title, address')
        .eq('id', listingId)
        .maybeSingle();

      ownerEmail = listingData?.createdby || listingData?.createdBy || ownerEmail;
    }
  }

  if (!ownerEmail) {
    return Response.json({ error: 'Unable to resolve owner email for lease request' }, { status: 400 });
  }

  const payload = {
    listing_id: listingId,
    listing_title: listingTitle,
    student_id: studentId,
    student_email: studentEmail,
    owner_email: ownerEmail,
    status,
    note,
    application_document_url: applicationDocumentUrl,
    lease_url: leaseUrl,
  };

  const { data, error } = await supabaseAdmin.from('lease_requests').insert([payload]).select();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ request: data?.[0] || payload }, { status: 201 });
}

export async function PUT(request) {
  const { user, role } = await getAuthenticatedRequestContext(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return Response.json({ error: 'Supabase admin client is not configured' }, { status: 503 });
  }

  const body = await request.json();
  const requestId = body?.id || null;

  if (!requestId) {
    return Response.json({ error: 'Lease request id is required' }, { status: 400 });
  }

  const { data: existingRequest, error: existingError } = await supabaseAdmin
    .from('lease_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (existingError || !existingRequest) {
    return Response.json({ error: 'Lease request not found' }, { status: 404 });
  }

  const isOwner = role === 'owner' && String(existingRequest.owner_email || '').toLowerCase() === String(user.email || '').toLowerCase()
  const isStudent = role === 'student' && String(existingRequest.student_email || '').toLowerCase() === String(user.email || '').toLowerCase()
  if (!isOwner && !isStudent) {
    return Response.json({ error: 'You cannot update this lease request' }, { status: 403 });
  }

  const requestedStatus = body?.status || (isOwner ? 'approved' : 'requested')
  const ownerStatuses = ['approved', 'rejected', 'lease_uploaded']
  const studentStatuses = ['requested', 'documents_uploaded']
  if ((isOwner && !ownerStatuses.includes(requestedStatus)) || (isStudent && !studentStatuses.includes(requestedStatus))) {
    return Response.json({ error: 'Invalid status for this user' }, { status: 400 });
  }

  const updateData = {
    status: requestedStatus,
    application_document_url: body?.application_document_url || existingRequest.application_document_url || null,
    lease_url: body?.lease_url || existingRequest.lease_url || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin.from('lease_requests').update(updateData).eq('id', requestId).select();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ request: data?.[0] || updateData });
}
