import { useState, type ReactNode } from 'react'
import type { Exercise } from '../../data/types'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { CheckBar } from '../../components/CheckBar'
import { Diff } from '../../components/Diff'
import { Rich } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { frTypo } from '../../lib/words'
import { ExerciseView } from './ExerciseView'
import { gradeExercise, praise, speakableAnswer, type Graded } from './grade'

/**
 * One grammar exercise: the question, the check bar and the feedback sheet.
 * Mount it with a fresh `key` for every question.
 */
export function GrammarQuestion({
  ex,
  context,
  onAnswered,
  onContinue,
  onOverride,
}: {
  ex: Exercise
  /** Optional label above the question (e.g. the lesson it comes from). */
  context?: ReactNode
  onAnswered: (g: Graded) => void
  onContinue: () => void
  /** Offered after a wrong free-text answer: "I was right — count it". */
  onOverride?: () => void
}) {
  const strict = useStore((s) => s.settings.strictAccents)
  const autoplay = useStore((s) => s.settings.autoplay)
  const [value, setValue] = useState('')
  const [graded, setGraded] = useState<Graded | null>(null)

  const submit = (v = value) => {
    if (graded) return
    const g = gradeExercise(ex, v, strict)
    setValue(v)
    setGraded(g)
    onAnswered(g)
  }

  const typed = ex.type !== 'mcq'
  const speakText = graded ? speakableAnswer(ex, graded.expected) : ''
  const canOverride = !!onOverride && !!graded && !graded.pass && (ex.type === 'translate' || ex.type === 'transform') && graded.given.trim()

  return (
    <>
      {context}
      <ExerciseView ex={ex} value={value} setValue={setValue} graded={graded} onSubmit={submit} />

      {!graded ? (
        typed ? (
          <CheckBar onCheck={() => submit()} disabled={!value.trim()} onSkip={() => submit('')} />
        ) : (
          <CheckBar onSkip={() => submit('')} />
        )
      ) : (
        <FeedbackSheet
          verdict={graded.verdict}
          title={graded.verdict === 'correct' ? praise() : graded.verdict === 'almost' ? 'Almost — check the accents' : 'Not quite'}
          onContinue={onContinue}
          secondary={
            canOverride ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onOverride}>
                I was right — count it
              </button>
            ) : undefined
          }
        >
          {graded.verdict !== 'correct' && (
            <div className="sheet__answer row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {typed && graded.given.trim() ? (
                  <Diff given={graded.given} expected={graded.expected} />
                ) : (
                  <strong lang="fr">{frTypo(graded.expected)}</strong>
                )}
              </div>
            </div>
          )}
          {'explain' in ex && ex.explain && (
            <p className="sheet__explain">
              <Rich text={ex.explain} />
            </p>
          )}
          {speakText && (
            <div className="row" style={{ marginTop: 6, gap: 4 }}>
              <SpeakButton text={speakText} size="sm" autoPlay={autoplay} label="Listen to the answer" />
              <span className="small muted" lang="fr">
                {frTypo(speakText)}
              </span>
            </div>
          )}
        </FeedbackSheet>
      )}
    </>
  )
}

/** Short text describing an exercise, for mistake lists. */
export function promptText(ex: Exercise): string {
  switch (ex.type) {
    case 'cloze':
      return ex.sentence + (ex.hint ? ` (${ex.hint})` : '')
    case 'mcq':
      return ex.prompt.replace(/\*\*/g, '') + (ex.sentence ? ` — ${ex.sentence}` : '')
    case 'order':
    case 'translate':
      return ex.en
    case 'transform':
      return `${ex.instruction} ${ex.source}`
  }
}
