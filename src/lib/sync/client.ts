/**
 * The one Supabase client, shared by sync and the People page. It's loaded
 * only when sync is configured, so the app stays small without it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const syncConfigured = !!(URL_ && KEY)

/** Where Supabase keeps the session (access + refresh token) in this browser. */
export const AUTH_KEY = 'petit-a-petit-auth'

let pending: Promise<SupabaseClient> | null = null

export function getClient(): Promise<SupabaseClient> {
  pending ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, KEY!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_KEY },
    }),
  )
  return pending
}
