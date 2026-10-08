import { describe, expect, it } from 'vitest'
import type { Exercise, Lesson } from '../../data/types'
import type { LessonProgress } from '../../lib/store'
import { goalState, learnOrder, pickCheck, pickGoal, pickReview, reviewOrder, tallyByGoal } from './goals'

const cloze = (goal: string): Exercise => ({ type: 'cloze', sentence: 'a ___', answers: ['x'], explain: 'e', goal })
const mcq = (goal: string): Exercise => ({ type: 'mcq', prompt: 'p', options: ['a', 'b'], answer: 0, explain: 'e', goal })

const lesson: Lesson = {
  id: 'demo',
  level: 'A1',
  title: 'Demo',
  titleFr: 'Démo',
  summary: '',
  minutes: 5,
  sections: [],
  goals: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ],
  // a: 0, 3, 6 · b: 1, 4, 7 · c: 2, 5 (5 is the only typed one for c)
  exercises: [cloze('a'), mcq('b'), mcq('c'), cloze('a'), cloze('b'), cloze('c'), mcq('a'), mcq('b')],
}

const progress = (goals: LessonProgress['goals']): LessonProgress => ({ attempts: 1, best: 0.9, last: 0.9, lastAt: '', step: 0, goals })
const seq = () => {
  let i = 0
  return () => ((i = (i * 7 + 3) % 10) / 10)
}

describe('goal states', () => {
  it('are solid only when everything was right last time', () => {
    expect(goalState(undefined)).toBe('untested')
    expect(goalState({ n: 4, ok: 3, last: 1, at: '' })).toBe('solid')
    expect(goalState({ n: 4, ok: 4, last: 0.5, at: '' })).toBe('shaky')
  })
})

describe('picking exercises', () => {
  it('learns goal by goal, in lesson order', () => {
    expect(learnOrder(lesson)).toEqual([0, 3, 6, 1, 4, 7, 2, 5])
  })

  it('checks every goal, twice, preferring typed answers', () => {
    const picks = pickCheck(lesson, seq())
    expect(picks).toHaveLength(6)
    expect(new Set(picks).size).toBe(6)
    for (const g of ['a', 'b', 'c']) expect(picks.filter((i) => lesson.exercises[i].goal === g)).toHaveLength(2)
    // c has one typed exercise: it's always among c's picks
    expect(picks).toContain(5)
  })

  it('reviews weak goals first and gives them the spare questions', () => {
    const p = progress({ a: { n: 2, ok: 2, last: 1, at: '2026-01-02' }, b: { n: 2, ok: 1, last: 0.5, at: '2026-01-01' } })
    expect(reviewOrder(lesson, p).map((g) => g.id)).toEqual(['b', 'c', 'a'])
    const picks = pickReview(lesson, p, 5, seq())
    const per = (g: string) => picks.filter((i) => lesson.exercises[i].goal === g).length
    expect(picks).toHaveLength(5)
    expect(per('a')).toBe(1)
    expect(per('b')).toBe(2)
    expect(per('c')).toBe(2)
  })

  it('drills a single goal', () => {
    expect([...pickGoal(lesson, 'c', seq())].sort()).toEqual([2, 5])
  })

  it('tallies first tries per goal', () => {
    expect(tallyByGoal(lesson, { 0: true, 3: false, 1: true })).toEqual({ a: { n: 2, ok: 1 }, b: { n: 1, ok: 1 } })
  })
})
