import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Client-side Supabase client (uses anon key, respects RLS)
export const createSupabaseClient = () =>
  createClientComponentClient<Database>()

// Server-side admin client (uses service role key, bypasses RLS)
// Only used in API routes for admin operations like inviting users
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

