import { describe, expect, it } from 'vitest'
import { buildMixedPlan, interleave, MIX } from './plan'
import { initialState, type State } from '../../lib/store'
import { newCard } from '../../lib/srs'
import { addDays, dayKey } from '../../lib/date'
import { BUILTIN_WORDS, DECK_BY_ID } from '../../data/vocab'
import { LESSONS } from '../../data/grammar'
import { levelRank } from '../../data/types'
import { newWordQueue } from '../vocab/selectors'
import { allSentences, pickSentences } from '../listening/sentences'

function baseState(): State {
  return {
    ...initialState,
    // Keep the original mix for these tests; listening items are tested separately.
    settings: { ...initialState.settings, sessionListening: false },
    activeDecks: ['a1-essentials'],
    startLevel: 'A1',
    // Fresh objects: tests write into these.
    cards: {},
    introduced: {},
    lessons: {},
    conj: {},
  }
}

let seed = 1
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('interleave', () => {
  it('spreads short lists through long ones', () => {
    const out = interleave([['a', 'a', 'a', 'a', 'a', 'a'], ['B', 'B']])
    expect(out).toHaveLength(8)
    expect(out.indexOf('B')).toBeGreaterThan(0)
    expect(out.lastIndexOf('B')).toBeLessThan(out.length - 1)
  })
})

describe('buildMixedPlan', () => {
  it('for a brand-new learner: new words and verbs, no grammar yet', () => {
    const p = buildMixedPlan(baseState(), rand)
    expect(p.counts.reviews).toBe(0)
    expect(p.counts.newWords).toBe(MIX.maxNew)
    expect(p.counts.grammar).toBe(0)
    expect(p.counts.conj).toBe(MIX.conj)
    expect(p.items.filter((i) => i.kind === 'intro')).toHaveLength(MIX.maxNew)
  })

  it('mixes due reviews, lesson reviews and practice from studied lessons', () => {
    const s = baseState()
    const yesterday = addDays(new Date(), -1)
    for (const w of BUILTIN_WORDS.slice(0, 40)) {
      s.cards[`${w.id}|r`] = { ...newCard(yesterday), state: 2, scheduled_days: 3 }
      s.introduced[w.id] = dayKey(yesterday)
    }
    s.lessons['etre-avoir'] = { attempts: 1, best: 0.9, last: 0.9, lastAt: '', step: 0, nextReview: dayKey(yesterday) }
    s.lessons['articles'] = { attempts: 1, best: 0.5, last: 0.5, lastAt: '', step: 0, nextReview: dayKey(addDays(new Date(), 1)) }
    const p = buildMixedPlan(s, rand)
    expect(p.counts.reviews).toBe(MIX.maxReviews)
    expect(p.counts.moreReviews).toBe(40 - MIX.maxReviews)
    expect(p.reviewLessons).toEqual(['etre-avoir'])
    const grammar = p.items.filter((i) => i.kind === 'grammar')
    expect(grammar).toHaveLength(MIX.grammar)
    expect(grammar.filter((g) => g.kind === 'grammar' && g.review)).toHaveLength(MIX.perReviewLesson)
    expect(grammar.every((g) => g.kind === 'grammar' && ['etre-avoir', 'articles'].includes(g.lessonId))).toBe(true)
    // Interleaved: grammar isn't bunched at the start or end.
    const first = p.items.findIndex((i) => i.kind === 'grammar')
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(10)
  })
})

describe('course order (A1 → B2)', () => {
  const lesson = (best: number) => ({ attempts: 1, best, last: best, lastAt: '', step: 0, nextReview: dayKey(addDays(new Date(), 5)) })

  it('queues new words level by level: themed, then frequency, then the next level', () => {
    const ids = (deck: string) => DECK_BY_ID[deck].words.map((w) => w.id)
    const a1 = ids('a1-essentials')
    const freq = ids('top5000-01').filter((id) => !a1.includes(id))
    const b2 = ids('b2-verbs').filter((id) => !a1.includes(id) && !freq.includes(id))
    const q = newWordQueue({ activeDecks: ['b2-verbs', 'top5000-01', 'a1-essentials'], introduced: {}, customWords: [] })
    expect(q.map((w) => w.id)).toEqual([...a1, ...freq, ...b2])
  })

  it('shows due word reviews A1 first', () => {
    const s = baseState()
    const yesterday = addDays(new Date(), -1)
    const words = [...DECK_BY_ID['b1-society'].words.slice(0, 3), ...DECK_BY_ID['a1-essentials'].words.slice(0, 3)]
    for (const w of words) {
      s.cards[`${w.id}|r`] = { ...newCard(yesterday), state: 2, scheduled_days: 3 }
      s.introduced[w.id] = dayKey(yesterday)
    }
    const levels = buildMixedPlan(s, rand).items.flatMap((i) =>
      i.kind === 'card' ? [levelRank(BUILTIN_WORDS.find((w) => `${w.id}|r` === i.id)!.level)] : [],
    )
    expect(levels).toHaveLength(6)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('practises grammar in course order, the lowest unfinished lesson first', () => {
    const s = baseState()
    s.lessons['subjonctif'] = lesson(0.5) // B1, started
    s.lessons['negation'] = lesson(0.5) // A1, started
    s.lessons['imparfait'] = lesson(0.9) // A2, mastered
    const g = buildMixedPlan(s, rand).items.flatMap((i) => (i.kind === 'grammar' ? [i] : []))
    expect(g).toHaveLength(MIX.grammar)
    expect(g.filter((x) => x.lessonId === 'negation')).toHaveLength(MIX.perReviewLesson)
    const order = g.map((x) => LESSONS.findIndex((l) => l.id === x.lessonId) * 100 + x.index)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('keeps conjugation to the lowest tense level until every verb has met it', () => {
    const s = baseState()
    s.conjConfig = { ...s.conjConfig, tenses: ['conditionnel', 'present'] }
    const tenses = buildMixedPlan(s, rand).items.flatMap((i) => (i.kind === 'conj' ? [i.item.tense] : []))
    expect(tenses).toHaveLength(MIX.conj)
    expect(new Set(tenses)).toEqual(new Set(['present']))
  })

  it('picks unseen dictation sentences from the lowest level first, sorted A1 → B2', () => {
    const pool = allSentences().filter((x) => x.level === 'A1' || x.level === 'B2')
    const picked = pickSentences(pool, {}, 6, rand, { inOrder: true })
    expect(picked.every((x) => x.level === 'A1')).toBe(true)
    // Once A1 has all been heard, B2 comes in — after any A1 sentences picked again.
    const heard = Object.fromEntries(pool.filter((x) => x.level === 'A1').map((x) => [x.id, { n: 1, best: 60, last: 60, at: '' }]))
    const later = pickSentences(pool, heard, 12, rand, { inOrder: true }).map((x) => levelRank(x.level))
    expect(later).toContain(levelRank('B2'))
    expect(later).toEqual([...later].sort((a, b) => a - b))
  })
})
