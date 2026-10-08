/**
 * Study time: how long you actually spent working in each part of the app.
 *
 * Time is counted while a study page is open, visible and in use (you typed,
 * clicked, scrolled or the app spoke in the last two minutes), in seconds per
 * page kind per day. Each device keeps its own tally, so syncing adds devices
 * up instead of double-counting them.
 */
import { addDays, dayKey, parseDayKey } from './date'
import type { DayActivity, State, StudySkill } from './store'

/** What you were doing, from the page you were on. */
export type TimeKey = 'session' | 'vocab' | 'verbs' | 'weak' | 'grammar' | 'stories' | 'dictation' | 'audio' | 'reading' | 'writing' | 'talk' | 'speaking'
export const TIME_KEYS: TimeKey[] = ['session', 'vocab', 'verbs', 'weak', 'grammar', 'stories', 'dictation', 'audio', 'reading', 'writing', 'talk', 'speaking']

/** Seconds per page kind, for one day. */
export type DayTime = Partial<Record<TimeKey, number>>
/** device id → day (dayKey) → seconds per page kind. */
export type StudyTimeLog = Record<string, Record<string, DayTime>>

/** The parts of the roadmap that time and progress are reported in. */
export type Area = 'review' | 'grammar' | 'listening' | 'reading' | 'writing' | 'speaking'
export const AREAS: Area[] = ['review', 'grammar', 'listening', 'reading', 'writing', 'speaking']
export const AREA_LABEL: Record<Area, string> = {
  review: 'Review & vocabulary',
  grammar: 'Grammar',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}
export const AREA_OF: Record<TimeKey, Area> = {
  session: 'review',
  vocab: 'review',
  verbs: 'review',
  weak: 'review',
  grammar: 'grammar',
  stories: 'listening',
  dictation: 'listening',
  audio: 'listening',
  reading: 'reading',
  writing: 'writing',
  talk: 'speaking',
  speaking: 'speaking',
}

const ROUTES: [RegExp, TimeKey][] = [
  [/^\/session(\/|$)/, 'session'],
  [/^\/vocab(\/|$)/, 'vocab'],
  [/^\/(conjugation|verbs)(\/|$)/, 'verbs'],
  [/^\/weak(\/|$)/, 'weak'],
  [/^\/grammar(\/|$)/, 'grammar'],
  [/^\/listening\/story\//, 'stories'],
  [/^\/(dictation|listening\/session)(\/|$)/, 'dictation'],
  [/^\/audio\//, 'audio'],
  [/^\/reading\//, 'reading'],
  [/^\/writing\//, 'writing'],
  [/^\/talk\//, 'talk'],
  [/^\/speaking(\/|$)/, 'speaking'],
]

/** The kind of study a page is, or null for pages that aren't study (Today, Library, Roadmap, Settings…). */
export function timeKeyFor(pathname: string): TimeKey | null {
  for (const [re, key] of ROUTES) if (re.test(pathname)) return key
  return null
}

/** Adds seconds to one device's day. */
export function addTime(log: StudyTimeLog, device: string, day: string, add: DayTime): StudyTimeLog {
  const days = log[device] ?? {}
  const cur = { ...(days[day] ?? {}) }
  for (const [k, n] of Object.entries(add) as [TimeKey, number][]) if (n > 0) cur[k] = Math.round((cur[k] ?? 0) + n)
  return { ...log, [device]: { ...days, [day]: cur } }
}

/** Two copies of the log: each device's counts only grow, so the larger one is the newer. */
export function mergeTime(a: StudyTimeLog = {}, b: StudyTimeLog = {}): StudyTimeLog {
  const out: StudyTimeLog = {}
  for (const src of [a, b])
    for (const [dev, days] of Object.entries(src)) {
      const mine = (out[dev] ??= {})
      for (const [day, t] of Object.entries(days)) {
        const cur = (mine[day] = { ...(mine[day] ?? {}) })
        for (const [k, n] of Object.entries(t) as [TimeKey, number][]) cur[k] = Math.max(cur[k] ?? 0, n)
      }
    }
  return out
}

/** Time per day across all devices. */
export function sumTime(log: StudyTimeLog = {}): Record<string, DayTime> {
  const out: Record<string, DayTime> = {}
  for (const days of Object.values(log))
    for (const [day, t] of Object.entries(days)) {
      const cur = (out[day] ??= {})
      for (const [k, n] of Object.entries(t) as [TimeKey, number][]) cur[k] = (cur[k] ?? 0) + n
    }
  return out
}

export type AreaTime = Partial<Record<Area, number>>

export const toAreas = (t: DayTime): AreaTime => {
  const out: AreaTime = {}
  for (const [k, n] of Object.entries(t) as [TimeKey, number][]) out[AREA_OF[k]] = (out[AREA_OF[k]] ?? 0) + n
  return out
}

/** First day with any tracked time, or null before tracking started. */
export function trackingSince(log: StudyTimeLog = {}): string | null {
  let first: string | null = null
  for (const days of Object.values(log)) for (const day of Object.keys(days)) if (!first || day < first) first = day
  return first
}

type Records = Pick<State, 'activity' | 'writings' | 'conversations' | 'stories' | 'read' | 'audio'> & { studyTime?: StudyTimeLog }

/** Rough seconds per answer, by skill, for days before time was tracked. */
const PER_ANSWER: Record<StudySkill, number> = { vocabulary: 9, grammar: 20, reading: 20, writing: 20, listening: 20, speaking: 15 }
const SKILL_AREA: Record<StudySkill, Area> = { vocabulary: 'review', grammar: 'grammar', reading: 'reading', writing: 'writing', listening: 'listening', speaking: 'speaking' }

/**
 * An estimate of the time spent on days before tracking started, from what was
 * recorded: answers (by skill when known), corrected writings, finished
 * conversations, stories, texts and audio lessons. Deliberately on the low side.
 */
export function estimatedTime(s: Records): Record<string, AreaTime> {
  const since = trackingSince(s.studyTime)
  const out: Record<string, AreaTime> = {}
  const add = (iso: string | undefined, area: Area, sec: number) => {
    if (!iso || sec <= 0) return
    const day = iso.length === 10 ? iso : dayKey(new Date(iso))
    if (since && day >= since) return
    const d = (out[day] ??= {})
    d[area] = (d[area] ?? 0) + sec
  }
  for (const [day, a] of Object.entries(s.activity) as [string, DayActivity][]) {
    if (a.skills) {
      let rest = a.items
      for (const [k, n] of Object.entries(a.skills) as [StudySkill, number][]) {
        add(day, SKILL_AREA[k], n * PER_ANSWER[k])
        rest -= n
      }
      add(day, 'review', Math.max(0, rest) * PER_ANSWER.vocabulary)
    } else add(day, 'review', a.items * PER_ANSWER.vocabulary)
  }
  for (const w of s.writings) add(w.createdAt, 'writing', (w.minutes ?? Math.max(10, Math.round(w.words / 5))) * 60)
  for (const c of s.conversations) add(c.updatedAt, 'speaking', c.turns.filter((t) => t.role === 'me').length * 60)
  for (const st of Object.values(s.stories ?? {})) add(st.at, 'listening', 8 * 60)
  for (const day of Object.values(s.read)) add(day, 'reading', 10 * 60)
  for (const a of Object.values(s.audio ?? {})) if (a.done) add(a.done, 'listening', 12 * 60)
  return out
}

export interface TimeTotals {
  /** Seconds per area. */
  areas: Record<Area, number>
  total: number
  /** Part of the total that is estimated (days before tracking). */
  estimated: number
}

const emptyAreas = (): Record<Area, number> => ({ review: 0, grammar: 0, listening: 0, reading: 0, writing: 0, speaking: 0 })

/** Time per area between two days (inclusive; open-ended when left out), tracked plus estimated. */
export function timeTotals(s: Records, from?: string, to?: string, est = estimatedTime(s)): TimeTotals {
  const areas = emptyAreas()
  let estimated = 0
  const inRange = (day: string) => (!from || day >= from) && (!to || day <= to)
  for (const [day, t] of Object.entries(sumTime(s.studyTime)))
    if (inRange(day)) for (const [a, n] of Object.entries(toAreas(t)) as [Area, number][]) areas[a] += n
  for (const [day, t] of Object.entries(est))
    if (inRange(day))
      for (const [a, n] of Object.entries(t) as [Area, number][]) {
        areas[a] += n
        estimated += n
      }
  return { areas, total: Object.values(areas).reduce((x, y) => x + y, 0), estimated }
}

/** Seconds tracked per day for the last `n` days, oldest first, ending today. */
export function recentDays(s: Records, n: number, today = new Date()): { day: string; areas: Record<Area, number>; total: number }[] {
  const est = estimatedTime(s)
  const tracked = sumTime(s.studyTime)
  return Array.from({ length: n }, (_, i) => {
    const day = dayKey(addDays(today, i - n + 1))
    const areas = emptyAreas()
    for (const [a, x] of Object.entries(toAreas(tracked[day] ?? {})) as [Area, number][]) areas[a] += x
    for (const [a, x] of Object.entries(est[day] ?? {}) as [Area, number][]) areas[a] += x
    return { day, areas, total: Object.values(areas).reduce((x, y) => x + y, 0) }
  })
}

/** "1 h 25", "40 min", "0 min". */
export function formatDuration(sec: number): string {
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Hours with one decimal below 10 h ("3.5"), whole hours above ("42"). */
export function formatHours(sec: number): string {
  const h = sec / 3600
  return h < 10 ? (Math.round(h * 10) / 10).toString() : Math.round(h).toString()
}

/** The Monday-to-Sunday days of the week containing `d`. */
export function weekDays(d = new Date()): string[] {
  const monday = addDays(parseDayKey(dayKey(d)), -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i)))
}
