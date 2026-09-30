/**
 * Records mistakes from every kind of practice in one place, so Weak spots can
 * show patterns across drills, writing, conversation, dictation and speaking.
 */
import { LESSON_BY_ID } from '../data/grammar'
import { TENSE_BY_ID, type Tense } from './conjugate'
import type { WritingError } from './ai/writing'
import type { DictationResult, SpeechMatch } from './french'
import { useStore, type NewMistake } from './store'

const st = () => useStore.getState()

export function noteGrammar(lessonId: string, prompt: string, g: { pass: boolean; given: string; expected: string }, explain?: string) {
  const skill = `lesson:${lessonId}`
  st().recordSkill(skill, g.pass)
  if (!g.pass)
    st().logMistakes([{ source: 'grammar', skill, prompt, given: g.given, expected: g.expected, note: explain }])
}

export function noteConj(inf: string, tense: Tense, a: { pass: boolean; given: string; expected: string }) {
  if (a.pass) return
  st().logMistakes([
    {
      source: 'verbs',
      skill: `verb:${inf}|${tense}`,
      prompt: `${inf} · ${TENSE_BY_ID[tense]?.label ?? tense}`,
      given: a.given,
      expected: a.expected,
    },
  ])
}

/** Called when a flashcard is rated Again. */
export function noteLapse(wordId: string, prompt: string, expected: string, given = '') {
  st().logMistakes([{ source: 'words', skill: `word:${wordId}`, prompt, given, expected }])
}

/** The sentence of `text` that contains `span`, for context. */
export function sentenceAround(text: string, span: string): string {
  const norm = (s: string) => s.replace(/[’‘]/g, "'")
  const hay = norm(text)
  const at = hay.toLowerCase().indexOf(norm(span).toLowerCase())
  if (at < 0) return ''
  let start = at
  while (start > 0 && !/[.!?\n]/.test(hay[start - 1])) start--
  let end = at + span.length
  while (end < hay.length && !/[.!?\n]/.test(hay[end])) end++
  if (end < hay.length) end++
  const s = text.slice(start, end).trim()
  return s.length > 220 ? '' : s
}

/** Corrections from writing feedback or a conversation. */
export function noteCorrections(source: 'writing' | 'talk', errors: WritingError[], text: string, ref: string) {
  const ms: NewMistake[] = errors
    .filter((e) => e.original.trim() || e.correction.trim())
    .map((e) => ({
      source,
      skill: e.lesson ? `lesson:${e.lesson}` : `write:${e.category}`,
      prompt: sentenceAround(text, e.original) || text.slice(0, 220),
      given: e.original,
      expected: e.correction,
      note: e.explanation,
      fixable: !!e.original.trim() && !!e.correction.trim() && e.original.trim() !== e.correction.trim(),
      ref,
    }))
  st().logMistakes(ms)
}

export function noteDictation(sentence: { id: string; fr: string }, r: DictationResult) {
  const ms: NewMistake[] = []
  for (const m of r.marks) {
    if (!m.category) continue
    ms.push({
      source: 'listening',
      skill: `listen:${m.category}`,
      prompt: sentence.fr,
      given: m.given ?? '',
      expected: m.expected ?? '',
      ref: sentence.id,
    })
  }
  for (const c of Object.keys(r.categories)) st().recordSkill(`listen:${c}`, false)
  if (r.perfect) st().recordSkill('listen:all', true)
  st().logMistakes(ms)
}

export function noteSpeaking(sentence: { id: string; fr: string }, m: SpeechMatch) {
  const missed = m.words.filter((_, i) => !m.heard[i]).slice(0, 4)
  st().logMistakes(
    missed.map((w) => ({
      source: 'speaking' as const,
      skill: `say:${w.toLowerCase().replace(/[’]/g, "'")}`,
      prompt: sentence.fr,
      given: '',
      expected: w,
      ref: sentence.id,
    })),
  )
}

export function lessonTitleOf(skill: string): string | undefined {
  return skill.startsWith('lesson:') ? LESSON_BY_ID[skill.slice(7)]?.title : undefined
}
