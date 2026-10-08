import type { Exercise, Lesson, LessonGoal, Level } from '../../data/types'
import { lessonsByLevel } from '../../data/grammar'
import type { GoalStat, GoalTally, LessonProgress } from '../../lib/store'
import { lessonStatus } from './status'

/**
 * Goals are the can-do points a lesson teaches ("Choose c’est or il est").
 * Every exercise tests one goal, so practice can be aimed at goals and
 * results can say exactly what is known and what isn't.
 */

/**
 * - learn: the first session — every exercise, goal by goal, in teaching order
 * - practice: every exercise, shuffled
 * - review: a short spaced review, weakest goals first
 * - check: a test-out — one or two questions per goal, no second chances
 * - goal: every exercise of one goal (doesn't change the lesson score)
 */
export type PracticeMode = 'learn' | 'practice' | 'review' | 'check' | 'goal'

/** Tested-out lessons skip the first rungs of the review ladder (1 and 3 days). */
export const TESTED_OUT_STEP = 2

/** The session a plain “Practice” button starts. */
export function defaultMode(p: LessonProgress | undefined): PracticeMode {
  if (!p?.attempts) return 'learn'
  return lessonStatus(p) === 'due' ? 'review' : 'practice'
}

export type GoalState = 'solid' | 'shaky' | 'untested'

/** Solid = every question on it was right the last time it was tested. */
export function goalState(st: GoalStat | undefined): GoalState {
  if (!st || !st.n) return 'untested'
  return st.last >= 1 ? 'solid' : 'shaky'
}

export const GOAL_LABEL: Record<GoalState, string> = {
  solid: 'Solid',
  shaky: 'Needs work',
  untested: 'Not tested yet',
}

export function goalStates(lesson: Lesson, p: LessonProgress | undefined): Record<string, GoalState> {
  return Object.fromEntries(lesson.goals.map((g) => [g.id, goalState(p?.goals?.[g.id])]))
}

export function goalCounts(lesson: Lesson, p: LessonProgress | undefined): Record<GoalState, number> {
  const c: Record<GoalState, number> = { solid: 0, shaky: 0, untested: 0 }
  for (const s of Object.values(goalStates(lesson, p))) c[s]++
  return c
}

/** Exercise indexes for each goal, in file order. */
export function exercisesByGoal(lesson: Lesson): Record<string, number[]> {
  const by: Record<string, number[]> = Object.fromEntries(lesson.goals.map((g) => [g.id, []]))
  lesson.exercises.forEach((e, i) => {
    if (e.goal && by[e.goal]) by[e.goal].push(i)
  })
  return by
}

export function goalOf(lesson: Lesson, id: string | undefined): LessonGoal | undefined {
  return id ? lesson.goals.find((g) => g.id === id) : undefined
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Typed answers prove more than picking from options, so checks prefer them. */
const productive = (e: Exercise) => e.type !== 'mcq'

/** Candidates for one goal: productive exercises first (shuffled), then the rest. */
function candidates(lesson: Lesson, ids: number[], rand: () => number): number[] {
  const p = shuffle(
    ids.filter((i) => productive(lesson.exercises[i])),
    rand,
  )
  const m = shuffle(
    ids.filter((i) => !productive(lesson.exercises[i])),
    rand,
  )
  return [...p, ...m]
}

/** Round-robin over goals (in the given order) until `size` exercises are taken. */
function roundRobin(pools: number[][], size: number): number[] {
  const out: number[] = []
  const queues = pools.map((p) => [...p])
  while (out.length < size && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (out.length >= size) break
      const next = q.shift()
      if (next !== undefined) out.push(next)
    }
  }
  return out
}

/** How many questions a test-out check asks: two per goal, between 6 and 12. */
export function checkSize(lesson: Lesson): number {
  return Math.min(lesson.exercises.length, Math.max(6, Math.min(12, lesson.goals.length * 2)))
}

/**
 * A short test-out: every goal at least once (twice when there's room),
 * preferring typed answers, in a mixed order.
 */
export function pickCheck(lesson: Lesson, rand: () => number = Math.random): number[] {
  const by = exercisesByGoal(lesson)
  const pools = lesson.goals.map((g) => candidates(lesson, by[g.id], rand))
  return shuffle(roundRobin(pools, checkSize(lesson)), rand)
}

const STATE_ORDER: Record<GoalState, number> = { shaky: 0, untested: 1, solid: 2 }

/** Goals ordered for a review: needs-work first, then untested, then the longest-unseen solid ones. */
export function reviewOrder(lesson: Lesson, p: LessonProgress | undefined): LessonGoal[] {
  return [...lesson.goals].sort((a, b) => {
    const sa = p?.goals?.[a.id]
    const sb = p?.goals?.[b.id]
    const d = STATE_ORDER[goalState(sa)] - STATE_ORDER[goalState(sb)]
    if (d) return d
    return (sa?.at ?? '').localeCompare(sb?.at ?? '')
  })
}

export const REVIEW_SIZE = 10

/**
 * A spaced review: up to `size` questions covering every goal, weakest goals
 * first and getting the spare questions.
 */
export function pickReview(lesson: Lesson, p: LessonProgress | undefined, size = REVIEW_SIZE, rand: () => number = Math.random): number[] {
  const by = exercisesByGoal(lesson)
  const goals = reviewOrder(lesson, p)
  const pools = goals.map((g) => shuffle(by[g.id], rand))
  // Weak goals get a second question before solid ones get their first extra.
  const weak = goals.filter((g) => goalState(p?.goals?.[g.id]) !== 'solid').length
  const first = roundRobin(
    pools.map((q) => q.slice(0, 1)),
    size,
  )
  const second = roundRobin(
    pools.slice(0, weak).map((q) => q.slice(1, 2)),
    size - first.length,
  )
  const taken = new Set([...first, ...second])
  const rest = roundRobin(
    pools.map((q) => q.filter((i) => !taken.has(i))),
    size - taken.size,
  )
  return shuffle([...first, ...second, ...rest], rand)
}

/** First study session: the lesson's exercises grouped goal by goal, in the order the lesson teaches them. */
export function learnOrder(lesson: Lesson): number[] {
  const by = exercisesByGoal(lesson)
  const grouped = lesson.goals.flatMap((g) => by[g.id])
  const rest = lesson.exercises.map((_, i) => i).filter((i) => !grouped.includes(i))
  return [...grouped, ...rest]
}

/** Every exercise of one goal, shuffled. */
export function pickGoal(lesson: Lesson, goal: string, rand: () => number = Math.random): number[] {
  return shuffle(exercisesByGoal(lesson)[goal] ?? [], rand)
}

/** First-try results (exercise index → right?) summed per goal. */
export function tallyByGoal(lesson: Lesson, results: Record<number, boolean>): GoalTally {
  const t: GoalTally = {}
  for (const [i, ok] of Object.entries(results)) {
    const g = lesson.exercises[Number(i)]?.goal
    if (!g) continue
    const cur = (t[g] ??= { n: 0, ok: 0 })
    cur.n++
    if (ok) cur.ok++
  }
  return t
}

/** Two questions from two different goals: the per-lesson sample of a level check. */
export function pickLevelSample(lesson: Lesson, rand: () => number = Math.random): number[] {
  const by = exercisesByGoal(lesson)
  const goals = shuffle(
    lesson.goals.filter((g) => by[g.id].length),
    rand,
  ).slice(0, 2)
  return goals.map((g) => candidates(lesson, by[g.id], rand)[0])
}

/** Lessons of a level that a level check still has something to prove for. */
export function levelCheckLessons(level: Level, progress: Record<string, LessonProgress>): Lesson[] {
  return lessonsByLevel(level).filter((l) => l.goals.length && lessonStatus(progress[l.id]) !== 'mastered' && lessonStatus(progress[l.id]) !== 'due')
}
