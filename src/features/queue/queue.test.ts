import { describe, expect, it } from 'vitest'
import { initialState } from '../../lib/store'
import { LESSONS } from '../../data/grammar'
import { BUILTIN_TEXTS } from '../../data/texts'
import { STORIES } from '../../data/stories'
import { LEVEL_UP_AT } from '../../lib/level'
import { buildMixedPlan } from '../session/plan'
import { explainSession, levelSummary, newWordSchedule, reviewSchedule, reviewsPerDay } from './queue'

const base = { ...initialState }

describe('levelSummary', () => {
  it('counts grammar, texts and stories toward moving up, and lists the rest too', () => {
    const lesson = LESSONS.find((l) => l.level === 'A1')!
    const s = levelSummary('A1', { ...base, lessons: { [lesson.id]: { attempts: 1, best: 0.9, last: 0.9, lastAt: '', step: 0 } } })
    const total = LESSONS.filter((l) => l.level === 'A1').length + BUILTIN_TEXTS.filter((t) => t.level === 'A1').length + STORIES.filter((t) => t.level === 'A1').length
    expect(s.total).toBe(total)
    expect(s.done).toBe(1)
    expect(s.needed).toBe(Math.ceil(total * LEVEL_UP_AT))
    expect(s.left).toBe(s.needed - 1)
    expect(s.rows.find((r) => r.id === `lesson:${lesson.id}`)).toMatchObject({ status: 'done', have: '90%', counts: true })
    expect(s.rows.some((r) => r.kind === 'word' && !r.counts)).toBe(true)
  })
})

describe('reviewSchedule', () => {
  const now = new Date('2026-10-09T10:00:00')
  it('sorts cards and lessons by due date, overdue first, and buckets them by day', () => {
    const lesson = LESSONS[0]
    const word = newWordSchedule(base)[0]
    expect(word).toBeTruthy()
    const cards = {
      [`${word.id}|r`]: { due: '2026-10-07T09:00:00.000Z', state: 2, scheduled_days: 3 } as never,
      [`${word.id}|p`]: { due: '2026-10-12T09:00:00.000Z', state: 2, scheduled_days: 30 } as never,
    }
    const rows = reviewSchedule({ ...base, cards, lessons: { [lesson.id]: { attempts: 1, best: 0.9, last: 0.9, lastAt: '', step: 1, nextReview: '2026-10-10' } } }, now)
    expect(rows.map((r) => r.kind)).toEqual(['card', 'lesson', 'card'])
    expect(rows[0]).toMatchObject({ overdue: true, day: '2026-10-09' })
    expect(rows[2]).toMatchObject({ state: 'mature', interval: 30 })
    const per = reviewsPerDay(rows, 7, now)
    expect(per[0]).toMatchObject({ day: '2026-10-09', cards: 1 })
    expect(per[1]).toMatchObject({ lessons: 1 })
  })
})

describe('newWordSchedule', () => {
  it('spreads the queue over days at your daily new-word setting', () => {
    const rows = newWordSchedule({ ...base, settings: { ...base.settings, newPerDay: 10 } }, new Date('2026-10-09T10:00:00'))
    expect(rows.length).toBeGreaterThan(25)
    expect(rows[0]).toMatchObject({ position: 1, day: '2026-10-09' })
    expect(rows[9].day).toBe('2026-10-09')
    expect(rows[10].day).toBe('2026-10-10')
    expect(rows[20].day).toBe('2026-10-11')
  })
})

describe('explainSession', () => {
  it('gives every item of the session a reason', () => {
    const plan = buildMixedPlan({ ...base } as never, () => 0.5)
    const rows = explainSession(plan, base)
    expect(plan.items.length).toBeGreaterThan(0)
    expect(rows).toHaveLength(plan.items.length)
    for (const r of rows) expect(r.reason.length).toBeGreaterThan(5)
  })
})
