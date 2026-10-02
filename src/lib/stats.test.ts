import { describe, expect, it } from 'vitest'
import { initialState } from './store'
import { addMonths, answersByMonth, monthRecap } from './stats'

const base = { ...initialState, activity: {}, cards: {}, lessons: {}, read: {}, stories: {}, writings: [], conversations: [], audio: {}, listening: {}, speaking: {} }

describe('monthly recap', () => {
  it('counts days, answers and skills for one month only', () => {
    const s = {
      ...base,
      activity: {
        '2026-09-30': { items: 5, correct: 4, newWords: 1, skills: { vocabulary: 5 } },
        '2026-10-01': { items: 10, correct: 8, newWords: 2, skills: { vocabulary: 6, grammar: 4 } },
        '2026-10-03': { items: 3, correct: 3, newWords: 0, skills: { listening: 3 } },
      },
    }
    const r = monthRecap(s, { year: 2026, month: 9 })
    expect(r.activeDays).toEqual([1, 3])
    expect(r.answers).toBe(13)
    expect(r.newWords).toBe(2)
    expect(r.skills).toMatchObject({ vocabulary: 6, grammar: 4, listening: 3, reading: 0 })
  })

  it('estimates skills for older days from dated records', () => {
    const s = { ...base, activity: { '2026-08-05': { items: 7, correct: 7, newWords: 0 } }, read: { 'a1-ma-famille': '2026-08-05' } }
    expect(monthRecap(s, { year: 2026, month: 7 }).skills.reading).toBe(6)
  })

  it('lists the last 12 months, oldest first', () => {
    const rows = answersByMonth({ activity: { '2026-10-02': { items: 4, correct: 4, newWords: 0 } } }, { year: 2026, month: 9 })
    expect(rows).toHaveLength(12)
    expect(rows[0].month).toEqual(addMonths({ year: 2026, month: 9 }, -11))
    expect(rows[11].answers).toBe(4)
  })
})
