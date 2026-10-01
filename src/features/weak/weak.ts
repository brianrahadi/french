/**
 * Finds the learner's weak spots from the mistake log, drill statistics and
 * flashcard lapses. Recent mistakes weigh more; a run of right answers since
 * the last mistake means the spot is improving.
 */
import { LESSON_BY_ID } from '../../data/grammar'
import { findWord } from '../../data/vocab'
import { VERB_BY_INF } from '../../data/verbs'
import type { Word } from '../../data/types'
import { TENSE_BY_ID, type Tense } from '../../lib/conjugate'
import type { ListenCategory } from '../../lib/french'
import type { Mistake, MistakeSource, State } from '../../lib/store'
import { DAY, LIMITS, lessonScores, liveMistakes, verbScores, wordLapses } from './count'

export { decay } from './count'

export interface WeakLesson {
  lessonId: string
  title: string
  score: number
  count: number
  sources: Partial<Record<MistakeSource, number>>
  examples: Mistake[]
  improving: boolean
}

export interface WeakVerb {
  inf: string
  tense: Tense
  label: string
  accuracy: number
  seen: number
}

export interface WeakWord {
  word: Word
  lapses: number
}

export interface WeakSummary {
  lessons: WeakLesson[]
  verbs: WeakVerb[]
  words: WeakWord[]
  listening: { category: ListenCategory; count: number }[]
  /** Corrections from writing and conversation that can be practiced again. */
  fixables: Mistake[]
  recent: Mistake[]
  /** Number of distinct weak spots (lessons + verb/tense pairs + words). */
  total: number
}

export function computeWeakSpots(s: Pick<State, 'mistakes' | 'skills' | 'conj' | 'cards' | 'customWords'>, now = Date.now()): WeakSummary {
  const live = liveMistakes(s.mistakes, now)

  const lessons: WeakLesson[] = lessonScores(live, s.skills, now)
    .filter((l) => LESSON_BY_ID[l.lessonId])
    .slice(0, LIMITS.lessons)
    .map((l) => {
      const sources: Partial<Record<MistakeSource, number>> = {}
      for (const m of l.mistakes) sources[m.source] = (sources[m.source] ?? 0) + 1
      return {
        lessonId: l.lessonId,
        title: LESSON_BY_ID[l.lessonId].title,
        score: l.score,
        count: l.mistakes.length,
        sources,
        examples: l.mistakes.slice(0, 3),
        improving: l.improving,
      }
    })

  const verbs: WeakVerb[] = verbScores(s.conj)
    .filter((v) => VERB_BY_INF[v.inf] && TENSE_BY_ID[v.tense as Tense])
    .slice(0, LIMITS.verbs)
    .map((v) => ({ ...v, tense: v.tense as Tense, label: TENSE_BY_ID[v.tense as Tense].label }))

  const words: WeakWord[] = []
  for (const { wordId, lapses } of wordLapses(s.cards, now)) {
    const word = findWord(wordId, s.customWords)
    if (word) words.push({ word, lapses })
    if (words.length >= LIMITS.words) break
  }

  const counts = new Map<ListenCategory, number>()
  for (const m of live)
    if (m.skill.startsWith('listen:') && now - new Date(m.at).getTime() < 30 * DAY) {
      const c = m.skill.slice(7) as ListenCategory
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  const listening = [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)

  // Corrections to practice again — one per distinct fix.
  const seenFix = new Set<string>()
  const fixables = live.filter((m) => {
    if (!m.fixable || now - new Date(m.at).getTime() > 30 * DAY) return false
    const k = `${m.given.toLowerCase()}→${m.expected.toLowerCase()}`
    if (seenFix.has(k)) return false
    seenFix.add(k)
    return true
  })

  return {
    lessons,
    verbs,
    words,
    listening,
    fixables,
    recent: live.slice(0, 40),
    total: lessons.length + verbs.length + words.length,
  }
}
