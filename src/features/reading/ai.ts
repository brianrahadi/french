/** AI help for reading: writing a graded text, translating a text. */
import type { Level } from '../../data/types'
import { chatJson, type AiConfig } from '../../lib/ai'
import { arr, obj, str } from '../../lib/ai/json'

export const LEVEL_GUIDE: Record<Level, string> = {
  A1: 'CEFR A1: very short, simple sentences in the present tense (être, avoir, aller, -er verbs, simple negation), the most common everyday words, no idioms.',
  A2: 'CEFR A2: short sentences; present, passé composé, imparfait and futur proche; everyday vocabulary; simple connectors (et, mais, parce que, puis).',
  B1: 'CEFR B1: natural everyday French with all common tenses, some subjunctive and conditional, relative pronouns, a few common idioms.',
  B2: 'CEFR B2: natural, idiomatic French with nuance: varied tenses, subjunctive, passive, gérondif, connectors of concession and cause, richer vocabulary.',
}

export interface GeneratedText {
  title: string
  paragraphs: string[]
}

export async function generateText(
  opts: { level: Level; topic: string; words: number; useWords: string[]; config?: AiConfig | null },
  signal?: AbortSignal,
): Promise<GeneratedText> {
  const system = `You write original graded reading texts in French for English-speaking adults learning French.

Level: ${LEVEL_GUIDE[opts.level]}
Length: about ${opts.words} words in 3–5 paragraphs.
Style: natural contemporary French from France, perfectly correct spelling, accents and agreement. Make it engaging — a small story, a personal account or an informative piece with concrete details. Use straight apostrophes (') and a space before ? ! : ;. Write numbers as words. No markdown, no glossary, no English.${
    opts.useWords.length
      ? `\nWork these words or expressions in naturally (inflect them as needed): ${opts.useWords.join(', ')}.`
      : ''
  }`
  return chatJson(
    {
      config: opts.config,
      system,
      messages: [{ role: 'user', content: `Topic: ${opts.topic.trim() || 'a surprising everyday situation'}` }],
      json: {
        name: 'reading_text',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short French title.' },
            paragraphs: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'paragraphs'],
          additionalProperties: false,
        },
      },
      maxTokens: 10000,
      signal,
    },
    (raw) => {
      const r = obj(raw)
      const paragraphs = arr(r.paragraphs, (p) => (typeof p === 'string' && p.trim() ? p.trim() : null))
      if (!paragraphs.length) throw new Error('The text came back empty. Try again.')
      return { title: str(r.title).trim() || 'Texte', paragraphs }
    },
  )
}

export async function translateParagraphs(paragraphs: string[], config?: AiConfig | null, signal?: AbortSignal): Promise<string[]> {
  return chatJson(
    {
      config,
      system:
        'Translate each French paragraph into natural, faithful English for a learner who wants to check their understanding. Keep one English paragraph per French paragraph, in the same order.',
      messages: [{ role: 'user', content: JSON.stringify({ paragraphs }) }],
      json: {
        name: 'translation',
        schema: {
          type: 'object',
          properties: { paragraphs: { type: 'array', items: { type: 'string' } } },
          required: ['paragraphs'],
          additionalProperties: false,
        },
      },
      maxTokens: 10000,
      signal,
    },
    (raw) => {
      const out = arr(obj(raw).paragraphs, (p) => (typeof p === 'string' ? p : null))
      if (!out.length) throw new Error('The translation came back empty.')
      return out
    },
  )
}
