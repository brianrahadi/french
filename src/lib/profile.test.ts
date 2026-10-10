import { describe, expect, it } from 'vitest'
import { initialState } from './store'
import { cleanName, daySkills, liveStreak, parseStats, parseSummary, profileStats, profileSummary, safeAvatar } from './profile'
import { periodOf, recap } from './stats'

const base = { ...initialState, activity: {}, cards: {}, lessons: {}, read: {}, stories: {}, writings: [], conversations: [], audio: {}, listening: {}, speaking: {} }
const activity = {
  '2026-09-27': { items: 5, correct: 4, newWords: 1, skills: { vocabulary: 5 } },
  '2026-09-30': { items: 10, correct: 8, newWords: 2, skills: { vocabulary: 6, grammar: 4 } },
  '2026-10-01': { items: 3, correct: 3, newWords: 0, skills: { listening: 3 } },
}

describe('profile snapshot', () => {
  it('gives the same recap as the progress it was built from', () => {
    const s = { ...base, activity, read: { 'a1-ma-famille': '2026-08-05' } }
    const stats = profileStats(s)
    for (const p of [periodOf('week', new Date(2026, 9, 1)), periodOf('month', new Date(2026, 8, 5)), periodOf('month', new Date(2026, 7, 1))])
      expect(recap({ activity: stats.days }, p, daySkills(stats.days))).toEqual(recap(s, p))
    // A day known only from a dated record (text read) is kept, with its estimated skills.
    expect(stats.days['2026-08-05']).toEqual({ items: 0, correct: 0, newWords: 0, skills: { reading: 6 } })
  })

  it('survives a trip through JSON and the untrusted-data check unchanged', () => {
    const stats = profileStats({ ...base, activity })
    expect(parseStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats)
  })

  it('summarises words, study days and the streak', () => {
    const stats = profileStats({ ...base, activity })
    const sum = profileSummary(stats, { introduced: { a: '2026-09-27', b: '2026-09-30k' } })
    expect(sum).toMatchObject({ level: 'A1', words: 2, studyDays: 3, lastDay: '2026-10-01', streak: 2 })
    expect(parseSummary(JSON.parse(JSON.stringify(sum)))).toEqual(sum)
    expect(liveStreak(sum, new Date(2026, 9, 2))).toBe(2)
    expect(liveStreak(sum, new Date(2026, 9, 3))).toBe(0)
  })
})

describe('reading other people’s snapshots', () => {
  it('rejects anything that is not a snapshot', () => {
    expect(parseStats(null)).toBeNull()
    expect(parseStats({ v: 2, level: 'A1' })).toBeNull()
    expect(parseStats({ v: 1, level: 'C2' })).toBeNull()
    expect(parseSummary('hi')).toBeNull()
  })

  it('fills gaps and drops bad values', () => {
    const s = parseStats({
      v: 1,
      level: 'B1',
      levels: { A1: 250, A2: -4, B1: '50' },
      sections: { A1: { grammar: { done: 99, total: 10 } } },
      days: { '2026-10-01': { items: 3, correct: 'x', skills: { reading: 2, hacking: 9 } }, 'not-a-day': { items: 1 }, '2026-10-02': 'nope' },
    })!
    expect(s.levels).toEqual({ A1: 100, A2: 0, B1: 0, B2: 0 })
    expect(s.sections.A1.grammar).toEqual({ done: 10, total: 10 })
    expect(s.sections.B2.speaking).toEqual({ done: 0, total: 0 })
    expect(s.days).toEqual({ '2026-10-01': { items: 3, correct: 0, newWords: 0, skills: { reading: 2 } } })
  })

  it('only shows Google profile pictures', () => {
    expect(safeAvatar('https://lh3.googleusercontent.com/a/abc=s96-c')).toBe('https://lh3.googleusercontent.com/a/abc=s96-c')
    expect(safeAvatar('http://lh3.googleusercontent.com/a/abc')).toBeUndefined()
    expect(safeAvatar('https://evil.example/googleusercontent.com.png')).toBeUndefined()
    expect(safeAvatar('https://googleusercontent.com.evil.example/x')).toBeUndefined()
    expect(safeAvatar('javascript:alert(1)')).toBeUndefined()
  })

  it('tidies names', () => {
    expect(cleanName('  Marie \n Curie ')).toBe('Marie Curie')
    expect(cleanName('')).toBe('Learner')
    expect(cleanName(undefined)).toBe('Learner')
    expect(cleanName('x'.repeat(80))).toHaveLength(60)
  })
})
