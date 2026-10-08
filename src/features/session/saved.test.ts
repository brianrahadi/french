import { beforeEach, describe, expect, it } from 'vitest'
import { initialState, useStore, type State } from '../../lib/store'
import { cardId, newCard } from '../../lib/srs'
import { addDays } from '../../lib/date'
import { BUILTIN_WORDS } from '../../data/vocab'
import { LESSONS } from '../../data/grammar'
import type { MixedItem, MixedPlan } from './plan'
import { lessonsToRecord, pick, start, type Run } from './run'
import { loadSession, resumeRun, saveSession, settleSession } from './saved'

const L = LESSONS[0].id
const review = (index: number): MixedItem => ({ kind: 'grammar', lessonId: L, index, review: true })
const zero = { reviews: 0, newWords: 0, grammar: 0, conj: 0, listen: 0, say: 0, fix: 0, weak: 0, moreReviews: 0 }
const planOf = (items: MixedItem[], reviewLessons: string[] = []): MixedPlan => ({ mode: 'daily', items, counts: zero, reviewLessons, minutes: 1 })

/** Answer the question on screen (first try), as the session does before Continue. */
const answer = (r: Run, ok: boolean): Run => {
  const c = r.current
  const lessons = c?.kind === 'grammar' && c.review ? { ...r.lessons, [c.lessonId]: { n: (r.lessons[c.lessonId]?.n ?? 0) + 1, ok: (r.lessons[c.lessonId]?.ok ?? 0) + (ok ? 1 : 0) } } : r.lessons
  return { ...r, answered: true, lessons }
}
const next = (r: Run): Run => pick({ ...r, done: r.done + 1 })

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

const progress = (over: Partial<State> = {}) => ({ ...initialState, cards: {}, introduced: {}, mistakes: [], ...over })

beforeEach(() => useStore.setState({ ...initialState, lessons: {} }))

describe('lesson reviews in a session', () => {
  const plan = planOf([review(0), review(1), review(2)], [L])

  it('waits until every review question is answered and moved past', () => {
    let r = start(plan)
    r = next(answer(r, true))
    expect(lessonsToRecord(plan, r)).toEqual([])
    r = next(answer(r, true))
    r = answer(r, false)
    // Just answered: the result can still be overridden.
    expect(lessonsToRecord(plan, r)).toEqual([])
    expect(lessonsToRecord(plan, next(r))).toEqual([L])
    expect(lessonsToRecord(plan, { ...next(r), recorded: [L] })).toEqual([])
  })

  it('scores a review part-way when wrapping up, but not one never reached', () => {
    const r = answer(start(plan), true)
    expect(lessonsToRecord(plan, r, true)).toEqual([L])
    expect(lessonsToRecord(plan, start(plan), true)).toEqual([])
  })
})

describe('resuming a session', () => {
  const [a, b, c] = BUILTIN_WORDS
  const now = new Date()

  it('brings back the question left unanswered, and moves past one already answered', () => {
    const plan = planOf([review(0), review(1)])
    const r = start(plan)
    const back = resumeRun(r, progress(), now.getTime())
    expect(back.current).toEqual(review(0))
    expect(back.done).toBe(0)
    const on = resumeRun(answer(r, true), progress(), now.getTime())
    expect(on.current).toEqual(review(1))
    expect(on.done).toBe(1)
    expect(on.answered).toBe(false)
  })

  it('drops what was done elsewhere since: words reviewed or started, corrections fixed', () => {
    const plan = planOf([
      { kind: 'card', id: cardId(a.id, 'r') },
      { kind: 'intro', wordId: b.id },
      { kind: 'fix', mistakeId: 'm1' },
      { kind: 'card', id: cardId(c.id, 'r') },
    ])
    const s = progress({
      cards: { [cardId(a.id, 'r')]: { ...newCard(now), due: addDays(now, 3).toISOString() }, [cardId(c.id, 'r')]: newCard(now) },
      introduced: { [b.id]: '2026-10-02' },
      mistakes: [{ id: 'm1', at: '', source: 'writing', skill: 'write:x', given: 'a', expected: 'b', resolved: true }],
    })
    const r = resumeRun({ ...start(plan), current: null, items: plan.items }, s, now.getTime())
    expect(r.current).toEqual({ kind: 'card', id: cardId(c.id, 'r') })
    expect(r.items).toEqual([])
  })
})

describe('saving today’s session', () => {
  const plan = planOf([review(0), review(1), review(2)], [L])
  const today = new Date(2026, 9, 2, 9)
  const tomorrow = new Date(2026, 9, 3, 9)

  it('picks up today where it was left', () => {
    const store = memoryStorage()
    const r = next(answer(start(plan), true))
    saveSession(plan, r, 90_000, store, today)
    const back = loadSession(useStore.getState(), store, today)
    expect(back?.run.current).toEqual(review(1))
    expect(back?.run.done).toBe(1)
    expect(back?.elapsed).toBe(90_000)
    // Still there: settling only wraps up sessions that can't be carried on.
    settleSession(store, today)
    expect(store.m.size).toBe(1)
    expect(useStore.getState().lessons[L]).toBeUndefined()
  })

  it('wraps up an unfinished session from an earlier day, scoring the lesson review started', () => {
    const store = memoryStorage()
    saveSession(plan, next(answer(start(plan), true)), 60_000, store, today)
    expect(loadSession(useStore.getState(), store, tomorrow)).toBeNull()
    settleSession(store, tomorrow)
    expect(store.m.size).toBe(0)
    expect(useStore.getState().lessons[L]).toMatchObject({ attempts: 1, last: 1 })
  })

  it('doesn’t score a review twice', () => {
    const store = memoryStorage()
    saveSession(plan, { ...next(answer(start(plan), true)), recorded: [L] }, 60_000, store, today)
    settleSession(store, tomorrow)
    expect(useStore.getState().lessons[L]).toBeUndefined()
  })

  it('ignores a session from before progress was reset, or one it can’t read', () => {
    const store = memoryStorage()
    saveSession(plan, next(answer(start(plan), true)), 60_000, store, today)
    useStore.setState({ sync: { ...initialState.sync, epoch: 'e-new' } })
    expect(loadSession(useStore.getState(), store, today)).toBeNull()
    store.setItem('petit-a-petit-session', '{not json')
    expect(loadSession(useStore.getState(), store, today)).toBeNull()
  })
})
