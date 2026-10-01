/** Writing feedback: schema, prompt and parsing for correcting a learner's text. */
import type { Level } from '../../data/types'
import { chatJson, type ChatRequest } from './client'
import { arr, clamp, obj, str } from './json'

export const ERROR_CATEGORIES = [
  'grammar',
  'agreement',
  'conjugation',
  'spelling',
  'accent',
  'vocabulary',
  'word order',
  'punctuation',
  'other',
] as const

export interface WritingError {
  original: string
  correction: string
  category: string
  explanation: string
  /** Id of a grammar lesson in the app, or null. */
  lesson: string | null
}

export interface WritingFeedback {
  summary: string
  score: number
  level: string
  errors: WritingError[]
  corrected: string
  improved: string
  strengths: string[]
  vocabulary: { fr: string; en: string }[]
}

export interface WritingRequest {
  text: string
  task: string
  focus?: string
  level: Level
  lessons: { id: string; title: string }[]
  signal?: AbortSignal
  config?: ChatRequest['config']
}

/** Schema for one correction; shared with conversation practice. */
export function errorSchema(lessonIds: string[]) {
  return {
    type: 'object',
    properties: {
      original: { type: 'string', description: 'Exact substring copied from the learner text.' },
      correction: { type: 'string', description: 'Replacement for that substring.' },
      category: { type: 'string', enum: [...ERROR_CATEGORIES] },
      explanation: { type: 'string', description: 'One or two sentences in English naming the rule.' },
      lesson: { type: 'string', enum: [...lessonIds, 'none'] },
    },
    required: ['original', 'correction', 'category', 'explanation', 'lesson'],
    additionalProperties: false,
  }
}

export const vocabSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: { fr: { type: 'string' }, en: { type: 'string' } },
    required: ['fr', 'en'],
    additionalProperties: false,
  },
}

export function feedbackSchema(lessonIds: string[]) {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Two or three sentences of overall feedback in English, encouraging and specific.' },
      score: { type: 'integer', description: 'Accuracy from 0 to 100 (100 = no errors).' },
      level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
      errors: { type: 'array', items: errorSchema(lessonIds) },
      corrected: { type: 'string', description: 'The full text with only the errors fixed.' },
      improved: { type: 'string', description: 'A more natural, native-sounding version.' },
      strengths: { type: 'array', items: { type: 'string' } },
      vocabulary: vocabSchema,
    },
    required: ['summary', 'score', 'level', 'errors', 'corrected', 'improved', 'strengths', 'vocabulary'],
    additionalProperties: false,
  }
}

export function systemPrompt(req: Pick<WritingRequest, 'task' | 'focus' | 'level' | 'lessons'>): string {
  return `You are a warm, precise French teacher correcting a short text written by an English-speaking learner (around CEFR ${req.level}).

Task the learner was given: ${req.task}${req.focus ? `\nGrammar the task practices: ${req.focus}` : ''}

How to correct:
- List every real error: grammar, agreement, conjugation, spelling, missing or wrong accents, wrong word or anglicism, word order, missing words, and French punctuation only when it matters. Do not list correct sentences just because you would phrase them differently — put stylistic improvements in "improved" only.
- "original" must be copied exactly from the learner's text (same accents, apostrophes and case), as short as possible while still unambiguous — usually one to five words. "correction" replaces exactly that span. Order errors as they appear in the text. Never create overlapping spans.
- Explanations: English, one or two sentences, name the rule concretely (e.g. "aller takes être in the passé composé, and the participle agrees with a feminine subject").
- "lesson": the id of the app lesson that teaches the rule, from the list below, or "none".
- "corrected": the learner's text with only those errors fixed — keep their wording and structure.
- "improved": how a native speaker might write the same content, one step above the learner's level. Keep it roughly the same length.
- "strengths": one to three specific things the learner did well.
- "vocabulary": up to five words or expressions from your corrections or the improved version worth adding to flashcards, with English meanings. Give nouns with their article (la plage, l'hôtel (m)).
- "score": 100 minus a penalty proportional to the number and seriousness of errors relative to the length.
- "level": your CEFR estimate of this piece of writing.
- If the text is not French, is empty, or is not a genuine attempt, return no errors, copy the text into "corrected" and "improved", and say so kindly in "summary".

Lessons in the app (id — title):
${lessonList(req.lessons)}`
}

export function lessonList(lessons: { id: string; title: string }[]): string {
  return lessons.map((l) => `${l.id} — ${l.title}`).join('\n')
}

export function coerceError(v: unknown, lessonIds?: Set<string>): WritingError | null {
  const e = obj(v)
  const original = str(e.original)
  const correction = str(e.correction)
  if (!original.trim() && !correction.trim()) return null
  const lesson = str(e.lesson)
  return {
    original,
    correction,
    category: str(e.category, 'other') || 'other',
    explanation: str(e.explanation),
    lesson: lesson && lesson !== 'none' && (!lessonIds || lessonIds.has(lesson)) ? lesson : null,
  }
}

export const coerceVocab = (v: unknown) => {
  const o = obj(v)
  const fr = str(o.fr).trim()
  const en = str(o.en).trim()
  return fr && en ? { fr, en } : null
}

export function coerceFeedback(raw: unknown, lessonIds?: Set<string>): WritingFeedback {
  const r = obj(raw)
  return {
    summary: str(r.summary),
    score: clamp(r.score, 0, 100),
    level: str(r.level).toUpperCase(),
    errors: arr(r.errors, (e) => coerceError(e, lessonIds)),
    corrected: str(r.corrected),
    improved: str(r.improved),
    strengths: arr(r.strengths, (s) => (typeof s === 'string' && s.trim() ? s : null)),
    vocabulary: arr(r.vocabulary, coerceVocab).slice(0, 8),
  }
}

export async function getWritingFeedback(req: WritingRequest): Promise<WritingFeedback> {
  const ids = req.lessons.map((l) => l.id)
  return chatJson(
    {
      config: req.config,
      system: systemPrompt(req),
      messages: [{ role: 'user', content: `Here is my text:\n\n${req.text.trim()}` }],
      json: { name: 'writing_feedback', schema: feedbackSchema(ids) },
      maxTokens: 12000,
      signal: req.signal,
    },
    (raw) => coerceFeedback(raw, new Set(ids)),
  )
}

// ───────────── highlighting ─────────────

export interface Segment {
  text: string
  /** Index into the errors array when this segment is an error span. */
  error?: number
}

/**
 * Locates each error's `original` span in the learner text (in order, without
 * overlaps) and splits the text into plain and error segments.
 */
export function segmentText(text: string, errors: Pick<WritingError, 'original'>[]): { segments: Segment[]; located: Set<number> } {
  const norm = (s: string) => s.replace(/[’‘]/g, "'")
  const hay = norm(text)
  const ranges: { start: number; end: number; i: number }[] = []
  let cursor = 0
  errors.forEach((e, i) => {
    const needle = norm(e.original)
    if (!needle.trim()) return
    let at = hay.indexOf(needle, cursor)
    if (at < 0) at = hay.indexOf(needle)
    if (at < 0) {
      const lower = hay.toLowerCase()
      at = lower.indexOf(needle.toLowerCase(), cursor)
      if (at < 0) at = lower.indexOf(needle.toLowerCase())
    }
    if (at < 0) return
    const end = at + needle.length
    if (ranges.some((r) => at < r.end && end > r.start)) return
    ranges.push({ start: at, end, i })
    cursor = end
  })
  ranges.sort((a, b) => a.start - b.start)
  const segments: Segment[] = []
  let pos = 0
  for (const r of ranges) {
    if (r.start > pos) segments.push({ text: text.slice(pos, r.start) })
    segments.push({ text: text.slice(r.start, r.end), error: r.i })
    pos = r.end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) })
  return { segments, located: new Set(ranges.map((r) => r.i)) }
}

export function countWords(text: string): number {
  return (text.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length
}
