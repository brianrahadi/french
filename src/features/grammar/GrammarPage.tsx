import { Link } from 'react-router'
import { Badge, Box, Card, Container, Group, NavLink, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core'
import { ArrowRight, CheckCircle2, Circle, CircleDashed, Clock } from 'lucide-react'
import { lessonsByLevel, LESSONS } from '../../data/grammar'
import { LEVEL_INFO, LEVELS } from '../../data/types'
import { LevelBadge, ProgressBar } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { dueLessons, lessonStatus, nextUp, type LessonStatus } from './status'

const STATUS_ICON: Record<LessonStatus, React.ReactNode> = {
  new: <Circle size={20} color="var(--mantine-color-dimmed)" aria-hidden />,
  started: <CircleDashed size={20} color="var(--mantine-color-orange-filled)" aria-hidden />,
  mastered: <CheckCircle2 size={20} color="var(--mantine-color-green-filled)" aria-hidden />,
  due: <Clock size={20} color="var(--mantine-primary-color-filled)" aria-hidden />,
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  new: 'Not started',
  started: 'In progress',
  mastered: 'Mastered',
  due: 'Review due',
}

function HeroCard({ to, icon, color, title, meta }: { to: string; icon: React.ReactNode; color?: string; title: React.ReactNode; meta: React.ReactNode }) {
  return (
    <Card component={Link} to={to}>
      <Group wrap="nowrap" gap="md">
        <ThemeIcon variant="light" color={color} size={44} radius="md">
          {icon}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={650}>{title}</Text>
          <Text size="sm" c="dimmed">
            {meta}
          </Text>
        </Box>
        <Text c="dimmed" component="span" display="flex">
          <ArrowRight size={20} aria-hidden />
        </Text>
      </Group>
    </Card>
  )
}

export default function GrammarPage() {
  useDocumentTitle('Grammar')
  const progress = useStore((s) => s.lessons)
  const due = dueLessons(progress)
  const up = nextUp(progress)
  const mastered = LESSONS.filter((l) => {
    const s = lessonStatus(progress[l.id])
    return s === 'mastered' || s === 'due'
  }).length

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Grammaire"
        title="Grammar"
        subtitle="Short explanations, then practice with instant feedback. Score 80% to master a lesson — it comes back for spaced review so you don’t forget it."
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {due.length > 0 && (
          <HeroCard
            to={`/grammar/${due[0].id}/practice`}
            icon={<Clock size={22} aria-hidden />}
            title={
              <>
                {due.length} review{due.length > 1 ? 's' : ''} due
              </>
            }
            meta={<>Next: {due[0].title}</>}
          />
        )}
        {up && (
          <HeroCard
            to={`/grammar/${up.id}`}
            icon={<ArrowRight size={22} aria-hidden />}
            color="green"
            title={
              <>
                {progress[up.id] ? 'Continue' : 'Up next'}: {up.title}
              </>
            }
            meta={
              <>
                {up.level} · {up.minutes} min · {up.exercises.length} exercises
              </>
            }
          />
        )}
        <Card style={{ gridColumn: due.length && up ? '1 / -1' : undefined }}>
          <Group justify="space-between" mb={10}>
            <Text fw={650}>Overall progress</Text>
            <Text c="dimmed" className="tnum">
              {mastered} / {LESSONS.length} mastered
            </Text>
          </Group>
          <ProgressBar value={mastered / LESSONS.length} label="Lessons mastered" variant="success" />
        </Card>
      </SimpleGrid>

      {LEVELS.map((level) => {
        const lessons = lessonsByLevel(level)
        const done = lessons.filter((l) => ['mastered', 'due'].includes(lessonStatus(progress[l.id]))).length
        return (
          <Box component="section" key={level} mt="xl" aria-labelledby={`lvl-${level}`}>
            <Group gap="sm">
              <LevelBadge level={level} />
              <Title order={2} size="h4" id={`lvl-${level}`}>
                {LEVEL_INFO[level].name}
              </Title>
              <Text size="sm" c="dimmed" className="tnum" ml="auto">
                {done}/{lessons.length}
              </Text>
            </Group>
            <Text size="sm" c="dimmed" mt={4} mb="sm">
              {LEVEL_INFO[level].description}
            </Text>
            <Card padding={0}>
              {lessons.map((l, i) => {
                const p = progress[l.id]
                const st = lessonStatus(p)
                return (
                  <NavLink
                    key={l.id}
                    component={Link}
                    to={`/grammar/${l.id}`}
                    px="md"
                    py="sm"
                    style={i > 0 ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}
                    leftSection={
                      <>
                        <span title={STATUS_LABEL[st]}>{STATUS_ICON[st]}</span>
                        <span className="sr-only">{STATUS_LABEL[st]}.</span>
                      </>
                    }
                    label={
                      <Text fw={600}>
                        {l.title}
                      </Text>
                    }
                    description={
                      <Text className="fr" lang="fr" size="sm" c="dimmed" truncate>
                        {l.titleFr}
                      </Text>
                    }
                    rightSection={
                      <Group gap={8} wrap="nowrap">
                        {st === 'due' && <Badge color="indigo">Review</Badge>}
                        {p && (
                          <Badge color={p.best >= 0.8 ? 'green' : 'orange'} className="tnum" title="Best score">
                            {Math.round(p.best * 100)}%
                          </Badge>
                        )}
                        <Text size="sm" c="dimmed" visibleFrom="xs" miw={44} ta="right">
                          {l.minutes} min
                        </Text>
                      </Group>
                    }
                  />
                )
              })}
            </Card>
          </Box>
        )
      })}
    </Container>
  )
}
