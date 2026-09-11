import { promises as fs } from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { getAuthenticatedRequestContext } from '@/lib/permissions'

const storagePath = path.join(process.cwd(), 'data', 'messages.json')

const defaultStore = {
  messages: [
    { id: 1, sender: 'system@platform', sender_name: 'System', body: 'Welcome to the messaging demo.', created_at: new Date().toISOString() },
  ],
}

async function readStore() {
  try {
    await fs.mkdir(path.dirname(storagePath), { recursive: true })
    const file = await fs.readFile(storagePath, 'utf8')
    return JSON.parse(file)
  } catch (error) {
    return defaultStore
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(storagePath), { recursive: true })
  await fs.writeFile(storagePath, JSON.stringify(store, null, 2), 'utf8')
}

export async function GET(request) {
  try {
    const { user, role } = await getAuthenticatedRequestContext(request)

    // If Supabase admin is configured, try to fetch from DB
    if (supabaseAdmin) {
      try {
        const email = (user?.email || '').toLowerCase()
        // fetch messages where user is sender or recipient
        const { data, error } = await supabaseAdmin
          .from('messages')
          .select('*')
          .or(`sender.eq.${email},recipient.eq.${email}`)
          .order('created_at', { ascending: false })
          .limit(200)
        if (error) throw error
        return Response.json({ messages: data || [] })
      } catch (err) {
        console.warn('Supabase messages read failed, falling back to file store', err)
      }
    }

    const store = await readStore()
    const email = (user?.email || '').toLowerCase()
    const messages = email
      ? (store.messages || []).filter((message) => (
        String(message?.sender || '').toLowerCase() === email
        || String(message?.recipient || '').toLowerCase() === email
      ))
      : []
    return Response.json({ messages })
  } catch (error) {
    return Response.json({ error: error?.message || 'Unable to load messages' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { user } = await getAuthenticatedRequestContext(request)

    const next = {
      id: Date.now(),
      sender: (user?.email || body.sender || 'anonymous'),
      sender_name: (user?.user_metadata?.full_name || body.sender_name || user?.email || 'Anonymous'),
      recipient: body.recipient || null,
      recipient_name: body.recipient_name || null,
      body: body.body || '',
      created_at: new Date().toISOString(),
    }

    if (supabaseAdmin) {
      try {
        const insertRes = await supabaseAdmin.from('messages').insert([next]).select()
        if (insertRes.error) throw insertRes.error
        // return messages for this user (sent or received)
        const email = (user?.email || '').toLowerCase()
        const fetched = await supabaseAdmin.from('messages').select('*').or(`sender.eq.${email},recipient.eq.${email}`).order('created_at', { ascending: false }).limit(200)
        if (fetched.error) throw fetched.error
        return Response.json({ messages: fetched.data || [] }, { status: 201 })
      } catch (err) {
        console.warn('Supabase messages write failed, falling back to file store', err)
      }
    }

    const store = await readStore()
    store.messages = [next, ...(store.messages || [])]
    await writeStore(store)
    const email = (user?.email || next.sender || '').toLowerCase()
    const messages = store.messages.filter((message) => (
      String(message?.sender || '').toLowerCase() === email
      || String(message?.recipient || '').toLowerCase() === email
    ))
    return Response.json({ messages }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error?.message || 'Unable to save message' }, { status: 500 })
  }
}
