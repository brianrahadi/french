/**
 * Sentences for dictation and speaking practice, collected from the example
 * sentences of the vocabulary decks and the grammar lessons.
 */
import { BUILTIN_WORDS } from '../../data/vocab'
import { LESSONS } from '../../data/grammar'
import { SOUND_SETS } from '../../data/sounds'
import { levelRank, type Level } from '../../data/types'
import { sentenceId } from '../../lib/french'
import { dayKey } from '../../lib/date'
import type { SentenceStat, State } from '../../lib/store'

export interface PracticeSentence {
  id: string
  fr: string
  en: string
  level: Level
  wordId?: string
  lessonId?: string
  soundSet?: string
}

export type SentenceSource = Level | 'mine' | `sound:${string}`

const words = (s: string) => s.trim().split(/\s+/).length

function usable(fr: string): boolean {
  if (!fr || /[0-9_/()[\]=+*]|\.\.\.|…|___/.test(fr)) return false
  const n = words(fr)
  return n >= 3 && n <= 16 && /[.!?»]$/.test(fr.trim())
}

let cache: PracticeSentence[] | null = null

export function allSentences(): PracticeSentence[] {
  if (cache) return cache
  const seen = new Set<string>()
  const out: PracticeSentence[] = []
  const add = (s: Omit<PracticeSentence, 'id'>) => {
    const fr = s.fr.trim()
    const id = sentenceId(fr)
    if (seen.has(id) || !usable(fr) || !s.en) return
    seen.add(id)
    out.push({ ...s, fr, id })
  }
  for (const w of BUILTIN_WORDS) if (w.ex && w.exEn) add({ fr: w.ex, en: w.exEn, level: w.level, wordId: w.id })
  for (const l of LESSONS)
    for (const sec of l.sections)
      for (const b of sec.blocks)
        if (b.type === 'examples')
          for (const ex of b.items) {
            // Lesson examples use *italics* and ~~wrong forms~~ markup; skip the ones showing mistakes.
            if (/~~/.test(ex.fr)) continue
            add({ fr: ex.fr.replace(/\*/g, ''), en: ex.en.replace(/\*/g, ''), level: l.level, lessonId: l.id })
          }
  cache = out
  return out
}

let soundCache: PracticeSentence[] | null = null
export function soundSentences(): PracticeSentence[] {
  if (soundCache) return soundCache
  soundCache = SOUND_SETS.flatMap((set) =>
    set.sentences.map((s) => ({ id: sentenceId(s.fr), fr: s.fr, en: s.en, level: 'A1' as Level, soundSet: set.id })),
  )
  return soundCache
}

const byId = new Map<string, PracticeSentence>()
export function sentenceById(id: string): PracticeSentence | undefined {
  if (!byId.size) for (const s of [...allSentences(), ...soundSentences()]) byId.set(s.id, s)
  return byId.get(id)
}

const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2']

/** Sentences for a source: a level, the learner's own words, or a sound set. */
export function poolFor(source: SentenceSource, s: Pick<State, 'introduced' | 'startLevel'>): PracticeSentence[] {
  if (source.startsWith('sound:')) return soundSentences().filter((x) => x.soundSet === source.slice(6))
  const all = allSentences()
  if (source === 'mine') {
    const mine = all.filter((x) => x.wordId && s.introduced[x.wordId])
    if (mine.length >= 8) return mine
    // Not enough words studied yet: fall back to the learner's level and below.
    const top = LEVEL_ORDER.indexOf(s.startLevel ?? 'A1')
    return [...mine, ...all.filter((x) => !mine.includes(x) && LEVEL_ORDER.indexOf(x.level) <= Math.max(0, top))]
  }
  return all.filter((x) => x.level === source)
}

/**
 * Picks n sentences: unseen ones and ones that went badly come first,
 * sentences done well recently are avoided.
 * `inOrder`: unseen sentences come only from the lowest level (A1 → B2) that
 * still has some, and the picks are sorted by level.
 */
export function pickSentences(
  pool: PracticeSentence[],
  stats: Record<string, SentenceStat>,
  n: number,
  rand: () => number = Math.random,
  opts: { inOrder?: boolean } = {},
): PracticeSentence[] {
  const today = dayKey()
  let candidates = pool
  if (opts.inOrder) {
    const unseen = pool.filter((x) => !stats[x.id])
    const frontier = unseen.length ? Math.min(...unseen.map((x) => levelRank(x.level))) : Infinity
    candidates = pool.filter((x) => stats[x.id] || levelRank(x.level) <= frontier)
  }
  const weighted = candidates.map((x) => {
    const st = stats[x.id]
    let w = 1
    if (!st) w = 3
    else if (st.last < 70) w = 4
    else if (st.best >= 95) w = 0.3
    if (st && dayKey(new Date(st.at)) === today) w *= 0.1
    return { x, key: Math.pow(rand(), 1 / w) }
  })
  const picked = weighted
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map((t) => t.x)
  return opts.inOrder ? picked.sort((a, b) => levelRank(a.level) - levelRank(b.level)) : picked
}
