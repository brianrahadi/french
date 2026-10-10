/**
 * Admin dashboard data: every learner's account and a summary of their synced
 * progress. The list comes from the `admin_users` database function, which
 * only answers the admin emails listed in supabase/schema.sql — this list only
 * decides who sees the link in the app.
 */
import type { Level } from '../../data/types'
import { addDays, dayKey } from '../../lib/date'
import { currentLevel } from '../../lib/level'
import { computeStreak } from '../../lib/store'
import { getClient } from '../../lib/sync/engine'
import { normalizeDoc, sumActivity, type SyncDoc } from '../../lib/sync/merge'
import { unpack } from '../../lib/sync/pack'

export { ADMIN_EMAILS, isAdminEmail } from './access'

/** One row from `admin_users()`. */
export interface AdminRow {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  provider: string | null
  created_at: string
  last_sign_in_at: string | null
  progress_at: string | null
  version: number | null
  device: string | null
  data: unknown
}

export interface Progress {
  level: Level
  startLevel: Level | null
  /** Flashcards being studied. */
  words: number
  lessonsPassed: number
  textsRead: number
  writings: number
  conversations: number
  /** Answered items, all time. */
  answers: number
  /** Share of answers that were right (0..1), or null with no answers. */
  accuracy: number | null
  answers7d: number
  activeDays: number
  streak: number
  /** Last day with at least one answer (dayKey), or null. */
  lastActiveDay: string | null
  /** Devices that have studied on this account. */
  devices: number
  /** Answers per day (dayKey → items), for the activity chart. */
  daily: Record<string, number>
}

export interface Learner {
  id: string
  email: string
  name: string
  avatar?: string
  provider: string
  joined: string
  lastSignIn: string | null
  lastSave: string | null
  /** Null when the learner never synced, or their progress couldn't be read. */
  progress: Progress | null
  error?: string
}

/** Summarises a learner's synced progress document. */
export function summarize(raw: unknown, now = new Date()): Progress {
  const doc: SyncDoc = normalizeDoc(raw)
  const activity = sumActivity(doc.sync.devices ?? {})
  const days = Object.keys(activity)
    .filter((k) => activity[k].items > 0)
    .sort()
  let answers = 0
  let correct = 0
  for (const a of Object.values(activity)) {
    answers += a.items
    correct += a.correct
  }
  const weekStart = dayKey(addDays(now, -6))
  const today = dayKey(now)
  let answers7d = 0
  for (const k of days) if (k >= weekStart && k <= today) answers7d += activity[k].items
  const daily = Object.fromEntries(days.map((k) => [k, activity[k].items]))
  return {
    level: currentLevel({ startLevel: doc.startLevel, lessons: doc.lessons ?? {}, read: doc.read ?? {}, stories: doc.stories ?? {} }),
    startLevel: doc.startLevel,
    words: Object.keys(doc.cards ?? {}).length,
    lessonsPassed: Object.values(doc.lessons ?? {}).filter((l) => (l?.best ?? 0) >= 0.7).length,
    textsRead: Object.keys(doc.read ?? {}).length,
    writings: (doc.writings ?? []).length,
    conversations: Object.keys(doc.talkLog ?? {}).length,
    answers,
    accuracy: answers ? correct / answers : null,
    answers7d,
    activeDays: days.length,
    streak: computeStreak(activity, now),
    lastActiveDay: days.at(-1) ?? null,
    devices: Object.keys(doc.sync.devices ?? {}).length,
    daily,
  }
}

export async function toLearner(r: AdminRow, now = new Date()): Promise<Learner> {
  const base: Learner = {
    id: r.id,
    email: r.email ?? '',
    name: r.name || r.email || 'Unnamed',
    avatar: r.avatar ?? undefined,
    provider: r.provider ?? 'email',
    joined: r.created_at,
    lastSignIn: r.last_sign_in_at,
    lastSave: r.progress_at,
    progress: null,
  }
  if (r.data == null) return base
  try {
    return { ...base, progress: summarize(await unpack(r.data), now) }
  } catch (e) {
    return { ...base, error: (e as Error)?.message ?? 'Unreadable progress' }
  }
}

export async function loadLearners(): Promise<Learner[]> {
  const c = await getClient()
  const { data, error } = await c.rpc('admin_users')
  if (error) {
    if (error.code === '42501' || /not allowed/i.test(error.message)) throw new Error('This account isn’t an admin.')
    if (error.code === 'PGRST202' || /admin_users/i.test(error.message))
      throw new Error('The admin function is missing. Run supabase/schema.sql again in the Supabase SQL Editor.')
    throw error
  }
  const now = new Date()
  return Promise.all(((data ?? []) as AdminRow[]).map((r) => toLearner(r, now)))
}

/** Learners active (answered something) on each of the last `n` days, oldest first. */
export function dailyActive(learners: Learner[], n = 30, now = new Date()): { day: string; label: string; learners: number; answers: number }[] {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(now, -i)
    const k = dayKey(d)
    let active = 0
    let answers = 0
    for (const l of learners) {
      const items = l.progress?.daily[k] ?? 0
      if (items) {
        active++
        answers += items
      }
    }
    out.push({ day: k, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), learners: active, answers })
  }
  return out
}

/** "Today", "Yesterday", "3 days ago", or a date. */
export function ago(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '—'
  const day = iso.length === 10 ? iso : dayKey(new Date(iso))
  const today = dayKey(now)
  if (day === today) return 'Today'
  if (day === dayKey(addDays(now, -1))) return 'Yesterday'
  for (let i = 2; i < 7; i++) if (day === dayKey(addDays(now, -i))) return `${i} days ago`
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(y !== now.getFullYear() ? { year: 'numeric' } : {}) })
}
