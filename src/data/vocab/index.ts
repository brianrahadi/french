import type { Deck, Word } from '../types'
import { A1_DECKS } from './a1'
import { A2_DECKS } from './a2'
import { B1_DECKS } from './b1'
import { B2_DECKS } from './b2'

export const DECKS: Deck[] = [...A1_DECKS, ...A2_DECKS, ...B1_DECKS, ...B2_DECKS]
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
