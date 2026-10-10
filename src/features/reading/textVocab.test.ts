import { describe, expect, it } from 'vitest'
import { bankWordFor, textVocab } from './textVocab'
import { BUILTIN_TEXTS } from '../../data/texts'
import { customWord } from '../../lib/words'

const fr = (token: string) => bankWordFor(token, [])?.fr

describe('matching a text to the vocabulary bank', () => {
  it('picks the more frequent word for an ambiguous form', () => {
    expect(fr('est')).toBe('être')
    expect(fr("c'est")).toBe('être')
    expect(fr('suis')).toBe('être')
    expect(fr('pas')).toBe('pas')
    expect(bankWordFor('pas', [])?.pos).toBe('adv')
  })
  it('finds inflected, elided and function-word forms', () => {
    expect(fr('maisons')).toBe('maison')
    expect(fr("l'école")).toBe('école')
    expect(fr('la')).toBe('le')
    expect(fr('allée')).toBe('aller')
    expect(fr('mes')).toBe('mon')
  })
  it('lists each word once, skips names and numbers, and includes the learner’s own words', () => {
    const own = customWord('la trottinette', 'scooter')
    const list = textVocab(['Le matin, Karim prend sa trottinette. Il prend le métro à 8 heures.'], [own])
    const ids = list.map((t) => t.word.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(list.find((t) => t.word.fr === 'prendre')?.count).toBe(2)
    expect(list.find((t) => t.word.fr === 'prendre')?.forms).toEqual(['prend'])
    expect(ids).toContain(own.id)
    expect(list.some((t) => t.form === 'Karim' || t.form === '8')).toBe(false)
  })
  it('matches most of the words in the graded texts', () => {
    const t = BUILTIN_TEXTS[0]
    expect(textVocab(t.paragraphs.map((p) => p.fr), []).length).toBeGreaterThan(20)
  })
})
