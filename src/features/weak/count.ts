/**
 * The scoring behind Weak spots, without any course data imports — so the
 * navigation badge can use it without pulling lessons and decks into the main bundle.
 */
import { parseCardId, type StoredCard } from '../../lib/srs'
import type { ConjStat, Mistake, MistakeSource, State } from '../../lib/store'

export const DAY = 86_400_000
const HALF_LIFE_DAYS = 14
export const WEIGHT: Record<MistakeSource, number> = {
  grammar: 1,
  verbs: 1,
  words: 1,
  writing: 1.2,
  talk: 1,
  listening: 0.5,
  speaking: 0.3,
}
export const LIMITS = { lessons: 8, verbs: 8, words: 12 }
const LESSON_THRESHOLD = 1.2

export const decay = (at: string, now: number) => Math.pow(0.5, (now - new Date(at).getTime()) / DAY / HALF_LIFE_DAYS)

export const recentlyRight = (results: number[] | undefined, n = 3) =>
  !!results && results.length >= n && results.slice(-n).every((r) => r === 1)

/** Unresolved mistakes from the last 60 days. */
export const liveMistakes = (mistakes: Mistake[], now: number) =>
  mistakes.filter((m) => !m.resolved && now - new Date(m.at).getTime() < 60 * DAY)

export interface LessonScore {
  lessonId: string
  score: number
  mistakes: Mistake[]
  improving: boolean
}

export function lessonScores(live: Mistake[], skills: Record<string, number[]>, now: number): LessonScore[] {
  const byLesson = new Map<string, Mistake[]>()
  for (const m of live) {
    if (!m.skill.startsWith('lesson:')) continue
    const id = m.skill.slice(7)
    byLesson.set(id, [...(byLesson.get(id) ?? []), m])
  }
  const out: LessonScore[] = []
  for (const [lessonId, ms] of byLesson) {
    const improving = recentlyRight(skills[`lesson:${lessonId}`])
    let score = ms.reduce((a, m) => a + WEIGHT[m.source] * decay(m.at, now), 0)
    if (improving) score *= 0.4
    if (score >= LESSON_THRESHOLD) out.push({ lessonId, score, mistakes: ms, improving })
  }
  return out.sort((a, b) => b.score - a.score)
}

export interface VerbScore {
  inf: string
  tense: string
  accuracy: number
  seen: number
}

export function verbScores(conj: Record<string, ConjStat>): VerbScore[] {
  const out: VerbScore[] = []
  for (const [key, stat] of Object.entries(conj)) {
    if (stat.recent.length < 3) continue
    const accuracy = stat.recent.reduce((a, b) => a + b, 0) / stat.recent.length
    if (accuracy >= 0.75 || recentlyRight(stat.recent)) continue
    const [inf, tense] = key.split('|')
    out.push({ inf, tense, accuracy, seen: stat.seen })
  }
  return out.sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen)
}

/** Words forgotten at least twice recently (lapses summed over both directions). */
export function wordLapses(cards: Record<string, StoredCard>, now: number): { wordId: string; lapses: number }[] {
  const lapses = new Map<string, number>()
  for (const [id, c] of Object.entries(cards)) {
    if (!c.lapses) continue
    if (c.last_review && now - new Date(c.last_review).getTime() > 90 * DAY) continue
    const { wordId } = parseCardId(id)
    lapses.set(wordId, (lapses.get(wordId) ?? 0) + c.lapses)
  }
  return [...lapses.entries()]
    .filter(([, n]) => n >= 2)
    .map(([wordId, n]) => ({ wordId, lapses: n }))
    .sort((a, b) => b.lapses - a.lapses)
}

/** Number of weak spots, for badges. */
export function countWeakSpots(s: Pick<State, 'mistakes' | 'skills' | 'conj' | 'cards'>, now = Date.now()): number {
  const live = liveMistakes(s.mistakes, now)
  return (
    Math.min(LIMITS.lessons, lessonScores(live, s.skills, now).length) +
    Math.min(LIMITS.verbs, verbScores(s.conj).length) +
    Math.min(LIMITS.words, wordLapses(s.cards, now).length)
  )
}
