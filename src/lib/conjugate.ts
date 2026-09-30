/**
 * A rule-based French conjugation engine.
 *
 * Regular -er / -ir / -re verbs are generated from their infinitive (including the
 * common spelling changes: -cer, -ger, e→è, é→è, -eler/-eter doubling, -yer).
 * Irregular verbs only need their present tense, past participle and any irregular
 * stems; every other tense is derived the way French grammar books teach it:
 *   imparfait   = nous-stem of the present + -ais …
 *   futur       = future stem + -ai …
 *   conditionnel= future stem + -ais …
 *   subjonctif  = ils-stem (+ nous-stem for nous/vous) + -e …
 *   compound    = auxiliary + past participle (with agreement after être)
 */

import type { Level } from '../data/types'

export type Tense =
  | 'present'
  | 'passeCompose'
  | 'imparfait'
  | 'futurSimple'
  | 'conditionnel'
  | 'subjonctif'
  | 'imperatif'
  | 'plusQueParfait'
  | 'conditionnelPasse'

export interface TenseInfo {
  id: Tense
  label: string
  en: string
  level: Level
  persons: number[]
}

export const TENSES: TenseInfo[] = [
  { id: 'present', label: 'Présent', en: 'Present', level: 'A1', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'passeCompose', label: 'Passé composé', en: 'Perfect / simple past', level: 'A2', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'imparfait', label: 'Imparfait', en: 'Imperfect', level: 'A2', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'imperatif', label: 'Impératif', en: 'Imperative', level: 'A2', persons: [1, 3, 4] },
  { id: 'futurSimple', label: 'Futur simple', en: 'Future', level: 'B1', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'conditionnel', label: 'Conditionnel', en: 'Conditional', level: 'B1', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'subjonctif', label: 'Subjonctif', en: 'Subjunctive', level: 'B1', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'plusQueParfait', label: 'Plus-que-parfait', en: 'Pluperfect', level: 'B2', persons: [0, 1, 2, 3, 4, 5] },
  { id: 'conditionnelPasse', label: 'Conditionnel passé', en: 'Past conditional', level: 'B2', persons: [0, 1, 2, 3, 4, 5] },
]

export const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t])) as Record<Tense, TenseInfo>

export type Six = [string, string, string, string, string, string]

export interface VerbDef {
  inf: string
  en: string
  group: 'er' | 'ir' | 're' | 'irr'
  aux?: 'avoir' | 'etre'
  pp?: string
  present?: Six
  /** Alternative accepted present forms, e.g. payer: je paye */
  presentAlt?: Partial<Record<number, string[]>>
  futStem?: string
  subj?: Six
  imp?: [string, string, string]
  essential?: boolean
}

export type Gender = 'm' | 'f'

export interface Cell {
  person: number
  /** Display form, e.g. "suis allé(e)" */
  display: string
  /** Accepted answers per gender of the subject (they are identical for non-agreeing forms). */
  m: string[]
  f: string[]
}

const VOWEL_START = /^[aeiouyâàäéèêëîïôöûùüœæh]/i
// Verbs whose initial h is "aspiré" (no elision).
const ASPIRATE_H = new Set(['haïr', 'hurler', 'heurter', 'hausser', 'hanter'])

export function elides(form: string, inf?: string): boolean {
  if (inf && ASPIRATE_H.has(inf) && form.startsWith('h')) return false
  return VOWEL_START.test(form)
}

// ───────────── spelling-change helpers for -er verbs ─────────────

const DOUBLING = new Set(['appeler', 'rappeler', 'jeter', 'rejeter', 'projeter', 'épeler', 'renouveler', 'feuilleter'])

type ErChange = 'none' | 'cer' | 'ger' | 'e_grave' | 'e_acute' | 'double' | 'oyer' | 'ayer'

function erChange(inf: string): ErChange {
  if (DOUBLING.has(inf)) return 'double'
  if (/[ou]yer$/.test(inf)) return 'oyer'
  if (/ayer$/.test(inf)) return 'ayer'
  if (/é[bcdfgjklmnpqrstvz]+er$/.test(inf)) return 'e_acute'
  if (/[^aeiouyéèêëàâîïôûù]e[bcdfgjklmnpqrstvz]er$/.test(inf)) return 'e_grave'
  if (inf.endsWith('cer')) return 'cer'
  if (inf.endsWith('ger')) return 'ger'
  return 'none'
}

/** Stem used before a silent -e ending (je/tu/il/ils present, subjunctive, and the future for some verbs). */
function erSilentStem(inf: string, change: ErChange): string {
  const stem = inf.slice(0, -2)
  switch (change) {
    case 'e_grave': {
      const i = stem.lastIndexOf('e')
      return stem.slice(0, i) + 'è' + stem.slice(i + 1)
    }
    case 'e_acute': {
      const i = stem.lastIndexOf('é')
      return stem.slice(0, i) + 'è' + stem.slice(i + 1)
    }
    case 'double':
      return stem + stem.slice(-1)
    case 'oyer':
    case 'ayer':
      return stem.slice(0, -1) + 'i'
    default:
      return stem
  }
}

function erNousStem(inf: string, change: ErChange): string {
  const stem = inf.slice(0, -2)
  if (change === 'cer') return stem.slice(0, -1) + 'ç'
  if (change === 'ger') return stem + 'e'
  return stem
}

// ───────────── core forms ─────────────

export function presentForms(v: VerbDef): Six {
  if (v.present) return v.present
  if (v.group === 'er') {
    const change = erChange(v.inf)
    const s = erSilentStem(v.inf, change)
    const plain = v.inf.slice(0, -2)
    return [s + 'e', s + 'es', s + 'e', erNousStem(v.inf, change) + 'ons', plain + 'ez', s + 'ent']
  }
  if (v.group === 'ir') {
    const s = v.inf.slice(0, -2)
    return [s + 'is', s + 'is', s + 'it', s + 'issons', s + 'issez', s + 'issent']
  }
  if (v.group === 're') {
    const s = v.inf.slice(0, -2)
    return [s + 's', s + 's', s, s + 'ons', s + 'ez', s + 'ent']
  }
  throw new Error(`Irregular verb ${v.inf} needs explicit present forms`)
}

/** All accepted present forms per person (the first is canonical). */
function presentAccepted(v: VerbDef): string[][] {
  const base = presentForms(v)
  const out = base.map((f) => [f])
  if (v.presentAlt) for (const [k, alts] of Object.entries(v.presentAlt)) out[Number(k)].push(...(alts ?? []))
  if (!v.present && v.group === 'er' && erChange(v.inf) === 'ayer') {
    // payer: je paie / je paye
    const y = v.inf.slice(0, -2)
    for (const p of [0, 1, 2, 5]) out[p].push(y + ['e', 'es', 'e', '', '', 'ent'][p])
  }
  return out
}

export function pastParticiple(v: VerbDef): string {
  if (v.pp) return v.pp
  const s = v.inf.slice(0, -2)
  if (v.group === 'er') return s + 'é'
  if (v.group === 'ir') return s + 'i'
  if (v.group === 're') return s + 'u'
  throw new Error(`Irregular verb ${v.inf} needs a past participle`)
}

function futureStems(v: VerbDef): string[] {
  if (v.futStem) return [v.futStem]
  if (v.group === 'er') {
    const change = erChange(v.inf)
    if (change === 'e_grave' || change === 'double' || change === 'oyer') return [erSilentStem(v.inf, change) + 'er']
    if (change === 'ayer') return [erSilentStem(v.inf, change) + 'er', v.inf]
    if (change === 'e_acute') return [v.inf, erSilentStem(v.inf, change) + 'er']
    return [v.inf]
  }
  if (v.inf.endsWith('re')) return [v.inf.slice(0, -1)]
  return [v.inf]
}

/** Joins a stem and an ending, fixing ç/ge before i (commencions, mangions). */
function join(stem: string, ending: string): string {
  if (ending.startsWith('i') || ending.startsWith('e')) {
    if (stem.endsWith('ç')) return stem.slice(0, -1) + 'c' + ending
    if (stem.endsWith('ge') && ending.startsWith('i')) return stem.slice(0, -1) + ending
  }
  return stem + ending
}

const IMPARFAIT_END: Six = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient']
const FUTUR_END: Six = ['ai', 'as', 'a', 'ons', 'ez', 'ont']
const SUBJ_END: Six = ['e', 'es', 'e', 'ions', 'iez', 'ent']

function imparfaitStem(v: VerbDef): string {
  if (v.inf === 'être') return 'ét'
  return presentForms(v)[3].replace(/ons$/, '')
}

function simpleForms(v: VerbDef, tense: Tense): string[][] {
  switch (tense) {
    case 'present':
      return presentAccepted(v)
    case 'imparfait': {
      const s = imparfaitStem(v)
      return IMPARFAIT_END.map((e) => [join(s, e)])
    }
    case 'futurSimple':
      return FUTUR_END.map((e) => futureStems(v).map((s) => s + e))
    case 'conditionnel':
      return IMPARFAIT_END.map((e) => futureStems(v).map((s) => s + e))
    case 'subjonctif': {
      if (v.subj) return v.subj.map((f) => [f])
      const p = presentAccepted(v)
      const a = p[5][0].replace(/ent$/, '')
      const b = p[3][0].replace(/ons$/, '')
      const forms = SUBJ_END.map((e, i) => [i === 3 || i === 4 ? join(b, e) : a + e])
      // payer: que je paie / paye
      if (p[5].length > 1) {
        const a2 = p[5][1].replace(/ent$/, '')
        for (const i of [0, 1, 2, 5]) forms[i].push(a2 + SUBJ_END[i])
      }
      return forms
    }
    case 'imperatif': {
      if (v.imp) return [[], [v.imp[0]], [], [v.imp[1]], [v.imp[2]], []]
      const p = presentAccepted(v)
      const tu = p[1].map((f) => (f.endsWith('es') ? f.slice(0, -1) : f))
      return [[], tu, [], [p[3][0]], [p[4][0]], []]
    }
    default:
      throw new Error(`${tense} is not a simple tense`)
  }
}

// ───────────── compound tenses ─────────────

export const AVOIR: VerbDef = {
  inf: 'avoir',
  en: 'to have',
  group: 'irr',
  pp: 'eu',
  present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
  futStem: 'aur',
  subj: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
  imp: ['aie', 'ayons', 'ayez'],
}

export const ETRE: VerbDef = {
  inf: 'être',
  en: 'to be',
  group: 'irr',
  pp: 'été',
  present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
  futStem: 'ser',
  subj: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
  imp: ['sois', 'soyons', 'soyez'],
}

const COMPOUND_AUX_TENSE: Partial<Record<Tense, Tense>> = {
  passeCompose: 'present',
  plusQueParfait: 'imparfait',
  conditionnelPasse: 'conditionnel',
}

function agree(pp: string, gender: Gender, plural: boolean): string {
  let out = pp
  if (gender === 'f') out += 'e'
  if (plural && !(gender === 'm' && pp.endsWith('s'))) out += 's'
  return out
}

function ppDisplay(pp: string, plural: boolean): string {
  if (plural) return pp.endsWith('s') ? `${pp}(es)` : `${pp}(e)s`
  return `${pp}(e)`
}

// ───────────── public API ─────────────

export function isCompound(tense: Tense): boolean {
  return tense in COMPOUND_AUX_TENSE
}

export function conjugate(v: VerbDef, tense: Tense): Cell[] {
  const persons = TENSE_BY_ID[tense].persons
  const auxTense = COMPOUND_AUX_TENSE[tense]

  if (auxTense) {
    const aux = v.aux === 'etre' ? ETRE : AVOIR
    const auxForms = simpleForms(aux, auxTense)
    const pp = pastParticiple(v)
    return persons.map((p) => {
      const a = auxForms[p][0]
      if (v.aux !== 'etre') {
        const f = `${a} ${pp}`
        return { person: p, display: f, m: [f], f: [f] }
      }
      const plural = p >= 3
      const m = `${a} ${agree(pp, 'm', plural)}`
      const f = `${a} ${agree(pp, 'f', plural)}`
      // Subjects je/tu/nous/vous can be either gender; il/ils are masculine, elle/elles feminine.
      const any = [m, f]
      if (p === 4) any.push(`${a} ${pp}`, `${a} ${agree(pp, 'f', false)}`) // vous (polite singular)
      const display = `${a} ${ppDisplay(pp, plural)}`
      const genderFixed = p === 2 || p === 5
      return { person: p, display, m: genderFixed ? [m] : any, f: genderFixed ? [f] : any }
    })
  }

  const forms = simpleForms(v, tense)
  return persons.map((p) => {
    const accepted = forms[p]
    return { person: p, display: accepted[0], m: accepted, f: accepted }
  })
}

const PRONOUNS = ['je', 'tu', 'il', 'nous', 'vous', 'ils']
const PRONOUNS_F = ['je', 'tu', 'elle', 'nous', 'vous', 'elles']

/** The subject pronoun to show before a form, e.g. "j'", "que tu", "qu'elle", "(tu)". */
export function pronounFor(tense: Tense, person: number, form: string, gender: Gender = 'm', inf?: string): string {
  if (tense === 'imperatif') return ''
  let pr = (gender === 'f' ? PRONOUNS_F : PRONOUNS)[person]
  if (person === 0 && elides(form, inf)) pr = "j'"
  if (tense === 'subjonctif') {
    return pr.startsWith('i') || pr.startsWith('e') ? `qu'${pr}` : `que ${pr}`
  }
  return pr
}

/** "il/elle" style label for reference tables. */
export function tablePronoun(tense: Tense, person: number, form: string, inf?: string): string {
  if (tense === 'imperatif') return ['', '(tu)', '', '(nous)', '(vous)', ''][person]
  let pr = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'][person]
  if (person === 0 && elides(form, inf)) pr = "j'"
  if (tense === 'subjonctif') return pr.startsWith('i') ? `qu'${pr}` : `que ${pr}`
  return pr
}

export function joinPronoun(pronoun: string, form: string): string {
  if (!pronoun) return form
  return pronoun.endsWith("'") ? pronoun + form : `${pronoun} ${form}`
}

export function presentParticiple(v: VerbDef): string {
  if (v.inf === 'être') return 'étant'
  if (v.inf === 'avoir') return 'ayant'
  if (v.inf === 'savoir') return 'sachant'
  return presentForms(v)[3].replace(/ons$/, '') + 'ant'
}
