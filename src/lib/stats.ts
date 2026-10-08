/**
 * Profile numbers: how far you are through each level, and the weekly/monthly
 * recap of what you studied and how it compares with the period before.
 */
import { LESSON_BY_ID, LESSONS } from '../data/grammar'
import { AUDIO_LESSONS } from '../data/audio'
import { SCENARIOS } from '../data/scenarios'
import { STORIES } from '../data/stories'
import { BUILTIN_TEXTS } from '../data/texts'
import { THEMED_DECKS } from '../data/vocab'
import { WRITING_PROMPTS } from '../data/writing'
import type { Level } from '../data/types'
import { STUDY_SKILLS, type DayActivity, type State, type StudySkill } from './store'
import { lessonDone, storyDone } from './level'
import { dayKey } from './date'

export interface Tally {
  done: number
  total: number
}

/** Whole percent done; 1% as soon as anything is done, 100% only when everything is. */
export const percent = ({ done, total }: Tally): number => (!total || !done ? 0 : Math.max(1, Math.floor((done / total) * 100)))

type Course = Pick<State, 'lessons' | 'read' | 'stories' | 'audio' | 'introduced' | 'conversations' | 'writings'>

/**
 * How much of one level's material is done, per skill: words of its themed decks
 * started, lessons passed, texts read, prompts written, stories and audio lessons
 * finished, role-plays talked through.
 */
export function levelSections(level: Level, s: Course): Record<StudySkill, Tally> {
  const at = <T extends { level: Level }>(xs: T[]) => xs.filter((x) => x.level === level)
  const tally = <T>(xs: T[], done: (x: T) => boolean): Tally => ({ done: xs.filter(done).length, total: xs.length })
  const words = [...new Set(at(THEMED_DECKS).flatMap((d) => d.words.map((w) => w.id)))]
  const written = new Set(s.writings.map((w) => w.promptId))
  const talked = new Set(s.conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  const stories = tally(at(STORIES), (x) => storyDone(s, x.id))
  const audio = tally(at(AUDIO_LESSONS), (x) => !!s.audio?.[x.id]?.done)
  return {
    vocabulary: tally(words, (id) => !!s.introduced[id]),
    grammar: tally(at(LESSONS), (x) => lessonDone(s, x.id)),
    reading: tally(at(BUILTIN_TEXTS), (x) => !!s.read[x.id]),
    writing: tally(at(WRITING_PROMPTS), (x) => written.has(x.id)),
    listening: { done: stories.done + audio.done, total: stories.total + audio.total },
    speaking: tally(at(SCENARIOS), (x) => talked.has(x.id)),
  }
}

/** A week (Monday to Sunday) or a calendar month. */
export type PeriodKind = 'week' | 'month'
export interface Period {
  kind: PeriodKind
  /** First day, at local midnight. */
  start: Date
}

export function periodOf(kind: PeriodKind, d: Date = new Date()): Period {
  if (kind === 'month') return { kind, start: new Date(d.getFullYear(), d.getMonth(), 1) }
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return { kind, start }
}

export function shiftPeriod(p: Period, n: number): Period {
  const d = new Date(p.start)
  if (p.kind === 'month') d.setMonth(d.getMonth() + n)
  else d.setDate(d.getDate() + 7 * n)
  return { kind: p.kind, start: d }
}

export const samePeriod = (a: Period, b: Period) => a.kind === b.kind && a.start.getTime() === b.start.getTime()

/** Every day of the period, in order. */
export function periodDays(p: Period): Date[] {
  const n = p.kind === 'week' ? 7 : new Date(p.start.getFullYear(), p.start.getMonth() + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => new Date(p.start.getFullYear(), p.start.getMonth(), p.start.getDate() + i))
}

/** "October 2026" or "Sep 28 – Oct 4". `short` is for chart axes: "O" or "28/9". */
export function periodLabel(p: Period, short = false): string {
  if (p.kind === 'month')
    return p.start.toLocaleDateString('en', short ? { month: 'narrow' } : { month: 'long', year: 'numeric' })
  if (short) return `${p.start.getDate()}/${p.start.getMonth() + 1}`
  const end = shiftPeriod(p, 1).start
  end.setDate(end.getDate() - 1)
  const f = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  return `${f(p.start)} – ${f(end)}`
}

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

export interface Recap {
  period: Period
  /** Day keys with any activity. */
  activeDays: string[]
  answers: number
  correct: number
  newWords: number
  skills: Record<StudySkill, number>
}

export function recap(s: Stats, p: Period, bySkill = skillsByDay(s)): Recap {
  const skills = Object.fromEntries(STUDY_SKILLS.map((k) => [k, 0])) as Record<StudySkill, number>
  const activeDays: string[] = []
  let answers = 0
  let correct = 0
  let newWords = 0
  for (const day of periodDays(p).map((d) => dayKey(d))) {
    const a: DayActivity | undefined = s.activity[day]
    const sk = bySkill[day]
    if (a?.items || (sk && Object.values(sk).some(Boolean))) activeDays.push(day)
    answers += a?.items ?? 0
    correct += a?.correct ?? 0
    newWords += a?.newWords ?? 0
    for (const k of STUDY_SKILLS) skills[k] += sk?.[k] ?? 0
  }
  return { period: p, activeDays, answers, correct, newWords, skills }
}

/** Answers per period, oldest first, ending with `last`. */
export function answersHistory(s: Pick<State, 'activity'>, last: Period, count = 12): { period: Period; answers: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const period = shiftPeriod(last, i - count + 1)
    const answers = periodDays(period).reduce((n, d) => n + (s.activity[dayKey(d)]?.items ?? 0), 0)
    return { period, answers }
  })
}
