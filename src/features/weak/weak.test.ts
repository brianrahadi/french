import { describe, expect, it } from 'vitest'
import { computeWeakSpots } from './weak'
import { countWeakSpots } from './count'
import { buildMixedPlan, buildWeakPlan } from '../session/plan'
import { initialState, type Mistake, type State } from '../../lib/store'
import { newCard, cardId } from '../../lib/srs'
import { BUILTIN_WORDS } from '../../data/vocab'

const now = Date.parse('2026-09-29T12:00:00Z')
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
let n = 0
const mistake = (over: Partial<Mistake>): Mistake => ({
  id: `m${n++}`,
  at: daysAgo(1),
  source: 'grammar',
  skill: 'lesson:articles',
  given: 'le maison',
  expected: 'la maison',
  ...over,
})

function state(over: Partial<State> = {}): State {
  return { ...initialState, startLevel: 'A1', ...over }
}

describe('computeWeakSpots', () => {
  it('needs repeated recent mistakes before a grammar point counts as weak', () => {
    expect(computeWeakSpots(state({ mistakes: [mistake({})] }), now).lessons).toHaveLength(0)
    const two = computeWeakSpots(state({ mistakes: [mistake({}), mistake({ source: 'writing' })] }), now)
    expect(two.lessons.map((l) => l.lessonId)).toEqual(['articles'])
    expect(two.lessons[0].sources).toEqual({ grammar: 1, writing: 1 })
  })

  it('ignores resolved and old mistakes, and fades spots that are improving', () => {
    const ms = [mistake({}), mistake({ resolved: true }), mistake({ at: daysAgo(90) })]
    expect(computeWeakSpots(state({ mistakes: ms }), now).lessons).toHaveLength(0)
    const three = [mistake({}), mistake({}), mistake({})]
    expect(computeWeakSpots(state({ mistakes: three }), now).lessons).toHaveLength(1)
    const improving = computeWeakSpots(state({ mistakes: three, skills: { 'lesson:articles': [0, 1, 1, 1] } }), now)
    expect(improving.lessons).toHaveLength(0)
  })

  it('finds verb forms with low recent accuracy and words that keep lapsing', () => {
    const w = BUILTIN_WORDS[0]
    const card = { ...newCard(), lapses: 3, last_review: daysAgo(2) }
    const s = state({
      conj: {
        'aller|passeCompose': { seen: 5, correct: 1, recent: [0, 1, 0, 0], lastAt: daysAgo(1) },
        'être|present': { seen: 5, correct: 5, recent: [1, 1, 1], lastAt: daysAgo(1) },
      },
      cards: { [cardId(w.id, 'p')]: card },
    })
    const weak = computeWeakSpots(s, now)
    expect(weak.verbs.map((v) => `${v.inf}|${v.tense}`)).toEqual(['aller|passeCompose'])
    expect(weak.words.map((x) => x.word.id)).toEqual([w.id])
    expect(countWeakSpots(s, now)).toBe(weak.total)
  })

  it('keeps one fix-it item per distinct correction', () => {
    const ms = [
      mistake({ source: 'writing', fixable: true, given: "j'ai allé", expected: 'je suis allé' }),
      mistake({ source: 'talk', fixable: true, given: "J'ai allé", expected: 'je suis allé' }),
      mistake({ source: 'writing', fixable: true, given: 'le plage', expected: 'la plage' }),
    ]
    expect(computeWeakSpots(state({ mistakes: ms }), now).fixables).toHaveLength(2)
  })
})

describe('session plans with weak spots', () => {
  const rand = () => 0.42
  it('builds a targeted session from weak spots', () => {
    const w = BUILTIN_WORDS[3]
    const s = state({
      mistakes: [
        mistake({}),
        mistake({ source: 'writing' }),
        mistake({ source: 'writing', fixable: true, given: 'le plage', expected: 'la plage', skill: 'lesson:articles', at: new Date().toISOString() }),
      ],
      conj: { 'aller|passeCompose': { seen: 4, correct: 1, recent: [0, 0, 1, 0], lastAt: daysAgo(1) } },
      cards: { [cardId(w.id, 'p')]: { ...newCard(), lapses: 2, last_review: new Date().toISOString() } },
    })
    const plan = buildWeakPlan(s, rand)
    const kinds = new Set(plan.items.map((i) => i.kind))
    expect(kinds).toEqual(new Set(['grammar', 'conj', 'card', 'fix']))
    expect(plan.mode).toBe('weak')
  })

  it('adds dictation to the daily session only when speech is available and enabled', () => {
    const base = state({ activeDecks: ['a1-essentials'] })
    expect(buildMixedPlan(base, rand, { tts: true }).counts.listen).toBe(2)
    expect(buildMixedPlan(base, rand, { tts: false }).counts.listen).toBe(0)
    const off = { ...base, settings: { ...base.settings, sessionListening: false } }
    expect(buildMixedPlan(off, rand, { tts: true }).counts.listen).toBe(0)
    expect(buildMixedPlan(base, rand, { tts: true, asr: true }).counts.say).toBe(0)
    const on = { ...base, settings: { ...base.settings, sessionSpeaking: true } }
    expect(buildMixedPlan(on, rand, { tts: true, asr: true }).counts.say).toBe(2)
  })
})
