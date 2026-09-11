import { supabaseAdmin } from '@/utils/supabase/admin'
import { getAuthenticatedRequestContext } from '@/lib/permissions'

const isMissingTableError = (error) => {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || /Could not find the table .*marketplace_items/i.test(message)
}

export async function GET(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return Response.json({ items: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('marketplace_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      throw error
    }

    return Response.json({ items: data || [] })
  } catch (error) {
    if (isMissingTableError(error)) {
      console.error('Marketplace table missing. Run the SQL migration in Supabase: sql/create_marketplace_items_table.sql')
      return Response.json({ items: [], error: 'Marketplace table not found. Run the SQL migration in Supabase before posting items.' }, { status: 500 })
    }

    console.warn('Marketplace read failed', error)
    return Response.json({ items: [] })
  }
}

export async function POST(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user?.email) {
      return Response.json({ error: 'User email not found' }, { status: 400 })
    }

    const body = await request.json()
    const payload = {
      title: String(body?.title || '').trim(),
      description: String(body?.description || '').trim(),
      price: String(body?.price || 'Free').trim(),
      media_type: ['image', 'video'].includes(body?.media_type) ? body.media_type : 'image',
      media_url: String(body?.media_url || '').trim(),
      seller_name: String(body?.seller_name || user?.user_metadata?.full_name || user?.email || 'Student seller').trim(),
      seller_email: String(body?.seller_email || user?.email || '').trim(),
      created_at: new Date().toISOString(),
    }

    if (!payload.title || !payload.description) {
      return Response.json({ error: 'Title and description are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return Response.json({ item: payload }, { status: 201 })
    }

    const { data, error } = await supabaseAdmin.from('marketplace_items').insert([payload]).select()
    if (error) {
      console.error('Marketplace insert error:', error)
      throw error
    }

    return Response.json({ item: data?.[0] || payload }, { status: 201 })
  } catch (error) {
    if (isMissingTableError(error)) {
      console.error('Marketplace table missing. Run the SQL migration in Supabase: sql/create_marketplace_items_table.sql')
      return Response.json({ error: 'Marketplace table not found. Run the SQL migration in Supabase before posting items.' }, { status: 500 })
    }

    console.error('Marketplace create failed:', error?.message || error)
    return Response.json({ error: error?.message || 'Unable to create item' }, { status: 500 })
  }
}
