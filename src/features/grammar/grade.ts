import { checkAnswer, normalize, type Verdict } from '../../lib/answer'
import type { Exercise } from '../../data/types'

export interface Graded {
  verdict: Verdict
  /** Counts as correct for scoring (accent slips pass unless strict mode is on). */
  pass: boolean
  given: string
  expected: string
}

export function orderAnswers(ex: Extract<Exercise, { type: 'order' }>): string[] {
  return [ex.words.join(' '), ...(ex.alt ?? [])]
}

export function gradeExercise(ex: Exercise, value: string, strictAccents: boolean): Graded {
  const passFor = (v: Verdict) => v === 'correct' || (v === 'almost' && !strictAccents)
  switch (ex.type) {
    case 'mcq': {
      const idx = Number(value)
      const ok = idx === ex.answer
      return { verdict: ok ? 'correct' : 'wrong', pass: ok, given: ex.options[idx] ?? '', expected: ex.options[ex.answer] }
    }
    case 'order': {
      const answers = orderAnswers(ex)
      const n = normalize(value)
      const hit = answers.find((a) => normalize(a) === n)
      const expected = (hit ?? answers[0]) + (ex.punct ?? '')
      return { verdict: hit ? 'correct' : 'wrong', pass: !!hit, given: value, expected }
    }
    default: {
      const r = checkAnswer(value, ex.answers)
      return { verdict: r.verdict, pass: passFor(r.verdict), given: value, expected: r.expected }
    }
  }
}

/** The full sentence with the blank filled, for reading aloud and display. */
export function fillBlank(sentence: string, answer: string): string {
  return sentence.replace('___', answer)
}

/** Best text to speak after answering. */
export function speakableAnswer(ex: Exercise, expected: string): string {
  switch (ex.type) {
    case 'cloze':
      return fillBlank(ex.sentence, expected)
    case 'mcq':
      if (ex.sentence) return ex.sentence.replace('___', expected)
      return looksFrench(expected) ? expected : ''
    default:
      return expected
  }
}

export const PRAISE = ['Correct !', 'Parfait !', 'Bien joué !', 'Excellent !', 'Exactement !', 'Bravo !']
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)]

const FR_WORDS = new Set(['je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'est', 'que', 'qui', 'pas', 'ne', 'n', 'c', 'à', 'au', 'en', 'et', 'mais', 'ce', 'son', 'sa', 'si', 'se', 's', 'me', 'm', 'te', 't', 'lui', 'leur', 'y'])
const EN_WORDS = new Set(['the', 'i', 'you', 'is', 'are', 'a', 'of', 'to', 'it', 'he', 'she', 'we', 'they', 'my', 'his', 'her', 'and', 'or', 'was', 'have', 'has', 'do', 'what', 'which', 'both'])

/** Rough check so we only read French text aloud. */
export function looksFrench(s: string): boolean {
  const words = s.toLowerCase().split(/[^a-zàâäçéèêëîïôöûùüœ]+/).filter(Boolean)
  let fr = 0
  let en = 0
  for (const w of words) {
    if (FR_WORDS.has(w)) fr++
    if (EN_WORDS.has(w)) en++
  }
  if (/[àâçéèêëîïôûùœ]/.test(s)) fr++
  return fr > en
}
