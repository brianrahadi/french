/**
 * Writing feedback from Claude, called directly from the browser.
 *
 * The API key is stored only in this browser (localStorage, separate from the
 * progress backup) and sent straight to api.anthropic.com — there is no server.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Level } from '../data/types'

export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Recommended — fast, precise corrections' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most thorough explanations, slower' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', note: 'Fastest and cheapest' },
] as const

export const DEFAULT_MODEL = CLAUDE_MODELS[0].id

interface AiSettings {
  apiKey: string
  model: string
  setApiKey: (k: string) => void
  setModel: (m: string) => void
}

export const useAi = create<AiSettings>()(
  persist(
    (set) => ({
      apiKey: '',
      model: DEFAULT_MODEL,
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setModel: (model) => set({ model }),
    }),
    {
      name: 'petit-a-petit-ai',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ apiKey: s.apiKey, model: s.model }),
    },
  ),
)

// ───────────── feedback types ─────────────

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
  apiKey: string
  model: string
  text: string
  task: string
  focus?: string
  level: Level
  lessons: { id: string; title: string }[]
  signal?: AbortSignal
}

// ───────────── request ─────────────

const API_URL = 'https://api.anthropic.com/v1/messages'

function headers(apiKey: string): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    // Required for calls made directly from a browser (CORS).
    'anthropic-dangerous-direct-browser-access': 'true',
  }
}

export function feedbackSchema(lessonIds: string[]) {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Two or three sentences of overall feedback in English, encouraging and specific.' },
      score: { type: 'integer', description: 'Accuracy from 0 to 100 (100 = no errors).' },
      level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
      errors: {
        type: 'array',
        items: {
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
        },
      },
      corrected: { type: 'string', description: 'The full text with only the errors fixed.' },
      improved: { type: 'string', description: 'A more natural, native-sounding version.' },
      strengths: { type: 'array', items: { type: 'string' } },
      vocabulary: {
        type: 'array',
        items: {
          type: 'object',
          properties: { fr: { type: 'string' }, en: { type: 'string' } },
          required: ['fr', 'en'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'score', 'level', 'errors', 'corrected', 'improved', 'strengths', 'vocabulary'],
    additionalProperties: false,
  }
}

export function systemPrompt(req: Pick<WritingRequest, 'task' | 'focus' | 'level' | 'lessons'>): string {
  return `You are a warm, precise French teacher correcting a short text written by an English-speaking learner (around CEFR ${req.level}).

Task the learner was given: ${req.task}${req.focus ? `\nGrammar the task practises: ${req.focus}` : ''}

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
${req.lessons.map((l) => `${l.id} — ${l.title}`).join('\n')}`
}

export function buildRequestBody(req: Omit<WritingRequest, 'apiKey' | 'signal'>) {
  return {
    model: req.model,
    max_tokens: 4096,
    system: systemPrompt(req),
    messages: [{ role: 'user', content: `Here is my text:\n\n${req.text.trim()}` }],
    output_config: {
      format: { type: 'json_schema', schema: feedbackSchema(req.lessons.map((l) => l.id)) },
    },
  }
}

export class AiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

async function friendlyError(res: Response): Promise<AiError> {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message ?? ''
  } catch {
    /* ignore */
  }
  switch (res.status) {
    case 401:
      return new AiError('Your API key was rejected. Check it in Settings.', 401)
    case 403:
      return new AiError('This API key isn’t allowed to use that model.', 403)
    case 404:
      return new AiError('That model isn’t available for your API key. Pick another one in Settings.', 404)
    case 429:
      return new AiError('Rate limit reached — wait a minute and try again.', 429)
    case 529:
    case 503:
      return new AiError('Claude is busy right now. Try again in a moment.', res.status)
    default:
      return new AiError(detail || `Request failed (${res.status}).`, res.status)
  }
}

interface MessagesResponse {
  content: { type: string; text?: string }[]
  stop_reason?: string
}

export function parseFeedback(data: MessagesResponse): WritingFeedback {
  if (data.stop_reason === 'max_tokens') throw new AiError('The feedback was cut off. Try a shorter text.')
  if (data.stop_reason === 'refusal') throw new AiError('Claude declined to correct this text.')
  const text = data.content.find((b) => b.type === 'text')?.text
  if (!text) throw new AiError('Claude returned an empty response.')
  let raw: WritingFeedback & { errors: (WritingError & { lesson: string | null })[] }
  try {
    raw = JSON.parse(text)
  } catch {
    throw new AiError('Couldn’t read Claude’s response. Try again.')
  }
  return {
    summary: raw.summary ?? '',
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    level: String(raw.level ?? '').toUpperCase(),
    errors: (raw.errors ?? []).map((e) => ({ ...e, lesson: e.lesson && e.lesson !== 'none' ? e.lesson : null })),
    corrected: raw.corrected ?? '',
    improved: raw.improved ?? '',
    strengths: raw.strengths ?? [],
    vocabulary: raw.vocabulary ?? [],
  }
}

export async function getWritingFeedback(req: WritingRequest): Promise<WritingFeedback> {
  if (!req.apiKey) throw new AiError('Add your Claude API key in Settings first.')
  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: headers(req.apiKey),
      body: JSON.stringify(buildRequestBody(req)),
      signal: req.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new AiError('Couldn’t reach the Claude API. Check your internet connection.')
  }
  if (!res.ok) throw await friendlyError(res)
  return parseFeedback(await res.json())
}

/** Minimal call used by the “Test key” button. */
export async function testApiKey(apiKey: string, model: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Réponds juste « OK ».' }] }),
    })
  } catch {
    throw new AiError('Couldn’t reach the Claude API. Check your internet connection.')
  }
  if (!res.ok) throw await friendlyError(res)
}

// ───────────── highlighting ─────────────

export interface Segment {
  text: string
  /** Index into feedback.errors when this segment is an error span. */
  error?: number
}

/**
 * Locates each error's `original` span in the learner text (in order, without
 * overlaps) and splits the text into plain and error segments.
 */
export function segmentText(text: string, errors: WritingError[]): { segments: Segment[]; located: Set<number> } {
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
