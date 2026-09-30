import { describe, expect, it } from 'vitest'
import { buildMixedPlan, interleave, MIX } from './plan'
import { initialState, type State } from '../../lib/store'
import { newCard } from '../../lib/srs'
import { addDays, dayKey } from '../../lib/date'
import { BUILTIN_WORDS } from '../../data/vocab'

function baseState(): State {
  return {
    ...initialState,
    // Keep the original mix for these tests; listening items are tested separately.
    settings: { ...initialState.settings, sessionListening: false },
    activeDecks: ['a1-essentials'],
    startLevel: 'A1',
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
