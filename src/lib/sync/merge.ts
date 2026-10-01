/**
 * Merging progress from two devices, item by item, so studying on both never
 * loses anything:
 * - flashcards keep their most recent review; lessons, verb stats and sentence
 *   stats keep their most recent result
 * - mistakes, writings, conversations, texts and words from both are kept,
 *   minus anything deleted on either device (tombstones)
 * - daily activity is kept per device and added up
 * - each study setting, the deck list, level, drill setup and each skill's
 *   recent results come from whichever device changed them last; voice, speed
 *   and theme stay per device
 * - a reset or restored backup (a new "epoch") replaces older data everywhere
 *
 * Merging must give the same result on every device (whichever side is
 * "local"), so ties are always broken by content.
 */
import type { Word } from '../../data/types'
import { DEVICE_SETTINGS, MAX_MISTAKES, initialState, type DayActivity, type Settings, type State } from '../store'

/** What is stored in the cloud: everything except derived and per-device data. */
export type SyncDoc = Omit<State, 'activity' | 'settings'> & {
  settings: Partial<Settings>
  schema: 1
}

const TOMBSTONE_DAYS = 180
const later = (a = '', b = '') => (a >= b ? a : b)

/** JSON with object keys sorted, so equal data always gives equal text. */
export function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x,
  )
}

/**
 * The value changed last. On a tie a set value beats a missing one, then the
 * contents decide — every device must pick the same value, or two devices
 * would keep overwriting each other.
 */
export function newest<T>(x: T, y: T, tx = '', ty = ''): T {
  if (tx !== ty) return tx > ty ? x : y
  if (x == null || y == null) return x ?? y
  return stable(x) >= stable(y) ? x : y
}

export function toDoc(s: State): SyncDoc {
  const settings: Partial<Settings> = { ...s.settings }
  for (const k of DEVICE_SETTINGS) delete settings[k]
  return {
    schema: 1,
    settings,
    cards: s.cards,
    introduced: s.introduced,
    activeDecks: s.activeDecks,
    customWords: s.customWords,
    ignoredWords: s.ignoredWords ?? {},
    lessons: s.lessons,
    conj: s.conj,
    conjConfig: s.conjConfig,
    startLevel: s.startLevel,
    writings: s.writings,
    mistakes: s.mistakes,
    skills: s.skills,
    listening: s.listening,
    stories: s.stories ?? {},
    audio: s.audio ?? {},
    speaking: s.speaking,
    conversations: s.conversations,
    texts: s.texts,
    read: s.read,
    sync: s.sync,
  }
}

/** Fills in anything missing from a stored document (older schema, partial data). */
export function normalizeDoc(raw: unknown): SyncDoc {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<SyncDoc>
  const base = toDoc(initialState)
  return {
    ...base,
    ...d,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    sync: { ...initialState.sync, ...(d.sync ?? {}) },
    schema: 1,
  }
}

/** Total daily activity across devices. */
export function sumActivity(devices: Record<string, Record<string, DayActivity>>): Record<string, DayActivity> {
  const out: Record<string, DayActivity> = {}
  for (const days of Object.values(devices))
    for (const [day, a] of Object.entries(days)) {
      const t = (out[day] ??= { items: 0, correct: 0, newWords: 0 })
      t.items += a.items
      t.correct += a.correct
      t.newWords += a.newWords
    }
  return out
}

function byKey<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T, key: string) => T): Record<string, T> {
  const out: Record<string, T> = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v, k) : v
  return out
}

function byId<T extends { id: string }>(a: T[], b: T[], pick: (x: T, y: T) => T): T[] {
  const map = new Map<string, T>()
  for (const x of a) map.set(x.id, x)
  for (const y of b) {
    const x = map.get(y.id)
    map.set(y.id, x ? pick(x, y) : y)
  }
  return [...map.values()]
}

const byIdOrder = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
/** Newest first by a timestamp, then by id, so the order is the same on every device. */
const newestFirst =
  <T extends { id: string }>(at: (x: T) => string) =>
  (a: T, b: T) =>
    at(b).localeCompare(at(a)) || byIdOrder(a, b)

export function mergeDocs(local: SyncDoc, remote: SyncDoc, now = new Date()): SyncDoc {
  // A reset or restored backup replaces everything older.
  if (local.sync.epoch !== remote.sync.epoch)
    return local.sync.epochAt + local.sync.epoch >= remote.sync.epochAt + remote.sync.epoch ? local : remote

  const cutoff = new Date(now.getTime() - TOMBSTONE_DAYS * 86_400_000).toISOString()
  const deleted: Record<string, string> = {}
  for (const [k, at] of [...Object.entries(local.sync.deleted), ...Object.entries(remote.sync.deleted)])
    if (at >= cutoff) deleted[k] = later(deleted[k], at)
  const gone = (key: string, since = '') => !!deleted[key] && deleted[key] > since

  // Settings, decks, level, drill setup and skill histories: the last change wins, key by key.
  const lc = local.sync.changed
  const rc = remote.sync.changed
  const changed: Record<string, string> = { ...lc }
  for (const [k, at] of Object.entries(rc)) changed[k] = later(changed[k], at)
  const pick = <T>(key: string, x: T, y: T): T => newest(x, y, lc[key], rc[key])
  const settings: Partial<Settings> = {}
  for (const k of new Set([...Object.keys(local.settings), ...Object.keys(remote.settings)]) as Set<keyof Settings>)
    (settings as Record<string, unknown>)[k] = pick(`settings.${k}`, local.settings[k], remote.settings[k])
  const skills: Record<string, number[]> = {}
  for (const k of new Set([...Object.keys(local.skills), ...Object.keys(remote.skills)]))
    skills[k] = pick(`skill:${k}`, local.skills[k], remote.skills[k])

  const cards = Object.fromEntries(
    Object.entries(byKey(local.cards, remote.cards, (x, y) => newest(x, y, x.last_review ?? '', y.last_review ?? ''))).filter(
      ([id, c]) => !gone(`card:${id}`, c.last_review ?? c.due),
    ),
  )
  const wordsWithCards = new Set(Object.keys(cards).map((id) => id.slice(0, id.lastIndexOf('|'))))
  const resetWords = new Set(
    Object.keys(deleted)
      .filter((k) => k.startsWith('card:'))
      .map((k) => k.slice(5, k.lastIndexOf('|'))),
  )
  const introduced = Object.fromEntries(
    Object.entries(byKey(local.introduced, remote.introduced, (x, y) => (x <= y ? x : y))).filter(
      ([wordId]) => wordsWithCards.has(wordId) || !resetWords.has(wordId),
    ),
  )

  const customWords = byId<Word>(local.customWords, remote.customWords, (x, y) => newest(x, y, x.added, y.added))
    .filter((w) => !gone(`word:${w.id}`, w.added ?? ''))
    .sort((a, b) => (a.added ?? '').localeCompare(b.added ?? '') || byIdOrder(a, b))

  const devices: SyncDoc['sync']['devices'] = {}
  for (const src of [local.sync.devices, remote.sync.devices])
    for (const [dev, days] of Object.entries(src)) {
      const mine = (devices[dev] ??= {})
      for (const [day, a] of Object.entries(days)) {
        const cur = mine[day]
        mine[day] = cur
          ? { items: Math.max(cur.items, a.items), correct: Math.max(cur.correct, a.correct), newWords: Math.max(cur.newWords, a.newWords) }
          : { ...a }
      }
    }

  return {
    schema: 1,
    settings,
    activeDecks: pick('activeDecks', local.activeDecks, remote.activeDecks),
    conjConfig: pick('conjConfig', local.conjConfig, remote.conjConfig),
    startLevel: pick('startLevel', local.startLevel, remote.startLevel),
    cards,
    introduced,
    customWords,
    ignoredWords: byKey(local.ignoredWords ?? {}, remote.ignoredWords ?? {}, (x, y) => (x >= y ? x : y)),
    lessons: byKey(local.lessons, remote.lessons, (x, y) => newest(x, y, x.lastAt, y.lastAt)),
    conj: byKey(local.conj, remote.conj, (x, y) => newest(x, y, x.lastAt, y.lastAt)),
    writings: byId(local.writings, remote.writings, (x, y) => newest(x, y))
      .filter((w) => !gone(`writing:${w.id}`))
      .sort(newestFirst((w) => w.createdAt))
      .slice(0, 200),
    mistakes: byId(local.mistakes, remote.mistakes, (x, y) => {
      const m = newest(x, y)
      return x.resolved || y.resolved ? { ...m, resolved: true } : m
    })
      .sort(newestFirst((m) => m.at))
      .slice(0, MAX_MISTAKES),
    skills,
    listening: byKey(local.listening, remote.listening, (x, y) => newest(x, y, x.at, y.at)),
    stories: byKey(local.stories ?? {}, remote.stories ?? {}, (x, y) => newest(x, y, x.at, y.at)),
    audio: byKey(local.audio ?? {}, remote.audio ?? {}, (x, y) => {
      const n = newest(x, y, x.at, y.at)
      const done = [x.done, y.done].filter(Boolean).sort()[0]
      return done ? { ...n, done } : n
    }),
    speaking: byKey(local.speaking, remote.speaking, (x, y) => newest(x, y, x.at, y.at)),
    conversations: byId(local.conversations, remote.conversations, (x, y) => newest(x, y, x.updatedAt, y.updatedAt))
      .filter((c) => !gone(`talk:${c.id}`))
      .sort(newestFirst((c) => c.updatedAt))
      .slice(0, 60),
    texts: byId(local.texts, remote.texts, (x, y) => {
      const newer = newest(x, y, x.openedAt ?? x.createdAt, y.openedAt ?? y.createdAt)
      const other = newer === x ? y : x
      const out = { ...newer }
      if (out.translation === undefined && other.translation !== undefined) out.translation = other.translation
      if (out.finishedAt === undefined && other.finishedAt !== undefined) out.finishedAt = other.finishedAt
      return out
    })
      .filter((t) => !gone(`text:${t.id}`))
      .sort(newestFirst((t) => t.createdAt))
      .slice(0, 150),
    read: byKey(local.read, remote.read, (x, y) => later(x, y)),
    sync: {
      epoch: local.sync.epoch,
      epochAt: local.sync.epochAt,
      changed,
      deleted,
      devices,
    },
  }
}

/** The store state for a merged document, keeping this device's own settings. */
export function applyDoc(current: State, doc: SyncDoc): State {
  const own: Partial<Settings> = {}
  for (const k of DEVICE_SETTINGS) (own as Record<string, unknown>)[k] = current.settings[k]
  const { schema: _schema, ...rest } = doc
  void _schema
  return {
    ...current,
    ...rest,
    settings: { ...current.settings, ...doc.settings, ...own } as Settings,
    activity: sumActivity(doc.sync.devices),
  }
}

/** Stable text for comparing documents (key order doesn't matter). */
export function docKey(doc: SyncDoc): string {
  return stable(doc)
}
