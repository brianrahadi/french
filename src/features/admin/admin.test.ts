import { describe, expect, it } from 'vitest'
import { ago, dailyActive, isAdminEmail, summarize, toLearner, type AdminRow } from './admin'
import { pack } from '../../lib/sync/pack'

const now = new Date(2026, 9, 9, 12)

const doc = {
  startLevel: 'A2',
  cards: { a: {}, b: {}, c: {} },
  lessons: { x: { best: 0.9 }, y: { best: 0.5 } },
  read: { t1: '2026-10-01' },
  writings: [{ id: 'w' }],
  talkLog: { c1: {}, c2: {} },
  sync: {
    devices: {
      phone: { '2026-10-09': { items: 10, correct: 8, newWords: 2 }, '2026-10-08': { items: 5, correct: 5, newWords: 0 } },
      laptop: { '2026-10-08': { items: 5, correct: 3, newWords: 0 }, '2026-09-01': { items: 20, correct: 10, newWords: 5 } },
    },
  },
}

describe('admin', () => {
  it('only lets the listed emails see the link', () => {
    expect(isAdminEmail('Brian.Rahadi@gmail.com')).toBe(true)
    expect(isAdminEmail('someone@gmail.com')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })

  it('summarises synced progress across devices', () => {
    const p = summarize(doc, now)
    expect(p.words).toBe(3)
    expect(p.lessonsPassed).toBe(1)
    expect(p.textsRead).toBe(1)
    expect(p.writings).toBe(1)
    expect(p.conversations).toBe(2)
    expect(p.answers).toBe(40)
    expect(p.accuracy).toBeCloseTo(26 / 40)
    expect(p.answers7d).toBe(20)
    expect(p.activeDays).toBe(3)
    expect(p.streak).toBe(2)
    expect(p.lastActiveDay).toBe('2026-10-09')
    expect(p.devices).toBe(2)
    expect(p.startLevel).toBe('A2')
    expect(p.daily['2026-10-08']).toBe(10)
  })

  it('handles an empty document', () => {
    const p = summarize({}, now)
    expect(p.answers).toBe(0)
    expect(p.accuracy).toBeNull()
    expect(p.lastActiveDay).toBeNull()
    expect(p.level).toBe('A1')
  })

  it('reads compressed progress, and accounts that never synced', async () => {
    const row: AdminRow = {
      id: '1', email: 'a@b.c', name: 'Ana', avatar: null, provider: 'google', created_at: '2026-09-01T00:00:00Z',
      last_sign_in_at: null, progress_at: '2026-10-09T10:00:00Z', version: 3, device: 'phone', data: await pack(doc),
    }
    expect((await toLearner(row, now)).progress?.answers).toBe(40)
    const none = await toLearner({ ...row, data: null }, now)
    expect(none.progress).toBeNull()
    expect(none.name).toBe('Ana')
  })

  it('counts active learners per day', async () => {
    const l = await toLearner({ id: '1', email: 'a@b.c', name: null, avatar: null, provider: null, created_at: '', last_sign_in_at: null, progress_at: null, version: 1, device: null, data: doc }, now)
    const days = dailyActive([l, l], 3, now)
    expect(days.map((d) => d.learners)).toEqual([0, 2, 2])
    expect(days[2].answers).toBe(20)
  })

  it('says how long ago', () => {
    expect(ago('2026-10-09', now)).toBe('Today')
    expect(ago('2026-10-08', now)).toBe('Yesterday')
    expect(ago('2026-10-06', now)).toBe('3 days ago')
    expect(ago(null, now)).toBe('—')
  })
})
