export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']

/** Position of a level in the course (A1 = 0 … B2 = 3), for sorting A1 → B2. */
export const levelRank = (l: Level): number => LEVELS.indexOf(l)

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
  /** Where a learner-added word came from, e.g. 'text:<id>', 'talk:<id>', 'writing'. */
  from?: string
  /** When a learner-added word was added (ISO), for syncing deletions correctly. */
  added?: string
}

export interface Deck {
  id: string
  level: Level
  title: string
  titleFr: string
  words: Word[]
  /** 'frequency': one of the "5000 most frequent words" decks rather than a themed deck. */
  group?: 'frequency'
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

/** A can-do point a lesson teaches; every exercise tests one. */
export interface LessonGoal {
  id: string
  /** What the learner can do, e.g. “Choose c’est or il / elle est”. */
  text: string
  /** Index of the lesson section that teaches it. */
  section?: number
}

export type Exercise = ExerciseBody & {
  /** Id of the lesson goal it tests (see Lesson.goals). */
  goal?: string
}

type ExerciseBody =
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
  /** Can-do goals, in teaching order (empty for lessons without a ## Goals section). */
  goals: LessonGoal[]
  exercises: Exercise[]
}

// ───────────── Reading ─────────────

/** A short story to listen to (1–2 minutes), with comprehension questions. */
export interface StoryDef {
  id: string
  level: Level
  title: string // French title
  titleEn: string
  topic: string
  /** French paragraph + English translation; read aloud one sentence at a time. */
  paragraphs: { fr: string; en: string }[]
  /** Multiple-choice comprehension questions, answered after listening. */
  questions: Extract<Exercise, { type: 'mcq' }>[]
}

/**
 * A Pimsleur-style audio lesson: hands-free, built from a short dialogue and
 * the phrases in it. The spoken script (prompts, pauses, spaced recall) is
 * generated from this (see features/audio/script.ts).
 */
export interface AudioLessonDef {
  id: string
  level: Level
  title: string // French title
  titleEn: string
  /** English set-up read by the narrator before the dialogue. */
  scene: string
  /** The speaker whose lines the learner takes in the role play. */
  role: string
  dialogue: { who: string; fr: string; en: string }[]
  /** Taught one by one; `chunks` (split on " · ") are built up from the end. */
  phrases: { fr: string; en: string; chunks: string[]; note?: string }[]
  /** Extra recall prompts that recombine the phrases: an English cue and the French answer. */
  practice: { fr: string; en: string }[]
}

export interface ReaderTextDef {
  id: string // kebab-case, prefixed with the level, e.g. 'a1-ma-famille'
  level: Level
  title: string // French title
  titleEn: string // English title
  topic: string // short English topic label, e.g. 'Family', 'Travel', 'Work'
  paragraphs: { fr: string; en: string }[] // French paragraph + natural English translation
}

// ───────────── Conversation ─────────────

export const SCENARIO_ICONS = [
  'coffee', 'croissant', 'map', 'hotel', 'stethoscope', 'shopping', 'phone', 'briefcase', 'home',
  'train', 'party', 'package', 'utensils', 'handshake', 'newspaper', 'plane', 'user', 'ticket',
] as const
export type ScenarioIcon = (typeof SCENARIO_ICONS)[number]

export interface Scenario {
  id: string // short kebab-case, unique, e.g. 'cafe'
  level: Level
  title: string // English title, e.g. 'Ordering at a café'
  titleFr: string // e.g. 'Au café'
  icon: ScenarioIcon
  /** Shown to the learner: where they are, who they talk to, what's going on. */
  setting: string
  /** Instructions for the AI: who it plays, personality, facts it knows, a small complication. */
  aiRole: string
  aiName: string // first name of the character the AI plays
  /** The AI's first line, in French, ending with a question or prompt. */
  opening: string
  openingEn: string
  /** Concrete things the learner should achieve; ids are stable (progress is saved under them). */
  goals: { id: string; text: string }[]
  /** Useful phrases for the learner (French + English). */
  phrases: { fr: string; en: string }[]
  /** Ids of grammar lessons the scenario practices. */
  lessons: string[]
}

// ───────────── Writing ─────────────

export interface WritingPrompt {
  id: string
  level: Level
  titleFr: string
  title: string
  /** What to write, in English. */
  task: string
  /** The grammar this prompt practices. */
  focus: string
  lessons: string[]
  words: [number, number]
  /** Useful expressions to get started. */
  phrases: string[]
}

// ───────────── Pronunciation ─────────────

export interface SoundSet {
  id: string // kebab-case, e.g. 'u-ou'
  title: string // English, e.g. 'u vs ou'
  sound: string // the sounds in French notation, e.g. 'u · ou'
  /** How to make the sound(s): lips/tongue position, English comparison. */
  tip: string
  /** Short sentences dense in the sound, with English translations. */
  sentences: { fr: string; en: string }[]
}
