import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Anchor, Badge, Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { RotateCcw, Trophy } from 'lucide-react'
import { LESSON_BY_ID, nextLesson } from '../../data/grammar'
import type { Exercise } from '../../data/types'
import { FocusShell } from '../../components/FocusShell'
import { PASS_MARK, useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import type { Graded } from './grade'
import { GrammarQuestion, promptText } from './GrammarQuestion'
import { noteGrammar } from '../../lib/mistakes'
import { MistakeList } from './MistakeList'

interface Mistake {
  ex: Exercise
  given: string
  expected: string
}

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PracticeSession() {
  const { id = '' } = useParams()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const prev = useStore((s) => s.lessons[id])
  const recordLesson = useStore((s) => s.recordLesson)
  const logActivity = useStore((s) => s.logActivity)
  useDocumentTitle(lesson ? `Practice · ${lesson.title}` : 'Practice')

  // First attempt keeps the teaching order; reviews are shuffled.
  const initial = useMemo(
    () => (lesson ? (prev?.best ? shuffled(lesson.exercises.length) : lesson.exercises.map((_, i) => i)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson],
  )
  const [queue, setQueue] = useState<number[]>(initial)
  const [pos, setPos] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({})
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [done, setDone] = useState(false)
  const [retried, setRetried] = useState<Set<number>>(new Set())

  if (!lesson) {
    return (
      <Container size={960} py="xl">
        <Text>
          Lesson not found.{' '}
          <Anchor component={Link} to="/grammar">
            Back to grammar
          </Anchor>
        </Text>
      </Container>
    )
  }

  const total = lesson.exercises.length
  const exIndex = queue[pos]
  const ex = lesson.exercises[exIndex]
  const answeredFirst = Object.keys(firstTry).length
  const score = answeredFirst ? Object.values(firstTry).filter(Boolean).length / total : 0

  const onAnswered = (g: Graded) => {
    setAnswered(true)
    logActivity(g.pass)
    if (!(exIndex in firstTry)) {
      noteGrammar(lesson.id, promptText(ex), g, 'explain' in ex ? ex.explain : undefined)
      setFirstTry((f) => ({ ...f, [exIndex]: g.pass }))
      if (!g.pass) setMistakes((m) => [...m, { ex, given: g.given, expected: g.expected }])
    }
    // Wrong answers come back once at the end of the session.
    if (!g.pass && !retried.has(exIndex)) {
      setQueue((q) => [...q, exIndex])
      setRetried((r) => new Set(r).add(exIndex))
    }
  }

  const next = (q = queue, ft = firstTry) => {
    if (pos + 1 >= q.length) {
      const final = Object.values(ft).filter(Boolean).length / total
      recordLesson(lesson.id, final)
      setDone(true)
      return
    }
    setPos((p) => p + 1)
    setAnswered(false)
  }

  const restart = () => {
    setQueue(shuffled(total))
    setPos(0)
    setAnswered(false)
    setFirstTry({})
    setMistakes([])
    setRetried(new Set())
    setDone(false)
  }

  const overrideCorrect = () => {
    const ft = { ...firstTry, [exIndex]: true }
    const q = queue[queue.length - 1] === exIndex && queue.length - 1 > pos ? queue.slice(0, -1) : queue
    setFirstTry(ft)
    setMistakes((m) => m.filter((x) => x.ex !== ex))
    setQueue(q)
    next(q, ft)
  }

  if (done) {
    const passed = score >= PASS_MARK
    const nl = nextLesson(lesson.id)
    return (
      <FocusShell progress={1} exitTo={`/grammar/${lesson.id}`} label="Practice" count={`${total}/${total}`}>
        <Stack align="center" ta="center" gap={8} pt={32}>
          <Trophy size={40} color={passed ? 'var(--mantine-color-green-filled)' : 'var(--mantine-color-orange-filled)'} aria-hidden />
          <Text className="fr tnum" fz={64} fw={600} lh={1} lts="-0.03em">
            {Math.round(score * 100)}%
          </Text>
          <Title order={1} className="fr" fz={28} fw={600}>
            {passed ? (score === 1 ? 'Parfait\u00a0!' : 'Bien joué\u00a0!') : score >= 0.5 ? 'Presque\u00a0!' : 'On continue\u00a0!'}
          </Title>
          <Text c="dimmed" maw={440}>
            {passed
              ? `You’ve mastered “${lesson.title}”. We’ll bring it back for a quick review so it sticks.`
              : `You need ${Math.round(PASS_MARK * 100)}% to master this lesson. Re-read the tricky parts and try again — mistakes are how it sticks.`}
          </Text>
          <Group justify="center" mt={18}>
            {!passed && (
              <Button size="lg" onClick={() => navigate(`/grammar/${lesson.id}`)} autoFocus>
                Review the lesson
              </Button>
            )}
            <Button size="lg" variant="default" onClick={restart} leftSection={<RotateCcw size={17} aria-hidden />}>
              Practice again
            </Button>
            {passed && nl && (
              <Button size="lg" onClick={() => navigate(`/grammar/${nl.id}`)} autoFocus>
                Next: {nl.title}
              </Button>
            )}
            {passed && !nl && (
              <Button size="lg" onClick={() => navigate('/grammar')} autoFocus>
                Back to grammar
              </Button>
            )}
          </Group>
          {mistakes.length > 0 && <MistakeList items={mistakes.map((m) => ({ what: promptText(m.ex), given: m.given, expected: m.expected }))} />}
        </Stack>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      progress={pos / queue.length}
      count={`${Math.min(answeredFirst + (answered ? 0 : 1), total)}/${total}`}
      exitTo={`/grammar/${lesson.id}`}
      label="Practice"
    >
      <GrammarQuestion
        key={pos}
        ex={ex}
        context={
          pos >= total ? (
            <Badge color="orange" mb={10}>
              Retry
            </Badge>
          ) : undefined
        }
        onAnswered={onAnswered}
        onContinue={() => next()}
        onOverride={overrideCorrect}
      />
    </FocusShell>
  )
}
