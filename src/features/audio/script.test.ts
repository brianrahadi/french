import { describe, expect, it } from 'vitest'
import { AUDIO_LESSONS } from '../../data/audio'
import { buildScript, scriptSeconds } from './script'

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
})
