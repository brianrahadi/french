/**
 * People: each signed-in learner's public profile (name, picture and a
 * snapshot of their progress numbers) in the `profiles` table. Signed-in
 * learners can read every listed profile; only you can change yours.
 *
 * Your snapshot is published shortly after each sync, at most once a minute,
 * and only when something in it changed. Your progress document itself stays
 * private (see engine.ts).
 */
import { useStore } from '../store'
import { cleanName, parseStats, parseSummary, profileStats, profileSummary, safeAvatar, type ProfileStats, type ProfileSummary } from '../profile'
import { getClient } from './client'
import { stable } from './merge'

const TABLE = 'profiles'
const MIN_GAP = 60_000

export interface Person {
  id: string
  name: string
  avatar?: string
  /** Shown on the People page (you always see your own profile). */
  listed: boolean
  joinedAt: string
  /** When the snapshot was last published. */
  updatedAt: string
  summary: ProfileSummary | null
}

export interface PersonProfile extends Person {
  stats: ProfileStats | null
}

/** The profiles table hasn't been created yet (supabase/schema.sql not run since People was added). */
export class NotSetUpError extends Error {
  constructor() {
    super('People isn’t set up on the server yet. Run supabase/schema.sql again in the Supabase SQL Editor (see README).')
  }
}

function check(error: { code?: string; message?: string } | null): void {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205' || /relation .*profiles.* does not exist|Could not find the table/i.test(error.message ?? ''))
    throw new NotSetUpError()
  throw Object.assign(new Error(error.message ?? 'Couldn’t load people.'), { code: error.code })
}

const LIST_COLUMNS = 'user_id, name, avatar_url, listed, summary, joined_at, updated_at'

function toPerson(r: Record<string, unknown>): Person {
  return {
    id: String(r.user_id),
    name: cleanName(r.name),
    avatar: safeAvatar(r.avatar_url),
    listed: r.listed !== false,
    joinedAt: String(r.joined_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
    summary: parseSummary(r.summary),
  }
}

/** Everyone listed, plus yourself. */
export async function listPeople(): Promise<Person[]> {
  const c = await getClient()
  const { data, error } = await c.from(TABLE).select(LIST_COLUMNS).order('updated_at', { ascending: false }).limit(1000)
  check(error)
  return (data ?? []).map(toPerson)
}

/** One learner's profile, or null if there's none (or it's hidden). */
export async function getPerson(id: string): Promise<PersonProfile | null> {
  const c = await getClient()
  const { data, error } = await c.from(TABLE).select(`${LIST_COLUMNS}, stats`).eq('user_id', id).maybeSingle()
  check(error)
  return data ? { ...toPerson(data), stats: parseStats(data.stats) } : null
}

/** Show or hide yourself on the People page. */
export async function setListed(userId: string, listed: boolean): Promise<void> {
  const c = await getClient()
  const { data, error } = await c.from(TABLE).update({ listed }).eq('user_id', userId).select('user_id')
  check(error)
  if (!data?.length) {
    // No profile yet (signed up before the table existed and never synced since).
    const { error: e2 } = await c.from(TABLE).insert({ user_id: userId, listed })
    check(e2)
  }
}

// ───────────── Publishing your own snapshot ─────────────

interface Me {
  id: string
  /** Name from the Google account (never the email). */
  fullName?: string
  avatar?: string
}

let me: Me | null = null
let timer = 0
let lastAt = 0
let lastKey = ''

/** Remembers what was last published from this browser, so opening the app doesn't re-upload the same snapshot. */
const PUBLISHED_KEY = 'petit-a-petit-profile-published'
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36) + s.length.toString(36)
}
function savedKey(userId: string): string {
  try {
    const [id, k] = (localStorage.getItem(PUBLISHED_KEY) ?? '').split(':')
    return id === userId ? (k ?? '') : ''
  } catch {
    return ''
  }
}
function saveKey(userId: string, k: string) {
  try {
    localStorage.setItem(PUBLISHED_KEY, `${userId}:${k}`)
  } catch {
    /* ignore */
  }
}
/** The table is missing: stop trying until the app is reloaded. */
let disabled = false

/** Called after every successful sync. */
export function schedulePublish(user: Me): void {
  if (me?.id !== user.id) {
    lastKey = savedKey(user.id)
    lastAt = 0
  }
  me = user
  if (timer || disabled) return
  timer = window.setTimeout(
    () => {
      timer = 0
      void publish()
    },
    Math.max(0, lastAt + MIN_GAP - Date.now()),
  )
}

/** On sign-out. */
export function stopPublishing(): void {
  clearTimeout(timer)
  timer = 0
  me = null
  lastKey = ''
}

async function publish(): Promise<void> {
  const user = me
  if (!user) return
  const s = useStore.getState()
  const stats = profileStats(s)
  const row = {
    name: cleanName(user.fullName),
    avatar_url: user.avatar ?? null,
    summary: profileSummary(stats, s),
    stats,
  }
  const key = hash(stable(row))
  if (key === lastKey) return
  lastAt = Date.now()
  try {
    const c = await getClient()
    const { error } = await c.from(TABLE).upsert({ user_id: user.id, ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    check(error)
    if (me?.id === user.id) lastKey = key
    saveKey(user.id, key)
  } catch (e) {
    if (e instanceof NotSetUpError) disabled = true
    console.warn('[people] couldn’t share your profile:', (e as Error).message)
  }
}
