import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Level, Word } from '../data/types'
import type { Tense } from './conjugate'
import type { WritingFeedback } from './ai/writing'
import type { Conversation } from '../features/talk/types'
import type { ReaderText } from '../features/reading/types'
import { addDays, dayKey } from './date'
import { DEVICE_ID } from './device'
import { cardId, newCard, Rating, review, type CardDir, type Grade, type StoredCard } from './srs'
import { BUILTIN_WORDS } from '../data/vocab'
import { findSameWord } from './words'
import type { PaletteId } from '../theme'
import type { Roadmap } from '../features/roadmap/plan'
import { addTime, type DayTime, type StudyTimeLog } from './studyTime'

export type Theme = 'system' | 'light' | 'dark'
export type Directions = 'both' | 'recognition' | 'production'

export interface Settings {
  newPerDay: number
  dailyGoal: number
  directions: Directions
  autoplay: boolean
  voiceURI: string | null
  rate: number
  strictAccents: boolean
  theme: Theme
  /** Colour theme (see PALETTES in src/theme.ts). */
  palette: PaletteId
  retention: number
  /** Include a couple of dictation sentences in Today's session. */
  sessionListening: boolean
  /** Include a couple of read-aloud sentences in Today's session (needs a microphone). */
  sessionSpeaking: boolean
}

export interface LessonProgress {
  attempts: number
  best: number // 0..1
  last: number
  lastAt: string
  step: number // index into REVIEW_INTERVALS
  nextReview?: string // dayKey
  /** Results per lesson goal, from every session that tested it. */
  goals?: Record<string, GoalStat>
}

/** How a lesson goal has gone: all-time counts, and the share right the last time it was tested. */
export interface GoalStat {
  n: number
  ok: number
  /** 0..1 — 1 means every question on it was right last time */
  last: number
  at: string
}

/** One session's first-try results, per goal id. */
export type GoalTally = Record<string, { n: number; ok: number }>

export interface ConjStat {
  seen: number
  correct: number
  /** Recent results, newest last (max 8) — 1 = correct */
  recent: number[]
  lastAt: string
}

/** The six skills the profile stats are split into. */
export type StudySkill = 'vocabulary' | 'grammar' | 'reading' | 'writing' | 'listening' | 'speaking'
export const STUDY_SKILLS: StudySkill[] = ['vocabulary', 'grammar', 'reading', 'writing', 'listening', 'speaking']

export interface DayActivity {
  items: number
  correct: number
  newWords: number
  /** Items per skill (recorded since the profile stats were added). */
  skills?: Partial<Record<StudySkill, number>>
}

export interface ConjConfig {
  tenses: Tense[]
  set: 'essential' | 'irregular' | 'regular' | 'all' | 'custom'
  custom: string[]
  length: number
}

export interface State {
  settings: Settings
  cards: Record<string, StoredCard>
  /**
   * wordId → dayKey of the day the word was started. A trailing 'k' ("2026-09-30k")
   * marks a word the learner already knew when it was added (e.g. checked after
   * reading): it doesn't count toward the daily new-word limit.
   */
  introduced: Record<string, string>
  activeDecks: string[]
  customWords: Word[]
  ignoredWords: Record<string, string> // wordId → timestamp
  lessons: Record<string, LessonProgress>
  conj: Record<string, ConjStat> // `${inf}|${tense}`
  conjConfig: ConjConfig
  activity: Record<string, DayActivity>
  startLevel: Level | null
  writings: WritingEntry[]
  /** Mistakes from every kind of practice, newest first — feeds Weak spots. */
  mistakes: Mistake[]
  /** Recent results (1 = right) per skill, e.g. 'lesson:articles', newest last. */
  skills: Record<string, number[]>
  /** Dictation results per sentence id. */
  listening: Record<string, SentenceStat>
  /** Read-aloud results per sentence id. */
  speaking: Record<string, SentenceStat>
  /** Listening-story results (comprehension score, %) per story id. */
  stories: Record<string, SentenceStat>
  /** Audio lessons: where you stopped, and when you finished, per lesson id. */
  audio: Record<string, AudioProgress>
  conversations: Conversation[]
  texts: ReaderText[]
  /** Built-in or saved texts the learner finished: id → dayKey. */
  read: Record<string, string>
  /** The road-to-B2 plan: when it starts and from which week. */
  roadmap: Roadmap
  /** Daily-lesson blocks ticked off, per day (dayKey). */
  planDays: Record<string, PlanDay>
  /** Active study time: device → day → seconds per kind of page (see lib/studyTime). */
  studyTime: StudyTimeLog
  /** Every finished conversation, kept as a short record after old transcripts are pruned. */
  talkLog: Record<string, TalkRecord>
  /** Bookkeeping that lets progress from several devices be merged. */
  sync: SyncMeta
}

/** A finished conversation, in brief: enough for progress and the roadmap. */
export interface TalkRecord {
  scenarioId: string
  level: Level
  score: number
  /** When it was finished (ISO). */
  at: string
}

export interface PlanDay {
  /** Block ids ticked off by hand. */
  done: string[]
  /** A rough day: only the minimum blocks count. */
  min?: boolean
  at: string
}

export interface SyncMeta {
  /** Changes when progress is reset or replaced from a backup; the newer epoch replaces older data everywhere. */
  epoch: string
  epochAt: string
  /**
   * When each shared setting ('settings.dailyGoal'), the deck list, level, drill
   * setup and each skill's recent results ('skill:<id>') last changed. The newest
   * change wins when merging, key by key.
   */
  changed: Record<string, string>
  /** Deleted items ('word:<id>', 'card:<id>', 'writing:<id>', 'talk:<id>', 'text:<id>') → when. */
  deleted: Record<string, string>
  /** Daily activity per device, so counts from several devices add up. */
  devices: Record<string, Record<string, DayActivity>>
}

/** Settings that belong to one device (voice, speed, theme) and are never synced. */
export const DEVICE_SETTINGS = ['voiceURI', 'rate', 'autoplay', 'theme', 'palette'] as const

export interface AudioProgress {
  /** Step to resume from. */
  pos: number
  total: number
  /** ISO time the lesson was first finished. */
  done?: string
  at: string
}

export interface SentenceStat {
  n: number
  best: number // 0..100
  last: number
  at: string
}

export type MistakeSource = 'grammar' | 'verbs' | 'words' | 'writing' | 'talk' | 'listening' | 'speaking'

export interface Mistake {
  id: string
  at: string
  source: MistakeSource
  /**
   * What the mistake says about the learner: 'lesson:<id>', 'verb:<inf>|<tense>',
   * 'word:<wordId>', 'listen:<category>', 'say:<word>' or 'write:<category>'.
   */
  skill: string
  prompt?: string
  given: string
  expected: string
  note?: string
  /** A correction from writing or conversation that can be practiced as "fix the sentence". */
  fixable?: boolean
  /** Fixed later in practice, or dismissed by the learner. */
  resolved?: boolean
  /** Related item, e.g. a dictation sentence id or a conversation id. */
  ref?: string
}

export type NewMistake = Omit<Mistake, 'id' | 'at'>

export interface WritingEntry {
  id: string
  /** Prompt id, 'free' for free writing, or 'custom'. */
  promptId: string
  title: string
  task: string
  level: Level
  text: string
  words: number
  createdAt: string
  model: string
  feedback: WritingFeedback
  /** Id of the entry this is a rewrite of. */
  revisionOf?: string
  /** Written against the clock: minutes allowed, and minutes actually taken. */
  timed?: number
  minutes?: number
}

interface Actions {
  logMistakes: (ms: NewMistake[]) => void
  resolveMistake: (id: string, resolved?: boolean) => void
  recordSkill: (skill: string, ok: boolean) => void
  recordSentence: (kind: 'listening' | 'speaking' | 'stories', id: string, score: number) => void
  saveAudio: (id: string, pos: number, total: number, finished?: boolean) => void
  saveConversation: (c: Conversation) => void
  deleteConversation: (id: string) => void
  saveText: (t: ReaderText) => void
  updateText: (id: string, patch: Partial<ReaderText>) => void
  deleteText: (id: string) => void
  markRead: (id: string) => void
  addWriting: (e: WritingEntry) => void
  deleteWriting: (id: string) => void
  logActivityBulk: (items: number, correct: number, skill?: StudySkill) => void
  setStartLevel: (level: Level, decks: string[]) => void
  updateSettings: (patch: Partial<Settings>) => void
  introduceWord: (wordId: string, dirs: CardDir[], alreadyKnown?: boolean) => void
  addCard: (wordId: string, dir: CardDir) => void
  /**
   * The learner says whether they recognised each word (e.g. after reading).
   * Sets the recognition card: a new word they know is scheduled days ahead, a
   * word they don't know starts learning now (with a production card too if
   * they study that direction); a word already in their reviews counts as a review.
   */
  checkWords: (results: { wordId: string; known: boolean }[], dirs: CardDir[]) => void
  rateCard: (id: string, grade: Grade) => StoredCard
  toggleDeck: (deckId: string) => void
  setDecksActive: (deckIds: string[], active: boolean) => void
  addCustomWords: (words: Word[]) => void
  removeCustomWord: (id: string) => void
  resetWord: (wordId: string) => void
  /** A scored session of a lesson. `startStep` puts a pass further up the review ladder (a test-out). */
  recordLesson: (lessonId: string, score: number, opts?: { goals?: GoalTally; startStep?: number }) => void
  /** Goal results from a session that isn't scored as a whole: one goal's drill, or a level check. */
  recordGoals: (lessonId: string, goals: GoalTally) => void
  recordConj: (inf: string, tense: Tense, correct: boolean) => void
  setConjConfig: (c: Partial<ConjConfig>) => void
  logActivity: (correct: boolean, opts?: { newWord?: boolean; skill?: StudySkill }) => void
  importData: (data: unknown) => void
  ignoreWord: (wordId: string) => void
  resetAll: () => void
  setRoadmap: (patch: Partial<Roadmap>) => void
  tickBlock: (day: string, blockId: string, on: boolean) => void
  setMinimumDay: (day: string, on: boolean) => void
  /** Adds active study time for this device (seconds per kind of page). */
  addStudyTime: (day: string, add: DayTime) => void
}

export const REVIEW_INTERVALS = [1, 3, 7, 16, 35, 90]
export const PASS_MARK = 0.8

function mergeGoals(old: Record<string, GoalStat> | undefined, t: GoalTally | undefined, at: string): Record<string, GoalStat> | undefined {
  if (!t || !Object.keys(t).length) return old
  const out = { ...(old ?? {}) }
  for (const [g, x] of Object.entries(t)) {
    if (!x.n) continue
    const o = out[g]
    out[g] = { n: (o?.n ?? 0) + x.n, ok: (o?.ok ?? 0) + x.ok, last: x.ok / x.n, at }
  }
  return out
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  dailyGoal: 40,
  directions: 'both',
  autoplay: true,
  voiceURI: null,
  rate: 0.95,
  strictAccents: false,
  theme: 'system',
  palette: 'clay',
  retention: 0.9,
  sessionListening: true,
  sessionSpeaking: false,
}

export const initialState: State = {
  settings: DEFAULT_SETTINGS,
  cards: {},
  introduced: {},
  activeDecks: ['a1-essentials', 'a1-people', 'a1-verbs'],
  customWords: [],
  ignoredWords: {},
  lessons: {},
  conj: {},
  conjConfig: { tenses: ['present'], set: 'essential', custom: [], length: 20 },
  activity: {},
  startLevel: null,
  writings: [],
  mistakes: [],
  skills: {},
  listening: {},
  stories: {},
  audio: {},
  speaking: {},
  conversations: [],
  texts: [],
  read: {},
  roadmap: { start: null, startWeek: 1 },
  planDays: {},
  studyTime: {},
  talkLog: {},
  sync: { epoch: '', epochAt: '', changed: {}, deleted: {}, devices: {} },
}

const now = () => new Date().toISOString()
const isDeviceSetting = (k: string) => (DEVICE_SETTINGS as readonly string[]).includes(k)
/** Records when shared values changed, for merging with other devices. */
const stamp = (s: State, keys: string[], at = now()): Pick<State, 'sync'> => ({
  sync: { ...s.sync, changed: { ...s.sync.changed, ...Object.fromEntries(keys.map((k) => [k, at])) } },
})

/** Stamps every "last change wins" value, e.g. for a save from before sync existed or a restored backup. */
export function stampAll(s: Pick<State, 'settings' | 'skills'>, at = now()): Record<string, string> {
  const keys = [
    ...Object.keys(s.settings)
      .filter((k) => !isDeviceSetting(k))
      .map((k) => `settings.${k}`),
    'activeDecks',
    'conjConfig',
    'startLevel',
    'roadmap',
    ...Object.keys(s.skills ?? {}).map((k) => `skill:${k}`),
  ]
  return Object.fromEntries(keys.map((k) => [k, at]))
}
const tombstone = (s: State, keys: string[]): Pick<State, 'sync'> => {
  const at = now()
  return { sync: { ...s.sync, deleted: { ...s.sync.deleted, ...Object.fromEntries(keys.map((k) => [k, at])) } } }
}

/** Adds to today's activity, both in total and for this device. */
function addActivity(s: State, items: number, correct: number, newWords: number, skill?: StudySkill): Partial<State> {
  const k = dayKey()
  const bump = (d?: DayActivity): DayActivity => ({
    items: (d?.items ?? 0) + items,
    correct: (d?.correct ?? 0) + correct,
    newWords: (d?.newWords ?? 0) + newWords,
    ...(skill || d?.skills ? { skills: { ...d?.skills, ...(skill ? { [skill]: (d?.skills?.[skill] ?? 0) + items } : {}) } } : {}),
  })
  const mine = s.sync.devices[DEVICE_ID] ?? {}
  return {
    activity: { ...s.activity, [k]: bump(s.activity[k]) },
    sync: { ...s.sync, devices: { ...s.sync.devices, [DEVICE_ID]: { ...mine, [k]: bump(mine[k]) } } },
  }
}

/**
 * Fills in sync bookkeeping. Saves from before sync existed (`legacy`) get their
 * settings stamped as changed now, so they win over a new device's defaults, and
 * their activity is attributed to this device.
 */
export function withSyncMeta(state: State, legacy = false): State {
  const sync = { ...initialState.sync, ...(state.sync ?? {}) }
  if (legacy) sync.changed = { ...stampAll(state), ...sync.changed }
  if (!Object.keys(sync.devices).length && Object.keys(state.activity ?? {}).length)
    sync.devices = { [DEVICE_ID]: { ...state.activity } }
  return { ...state, sync }
}

export const MAX_MISTAKES = 500
let seq = 0
export const newId = (prefix = '') => `${prefix}${Date.now().toString(36)}${(seq++ % 1296).toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 5)}`

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateSettings: (patch) =>
        set((s) => {
          const shared = Object.keys(patch).filter((k) => !isDeviceSetting(k))
          return { settings: { ...s.settings, ...patch }, ...(shared.length ? stamp(s, shared.map((k) => `settings.${k}`)) : {}) }
        }),

      setStartLevel: (level, decks) => set((s) => ({ startLevel: level, activeDecks: decks, ...stamp(s, ['startLevel', 'activeDecks']) })),

      logMistakes: (ms) =>
        set((s) => {
          if (!ms.length) return {}
          const at = new Date().toISOString()
          const fresh = ms.map((m) => ({ ...m, id: newId('m'), at }))
          return { mistakes: [...fresh, ...s.mistakes].slice(0, MAX_MISTAKES) }
        }),

      resolveMistake: (id, resolved = true) =>
        set((s) => ({ mistakes: s.mistakes.map((m) => (m.id === id ? { ...m, resolved } : m)) })),

      recordSkill: (skill, ok) =>
        set((s) => ({
          skills: { ...s.skills, [skill]: [...(s.skills[skill] ?? []), ok ? 1 : 0].slice(-10) },
          ...stamp(s, [`skill:${skill}`]),
        })),

      recordSentence: (kind, id, score) =>
        set((s) => {
          const prev = s[kind]?.[id]
          const stat: SentenceStat = {
            n: (prev?.n ?? 0) + 1,
            best: Math.max(prev?.best ?? 0, score),
            last: score,
            at: new Date().toISOString(),
          }
          return { [kind]: { ...(s[kind] ?? {}), [id]: stat } } as Partial<State>
        }),

      saveAudio: (id, pos, total, finished) =>
        set((s) => {
          const prev = s.audio?.[id]
          const done = prev?.done ?? (finished ? new Date().toISOString() : undefined)
          return { audio: { ...(s.audio ?? {}), [id]: { pos: finished ? 0 : pos, total, at: new Date().toISOString(), ...(done ? { done } : {}) } } }
        }),

      saveConversation: (c) =>
        set((s) => ({
          conversations: [c, ...s.conversations.filter((x) => x.id !== c.id)].slice(0, 60),
          ...(c.feedback ? { talkLog: { ...s.talkLog, [c.id]: { scenarioId: c.scenarioId, level: c.level, score: c.feedback.score, at: c.updatedAt } } } : {}),
        })),

      deleteConversation: (id) =>
        set((s) => {
          const talkLog = { ...s.talkLog }
          delete talkLog[id]
          return { conversations: s.conversations.filter((c) => c.id !== id), talkLog, ...tombstone(s, [`talk:${id}`]) }
        }),

      saveText: (t) => set((s) => ({ texts: [t, ...s.texts.filter((x) => x.id !== t.id)].slice(0, 150) })),

      updateText: (id, patch) => set((s) => ({ texts: s.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      deleteText: (id) => set((s) => ({ texts: s.texts.filter((t) => t.id !== id), ...tombstone(s, [`text:${id}`]) })),

      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: dayKey() } })),

      addWriting: (e) => set((s) => ({ writings: [e, ...s.writings.filter((w) => w.id !== e.id)].slice(0, 200) })),

      deleteWriting: (id) => set((s) => ({ writings: s.writings.filter((w) => w.id !== id), ...tombstone(s, [`writing:${id}`]) })),

      logActivityBulk: (items, correct, skill) => set((s) => addActivity(s, items, correct, 0, skill)),

      introduceWord: (wordId, dirs, alreadyKnown = false) =>
        set((s) => {
          const now = new Date()
          const cards = { ...s.cards }
          for (const d of dirs) {
            const id = cardId(wordId, d)
            if (cards[id]) continue
            let c = newCard(now)
            if (alreadyKnown) c = review(c, Rating.Easy, now, s.settings.retention)
            cards[id] = c
          }
          return { cards, introduced: { ...s.introduced, [wordId]: s.introduced[wordId] ?? dayKey(now) } }
        }),

      checkWords: (results, dirs) =>
        set((s) => {
          const now = new Date()
          const today = dayKey(now)
          const cards = { ...s.cards }
          const introduced = { ...s.introduced }
          for (const { wordId, known } of results) {
            const rId = cardId(wordId, 'r')
            const existing = cards[rId]
            if (existing) cards[rId] = review(existing, known ? Rating.Good : Rating.Again, now, s.settings.retention)
            else cards[rId] = review(newCard(now), known ? Rating.Easy : Rating.Again, now, s.settings.retention)
            const pId = cardId(wordId, 'p')
            if (!known && dirs.includes('p') && !cards[pId]) cards[pId] = newCard(now)
            if (!introduced[wordId]) introduced[wordId] = known ? `${today}k` : today
          }
          return { cards, introduced }
        }),

      addCard: (wordId, dir) =>
        set((s) => {
          const id = cardId(wordId, dir)
          if (s.cards[id]) return {}
          return { cards: { ...s.cards, [id]: newCard() } }
        }),

      rateCard: (id, grade) => {
        const s = get()
        const current = s.cards[id] ?? newCard()
        const next = review(current, grade, new Date(), s.settings.retention)
        set({ cards: { ...s.cards, [id]: next } })
        return next
      },

      toggleDeck: (deckId) =>
        set((s) => ({
          activeDecks: s.activeDecks.includes(deckId)
            ? s.activeDecks.filter((d) => d !== deckId)
            : [...s.activeDecks, deckId],
          ...stamp(s, ['activeDecks']),
        })),

      setDecksActive: (deckIds, active) =>
        set((s) => {
          const newSet = new Set(s.activeDecks)
          if (active) {
            for (const id of deckIds) newSet.add(id)
          } else {
            for (const id of deckIds) newSet.delete(id)
          }
          return { activeDecks: Array.from(newSet), ...stamp(s, ['activeDecks']) }
        }),

      addCustomWords: (words) =>
        set((s) => {
          const at = now()
          // No duplicates: a word already in the decks ("la gare" when "gare" is built in)
          // is started from the deck instead; one already in my words is skipped.
          const fresh: Word[] = []
          const builtinIds: string[] = []
          for (const w of words) {
            const builtin = findSameWord(w, BUILTIN_WORDS)
            if (builtin) {
              if (!builtinIds.includes(builtin.id)) builtinIds.push(builtin.id)
              continue
            }
            if (s.customWords.some((x) => x.id === w.id) || findSameWord(w, [...s.customWords, ...fresh])) continue
            fresh.push({ ...w, added: w.added ?? at })
          }
          const cards = { ...s.cards }
          const introduced = { ...s.introduced }
          const dirs: CardDir[] = s.settings.directions === 'both' ? ['r', 'p'] : s.settings.directions === 'recognition' ? ['r'] : ['p']
          for (const id of builtinIds) {
            if (introduced[id]) continue
            for (const d of dirs) cards[cardId(id, d)] ??= newCard()
            introduced[id] = dayKey()
          }
          if (!fresh.length) return builtinIds.length ? { cards, introduced } : {}
          // Re-adding a word that was deleted earlier undoes the deletion.
          const deleted = { ...s.sync.deleted }
          for (const w of fresh) delete deleted[`word:${w.id}`]
          const hasDeck = s.activeDecks.includes('custom')
          return {
            cards,
            introduced,
            customWords: [...s.customWords, ...fresh],
            activeDecks: hasDeck ? s.activeDecks : [...s.activeDecks, 'custom'],
            sync: { ...(hasDeck ? s.sync : stamp(s, ['activeDecks'], at).sync), deleted },
          }
        }),

      removeCustomWord: (id) =>
        set((s) => {
          const cards = { ...s.cards }
          delete cards[cardId(id, 'r')]
          delete cards[cardId(id, 'p')]
          const introduced = { ...s.introduced }
          delete introduced[id]
          return {
            customWords: s.customWords.filter((w) => w.id !== id),
            cards,
            introduced,
            ...tombstone(s, [`word:${id}`, `card:${cardId(id, 'r')}`, `card:${cardId(id, 'p')}`]),
          }
        }),

      resetWord: (wordId) =>
        set((s) => {
          const cards = { ...s.cards }
          delete cards[cardId(wordId, 'r')]
          delete cards[cardId(wordId, 'p')]
          const introduced = { ...s.introduced }
          delete introduced[wordId]
          return { cards, introduced, ...tombstone(s, [`card:${cardId(wordId, 'r')}`, `card:${cardId(wordId, 'p')}`]) }
        }),

      ignoreWord: (wordId) =>
        set((s) => ({
          ignoredWords: { ...s.ignoredWords, [wordId]: new Date().toISOString() }
        })),

      recordLesson: (lessonId, score, opts = {}) =>
        set((s) => {
          const stored = s.lessons[lessonId]
          // Goal results alone (no scored session yet) don't count as a previous attempt.
          const prev = stored?.attempts ? stored : undefined
          const passed = score >= PASS_MARK
          const wasDue = !prev?.nextReview || prev.nextReview <= dayKey()
          // Only advance the review ladder when the review was actually due.
          const climbed = passed ? (prev ? (wasDue ? Math.min(prev.step + 1, REVIEW_INTERVALS.length - 1) : prev.step) : 0) : 0
          const step = passed ? Math.max(climbed, Math.min(opts.startStep ?? 0, REVIEW_INTERVALS.length - 1)) : 0
          const days = passed ? REVIEW_INTERVALS[step] : 1
          const keepSchedule = passed && prev && !wasDue && prev.best >= PASS_MARK && step === climbed
          const nextReview = keepSchedule ? prev.nextReview : dayKey(addDays(new Date(), days))
          const at = new Date().toISOString()
          const goals = mergeGoals(stored?.goals, opts.goals, at)
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: {
                attempts: (prev?.attempts ?? 0) + 1,
                best: Math.max(prev?.best ?? 0, score),
                last: score,
                lastAt: at,
                step,
                nextReview,
                ...(goals ? { goals } : {}),
              },
            },
          }
        }),

      recordGoals: (lessonId, goals) =>
        set((s) => {
          const prev = s.lessons[lessonId]
          const at = new Date().toISOString()
          const merged = mergeGoals(prev?.goals, goals, at)
          if (!merged) return {}
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: { ...(prev ?? { attempts: 0, best: 0, last: 0, step: 0 }), lastAt: at, goals: merged },
            },
          }
        }),

      recordConj: (inf, tense, correct) =>
        set((s) => {
          const key = `${inf}|${tense}`
          const prev = s.conj[key] ?? { seen: 0, correct: 0, recent: [], lastAt: '' }
          return {
            conj: {
              ...s.conj,
              [key]: {
                seen: prev.seen + 1,
                correct: prev.correct + (correct ? 1 : 0),
                recent: [...prev.recent, correct ? 1 : 0].slice(-8),
                lastAt: new Date().toISOString(),
              },
            },
          }
        }),

      setConjConfig: (c) => set((s) => ({ conjConfig: { ...s.conjConfig, ...c }, ...stamp(s, ['conjConfig']) })),

      logActivity: (correct, opts) => set((s) => addActivity(s, 1, correct ? 1 : 0, opts?.newWord ? 1 : 0, opts?.skill)),

      importData: (data) => {
        const d = data as { state?: Partial<State> } & Partial<State>
        const incoming = (d.state ?? d) as Partial<State>
        if (!incoming || typeof incoming !== 'object' || !('cards' in incoming || 'lessons' in incoming)) {
          throw new Error('This file does not look like a Petit à petit backup.')
        }
        // A restored backup replaces progress on every synced device.
        const restored = withSyncMeta({
          ...initialState,
          ...incoming,
          settings: { ...DEFAULT_SETTINGS, ...(incoming.settings ?? {}) },
          sync: { ...initialState.sync, devices: {} },
        } as State)
        const at = now()
        set({ ...restored, sync: { ...restored.sync, epoch: newId('e'), epochAt: at, changed: stampAll(restored, at) } })
      },

      setRoadmap: (patch) => set((s) => ({ roadmap: { ...s.roadmap, ...patch }, ...stamp(s, ['roadmap']) })),

      tickBlock: (day, blockId, on) =>
        set((s) => {
          const prev = s.planDays[day] ?? { done: [], at: '' }
          const done = on ? [...new Set([...prev.done, blockId])] : prev.done.filter((id) => id !== blockId)
          return { planDays: { ...s.planDays, [day]: { ...prev, done, at: now() } } }
        }),

      setMinimumDay: (day, on) =>
        set((s) => {
          const prev = s.planDays[day] ?? { done: [], at: '' }
          return { planDays: { ...s.planDays, [day]: { ...prev, min: on || undefined, at: now() } } }
        }),

      addStudyTime: (day, add) => set((s) => ({ studyTime: addTime(s.studyTime ?? {}, DEVICE_ID, day, add) })),

      // Resetting also resets every synced device.
      resetAll: () => {
        const at = now()
        const settings = get().settings
        set({
          ...initialState,
          settings,
          sync: { ...initialState.sync, epoch: newId('e'), epochAt: at, changed: stampAll({ settings, skills: {} }, at) },
        })
      },
    }),
    {
      name: 'petit-a-petit',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const out: Partial<State & Actions> = { ...s }
        for (const k of Object.keys(out) as (keyof typeof out)[]) if (typeof out[k] === 'function') delete out[k]
        return out as State
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        const legacy = !p.sync && ('cards' in p || 'lessons' in p)
        return withSyncMeta({ ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } } as State & Actions, legacy) as State & Actions
      },
    },
  ),
)

export function exportData(): string {
  const s = useStore.getState()
  const data: State = {
    settings: s.settings,
    cards: s.cards,
    introduced: s.introduced,
    activeDecks: s.activeDecks,
    customWords: s.customWords,
    ignoredWords: s.ignoredWords,
    lessons: s.lessons,
    conj: s.conj,
    conjConfig: s.conjConfig,
    activity: s.activity,
    startLevel: s.startLevel,
    writings: s.writings,
    mistakes: s.mistakes,
    skills: s.skills,
    listening: s.listening,
    stories: s.stories,
    audio: s.audio,
    speaking: s.speaking,
    conversations: s.conversations,
    texts: s.texts,
    read: s.read,
    roadmap: s.roadmap,
    planDays: s.planDays,
    studyTime: s.studyTime,
    talkLog: s.talkLog,
    sync: s.sync,
  }
  return JSON.stringify({ app: 'petit-a-petit', version: 1, exportedAt: new Date().toISOString(), state: data }, null, 2)
}

/** Days in a row (ending today or yesterday) with at least one answered item. */
export function computeStreak(activity: Record<string, DayActivity>, now = new Date()): number {
  let d = new Date(now)
  if (!activity[dayKey(d)]?.items) d = addDays(d, -1)
  let n = 0
  while (activity[dayKey(d)]?.items) {
    n++
    d = addDays(d, -1)
  }
  return n
}
