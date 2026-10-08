import { pickReview } from '../grammar/goals'
import { LESSON_BY_ID, LESSONS } from '../../data/grammar'
import { findWord } from '../../data/vocab'
import { levelRank, type Lesson } from '../../data/types'
import type { State } from '../../lib/store'
import { dueCardIds, newAvailableToday, newWordQueue } from '../vocab/selectors'
import { dueLessons, lessonStatus } from '../grammar/status'
import { makeDrill, poolFor, type DrillItem } from '../conjugation/drill'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { cardId, parseCardId } from '../../lib/srs'
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

type GrammarItem = Extract<MixedItem, { kind: 'grammar' }>

/** Each lesson's place in the course (A1 → B2). */
const LESSON_RANK: Record<string, number> = Object.fromEntries(LESSONS.map((l, i) => [l.id, i]))

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
  // Every topic runs in course order, A1 → B2: new material comes only from the lowest
  // level that still has some; reviews of what's been learned come up when due, A1 first.

  // ── vocabulary: the oldest-due reviews, then new words in course order, a few woven in
  const due = dueCardIds(s.cards, s.customWords)
  const cardLevel = (id: string) => levelRank(findWord(parseCardId(id).wordId, s.customWords)?.level ?? 'A1')
  const reviews = due.slice(0, MIX.maxReviews).sort((a, b) => cardLevel(a) - cardLevel(b))
  const fresh = newWordQueue(s).slice(0, Math.min(MIX.maxNew, newAvailableToday(s)))
  const vocab: MixedItem[] = []
  let ni = 0
  reviews.forEach((id, i) => {
    vocab.push({ kind: 'card', id })
    if ((i + 1) % 4 === 0 && ni < fresh.length) vocab.push({ kind: 'intro', wordId: fresh[ni++].id })
  })
  while (ni < fresh.length) vocab.push({ kind: 'intro', wordId: fresh[ni++].id })

  // ── grammar: spaced reviews of due lessons, weak points, then practice from lessons already studied
  const grammar: GrammarItem[] = []
  const add = (l: Lesson, n: number, item: Omit<GrammarItem, 'kind' | 'lessonId' | 'index'>) => {
    const taken = new Set(grammar.filter((g) => g.lessonId === l.id).map((g) => g.index))
    const free = l.exercises.map((_, i) => i).filter((i) => !taken.has(i))
    // A review spreads its questions over the lesson's goals, weakest first.
    const reviewPicks = item.review ? pickReview(l, s.lessons[l.id], n, rand).filter((i) => !taken.has(i)) : []
    for (const index of reviewPicks.length ? reviewPicks : sample(free, n, rand)) grammar.push({ kind: 'grammar', lessonId: l.id, index, ...item })
  }
  const room = () => Math.max(0, MIX.grammar - grammar.length)
  const reviewLessons = dueLessons(s.lessons).slice(0, MIX.maxReviewLessons)
  for (const l of reviewLessons) add(l, MIX.perReviewLesson, { review: true })
  // Weak grammar points (from drills, writing and conversation) get a question each.
  const weak = computeWeakSpots(s)
  let weakCount = 0
  for (const w of weak.lessons.slice(0, MIX.weakLessons)) {
    if (!room() || grammar.some((g) => g.lessonId === w.lessonId)) continue
    add(LESSON_BY_ID[w.lessonId], 1, { review: false, weak: true })
    weakCount++
  }
  const used = new Set(grammar.map((g) => g.lessonId))
  const studied = LESSONS.filter((l) => s.lessons[l.id] && !used.has(l.id))
  const learning = studied.filter((l) => lessonStatus(s.lessons[l.id]) === 'started')
  // Lessons not yet mastered, lowest level first: each gets a few questions before the next one gets any.
  for (const l of learning) if (room()) add(l, Math.min(MIX.perReviewLesson, room()), { review: false })
  // Then a refresher question each from lessons already mastered.
  const mastered = studied.filter((l) => !learning.includes(l))
  for (const l of sample(mastered, room(), rand)) add(l, 1, { review: false })
  // Still room (few lessons studied): more questions from the same lessons, in the same order.
  for (const l of [...learning, ...mastered]) if (room()) add(l, room(), { review: false })
  // A1 → B2: lessons in course order, each lesson's questions in the order they're written.
  grammar.sort((a, b) => LESSON_RANK[a.lessonId] - LESSON_RANK[b.lessonId] || a.index - b.index)

  // ── conjugation: a short adaptive drill from the learner's usual settings
  const tenses = s.conjConfig.tenses.length ? s.conjConfig.tenses : ['present' as const]
  const conj: MixedItem[] = makeDrill(poolFor(s.conjConfig), tenses, s.conj, MIX.conj, rand, { inOrder: true }).map((item) => ({
    kind: 'conj',
    item,
  }))

  // ── corrections from writing / conversation to fix again
  const fix: MixedItem[] = sample(weak.fixables, MIX.fix, rand).map((m) => ({ kind: 'fix', mistakeId: m.id }))

  // ── listening and speaking, with sentences built from the learner's own words
  const sentences = sentencePool('mine', s)
  const listen: MixedItem[] =
    opts.tts && s.settings.sessionListening
      ? pickSentences(sentences, s.listening, MIX.listen, rand, { inOrder: true }).map((x) => ({ kind: 'listen', sentenceId: x.id }))
      : []
  const say: MixedItem[] =
    opts.asr && s.settings.sessionSpeaking
      ? pickSentences(sentences, s.speaking, MIX.say, rand, { inOrder: true }).map((x) => ({ kind: 'say', sentenceId: x.id }))
      : []

  // Only worth a session if something is actually due or new.
  const core = vocab.length + grammar.length + conj.length
  // Interleaving spreads the topics through the session but keeps each topic's own order.
  const items = core ? interleave<MixedItem>([vocab, grammar, conj, fix, listen, say]) : []
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
