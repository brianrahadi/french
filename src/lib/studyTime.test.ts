import { describe, expect, it } from 'vitest'
import { initialState } from './store'
import { addTime, estimatedTime, formatDuration, formatHours, mergeTime, recentDays, sumTime, timeKeyFor, timeTotals, trackingSince, weekDays } from './studyTime'

describe('study time', () => {
  it('knows what kind of study each page is', () => {
    expect(timeKeyFor('/session')).toBe('session')
    expect(timeKeyFor('/grammar/etre-avoir/practice')).toBe('grammar')
    expect(timeKeyFor('/grammar/check/A1')).toBe('grammar')
    expect(timeKeyFor('/listening/story/a1-le-chat')).toBe('stories')
    expect(timeKeyFor('/listening/session')).toBe('dictation')
    expect(timeKeyFor('/dictation')).toBe('dictation')
    expect(timeKeyFor('/audio/audio-01')).toBe('audio')
    expect(timeKeyFor('/reading/a1-ma-famille')).toBe('reading')
    expect(timeKeyFor('/writing/new')).toBe('writing')
    expect(timeKeyFor('/talk/c1')).toBe('talk')
    expect(timeKeyFor('/speaking/session')).toBe('speaking')
    expect(timeKeyFor('/vocab/study')).toBe('vocab')
    expect(timeKeyFor('/verbs/aller')).toBe('verbs')
    for (const p of ['/', '/library', '/roadmap', '/settings', '/profile', '/practice', '/grammarian']) expect(timeKeyFor(p), p).toBeNull()
  })

  it('adds up per device and merges without double counting', () => {
    let log = addTime({}, 'a', '2026-10-12', { grammar: 30 })
    log = addTime(log, 'a', '2026-10-12', { grammar: 30, talk: 10 })
    log = addTime(log, 'b', '2026-10-12', { grammar: 5 })
    expect(sumTime(log)['2026-10-12']).toEqual({ grammar: 65, talk: 10 })
    const older = addTime({}, 'a', '2026-10-12', { grammar: 30 })
    expect(mergeTime(log, older)).toEqual(log)
    expect(mergeTime(older, log)).toEqual(log)
    expect(trackingSince(log)).toBe('2026-10-12')
  })

  it('estimates days before tracking from what was done, and only those days', () => {
    const at = new Date(2026, 9, 10, 18).toISOString()
    const s = {
      ...initialState,
      activity: { '2026-10-10': { items: 40, correct: 30, newWords: 5, skills: { vocabulary: 30, grammar: 10 } }, '2026-10-13': { items: 99, correct: 0, newWords: 0 } },
      read: { t1: '2026-10-10' },
      studyTime: { a: { '2026-10-12': { grammar: 600 } } },
      writings: [{ id: 'w', promptId: 'free', title: '', task: '', level: 'A1' as const, text: '', words: 100, createdAt: at, model: '', feedback: {} as never }],
    }
    const est = estimatedTime(s)
    expect(Object.keys(est)).toEqual(['2026-10-10'])
    expect(est['2026-10-10']).toEqual({ review: 270, grammar: 200, reading: 600, writing: 1200 })
    const t = timeTotals(s)
    expect(t.total).toBe(270 + 200 + 600 + 1200 + 600)
    expect(t.estimated).toBe(2270)
    expect(timeTotals(s, '2026-10-11').total).toBe(600)
    expect(recentDays(s, 3, new Date(2026, 9, 12)).map((d) => d.total)).toEqual([2270, 0, 600])
  })

  it('formats durations for people', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(40 * 60)).toBe('40 min')
    expect(formatDuration(85 * 60)).toBe('1 h 25')
    expect(formatDuration(120 * 60)).toBe('2 h')
    expect(formatHours(3.46 * 3600)).toBe('3.5')
    expect(formatHours(42.4 * 3600)).toBe('42')
    expect(weekDays(new Date(2026, 9, 14))).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
  })
})
