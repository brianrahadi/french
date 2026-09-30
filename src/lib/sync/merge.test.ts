import { describe, expect, it } from 'vitest'
import { applyDoc, docKey, mergeDocs, normalizeDoc, sumActivity, toDoc, type SyncDoc } from './merge'
import { initialState, type State } from '../store'
import { newCard } from '../srs'

const T = (d: number) => new Date(Date.UTC(2026, 8, d, 12)).toISOString()

function state(over: Partial<State> = {}): State {
  return { ...initialState, ...over, sync: { ...initialState.sync, ...(over.sync ?? {}) } }
}
const doc = (over: Partial<State> = {}): SyncDoc => toDoc(state(over))

describe('mergeDocs', () => {
  it('keeps the most recent review of each card and cards from both sides', () => {
    const a = { ...newCard(new Date(T(1))), reps: 2, last_review: T(5) }
    const b = { ...newCard(new Date(T(1))), reps: 3, last_review: T(8) }
    const m = mergeDocs(doc({ cards: { 'x|r': a, 'y|r': a } }), doc({ cards: { 'x|r': b, 'z|p': b } }))
    expect(m.cards['x|r'].last_review).toBe(T(8))
    expect(Object.keys(m.cards).sort()).toEqual(['x|r', 'y|r', 'z|p'])
  })

  it('adds up activity from different devices and never double counts one device', () => {
    const day = '2026-09-20'
    const local = doc({ sync: { ...initialState.sync, devices: { laptop: { [day]: { items: 10, correct: 8, newWords: 2 } } } } })
    const remote = doc({
      sync: {
        ...initialState.sync,
        devices: { laptop: { [day]: { items: 7, correct: 5, newWords: 2 } }, phone: { [day]: { items: 5, correct: 5, newWords: 0 } } },
      },
    })
    const m = mergeDocs(local, remote)
    expect(sumActivity(m.sync.devices)[day]).toEqual({ items: 15, correct: 13, newWords: 2 })
  })

  it('respects deletions on either device', () => {
    const w = { id: 'w1', title: 'x', createdAt: T(1) }
    const local = doc({ writings: [w as never], sync: { ...initialState.sync } })
    const remote = doc({ writings: [], sync: { ...initialState.sync, deleted: { 'writing:w1': T(3) } } })
    expect(mergeDocs(local, remote, new Date(T(4))).writings).toHaveLength(0)
  })

  it('keeps a word re-added after it was deleted', () => {
    const word = { id: 'custom-a', fr: 'a', en: 'a', pos: 'expr', level: 'A1', deck: 'custom', custom: true } as const
    const local = doc({ customWords: [{ ...word, added: T(5) }] })
    const remote = doc({ customWords: [], sync: { ...initialState.sync, deleted: { 'word:custom-a': T(3) } } })
    expect(mergeDocs(local, remote, new Date(T(6))).customWords).toHaveLength(1)
    const older = doc({ customWords: [{ ...word, added: T(1) }] })
    expect(mergeDocs(older, remote, new Date(T(6))).customWords).toHaveLength(0)
  })

  it('drops a reset card unless it was studied again afterwards', () => {
    const reviewed = { ...newCard(new Date(T(1))), last_review: T(2), due: T(9) }
    const fresh = newCard(new Date(T(6)))
    const deleted = { ...initialState.sync, deleted: { 'card:x|r': T(4) } }
    expect(mergeDocs(doc({ cards: { 'x|r': reviewed } }), doc({ sync: deleted }), new Date(T(7))).cards['x|r']).toBeUndefined()
    expect(mergeDocs(doc({ cards: { 'x|r': fresh } }), doc({ sync: deleted }), new Date(T(7))).cards['x|r']).toBeDefined()
  })

  it('takes each study setting from the device that changed it last', () => {
    const local = doc({
      settings: { ...initialState.settings, dailyGoal: 60, newPerDay: 15 },
      sync: { ...initialState.sync, changed: { 'settings.dailyGoal': T(2), 'settings.newPerDay': T(6) } },
    })
    const remote = doc({
      settings: { ...initialState.settings, dailyGoal: 20 },
      activeDecks: ['b1-work'],
      sync: { ...initialState.sync, changed: { 'settings.dailyGoal': T(5), activeDecks: T(5) } },
    })
    const m = mergeDocs(local, remote)
    expect(m.settings.dailyGoal).toBe(20)
    expect(m.settings.newPerDay).toBe(15)
    expect(m.activeDecks).toEqual(['b1-work'])
    expect(m.sync.changed).toEqual({ 'settings.dailyGoal': T(5), 'settings.newPerDay': T(6), activeDecks: T(5) })
  })

  it('never lets a new device’s untouched defaults replace real choices', () => {
    const fresh = doc()
    const used = doc({ startLevel: 'B1', settings: { ...initialState.settings, dailyGoal: 90 }, sync: { ...initialState.sync, changed: { 'settings.dailyGoal': T(1) } } })
    for (const m of [mergeDocs(fresh, used), mergeDocs(used, fresh)]) {
      expect(m.settings.dailyGoal).toBe(90)
      expect(m.startLevel).toBe('B1')
    }
  })

  it('gives the same result on every device, even for ties', () => {
    const w = (id: string, added?: string) => ({ id, fr: id, en: id, pos: 'expr', level: 'A1', deck: 'custom', custom: true, added }) as const
    const mk = (id: string, at: string) => ({ id, at, source: 'grammar', skill: 'lesson:a', given: 'x', expected: 'y' }) as const
    const a = doc({
      cards: { 'x|r': newCard(new Date(T(1))) },
      skills: { 'lesson:a': [1, 1, 0, 1, 1, 1, 1, 1, 1, 1] },
      customWords: [w('custom-b'), w('custom-a', T(3))],
      mistakes: [mk('m2', T(2)), mk('m1', T(2))],
      settings: { ...initialState.settings, dailyGoal: 30 },
      lessons: { l: { attempts: 1, best: 0.5, last: 0.5, lastAt: T(2), step: 0 } },
    })
    const b = doc({
      cards: { 'x|r': newCard(new Date(T(2))) },
      skills: { 'lesson:a': [0, 0, 0, 1, 1, 1, 1, 1, 1, 1] },
      customWords: [w('custom-c', T(1)), w('custom-b')],
      mistakes: [mk('m3', T(2))],
      settings: { ...initialState.settings, dailyGoal: 50 },
      lessons: { l: { attempts: 2, best: 0.9, last: 0.9, lastAt: T(2), step: 1 } },
    })
    const ab = mergeDocs(a, b)
    const ba = mergeDocs(b, a)
    expect(docKey(ab)).toBe(docKey(ba))
    // Merging again changes nothing, so two devices stop writing after one round.
    expect(docKey(mergeDocs(a, ab))).toBe(docKey(ab))
    expect(docKey(mergeDocs(ab, b))).toBe(docKey(ab))
    expect(ab.customWords.map((x) => x.id)).toEqual(['custom-b', 'custom-c', 'custom-a'])
    expect(ab.mistakes.map((x) => x.id)).toEqual(['m1', 'm2', 'm3'])
  })

  it('lets a reset or restored backup replace older data', () => {
    const reset = doc({ sync: { ...initialState.sync, epoch: 'e2', epochAt: T(5) } })
    const old = doc({ lessons: { articles: { attempts: 1, best: 1, last: 1, lastAt: T(1), step: 0 } } })
    expect(mergeDocs(old, reset)).toBe(reset)
    expect(mergeDocs(reset, old)).toBe(reset)
  })

  it('unions mistakes, keeping a resolution from either side', () => {
    const m1 = { id: 'm1', at: T(1), source: 'grammar', skill: 'lesson:a', given: 'x', expected: 'y' } as const
    const merged = mergeDocs(doc({ mistakes: [{ ...m1, resolved: true }] }), doc({ mistakes: [m1, { ...m1, id: 'm2', at: T(2) }] }))
    expect(merged.mistakes.map((m) => m.id)).toEqual(['m2', 'm1'])
    expect(merged.mistakes.find((m) => m.id === 'm1')?.resolved).toBe(true)
  })

  it('is stable: merging a document with itself changes nothing', () => {
    const d = doc({ cards: { 'x|r': newCard(new Date(T(1))) }, read: { t1: '2026-09-01' } })
    expect(docKey(mergeDocs(d, d))).toBe(docKey(d))
  })
})

describe('documents', () => {
  it('never syncs device settings and keeps this device’s own when applying', () => {
    const d = toDoc(state({ settings: { ...initialState.settings, voiceURI: 'Thomas', rate: 1.2, theme: 'dark' } }))
    expect(d.settings).not.toHaveProperty('voiceURI')
    expect(d.settings).not.toHaveProperty('theme')
    const here = state({ settings: { ...initialState.settings, voiceURI: 'Amélie', theme: 'light' } })
    const applied = applyDoc(here, { ...d, settings: { ...d.settings, dailyGoal: 77 } })
    expect(applied.settings).toMatchObject({ voiceURI: 'Amélie', theme: 'light', dailyGoal: 77 })
  })
  it('fills in missing fields from older or partial documents', () => {
    const d = normalizeDoc({ cards: { 'x|r': newCard() } })
    expect(d.mistakes).toEqual([])
    expect(d.sync.devices).toEqual({})
  })
})
