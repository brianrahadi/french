import { describe, expect, it } from 'vitest'
import {
  align,
  bestAlternative,
  gradeDictation,
  lookupForms,
  matchSpeech,
  paragraphs,
  readTokens,
  sameStemDifferentEnding,
  sentenceId,
  soundKey,
  splitSentences,
  wordTokens,
} from './french'

describe('tokens', () => {
  it('splits elisions and hyphens, drops punctuation', () => {
    expect(wordTokens('L’homme : « Est-ce que c’est vrai ? »')).toEqual(["l'", 'homme', 'est', 'ce', 'que', "c'", 'est', 'vrai'])
  })
  it('keeps reading units whole', () => {
    const t = readTokens("Aujourd'hui, peut-être l’ami !")
    expect(t.filter((x) => x.word).map((x) => x.text)).toEqual(["Aujourd'hui", 'peut-être', 'l’ami'])
    expect(t.map((x) => x.text).join('')).toBe("Aujourd'hui, peut-être l’ami !")
  })
})

describe('alignment', () => {
  it('finds missing and extra words', () => {
    const ops = align(['il', "n'", 'y', 'a', 'pas'], ['il', 'y', 'a', 'pas', 'pas'])
    const kinds = ops.map((o) => o.kind)
    expect(kinds.slice(0, 2)).toEqual(['ok', 'miss'])
    expect(kinds.filter((k) => k === 'ok')).toHaveLength(4)
    expect(kinds.filter((k) => k === 'extra')).toHaveLength(1)
  })
})

describe('gradeDictation', () => {
  it('is perfect regardless of case and punctuation', () => {
    const r = gradeDictation('Bonjour, ça va ?', 'bonjour ça va')
    expect(r.perfect).toBe(true)
    expect(r.score).toBe(100)
  })
  it('classifies accents, homophones, endings and missed words', () => {
    const r = gradeDictation("Elle est allée à l'école, mais il n'y a pas de cours.", "elle et allé a l'ecole mais il y a pas de cours")
    expect(r.categories).toEqual({ homophones: 2, endings: 1, accents: 1, missed: 1 })
    expect(r.perfect).toBe(false)
    expect(r.score).toBeGreaterThan(50)
    expect(r.score).toBeLessThan(80)
  })
  it('scores an empty answer as zero', () => {
    expect(gradeDictation('Je mange une pomme.', '').score).toBe(0)
  })
  it('detects silent endings', () => {
    expect(sameStemDifferentEnding('parlent', 'parle')).toBe(true)
    expect(sameStemDifferentEnding('aime', 'aimer')).toBe(true)
    expect(sameStemDifferentEnding('petit', 'petites')).toBe(true)
    expect(sameStemDifferentEnding('chat', 'chien')).toBe(false)
  })
})

describe('speaking', () => {
  it('treats homophonous spellings as the same sound', () => {
    expect(soundKey('parlent')).toBe(soundKey('parle'))
    expect(soundKey('aimé')).toBe(soundKey('aimer'))
    expect(soundKey('est')).toBe(soundKey('et'))
  })
  it('marks which words were heard', () => {
    const m = matchSpeech('Tu as vu la roue ?', 'tu as vu la rue')
    expect(m.heard).toEqual([true, true, true, true, false])
    expect(m.score).toBe(80)
  })
  it('picks the best alternative', () => {
    expect(bestAlternative('Je voudrais un café', ['je voudrai un café', 'jeu vous drez un café']).match.score).toBe(100)
  })
})

describe('reading structure', () => {
  it('splits paragraphs and sentences, keeping abbreviations', () => {
    expect(paragraphs('Un.\n\nDeux\ntrois.')).toEqual(['Un.', 'Deux trois.'])
    expect(splitSentences('Bonjour M. Dupont. Comment allez-vous ? « Très bien ! » Merci.')).toEqual([
      'Bonjour M. Dupont.',
      'Comment allez-vous ?',
      '« Très bien ! »',
      'Merci.',
    ])
  })
  it('suggests dictionary forms', () => {
    expect(lookupForms("l'école")).toContain('école')
    expect(lookupForms('journaux')).toContain('journal')
    expect(lookupForms('heureuses')).toContain('heureux')
    expect(lookupForms('grandes')).toContain('grand')
  })
  it('makes stable sentence ids', () => {
    expect(sentenceId('Bonjour !')).toBe(sentenceId('Bonjour !'))
    expect(sentenceId('Bonjour !')).not.toBe(sentenceId('Bonsoir !'))
  })
})
