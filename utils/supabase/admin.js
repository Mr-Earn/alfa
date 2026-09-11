import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  console.warn('Supabase admin client not configured: set SUPABASE_SERVICE_ROLE in env')
}

export const supabaseAdmin = supabaseUrl && supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, { auth: { persistSession: false } })
  : null
