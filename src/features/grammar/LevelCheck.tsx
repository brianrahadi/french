import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Anchor, Badge, Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { CheckCircle2, CircleDashed, ShieldCheck } from 'lucide-react'
import { lessonsByLevel } from '../../data/grammar'
import { LEVELS, type Level } from '../../data/types'
import { FocusShell } from '../../components/FocusShell'
import { LevelBadge } from '../../components/ui'
import { useStore, type GoalTally } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { noteGrammar } from '../../lib/mistakes'
import type { Graded } from './grade'
import { GrammarQuestion, promptText } from './GrammarQuestion'
import { ResultList, ResultRow } from './MistakeList'
import { levelCheckLessons, pickLevelSample, TESTED_OUT_STEP } from './goals'

interface Item {
  lessonId: string
  index: number
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/**
 * “Already know this level?” Two questions from two different goals of every lesson
 * not yet mastered. A lesson with both right is tested out (mastered, first review in
 * a week); the others are left for study, with what was missed recorded per goal.
 */
export default function LevelCheck() {
  const { level: raw = '' } = useParams()
  const level = raw.toUpperCase() as Level
  const navigate = useNavigate()
  const recordLesson = useStore((s) => s.recordLesson)
  const recordGoals = useStore((s) => s.recordGoals)
  const logActivity = useStore((s) => s.logActivity)
  useDocumentTitle(`${level} level check`)

  const [items] = useState<Item[]>(() =>
    LEVELS.includes(level)
      ? shuffle(levelCheckLessons(level, useStore.getState().lessons).flatMap((l) => pickLevelSample(l).map((index) => ({ lessonId: l.id, index }))))
      : [],
  )
  const [pos, setPos] = useState(0)
  // Mirrored in a ref so finishing right after an override sees the corrected result.
  const results = useRef<boolean[]>([])
  const [, setAnswered] = useState(0)
  // Per-lesson results, set when the check is over.
  const [summary, setSummary] = useState<Record<string, { ok: number; n: number; goals: GoalTally }> | null>(null)

  const lessons = lessonsByLevel(level)
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]))

  if (!items.length) {
    return (
      <Container size="var(--page-w-narrow)" py="xl">
        <Text>
          {LEVELS.includes(level) ? `Every ${level} lesson is already mastered.` : 'Unknown level.'}{' '}
          <Anchor component={Link} to="/grammar">
            Back to grammar
          </Anchor>
        </Text>
      </Container>
    )
  }

  const item = items[pos]
  const lesson = byId[item.lessonId]
  const ex = lesson.exercises[item.index]

  const onAnswered = (g: Graded) => {
    logActivity(g.pass, { skill: 'grammar' })
    noteGrammar(lesson.id, promptText(ex), g, 'explain' in ex ? ex.explain : undefined)
    results.current[pos] = g.pass
    setAnswered((n) => n + 1)
  }

  const perLesson = () => {
    const by: Record<string, { ok: number; n: number; goals: GoalTally }> = {}
    items.forEach((it, i) => {
      const t = (by[it.lessonId] ??= { ok: 0, n: 0, goals: {} })
      const ok = !!results.current[i]
      t.n++
      if (ok) t.ok++
      const g = byId[it.lessonId].exercises[it.index].goal
      if (g) {
        const gt = (t.goals[g] ??= { n: 0, ok: 0 })
        gt.n++
        if (ok) gt.ok++
      }
    })
    return by
  }

  const finish = () => {
    const by = perLesson()
    for (const [id, t] of Object.entries(by)) {
      if (t.ok === t.n) recordLesson(id, 1, { goals: t.goals, startStep: TESTED_OUT_STEP })
      else recordGoals(id, t.goals)
    }
    setSummary(by)
  }

  const next = () => {
    if (pos + 1 >= items.length) return finish()
    setPos((p) => p + 1)
  }

  const override = () => {
    results.current[pos] = true
    next()
  }

  if (summary) {
    const by = summary
    const tested = lessons.filter((l) => by[l.id])
    const passed = tested.filter((l) => by[l.id].ok === by[l.id].n)
    const toStudy = tested.filter((l) => by[l.id].ok < by[l.id].n)
    return (
      <FocusShell progress={1} exitTo="/grammar" label={`${level} check`} count={`${items.length}/${items.length}`}>
        <Stack align="center" ta="center" gap={8} pt={32}>
          <ShieldCheck size={40} color={`var(--mantine-color-${passed.length ? 'green' : 'orange'}-filled)`} aria-hidden />
          <Text className="fr tnum" fz={56} fw={600} lh={1}>
            {passed.length}/{tested.length}
          </Text>
          <Title order={1} fz={26} fw={600}>
            lessons tested out
          </Title>
          <Text c="dimmed" maw={480}>
            {passed.length
              ? 'Those are now marked as mastered and will come back for a first review in a week.'
              : 'Nothing tested out this time.'}{' '}
            {toStudy.length ? 'Start with the lessons below. Each one marks the goals you missed.' : 'You know this level. Bravo !'}
          </Text>
          <Group justify="center" mt={16}>
            {toStudy[0] ? (
              <Button size="lg" onClick={() => navigate(`/grammar/${toStudy[0].id}`)} autoFocus>
                Study: {toStudy[0].title}
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate('/grammar')} autoFocus>
                Back to grammar
              </Button>
            )}
          </Group>
          <ResultList title="By lesson">
            {tested.map((l, i) => {
              const ok = by[l.id].ok === by[l.id].n
              return (
                <ResultRow key={l.id} first={i === 0}>
                  <Group wrap="nowrap" gap="sm">
                    {ok ? (
                      <CheckCircle2 size={18} color="var(--mantine-color-green-filled)" aria-hidden />
                    ) : (
                      <CircleDashed size={18} color="var(--mantine-color-orange-filled)" aria-hidden />
                    )}
                    <Anchor component={Link} to={`/grammar/${l.id}`} fz={15} fw={550} style={{ flex: 1 }} c="var(--mantine-color-text)">
                      {l.title}
                    </Anchor>
                    <Badge color={ok ? 'green' : 'orange'} variant="light">
                      {ok ? 'Tested out' : 'Study'}
                    </Badge>
                  </Group>
                </ResultRow>
              )
            })}
          </ResultList>
        </Stack>
      </FocusShell>
    )
  }

  return (
    <FocusShell progress={pos / items.length} count={`${pos + 1}/${items.length}`} exitTo="/grammar" label={`${level} check`}>
      <GrammarQuestion
        key={pos}
        ex={ex}
        context={
          <Group gap={8} mb={10}>
            <LevelBadge level={level} />
            <Box>
              <Text size="sm" c="dimmed">
                {lesson.title}
              </Text>
            </Box>
          </Group>
        }
        onAnswered={onAnswered}
        onContinue={next}
        onOverride={override}
      />
    </FocusShell>
  )
}
