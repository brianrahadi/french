/**
 * Today's session is saved on this device after every answer, so leaving part-way
 * loses nothing: opening it again picks up where you stopped.
 */
import { LESSON_BY_ID } from '../../data/grammar'
import { findWord } from '../../data/vocab'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { dayKey, endOfDay } from '../../lib/date'
import { useStore, type State } from '../../lib/store'
import type { MixedItem, MixedPlan } from './plan'
import { lessonGoals, lessonsToRecord, pick, type Run } from './run'

const KEY = 'petit-a-petit-session'
const VERSION = 1

interface SavedSession {
  v: number
  day: string
  /** Progress it belongs to: resetting or restoring a backup makes it void. */
  epoch: string
  plan: MixedPlan
  run: Run
  /** Time spent in it so far (ms). */
  elapsed: number
}

export interface Resumed {
  plan: MixedPlan
  run: Run
  elapsed: number
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Progress = Pick<State, 'cards' | 'introduced' | 'customWords' | 'mistakes' | 'sync'>

function local(): Store | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function read(storage: Store | null): SavedSession | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SavedSession
    return s?.v === VERSION && Array.isArray(s.plan?.items) && Array.isArray(s.run?.items) && s.run.lessons ? s : null
  } catch {
    return null
  }
}

export function saveSession(plan: MixedPlan, run: Run, elapsed: number, storage = local(), now = new Date()): void {
  const s: SavedSession = { v: VERSION, day: dayKey(now), epoch: useStore.getState().sync.epoch, plan, run, elapsed }
  try {
    storage?.setItem(KEY, JSON.stringify(s))
  } catch {
    // Storage full or blocked: the session just won't resume.
  }
}

export function clearSession(storage = local()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * Carries on from a saved run: a question answered just before leaving counts as
 * done; the one left unanswered comes back first. Anything done elsewhere since
 * (words reviewed or started, corrections fixed) or no longer in the course is dropped.
 */
export function resumeRun(r: Run, s: Omit<Progress, 'sync'>, now = Date.now()): Run {
  const end = endOfDay(new Date(now)).toISOString()
  const keep = (it: MixedItem): boolean => {
    switch (it.kind) {
      case 'intro':
        return !s.introduced[it.wordId] && !!findWord(it.wordId, s.customWords)
      case 'card':
        return !!s.cards[it.id] && s.cards[it.id].due <= end
      case 'grammar':
        return !!LESSON_BY_ID[it.lessonId]?.exercises[it.index]
      case 'conj':
        return !!TENSE_BY_ID[it.item.tense]
      case 'fix':
        return s.mistakes.some((m) => m.id === it.mistakeId && !m.resolved)
      default:
        return true
    }
  }
  const moveOn = !!r.current && r.answered
  const queue = r.current && !moveOn ? [r.current, ...r.items] : r.items
  return pick(
    {
      ...r,
      items: queue.filter(keep),
      learning: r.learning.filter((l) => !!s.cards[l.id]),
      current: null,
      done: r.done + (moveOn ? 1 : 0),
    },
    now,
  )
}

/** Today's unfinished session, ready to carry on — or null when there isn't one. */
export function loadSession(s: Progress, storage = local(), now = new Date()): Resumed | null {
  const saved = read(storage)
  if (!saved || saved.day !== dayKey(now) || saved.epoch !== s.sync.epoch) return null
  const run = resumeRun(saved.run, s, now.getTime())
  return run.current ? { plan: saved.plan, run, elapsed: saved.elapsed } : null
}

/**
 * Wraps up a saved session that can't be carried on (it's from an earlier day, or
 * nothing in it is left): lesson reviews it started are scored with the answers
 * given, then it's dropped. Today's unfinished session is kept.
 */
export function settleSession(storage = local(), now = new Date()): void {
  const saved = read(storage)
  if (!saved) return
  const s = useStore.getState()
  if (saved.epoch === s.sync.epoch) {
    if (saved.day === dayKey(now) && resumeRun(saved.run, s, now.getTime()).current) return
    for (const id of lessonsToRecord(saved.plan, saved.run, true)) {
      const t = saved.run.lessons[id]
      s.recordLesson(id, t.ok / t.n, { goals: lessonGoals(saved.run, id) })
    }
  }
  clearSession(storage)
}
