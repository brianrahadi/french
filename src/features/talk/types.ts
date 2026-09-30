import type { Level } from '../../data/types'
import type { WritingError } from '../../lib/ai/writing'

export interface ChatTurn {
  id: string
  role: 'ai' | 'me'
  text: string
  /** AI turns: English translation. */
  translation?: string
  /** Learner turns: corrections of this message (undefined while it's being checked). */
  corrections?: WritingError[]
  /** AI turns: things the learner could say next. */
  suggestions?: string[]
  at: string
}

export interface TalkImprovement {
  point: string
  /** What the learner said… */
  example: string
  /** …and a better way to say it. */
  better: string
  lesson: string | null
}

export interface TalkFeedback {
  summary: string
  score: number
  level: string
  strengths: string[]
  improvements: TalkImprovement[]
  vocabulary: { fr: string; en: string }[]
  tip: string
}

export interface Conversation {
  id: string
  /** Scenario id, 'free' or 'custom'. */
  scenarioId: string
  title: string
  level: Level
  /** Topic or situation for free / custom conversations. */
  topic?: string
  turns: ChatTurn[]
  goalsMet: string[]
  ended?: boolean
  startedAt: string
  updatedAt: string
  feedback?: TalkFeedback
  model: string
}
