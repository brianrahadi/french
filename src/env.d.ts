/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd.supabase.co — enables sign-in and sync. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable key (sb_publishable_…). Safe to ship in the browser. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Legacy name for the same key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
