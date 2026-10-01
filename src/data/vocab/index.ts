import type { Deck, Word } from '../types'
import { inOrder } from '../../content/load'
import { findSameWord } from '../../lib/words'

/**
 * Vocabulary decks from content/vocab/ (files starting with _ are drafts):
 * themed decks from the level folders first, then the "5000 most frequent words"
 * decks from content/vocab/top5000/.
 */
export const DECKS: Deck[] = inOrder(
  import.meta.glob<Deck>(['/content/vocab/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const THEMED_DECKS: Deck[] = DECKS.filter((d) => !d.group)
export const FREQUENCY_DECKS: Deck[] = DECKS.filter((d) => d.group === 'frequency')
export const DECK_BY_ID: Record<string, Deck> = Object.fromEntries(DECKS.map((d) => [d.id, d]))

/**
 * Every built-in word once. A frequent word can be in a themed deck and a
 * frequency deck (same id, same card); the themed deck's copy is kept here.
 */
export const BUILTIN_WORDS: Word[] = (() => {
  const seen = new Set<string>()
  const out: Word[] = []
  for (const d of DECKS)
    for (const w of d.words)
      if (!seen.has(w.id)) {
        seen.add(w.id)
        out.push(w)
      }
  return out
})()

export const CUSTOM_DECK_ID = 'custom'
/** Stands for all the frequency decks at once (they're switched on and off together). */
export const FREQUENCY_ID = 'top5000'

/** Built-in words plus the learner's own words. */
export function allWords(custom: Word[]): Word[] {
  return custom.length ? [...BUILTIN_WORDS, ...custom] : BUILTIN_WORDS
}

const builtinById = new Map(BUILTIN_WORDS.map((w) => [w.id, w]))
export function findWord(id: string, custom: Word[]): Word | undefined {
  return builtinById.get(id) ?? custom.find((w) => w.id === id)
}

/** The 5000 most frequent words in frequency order (shared words as their themed-deck copy). */
export const FREQUENCY_WORDS: Word[] = FREQUENCY_DECKS.flatMap((d) => d.words).map((w) => builtinById.get(w.id) ?? w)
export const FREQUENCY_DECK_IDS: string[] = FREQUENCY_DECKS.map((d) => d.id)

/** The words of a deck, in the deck's order (FREQUENCY_ID gives all frequency words). */
export function deckWords(deckId: string, custom: Word[]): Word[] {
  if (deckId === CUSTOM_DECK_ID) return custom
  if (deckId === FREQUENCY_ID) return FREQUENCY_WORDS
  return (DECK_BY_ID[deckId]?.words ?? []).map((w) => builtinById.get(w.id) ?? w)
}

/**
 * Whether the learner already has this word, under any spelling of its entry
 * ("la gare" = "gare"): one of their own words, or a deck word they've started.
 */
export function alreadyHave(w: Pick<Word, 'fr' | 'pos' | 'g' | 'both'>, custom: Word[], introduced: Record<string, string>): boolean {
  if (findSameWord(w, custom)) return true
  const b = findSameWord(w, BUILTIN_WORDS)
  return !!b && !!introduced[b.id]
}
