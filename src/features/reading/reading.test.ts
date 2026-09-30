import { describe, expect, it } from 'vitest'
import { dictionaryLookup, verbFormLookup, coerceGloss } from './lookup'
import { BUILTIN_TEXTS } from '../../data/texts'
import { SCENARIOS } from '../../data/scenarios'
import { SOUND_SETS } from '../../data/sounds'
import { LESSON_BY_ID } from '../../data/grammar'
import { allSentences, pickSentences, poolFor, sentenceById, soundSentences } from '../listening/sentences'
import { tipsFor } from '../../data/soundTips'
import { customWord } from '../../lib/words'

describe('dictionary and verb-form lookup', () => {
  it('finds words from inflected and elided forms', () => {
    expect(dictionaryLookup('maisons', []).map((w) => w.fr)).toContain('maison')
    expect(dictionaryLookup("l'école", []).map((w) => w.fr)).toContain('école')
  })
  it('includes the learner’s own words', () => {
    const w = customWord('la trottinette', 'scooter')
    expect(dictionaryLookup('trottinettes', [w])[0]?.id).toBe(w.id)
  })
  it('recognises conjugated forms', () => {
    expect(verbFormLookup('allée').map((f) => f.inf)).toContain('aller')
    const parlons = verbFormLookup('parlons')
    expect(parlons[0].inf).toBe('parler')
    expect(parlons[0].label).toContain('nous')
    expect(verbFormLookup("j'irai")[0].label).toContain('futur')
  })
  it('coerces AI glosses safely', () => {
    expect(coerceGloss({ lemma: '', gender: 'x', meaning: ' station ' }, 'gare')).toMatchObject({ lemma: 'gare', gender: '', meaning: 'station' })
  })
})

describe('content', () => {
  it('graded texts are well-formed', () => {
    const ids = new Set(BUILTIN_TEXTS.map((t) => t.id))
    expect(ids.size).toBe(BUILTIN_TEXTS.length)
    for (const t of BUILTIN_TEXTS) {
      expect(t.paragraphs.length).toBeGreaterThan(1)
      for (const p of t.paragraphs) {
        expect(p.fr.trim()).not.toBe('')
        expect(p.en.trim()).not.toBe('')
        expect(p.fr).not.toMatch(/’/)
      }
    }
  })
  it('scenarios reference real lessons and have goals and phrases', () => {
    const ids = new Set(SCENARIOS.map((s) => s.id))
    expect(ids.size).toBe(SCENARIOS.length)
    for (const s of SCENARIOS) {
      for (const l of s.lessons) expect(LESSON_BY_ID[l], `${s.id} → ${l}`).toBeTruthy()
      expect(s.goals.length).toBeGreaterThanOrEqual(2)
      expect(new Set(s.goals.map((g) => g.id)).size).toBe(s.goals.length)
      expect(s.phrases.length).toBeGreaterThanOrEqual(4)
      expect(s.opening.trim()).not.toBe('')
    }
  })
  it('sound sets have sentences', () => {
    for (const set of SOUND_SETS) expect(set.sentences.length).toBeGreaterThanOrEqual(6)
  })
})

describe('practice sentences', () => {
  it('collects clean, unique sentences at every level', () => {
    const all = allSentences()
    expect(all.length).toBeGreaterThan(300)
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length)
    for (const s of all) expect(s.fr).not.toMatch(/[*_~0-9]/)
    for (const lvl of ['A1', 'A2', 'B1', 'B2'] as const) expect(poolFor(lvl, { introduced: {}, startLevel: 'A1' }).length).toBeGreaterThan(40)
    expect(sentenceById(soundSentences()[0].id)?.soundSet).toBeTruthy()
  })
  it('falls back to the learner’s level when few words are studied', () => {
    const pool = poolFor('mine', { introduced: {}, startLevel: 'A2' })
    expect(pool.every((s) => s.level === 'A1' || s.level === 'A2')).toBe(true)
  })
  it('prefers unseen sentences and avoids ones done perfectly', () => {
    const pool = allSentences().slice(0, 30)
    const stats = Object.fromEntries(pool.slice(0, 25).map((s) => [s.id, { n: 1, best: 100, last: 100, at: '2020-01-01T00:00:00Z' }]))
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const picked = pickSentences(pool, stats, 5, rand)
    expect(picked.filter((s) => !stats[s.id]).length).toBeGreaterThanOrEqual(3)
  })
  it('gives pronunciation tips for missed words', () => {
    expect(tipsFor(['tu'])[0].id).toBe('u')
    expect(tipsFor(['bon', 'vin']).map((t) => t.id)).toEqual(['on', 'in'])
  })
})
