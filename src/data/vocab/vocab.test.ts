import { describe, expect, it } from 'vitest'
import { BUILTIN_WORDS, DECKS } from './index'
import { productionAnswers, displayFr } from '../../lib/words'
import { checkAnswer } from '../../lib/answer'

describe('vocabulary data', () => {
  it('has unique word ids', () => {
    const seen = new Map<string, string>()
    for (const w of BUILTIN_WORDS) {
      expect(seen.has(w.id), `duplicate ${w.id} in ${w.deck} and ${seen.get(w.id)}`).toBe(false)
      seen.set(w.id, w.deck)
    }
  })
  it('has unique deck ids and non-empty decks', () => {
    expect(new Set(DECKS.map((d) => d.id)).size).toBe(DECKS.length)
    for (const d of DECKS) expect(d.words.length).toBeGreaterThan(10)
  })
  it('gives every word an example with a translation', () => {
    for (const w of BUILTIN_WORDS) {
      expect(w.ex, w.id).toBeTruthy()
      expect(w.exEn, w.id).toBeTruthy()
      expect(w.en.trim(), w.id).not.toBe('')
    }
  })
  it('accepts the displayed form as a production answer', () => {
    for (const w of BUILTIN_WORDS) {
      const shown = displayFr(w).replace(' · ', ' ')
      const { answers } = productionAnswers(w)
      if (w.both) continue
      expect(checkAnswer(shown, answers).verdict, `${w.id}: ${shown} vs ${answers.join(' | ')}`).toBe('correct')
    }
  })
  it('handles articles and elision', () => {
    const ecole = BUILTIN_WORDS.find((w) => w.id === 'ecole-n')!
    expect(displayFr(ecole)).toBe("l'école")
    expect(productionAnswers(ecole).answers).toEqual(["l'école", 'une école'])
    const gens = BUILTIN_WORDS.find((w) => w.id === 'gens-n')!
    expect(displayFr(gens)).toBe('les gens')
    const collegue = BUILTIN_WORDS.find((w) => w.id === 'collegue-n')!
    expect(displayFr(collegue)).toBe('le/la collègue')
    expect(checkAnswer('la collègue', productionAnswers(collegue).answers).verdict).toBe('correct')
  })
  it('reports size', () => {
    console.log(`${DECKS.length} decks, ${BUILTIN_WORDS.length} words`)
  })
})
