import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Level, Word } from '../data/types'
import type { Tense } from './conjugate'
import type { WritingFeedback } from './ai'
import { addDays, dayKey } from './date'
import { cardId, newCard, Rating, review, type CardDir, type Grade, type StoredCard } from './srs'

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
  retention: number
}

export interface LessonProgress {
  attempts: number
  best: number // 0..1
  last: number
  lastAt: string
  step: number // index into REVIEW_INTERVALS
  nextReview?: string // dayKey
}

export interface ConjStat {
  seen: number
  correct: number
  /** Recent results, newest last (max 8) — 1 = correct */
  recent: number[]
  lastAt: string
}

export interface DayActivity {
  items: number
  correct: number
  newWords: number
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
  introduced: Record<string, string> // wordId → dayKey
  activeDecks: string[]
  customWords: Word[]
  lessons: Record<string, LessonProgress>
  conj: Record<string, ConjStat> // `${inf}|${tense}`
  conjConfig: ConjConfig
  activity: Record<string, DayActivity>
  startLevel: Level | null
  writings: WritingEntry[]
}

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
}

interface Actions {
  addWriting: (e: WritingEntry) => void
  deleteWriting: (id: string) => void
  logActivityBulk: (items: number, correct: number) => void
  setStartLevel: (level: Level, decks: string[]) => void
  updateSettings: (patch: Partial<Settings>) => void
  introduceWord: (wordId: string, dirs: CardDir[], alreadyKnown?: boolean) => void
  addCard: (wordId: string, dir: CardDir) => void
  rateCard: (id: string, grade: Grade) => StoredCard
  toggleDeck: (deckId: string) => void
  addCustomWords: (words: Word[]) => void
  removeCustomWord: (id: string) => void
  resetWord: (wordId: string) => void
  recordLesson: (lessonId: string, score: number) => void
  recordConj: (inf: string, tense: Tense, correct: boolean) => void
  setConjConfig: (c: Partial<ConjConfig>) => void
  logActivity: (correct: boolean, opts?: { newWord?: boolean }) => void
  importData: (data: unknown) => void
  resetAll: () => void
}

export const REVIEW_INTERVALS = [1, 3, 7, 16, 35, 90]
export const PASS_MARK = 0.8

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  dailyGoal: 40,
  directions: 'both',
  autoplay: true,
  voiceURI: null,
  rate: 0.95,
  strictAccents: false,
  theme: 'system',
  retention: 0.9,
}

const initialState: State = {
  settings: DEFAULT_SETTINGS,
  cards: {},
  introduced: {},
  activeDecks: ['a1-essentials', 'a1-people', 'a1-verbs'],
  customWords: [],
  lessons: {},
  conj: {},
  conjConfig: { tenses: ['present'], set: 'essential', custom: [], length: 20 },
  activity: {},
  startLevel: null,
  writings: [],
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setStartLevel: (level, decks) => set({ startLevel: level, activeDecks: decks }),

      addWriting: (e) => set((s) => ({ writings: [e, ...s.writings.filter((w) => w.id !== e.id)].slice(0, 200) })),

      deleteWriting: (id) => set((s) => ({ writings: s.writings.filter((w) => w.id !== id) })),

      logActivityBulk: (items, correct) =>
        set((s) => {
          const k = dayKey()
          const d = s.activity[k] ?? { items: 0, correct: 0, newWords: 0 }
          return { activity: { ...s.activity, [k]: { ...d, items: d.items + items, correct: d.correct + correct } } }
        }),

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
        })),

      addCustomWords: (words) =>
        set((s) => {
          const existing = new Set(s.customWords.map((w) => w.id))
          const fresh = words.filter((w) => !existing.has(w.id))
          return {
            customWords: [...s.customWords, ...fresh],
            activeDecks: s.activeDecks.includes('custom') ? s.activeDecks : [...s.activeDecks, 'custom'],
          }
        }),

      removeCustomWord: (id) =>
        set((s) => {
          const cards = { ...s.cards }
          delete cards[cardId(id, 'r')]
          delete cards[cardId(id, 'p')]
          const introduced = { ...s.introduced }
          delete introduced[id]
          return { customWords: s.customWords.filter((w) => w.id !== id), cards, introduced }
        }),

      resetWord: (wordId) =>
        set((s) => {
          const cards = { ...s.cards }
          delete cards[cardId(wordId, 'r')]
          delete cards[cardId(wordId, 'p')]
          const introduced = { ...s.introduced }
          delete introduced[wordId]
          return { cards, introduced }
        }),

      recordLesson: (lessonId, score) =>
        set((s) => {
          const prev = s.lessons[lessonId]
          const passed = score >= PASS_MARK
          const wasDue = !prev?.nextReview || prev.nextReview <= dayKey()
          // Only advance the review ladder when the review was actually due.
          const step = passed ? (prev ? (wasDue ? Math.min(prev.step + 1, REVIEW_INTERVALS.length - 1) : prev.step) : 0) : 0
          const days = passed ? REVIEW_INTERVALS[step] : 1
          const nextReview = passed && prev && !wasDue ? prev.nextReview : dayKey(addDays(new Date(), days))
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: {
                attempts: (prev?.attempts ?? 0) + 1,
                best: Math.max(prev?.best ?? 0, score),
                last: score,
                lastAt: new Date().toISOString(),
                step,
                nextReview,
              },
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

      setConjConfig: (c) => set((s) => ({ conjConfig: { ...s.conjConfig, ...c } })),

      logActivity: (correct, opts) =>
        set((s) => {
          const k = dayKey()
          const d = s.activity[k] ?? { items: 0, correct: 0, newWords: 0 }
          return {
            activity: {
              ...s.activity,
              [k]: {
                items: d.items + 1,
                correct: d.correct + (correct ? 1 : 0),
                newWords: d.newWords + (opts?.newWord ? 1 : 0),
              },
            },
          }
        }),

      importData: (data) => {
        const d = data as { state?: Partial<State> } & Partial<State>
        const incoming = (d.state ?? d) as Partial<State>
        if (!incoming || typeof incoming !== 'object' || !('cards' in incoming || 'lessons' in incoming)) {
          throw new Error('This file does not look like a Petit à petit backup.')
        }
        set({
          ...initialState,
          ...incoming,
          settings: { ...DEFAULT_SETTINGS, ...(incoming.settings ?? {}) },
        })
      },

      resetAll: () => set({ ...initialState, settings: get().settings }),
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
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } }
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
    lessons: s.lessons,
    conj: s.conj,
    conjConfig: s.conjConfig,
    activity: s.activity,
    startLevel: s.startLevel,
    writings: s.writings,
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
