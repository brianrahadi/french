import { Rating, type Grade } from '../../lib/srs'
import type { MixedItem, MixedPlan } from './plan'

export interface Tally {
  n: number
  ok: number
}

/** Where a session is: what's left, what's been answered, and how it went. */
export interface Run {
  items: MixedItem[]
  learning: { id: string; due: number }[]
  current: MixedItem | null
  /** The current question has been answered (and counted) but not moved past yet. */
  answered: boolean
  done: number
  vocab: Tally
  newWords: number
  grammar: Tally
  conj: Tally
  listen: Tally
  say: Tally
  fix: Tally
  /** First-try results for lessons being reviewed. */
  lessons: Record<string, Tally>
  /** First-try results per lesson goal, keyed "lessonId goalId", for lessons being reviewed. */
  goals?: Record<string, Tally>
  /** Lesson reviews already saved to progress. */
  recorded: string[]
  mistakes: { what: string; given: string; expected: string }[]
}

export const LEARN_AHEAD_MS = 20 * 60_000

export function pick(r: Run, now = Date.now()): Run {
  const learning = [...r.learning].sort((a, b) => a.due - b.due)
  const next = { ...r, answered: false }
  if (learning[0] && learning[0].due <= now) {
    const [first, ...rest] = learning
    return { ...next, learning: rest, current: { kind: 'card', id: first.id } }
  }
  if (r.items.length) {
    const [first, ...rest] = r.items
    return { ...next, items: rest, current: first, learning }
  }
  if (learning[0] && learning[0].due - now < LEARN_AHEAD_MS) {
    const [first, ...rest] = learning
    return { ...next, learning: rest, current: { kind: 'card', id: first.id } }
  }
  return { ...next, current: null, learning }
}

export function insertAt<T>(arr: T[], index: number, item: T): T[] {
  const a = [...arr]
  a.splice(Math.min(index, a.length), 0, item)
  return a
}

/**
 * A word card comes back later in the session only when it was missed. One answered
 * right isn't asked again in the same session, even while it's still being learned:
 * its next step waits for a later review.
 */
export const cardComesBack = (grade: Grade, due: number, now = Date.now()): boolean => grade === Rating.Again && due - now < 60 * 60_000

export const bump = (t: Tally, ok: boolean): Tally => ({ n: t.n + 1, ok: t.ok + (ok ? 1 : 0) })

export function start(plan: MixedPlan): Run {
  return pick({
    items: plan.items,
    learning: [],
    current: null,
    answered: false,
    done: 0,
    vocab: { n: 0, ok: 0 },
    newWords: 0,
    grammar: { n: 0, ok: 0 },
    conj: { n: 0, ok: 0 },
    listen: { n: 0, ok: 0 },
    say: { n: 0, ok: 0 },
    fix: { n: 0, ok: 0 },
    lessons: {},
    goals: {},
    recorded: [],
    mistakes: [],
  })
}

/** One lesson's per-goal results out of a run. */
export function lessonGoals(r: Run, lessonId: string): Record<string, Tally> {
  const out: Record<string, Tally> = {}
  for (const [k, t] of Object.entries(r.goals ?? {})) {
    const [id, goal] = k.split(' ')
    if (id === lessonId && goal) out[goal] = t
  }
  return out
}

/** Questions still to come, including the one on screen. */
export const remaining = (r: Run): number => r.items.length + r.learning.length + (r.current ? 1 : 0)

/**
 * Lesson reviews that can be scored now: once each of the lesson's review questions
 * has a first-try answer, or — when the session is over, or wrapped up unfinished
 * (`wrapUp`) — as soon as any of them does. A question just answered is held back
 * until it's moved past, since its result can still be overridden.
 */
export function lessonsToRecord(plan: MixedPlan, r: Run, wrapUp = false): string[] {
  return plan.reviewLessons.filter((id) => {
    const t = r.lessons[id]
    if (!t?.n || r.recorded.includes(id)) return false
    if (wrapUp || !r.current) return true
    if (r.answered && r.current.kind === 'grammar' && r.current.lessonId === id) return false
    const planned = plan.items.filter((x) => x.kind === 'grammar' && x.review && x.lessonId === id).length
    return t.n >= planned
  })
}
