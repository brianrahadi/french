import type { Pos, Word } from '../data/types'
import { normalize } from './answer'
import { slug } from '../data/vocab/build'

const ASPIRATE_H = new Set([
  'haricot', 'honte', 'héros', 'hasard', 'hall', 'hibou', 'haut', 'hauteur', 'hache', 'haine',
  'hamburger', 'handicap', 'hockey', 'homard', 'hangar', 'hamac', 'hâte', 'huit', 'hollande', 'hongrie',
])

export function startsWithVowelSound(w: string): boolean {
  const lower = w.toLowerCase()
  if (/^h/.test(lower)) return !ASPIRATE_H.has(lower.split(' ')[0])
  return /^[aeiouyâàäéèêëîïôöûùüœæ]/.test(lower)
}

/** Definite article: le / la / l' / les */
export function definite(w: Word): string {
  if (w.pl) return 'les '
  if (startsWithVowelSound(w.fr)) return "l'"
  if (w.both) return 'le/la '
  return w.g === 'f' ? 'la ' : 'le '
}

export function indefinite(w: Word): string {
  if (w.pl) return 'des '
  if (w.both) return 'un/une '
  return w.g === 'f' ? 'une ' : 'un '
}

/** "la maison", "l'école", "grand · grande", "parler" */
export function displayFr(w: Word): string {
  if (w.pos === 'n' && w.g && !w.custom) return definite(w) + w.fr
  if (w.pos === 'adj' && w.fem && w.fem !== w.fr) return `${w.fr} · ${w.fem}`
  return w.fr
}

export const POS_LABEL: Record<Pos, string> = {
  n: 'noun',
  v: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  prep: 'preposition',
  conj: 'conjunction',
  pron: 'pronoun',
  expr: 'expression',
  num: 'number',
  det: 'determiner',
  interj: 'interjection',
}

export function posLabel(w: Word): string {
  if (w.custom) return w.g ? 'noun · my word' : 'my word'
  return POS_LABEL[w.pos]
}

/** Text to read aloud for a word. */
export function speakText(w: Word): string {
  if (w.pos === 'n' && w.g && !w.custom) return (w.both && !startsWithVowelSound(w.fr) ? 'le ' : definite(w)) + w.fr
  if (w.pos === 'adj' && w.fem && w.fem !== w.fr) return `${w.fr}, ${w.fem}`
  return w.fr.replace(/\(.*?\)/g, '').replace(/…/g, '')
}

export interface ProductionCheck {
  answers: string[]
  /** Accepted-but-incomplete forms (e.g. a noun without its article). */
  partial: string[]
}

function variants(s: string): string[] {
  // "grand(e)" → grand, grande ; "a / b" → a, b
  const out = new Set<string>()
  for (const part of s.split(/\s*\/\s*|\s*;\s*/)) {
    out.add(part.replace(/\((.*?)\)/g, ''))
    out.add(part.replace(/\((.*?)\)/g, '$1'))
  }
  return [...out].filter(Boolean)
}

export function productionAnswers(w: Word): ProductionCheck {
  if (w.pos === 'n' && w.g && !w.custom) {
    const fr = w.fr
    const answers = w.both
      ? startsWithVowelSound(fr)
        ? [`l'${fr}`, `un ${fr}`, `une ${fr}`]
        : [`le ${fr}`, `la ${fr}`, `un ${fr}`, `une ${fr}`]
      : [definite(w) + fr, indefinite(w) + fr]
    return { answers, partial: [fr] }
  }
  if (w.pos === 'adj') {
    const answers = [w.fr, ...(w.fem ? [w.fem, `${w.fr} ${w.fem}`, `${w.fr}/${w.fem}`] : [])]
    return { answers, partial: [] }
  }
  const answers = variants(w.fr)
  // Custom words typed with an article: also accept the bare noun as partial.
  const bare = w.fr.replace(/^(le |la |les |l'|un |une |des )/i, '')
  return { answers, partial: bare !== w.fr ? [bare] : [] }
}

/** Split an English gloss into its alternatives for recognition display. */
export function glossParts(en: string): string[] {
  return en.split(/\s*[,;]\s*/)
}

export function matchesSearch(w: Word, q: string): boolean {
  const n = normalize(q)
  if (!n) return true
  const strip = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
  const nq = strip(n)
  return strip(w.fr).includes(nq) || strip(w.en).includes(nq)
}

/** Parse Anki / LingQ / spreadsheet exports: one card per line, "french<TAB>english[<TAB>example]". */
export function parseImport(text: string): { fr: string; en: string; ex?: string; g?: 'm' | 'f' }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
  if (!lines.length) return []
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ','
  const out: { fr: string; en: string; ex?: string; g?: 'm' | 'f' }[] = []
  for (const line of lines) {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1').replace(/<[^>]+>/g, ''))
    if (cols.length < 2 || !cols[0] || !cols[1]) continue
    const fr = cols[0]
    let g: 'm' | 'f' | undefined
    if (/^(le|un) /i.test(fr)) g = 'm'
    else if (/^(la|une) /i.test(fr)) g = 'f'
    out.push({ fr, en: cols[1], ex: cols[2] || undefined, g })
  }
  return out
}

/**
 * French typography for display: typographic apostrophes, and a narrow no-break
 * space before ! ? : ; » and after « (so "?" never wraps onto its own line).
 */
export function frTypo(s: string): string {
  return s
    .replace(/'/g, '\u2019')
    .replace(/ ([!?:;\u00bb])/g, '\u202f$1')
    .replace(/\u00ab /g, '\u00ab\u202f')
}

/**
 * A learner-added word. Gender is taken from a leading article (le/la/un/une)
 * or a trailing "(m)" / "(f)" marker, e.g. "l'hôtel (m)".
 */
export function customWord(fr: string, en: string, ex?: string, g?: 'm' | 'f'): Word {
  let text = fr.trim()
  let gender = g
  const marker = text.match(/\s*\((m|f)\.?\)$/i)
  if (marker) {
    gender = gender ?? (marker[1].toLowerCase() as 'm' | 'f')
    text = text.slice(0, marker.index).trim()
  }
  if (!gender) {
    if (/^(le|un) /i.test(text)) gender = 'm'
    else if (/^(la|une) /i.test(text)) gender = 'f'
  }
  return {
    id: `custom-${slug(text)}-${slug(en).slice(0, 20)}`,
    fr: text,
    en: en.trim(),
    pos: gender ? 'n' : 'expr',
    g: gender,
    ex: ex?.trim() || undefined,
    level: 'A1',
    deck: 'custom',
    custom: true,
  }
}

/**
 * A word without its article or gender marker, lower-case, for telling whether
 * two entries are the same word: "la gare", "une gare", "gare (f)" → "gare";
 * "l'hôtel" → "hôtel". "se lever" keeps its "se" (it isn't the same as "lever").
 */
export function baseForm(fr: string): string {
  return fr
    .trim()
    .replace(/[’‘`´ʼ]/g, "'")
    .replace(/\s*\((m|f)\.?\)$/i, '')
    .replace(/^(?:(?:le|la|les|un|une|des|du|de la)\s+|l'\s*)/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * The entry in `pool` that is the same word as `w`, if any: same base form, and
 * — when both are nouns with a gender — the same gender (le poste ≠ la poste).
 * A word typed without an article matches a non-noun first ("pas" → not), then a noun.
 */
export function findSameWord(w: Pick<Word, 'fr' | 'pos' | 'g' | 'both'>, pool: Word[]): Word | undefined {
  const base = baseForm(w.fr)
  const same = pool.filter((x) => baseForm(x.fr) === base)
  if (!same.length) return undefined
  const isNoun = w.pos === 'n' && !!w.g
  if (isNoun) return same.find((x) => x.pos === 'n' && (!x.g || !w.g || x.g === w.g || x.both || w.both))
  return same.find((x) => x.pos !== 'n') ?? same[0]
}
