import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL")
}
if (!supabaseAnonKey) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Public client: safe for browser usage.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)
// Backward-compatible export name (public client).
export const supabase = supabasePublic

// Service-role client: server only. Never import in client components.
type SupabaseClient = ReturnType<typeof createClient>

const createServiceClientStub = (reason: string): SupabaseClient =>
  new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(reason)
    },
  })

// Use `any` to avoid leaking table typings across API routes; callers can refine as needed.
let supabaseService: any

if (typeof window === "undefined") {
  if (supabaseServiceRoleKey) {
    supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  } else {
    console.warn(
      "Missing env SUPABASE_SERVICE_ROLE_KEY; using anon key with limited permissions."
    )
    supabaseService = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
} else {
  supabaseService = createServiceClientStub("supabaseService is only available on the server.")
}

export { supabaseService }
export const getSupabaseService = () => supabaseService
