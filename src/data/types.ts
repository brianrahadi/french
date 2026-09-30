export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']

export const LEVEL_INFO: Record<Level, { name: string; description: string }> = {
  A1: { name: 'Beginner', description: 'The building blocks: être, avoir, articles, the present tense.' },
  A2: { name: 'Elementary', description: 'Talk about the past and near future, use pronouns.' },
  B1: { name: 'Intermediate', description: 'Tell stories, express conditions, wishes and opinions.' },
  B2: { name: 'Upper-intermediate', description: 'Nuance, complex sentences and formal registers.' },
}

// ───────────── Vocabulary ─────────────

export type Pos = 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'conj' | 'pron' | 'expr' | 'num' | 'det' | 'interj'

export interface Word {
  id: string
  fr: string // dictionary form: 'maison', 'parler', 'grand'
  en: string // 'house, home'
  pos: Pos
  g?: 'm' | 'f' // grammatical gender for nouns
  both?: boolean // noun used with either gender (le/la collègue)
  pl?: boolean // plural-only noun (les gens)
  fem?: string // feminine form for adjectives
  ex?: string // example sentence (French)
  exEn?: string // translation of the example
  note?: string
  level: Level
  deck: string
  custom?: boolean
}

export interface Deck {
  id: string
  level: Level
  title: string
  titleFr: string
  words: Word[]
}

// ───────────── Grammar ─────────────

export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'examples'; items: { fr: string; en: string }[] }
  | { type: 'tip'; text: string }
  | { type: 'warn'; text: string }

export interface LessonSection {
  heading: string
  blocks: Block[]
}

export type Exercise =
  | {
      type: 'mcq'
      prompt: string
      sentence?: string
      options: string[]
      answer: number
      explain: string
    }
  | {
      type: 'cloze'
      /** Sentence containing exactly one "___" blank. */
      sentence: string
      answers: string[]
      hint?: string
      en?: string
      explain: string
    }
  | {
      type: 'order'
      en: string
      /** Words in a correct order. */
      words: string[]
      /** Other valid complete sentences (space-separated) */
      alt?: string[]
      /** Distractor tiles */
      extra?: string[]
      punct?: string
      explain?: string
    }
  | {
      type: 'translate'
      en: string
      answers: string[]
      explain?: string
    }
  | {
      type: 'transform'
      instruction: string
      source: string
      answers: string[]
      explain?: string
    }

export interface Lesson {
  id: string
  level: Level
  title: string
  titleFr: string
  summary: string
  minutes: number
  sections: LessonSection[]
  exercises: Exercise[]
}
