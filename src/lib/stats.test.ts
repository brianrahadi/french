import { describe, expect, it } from 'vitest'
import { initialState } from './store'
import { answersHistory, levelSections, percent, periodDays, periodLabel, periodOf, recap, shiftPeriod } from './stats'
import { LESSONS } from '../data/grammar'
import { SCENARIOS } from '../data/scenarios'
import { STORIES } from '../data/stories'
import { THEMED_DECKS } from '../data/vocab'
import { WRITING_PROMPTS } from '../data/writing'
import type { Conversation } from '../features/talk/types'
import type { WritingEntry } from './store'

const base = { ...initialState, activity: {}, cards: {}, lessons: {}, read: {}, stories: {}, writings: [], conversations: [], audio: {}, listening: {}, speaking: {} }
const activity = {
  '2026-09-27': { items: 5, correct: 4, newWords: 1, skills: { vocabulary: 5 } },
  '2026-09-30': { items: 10, correct: 8, newWords: 2, skills: { vocabulary: 6, grammar: 4 } },
  '2026-10-03': { items: 3, correct: 3, newWords: 0, skills: { listening: 3 } },
}

describe('periods', () => {
  it('starts weeks on Monday and months on the 1st', () => {
    const d = new Date(2026, 9, 1) // Thursday
    expect(periodOf('week', d).start).toEqual(new Date(2026, 8, 28))
    expect(periodOf('month', d).start).toEqual(new Date(2026, 9, 1))
    expect(periodDays(periodOf('week', d))).toHaveLength(7)
    expect(periodDays(periodOf('month', new Date(2026, 1, 10)))).toHaveLength(28)
    expect(periodLabel(periodOf('week', d))).toBe('Sep 28 – Oct 4')
    expect(shiftPeriod(periodOf('month', d), -1).start).toEqual(new Date(2026, 8, 1))
  })
})

describe('recap', () => {
  it('counts a week across a month boundary', () => {
    const r = recap({ ...base, activity }, periodOf('week', new Date(2026, 9, 1)))
    expect(r.activeDays).toEqual(['2026-09-30', '2026-10-03'])
    expect(r.answers).toBe(13)
    expect(r.skills).toMatchObject({ vocabulary: 6, grammar: 4, listening: 3, reading: 0 })
  })

  it('counts a month', () => {
    const r = recap({ ...base, activity }, periodOf('month', new Date(2026, 8, 5)))
    expect(r.answers).toBe(15)
    expect(r.newWords).toBe(3)
  })

  it('estimates skills for older days from dated records', () => {
    const s = { ...base, activity: { '2026-08-05': { items: 7, correct: 7, newWords: 0 } }, read: { 'a1-ma-famille': '2026-08-05' } }
    expect(recap(s, periodOf('month', new Date(2026, 7, 1))).skills.reading).toBe(6)
  })

  it('lists the last 12 periods, oldest first', () => {
    const rows = answersHistory({ activity }, periodOf('week', new Date(2026, 9, 1)))
    expect(rows).toHaveLength(12)
    expect(rows[11].answers).toBe(13)
    expect(rows[10].answers).toBe(5)
  })
})

describe('level sections', () => {
  it('counts what is done in each skill at one level', () => {
    const lesson = LESSONS.find((l) => l.level === 'A2')!
    const deck = THEMED_DECKS.find((d) => d.level === 'A2')!
    const prompt = WRITING_PROMPTS.find((p) => p.level === 'A2')!
    const [talked, unfinished] = SCENARIOS.filter((x) => x.level === 'A2')
    const story = STORIES.find((x) => x.level === 'A2')!
    const s = {
      ...base,
      introduced: { [deck.words[0].id]: '2026-09-01', [deck.words[1].id]: '2026-09-02k' },
      lessons: { [lesson.id]: { attempts: 1, best: 0.7, last: 0.7, lastAt: '', step: 0 } },
      writings: [{ promptId: prompt.id }, { promptId: 'free' }] as WritingEntry[],
      conversations: [{ scenarioId: talked.id, feedback: {} }, { scenarioId: unfinished.id }] as Conversation[],
      stories: { [story.id]: { n: 1, best: 50, last: 50, at: '' } },
    }
    const a2 = levelSections('A2', s)
    expect(a2.vocabulary.done).toBe(2)
    expect(a2.grammar).toEqual({ done: 1, total: LESSONS.filter((l) => l.level === 'A2').length })
    expect(a2.writing.done).toBe(1)
    expect(a2.speaking.done).toBe(1)
    expect(a2.listening.done).toBe(0) // 50% on a story isn't a pass
    expect(a2.reading.done).toBe(0)
    expect(levelSections('A1', s).grammar.done).toBe(0)
  })

  it('rounds down, but shows any start', () => {
    expect(percent({ done: 0, total: 10 })).toBe(0)
    expect(percent({ done: 0, total: 0 })).toBe(0)
    expect(percent({ done: 1, total: 300 })).toBe(1)
    expect(percent({ done: 199, total: 200 })).toBe(99)
    expect(percent({ done: 3, total: 3 })).toBe(100)
  })
})
