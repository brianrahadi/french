import { DECKS, CUSTOM_DECK_ID, findWord } from '../../data/vocab'
import type { Word } from '../../data/types'
import { addDays, dayKey, endOfDay } from '../../lib/date'
import { cardId, cardStatus, combineStatus, parseCardId, type CardDir, type StoredCard, type WordStatus } from '../../lib/srs'
import type { Directions, State } from '../../lib/store'

export function dirsFor(d: Directions): CardDir[] {
  return d === 'both' ? ['r', 'p'] : d === 'recognition' ? ['r'] : ['p']
}

export function wordStatus(wordId: string, cards: Record<string, StoredCard>): WordStatus {
  const r = cards[cardId(wordId, 'r')]
  const p = cards[cardId(wordId, 'p')]
  if (!r && !p) return 'new'
  return combineStatus([r, p].filter(Boolean).map((c) => cardStatus(c)))
}

/** New words from active decks (curriculum order), then the learner's own words. */
export function newWordQueue(s: Pick<State, 'activeDecks' | 'introduced' | 'customWords'>): Word[] {
  const active = new Set(s.activeDecks)
  const out: Word[] = []
  for (const d of DECKS) if (active.has(d.id)) for (const w of d.words) if (!s.introduced[w.id]) out.push(w)
  if (active.has(CUSTOM_DECK_ID)) for (const w of s.customWords) if (!s.introduced[w.id]) out.push(w)
  return out
}

export function introducedToday(introduced: Record<string, string>): number {
  const today = dayKey()
  let n = 0
  for (const d of Object.values(introduced)) if (d === today) n++
  return n
}

export function dueCardIds(cards: Record<string, StoredCard>, customWords: Word[], now = new Date()): string[] {
  const end = endOfDay(now).toISOString()
  return Object.entries(cards)
    .filter(([id, c]) => c.due <= end && findWord(parseCardId(id).wordId, customWords))
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
    .map(([id]) => id)
}

export function newAvailableToday(s: State): number {
  const remaining = Math.max(0, s.settings.newPerDay - introducedToday(s.introduced))
  return Math.min(remaining, newWordQueue(s).length)
}

/** Reviews due on each of the next `days` days (index 0 = today, includes overdue). */
export function forecast(cards: Record<string, StoredCard>, days = 7): number[] {
  const out = new Array(days).fill(0)
  const ends = Array.from({ length: days }, (_, i) => endOfDay(addDays(new Date(), i)).toISOString())
  for (const c of Object.values(cards)) {
    const i = ends.findIndex((e) => c.due <= e)
    if (i >= 0) out[i]++
  }
  return out
}

export function vocabCounts(s: State) {
  let learned = 0
  let mature = 0
  const seen = new Set<string>()
  for (const id of Object.keys(s.cards)) {
    const w = parseCardId(id).wordId
    if (seen.has(w)) continue
    seen.add(w)
    learned++
    if (wordStatus(w, s.cards) === 'mature') mature++
  }
  return { learned, mature }
}
