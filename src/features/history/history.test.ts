import { describe, expect, it } from 'vitest'
import { initialState } from '../../lib/store'
import { LESSONS } from '../../data/grammar'
import { AUDIO_LESSONS } from '../../data/audio'
import { buildHistory, continueItems, dayLabel } from './history'

const base = { ...initialState }
const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).toISOString()

describe('buildHistory', () => {
  it('lists lessons and stories with their scores, newest first', () => {
    const lesson = LESSONS[0]
    const h = buildHistory({
      ...base,
      lessons: { [lesson.id]: { attempts: 1, best: 0.9, last: 0.85, lastAt: at('2026-10-07'), step: 0 } },
      stories: { 'x-story': { n: 1, best: 70, last: 70, at: at('2026-10-08') } },
    })
    expect(h.map((e) => e.id)).toEqual(['story:x-story', `lesson:${lesson.id}`])
    expect(h[1]).toMatchObject({ kind: 'grammar', title: lesson.title, score: 85, day: '2026-10-07' })
  })

  it('folds dictation sentences into one entry per day', () => {
    const h = buildHistory({
      ...base,
      listening: {
        a: { n: 1, best: 80, last: 80, at: at('2026-10-08', 9) },
        b: { n: 1, best: 60, last: 60, at: at('2026-10-08', 10) },
        c: { n: 1, best: 100, last: 100, at: at('2026-10-07') },
      },
    })
    expect(h).toHaveLength(2)
    expect(h[0]).toMatchObject({ title: 'Dictation', detail: '2 sentences', score: 70, day: '2026-10-08' })
  })

  it('counts a day’s flashcards from activity when cards have been reviewed again since', () => {
    const card = { last_review: at('2026-10-08') } as never
    const h = buildHistory({ ...base, cards: { c1: card }, activity: { '2026-10-08': { items: 25, correct: 20, newWords: 0, skills: { vocabulary: 25 } } } })
    expect(h[0]).toMatchObject({ kind: 'vocab', detail: '25 cards' })
  })
})

describe('continueItems', () => {
  const now = new Date(at('2026-10-08', 20))
  it('puts today’s saved session first, then unfinished audio', () => {
    const a = AUDIO_LESSONS[0]
    const items = continueItems({ ...base, audio: { [a.id]: { pos: 5, total: 20, at: at('2026-10-08') } } }, { done: 4, left: 6 }, now)
    expect(items.map((i) => i.id)).toEqual(['session', `audio:${a.id}`])
    expect(items[1]).toMatchObject({ detail: '25% through' })
  })

  it('drops finished and stale things', () => {
    const a = AUDIO_LESSONS[0]
    expect(continueItems({ ...base, audio: { [a.id]: { pos: 20, total: 20, done: at('2026-10-08'), at: at('2026-10-08') } } }, undefined, now)).toEqual([])
    expect(continueItems({ ...base, audio: { [a.id]: { pos: 5, total: 20, at: at('2026-09-01') } } }, undefined, now)).toEqual([])
  })
})

it('labels days', () => {
  const now = new Date(at('2026-10-08'))
  expect(dayLabel('2026-10-08', now)).toBe('Today')
  expect(dayLabel('2026-10-07', now)).toBe('Yesterday')
  expect(dayLabel('2026-10-01', now)).toMatch(/Oct/)
})
