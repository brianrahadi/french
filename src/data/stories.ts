import type { StoryDef } from './types'
import { inOrder } from '../content/load'

/** Listening stories from content/stories/<level>/*.md (files starting with _ are drafts). */
export const STORIES: StoryDef[] = inOrder(
  import.meta.glob<StoryDef>(['/content/stories/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const STORY_BY_ID: Record<string, StoryDef> = Object.fromEntries(STORIES.map((s) => [s.id, s]))

/** Spoken length in minutes at a learner-friendly pace (~120 words a minute). */
export function storyMinutes(s: StoryDef): number {
  const words = s.paragraphs.reduce((n, p) => n + p.fr.split(/\s+/).filter(Boolean).length, 0)
  return Math.max(1, Math.round((words / 120) * 2) / 2)
}
