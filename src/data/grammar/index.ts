import type { Lesson, Level } from '../types'
import { A1_LESSONS } from './a1'
import { A2_LESSONS } from './a2'
import { B1_LESSONS } from './b1'
import { B2_LESSONS } from './b2'

export const LESSONS: Lesson[] = [...A1_LESSONS, ...A2_LESSONS, ...B1_LESSONS, ...B2_LESSONS]
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]))

export function lessonsByLevel(level: Level): Lesson[] {
  return LESSONS.filter((l) => l.level === level)
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id)
  return i >= 0 ? LESSONS[i + 1] : undefined
}
