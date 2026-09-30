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
  /** Mistakes from every kind of practice, newest first — feeds Weak spots. */
  mistakes: Mistake[]
  /** Recent results (1 = right) per skill, e.g. 'lesson:articles', newest last. */
  skills: Record<string, number[]>
  /** Dictation results per sentence id. */
  listening: Record<string, SentenceStat>
  /** Read-aloud results per sentence id. */
  speaking: Record<string, SentenceStat>
  conversations: Conversation[]
  texts: ReaderText[]
  /** Built-in or saved texts the learner finished: id → dayKey. */
  read: Record<string, string>
  /** Bookkeeping that lets progress from several devices be merged. */
  sync: SyncMeta
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
export const DEVICE_SETTINGS = ['voiceURI', 'rate', 'autoplay', 'theme'] as const

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
  /** A correction from writing or conversation that can be practised as "fix the sentence". */
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
}

interface Actions {
  logMistakes: (ms: NewMistake[]) => void
  resolveMistake: (id: string, resolved?: boolean) => void
  recordSkill: (skill: string, ok: boolean) => void
  recordSentence: (kind: 'listening' | 'speaking', id: string, score: number) => void
  saveConversation: (c: Conversation) => void
  deleteConversation: (id: string) => void
  saveText: (t: ReaderText) => void
  updateText: (id: string, patch: Partial<ReaderText>) => void
  deleteText: (id: string) => void
  markRead: (id: string) => void
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
  sessionListening: true,
  sessionSpeaking: false,
}

export const initialState: State = {
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
  mistakes: [],
  skills: {},
  listening: {},
  speaking: {},
  conversations: [],
  texts: [],
  read: {},
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
    ...Object.keys(s.skills ?? {}).map((k) => `skill:${k}`),
  ]
  return Object.fromEntries(keys.map((k) => [k, at]))
}
const tombstone = (s: State, keys: string[]): Pick<State, 'sync'> => {
  const at = now()
  return { sync: { ...s.sync, deleted: { ...s.sync.deleted, ...Object.fromEntries(keys.map((k) => [k, at])) } } }
}

/** Adds to today's activity, both in total and for this device. */
function addActivity(s: State, items: number, correct: number, newWords: number): Partial<State> {
  const k = dayKey()
  const bump = (d?: DayActivity): DayActivity => ({
    items: (d?.items ?? 0) + items,
    correct: (d?.correct ?? 0) + correct,
    newWords: (d?.newWords ?? 0) + newWords,
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
          const prev = s[kind][id]
          const stat: SentenceStat = {
            n: (prev?.n ?? 0) + 1,
            best: Math.max(prev?.best ?? 0, score),
            last: score,
            at: new Date().toISOString(),
          }
          return { [kind]: { ...s[kind], [id]: stat } } as Partial<State>
        }),

      saveConversation: (c) =>
        set((s) => ({ conversations: [c, ...s.conversations.filter((x) => x.id !== c.id)].slice(0, 60) })),

      deleteConversation: (id) =>
        set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id), ...tombstone(s, [`talk:${id}`]) })),

      saveText: (t) => set((s) => ({ texts: [t, ...s.texts.filter((x) => x.id !== t.id)].slice(0, 150) })),

      updateText: (id, patch) => set((s) => ({ texts: s.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      deleteText: (id) => set((s) => ({ texts: s.texts.filter((t) => t.id !== id), ...tombstone(s, [`text:${id}`]) })),

      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: dayKey() } })),

      addWriting: (e) => set((s) => ({ writings: [e, ...s.writings.filter((w) => w.id !== e.id)].slice(0, 200) })),

      deleteWriting: (id) => set((s) => ({ writings: s.writings.filter((w) => w.id !== id), ...tombstone(s, [`writing:${id}`]) })),

      logActivityBulk: (items, correct) => set((s) => addActivity(s, items, correct, 0)),

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
          ...stamp(s, ['activeDecks']),
        })),

      addCustomWords: (words) =>
        set((s) => {
          const existing = new Set(s.customWords.map((w) => w.id))
          const at = now()
          const fresh = words.filter((w) => !existing.has(w.id)).map((w) => ({ ...w, added: w.added ?? at }))
          // Re-adding a word that was deleted earlier undoes the deletion.
          const deleted = { ...s.sync.deleted }
          for (const w of fresh) delete deleted[`word:${w.id}`]
          const hasDeck = s.activeDecks.includes('custom')
          return {
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

      setConjConfig: (c) => set((s) => ({ conjConfig: { ...s.conjConfig, ...c }, ...stamp(s, ['conjConfig']) })),

      logActivity: (correct, opts) => set((s) => addActivity(s, 1, correct ? 1 : 0, opts?.newWord ? 1 : 0)),

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
    lessons: s.lessons,
    conj: s.conj,
    conjConfig: s.conjConfig,
    activity: s.activity,
    startLevel: s.startLevel,
    writings: s.writings,
    mistakes: s.mistakes,
    skills: s.skills,
    listening: s.listening,
    speaking: s.speaking,
    conversations: s.conversations,
    texts: s.texts,
    read: s.read,
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
