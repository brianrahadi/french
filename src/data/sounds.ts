import type { SoundSet } from './types'
import { inOrder } from '../content/load'

export type { SoundSet } from './types'

/** Pronunciation sets from content/pronunciation/*.md (files starting with _ are drafts). */
export const SOUND_SETS: SoundSet[] = inOrder(
  import.meta.glob<SoundSet>(['/content/pronunciation/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
