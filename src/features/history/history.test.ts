import { describe, expect, it } from 'vitest'
import { initialState } from '../../lib/store'
import { LESSONS } from '../../data/grammar'
import { AUDIO_LESSONS } from '../../data/audio'
import { BOOKS, chapterKey } from '../../data/books'
import { buildHistory, continueItems, dayLabel, recentGroups, type HistoryEntry } from './history'

const base = { ...initialState }
const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).toISOString()

describe('books', () => {
  it('lists finished chapters and keeps a book you are reading on Continue', () => {
    const b = BOOKS[0]
    const now = new Date('2026-10-09T12:00:00')
    const s = { ...base, read: { [chapterKey(b.id, 1)]: '2026-10-08' }, books: { [b.id]: { chapter: 2, at: at('2026-10-08', 11) } } }
    expect(buildHistory(s)[0]).toMatchObject({ kind: 'reading', title: b.title, detail: 'Chapter 1', to: `/books/${b.id}/1` })
    expect(continueItems(s, undefined, now)[0]).toMatchObject({ title: b.title, detail: `Chapter 2 of ${b.chapters.length}`, to: `/books/${b.id}/2` })
  })
})

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

describe('recentGroups', () => {
  const e = (day: string): HistoryEntry => ({ id: day, kind: 'grammar', title: day, at: `${day}T10:00:00`, day, to: '/' })
  it('buckets into Today, Past week, then by month', () => {
    const now = new Date('2026-10-09T15:00:00')
    const days = ['2026-10-09', '2026-10-09', '2026-10-08', '2026-10-03', '2026-10-02', '2026-10-01', '2026-09-20', '2026-09-01', '2025-12-31']
    const g = recentGroups(days.map(e), now)
    expect(g.map((x) => [x.label, x.entries.length])).toEqual([
      ['Today', 2],
      ['Past week', 2],
      ['Oct', 2],
      ['Sept', 2],
      ['Dec 2025', 1],
    ])
  })
})
