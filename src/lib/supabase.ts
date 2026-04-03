import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'vizion-auth-v2', // nouvelle clé = reset propre de toute session corrompue
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'vizion/1.0',
    },
  },
})
