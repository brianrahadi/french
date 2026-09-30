import type { Deck, Word } from '../types'
import { inOrder } from '../../content/load'

/** Vocabulary decks from content/vocab/<level>/*.md (files starting with _ are drafts). */
export const DECKS: Deck[] = inOrder(
  import.meta.glob<Deck>(['/content/vocab/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const DECK_BY_ID: Record<string, Deck> = Object.fromEntries(DECKS.map((d) => [d.id, d]))
export const BUILTIN_WORDS: Word[] = DECKS.flatMap((d) => d.words)

export const CUSTOM_DECK_ID = 'custom'

/** Built-in words plus the learner's own words. */
export function allWords(custom: Word[]): Word[] {
  return custom.length ? [...BUILTIN_WORDS, ...custom] : BUILTIN_WORDS
}

const builtinById = new Map(BUILTIN_WORDS.map((w) => [w.id, w]))
export function findWord(id: string, custom: Word[]): Word | undefined {
  return builtinById.get(id) ?? custom.find((w) => w.id === id)
}
