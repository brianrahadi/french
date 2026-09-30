import { describe, expect, it } from 'vitest'
import { pack, unpack } from './pack'

describe('pack', () => {
  it('round-trips a document and makes it much smaller', async () => {
    const cards = Object.fromEntries(
      Array.from({ length: 2000 }, (_, i) => [
        `word-${i}-n|r`,
        { due: '2026-09-29T07:00:00.000Z', stability: 3.17 + i / 1000, difficulty: 5.28, elapsed_days: 3, scheduled_days: 4, reps: 2, lapses: 0, state: 2, last_review: '2026-09-25T07:00:00.000Z' },
      ]),
    )
    const doc = { schema: 1, cards, note: 'déjà vu — ça marche' }
    const packed = await pack(doc)
    expect(packed).toHaveProperty('gz')
    expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(doc).length / 5)
    expect(await unpack(packed)).toEqual(doc)
  })
  it('reads uncompressed documents as they are', async () => {
    const doc = { schema: 1, cards: {} }
    expect(await unpack(doc)).toBe(doc)
    expect(await unpack(null)).toBe(null)
  })
})
