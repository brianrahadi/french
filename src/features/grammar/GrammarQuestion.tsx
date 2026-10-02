import { useState, type ReactNode } from 'react'
import { Box, Button, Group, Text } from '@mantine/core'
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
              <Button variant="subtle" color="gray" size="sm" onClick={onOverride}>
                I was right — count it
              </Button>
            ) : undefined
          }
        >
          {graded.verdict !== 'correct' && (
            <Box className="fr" fz={18} mt={6}>
              {typed && graded.given.trim() ? (
                <Diff given={graded.given} expected={graded.expected} />
              ) : (
                <strong lang="fr">{frTypo(graded.expected)}</strong>
              )}
            </Box>
          )}
          {'explain' in ex && ex.explain && (
            <Text mt={8} fz={14.5} c="dimmed" maw="62ch">
              <Rich text={ex.explain} />
            </Text>
          )}
          {speakText && (
            <Group gap={4} mt={6} wrap="nowrap">
              <SpeakButton text={speakText} size="sm" autoPlay={autoplay} label="Listen to the answer" />
              <Text size="sm" c="dimmed" lang="fr">
                {frTypo(speakText)}
              </Text>
            </Group>
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
