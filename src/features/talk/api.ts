/** Prompts, schemas and calls for conversation practice. */
import { LESSONS } from '../../data/grammar'
import type { Level } from '../../data/types'
import type { Scenario } from '../../data/scenarios'
import { chatJson, type AiConfig, type ChatMessage } from '../../lib/ai'
import { arr, clamp, obj, partialStringField, str } from '../../lib/ai/json'
import { coerceError, coerceVocab, errorSchema, lessonList, vocabSchema, type WritingError } from '../../lib/ai/writing'
import { LEVEL_GUIDE } from '../reading/ai'
import type { ChatTurn, Conversation, TalkFeedback } from './types'

const LESSON_REFS = LESSONS.map((l) => ({ id: l.id, title: `${l.title} (${l.level})` }))
const LESSON_IDS = LESSON_REFS.map((l) => l.id)
const LESSON_SET = new Set(LESSON_IDS)

export interface TalkSetup {
  level: Level
  scenario?: Scenario
  /** Free conversation topic or custom situation. */
  topic?: string
  strict: boolean
}

export function setupFor(c: Conversation, scenario: Scenario | undefined, strict: boolean): TalkSetup {
  return { level: c.level, scenario, topic: c.topic, strict }
}

export function systemPrompt(s: TalkSetup): string {
  const role = s.scenario
    ? `## Your role\n${s.scenario.aiRole}\n\nScenario as described to the learner: ${s.scenario.setting}\n\nThe learner's goals:\n${s.scenario.goals.map((g) => `- ${g.id}: ${g.text}`).join('\n')}`
    : `## Your role\nYou are Camille, a friendly, curious French person chatting with the learner${
        s.topic ? ` about: ${s.topic}` : ' about whatever they like'
      }. Share your own (invented) opinions and experiences briefly, react naturally, and ask follow-up questions. There are no fixed goals.`
  return `You are role-playing with an English-speaking learner of French so they can practise conversation.

${role}

## Language level
${LEVEL_GUIDE[s.level]} Speak to the learner at this level.

## How to answer — fill every field
- "reply": your next line, in French only, in character, like spoken dialogue: one to three short sentences. Move the conversation forward — usually end with one clear question or prompt — but never do the learner's goals for them. Don't correct the learner here.
- "translation": a natural English translation of your reply.
- "corrections": mistakes in the learner's LAST message only — grammar, agreement, conjugation, wrong word or anglicism, missing words, spelling${
    s.strict ? ', accents' : ' (ignore missing accents on capitals)'
  }. Ignore capitalisation, missing final punctuation and casual but correct spoken style. "original" is copied exactly from their message and kept short; "correction" replaces it; "explanation" is one English sentence naming the rule; "lesson" is the app lesson id or "none". Use an empty list when the message is correct. If the learner wrote in English, give no corrections.
- "goalsMet": ids of every goal the learner has achieved so far in the whole conversation (cumulative), or an empty list.
- "suggestions": two or three short, varied things the learner could say next, in French at their level.
- "ended": true only when the conversation has reached a natural close (goodbyes, the task is done and there's nothing left to say).

If the learner writes in English or seems stuck, stay in character, answer simply in French, and use "suggestions" to show how to say what they meant.

App lessons (id — title):
${lessonList(LESSON_REFS)}`
}

export function turnSchema(goalIds: string[]) {
  return {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      translation: { type: 'string' },
      corrections: { type: 'array', items: errorSchema(LESSON_IDS) },
      goalsMet: { type: 'array', items: { type: 'string', enum: goalIds.length ? goalIds : ['none'] } },
      suggestions: { type: 'array', items: { type: 'string' } },
      ended: { type: 'boolean' },
    },
    required: ['reply', 'translation', 'corrections', 'goalsMet', 'suggestions', 'ended'],
    additionalProperties: false,
  }
}

/** The conversation as chat messages: the opening line is the AI's first turn. */
export function toMessages(turns: ChatTurn[]): ChatMessage[] {
  return [
    { role: 'user', content: '(The role-play begins. Say your first line.)' },
    ...turns.map((t) => ({ role: t.role === 'ai' ? ('assistant' as const) : ('user' as const), content: t.text })),
  ]
}

export interface TurnResult {
  reply: string
  translation: string
  corrections: WritingError[]
  goalsMet: string[]
  suggestions: string[]
  ended: boolean
}

export function coerceTurn(raw: unknown, goalIds: string[]): TurnResult {
  const r = obj(raw)
  const goals = new Set(goalIds)
  return {
    reply: str(r.reply).trim(),
    translation: str(r.translation).trim(),
    corrections: arr(r.corrections, (e) => coerceError(e, LESSON_SET)),
    goalsMet: arr(r.goalsMet, (g) => (typeof g === 'string' && goals.has(g) ? g : null)),
    suggestions: arr(r.suggestions, (s) => (typeof s === 'string' && s.trim() ? s.trim() : null)).slice(0, 3),
    ended: r.ended === true,
  }
}

/** Sends the conversation (ending with the learner's message) and streams the reply text. */
export async function nextTurn(
  setup: TalkSetup,
  turns: ChatTurn[],
  opts: { config?: AiConfig | null; signal?: AbortSignal; onReply?: (partial: string) => void },
): Promise<TurnResult> {
  const goalIds = setup.scenario?.goals.map((g) => g.id) ?? []
  const result = await chatJson(
    {
      config: opts.config,
      system: systemPrompt(setup),
      messages: toMessages(turns),
      json: { name: 'conversation_turn', schema: turnSchema(goalIds) },
      maxTokens: 6000,
      signal: opts.signal,
      onText: opts.onReply
        ? (text) => {
            const partial = partialStringField(text, 'reply')
            if (partial) opts.onReply!(partial)
          }
        : undefined,
    },
    (raw) => coerceTurn(raw, goalIds),
  )
  if (!result.reply) throw new Error('The reply came back empty. Try again.')
  return result
}

// ───────────── end-of-conversation feedback ─────────────

const feedbackSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two or three sentences in English: how the conversation went, encouraging and specific.' },
    score: { type: 'integer', description: '0–100: accuracy and how well the learner communicated.' },
    level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string', description: 'What to work on, in English, one sentence.' },
          example: { type: 'string', description: 'What the learner actually said (exact quote).' },
          better: { type: 'string', description: 'A correct, natural way to say it.' },
          lesson: { type: 'string', enum: [...LESSON_IDS, 'none'] },
        },
        required: ['point', 'example', 'better', 'lesson'],
        additionalProperties: false,
      },
    },
    vocabulary: vocabSchema,
    tip: { type: 'string', description: 'One concrete tip for next time, in English.' },
  },
  required: ['summary', 'score', 'level', 'strengths', 'improvements', 'vocabulary', 'tip'],
  additionalProperties: false,
}

export function coerceFeedback(raw: unknown): TalkFeedback {
  const r = obj(raw)
  return {
    summary: str(r.summary),
    score: clamp(r.score, 0, 100),
    level: str(r.level).toUpperCase(),
    strengths: arr(r.strengths, (s) => (typeof s === 'string' && s.trim() ? s : null)).slice(0, 4),
    improvements: arr(r.improvements, (v) => {
      const o = obj(v)
      const point = str(o.point).trim()
      if (!point) return null
      const lesson = str(o.lesson)
      return { point, example: str(o.example), better: str(o.better), lesson: LESSON_SET.has(lesson) ? lesson : null }
    }).slice(0, 5),
    vocabulary: arr(r.vocabulary, coerceVocab).slice(0, 8),
    tip: str(r.tip),
  }
}

export async function conversationFeedback(
  c: Conversation,
  scenario: Scenario | undefined,
  aiName: string,
  opts: { config?: AiConfig | null; signal?: AbortSignal },
): Promise<TalkFeedback> {
  const transcript = c.turns.map((t) => `${t.role === 'ai' ? aiName : 'Learner'}: ${t.text}`).join('\n')
  const goals = scenario
    ? `Goals: ${scenario.goals.map((g) => `${g.text}${c.goalsMet.includes(g.id) ? ' (achieved)' : ' (not achieved)'}`).join('; ')}`
    : `Free conversation${c.topic ? ` about: ${c.topic}` : ''}.`
  return chatJson(
    {
      config: opts.config,
      system: `You are a warm, precise French teacher reviewing a conversation role-play by an English-speaking learner (aiming at CEFR ${c.level}). Judge only the learner's lines. Be encouraging and concrete: quote their words. "vocabulary": up to six useful words or expressions (with articles for nouns) that would have helped or that they should keep, with English meanings.\n\nApp lessons (id — title):\n${lessonList(LESSON_REFS)}`,
      messages: [{ role: 'user', content: `${scenario ? `Scenario: ${scenario.title} — ${scenario.setting}` : ''}\n${goals}\n\nTranscript:\n${transcript}` }],
      json: { name: 'conversation_feedback', schema: feedbackSchema },
      maxTokens: 8000,
      signal: opts.signal,
    },
    coerceFeedback,
  )
}
