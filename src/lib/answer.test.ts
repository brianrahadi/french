import { describe, expect, it } from 'vitest'
import { checkAnswer, diffStrings, normalize, stripSubjectPronoun } from './answer'

describe('normalize', () => {
  it('unifies apostrophes, case, punctuation and spaces', () => {
    expect(normalize('  J’ai  FAIM ! ')).toBe("j'ai faim")
    expect(normalize('Est - ce que tu viens ?')).toBe('est-ce que tu viens')
    expect(normalize("« Bonjour », dit-il.")).toBe('bonjour dit-il')
    expect(normalize("j' ai")).toBe("j'ai")
  })
})

describe('checkAnswer', () => {
  it('accepts exact answers regardless of case/punctuation', () => {
    expect(checkAnswer('Je suis allée.', ['je suis allée']).verdict).toBe('correct')
  })
  it('flags accent-only mistakes as almost', () => {
    const r = checkAnswer('je suis allee', ['je suis allée'])
    expect(r.verdict).toBe('almost')
    expect(r.expected).toBe('je suis allée')
    expect(checkAnswer('soeur', ['sœur']).verdict).toBe('almost')
  })
  it('rejects real mistakes and finds the closest expected answer', () => {
    const r = checkAnswer('je suis allé au cinema hier soir', ['je suis allée au cinéma hier soir', 'nous sommes allés au cinéma'])
    expect(r.verdict).toBe('wrong')
    expect(r.expected).toBe('je suis allée au cinéma hier soir')
    expect(checkAnswer('parles', ['parle']).verdict).toBe('wrong')
  })
})

describe('diffStrings', () => {
  it('marks the differing characters', () => {
    const d = diffStrings('parle', 'parlé')
    expect(d.given).toEqual([{ text: 'parl', kind: 'same' }, { text: 'e', kind: 'diff' }])
    expect(d.expected).toEqual([{ text: 'parl', kind: 'same' }, { text: 'é', kind: 'diff' }])
  })
})

describe('stripSubjectPronoun', () => {
  it('removes a leading subject pronoun', () => {
    expect(stripSubjectPronoun("J'ai mangé")).toBe('ai mangé')
    expect(stripSubjectPronoun('que nous soyons')).toBe('soyons')
    expect(stripSubjectPronoun("qu'elle vienne")).toBe('vienne')
    expect(stripSubjectPronoun('parle')).toBe('parle')
  })
})
