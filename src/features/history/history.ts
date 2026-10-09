/**
 * What you did, and what you left half-way, built from the records the app
 * already keeps. Sentence drills (dictation, read-aloud), flashcards and verb
 * drills are saved item by item, so they're folded into one entry per day.
 */
import { LESSON_BY_ID } from '../../data/grammar'
import { STORY_BY_ID } from '../../data/stories'
import { AUDIO_BY_ID } from '../../data/audio'
import { TEXT_BY_ID } from '../../data/texts'
import { SCENARIO_BY_ID } from '../../data/scenarios'
import { dayKey } from '../../lib/date'
import type { State } from '../../lib/store'

export type HistoryKind = 'grammar' | 'vocab' | 'verbs' | 'listening' | 'speaking' | 'reading' | 'writing' | 'talk'

export const KIND_LABEL: Record<HistoryKind, string> = {
  grammar: 'Grammar',
  vocab: 'Flashcards',
  verbs: 'Verbs',
  listening: 'Listening',
  speaking: 'Speaking',
  reading: 'Reading',
  writing: 'Writing',
  talk: 'Conversation',
}

export interface HistoryEntry {
  id: string
  kind: HistoryKind
  title: string
  detail?: string
  /** 0–100 */
  score?: number
  /** ISO time, for ordering. */
  at: string
  /** dayKey, for grouping. */
  day: string
  to: string
}

export interface ContinueItem {
  id: string
  kind: HistoryKind | 'session'
  title: string
  detail: string
  /** 0..1, when there is a meaningful position. */
  progress?: number
  at: string
  to: string
}

export type HistorySource = Pick<
  State,
  'lessons' | 'writings' | 'conversations' | 'talkLog' | 'stories' | 'audio' | 'read' | 'texts' | 'listening' | 'speaking' | 'cards' | 'conj' | 'activity'
>

const dayOf = (iso: string) => dayKey(new Date(iso))
/** A time for records that only kept the day. */
const noon = (day: string) => `${day}T12:00:00`
const pct = (x: number) => Math.round(x)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Folds item-by-item records into one entry per day. */
function perDay(stats: Record<string, { at: string; last?: number }>): Map<string, { n: number; sum: number; scored: number; at: string }> {
  const out = new Map<string, { n: number; sum: number; scored: number; at: string }>()
  for (const x of Object.values(stats)) {
    if (!x?.at) continue
    const d = dayOf(x.at)
    const g = out.get(d) ?? { n: 0, sum: 0, scored: 0, at: x.at }
    g.n++
    if (typeof x.last === 'number') {
      g.sum += x.last
      g.scored++
    }
    if (x.at > g.at) g.at = x.at
    out.set(d, g)
  }
  return out
}

/** Everything you did, newest first. */
export function buildHistory(s: HistorySource): HistoryEntry[] {
  const out: HistoryEntry[] = []
  const add = (e: Omit<HistoryEntry, 'day'>) => out.push({ ...e, day: dayOf(e.at) })

  for (const [id, p] of Object.entries(s.lessons))
    if (p?.lastAt && p.attempts > 0) add({ id: `lesson:${id}`, kind: 'grammar', title: LESSON_BY_ID[id]?.title ?? id, score: pct(p.last * 100), at: p.lastAt, to: `/grammar/${id}` })

  for (const w of s.writings)
    add({ id: `writing:${w.id}`, kind: 'writing', title: w.title || 'Free writing', detail: w.revisionOf ? 'Rewrite' : w.timed ? `Timed, ${w.timed} min` : undefined, score: w.feedback?.score, at: w.createdAt, to: `/writing/${w.id}` })

  const seen = new Set<string>()
  for (const c of s.conversations) {
    if (!c.turns.some((t) => t.role === 'me')) continue
    seen.add(c.id)
    add({ id: `talk:${c.id}`, kind: 'talk', title: c.title || SCENARIO_BY_ID[c.scenarioId]?.title || 'Conversation', detail: c.ended || c.feedback ? undefined : 'Not finished', score: c.feedback?.score, at: c.updatedAt, to: `/talk/${c.id}` })
  }
  // Finished conversations whose transcript has been pruned.
  for (const [id, r] of Object.entries(s.talkLog ?? {}))
    if (!seen.has(id)) add({ id: `talk:${id}`, kind: 'talk', title: SCENARIO_BY_ID[r.scenarioId]?.title ?? (r.scenarioId === 'free' ? 'Free conversation' : 'Conversation'), score: r.score, at: r.at, to: '/library#talk' })

  for (const [id, x] of Object.entries(s.stories ?? {}))
    if (x?.at) add({ id: `story:${id}`, kind: 'listening', title: STORY_BY_ID[id]?.title ?? 'Story', detail: 'Story', score: x.last, at: x.at, to: STORY_BY_ID[id] ? `/listening/story/${id}` : '/library#stories' })

  for (const [id, x] of Object.entries(s.audio ?? {}))
    if (x?.at && x.pos > 0) add({ id: `audio:${id}`, kind: 'listening', title: AUDIO_BY_ID[id]?.title ?? 'Audio lesson', detail: x.done ? 'Audio lesson' : `Audio lesson, ${pct((x.pos / Math.max(1, x.total)) * 100)}% through`, at: x.at, to: `/audio/${id}` })

  const saved = new Map(s.texts.map((t) => [t.id, t]))
  for (const [id, day] of Object.entries(s.read)) {
    const t = saved.get(id)
    add({ id: `read:${id}`, kind: 'reading', title: TEXT_BY_ID[id]?.title ?? t?.title ?? 'Text', at: t?.finishedAt ?? noon(day), to: `/reading/${id}` })
  }

  for (const [d, g] of perDay(s.listening))
    add({ id: `dictation:${d}`, kind: 'listening', title: 'Dictation', detail: plural(g.n, 'sentence'), score: g.scored ? pct(g.sum / g.scored) : undefined, at: g.at, to: '/dictation' })
  for (const [d, g] of perDay(s.speaking))
    add({ id: `speaking:${d}`, kind: 'speaking', title: 'Read aloud', detail: plural(g.n, 'sentence'), score: g.scored ? pct(g.sum / g.scored) : undefined, at: g.at, to: '/speaking' })

  // Cards keep only their latest review, so the day's count comes from activity when it has one.
  const cardDays = new Map<string, { n: number; at: string }>()
  for (const c of Object.values(s.cards)) {
    if (!c.last_review) continue
    const d = dayOf(c.last_review)
    const g = cardDays.get(d) ?? { n: 0, at: c.last_review }
    g.n++
    if (c.last_review > g.at) g.at = c.last_review
    cardDays.set(d, g)
  }
  for (const [d, g] of cardDays) {
    const n = Math.max(g.n, s.activity[d]?.skills?.vocabulary ?? 0)
    add({ id: `cards:${d}`, kind: 'vocab', title: 'Flashcards', detail: plural(n, 'card'), at: g.at, to: '/vocab' })
  }

  const verbDays = new Map<string, { n: number; at: string }>()
  for (const x of Object.values(s.conj)) {
    if (!x?.lastAt) continue
    const d = dayOf(x.lastAt)
    const g = verbDays.get(d) ?? { n: 0, at: x.lastAt }
    g.n++
    if (x.lastAt > g.at) g.at = x.lastAt
    verbDays.set(d, g)
  }
  for (const [d, g] of verbDays) add({ id: `verbs:${d}`, kind: 'verbs', title: 'Verb drill', detail: plural(g.n, 'form'), at: g.at, to: '/conjugation' })

  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

/** How long something left half-way stays on the Continue list. */
const KEEP_DAYS = 14

/** Things started but not finished, most recent first. `session` is today's saved session, if any. */
export function continueItems(s: HistorySource, session?: { done: number; left: number }, now = new Date()): ContinueItem[] {
  const since = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString()
  const out: ContinueItem[] = []

  for (const [id, x] of Object.entries(s.audio ?? {}))
    if (x && !x.done && x.pos > 0 && x.at >= since && AUDIO_BY_ID[id])
      out.push({ id: `audio:${id}`, kind: 'listening', title: AUDIO_BY_ID[id].title, detail: `${pct((x.pos / Math.max(1, x.total)) * 100)}% through`, progress: x.pos / Math.max(1, x.total), at: x.at, to: `/audio/${id}` })

  for (const t of s.texts)
    if (t.openedAt && !t.finishedAt && !s.read[t.id] && t.openedAt >= since) out.push({ id: `text:${t.id}`, kind: 'reading', title: t.title, detail: 'Not finished', at: t.openedAt, to: `/reading/${t.id}` })

  for (const c of s.conversations) {
    if (c.ended || c.feedback || c.updatedAt < since || !c.turns.some((t) => t.role === 'me')) continue
    const goals = SCENARIO_BY_ID[c.scenarioId]?.goals.length ?? 0
    out.push({ id: `talk:${c.id}`, kind: 'talk', title: c.title || 'Conversation', detail: goals ? `${c.goalsMet.length} of ${goals} goals` : 'In progress', progress: goals ? c.goalsMet.length / goals : undefined, at: c.updatedAt, to: `/talk/${c.id}` })
  }

  out.sort((a, b) => (a.at < b.at ? 1 : -1))
  if (session && session.left > 0)
    out.unshift({ id: 'session', kind: 'session', title: 'Today’s session', detail: `${session.left} to go`, progress: session.done / (session.done + session.left), at: now.toISOString(), to: '/session' })
  return out
}

/** "Today", "Yesterday", or a short weekday and date. */
export function dayLabel(day: string, now = new Date()): string {
  if (day === dayKey(now)) return 'Today'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (day === dayKey(y)) return 'Yesterday'
  const d = new Date(`${day}T12:00:00`)
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}
