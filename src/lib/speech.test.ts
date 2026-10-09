import { describe, expect, it } from 'vitest'
import { splitForSpeech, voiceGender, voiceQuality } from './speech'

const v = (name: string, lang = 'fr-FR') => ({ name, lang, voiceURI: name, default: false, localService: true }) as SpeechSynthesisVoice

describe('speech', () => {
  it('ranks natural voices above robotic ones', () => {
    expect(voiceQuality(v('Audrey (Premium)'))).toBeGreaterThan(voiceQuality(v('Thomas')))
    expect(voiceQuality(v('Microsoft Denise Online (Natural) - French (France)'))).toBeGreaterThan(voiceQuality(v('Microsoft Hortense - French (France)')))
    expect(voiceQuality(v('Grand-mère (français (France))'))).toBeLessThan(0)
    expect(voiceQuality(v('Albert', 'en-US'))).toBeLessThan(0)
  })

  it('knows the gender of common voices', () => {
    expect(voiceGender(v('Thomas'))).toBe('m')
    expect(voiceGender(v('Audrey (Enhanced)'))).toBe('f')
    expect(voiceGender(v('Microsoft Henri Online (Natural) - French (France)'))).toBe('m')
    expect(voiceGender(v('Google français'))).toBe('f')
    expect(voiceGender(v('Something'))).toBeUndefined()
  })

  it('splits long text into sentences, short text not at all', () => {
    expect(splitForSpeech('Bonjour !')).toEqual(['Bonjour !'])
    const long = 'You walk into a small café in Lyon and sit down. The waiter, Marc, comes over to take your order. You’d like a coffee, and something to eat. It is a sunny morning and the terrace is full of people.'
    const parts = splitForSpeech(long, 100)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((p) => p.length <= 100)).toBe(true)
    expect(parts.join(' ')).toBe(long)
  })
})
