import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Anchor, Badge, Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { RotateCcw, ShieldCheck, Trophy } from 'lucide-react'
import { LESSON_BY_ID, nextLesson } from '../../data/grammar'
import type { Exercise, Lesson } from '../../data/types'
import { FocusShell } from '../../components/FocusShell'
import { PASS_MARK, useStore, type LessonProgress } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import type { Graded } from './grade'
import { GrammarQuestion, promptText } from './GrammarQuestion'
import { noteGrammar } from '../../lib/mistakes'
import { MistakeList } from './MistakeList'
import { GoalResults } from './GoalResults'
import { defaultMode, goalOf, learnOrder, pickCheck, pickGoal, pickReview, tallyByGoal, TESTED_OUT_STEP, type PracticeMode } from './goals'


const MODE_LABEL: Record<PracticeMode, string> = {
  learn: 'Practice',
  practice: 'Practice',
  review: 'Review',
  check: 'Check',
  goal: 'Goal practice',
}


function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function questionsFor(lesson: Lesson, mode: PracticeMode, p: LessonProgress | undefined, goal?: string): number[] {
  switch (mode) {
    case 'learn':
      return learnOrder(lesson)
    case 'review':
      return pickReview(lesson, p)
    case 'check':
      return pickCheck(lesson)
    case 'goal':
      return pickGoal(lesson, goal ?? '')
    default:
      return shuffled(lesson.exercises.length)
  }
}

interface Mistake {
  ex: Exercise
  given: string
  expected: string
}

/** A new mode or goal in the URL starts a fresh session. */
export default function PracticeRoute() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  return <PracticeSession key={`${id}?${params.toString()}`} />
}

function PracticeSession() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const prev = useStore((s) => s.lessons[id])
  const recordLesson = useStore((s) => s.recordLesson)
  const recordGoals = useStore((s) => s.recordGoals)
  const logActivity = useStore((s) => s.logActivity)

  const asked = params.get('mode') as PracticeMode | null
  const goal = lesson ? goalOf(lesson, params.get('goal') ?? undefined) : undefined
  // Fixed for the whole session, even though recording a result changes the progress it's based on.
  const [mode] = useState<PracticeMode>(() => (asked && asked in MODE_LABEL && (asked !== 'goal' || goal) ? asked : defaultMode(prev)))
  useDocumentTitle(lesson ? `${MODE_LABEL[mode]} · ${lesson.title}` : 'Practice')

  // Picked once per visit; "Practice again" picks afresh.
  const [set, setSet] = useState<number[]>(() => (lesson ? questionsFor(lesson, mode, prev, goal?.id) : []))
  const [queue, setQueue] = useState<number[]>(set)
  const [pos, setPos] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({})
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [done, setDone] = useState(false)
  const [retried, setRetried] = useState<Set<number>>(new Set())

  if (!lesson || !set.length) {
    return (
      <Container size="var(--page-w)" py="xl">
        <Text>
          {lesson ? 'Nothing to practise here.' : 'Lesson not found.'}{' '}
          <Anchor component={Link} to={lesson ? `/grammar/${lesson.id}` : '/grammar'}>
            Back
          </Anchor>
        </Text>
      </Container>
    )
  }

  const total = set.length
  const exIndex = queue[pos]
  const ex = lesson.exercises[exIndex]
  const answeredFirst = Object.keys(firstTry).length
  const score = answeredFirst ? Object.values(firstTry).filter(Boolean).length / total : 0
  // A check is a test: no second chances.
  const retries = mode !== 'check'

  const finish = (ft: Record<number, boolean>) => {
    const final = Object.values(ft).filter(Boolean).length / total
    const goals = tallyByGoal(lesson, ft)
    if (mode === 'goal') recordGoals(lesson.id, goals)
    else recordLesson(lesson.id, final, { goals, startStep: mode === 'check' && final >= PASS_MARK ? TESTED_OUT_STEP : undefined })
    setDone(true)
  }

  const onAnswered = (g: Graded) => {
    setAnswered(true)
    logActivity(g.pass, { skill: 'grammar' })
    if (!(exIndex in firstTry)) {
      noteGrammar(lesson.id, promptText(ex), g, 'explain' in ex ? ex.explain : undefined)
      setFirstTry((f) => ({ ...f, [exIndex]: g.pass }))
      if (!g.pass) setMistakes((m) => [...m, { ex, given: g.given, expected: g.expected }])
    }
    // Wrong answers come back once at the end of the session.
    if (retries && !g.pass && !retried.has(exIndex)) {
      setQueue((q) => [...q, exIndex])
      setRetried((r) => new Set(r).add(exIndex))
    }
  }

  const next = (q = queue, ft = firstTry) => {
    if (pos + 1 >= q.length) return finish(ft)
    setPos((p) => p + 1)
    setAnswered(false)
  }

  const restart = (m: PracticeMode = mode) => {
    if (m !== mode) {
      navigate(`/grammar/${lesson.id}/practice?mode=${m}${m === 'goal' && goal ? `&goal=${goal.id}` : ''}`)
      return
    }
    const s = questionsFor(lesson, m === 'learn' ? 'practice' : m, useStore.getState().lessons[lesson.id], goal?.id)
    setSet(s)
    setQueue(s)
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
    const tally = tallyByGoal(lesson, firstTry)
    const title =
      mode === 'check'
        ? passed
          ? 'Vous maîtrisez !'
          : 'Pas encore !'
        : passed
          ? score === 1
            ? 'Parfait !'
            : 'Bien joué !'
          : score >= 0.5
            ? 'Presque !'
            : 'On continue !'
    const message =
      mode === 'goal'
        ? passed
          ? `“${goal?.text}” is solid now. It will come back in your reviews.`
          : 'Re-read that part of the lesson, then try this goal again.'
        : mode === 'check'
          ? passed
            ? `You already know “${lesson.title}”: it’s marked as mastered, with a first review in a week.`
            : `You need ${Math.round(PASS_MARK * 100)}% to test out. The goals below show exactly what to study — you can skip the rest.`
          : passed
            ? `You’ve mastered “${lesson.title}”. We’ll bring it back for a quick review so it sticks.`
            : `You need ${Math.round(PASS_MARK * 100)}% to master this lesson. Work on the goals marked below, then try again.`
    return (
      <FocusShell progress={1} exitTo={`/grammar/${lesson.id}`} label={MODE_LABEL[mode]} count={`${total}/${total}`}>
        <Stack align="center" ta="center" gap={8} pt={32}>
          {mode === 'check' && passed ? (
            <ShieldCheck size={40} color="var(--mantine-color-green-filled)" aria-hidden />
          ) : (
            <Trophy size={40} color={passed ? 'var(--mantine-color-green-filled)' : 'var(--mantine-color-orange-filled)'} aria-hidden />
          )}
          <Text className="fr tnum" fz={64} fw={600} lh={1} lts="-0.03em">
            {Math.round(score * 100)}%
          </Text>
          <Title order={1} className="fr" fz={28} fw={600}>
            {title}
          </Title>
          <Text c="dimmed" maw={460}>
            {message}
          </Text>
          <Group justify="center" mt={18}>
            {!passed && (
              <Button size="lg" onClick={() => navigate(`/grammar/${lesson.id}`)} autoFocus>
                Back to the lesson
              </Button>
            )}
            {mode === 'check' && !passed ? (
              <Button size="lg" variant="default" onClick={() => restart('learn')}>
                Practise the full lesson
              </Button>
            ) : (
              <Button size="lg" variant="default" onClick={() => restart()} leftSection={<RotateCcw size={17} aria-hidden />}>
                {mode === 'goal' ? 'Again' : 'Practice again'}
              </Button>
            )}
            {passed && mode !== 'goal' && nl && (
              <Button size="lg" onClick={() => navigate(`/grammar/${nl.id}`)} autoFocus>
                Next: {nl.title}
              </Button>
            )}
            {passed && (mode === 'goal' || !nl) && (
              <Button size="lg" onClick={() => navigate(mode === 'goal' ? `/grammar/${lesson.id}` : '/grammar')} autoFocus>
                {mode === 'goal' ? 'Back to the lesson' : 'Back to grammar'}
              </Button>
            )}
          </Group>
          {mode !== 'goal' && <GoalResults lesson={lesson} tally={tally} />}
          {mistakes.length > 0 && (
            <MistakeList
              items={mistakes.map((m) => ({
                what: promptText(m.ex),
                given: m.given,
                expected: m.expected,
                goal: goalOf(lesson, m.ex.goal)?.text,
              }))}
            />
          )}
        </Stack>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      progress={pos / queue.length}
      count={`${Math.min(answeredFirst + (answered ? 0 : 1), total)}/${total}`}
      exitTo={`/grammar/${lesson.id}`}
      label={mode === 'goal' && goal ? goal.text : MODE_LABEL[mode]}
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
