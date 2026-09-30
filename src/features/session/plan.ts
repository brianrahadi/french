import { LESSON_BY_ID, LESSONS } from '../../data/grammar'
import type { State } from '../../lib/store'
import { dueCardIds, newAvailableToday, newWordQueue } from '../vocab/selectors'
import { dueLessons, lessonStatus } from '../grammar/status'
import { makeDrill, poolFor, type DrillItem } from '../conjugation/drill'

export type MixedItem =
  | { kind: 'intro'; wordId: string }
  | { kind: 'card'; id: string }
  | { kind: 'grammar'; lessonId: string; index: number; review: boolean; retry?: boolean }
  | { kind: 'conj'; item: DrillItem; retry?: boolean }

export interface MixedPlan {
  items: MixedItem[]
  counts: { reviews: number; newWords: number; grammar: number; conj: number; moreReviews: number }
  /** Lessons due for spaced review whose exercises are in this session. */
  reviewLessons: string[]
  minutes: number
}

/** How much of each kind goes into one daily session. */
export const MIX = { maxReviews: 25, maxNew: 5, grammar: 5, conj: 5, perReviewLesson: 3, maxReviewLessons: 2 }

function sample<T>(arr: T[], n: number, rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/**
 * Spread several lists evenly through one sequence, so the session alternates
 * between kinds of practice instead of doing them in blocks (interleaving).
 */
export function interleave<T>(lists: T[][]): T[] {
  return lists
    .flatMap((l, li) => l.map((it, i) => ({ it, key: (i + 0.5) / l.length + li * 1e-3 })))
    .sort((a, b) => a.key - b.key)
    .map((t) => t.it)
}

export function buildMixedPlan(s: State, rand: () => number = Math.random): MixedPlan {
  // ── vocabulary: oldest-due reviews first, a few new words woven in
  const due = dueCardIds(s.cards, s.customWords)
  const reviews = due.slice(0, MIX.maxReviews)
  const fresh = newWordQueue(s).slice(0, Math.min(MIX.maxNew, newAvailableToday(s)))
  const vocab: MixedItem[] = []
  let ni = 0
  reviews.forEach((id, i) => {
    vocab.push({ kind: 'card', id })
    if ((i + 1) % 4 === 0 && ni < fresh.length) vocab.push({ kind: 'intro', wordId: fresh[ni++].id })
  })
  while (ni < fresh.length) vocab.push({ kind: 'intro', wordId: fresh[ni++].id })

  // ── grammar: spaced reviews of due lessons, then extra practice from lessons already studied
  const grammar: MixedItem[] = []
  const reviewLessons = dueLessons(s.lessons).slice(0, MIX.maxReviewLessons)
  for (const l of reviewLessons) {
    const idx = sample(
      l.exercises.map((_, i) => i),
      MIX.perReviewLesson,
      rand,
    )
    for (const index of idx) grammar.push({ kind: 'grammar', lessonId: l.id, index, review: true })
  }
  if (grammar.length < MIX.grammar) {
    const reviewed = new Set(reviewLessons.map((l) => l.id))
    const studied = LESSONS.filter((l) => s.lessons[l.id] && !reviewed.has(l.id))
    // Lessons not yet mastered first — they need the practice most.
    const ordered = [
      ...sample(studied.filter((l) => lessonStatus(s.lessons[l.id]) === 'started'), studied.length, rand),
      ...sample(studied.filter((l) => lessonStatus(s.lessons[l.id]) !== 'started'), studied.length, rand),
    ]
    let k = 0
    while (grammar.length < MIX.grammar && ordered.length && k < MIX.grammar * 3) {
      const l = ordered[k % ordered.length]
      const index = Math.floor(rand() * l.exercises.length)
      if (!grammar.some((g) => g.kind === 'grammar' && g.lessonId === l.id && g.index === index))
        grammar.push({ kind: 'grammar', lessonId: l.id, index, review: false })
      k++
    }
  }
  // Keep each lesson's review items apart from each other.
  const grammarMixed = interleave(
    [...new Set(grammar.map((g) => (g as { lessonId: string }).lessonId))].map((id) =>
      grammar.filter((g) => (g as { lessonId: string }).lessonId === id),
    ),
  )

  // ── conjugation: a short adaptive drill from the learner's usual settings
  const tenses = s.conjConfig.tenses.length ? s.conjConfig.tenses : ['present' as const]
  const conj: MixedItem[] = makeDrill(poolFor(s.conjConfig), tenses, s.conj, MIX.conj, rand).map((item) => ({
    kind: 'conj',
    item,
  }))

  const items = interleave([vocab, grammarMixed, conj])
  const minutes = Math.max(1, Math.round(reviews.length * 0.25 + fresh.length * 0.6 + grammar.length * 0.5 + conj.length * 0.35))
  return {
    items,
    counts: {
      reviews: reviews.length,
      newWords: fresh.length,
      grammar: grammar.length,
      conj: conj.length,
      moreReviews: Math.max(0, due.length - reviews.length),
    },
    reviewLessons: reviewLessons.map((l) => l.id),
    minutes,
  }
}

export function lessonTitle(id: string): string {
  return LESSON_BY_ID[id]?.title ?? id
}
