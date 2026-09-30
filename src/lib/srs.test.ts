import { describe, expect, it } from 'vitest'
import { cardStatus, newCard, previewIntervals, Rating, review, State } from './srs'

describe('srs', () => {
  it('moves a new card through learning into review', () => {
    const t0 = new Date('2026-01-01T10:00:00Z')
    let c = newCard(t0)
    expect(c.state).toBe(State.New)
    c = review(c, Rating.Good, t0)
    expect(c.state).toBe(State.Learning)
    expect(new Date(c.due).getTime() - t0.getTime()).toBeLessThan(15 * 60_000)
    const t1 = new Date(c.due)
    c = review(c, Rating.Good, t1)
    expect(c.state).toBe(State.Review)
    expect(cardStatus(c)).toBe('young')
  })
  it('schedules Easy further out than Good', () => {
    const t0 = new Date('2026-01-01T10:00:00Z')
    const c = newCard(t0)
    const good = new Date(review(c, Rating.Good, t0).due).getTime()
    const easy = new Date(review(c, Rating.Easy, t0).due).getTime()
    expect(easy).toBeGreaterThan(good)
    const labels = previewIntervals(c, t0)
    expect(labels[Rating.Again]).toMatch(/m$/)
    expect(labels[Rating.Easy]).toMatch(/d$/)
  })
  it('survives JSON round-trips', () => {
    const t0 = new Date('2026-01-01T10:00:00Z')
    const c = JSON.parse(JSON.stringify(review(newCard(t0), Rating.Good, t0)))
    expect(() => review(c, Rating.Good, new Date(c.due))).not.toThrow()
  })
})
