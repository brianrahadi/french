/**
 * Looking up a word from a text: the built-in dictionary (the app's vocabulary),
 * the conjugation engine run backwards (which verb and tense a form belongs to),
 * and — when an AI is connected — its meaning in this very sentence.
 */
import { allWords } from '../../data/vocab'
import { VERBS, hasTense } from '../../data/verbs'
import type { Word } from '../../data/types'
import { TENSES, conjugate, pastParticiple, presentParticiple } from '../../lib/conjugate'
import { chatJson, type AiConfig } from '../../lib/ai'
import { obj, str } from '../../lib/ai/json'
import { lookupForms, normApos } from '../../lib/french'
import type { Gloss } from './types'

// ───────────── dictionary ─────────────

export const stripArticle = (s: string) => s.replace(/^(le |la |les |l'|l’|un |une |des )/i, '').replace(/\s*\((m|f)\.?\)$/i, '')
export const key = (s: string) => normApos(stripArticle(s.trim())).toLowerCase()

let dictFor: Word[] | null = null
let dict = new Map<string, Word[]>()

function buildDict(words: Word[]) {
  dict = new Map()
  const add = (k: string, w: Word) => {
    if (!k) return
    const list = dict.get(k) ?? []
    if (!list.includes(w)) list.push(w)
    dict.set(k, list)
  }
  for (const w of words) {
    for (const part of w.fr.split(/\s*[/;]\s*/)) add(key(part.replace(/\((.*?)\)/g, '')), w)
    if (w.fem) add(key(w.fem), w)
  }
  dictFor = words
}

export function dictionaryLookup(word: string, customWords: Word[]): Word[] {
  const words = allWords(customWords)
  if (dictFor !== words) buildDict(words)
  for (const f of lookupForms(word)) {
    const hit = dict.get(f)
    if (hit) return hit
  }
  return []
}

// ───────────── verb forms ─────────────

export interface VerbForm {
  inf: string
  en: string
  /** e.g. "présent · je, il/elle" or "past participle" */
  label: string
}

const PERSONS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles']
let formIndex: Map<string, VerbForm[]> | null = null

function buildFormIndex() {
  const idx = new Map<string, Map<string, { inf: string; en: string; tense: string; persons: Set<string> }>>()
  const add = (form: string, inf: string, en: string, tense: string, person?: string) => {
    const k = normApos(form).toLowerCase()
    let byVerb = idx.get(k)
    if (!byVerb) idx.set(k, (byVerb = new Map()))
    const id = `${inf}|${tense}`
    let e = byVerb.get(id)
    if (!e) byVerb.set(id, (e = { inf, en, tense, persons: new Set() }))
    if (person) e.persons.add(person)
  }
  for (const v of VERBS) {
    const en = v.en
    for (const t of TENSES) {
      if (!hasTense(v, t.id)) continue
      let cells
      try {
        cells = conjugate(v, t.id)
      } catch {
        continue
      }
      for (const c of cells) {
        for (const f of new Set([...c.m, ...c.f])) {
          if (f.includes(' ')) continue // compound tenses: the participle is indexed below
          add(f, v.inf, en, t.label.toLowerCase(), t.id === 'imperatif' ? '(imperative)' : PERSONS[c.person])
        }
      }
    }
    try {
      const pp = pastParticiple(v)
      for (const f of [pp, `${pp}e`, `${pp}s`, `${pp}es`]) if (!/[sx]s$/.test(f)) add(f, v.inf, en, 'past participle')
      add(presentParticiple(v), v.inf, en, 'present participle')
    } catch {
      /* skip */
    }
    add(v.inf, v.inf, en, 'infinitive')
  }
  formIndex = new Map(
    [...idx.entries()].map(([k, byVerb]) => [
      k,
      [...byVerb.values()].map((e) => ({
        inf: e.inf,
        en: e.en,
        label: e.persons.size ? `${e.tense} · ${[...e.persons].join(', ')}` : e.tense,
      })),
    ]),
  )
}

const ER_ENDINGS = ['eraient', 'erions', 'eriez', 'erons', 'eront', 'erais', 'erait', 'aient', 'erai', 'eras', 'erez', 'ions', 'iez', 'ais', 'ait', 'ant', 'ons', 'ent', 'era', 'ées', 'és', 'ée', 'ez', 'es', 'é', 'e']

/** Which verb (and tense/person) a form could belong to. */
export function verbFormLookup(word: string, customWords: Word[] = []): VerbForm[] {
  if (!formIndex) buildFormIndex()
  const w = normApos(word).toLowerCase().replace(/^(j|m|t|s|n|l|qu)'/, '')
  const hits = formIndex!.get(w)
  if (hits) return hits.slice(0, 4)
  // Regular -er verbs from the vocabulary that the engine doesn't list.
  for (const end of ER_ENDINGS) {
    if (!w.endsWith(end) || w.length - end.length < 2) continue
    const inf = w.slice(0, -end.length) + 'er'
    const v = allWords(customWords).find((x) => x.pos === 'v' && x.fr === inf)
    if (v) return [{ inf, en: v.en, label: end.startsWith('é') ? 'past participle' : 'conjugated form' }]
  }
  return []
}

// ───────────── meaning in context (AI) ─────────────

const POS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'determiner', 'expression', 'interjection', 'number', 'other']

const glossSchema = {
  type: 'object',
  properties: {
    lemma: {
      type: 'string',
      description: "Dictionary form: infinitive for verbs, masculine singular for adjectives, singular noun WITH its article (la gare, l'hôtel (m)), or the phrase itself.",
    },
    pos: { type: 'string', enum: POS },
    gender: { type: 'string', enum: ['m', 'f', 'none'] },
    meaning: { type: 'string', description: 'Short English meaning in this sentence (1–6 words).' },
    note: {
      type: 'string',
      description: "One short English note about this form or usage when helpful (e.g. 'passé composé of partir, feminine agreement'), otherwise ''.",
    },
    sentenceTranslation: { type: 'string', description: 'Natural English translation of the whole sentence.' },
  },
  required: ['lemma', 'pos', 'gender', 'meaning', 'note', 'sentenceTranslation'],
  additionalProperties: false,
}

const cache = new Map<string, Gloss>()

export function coerceGloss(raw: unknown, word: string): Gloss {
  const r = obj(raw)
  const g = str(r.gender)
  return {
    lemma: str(r.lemma).trim() || word,
    pos: str(r.pos, 'other'),
    gender: g === 'm' || g === 'f' ? g : '',
    meaning: str(r.meaning).trim(),
    note: str(r.note).trim(),
    sentenceTranslation: str(r.sentenceTranslation).trim(),
  }
}

export function cachedGloss(word: string, sentence: string): Gloss | undefined {
  return cache.get(`${word.toLowerCase()}|${sentence}`)
}

export async function glossInContext(word: string, sentence: string, config?: AiConfig | null, signal?: AbortSignal): Promise<Gloss> {
  const k = `${word.toLowerCase()}|${sentence}`
  const hit = cache.get(k)
  if (hit) return hit
  const g = await chatJson(
    {
      config,
      system:
        'You are a concise French–English dictionary for an English-speaking learner. Given a French word or phrase and the sentence it appears in, say what it means in that sentence. Be accurate and brief.',
      messages: [{ role: 'user', content: `Word or phrase: ${word}\nSentence: ${sentence}` }],
      json: { name: 'gloss', schema: glossSchema },
      maxTokens: 2500,
      signal,
    },
    (raw) => coerceGloss(raw, word),
  )
  cache.set(k, g)
  return g
}
