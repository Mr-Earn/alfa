
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase client not configured. Auth actions will be disabled until env vars are provided.')
    return {
      auth: {
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase client not configured') }),
        signUp: async () => ({ data: null, error: new Error('Supabase client not configured') }),
        updateUser: async () => ({ data: null, error: new Error('Supabase client not configured') }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
    }
  }

  return createClient(supabaseUrl, supabaseKey)
}

export const supabase = createSupabaseClient()