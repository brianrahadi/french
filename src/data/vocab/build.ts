import type { Deck, Level, Pos, Word } from '../types'

/**
 * Compact authoring format for vocabulary:
 *   [french, english, kind, example?, exampleTranslation?, note?]
 * kind: 'm' | 'f' | 'mf' (either gender) | 'mpl' | 'fpl' for nouns,
 *       'adj' (same in feminine) or 'adj:feminine-form', or a part of speech (v, adv, prep, conj, pron, expr, num, det, interj).
 */
export type Row = [fr: string, en: string, kind: string, ex?: string, exEn?: string, note?: string]

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function deck(id: string, level: Level, title: string, titleFr: string, rows: Row[]): Deck {
  const words: Word[] = rows.map(([fr, en, kind, ex, exEn, note]) => {
    const w: Word = { id: '', fr, en, pos: 'n', level, deck: id, ex, exEn, note }
    if (kind === 'm' || kind === 'f') w.g = kind
    else if (kind === 'mf') {
      w.g = 'm'
      w.both = true
    } else if (kind === 'mpl' || kind === 'fpl') {
      w.g = kind[0] as 'm' | 'f'
      w.pl = true
    } else if (kind.startsWith('adj')) {
      w.pos = 'adj'
      w.fem = kind.includes(':') ? kind.split(':')[1] : fr
    } else w.pos = kind as Pos
    w.id = `${slug(fr)}-${w.pos === 'n' ? 'n' : w.pos}`
    return w
  })
  return { id, level, title, titleFr, words }
}
