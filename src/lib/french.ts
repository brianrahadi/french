/**
 * Text utilities for listening, speaking and reading: tokenising French,
 * aligning what the learner typed or said with the original, and classifying
 * the differences.
 */
import { levenshtein, stripAccents } from './answer'

export const normApos = (s: string) => s.replace(/[’‘`´ʼ]/g, "'")

// ───────────── comparison tokens ─────────────

export interface Token {
  /** As written in the source. */
  text: string
  /** Lower-case, straight apostrophe. */
  norm: string
  start: number
  end: number
}

/** Elided words keep their apostrophe as separate tokens ("l'" + "homme"); hyphens split words. */
const WORD_RE = /[\p{L}\p{N}]+['’]?/gu

export function tokens(s: string): Token[] {
  const out: Token[] = []
  for (const m of s.normalize('NFC').matchAll(WORD_RE)) {
    out.push({ text: m[0], norm: normApos(m[0]).toLowerCase(), start: m.index!, end: m.index! + m[0].length })
  }
  return out
}

export const wordTokens = (s: string) => tokens(s).map((t) => t.norm)

// ───────────── homophones and endings ─────────────

const HOMOPHONE_GROUPS = [
  ['a', 'à', "as"],
  ['ou', 'où'],
  ['et', 'est', 'es', 'ai'],
  ['son', 'sont'],
  ['on', 'ont'],
  ['ce', 'se'],
  ['ces', 'ses', "c'est", "s'est", 'sais', 'sait'],
  ['la', 'là', "l'a", "l'as"],
  ['mes', 'mais', 'met', 'mets'],
  ['peu', 'peut', 'peux'],
  ['sans', 'cent', 'sang', "s'en", 'sent', 'sens'],
  ['vers', 'verre', 'vert', 'vais'],
  ['quand', 'quant', "qu'en"],
  ['leur', 'leurs'],
  ['tous', 'tout', 'toute', 'toux'],
  ['ma', "m'a", "m'as"],
  ['ta', "t'a", "t'as"],
  ['sa', 'ça', 'çà'],
  ['ni', "n'y", 'nid'],
  ['si', "s'y", 'scie'],
  ['dans', "d'en", 'dent', 'dents'],
  ['cet', 'cette', 'sept', 'set'],
  ['fois', 'foie', 'foi'],
  ['mer', 'mère', 'maire'],
  ['vin', 'vingt', 'vain', 'vint'],
  ['ver', 'vert', 'verre', 'vers'],
  ['faim', 'fin', 'feint'],
  ['pain', 'pin', 'peint'],
  ['cour', 'cours', 'court', 'courent'],
  ['du', 'dû'],
  ['sur', 'sûr'],
  ['près', 'prêt', 'prêts', 'prés'],
  ['voix', 'voie', 'vois', 'voit'],
  ['cou', 'coup', 'coût', 'coud'],
  ['quel', 'quelle', 'quels', 'quelles', "qu'elle", "qu'elles"],
]
const HOMOPHONE_OF = new Map<string, number>()
HOMOPHONE_GROUPS.forEach((g, i) => g.forEach((w) => HOMOPHONE_OF.set(w, i)))

export function areHomophones(a: string, b: string): boolean {
  const ga = HOMOPHONE_OF.get(a)
  return ga !== undefined && ga === HOMOPHONE_OF.get(b)
}

/** Endings that usually sound alike: parle/parles/parlent, aimé/aimer/aimez, grand/grande… */
const SILENT_ENDINGS = ['', 'e', 'es', 's', 'x', 't', 'ts', 'd', 'ds', 'ent', 'é', 'ée', 'és', 'ées', 'er', 'ez', 'ai', 'ais', 'ait', 'aient', 'i', 'ie', 'is', 'it', 'ies']

export function sameStemDifferentEnding(a: string, b: string): boolean {
  if (a === b) return false
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  let i = 0
  while (i < x.length && i < y.length && x[i] === y[i]) i++
  if (i < 2) return false
  const ex = x.slice(i)
  const ey = y.slice(i)
  // Allow the shared stem to end in the vowel of the ending (aimé vs aimer: stem "aim").
  for (let back = 0; back <= 2 && i - back >= 2; back++) {
    const sx = x.slice(i - back)
    const sy = y.slice(i - back)
    if (SILENT_ENDINGS.includes(sx) && SILENT_ENDINGS.includes(sy)) return true
  }
  return SILENT_ENDINGS.includes(ex) && SILENT_ENDINGS.includes(ey)
}

// ───────────── alignment ─────────────

export type OpKind = 'ok' | 'accent' | 'sub' | 'miss' | 'extra'
export interface Op {
  kind: OpKind
  /** Index into the expected tokens. */
  e?: number
  /** Index into the given tokens. */
  g?: number
}

function subCost(a: string, b: string): number {
  if (a === b) return 0
  if (areHomophones(a, b)) return 0.7
  if (stripAccents(a) === stripAccents(b)) return 0.25
  if (sameStemDifferentEnding(stripAccents(a), stripAccents(b))) return 0.7
  const d = levenshtein(stripAccents(a), stripAccents(b))
  if (d <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.4))) return 0.8
  // Unrelated words: better described as one missed and one extra word.
  return 2.1
}

/** Word-level alignment (weighted edit distance) of what was expected and what was given. */
export function align(expected: string[], given: string[], cost: (a: string, b: string) => number = subCost): Op[] {
  const n = expected.length
  const m = given.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) dp[i][0] = i
  for (let j = 1; j <= m; j++) dp[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost(expected[i - 1], given[j - 1]))
  const ops: Op[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const c = cost(expected[i - 1], given[j - 1])
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + c)) < 1e-9) {
        ops.push({ kind: c === 0 ? 'ok' : c <= 0.25 ? 'accent' : 'sub', e: i - 1, g: j - 1 })
        i--
        j--
        continue
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      ops.push({ kind: 'miss', e: i - 1 })
      i--
    } else {
      ops.push({ kind: 'extra', g: j - 1 })
      j--
    }
  }
  return ops.reverse()
}

// ───────────── dictation ─────────────

export type ListenCategory = 'accents' | 'endings' | 'homophones' | 'missed' | 'spelling'

export const LISTEN_CATEGORIES: Record<ListenCategory, { label: string; tip: string }> = {
  accents: {
    label: 'Accents',
    tip: 'Right word, wrong or missing accent. é (closed “ay”) and è/ê (open “eh”) can be heard; à, ù and î can’t — learn them with the word.',
  },
  endings: {
    label: 'Silent endings',
    tip: 'Many endings sound the same: parle / parles / parlent, aimé / aimer / aimez, petit / petite(s). Let grammar decide: who is the subject? Is it a participle after avoir/être, or an infinitive after a preposition or another verb?',
  },
  homophones: {
    label: 'Sound-alikes',
    tip: 'Words that sound identical: a / à, et / est, son / sont, ces / ses / c’est. Choose by meaning — e.g. if you can say “avait”, write a; if you can say “était”, write est.',
  },
  missed: {
    label: 'Missed words',
    tip: 'Short words get swallowed in normal speech: ne, de, le, en, y, liaisons. Replay at slow speed and count the syllables.',
  },
  spelling: {
    label: 'Spelling',
    tip: 'You heard the word but spelled it differently. Add it to your flashcards so the spelling sticks.',
  },
}

export interface DictationMark {
  kind: OpKind
  expected?: string
  given?: string
  /** Token indexes, for rendering the original strings with marks. */
  e?: number
  g?: number
  category?: ListenCategory
}

export interface DictationResult {
  score: number // 0..100
  marks: DictationMark[]
  categories: Partial<Record<ListenCategory, number>>
  perfect: boolean
  exp: Token[]
  giv: Token[]
}

export function categorize(expected: string, given: string): ListenCategory {
  if (areHomophones(expected, given)) return 'homophones'
  if (stripAccents(expected) === stripAccents(given)) return 'accents'
  if (sameStemDifferentEnding(stripAccents(expected), stripAccents(given))) return 'endings'
  return 'spelling'
}

export function gradeDictation(expectedText: string, givenText: string): DictationResult {
  const exp = tokens(expectedText)
  const giv = tokens(givenText)
  const ops = align(
    exp.map((t) => t.norm),
    giv.map((t) => t.norm),
  )
  const marks: DictationMark[] = []
  const categories: Partial<Record<ListenCategory, number>> = {}
  let points = 0
  let extras = 0
  for (const op of ops) {
    const e = op.e !== undefined ? exp[op.e].text : undefined
    const g = op.g !== undefined ? giv[op.g].text : undefined
    let category: ListenCategory | undefined
    if (op.kind === 'ok') points += 1
    else if (op.kind === 'accent') {
      points += 0.5
      category = 'accents'
    } else if (op.kind === 'sub') category = categorize(exp[op.e!].norm, giv[op.g!].norm)
    else if (op.kind === 'miss') category = 'missed'
    else extras++
    if (category) categories[category] = (categories[category] ?? 0) + 1
    marks.push({ kind: op.kind, expected: e, given: g, e: op.e, g: op.g, category })
  }
  const n = Math.max(1, exp.length)
  const score = Math.max(0, Math.min(100, Math.round(((points - extras * 0.5) / n) * 100)))
  return { score, marks, categories, perfect: ops.every((o) => o.kind === 'ok'), exp, giv }
}

// ───────────── speaking ─────────────

/** Rough pronunciation key: words that sound alike get the same key (parle/parlent, et/est, aimé/aimer). */
export function soundKey(word: string): string {
  let w = stripAccents(normApos(word).toLowerCase()).replace(/'/g, '')
  w = w.replace(/^h/, '').replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/(.)\1/g, '$1')
  if (w.length > 4) w = w.replace(/ent$/, '')
  w = w.replace(/[sxtdp]+$/, '') || w
  w = w.replace(/(er|ez)$/, 'e')
  if (w.length > 1) w = w.replace(/e$/, '')
  return w || word.toLowerCase()
}

export interface SpeechMatch {
  score: number
  /** For each expected word: was it heard? */
  heard: boolean[]
  words: string[]
  tokens: Token[]
}

/** How much of the target sentence the recogniser heard. */
export function matchSpeech(target: string, transcript: string): SpeechMatch {
  const exp = tokens(target)
  const got = tokens(transcript)
  const ek = exp.map((t) => soundKey(t.norm))
  const gk = got.map((t) => soundKey(t.norm))
  const ops = align(ek, gk, (a, b) => (a === b ? 0 : levenshtein(a, b) <= (a.length > 5 ? 1 : 0) ? 0.2 : 1.4))
  const heard = new Array(exp.length).fill(false)
  for (const op of ops) if ((op.kind === 'ok' || op.kind === 'accent') && op.e !== undefined) heard[op.e] = true
  const score = exp.length ? Math.round((heard.filter(Boolean).length / exp.length) * 100) : 0
  return { score, heard, words: exp.map((t) => t.text), tokens: exp }
}

/** Picks the recogniser alternative that best matches the target. */
export function bestAlternative(target: string, alternatives: string[]): { transcript: string; match: SpeechMatch } {
  let best = { transcript: alternatives[0] ?? '', match: matchSpeech(target, alternatives[0] ?? '') }
  for (const alt of alternatives.slice(1)) {
    const m = matchSpeech(target, alt)
    if (m.score > best.match.score) best = { transcript: alt, match: m }
  }
  return best
}

// ───────────── reading ─────────────

export interface ReadToken {
  text: string
  /** Words are tappable; everything else (spaces, punctuation) is plain text. */
  word: boolean
}

export interface ReadSentence {
  text: string
  tokens: ReadToken[]
}

/** Display units for reading: elided and hyphenated words stay whole ("l'homme", "peut-être"). */
const READ_WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*['’]?/gu

export function readTokens(s: string): ReadToken[] {
  const out: ReadToken[] = []
  let pos = 0
  for (const m of s.matchAll(READ_WORD_RE)) {
    if (m.index! > pos) out.push({ text: s.slice(pos, m.index), word: false })
    out.push({ text: m[0], word: true })
    pos = m.index! + m[0].length
  }
  if (pos < s.length) out.push({ text: s.slice(pos), word: false })
  return out
}

const ABBREV = /\b(M|Mme|Mlle|Dr|St|Ste|etc|p|av|bd|n°|cf|ex)\.$/i

export function splitSentences(paragraph: string): string[] {
  const parts: string[] = []
  const re = /[.!?…]+(?:\s*[»"”])?\s+(?=[«"“A-ZÀÂÄÇÉÈÊËÎÏÔÖÛÙÜŸŒÆ0-9—–-])/gu
  let start = 0
  for (const m of paragraph.matchAll(re)) {
    const end = m.index! + m[0].trimEnd().length
    const candidate = paragraph.slice(start, end)
    if (ABBREV.test(candidate)) continue
    parts.push(candidate.trim())
    start = m.index! + m[0].length
  }
  const rest = paragraph.slice(start).trim()
  if (rest) parts.push(rest)
  return parts
}

export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n(?=\s*[-–—•])/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

export function structureText(text: string): ReadSentence[][] {
  return paragraphs(text).map((p) => splitSentences(p).map((s) => ({ text: s, tokens: readTokens(s) })))
}

const ELISION = /^(l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu|quoiqu)['’]/i

/** Candidate dictionary forms for a word as it appears in a text. */
export function lookupForms(word: string): string[] {
  const w = normApos(word).toLowerCase().replace(/['’]$/, '')
  const bare = w.replace(ELISION, '')
  const out = new Set<string>([w, bare])
  for (const b of [bare]) {
    if (/eaux$/.test(b)) out.add(b.slice(0, -1))
    if (/aux$/.test(b)) out.add(b.slice(0, -3) + 'al')
    if (/[sx]$/.test(b)) out.add(b.slice(0, -1))
    if (/es$/.test(b)) out.add(b.slice(0, -2))
    if (/e$/.test(b)) out.add(b.slice(0, -1))
    if (/ée?s?$/.test(b)) out.add(b.replace(/ée?s?$/, 'é'))
    if (/(ive|ives)$/.test(b)) out.add(b.replace(/ives?$/, 'if'))
    if (/(euse|euses)$/.test(b)) out.add(b.replace(/euses?$/, 'eux'))
    if (/(elle|elles)$/.test(b)) out.add(b.replace(/elles?$/, 'el'))
    if (/(enne|ennes)$/.test(b)) out.add(b.replace(/ennes?$/, 'en'))
    if (/(ère|ères)$/.test(b)) out.add(b.replace(/ères?$/, 'er'))
  }
  return [...out].filter((f) => f.length > 0)
}

/** Stable short id for a sentence. */
export function sentenceId(fr: string): string {
  let h = 5381
  for (const ch of fr) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0
  return `s${h.toString(36)}`
}
