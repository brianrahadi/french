import { describe, expect, it } from 'vitest'
import { currentLevel, harderLevels, levelProgress, withinLevel } from './level'
import { LESSONS } from '../data/grammar'
import { BUILTIN_TEXTS } from '../data/texts'
import { STORIES } from '../data/stories'

const empty = { startLevel: null, lessons: {}, read: {}, stories: {} }

describe('current level', () => {
  it('starts at the onboarding level, or A1', () => {
    expect(currentLevel(empty)).toBe('A1')
    expect(currentLevel({ ...empty, startLevel: 'B1' })).toBe('B1')
  })

  it('moves up once most of the level is done', () => {
    const lessons = Object.fromEntries(
      LESSONS.filter((l) => l.level === 'A1').map((l) => [l.id, { attempts: 1, best: 1, last: 1, lastAt: '', step: 0 }]),
    )
    const read = Object.fromEntries(BUILTIN_TEXTS.filter((t) => t.level === 'A1').map((t) => [t.id, '2026-09-01']))
    const stories = Object.fromEntries(STORIES.filter((t) => t.level === 'A1').map((t) => [t.id, { n: 1, best: 100, last: 100, at: '' }]))
    const s = { ...empty, startLevel: 'A1' as const, lessons, read, stories }
    expect(levelProgress('A1', s)).toBe(1)
    expect(currentLevel(s)).toBe('A2')
    // Reading one text isn't enough.
    expect(currentLevel({ ...empty, read: { [BUILTIN_TEXTS[0].id]: '2026-09-01' } })).toBe('A1')
  })

  it('compares levels', () => {
    expect(withinLevel('A1', 'A2')).toBe(true)
    expect(withinLevel('B1', 'A2')).toBe(false)
    expect(harderLevels('A2')).toEqual(['B1', 'B2'])
    expect(harderLevels('B2')).toEqual([])
  })
})
