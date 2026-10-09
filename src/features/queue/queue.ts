/**
 * The reasoning behind what you study: what a level asks of you before the app
 * moves you up, when every review falls due, the order new words come in, and
 * why each item of today's session was picked.
 */
import { LESSONS, LESSON_BY_ID } from '../../data/grammar'
import { BUILTIN_TEXTS } from '../../data/texts'
import { STORIES } from '../../data/stories'
import { AUDIO_LESSONS } from '../../data/audio'
import { SCENARIOS } from '../../data/scenarios'
import { WRITING_PROMPTS } from '../../data/writing'
import { DECKS, DECK_BY_ID, findWord } from '../../data/vocab'
import type { Level } from '../../data/types'
import { addDays, dayKey } from '../../lib/date'
import { LEVEL_UP_AT, lessonDone, storyDone } from '../../lib/level'
import { cardStatus, parseCardId } from '../../lib/srs'
import { PASS_MARK, type State } from '../../lib/store'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { introducedToday, newWordQueue, wordStatus } from '../vocab/selectors'
import { computeWeakSpots } from '../weak/weak'
import { sentenceById } from '../listening/sentences'
import { MIX, type MixedItem, type MixedPlan } from '../session/plan'

// ───────────── What a level asks for ─────────────

export type LevelKind = 'grammar' | 'text' | 'story' | 'audio' | 'roleplay' | 'writing' | 'word'
export type ItemStatus = 'done' | 'started' | 'todo'

export const LEVEL_KIND_LABEL: Record<LevelKind, string> = {
  grammar: 'Grammar',
  text: 'Text',
  story: 'Story',
  audio: 'Audio',
  roleplay: 'Role-play',
  writing: 'Writing',
  word: 'Word',
}

export interface LevelRow {
  id: string
  kind: LevelKind
  title: string
  /** Second line: the English, the deck, what "done" means. */
  sub?: string
  status: ItemStatus
  /** What you have so far, e.g. "85%" or "learning". */
  have?: string
  /** Counts toward moving up a level. */
  counts: boolean
  to: string
}

export interface LevelSummary {
  level: Level
  /** Items that count toward moving up. */
  total: number
  done: number
  /** Done items needed to move up (LEVEL_UP_AT of the total). */
  needed: number
  /** Still to do before the app moves you up. */
  left: number
  rows: LevelRow[]
}

type LevelSource = Pick<State, 'lessons' | 'read' | 'stories' | 'audio' | 'conversations' | 'talkLog' | 'writings' | 'cards'>

const pct = (x: number) => `${Math.round(x)}%`

export function levelSummary(level: Level, s: LevelSource): LevelSummary {
  const rows: LevelRow[] = []

  for (const l of LESSONS.filter((x) => x.level === level)) {
    const p = s.lessons[l.id]
    const done = lessonDone(s, l.id)
    rows.push({ id: `lesson:${l.id}`, kind: 'grammar', title: l.title, sub: 'Best score 70% or more', status: done ? 'done' : p?.attempts || p?.goals ? 'started' : 'todo', have: p?.attempts ? pct(p.best * 100) : undefined, counts: true, to: `/grammar/${l.id}` })
  }
  for (const t of BUILTIN_TEXTS.filter((x) => x.level === level))
    rows.push({ id: `text:${t.id}`, kind: 'text', title: t.title, sub: 'Read to the end', status: s.read[t.id] ? 'done' : 'todo', have: s.read[t.id] ? 'read' : undefined, counts: true, to: `/reading/${t.id}` })
  for (const x of STORIES.filter((y) => y.level === level)) {
    const st = s.stories?.[x.id]
    rows.push({ id: `story:${x.id}`, kind: 'story', title: x.title, sub: 'Comprehension 60% or more', status: storyDone(s, x.id) ? 'done' : st ? 'started' : 'todo', have: st ? pct(st.best) : undefined, counts: true, to: `/listening/story/${x.id}` })
  }

  // The rest of the level doesn't move you up, but it's what the level has to offer.
  for (const a of AUDIO_LESSONS.filter((x) => x.level === level)) {
    const p = s.audio?.[a.id]
    rows.push({ id: `audio:${a.id}`, kind: 'audio', title: a.title, sub: 'Listen to the end', status: p?.done ? 'done' : p?.pos ? 'started' : 'todo', have: p?.done ? 'finished' : p?.pos ? pct((p.pos / Math.max(1, p.total)) * 100) : undefined, counts: false, to: `/audio/${a.id}` })
  }
  const talked = new Map<string, number>()
  for (const r of Object.values(s.talkLog ?? {})) talked.set(r.scenarioId, Math.max(talked.get(r.scenarioId) ?? 0, r.score))
  for (const c of s.conversations) if (c.feedback) talked.set(c.scenarioId, Math.max(talked.get(c.scenarioId) ?? 0, c.feedback.score))
  const startedTalk = new Set(s.conversations.filter((c) => c.turns.some((t) => t.role === 'me')).map((c) => c.scenarioId))
  for (const x of SCENARIOS.filter((y) => y.level === level)) {
    const best = talked.get(x.id)
    rows.push({ id: `talk:${x.id}`, kind: 'roleplay', title: x.title, sub: 'Finish for a score', status: best !== undefined ? 'done' : startedTalk.has(x.id) ? 'started' : 'todo', have: best !== undefined ? pct(best) : undefined, counts: false, to: '/library#talk' })
  }
  const written = new Map<string, number>()
  for (const w of s.writings) written.set(w.promptId, Math.max(written.get(w.promptId) ?? 0, w.feedback?.score ?? 0))
  for (const p of WRITING_PROMPTS.filter((y) => y.level === level))
    rows.push({ id: `writing:${p.id}`, kind: 'writing', title: p.title, sub: 'Write it and get it corrected', status: written.has(p.id) ? 'done' : 'todo', have: written.has(p.id) ? pct(written.get(p.id)!) : undefined, counts: false, to: `/writing/new?prompt=${p.id}` })

  const seen = new Set<string>()
  for (const d of DECKS.filter((x) => x.level === level))
    for (const w of d.words) {
      if (seen.has(w.id)) continue
      seen.add(w.id)
      const st = wordStatus(w.id, s.cards)
      rows.push({ id: `word:${w.id}`, kind: 'word', title: w.fr, sub: `${w.en} · ${d.title}`, status: st === 'mature' ? 'done' : st === 'new' ? 'todo' : 'started', have: st === 'new' ? undefined : st, counts: false, to: `/vocab?tab=browse&deck=${d.id}` })
    }

  const counted = rows.filter((r) => r.counts)
  const done = counted.filter((r) => r.status === 'done').length
  const needed = Math.ceil(counted.length * LEVEL_UP_AT)
  return { level, total: counted.length, done, needed, left: Math.max(0, needed - done), rows }
}

// ───────────── When reviews fall due ─────────────

export interface ReviewRow {
  id: string
  kind: 'card' | 'lesson'
  title: string
  sub: string
  /** ISO time (cards) or dayKey (lessons). */
  due: string
  /** The day it's due (overdue reviews count as today). */
  day: string
  overdue: boolean
  /** Days until the next review after this one, as currently scheduled. */
  interval: number
  state: string
  to: string
}

const CARD_STATE = ['new', 'learning', 'review', 'relearning']

export function reviewSchedule(s: Pick<State, 'cards' | 'customWords' | 'lessons'>, now = new Date()): ReviewRow[] {
  const today = dayKey(now)
  const rows: ReviewRow[] = []
  for (const [id, c] of Object.entries(s.cards)) {
    const { wordId, dir } = parseCardId(id)
    const w = findWord(wordId, s.customWords)
    if (!w) continue
    const day = dayKey(new Date(c.due))
    rows.push({
      id: `card:${id}`,
      kind: 'card',
      title: dir === 'r' ? w.fr : w.en,
      sub: `${dir === 'r' ? 'FR → EN' : 'EN → FR'} · ${w.level} · ${DECK_BY_ID[w.deck]?.title ?? 'My words'}`,
      due: c.due,
      day: day < today ? today : day,
      overdue: day < today,
      interval: c.scheduled_days ?? 0,
      state: c.state === 2 ? cardStatus(c) : CARD_STATE[c.state] ?? 'review',
      to: `/vocab?tab=browse`,
    })
  }
  for (const [id, p] of Object.entries(s.lessons)) {
    const l = LESSON_BY_ID[id]
    if (!l || !p.nextReview || p.best < PASS_MARK) continue
    rows.push({ id: `lesson:${id}`, kind: 'lesson', title: l.title, sub: `Grammar · ${l.level} · step ${p.step + 1}`, due: p.nextReview, day: p.nextReview < today ? today : p.nextReview, overdue: p.nextReview < today, interval: 0, state: `best ${pct(p.best * 100)}`, to: `/grammar/${id}/practice` })
  }
  // Lessons are due for the whole day: they sort as the start of it.
  const key = (r: ReviewRow) => (r.kind === 'lesson' ? `${r.due}T00:00:00` : r.due)
  return rows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
}

/** How many reviews fall on each of the next `days` days (index 0 = today, overdue included). */
export function reviewsPerDay(rows: ReviewRow[], days: number, now = new Date()): { day: string; cards: number; lessons: number }[] {
  const out = Array.from({ length: days }, (_, i) => ({ day: dayKey(addDays(now, i)), cards: 0, lessons: 0 }))
  const at = new Map(out.map((d, i) => [d.day, i]))
  for (const r of rows) {
    const i = at.get(r.day)
    if (i === undefined) continue
    if (r.kind === 'card') out[i].cards++
    else out[i].lessons++
  }
  return out
}

// ───────────── The order new words come in ─────────────

export interface NewWordRow {
  position: number
  id: string
  fr: string
  en: string
  level: Level
  deck: string
  /** The day it should come up, if you take your daily new words every day. */
  day: string
}

export function newWordSchedule(s: Pick<State, 'activeDecks' | 'introduced' | 'customWords' | 'settings'>, now = new Date()): NewWordRow[] {
  const perDay = Math.max(1, s.settings.newPerDay)
  const leftToday = Math.max(0, perDay - introducedToday(s.introduced))
  return newWordQueue(s).map((w, i) => ({
    position: i + 1,
    id: w.id,
    fr: w.fr,
    en: w.en,
    level: w.level,
    deck: DECK_BY_ID[w.deck]?.title ?? 'My words',
    day: dayKey(addDays(now, i < leftToday ? 0 : 1 + Math.floor((i - leftToday) / perDay))),
  }))
}

// ───────────── Why today's session has what it has ─────────────

export type SessionKind = 'review' | 'new' | 'grammar' | 'verb' | 'fix' | 'listen' | 'say'

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  review: 'Review',
  new: 'New word',
  grammar: 'Grammar',
  verb: 'Verb',
  fix: 'Correction',
  listen: 'Dictation',
  say: 'Read aloud',
}

export interface SessionRow {
  n: number
  kind: SessionKind
  title: string
  reason: string
}

type SessionSource = Pick<State, 'cards' | 'customWords' | 'lessons' | 'conj' | 'mistakes' | 'skills' | 'activeDecks' | 'introduced'>

const ago = (iso: string, now: Date) => {
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  return d <= 0 ? 'due today' : d === 1 ? 'overdue by 1 day' : `overdue by ${d} days`
}

export function explainSession(plan: MixedPlan, s: SessionSource, now = new Date()): SessionRow[] {
  const queue = newWordQueue(s)
  const queuePos = new Map(queue.map((w, i) => [w.id, i + 1]))
  const weak = new Map(computeWeakSpots(s).lessons.map((w) => [w.lessonId, w]))
  const mistakes = new Map(s.mistakes.map((m) => [m.id, m]))
  return plan.items.map((it: MixedItem, i): SessionRow => {
    const n = i + 1
    switch (it.kind) {
      case 'card': {
        const c = s.cards[it.id]
        const { wordId, dir } = parseCardId(it.id)
        const w = findWord(wordId, s.customWords)
        return { n, kind: 'review', title: w ? (dir === 'r' ? `${w.fr} → ?` : `${w.en} → ?`) : it.id, reason: c ? `Flashcard ${ago(c.due, now)}; last interval ${c.scheduled_days} d` : 'Flashcard due' }
      }
      case 'intro': {
        const w = findWord(it.wordId, s.customWords)
        return { n, kind: 'new', title: w ? `${w.fr} (${w.en})` : it.wordId, reason: `Next in your new-word queue (#${queuePos.get(it.wordId) ?? '?'}), from ${w ? (DECK_BY_ID[w.deck]?.title ?? 'My words') : 'your decks'}` }
      }
      case 'grammar': {
        const l = LESSON_BY_ID[it.lessonId]
        const p = s.lessons[it.lessonId]
        const title = `${l?.title ?? it.lessonId}, question ${it.index + 1}`
        if (it.retry) return { n, kind: 'grammar', title, reason: 'Missed earlier in this session, asked again' }
        if (it.review) return { n, kind: 'grammar', title, reason: `Spaced review: due ${p?.nextReview ?? 'today'}; questions from its weakest goals` }
        if (it.weak) return { n, kind: 'grammar', title, reason: `Weak spot: ${weak.get(it.lessonId)?.count ?? 'recent'} mistakes on this point` }
        if (p && p.best < PASS_MARK) return { n, kind: 'grammar', title, reason: `Still learning: best ${pct(p.best * 100)}, mastered at ${pct(PASS_MARK * 100)}` }
        return { n, kind: 'grammar', title, reason: 'Refresher from a lesson you’ve mastered' }
      }
      case 'conj': {
        const st = s.conj[`${it.item.inf}|${it.item.tense}`]
        const tense = TENSE_BY_ID[it.item.tense]?.label ?? it.item.tense
        return { n, kind: 'verb', title: `${it.item.inf} · ${tense}`, reason: it.retry ? 'Missed earlier, asked again' : st ? `${Math.round((st.correct / Math.max(1, st.seen)) * 100)}% right over ${st.seen} tries` : 'A form you haven’t practised yet' }
      }
      case 'fix': {
        const m = mistakes.get(it.mistakeId)
        return { n, kind: 'fix', title: m ? `${m.given} → ${m.expected}` : 'Correction', reason: `A correction from your ${m?.source === 'talk' ? 'conversations' : 'writing'}, to get right yourself` }
      }
      case 'listen':
      case 'say': {
        const x = sentenceById(it.sentenceId)
        return { n, kind: it.kind, title: x?.fr ?? it.sentenceId, reason: 'A sentence built from words you know' }
      }
    }
  })
}

/** The rules the session follows, filled in with today's numbers. */
export function sessionRules(plan: MixedPlan, s: Pick<State, 'settings' | 'introduced'>): string[] {
  const c = plan.counts
  const leftNew = Math.max(0, s.settings.newPerDay - introducedToday(s.introduced))
  return [
    `Flashcards: the ${MIX.maxReviews} most overdue reviews, lowest level first${c.moreReviews ? ` (${c.moreReviews} more are due and wait for the next session)` : ''}.`,
    `New words: up to ${MIX.maxNew} per session, within your ${s.settings.newPerDay} a day (${leftNew} left today), in deck order A1 → B2.`,
    `Grammar: ${MIX.grammar} questions. Lessons due for spaced review first (up to ${MIX.maxReviewLessons}, ${MIX.perReviewLesson} questions each), then weak points, then lessons you’re still learning, then refreshers.`,
    `Verbs: ${MIX.conj} forms from your drill settings, picked at random with weak and unseen ones weighted up.`,
    `Corrections, dictation and read-aloud: up to ${MIX.fix}, ${MIX.listen} and ${MIX.say}, when they’re on in Settings.`,
  ]
}
