import type { WritingPrompt } from './types'
import { inOrder } from '../content/load'

export type { WritingPrompt } from './types'

/** Writing prompts from content/writing/<level>/*.md (files starting with _ are drafts). */
export const WRITING_PROMPTS: WritingPrompt[] = inOrder(
  import.meta.glob<WritingPrompt>(['/content/writing/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const PROMPT_BY_ID: Record<string, WritingPrompt> = Object.fromEntries(WRITING_PROMPTS.map((p) => [p.id, p]))
