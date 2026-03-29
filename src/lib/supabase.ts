import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Single storage key avoids cross-tab key collisions
    storageKey: 'vizion-auth',
    // Let the SDK manage refresh; suppress 429 by not retrying immediately
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
