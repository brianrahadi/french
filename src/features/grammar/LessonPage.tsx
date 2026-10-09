import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Blockquote, Box, Button, Card, Container, Group, List, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { ArrowRight, Clock, Dumbbell, ShieldCheck } from 'lucide-react'
import { LESSON_BY_ID, LESSONS, nextLesson } from '../../data/grammar'
import type { Block } from '../../data/types'
import { Callout, Kbd, LevelBadge, Rich } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHideOnScroll, useHotkeys } from '../../lib/hooks'
import { useMediaQuery } from '@mantine/hooks'
import { lessonStatus } from './status'
import { frTypo } from '../../lib/words'
import { relativeDay, parseDayKey } from '../../lib/date'
import { GoalChecklist } from './GoalResults'
import { checkSize, defaultMode, REVIEW_SIZE } from './goals'

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return (
        <Text fz={16} lh={1.65} maw="68ch">
          <Rich text={block.text} />
        </Text>
      )
    case 'list':
      return (
        <List spacing={8} fz={16} lh={1.6} pl={4}>
          {block.items.map((it, i) => (
            <List.Item key={i}>
              <Rich text={it} />
            </List.Item>
          ))}
        </List>
      )
    case 'table':
      return (
        <Table.ScrollContainer minWidth={300} type="native">
          <Table withTableBorder captionSide="bottom" fz={15} verticalSpacing={10} horizontalSpacing={14} w="auto" miw={300}>
            {block.caption && (
              <Table.Caption ta="left" fz={13}>
                {block.caption}
              </Table.Caption>
            )}
            <Table.Thead bg="var(--mantine-color-default-hover)">
              <Table.Tr>
                {block.head.map((h, i) => (
                  <Table.Th key={i} scope="col" fz={12.5} c="dimmed">
                    {h}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {block.rows.map((r, i) => (
                <Table.Tr key={i}>
                  {r.map((c, j) => (
                    <Table.Td key={j} c={j === 0 ? 'dimmed' : undefined} style={{ verticalAlign: 'top' }}>
                      {c}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )
    case 'examples':
      return (
        <Blockquote color="accent" p="xs" pl="sm" radius="md">
          <Stack component="ul" gap={10} m={0} p={0} style={{ listStyle: 'none' }}>
            {block.items.map((e, i) => (
              <Group component="li" key={i} gap={6} align="flex-start" wrap="nowrap">
                <SpeakButton text={e.fr.replace(/\s*[/→]\s*/g, '. ')} size="sm" label={`Listen: ${e.fr}`} />
                <div>
                  <Text className="fr" lang="fr" fz={18} lh={1.45}>
                    {frTypo(e.fr)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {e.en}
                  </Text>
                </div>
              </Group>
            ))}
          </Stack>
        </Blockquote>
      )
    case 'tip':
      return (
        <Callout kind="tip">
          <Rich text={block.text} />
        </Callout>
      )
    case 'warn':
      return (
        <Callout kind="warn">
          <Rich text={block.text} />
        </Callout>
      )
  }
}

export default function LessonPage() {
  const { id = '' } = useParams()
  const { hash } = useLocation()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const p = useStore((s) => s.lessons[id])
  useDocumentTitle(lesson?.title ?? 'Lesson')
  useHotkeys({ p: () => lesson && navigate(`/grammar/${lesson.id}/practice`) })
  // Same breakpoint as the app shell's bottom nav. On phones the practice bar is compact and
  // gets out of the way while reading; it comes back on scroll up and at the end of the lesson.
  const withBottomNav = useMediaQuery('(max-width: 860px)') ?? false
  const barHidden = useHideOnScroll({ enabled: withBottomNav })

  // “Re-read” links from practice results point at a section (#s2).
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash, id])

  if (!lesson) {
    return (
      <Container size="var(--page-w)" py="xl">
        <PageHeader back={{ to: '/grammar', label: 'Grammar' }} title="Lesson not found" />
      </Container>
    )
  }

  const status = lessonStatus(p)
  const mode = defaultMode(p)
  const nl = nextLesson(lesson.id)
  const index = LESSONS.findIndex((l) => l.id === lesson.id)
  const canTestOut = status === 'new' || status === 'started'
  const practiceHint =
    mode === 'review'
      ? `${Math.min(REVIEW_SIZE, lesson.exercises.length)} questions · weakest goals first`
      : mode === 'learn'
        ? `${lesson.exercises.length} exercises · goal by goal`
        : `${lesson.exercises.length} exercises · instant feedback`

  return (
    <Container size="var(--page-w-narrow)" py="xl">
      <PageHeader back={{ to: '/grammar', label: 'Grammar' }} title={lesson.titleFr} fr subtitle={lesson.title}>
        <Text mt={8} maw={640}>
          {lesson.summary}
        </Text>
        <Group gap={10} mt="sm">
          <LevelBadge level={lesson.level} />
          <Text size="sm" c="dimmed">
            Lesson {index + 1} of {LESSONS.length}
          </Text>
          <Group gap={4} c="dimmed" fz="sm">
            <Clock size={14} aria-hidden /> {lesson.minutes} min
          </Group>
          {p?.attempts ? (
            <Text size="sm" c="dimmed">
              Best score <strong className="tnum">{Math.round(p.best * 100)}%</strong>
              {p.nextReview && status !== 'started' && <> · next review {relativeDay(parseDayKey(p.nextReview))}</>}
            </Text>
          ) : null}
        </Group>
        {canTestOut && lesson.goals.length > 0 && (
          <Button
            component={Link}
            to={`/grammar/${lesson.id}/practice?mode=check`}
            variant="light"
            mt="md"
            leftSection={<ShieldCheck size={17} aria-hidden />}
          >
            Already know this? Take the {checkSize(lesson)}-question check
          </Button>
        )}
      </PageHeader>

      {lesson.goals.length > 0 && <GoalChecklist lesson={lesson} progress={p} />}

      {lesson.sections.length > 2 && (
        <Group component="nav" aria-label="On this page" gap={8} mb={26} visibleFrom="xs">
          {lesson.sections.map((s, i) => (
            <Button key={i} component="a" href={`#s${i}`} variant="default" radius="xl" size="compact-sm" fw={500}>
              {s.heading}
            </Button>
          ))}
        </Group>
      )}

      <Stack component="article" gap={34}>
        {lesson.sections.map((s, i) => (
          <Box component="section" key={i} id={`s${i}`} style={{ scrollMarginTop: 20 }}>
            <Title order={2} fz={19} fw={680} mb={14}>
              {s.heading}
            </Title>
            <Stack gap={14} align="flex-start">
              {s.blocks.map((b, j) => (
                <Box key={j} maw="100%" w={b.type === 'table' ? undefined : '100%'}>
                  <BlockView block={b} />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      {nl && (
        <Card component={Link} to={`/grammar/${nl.id}`} mt="xl">
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <div>
              <Text size="sm" c="dimmed">
                Next lesson
              </Text>
              <Text fw={650}>{nl.title}</Text>
            </div>
            <ArrowRight size={18} aria-hidden />
          </Group>
        </Card>
      )}

      <Box
        className="practice-bar"
        data-hidden={barHidden || undefined}
        pos="sticky"
        bottom={withBottomNav ? 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 8px)' : 16}
        mt={32}
        style={{ zIndex: 5 }}
      >
        <Paper
          withBorder
          shadow="lg"
          radius="lg"
          p={withBottomNav ? 6 : 'sm'}
          pl={withBottomNav ? 'md' : 'lg'}
          style={{ background: 'color-mix(in srgb, var(--mantine-color-body) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <Group justify="space-between" wrap="nowrap" gap="md">
            <div style={{ minWidth: 0 }}>
              <Text fw={700} size={withBottomNav ? 'sm' : undefined} truncate>
                {mode === 'review' ? 'Time for a quick review' : mode === 'practice' ? 'Practice again' : 'Ready to practice?'}
              </Text>
              {!withBottomNav && (
                <Text size="sm" c="dimmed">
                  {practiceHint}
                </Text>
              )}
            </div>
            <Button
              component={Link}
              to={`/grammar/${lesson.id}/practice`}
              size={withBottomNav ? 'sm' : 'lg'}
              leftSection={<Dumbbell size={withBottomNav ? 16 : 18} aria-hidden />}
              rightSection={withBottomNav ? undefined : <Kbd>P</Kbd>}
              style={{ flexShrink: 0 }}
            >
              {mode === 'review' ? 'Review' : 'Practice'}
            </Button>
          </Group>
        </Paper>
      </Box>
    </Container>
  )
}
