import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { formatInterval } from './date'

export { Rating, State }
export type { Grade }

/** A ts-fsrs Card with dates serialized so it can live in localStorage. */
export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string }

export type CardDir = 'r' | 'p' // recognition (FR → EN), production (EN → FR)

export const cardId = (wordId: string, dir: CardDir) => `${wordId}|${dir}`
export const parseCardId = (id: string) => {
  const i = id.lastIndexOf('|')
  return { wordId: id.slice(0, i), dir: id.slice(i + 1) as CardDir }
}

const schedulers = new Map<number, ReturnType<typeof fsrs>>()
function scheduler(retention: number) {
  let s = schedulers.get(retention)
  if (!s) {
    s = fsrs(
      generatorParameters({
        request_retention: retention,
        enable_fuzz: true,
        enable_short_term: true,
        learning_steps: ['1m', '10m'],
        relearning_steps: ['10m'],
        maximum_interval: 36500,
      }),
    )
    schedulers.set(retention, s)
  }
  return s
}

export function toStored(c: Card): StoredCard {
  return { ...c, due: c.due.toISOString(), last_review: c.last_review ? c.last_review.toISOString() : undefined }
}

export function fromStored(c: StoredCard): Card {
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined }
}

export function newCard(now: Date = new Date()): StoredCard {
  return toStored(createEmptyCard(now))
}

export function review(card: StoredCard, grade: Grade, now: Date = new Date(), retention = 0.9): StoredCard {
  return toStored(scheduler(retention).next(fromStored(card), now, grade).card)
}

/** Interval labels shown on the rating buttons, e.g. { 1: '1m', 2: '6m', 3: '10m', 4: '4d' } */
export function previewIntervals(card: StoredCard, now: Date = new Date(), retention = 0.9): Record<Grade, string> {
  const p = scheduler(retention).repeat(fromStored(card), now)
  const out = {} as Record<Grade, string>
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = formatInterval(p[g].card.due.getTime() - now.getTime())
  }
  return out
}

export type WordStatus = 'new' | 'learning' | 'young' | 'mature'

/** mature = every card has an interval of 21+ days (Anki's definition). */
export function cardStatus(c: StoredCard | undefined): WordStatus {
  if (!c) return 'new'
  if (c.state === State.New || c.state === State.Learning || c.state === State.Relearning) return 'learning'
  return c.scheduled_days >= 21 ? 'mature' : 'young'
}

export function combineStatus(statuses: WordStatus[]): WordStatus {
  if (!statuses.length || statuses.every((s) => s === 'new')) return 'new'
  if (statuses.some((s) => s === 'learning' || s === 'new')) return 'learning'
  if (statuses.every((s) => s === 'mature')) return 'mature'
  return 'young'
}
