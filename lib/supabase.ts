import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseAnonKey) {
  throw new Error('Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Public client: safe for browser usage.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)
// Backward-compatible export name (public client).
export const supabase = supabasePublic

// Service-role client: server only. Never import in client components.
type SupabaseClient = ReturnType<typeof createClient>
let supabaseService: SupabaseClient

if (typeof window === 'undefined') {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY')
  }
  supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey)
} else {
  // Stub to prevent client-side crashes; should never be used in the browser.
  supabaseService = null as unknown as SupabaseClient
}

export { supabaseService }
