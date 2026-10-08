import { LESSONS } from '../../data/grammar'
import type { Lesson } from '../../data/types'
import { dayKey } from '../../lib/date'
import { PASS_MARK, type LessonProgress } from '../../lib/store'

export type LessonStatus = 'new' | 'started' | 'mastered' | 'due'

export function lessonStatus(p: LessonProgress | undefined, today = dayKey()): LessonStatus {
  // Practising a single goal (or failing a level check) counts as started, not as a score.
  if (!p || (!p.attempts && !p.goals)) return 'new'
  if (p.best < PASS_MARK) return 'started'
  if (p.nextReview && p.nextReview <= today) return 'due'
  return 'mastered'
}

export function dueLessons(progress: Record<string, LessonProgress>): Lesson[] {
  const today = dayKey()
  return LESSONS.filter((l) => lessonStatus(progress[l.id], today) === 'due')
}

/** First lesson that isn't mastered yet, in curriculum order. */
export function nextUp(progress: Record<string, LessonProgress>): Lesson | undefined {
  return LESSONS.find((l) => {
    const s = lessonStatus(progress[l.id])
    return s === 'new' || s === 'started'
  })
}
