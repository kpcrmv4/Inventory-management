import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Note: We use untyped client here for flexibility.
// Row types are defined in ../types/database.ts and used directly in app code.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
