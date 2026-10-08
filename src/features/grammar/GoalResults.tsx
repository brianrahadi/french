import { Link } from 'react-router'
import { Anchor, Box, Button, Card, Group, Text, Title } from '@mantine/core'
import { AlertCircle, CheckCircle2, Circle, Target } from 'lucide-react'
import type { Lesson } from '../../data/types'
import type { GoalTally, LessonProgress } from '../../lib/store'
import { ResultList, ResultRow } from './MistakeList'
import { GOAL_LABEL, goalStates, type GoalState } from './goals'

const ICON: Record<GoalState, React.ReactNode> = {
  solid: <CheckCircle2 size={18} color="var(--mantine-color-green-filled)" aria-hidden />,
  shaky: <AlertCircle size={18} color="var(--mantine-color-orange-filled)" aria-hidden />,
  untested: <Circle size={18} color="var(--mantine-color-dimmed)" aria-hidden />,
}

const sectionLink = (lesson: Lesson, section?: number) => `/grammar/${lesson.id}${section !== undefined ? `#s${section}` : ''}`
const goalLink = (lesson: Lesson, goal: string) => `/grammar/${lesson.id}/practice?mode=goal&goal=${goal}`

/** After a session: how each goal went, with links to re-read or drill the ones that slipped. */
export function GoalResults({ lesson, tally }: { lesson: Lesson; tally: GoalTally }) {
  const rows = lesson.goals.filter((g) => tally[g.id]?.n)
  if (!rows.length) return null
  return (
    <ResultList title="By goal">
      {rows.map((g, i) => {
        const t = tally[g.id]
        const ok = t.ok === t.n
        return (
          <ResultRow key={g.id} first={i === 0}>
            <Group wrap="nowrap" align="flex-start" gap="sm">
              <Box pt={2}>{ICON[ok ? 'solid' : 'shaky']}</Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fz={15} fw={550}>
                  {g.text}
                </Text>
                {!ok && (
                  <Group gap={14} mt={4}>
                    <Anchor component={Link} to={sectionLink(lesson, g.section)} fz={13.5}>
                      Re-read
                    </Anchor>
                    <Anchor component={Link} to={goalLink(lesson, g.id)} fz={13.5}>
                      Practise this goal
                    </Anchor>
                  </Group>
                )}
              </Box>
              <Text className="tnum" fz={14} c={ok ? 'dimmed' : 'orange'} fw={600}>
                {t.ok}/{t.n}
              </Text>
            </Group>
          </ResultRow>
        )
      })}
    </ResultList>
  )
}

/** On the lesson page: what the lesson teaches, and where you stand on each point. */
export function GoalChecklist({ lesson, progress }: { lesson: Lesson; progress?: LessonProgress }) {
  const states = goalStates(lesson, progress)
  const solid = Object.values(states).filter((s) => s === 'solid').length
  const tested = Object.values(states).some((s) => s !== 'untested')
  return (
    <Card component="section" aria-labelledby="goals-title" mb={30} padding="md">
      <Group justify="space-between" mb={8} gap="xs">
        <Group gap={8}>
          <Target size={18} aria-hidden />
          <Title order={2} fz={16} fw={680} id="goals-title">
            {tested ? 'Your goals' : 'In this lesson you’ll learn to'}
          </Title>
        </Group>
        {tested && (
          <Text size="sm" c="dimmed" className="tnum">
            {solid}/{lesson.goals.length} solid
          </Text>
        )}
      </Group>
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {lesson.goals.map((g) => {
          const st = states[g.id]
          return (
            <Group component="li" key={g.id} wrap="nowrap" gap="sm" py={6} align="flex-start">
              <Box pt={2} title={GOAL_LABEL[st]}>
                {ICON[st]}
                <span className="sr-only">{GOAL_LABEL[st]}: </span>
              </Box>
              <Anchor href={g.section !== undefined ? `#s${g.section}` : undefined} c="var(--mantine-color-text)" fz={15} style={{ flex: 1 }}>
                {g.text}
              </Anchor>
              {st === 'shaky' && (
                <Button component={Link} to={goalLink(lesson, g.id)} size="compact-sm" variant="light" color="orange">
                  Practise
                </Button>
              )}
            </Group>
          )
        })}
      </Box>
    </Card>
  )
}

/** A compact row of dots, one per goal, for lesson lists. */
export function GoalDots({ lesson, progress }: { lesson: Lesson; progress?: LessonProgress }) {
  const states = goalStates(lesson, progress)
  if (!Object.values(states).some((s) => s !== 'untested')) return null
  const solid = Object.values(states).filter((s) => s === 'solid').length
  const color: Record<GoalState, string> = {
    solid: 'var(--mantine-color-green-filled)',
    shaky: 'var(--mantine-color-orange-filled)',
    untested: 'var(--mantine-color-default-border)',
  }
  return (
    <Group gap={3} wrap="nowrap" aria-label={`${solid} of ${lesson.goals.length} goals solid`} role="img">
      {lesson.goals.map((g) => (
        <Box key={g.id} w={7} h={7} style={{ borderRadius: 99, background: color[states[g.id]] }} />
      ))}
    </Group>
  )
}
