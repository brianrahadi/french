import type { Level } from '../../data/types'

/** A text the learner pasted or generated. Built-in texts live in data/texts.ts. */
export interface ReaderText {
  id: string
  title: string
  level?: Level
  /** Paragraphs separated by blank lines. */
  content: string
  source: 'paste' | 'ai'
  topic?: string
  createdAt: string
  openedAt?: string
  finishedAt?: string
  /** English translation per paragraph, once fetched. */
  translation?: string[]
}

/** What a word means in its sentence. */
export interface Gloss {
  /** Dictionary form; nouns with their article ("la gare"). */
  lemma: string
  pos: string
  gender: 'm' | 'f' | ''
  meaning: string
  note: string
  sentenceTranslation: string
}
