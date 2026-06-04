// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: any = null

export async function getSupabase() {
  if (supabaseClient) return supabaseClient
  const { createClient } = await import("@supabase/supabase-js")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not found, using mock client")
    supabaseClient = createClient("https://dummy.supabase.co", "dummy-key")
  } else {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}
