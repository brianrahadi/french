/**
 * Monthly recap numbers for the profile: what you studied, how much, and how it
 * compares with the month before.
 */
import { LESSON_BY_ID } from '../data/grammar'
import { STUDY_SKILLS, type DayActivity, type State, type StudySkill } from './store'
import { dayKey } from './date'

export type Month = { year: number; month: number } // month: 0–11

export const monthOf = (d: Date): Month => ({ year: d.getFullYear(), month: d.getMonth() })
export const addMonths = (m: Month, n: number): Month => monthOf(new Date(m.year, m.month + n, 1))
export const sameMonth = (a: Month, b: Month) => a.year === b.year && a.month === b.month
export const monthPrefix = (m: Month) => `${m.year}-${String(m.month + 1).padStart(2, '0')}`
export const daysIn = (m: Month) => new Date(m.year, m.month + 1, 0).getDate()
export const monthLabel = (m: Month, style: 'long' | 'short' | 'narrow' = 'long') =>
  new Date(m.year, m.month, 1).toLocaleDateString('en', style === 'long' ? { month: 'long', year: 'numeric' } : { month: style })

type Stats = Pick<State, 'activity' | 'cards' | 'lessons' | 'read' | 'stories' | 'writings' | 'conversations' | 'audio' | 'listening' | 'speaking'>

/**
 * Items per skill for each day. Days recorded since skills were tracked use that;
 * older days are estimated from what has a date (texts read, stories, writings…).
 */
export function skillsByDay(s: Stats): Record<string, Partial<Record<StudySkill, number>>> {
  const out: Record<string, Partial<Record<StudySkill, number>>> = {}
  const tracked = (day: string) => !!s.activity[day]?.skills
  const add = (iso: string | undefined, skill: StudySkill, n: number) => {
    if (!iso || n <= 0) return
    const day = iso.length === 10 ? iso : dayKey(new Date(iso))
    if (tracked(day)) return
    const d = (out[day] ??= {})
    d[skill] = (d[skill] ?? 0) + n
  }
  for (const [day, a] of Object.entries(s.activity)) if (a.skills) out[day] = { ...a.skills }
  for (const c of Object.values(s.cards)) add(c.last_review, 'vocabulary', 1)
  for (const [id, p] of Object.entries(s.lessons)) add(p.lastAt, 'grammar', LESSON_BY_ID[id]?.exercises.length ?? 10)
  for (const day of Object.values(s.read)) add(day, 'reading', 6)
  for (const st of Object.values(s.stories ?? {})) add(st.at, 'listening', 5)
  for (const st of Object.values(s.listening)) add(st.at, 'listening', 1)
  for (const a of Object.values(s.audio ?? {})) add(a.at, 'listening', a.done ? 20 : 5)
  for (const st of Object.values(s.speaking)) add(st.at, 'speaking', 1)
  for (const w of s.writings) add(w.createdAt, 'writing', Math.max(1, Math.round(w.words / 10)))
  for (const c of s.conversations) add(c.updatedAt, 'speaking', c.turns.filter((t) => t.role === 'me').length)
  return out
}

export interface MonthRecap {
  month: Month
  /** Days with any activity (1-based day numbers). */
  activeDays: number[]
  answers: number
  correct: number
  newWords: number
  skills: Record<StudySkill, number>
}

export function monthRecap(s: Stats, m: Month, bySkill = skillsByDay(s)): MonthRecap {
  const prefix = monthPrefix(m) + '-'
  const skills = Object.fromEntries(STUDY_SKILLS.map((k) => [k, 0])) as Record<StudySkill, number>
  const days = new Set<number>()
  let answers = 0
  let correct = 0
  let newWords = 0
  for (const [day, a] of Object.entries(s.activity) as [string, DayActivity][]) {
    if (!day.startsWith(prefix) || !a.items) continue
    days.add(Number(day.slice(8)))
    answers += a.items
    correct += a.correct
    newWords += a.newWords
  }
  for (const [day, d] of Object.entries(bySkill)) {
    if (!day.startsWith(prefix)) continue
    days.add(Number(day.slice(8)))
    for (const k of STUDY_SKILLS) skills[k] += d[k] ?? 0
  }
  return { month: m, activeDays: [...days].sort((a, b) => a - b), answers, correct, newWords, skills }
}

/** Answers per month, oldest first, ending with `last`. */
export function answersByMonth(s: Pick<State, 'activity'>, last: Month, count = 12): { month: Month; answers: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const m = addMonths(last, i - count + 1)
    const prefix = monthPrefix(m) + '-'
    let answers = 0
    for (const [day, a] of Object.entries(s.activity)) if (day.startsWith(prefix)) answers += a.items
    return { month: m, answers }
  })
}
