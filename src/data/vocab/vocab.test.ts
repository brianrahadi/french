import { describe, expect, it } from 'vitest'
import { BUILTIN_WORDS, DECKS, FREQUENCY_DECKS, THEMED_DECKS } from './index'
import { productionAnswers, displayFr } from '../../lib/words'
import { checkAnswer } from '../../lib/answer'

describe('vocabulary data', () => {
  it('has unique word ids within themed decks and within frequency decks', () => {
    for (const decks of [THEMED_DECKS, FREQUENCY_DECKS]) {
      const seen = new Map<string, string>()
      for (const w of decks.flatMap((d) => d.words)) {
        expect(seen.has(w.id), `duplicate ${w.id} in ${w.deck} and ${seen.get(w.id)}`).toBe(false)
        seen.set(w.id, w.deck)
      }
    }
    expect(new Set(BUILTIN_WORDS.map((w) => w.id)).size).toBe(BUILTIN_WORDS.length)
  })
  it('shares a word between a themed and a frequency deck only if it is the same entry', () => {
    const themed = new Map(THEMED_DECKS.flatMap((d) => d.words).map((w) => [w.id, w]))
    for (const w of FREQUENCY_DECKS.flatMap((d) => d.words)) {
      const t = themed.get(w.id)
      if (t) expect([w.fr, w.en, w.g, w.fem, w.ex], `${w.id} in ${w.deck} differs from ${t.deck}`).toEqual([t.fr, t.en, t.g, t.fem, t.ex])
    }
  })
  it('has 5000 words in frequency order across the frequency decks', () => {
    expect(FREQUENCY_DECKS.flatMap((d) => d.words).length).toBe(5000)
    for (const d of FREQUENCY_DECKS) expect(d.words.length, d.id).toBe(100)
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

describe('frequency words', () => {
  it('are introduced in frequency order when switched on', async () => {
    const { newWordQueue } = await import('../../features/vocab/selectors')
    const { FREQUENCY_DECK_IDS, FREQUENCY_WORDS } = await import('./index')
    const queue = newWordQueue({ activeDecks: FREQUENCY_DECK_IDS, introduced: {}, customWords: [] })
    expect(queue.map((w) => w.id)).toEqual(FREQUENCY_WORDS.map((w) => w.id))
    expect(queue.slice(0, 3).map((w) => w.fr)).toEqual(['le', 'de', 'être'])
  })
})
