import type { Lesson, Level } from '../types'
import { inOrder } from '../../content/load'

/** Grammar lessons from content/grammar/<level>/*.md (files starting with _ are drafts). */
export const LESSONS: Lesson[] = inOrder(
  import.meta.glob<Lesson>(['/content/grammar/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]))

export function lessonsByLevel(level: Level): Lesson[] {
  return LESSONS.filter((l) => l.level === level)
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id)
  return i >= 0 ? LESSONS[i + 1] : undefined
}
