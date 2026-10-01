/**
 * Which words of the vocabulary bank (built-in decks + the learner's own words)
 * a text contains, so the learner can say after reading which ones they
 * recognised. Each running word is matched to one bank word: when a form could
 * be several words ("est" = être or east, "suis" = être or suivre), the more
 * frequent word wins.
 */
import { FREQUENCY_WORDS } from '../../data/vocab'
import type { Word } from '../../data/types'
import { readTokens, splitSentences } from '../../lib/french'
import { dictionaryLookup, verbFormLookup } from './lookup'

export interface TextWord {
  word: Word
  /** The form as it appears in the text, e.g. "allée". */
  form: string
  /** The first sentence it appears in. */
  sentence: string
  /** Times it appears in the text. */
  count: number
  /** Position in the frequency list (lower = more common); words outside it come last. */
  rank: number
}

/** Inflected function words → the dictionary form used in the decks. */
const FUNCTION_FORMS: Record<string, string> = {
  la: 'le', les: 'le', une: 'un', des: 'un', du: 'de', au: 'à', aux: 'à',
  ma: 'mon', mes: 'mon', ta: 'ton', tes: 'ton', sa: 'son', ses: 'son', nos: 'notre', vos: 'votre', leurs: 'leur',
  cette: 'ce', cet: 'ce', ces: 'ce', toute: 'tout', tous: 'tout', toutes: 'tout',
  quelle: 'quel', quels: 'quel', quelles: 'quel', aucune: 'aucun', ils: 'il', elles: 'elle',
  celle: 'celui', ceux: 'celui', celles: 'celui', certaine: 'certain', certains: 'certain', certaines: 'certain',
}

const ELIDED = /^(?:jusqu|lorsqu|puisqu|quoiqu|qu|[cdjlmnst])['’]/i

let rankFor: Map<string, number> | null = null
function rank(w: Word): number {
  if (!rankFor) rankFor = new Map(FREQUENCY_WORDS.map((x, i) => [x.id, i]))
  return rankFor.get(w.id) ?? (w.custom ? 20000 : 10000)
}

/** The bank word a running word most likely is, or undefined. */
export function bankWordFor(token: string, customWords: Word[]): Word | undefined {
  const lower = token.toLowerCase()
  const bare = lower.replace(ELIDED, '')
  const candidates = new Map<string, Word>()
  const add = (ws: Word[]) => ws.forEach((w) => candidates.set(w.id, w))
  if (FUNCTION_FORMS[bare]) add(dictionaryLookup(FUNCTION_FORMS[bare], customWords))
  add(dictionaryLookup(token, customWords))
  for (const f of verbFormLookup(bare, customWords)) add(dictionaryLookup(f.inf, customWords).filter((w) => w.pos === 'v'))
  if (!candidates.size && bare.includes('-')) {
    // "dis-moi", "pensez-vous": the first part is usually the word that matters.
    for (const part of bare.split('-')) {
      const w = bankWordFor(part, customWords)
      if (w) return w
    }
  }
  let best: Word | undefined
  for (const w of candidates.values()) if (!best || rank(w) < rank(best)) best = w
  return best
}

/** Every bank word in the text, once, in the order they first appear. */
export function textVocab(paragraphs: string[], customWords: Word[]): TextWord[] {
  const found = new Map<string, TextWord>()
  for (const p of paragraphs)
    for (const sentence of splitSentences(p)) {
      let first = true
      for (const t of readTokens(sentence)) {
        if (!t.word) continue
        const atStart = first
        first = false
        if (/^\p{N}/u.test(t.text)) continue
        // A capital in the middle of a sentence is a name (Paris, Karim), not a word to learn.
        if (!atStart && /^\p{Lu}/u.test(t.text)) continue
        const w = bankWordFor(t.text, customWords)
        if (!w) continue
        const seen = found.get(w.id)
        if (seen) seen.count++
        else found.set(w.id, { word: w, form: t.text, sentence, count: 1, rank: rank(w) })
      }
    }
  return [...found.values()]
}
