import { describe, expect, it } from 'vitest'
import { newCard, Rating, review, State } from '../../lib/srs'
import { cardComesBack } from './run'

describe('word cards in a session', () => {
  const now = new Date(2026, 9, 2, 9)
  const dueAfter = (grade: Rating.Again | Rating.Hard | Rating.Good) => new Date(review(newCard(now), grade, now).due).getTime()

  it('don’t come back after a right answer, even while the word is still being learned', () => {
    expect(review(newCard(now), Rating.Good, now).state).toBe(State.Learning)
    expect(cardComesBack(Rating.Good, dueAfter(Rating.Good), now.getTime())).toBe(false)
    expect(cardComesBack(Rating.Hard, dueAfter(Rating.Hard), now.getTime())).toBe(false)
  })

  it('come back a little later after a miss', () => {
    expect(cardComesBack(Rating.Again, dueAfter(Rating.Again), now.getTime())).toBe(true)
  })
})
