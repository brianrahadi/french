import type { ReaderTextDef } from './types'
import { inOrder } from '../content/load'

export type { ReaderTextDef } from './types'

/** Graded reading texts from content/reading/<level>/*.md (files starting with _ are drafts). */
export const BUILTIN_TEXTS: ReaderTextDef[] = inOrder(
  import.meta.glob<ReaderTextDef>(['/content/reading/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const TEXT_BY_ID: Record<string, ReaderTextDef> = Object.fromEntries(BUILTIN_TEXTS.map((t) => [t.id, t]))
