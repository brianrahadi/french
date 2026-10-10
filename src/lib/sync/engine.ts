/**
 * Cloud sync with Supabase and Google sign-in.
 *
 * Each signed-in learner has one row in the `progress` table (protected by
 * row-level security) holding their progress document, gzip-compressed. The
 * app pulls when it opens, when the tab comes back into view, every 30 seconds
 * while visible and whenever another device writes (realtime). It pushes once
 * the learner pauses for a few seconds (at least every two minutes while
 * studying non-stop) and right away when the tab is hidden. Pulled data is merged item
 * by item with what's on this device, and writes use a version number so two
 * devices can't overwrite each other.
 *
 * The Supabase client is loaded only when sync is configured, so the app stays
 * small and works fully offline without it.
 */
import { create } from 'zustand'
import type { RealtimeChannel, SupabaseClient, User } from '@supabase/supabase-js'
import { useStore } from '../store'
import { DEVICE_ID } from '../device'
import { AUTH_KEY, getClient as connect, syncConfigured } from './client'
import { applyDoc, docKey, mergeDocs, normalizeDoc, toDoc } from './merge'
import { pack, unpack } from './pack'
import { schedulePublish, stopPublishing } from './profiles'

export { syncConfigured }

export type SyncState = 'off' | 'starting' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncUser {
  id: string
  email: string
  name: string
  /** Name from the Google account, if it has one (name falls back to the email). */
  fullName?: string
  avatar?: string
}

interface SyncStatus {
  state: SyncState
  user: SyncUser | null
  lastSyncAt: string | null
  error: string
}

export const useSync = create<SyncStatus>(() => ({
  state: syncConfigured ? 'starting' : 'off',
  user: null,
  lastSyncAt: null,
  error: '',
}))

const TABLE = 'progress'
/** Save after this long without changes… */
const PUSH_IDLE = 10_000
/** …but at least this often while studying non-stop. */
const PUSH_MAX_WAIT = 120_000
const POLL_MS = 30_000

let client: SupabaseClient | null = null
let userId: string | null = null
let remoteVersion = 0
let lastSynced = ''
let applying = false
let pushTimer = 0
let pendingSince = 0
let pollTimer = 0
let busy: Promise<void> | null = null
let again = false
let channel: RealtimeChannel | null = null
let unsubscribeStore: (() => void) | null = null
let started = false
/** True while the learner signs out on purpose (any other sign-out is unexpected). */
let leaving = false

/** The user in the saved session, even when its token couldn't be refreshed yet. */
function storedUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? ((JSON.parse(raw) as { user?: User }).user ?? null) : null
  } catch {
    return null
  }
}

/** Asks the browser not to clear this site's storage (and with it the sign-in) when space runs low. */
function keepStorage() {
  try {
    void navigator.storage?.persist?.()
  } catch {
    /* not supported */
  }
}

const status = (patch: Partial<SyncStatus>) => useSync.setState(patch)

async function getClient(): Promise<SupabaseClient> {
  client ??= await connect()
  return client
}

function toUser(u: User): SyncUser {
  const meta = (u.user_metadata ?? {}) as Record<string, string>
  return {
    id: u.id,
    email: u.email ?? '',
    name: meta.full_name ?? meta.name ?? u.email ?? 'You',
    fullName: meta.full_name ?? meta.name,
    avatar: meta.avatar_url ?? meta.picture,
  }
}

function friendly(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e)
  if (/fetch|network|Failed to/i.test(msg)) return 'Can’t reach the sync server. Your progress is saved on this device and will sync when you’re back online.'
  if (/relation .*progress.* does not exist|42P01/i.test(msg)) return 'The sync table is missing. Run supabase/schema.sql in your Supabase project (see README).'
  if (/JWT|token|401|403/i.test(msg)) return 'Your sign-in expired. Please sign in again.'
  return msg
}

/**
 * Runs one sync step at a time. Anything requested meanwhile is covered by one
 * more pull afterwards (a pull also saves local changes).
 */
function serial(task: () => Promise<void>): Promise<void> {
  if (busy) {
    again = true
    return busy
  }
  busy = (async () => {
    try {
      await task()
      while (again) {
        again = false
        await pull()
      }
    } finally {
      busy = null
    }
  })()
  return busy
}

/**
 * Remembers which account this device last synced with. The first sync with an
 * account merges what was studied here into it, even if the account's progress
 * was reset or restored since (which would otherwise replace it).
 */
const JOINED_KEY = 'petit-a-petit-sync-account'
function joined(): boolean {
  try {
    return localStorage.getItem(JOINED_KEY) === userId
  } catch {
    return true
  }
}
function setJoined(id: string | null) {
  try {
    if (id) localStorage.setItem(JOINED_KEY, id)
    else localStorage.removeItem(JOINED_KEY)
  } catch {
    /* ignore */
  }
}

async function pull(): Promise<void> {
  if (!client || !userId) return
  status({ state: 'syncing' })
  const { data, error } = await client.from(TABLE).select('data, version').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) {
    remoteVersion = 0
    await write(toDoc(useStore.getState()))
  } else {
    remoteVersion = data.version as number
    const remote = normalizeDoc(await unpack(data.data))
    // From here to applying the result there is no await, so nothing studied meanwhile can be lost.
    const mine = toDoc(useStore.getState())
    const local = joined() ? mine : { ...mine, sync: { ...mine.sync, epoch: remote.sync.epoch, epochAt: remote.sync.epochAt } }
    const merged = mergeDocs(local, remote)
    const mergedKey = docKey(merged)
    if (mergedKey !== docKey(mine)) {
      applying = true
      useStore.setState(applyDoc(useStore.getState(), merged))
      applying = false
    }
    if (mergedKey !== docKey(remote)) await write(merged)
    else lastSynced = mergedKey
  }
  setJoined(userId)
}

/** Saves a document with a version check; on conflict, pulls (merging) and tries again. */
async function write(doc: ReturnType<typeof toDoc>): Promise<void> {
  if (!client || !userId) return
  const key = docKey(doc)
  if (key === lastSynced) return
  if (remoteVersion === 0) {
    const { error } = await client.from(TABLE).insert({ user_id: userId, data: await pack(doc), version: 1, device: DEVICE_ID })
    if (error) {
      if (error.code === '23505') return pull() // someone else created it first
      throw error
    }
    remoteVersion = 1
  } else {
    const { data, error } = await client
      .from(TABLE)
      .update({ data: await pack(doc), version: remoteVersion + 1, device: DEVICE_ID, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('version', remoteVersion)
      .select('version')
    if (error) throw error
    if (!data?.length) return pull() // another device saved in between
    remoteVersion = data[0].version as number
  }
  lastSynced = key
}

function done() {
  status({ state: 'synced', lastSyncAt: new Date().toISOString(), error: '' })
  // Share the latest numbers on People (throttled; only when they changed).
  const user = useSync.getState().user
  if (user && user.id === userId) schedulePublish(user)
}

function fail(e: unknown) {
  status({ state: navigator.onLine === false ? 'offline' : 'error', error: friendly(e) })
}

/** Pull and merge now. */
export function syncNow(): Promise<void> {
  return serial(pull).then(done, fail)
}

/** Push local changes now (if any). */
export function pushNow(): Promise<void> {
  clearTimeout(pushTimer)
  pendingSince = 0
  if (!userId) return Promise.resolve()
  return serial(async () => {
    if (docKey(toDoc(useStore.getState())) === lastSynced) return
    status({ state: 'syncing' })
    await write(toDoc(useStore.getState()))
  }).then(done, fail)
}

/** Cheap check for changes from other devices. */
async function checkRemote() {
  if (!client || !userId || busy || document.visibilityState !== 'visible') return
  try {
    const { data } = await client.from(TABLE).select('version').eq('user_id', userId).maybeSingle()
    if (data && (data.version as number) > remoteVersion) await syncNow()
  } catch {
    /* next check will try again */
  }
}

/** Every 30 s: look for changes from other devices, or retry after a failed sync. */
function poll() {
  const { state } = useSync.getState()
  if (state === 'error' || state === 'offline') void syncNow()
  else void checkRemote()
}

function onVisibility() {
  if (document.visibilityState === 'hidden') void pushNow()
  else void checkRemote()
}

function onOnline() {
  void syncNow()
}

function onPageHide() {
  void pushNow()
}

function startWatching() {
  unsubscribeStore?.()
  unsubscribeStore = useStore.subscribe(() => {
    if (applying || !userId) return
    const now = Date.now()
    pendingSince ||= now
    clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => void pushNow(), Math.min(PUSH_IDLE, Math.max(0, pendingSince + PUSH_MAX_WAIT - now)))
  })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', checkRemote)
  window.addEventListener('online', onOnline)
  window.addEventListener('pagehide', onPageHide)
  clearInterval(pollTimer)
  pollTimer = window.setInterval(poll, POLL_MS)
  if (client && userId) {
    channel = client
      .channel(`progress:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new as { version?: number; device?: string } | undefined
        if (row && row.device !== DEVICE_ID && (row.version ?? 0) > remoteVersion) void syncNow()
      })
      .subscribe()
  }
}

function stopWatching() {
  unsubscribeStore?.()
  unsubscribeStore = null
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('focus', checkRemote)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('pagehide', onPageHide)
  clearInterval(pollTimer)
  clearTimeout(pushTimer)
  pendingSince = 0
  if (channel && client) void client.removeChannel(channel)
  channel = null
}

function signedIn(u: User) {
  if (userId === u.id) return
  userId = u.id
  keepStorage()
  remoteVersion = 0
  lastSynced = ''
  status({ user: toUser(u), state: 'syncing', error: '' })
  startWatching()
  void syncNow()
}

function signedOut() {
  stopWatching()
  stopPublishing()
  setJoined(null)
  userId = null
  status({ user: null, state: 'signed-out', lastSyncAt: null })
}

/** Where to go back to after the Google redirect (the app always returns to its start page). */
const RETURN_KEY = 'petit-a-petit-return'
const CALLBACK_PARAMS = ['code', 'sb_flow_id', 'error', 'error_code', 'error_description']

/**
 * Called once when the app starts. Also completes a Google sign-in redirect,
 * resolving to the page the learner signed in from (to navigate back to).
 */
export async function initSync(): Promise<string | null> {
  if (!syncConfigured || started) return null
  started = true
  let back: string | null = null
  const url = new URL(location.href)
  const fromRedirect = CALLBACK_PARAMS.some((p) => url.searchParams.has(p))
  try {
    const c = await getClient()
    const { data, error } = await c.auth.getSession()
    const user = data.session?.user
    if (fromRedirect) {
      // Tidy the address bar (Supabase removes ?code itself only when sign-in worked).
      const now = new URL(location.href)
      for (const p of CALLBACK_PARAMS) now.searchParams.delete(p)
      history.replaceState(history.state, '', now.pathname + now.search + now.hash)
      const path = takeReturnPath()
      if (!user) {
        const reason = url.searchParams.get('error_description')
        status({
          error: reason
            ? `Google sign-in didn’t finish: ${reason.replace(/\+/g, ' ')}`
            : 'Google sign-in didn’t finish. Please try again in this browser.',
        })
      }
      back = path
    }
    // The session is saved but its token couldn't be refreshed right now (offline, server
    // waking up): stay signed in; Supabase keeps retrying and reports TOKEN_REFRESHED.
    const saved = !user && error ? storedUser() : null
    if (error && !saved) status({ error: friendly(error) })
    c.auth.onAuthStateChange((event, session) => {
      // Supabase advises not to call it from inside this callback, so defer.
      setTimeout(() => {
        if (session?.user) signedIn(session.user)
        else if (event === 'SIGNED_OUT') {
          if (!leaving) {
            console.warn('[sync] signed out by the auth server (refresh token expired or revoked)')
            status({ error: 'You were signed out because your sign-in expired. Sign in again to keep syncing.' })
          }
          signedOut()
        }
      })
    })
    if (user) signedIn(user)
    else if (saved) status({ user: toUser(saved), state: 'offline' })
    else status({ state: 'signed-out' })
  } catch (e) {
    status({ state: 'error', error: friendly(e) })
  }
  return back
}

function takeReturnPath(): string | null {
  try {
    const p = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    return p && p.startsWith('/') && p !== '/' ? p : null
  } catch {
    return null
  }
}

/**
 * Where Google sign-in comes back to: the live site (VITE_SITE_URL) everywhere
 * except local development, which comes back to itself. Supabase only accepts
 * addresses listed under Authentication → URL Configuration → Redirect URLs.
 */
function redirectUrl(): string {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  const site = import.meta.env.VITE_SITE_URL as string | undefined
  return !local && site ? site : new URL(import.meta.env.BASE_URL, location.origin).href
}

export async function signInWithGoogle(): Promise<void> {
  status({ error: '' })
  const base = import.meta.env.BASE_URL
  try {
    // The page to come back to, relative to the app (e.g. /settings#account).
    const path = location.pathname.startsWith(base) ? '/' + location.pathname.slice(base.length) : '/'
    sessionStorage.setItem(RETURN_KEY, path + location.hash)
  } catch {
    /* ignore */
  }
  try {
    const c = await getClient()
    const { error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl(), queryParams: { prompt: 'select_account' } },
    })
    if (error) throw error
  } catch (e) {
    status({ error: friendly(e) })
  }
}

/** Signs out after saving; progress stays on this device. */
export async function signOut(): Promise<void> {
  await pushNow().catch(() => {})
  const c = await getClient()
  leaving = true
  try {
    // Only this device: stay signed in on the others.
    await c.auth.signOut({ scope: 'local' })
  } finally {
    leaving = false
  }
  signedOut()
}
