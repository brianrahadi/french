import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Anchor, Box, Button, Text } from '@mantine/core'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { AccentBar } from '../../components/AccentBar'
import { CheckBar } from '../../components/CheckBar'
import { Diff } from '../../components/Diff'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { LESSON_BY_ID } from '../../data/grammar'
import { checkAnswer, normalize } from '../../lib/answer'
import { segmentText } from '../../lib/ai/writing'
import { useStore, type Mistake } from '../../lib/store'
import { frTypo } from '../../lib/words'
import { praise } from '../grammar/grade'

export interface FixAnswer {
  mistake: Mistake
  pass: boolean
  given: string
}

/**
 * "Fix the sentence": a correction from the learner's own writing or conversation,
 * shown in its sentence with the wrong part highlighted. Mount with a fresh key.
 */
export function FixQuestion({
  mistake: m,
  context,
  onAnswered,
  onContinue,
}: {
  mistake: Mistake
  context?: ReactNode
  onAnswered: (a: FixAnswer) => void
  onContinue: () => void
}) {
  const strict = useStore((s) => s.settings.strictAccents)
  const [value, setValue] = useState('')
  const [hint, setHint] = useState(false)
  const [answer, setAnswer] = useState<(FixAnswer & { verdict: 'correct' | 'almost' | 'wrong' }) | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const sentence = m.prompt || m.given
  const { segments } = segmentText(sentence, [{ original: m.given }])
  const lesson = m.skill.startsWith('lesson:') ? LESSON_BY_ID[m.skill.slice(7)] : undefined
  const fixedSentence = segments.map((s) => (s.error === undefined ? s.text : m.expected)).join('')

  const check = (giveUp = false) => {
    if (answer) return
    const given = giveUp ? '' : value
    let verdict = checkAnswer(given, [m.expected]).verdict
    // Also accept the whole sentence rewritten correctly.
    if (verdict === 'wrong' && given && normalize(given) === normalize(fixedSentence)) verdict = 'correct'
    const pass = verdict === 'correct' || (verdict === 'almost' && !strict)
    const a = { mistake: m, pass, given, verdict }
    setAnswer(a)
    onAnswered(a)
  }

  return (
    <>
      {context}
      <Text size="xs" fw={650} c="dimmed" tt="uppercase" lts="0.05em" mb="sm">
        Fix your own mistake · from your {m.source === 'talk' ? 'conversation' : 'writing'}
      </Text>
      <Text fz={20} fw={620} lh={1.35}>
        Rewrite the highlighted part correctly.
      </Text>
      <div className="fix-q__sentence fr" lang="fr">
        {segments.map((s, i) =>
          s.error === undefined ? (
            <span key={i}>{frTypo(s.text)}</span>
          ) : (
            <mark key={i} className={`fix-q__wrong${answer ? ' is-answered' : ''}`}>
              {frTypo(s.text)}
            </mark>
          ),
        )}
      </div>
      {!answer && (lesson || m.note) && (
        <Box mb="sm">
          {hint ? (
            <Text size="sm" c="dimmed" fs="italic">
              <Lightbulb size={15} aria-hidden style={{ verticalAlign: '-2px' }} /> {lesson ? lesson.title : m.note?.split('.')[0]}
            </Text>
          ) : (
            <Button variant="subtle" size="xs" leftSection={<Lightbulb size={15} aria-hidden />} onClick={() => setHint(true)}>
              Hint
            </Button>
          )}
        </Box>
      )}
      {!answer ? (
        <>
          <input
            ref={input}
            className="answer-input fr"
            lang="fr"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                e.preventDefault()
                check()
              }
            }}
            placeholder={m.given}
            aria-label="Corrected version"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <AccentBar inputRef={input} onInsert={setValue} />
          <CheckBar onCheck={() => check()} disabled={!value.trim()} onSkip={() => check(true)} />
        </>
      ) : (
        <FeedbackSheet
          verdict={answer.verdict}
          title={answer.verdict === 'correct' ? praise() : answer.verdict === 'almost' ? 'Almost — check the accents' : 'Not quite'}
          onContinue={onContinue}
        >
          {answer.verdict !== 'correct' && (
            <Box mt={6} fz={18} className="fr">
              {answer.given.trim() ? <Diff given={answer.given} expected={m.expected} /> : <strong lang="fr">{frTypo(m.expected)}</strong>}
            </Box>
          )}
          {m.note && (
            <Text size="sm" c="dimmed" mt="xs" maw="62ch">
              {m.note}
            </Text>
          )}
          <Text size="sm" lang="fr" mt={4}>
            {frTypo(fixedSentence)}
          </Text>
          {lesson && (
            <Anchor
              component={Link}
              to={`/grammar/${lesson.id}`}
              target="_blank"
              rel="noreferrer"
              size="sm"
              fw={600}
              mt={6}
              display="inline-flex"
              style={{ alignItems: 'center', gap: 4 }}
            >
              Review: {lesson.title} <ArrowRight size={14} aria-hidden />
            </Anchor>
          )}
        </FeedbackSheet>
      )}
    </>
  )
}
