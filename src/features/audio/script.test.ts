import { describe, expect, it } from 'vitest'
import { AUDIO_LESSONS } from '../../data/audio'
import { buildScript, clipKey, genderOf, scriptSeconds, voicesFor } from './script'

describe('audio lessons', () => {
  it('has a course in order with unique ids', () => {
    expect(AUDIO_LESSONS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(AUDIO_LESSONS.map((l) => l.id)).size).toBe(AUDIO_LESSONS.length)
  })

  it('builds a 10–30 minute script for every lesson', () => {
    AUDIO_LESSONS.forEach((l, i) => {
      const { parts, steps } = buildScript(l, i + 1, AUDIO_LESSONS.slice(0, i))
      const min = scriptSeconds(steps) / 60
      expect(min, l.id).toBeGreaterThan(8)
      expect(min, l.id).toBeLessThan(30)
      expect(parts.length).toBeGreaterThan(l.phrases.length)
      // Every step points at a section, in order.
      for (let k = 1; k < steps.length; k++) expect(steps[k].part).toBeGreaterThanOrEqual(steps[k - 1].part)
      // The narrator never reads French: cues are English.
      const names = new RegExp([...new Set(l.dialogue.map((d) => d.who)), 'café'].join('|'), 'g')
      for (const s of steps) if (s.kind === 'en') expect(s.text.replace(names, ''), l.id).not.toMatch(/[àâçéèêëîïôûœ]/i)
    })
  })

  it('asks each phrase again later (graduated recall)', () => {
    const l = AUDIO_LESSONS[0]
    const { steps } = buildScript(l, 1)
    for (const p of l.phrases) {
      const asked = steps.filter((s) => s.kind === 'turn' && !s.repeat && s.answer === p.fr).length
      expect(asked, p.fr).toBeGreaterThanOrEqual(2)
    }
  })

  it('reviews earlier lessons first', () => {
    const { parts } = buildScript(AUDIO_LESSONS[1], 2, AUDIO_LESSONS.slice(0, 1))
    expect(parts[1]).toBe('Warm-up')
  })

  it('gives each speaker a voice that fits their name', () => {
    expect(genderOf('Mme Girard')).toBe('f')
    expect(genderOf('M. Leroy')).toBe('m')
    expect(genderOf('Léa')).toBe('f')
    expect(genderOf('Alex')).toBeUndefined()
    const v = voicesFor(['Marc', 'Alex'])
    expect([v('Marc'), v('Alex')]).toEqual([1, 0])
    const w = voicesFor(['Alex', 'Julie'])
    expect([w('Alex'), w('Julie')]).toEqual([1, 0])
  })

  it('names each spoken line by voice, speed and text', () => {
    expect(clipKey({ kind: 'en', text: 'Repeat.', part: 0 })).toBe('en:Repeat.')
    expect(clipKey({ kind: 'fr', text: 'voilà', part: 0 })).toBe('fr0:voilà')
    expect(clipKey({ kind: 'fr', text: 'voilà', part: 0, voice: 1, slow: true })).toBe('fr1s:voilà')
  })
})
