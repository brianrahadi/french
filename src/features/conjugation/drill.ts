import { VERB_BY_INF, VERBS, hasTense, verbsInSet } from '../../data/verbs'
import { TENSES, TENSE_BY_ID, conjugate, elides, isCompound, pronounFor, type Gender, type Tense, type VerbDef } from '../../lib/conjugate'
import { checkAnswer, stripSubjectPronoun, type Verdict } from '../../lib/answer'
import type { ConjConfig, ConjStat } from '../../lib/store'
import { levelRank } from '../../data/types'

export interface DrillItem {
  inf: string
  tense: Tense
  person: number
  gender: Gender
}

export function poolFor(config: Pick<ConjConfig, 'set' | 'custom'>): VerbDef[] {
  if (config.set === 'custom') {
    const vs = config.custom.map((i) => VERB_BY_INF[i]).filter(Boolean)
    return vs.length ? vs : verbsInSet('essential')
  }
  return verbsInSet(config.set)
}

export function accuracy(stat?: ConjStat): number | null {
  if (!stat || !stat.recent.length) return null
  return stat.recent.reduce((a, b) => a + b, 0) / stat.recent.length
}

export interface DrillOptions {
  /**
   * Course order: verb/tense pairs never practised come only from the lowest
   * tense level (A1 → B2) that still has some, and the drill is sorted by tense.
   * Pairs already practised can come back at any level.
   */
  inOrder?: boolean
}

const tenseRank = (t: Tense) => TENSES.findIndex((x) => x.id === t)

/** Weighted random drill: weaker and unseen verb/tense pairs come up more often. */
export function makeDrill(
  verbs: VerbDef[],
  tenses: Tense[],
  stats: Record<string, ConjStat>,
  n: number,
  rand: () => number = Math.random,
  opts: DrillOptions = {},
): DrillItem[] {
  let pairs: { v: VerbDef; t: Tense; w: number; fresh: boolean }[] = []
  for (const v of verbs)
    for (const t of tenses) {
      if (!hasTense(v, t)) continue
      const acc = accuracy(stats[`${v.inf}|${t}`])
      pairs.push({ v, t, w: acc === null ? 2 : 0.5 + 3 * (1 - acc), fresh: acc === null })
    }
  if (opts.inOrder) {
    const levelOf = (t: Tense) => levelRank(TENSE_BY_ID[t].level)
    const fresh = pairs.filter((p) => p.fresh)
    const frontier = fresh.length ? Math.min(...fresh.map((p) => levelOf(p.t))) : Infinity
    pairs = pairs.filter((p) => !p.fresh || levelOf(p.t) <= frontier)
  }
  if (!pairs.length) return []
  const total = pairs.reduce((a, p) => a + p.w, 0)
  const out: DrillItem[] = []
  const seen = new Set<string>()
  let guard = 0
  while (out.length < n && guard++ < n * 50) {
    let r = rand() * total
    let chosen = pairs[0]
    for (const p of pairs) {
      r -= p.w
      if (r <= 0) {
        chosen = p
        break
      }
    }
    const persons = TENSE_BY_ID[chosen.t].persons
    const person = persons[Math.floor(rand() * persons.length)]
    const gender: Gender = rand() < 0.5 ? 'm' : 'f'
    const key = `${chosen.v.inf}|${chosen.t}|${person}`
    const prev = out[out.length - 1]
    if (seen.has(key) && seen.size < pairs.length * persons.length) continue
    if (prev && prev.inf === chosen.v.inf && pairs.length > 1 && verbs.length > 1) continue
    seen.add(key)
    out.push({ inf: chosen.v.inf, tense: chosen.t, person, gender })
  }
  return opts.inOrder ? out.sort((a, b) => tenseRank(a.tense) - tenseRank(b.tense)) : out
}

export function expectedForms(item: DrillItem): string[] {
  const cell = conjugate(VERB_BY_INF[item.inf], item.tense).find((c) => c.person === item.person)!
  return item.gender === 'f' ? cell.f : cell.m
}

/** Pronoun label shown before the input. Avoids giving away j’ai vs je suis. */
export function promptPronoun(item: DrillItem): string {
  if (item.tense === 'imperatif') return ['', '(tu)', '', '(nous)', '(vous)', ''][item.person]
  const v = VERB_BY_INF[item.inf]
  if (item.person === 0) {
    const ambiguous = isCompound(item.tense) || elides(v.inf, v.inf)
    const base = ambiguous ? 'je / j’' : 'je'
    return item.tense === 'subjonctif' ? `que ${base}` : base
  }
  const form = expectedForms(item)[0]
  return pronounFor(item.tense, item.person, form, item.gender, v.inf)
}

/** Pronoun + form as it should be read aloud / displayed, e.g. "qu'elle soit". */
export function fullForm(item: DrillItem): string {
  const form = expectedForms(item)[0]
  if (item.tense === 'imperatif') return `${form} !`
  const pr = pronounFor(item.tense, item.person, form, item.gender, item.inf)
  return pr.endsWith("'") ? pr + form : `${pr} ${form}`
}

export function gradeDrill(item: DrillItem, input: string): { verdict: Verdict; expected: string } {
  const answers = expectedForms(item)
  const r = checkAnswer(stripSubjectPronoun(input), answers)
  return { verdict: r.verdict, expected: r.expected }
}

export { VERBS }
