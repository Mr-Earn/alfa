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

  let query = supabaseAdmin
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (listingId) {
    query = query.eq('listing_id', listingId);
  }

  if (role === 'student') {
    query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
  } else {
    query = query.or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ messages: data || [] });
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
  const listingId = body?.listing_id ?? null;
  let receiverEmail = String(body?.receiver_email || '').trim();
  const receiverId = body?.receiver_id ?? null;
  const message = String(body?.message || '').trim();

  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  if (!receiverEmail && !receiverId && listingId && role === 'student') {
    const listingTableName = await getListingTableName();
    if (listingTableName) {
      const { data: listingData } = await supabaseAdmin
        .from(listingTableName)
        .select('createdby')
        .eq('id', listingId)
        .maybeSingle();
      receiverEmail = listingData?.createdBy || '';
    }
  }

  if (!receiverEmail && !receiverId) {
    return Response.json({ error: 'Receiver email or receiver id is required' }, { status: 400 });
  }

  const insertPayload = {
    listing_id: listingId,
    sender_id: user.id,
    sender_email: user.email,
    sender_role: normalizeRole(role),
    receiver_id: receiverId,
    receiver_email: receiverEmail,
    receiver_role: role === 'student' ? 'owner' : 'student',
    message,
  };

  const { data, error } = await supabaseAdmin.from('chat_messages').insert([insertPayload]).select();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: data?.[0] || insertPayload }, { status: 201 });
}
