import { describe, expect, it } from 'vitest'
import { VERB_BY_INF, verbsInSet } from '../../data/verbs'
import { fullForm, gradeDrill, makeDrill, promptPronoun } from './drill'

describe('conjugation drill', () => {
  it('builds the requested number of items from the pool', () => {
    const items = makeDrill(verbsInSet('essential'), ['present', 'passeCompose'], {}, 20)
    expect(items).toHaveLength(20)
    for (const it of items) expect(VERB_BY_INF[it.inf].essential).toBe(true)
  })
  it('favours weak verb/tense pairs', () => {
    const stats = { 'être|present': { seen: 8, correct: 0, recent: [0, 0, 0, 0, 0, 0, 0, 0], lastAt: '' } }
    const others = Object.fromEntries(
      verbsInSet('essential')
        .filter((v) => v.inf !== 'être')
        .map((v) => [`${v.inf}|present`, { seen: 8, correct: 8, recent: [1, 1, 1, 1, 1, 1, 1, 1], lastAt: '' }]),
    )
    let n = 0
    for (let k = 0; k < 20; k++) n += makeDrill(verbsInSet('essential'), ['present'], { ...others, ...stats }, 20).filter((i) => i.inf === 'être').length
    // être has weight 3.5 vs 0.5 for mastered verbs → roughly a quarter of all questions
    expect(n / 400).toBeGreaterThan(0.15)
  })
  it('in course order: new tenses only once the lower level has been met for every verb', () => {
    const verbs = verbsInSet('essential')
    const fresh = makeDrill(verbs, ['subjonctif', 'present'], {}, 20, Math.random, { inOrder: true })
    expect(new Set(fresh.map((i) => i.tense))).toEqual(new Set(['present']))
    const met = Object.fromEntries(verbs.map((v) => [`${v.inf}|present`, { seen: 3, correct: 3, recent: [1, 1, 1], lastAt: '' }]))
    const next = makeDrill(verbs, ['subjonctif', 'present'], met, 40, Math.random, { inOrder: true })
    expect(next.some((i) => i.tense === 'subjonctif')).toBe(true)
    // Sorted A1 → B2: every présent item comes before the first subjonctif one.
    const firstSubj = next.findIndex((i) => i.tense === 'subjonctif')
    expect(next.slice(firstSubj).every((i) => i.tense === 'subjonctif')).toBe(true)
  })
  it('grades with or without the pronoun and handles agreement', () => {
    const item = { inf: 'aller', tense: 'passeCompose' as const, person: 2, gender: 'f' as const }
    expect(gradeDrill(item, 'est allée').verdict).toBe('correct')
    expect(gradeDrill(item, 'elle est allée').verdict).toBe('correct')
    expect(gradeDrill(item, 'est allé').verdict).toBe('wrong')
    expect(gradeDrill(item, 'est allee').verdict).toBe('almost')
    expect(fullForm(item)).toBe('elle est allée')
  })
  it('does not reveal the auxiliary through elision', () => {
    expect(promptPronoun({ inf: 'aller', tense: 'passeCompose', person: 0, gender: 'm' })).toBe('je / j’')
    expect(promptPronoun({ inf: 'parler', tense: 'present', person: 0, gender: 'm' })).toBe('je')
    expect(promptPronoun({ inf: 'aimer', tense: 'subjonctif', person: 0, gender: 'm' })).toBe('que je / j’')
    expect(fullForm({ inf: 'avoir', tense: 'subjonctif', person: 0, gender: 'm' })).toBe("que j'aie")
  })
})
