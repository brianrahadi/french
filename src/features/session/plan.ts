import { LESSON_BY_ID, LESSONS } from '../../data/grammar'
import type { State } from '../../lib/store'
import { dueCardIds, newAvailableToday, newWordQueue } from '../vocab/selectors'
import { dueLessons, lessonStatus } from '../grammar/status'
import { makeDrill, poolFor, type DrillItem } from '../conjugation/drill'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { cardId } from '../../lib/srs'
import { computeWeakSpots } from '../weak/weak'
import { pickSentences, poolFor as sentencePool } from '../listening/sentences'

export type MixedItem =
  | { kind: 'intro'; wordId: string }
  | { kind: 'card'; id: string }
  | { kind: 'grammar'; lessonId: string; index: number; review: boolean; retry?: boolean; weak?: boolean }
  | { kind: 'conj'; item: DrillItem; retry?: boolean }
  | { kind: 'fix'; mistakeId: string; retry?: boolean }
  | { kind: 'listen'; sentenceId: string }
  | { kind: 'say'; sentenceId: string }

export interface PlanCounts {
  reviews: number
  newWords: number
  grammar: number
  conj: number
  listen: number
  say: number
  fix: number
  /** Items chosen because they target a weak spot. */
  weak: number
  moreReviews: number
}

export interface MixedPlan {
  mode: 'daily' | 'weak'
  items: MixedItem[]
  counts: PlanCounts
  /** Lessons due for spaced review whose exercises are in this session. */
  reviewLessons: string[]
  minutes: number
}

export interface PlanOptions {
  /** Text-to-speech is available (for dictation items). */
  tts?: boolean
  /** Speech recognition is available (for read-aloud items). */
  asr?: boolean
}

/** How much of each kind goes into one daily session. */
export const MIX = {
  maxReviews: 25,
  maxNew: 5,
  grammar: 5,
  conj: 5,
  perReviewLesson: 3,
  maxReviewLessons: 2,
  listen: 2,
  say: 2,
  fix: 2,
  weakLessons: 2,
}

const estimate = (c: Omit<PlanCounts, 'moreReviews' | 'weak'>) =>
  Math.max(1, Math.round(c.reviews * 0.25 + c.newWords * 0.6 + c.grammar * 0.5 + c.conj * 0.35 + c.listen * 0.8 + c.say * 0.7 + c.fix * 0.5))

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

export function buildMixedPlan(s: State, rand: () => number = Math.random, opts: PlanOptions = {}): MixedPlan {
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
  // Weak grammar points (from drills, writing and conversation) get a question each.
  const weak = computeWeakSpots(s)
  let weakCount = 0
  for (const w of weak.lessons.slice(0, MIX.weakLessons)) {
    if (grammar.length >= MIX.grammar || grammar.some((g) => g.kind === 'grammar' && g.lessonId === w.lessonId)) continue
    const l = LESSON_BY_ID[w.lessonId]
    grammar.push({ kind: 'grammar', lessonId: l.id, index: Math.floor(rand() * l.exercises.length), review: false, weak: true })
    weakCount++
  }
  if (grammar.length < MIX.grammar) {
    const reviewed = new Set(grammar.map((g) => (g as { lessonId: string }).lessonId))
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

  // ── corrections from writing / conversation to fix again
  const fix: MixedItem[] = sample(weak.fixables, MIX.fix, rand).map((m) => ({ kind: 'fix', mistakeId: m.id }))

  // ── listening and speaking, with sentences built from the learner's own words
  const sentences = sentencePool('mine', s)
  const listen: MixedItem[] =
    opts.tts && s.settings.sessionListening
      ? pickSentences(sentences, s.listening, MIX.listen, rand).map((x) => ({ kind: 'listen', sentenceId: x.id }))
      : []
  const say: MixedItem[] =
    opts.asr && s.settings.sessionSpeaking
      ? pickSentences(sentences, s.speaking, MIX.say, rand).map((x) => ({ kind: 'say', sentenceId: x.id }))
      : []

  // Only worth a session if something is actually due or new.
  const core = vocab.length + grammar.length + conj.length
  const items = core ? interleave([vocab, grammarMixed, conj, fix, listen, say]) : []
  const counts = {
    reviews: reviews.length,
    newWords: fresh.length,
    grammar: grammar.length,
    conj: conj.length,
    listen: core ? listen.length : 0,
    say: core ? say.length : 0,
    fix: core ? fix.length : 0,
  }
  return {
    mode: 'daily',
    items,
    counts: { ...counts, weak: weakCount + counts.fix, moreReviews: Math.max(0, due.length - reviews.length) },
    reviewLessons: reviewLessons.map((l) => l.id),
    minutes: estimate(counts),
  }
}

/** A session aimed only at weak spots: grammar points, verb forms, slippery words, corrections and misheard sentences. */
export function buildWeakPlan(s: State, rand: () => number = Math.random, opts: PlanOptions = {}): MixedPlan {
  const weak = computeWeakSpots(s)
  const grammar: MixedItem[] = []
  for (const w of weak.lessons.slice(0, 3)) {
    const l = LESSON_BY_ID[w.lessonId]
    for (const index of sample(
      l.exercises.map((_, i) => i),
      3,
      rand,
    ))
      grammar.push({ kind: 'grammar', lessonId: l.id, index, review: false, weak: true })
  }
  const conj: MixedItem[] = []
  for (const v of weak.verbs.slice(0, 5)) {
    const persons = sample(TENSE_BY_ID[v.tense].persons, 2, rand)
    for (const person of persons)
      conj.push({ kind: 'conj', item: { inf: v.inf, tense: v.tense, person, gender: rand() < 0.5 ? 'm' : 'f' } })
  }
  const words: MixedItem[] = weak.words.slice(0, 8).flatMap((w) => {
    const p = cardId(w.word.id, 'p')
    const r = cardId(w.word.id, 'r')
    const id = s.cards[p] ? p : s.cards[r] ? r : null
    return id ? [{ kind: 'card' as const, id }] : []
  })
  const fix: MixedItem[] = weak.fixables.slice(0, 6).map((m) => ({ kind: 'fix', mistakeId: m.id }))
  const refs = [...new Set(weak.recent.filter((m) => m.source === 'listening' && m.ref).map((m) => m.ref!))]
  const listen: MixedItem[] = opts.tts ? refs.slice(0, 3).map((id) => ({ kind: 'listen', sentenceId: id })) : []

  const grammarMixed = interleave(
    [...new Set(grammar.map((g) => (g as { lessonId: string }).lessonId))].map((id) =>
      grammar.filter((g) => (g as { lessonId: string }).lessonId === id),
    ),
  )
  const items = interleave([grammarMixed, conj, words, fix, listen])
  const counts = {
    reviews: words.length,
    newWords: 0,
    grammar: grammar.length,
    conj: conj.length,
    listen: listen.length,
    say: 0,
    fix: fix.length,
  }
  return { mode: 'weak', items, counts: { ...counts, weak: items.length, moreReviews: 0 }, reviewLessons: [], minutes: estimate(counts) }
}

export function lessonTitle(id: string): string {
  return LESSON_BY_ID[id]?.title ?? id
}
