/**
 * A learner's profile in numbers: what the Profile page draws. Built from your
 * own progress for /profile, and shared (as a snapshot, never the progress
 * itself) so other signed-in learners can open your profile from People.
 *
 * Snapshots from other people are untrusted, so reading one checks every field
 * and drops anything that doesn't fit.
 */
import { LEVELS, type Level } from '../data/types'
import { addDays, dayKey, parseDayKey } from './date'
import { currentLevel, levelProgress } from './level'
import { levelSections, skillsByDay, type Tally } from './stats'
import { computeStreak, STUDY_SKILLS, type DayActivity, type State, type StudySkill } from './store'

export type SkillDays = Record<string, Partial<Record<StudySkill, number>>>

export interface ProfileStats {
  v: 1
  level: Level
  /** Share of each level done (whole percent). */
  levels: Record<Level, number>
  /** Per level and skill: how much of the material is done. */
  sections: Record<Level, Record<StudySkill, Tally>>
  /** Every day with study: answers, right answers, new words, and items per skill (estimated for days before skills were tracked). */
  days: Record<string, DayActivity>
}

/** The few numbers shown in the People list. */
export interface ProfileSummary {
  level: Level
  /** Words started (flashcards). */
  words: number
  /** Days with any study. */
  studyDays: number
  /** Last day with answers (the learner's own calendar), or null. */
  lastDay: string | null
  /** Streak ending on lastDay. */
  streak: number
}

type Source = Parameters<typeof skillsByDay>[0] & Parameters<typeof levelSections>[1] & Parameters<typeof currentLevel>[0]

export function profileStats(s: Source): ProfileStats {
  const bySkill = skillsByDay(s)
  const days: Record<string, DayActivity> = {}
  for (const day of new Set([...Object.keys(s.activity), ...Object.keys(bySkill)])) {
    const a = s.activity[day]
    const sk = bySkill[day]
    const skills = sk && Object.values(sk).some(Boolean) ? { ...sk } : undefined
    if (!a?.items && !skills) continue
    days[day] = { items: a?.items ?? 0, correct: a?.correct ?? 0, newWords: a?.newWords ?? 0, ...(skills ? { skills } : {}) }
  }
  return {
    v: 1,
    level: currentLevel(s),
    levels: Object.fromEntries(LEVELS.map((l) => [l, Math.floor(levelProgress(l, s) * 100)])) as Record<Level, number>,
    sections: Object.fromEntries(LEVELS.map((l) => [l, levelSections(l, s)])) as Record<Level, Record<StudySkill, Tally>>,
    days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => (a < b ? -1 : 1))),
  }
}

export function profileSummary(stats: ProfileStats, s: Pick<State, 'introduced'>): ProfileSummary {
  const answered = Object.keys(stats.days).filter((d) => stats.days[d].items > 0)
  const lastDay = answered.length ? answered[answered.length - 1] : null
  return {
    level: stats.level,
    words: Object.keys(s.introduced).length,
    studyDays: Object.keys(stats.days).length,
    lastDay,
    streak: lastDay ? computeStreak(stats.days, parseDayKey(lastDay)) : 0,
  }
}

/** Items per skill per day, as the recap and skill mix use them. */
export function daySkills(days: Record<string, DayActivity>): SkillDays {
  const out: SkillDays = {}
  for (const [day, a] of Object.entries(days)) if (a.skills) out[day] = a.skills
  return out
}

/** The streak as it stands today: it only counts while the last study day is today or yesterday. */
export function liveStreak(sum: Pick<ProfileSummary, 'lastDay' | 'streak'>, now = new Date()): number {
  return sum.lastDay && sum.lastDay >= dayKey(addDays(now, -1)) ? sum.streak : 0
}

// ───────────── Reading someone else's snapshot ─────────────

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
/** A whole number within 0..max (anything else is 0). */
const num = (x: unknown, max = 1e9): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(0, Math.round(x))) : 0)
const level = (x: unknown): Level | null => (LEVELS.includes(x as Level) ? (x as Level) : null)

function skillCounts(x: unknown): Partial<Record<StudySkill, number>> | undefined {
  if (!isObj(x)) return undefined
  const out: Partial<Record<StudySkill, number>> = {}
  for (const k of STUDY_SKILLS) if (x[k] !== undefined) out[k] = num(x[k])
  return Object.keys(out).length ? out : undefined
}

export function parseStats(raw: unknown): ProfileStats | null {
  if (!isObj(raw) || raw.v !== 1) return null
  const lv = level(raw.level)
  if (!lv) return null
  const levels = isObj(raw.levels) ? raw.levels : {}
  const sections = isObj(raw.sections) ? raw.sections : {}
  const days: Record<string, DayActivity> = {}
  if (isObj(raw.days))
    for (const [day, a] of Object.entries(raw.days)) {
      if (!DAY.test(day) || !isObj(a)) continue
      const skills = skillCounts(a.skills)
      days[day] = { items: num(a.items), correct: num(a.correct), newWords: num(a.newWords), ...(skills ? { skills } : {}) }
    }
  return {
    v: 1,
    level: lv,
    levels: Object.fromEntries(LEVELS.map((l) => [l, num(levels[l], 100)])) as Record<Level, number>,
    sections: Object.fromEntries(
      LEVELS.map((l) => {
        const row = isObj(sections[l]) ? sections[l] : {}
        return [
          l,
          Object.fromEntries(
            STUDY_SKILLS.map((k) => {
              const t = isObj(row[k]) ? row[k] : {}
              const total = num(t.total)
              return [k, { done: Math.min(num(t.done), total), total }]
            }),
          ),
        ]
      }),
    ) as Record<Level, Record<StudySkill, Tally>>,
    days,
  }
}

export function parseSummary(raw: unknown): ProfileSummary | null {
  if (!isObj(raw)) return null
  const lv = level(raw.level)
  if (!lv) return null
  return {
    level: lv,
    words: num(raw.words),
    studyDays: num(raw.studyDays),
    lastDay: typeof raw.lastDay === 'string' && DAY.test(raw.lastDay) ? raw.lastDay : null,
    streak: num(raw.streak, 100_000),
  }
}

/**
 * Only Google profile pictures are shown: any other address could be a
 * tracking image that tells its owner who looked at the profile.
 */
export function safeAvatar(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'googleusercontent.com' || u.hostname.endsWith('.googleusercontent.com')) ? u.href : undefined
  } catch {
    return undefined
  }
}

/** A display name: trimmed, one line, not too long. */
export function cleanName(x: unknown): string {
  const s = typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : ''
  return s ? (s.length > 60 ? `${s.slice(0, 59)}…` : s) : 'Learner'
}
