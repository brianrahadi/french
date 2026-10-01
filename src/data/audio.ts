import type { AudioLessonDef } from './types'
import { inOrder } from '../content/load'

/** Pimsleur-style audio lessons from content/audio/<level>/*.md, in course order (files starting with _ are drafts). */
export const AUDIO_LESSONS: AudioLessonDef[] = inOrder(
  import.meta.glob<AudioLessonDef>(['/content/audio/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const AUDIO_BY_ID: Record<string, AudioLessonDef> = Object.fromEntries(AUDIO_LESSONS.map((l) => [l.id, l]))
