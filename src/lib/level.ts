import { LEVELS, type Level } from '../data/types'
import { LESSONS } from '../data/grammar'
import { BUILTIN_TEXTS } from '../data/texts'
import { STORIES } from '../data/stories'
import { useStore, type State } from './store'

/** Share of a level's grammar, reading and listening you must finish before the app moves you up. */
export const LEVEL_UP_AT = 0.7

type Progress = Pick<State, 'startLevel' | 'lessons' | 'read' | 'stories'>

/** How much of a level is done (0..1): grammar lessons passed, graded texts read, stories answered. */
export function levelProgress(level: Level, s: Progress): number {
  const lessons = LESSONS.filter((l) => l.level === level)
  const texts = BUILTIN_TEXTS.filter((t) => t.level === level)
  const stories = STORIES.filter((t) => t.level === level)
  const total = lessons.length + texts.length + stories.length
  if (!total) return 0
  const done =
    lessons.filter((l) => (s.lessons[l.id]?.best ?? 0) >= 0.7).length +
    texts.filter((t) => s.read[t.id]).length +
    stories.filter((t) => (s.stories?.[t.id]?.best ?? 0) >= 60).length
  return done / total
}

/**
 * The level the learner is working at now: where they started, moved up one
 * level at a time once most of the current level is done.
 */
export function currentLevel(s: Progress): Level {
  let i = LEVELS.indexOf(s.startLevel ?? 'A1')
  while (i < LEVELS.length - 1 && levelProgress(LEVELS[i], s) >= LEVEL_UP_AT) i++
  return LEVELS[i]
}

/** Is `level` at or below the learner's level? */
export function withinLevel(level: Level, current: Level): boolean {
  return LEVELS.indexOf(level) <= LEVELS.indexOf(current)
}

/** Levels above the learner's, nearest first. */
export function harderLevels(current: Level): Level[] {
  return LEVELS.slice(LEVELS.indexOf(current) + 1)
}

export function useCurrentLevel(): Level {
  const startLevel = useStore((s) => s.startLevel)
  const lessons = useStore((s) => s.lessons)
  const read = useStore((s) => s.read)
  const stories = useStore((s) => s.stories)
  return currentLevel({ startLevel, lessons, read, stories })
}
