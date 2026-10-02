import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Chip, Container, Group, Progress, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core'
import {
  ArrowRight,
  BookOpen,
  Check,
  Headphones,
  Layers,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Play,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { LESSON_BY_ID } from '../../data/grammar'
import { Empty, Kbd, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore, type Mistake, type MistakeSource } from '../../lib/store'
import { ago } from '../../lib/date'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { speechSupported } from '../../lib/speech'
import { LISTEN_CATEGORIES } from '../../lib/french'
import { displayFr, frTypo } from '../../lib/words'
import { buildWeakPlan } from '../session/plan'
import { computeWeakSpots } from './weak'

export const SOURCE_INFO: Record<MistakeSource, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  grammar: { label: 'Grammar', icon: BookOpen },
  verbs: { label: 'Verbs', icon: PenLine },
  words: { label: 'Words', icon: Layers },
  writing: { label: 'Writing', icon: NotebookPen },
  talk: { label: 'Conversation', icon: MessagesSquare },
  listening: { label: 'Listening', icon: Headphones },
  speaking: { label: 'Speaking', icon: Mic },
}

export default function WeakPage() {
  useDocumentTitle('Weak spots')
  const navigate = useNavigate()
  const mistakes = useStore((s) => s.mistakes)
  const skills = useStore((s) => s.skills)
  const conj = useStore((s) => s.conj)
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const resolveMistake = useStore((s) => s.resolveMistake)
  const weak = useMemo(() => computeWeakSpots({ mistakes, skills, conj, cards, customWords }), [mistakes, skills, conj, cards, customWords])
  const plan = useMemo(
    () => buildWeakPlan(useStore.getState(), Math.random, { tts: speechSupported }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weak],
  )
  const [filter, setFilter] = useState<MistakeSource | 'all'>('all')
  const [limit, setLimit] = useState(12)
  const hasSession = plan.items.length > 0
  useHotkeys({ Enter: () => hasSession && navigate('/session?mode=weak') })

  const recent = groupRows(weak.recent.filter((m) => filter === 'all' || m.source === filter))
  const sourcesPresent = [...new Set(weak.recent.map((m) => m.source))]
  const nothing = !weak.recent.length && !weak.lessons.length && !weak.verbs.length && !weak.words.length

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Points faibles"
        title="Weak spots"
        subtitle="What keeps tripping you up — collected from drills, flashcards, writing, conversations, dictation and speaking. Recent mistakes count most; a run of right answers makes a spot fade."
      />

      {nothing ? (
        <Card>
          <Empty icon={<Target size={32} />} title="Nothing here yet">
            As you practice, mistakes from every exercise are gathered here, grouped by the rule behind them.{' '}
            <Anchor component={Link} to="/" inherit>
              Start today’s session
            </Anchor>
          </Empty>
        </Card>
      ) : (
        <Card component="section" aria-labelledby="weak-title" padding="xl">
          <Group gap="lg" wrap="wrap">
            <ThemeIcon color="pink" variant="light" size={52} radius="md">
              <Target size={26} aria-hidden />
            </ThemeIcon>
            <Box style={{ flex: '1 1 260px', minWidth: 0 }}>
              <Title id="weak-title" order={2} className="fr" fz={26} fw={600} mb={4}>
                {hasSession ? 'Targeted practice' : 'Looking good'}
              </Title>
              <Text c="dimmed">
                {hasSession
                  ? `${plan.items.length} questions on your weakest points · about ${plan.minutes} min`
                  : 'No weak spot stands out right now. Recent mistakes are listed below.'}
              </Text>
              {hasSession && (
                <Group gap={6} mt="sm">
                  {plan.counts.grammar > 0 && <Badge color="green">{plan.counts.grammar} grammar</Badge>}
                  {plan.counts.conj > 0 && <Badge color="pink">{plan.counts.conj} verbs</Badge>}
                  {plan.counts.reviews > 0 && <Badge color="gray">{plan.counts.reviews} words</Badge>}
                  {plan.counts.fix > 0 && <Badge color="gray">{plan.counts.fix} corrections</Badge>}
                  {plan.counts.listen > 0 && <Badge color="gray">{plan.counts.listen} dictation</Badge>}
                </Group>
              )}
            </Box>
            {hasSession && (
              <Button component={Link} to="/session?mode=weak" size="lg" leftSection={<Play size={18} aria-hidden />} rightSection={<Kbd>↵</Kbd>}>
                Practice
              </Button>
            )}
          </Group>
        </Card>
      )}

      {weak.lessons.length > 0 && (
        <Section id="weak-grammar" title="Grammar points" right={<Count n={weak.lessons.length} />}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {weak.lessons.map((w) => {
              const l = LESSON_BY_ID[w.lessonId]
              const ex = w.examples[0]
              return (
                <Card key={w.lessonId} component="article" display="flex" style={{ flexDirection: 'column' }}>
                  <Group gap={8} mb={6}>
                    <LevelBadge level={l.level} />
                    {w.improving && (
                      <Badge color="green" size="sm" leftSection={<TrendingUp size={12} aria-hidden />}>
                        improving
                      </Badge>
                    )}
                  </Group>
                  <Title order={3} fz="md" fw={650}>
                    {l.title}
                  </Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    {w.count} mistake{w.count > 1 ? 's' : ''} ·{' '}
                    {Object.entries(w.sources)
                      .map(([src, n]) => `${SOURCE_INFO[src as MistakeSource].label.toLowerCase()} ${n}`)
                      .join(', ')}
                  </Text>
                  {ex && (ex.given || ex.expected) && (
                    <div className="weak-example fr" lang="fr">
                      {ex.given && <del>{frTypo(ex.given)}</del>}
                      {ex.given && <ArrowRight size={14} aria-hidden color="var(--mantine-color-dimmed)" />}
                      <ins>{frTypo(ex.expected)}</ins>
                    </div>
                  )}
                  <Group gap={8} mt="auto" pt="sm">
                    <Button component={Link} to={`/grammar/${l.id}`} variant="subtle" size="xs">
                      Lesson
                    </Button>
                    <Button component={Link} to={`/grammar/${l.id}/practice`} variant="default" size="xs" rightSection={<ArrowRight size={14} aria-hidden />}>
                      Practice
                    </Button>
                  </Group>
                </Card>
              )
            })}
          </SimpleGrid>
        </Section>
      )}

      {weak.verbs.length > 0 && (
        <Section
          id="weak-verbs"
          title="Verb forms"
          right={
            <SectionLink
              to={`/conjugation/drill?verbs=${[...new Set(weak.verbs.map((v) => v.inf))].join(',')}&tenses=${[...new Set(weak.verbs.map((v) => v.tense))].join(',')}&n=12`}
            >
              Drill these
            </SectionLink>
          }
        >
          <Card padding={0}>
            {weak.verbs.map((v, i) => (
              <Group key={`${v.inf}|${v.tense}`} gap="sm" wrap="nowrap" px="lg" py="sm" style={i ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}>
                <Anchor component={Link} to={`/verbs/${encodeURIComponent(v.inf)}`} className="fr" lang="fr" fz={17} fw={600} c="var(--mantine-color-text)" miw={90}>
                  {v.inf}
                </Anchor>
                <Text size="sm" c="dimmed">
                  {v.label}
                </Text>
                <Progress
                  ml="auto"
                  w={110}
                  size={7}
                  radius="xl"
                  color="orange"
                  bg="var(--mantine-color-red-light)"
                  value={Math.round(v.accuracy * 100)}
                  aria-label={`${Math.round(v.accuracy * 100)}% right recently`}
                />
                <Text size="sm" c="dimmed" className="tnum" w={40} ta="right">
                  {Math.round(v.accuracy * 100)}%
                </Text>
              </Group>
            ))}
          </Card>
        </Section>
      )}

      {weak.words.length > 0 && (
        <Section id="weak-words" title="Words that keep slipping" right={<Count n={weak.words.length} />}>
          <Card>
            <Group gap={8}>
              {weak.words.map(({ word, lapses }) => (
                <Group
                  key={word.id}
                  component="span"
                  gap={6}
                  wrap="nowrap"
                  pl={4}
                  pr="sm"
                  py={3}
                  bd="1px solid var(--mantine-color-default-border)"
                  bg="var(--mantine-color-default-hover)"
                  style={{ borderRadius: 'var(--mantine-radius-xl)' }}
                  title={`Forgotten ${lapses} times`}
                >
                  <SpeakButton text={displayFr(word)} size="sm" />
                  <span className="fr" lang="fr">
                    {frTypo(displayFr(word))}
                  </span>
                  <Text span size="sm" c="dimmed">
                    {word.en.split(/[,;]/)[0]}
                  </Text>
                </Group>
              ))}
            </Group>
          </Card>
        </Section>
      )}

      {weak.listening.length > 0 && (
        <Section id="weak-listen" title="Listening" right={<SectionLink to="/listening">Dictation</SectionLink>}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {weak.listening.slice(0, 3).map(({ category, count }) => (
              <Card key={category}>
                <Group justify="space-between" mb={6}>
                  <Text fw={700}>{LISTEN_CATEGORIES[category].label}</Text>
                  <Badge color="orange" className="tnum">
                    {count}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {LISTEN_CATEGORIES[category].tip}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Section>
      )}

      {weak.recent.length > 0 && (
        <Section id="weak-recent" title="Recent mistakes">
          {sourcesPresent.length > 1 && (
            <Chip.Group value={filter} onChange={(v) => setFilter(v as MistakeSource | 'all')}>
              <Group gap={6} mb="sm" role="group" aria-label="Filter by source">
                <Chip value="all" size="xs">
                  All
                </Chip>
                {sourcesPresent.map((src) => (
                  <Chip key={src} value={src} size="xs">
                    {SOURCE_INFO[src].label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          )}
          <Card component="ul" padding={0} m={0} style={{ listStyle: 'none' }}>
            {recent.slice(0, limit).map((row, i) =>
              row.length === 1 ? (
                <MistakeRow key={row[0].id} m={row[0]} first={i === 0} onDismiss={() => resolveMistake(row[0].id)} />
              ) : (
                <SentenceRow key={row[0].id} ms={row} first={i === 0} onDismiss={() => row.forEach((m) => resolveMistake(m.id))} />
              ),
            )}
          </Card>
          {recent.length > limit && (
            <Button variant="subtle" size="xs" mt="xs" onClick={() => setLimit(recent.length)}>
              Show all {recent.length}
            </Button>
          )}
        </Section>
      )}
    </Container>
  )
}

function Section({ id, title, right, children }: { id: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Box component="section" mt="xl" aria-labelledby={id}>
      <Group justify="space-between" mb="sm">
        <Title id={id} order={2} size="h5" c="dimmed" tt="uppercase">
          {title}
        </Title>
        {right}
      </Group>
      {children}
    </Box>
  )
}

function Count({ n }: { n: number }) {
  return (
    <Text size="sm" fw={600} c="dimmed" className="tnum">
      {n}
    </Text>
  )
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Anchor component={Link} to={to} size="sm" fw={600} display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
      {children} <ArrowRight size={14} aria-hidden />
    </Anchor>
  )
}

/** Mistakes logged together for one dictation or speaking sentence become one row. */
function groupRows(ms: Mistake[]): Mistake[][] {
  const rows: Mistake[][] = []
  for (const m of ms) {
    const last = rows[rows.length - 1]
    const head = last?.[0]
    if (head && m.ref && head.ref === m.ref && head.source === m.source && head.at === m.at && (m.source === 'listening' || m.source === 'speaking'))
      last.push(m)
    else rows.push([m])
  }
  return rows
}

const rowStyle = (first: boolean) => (first ? undefined : { borderTop: '1px solid var(--mantine-color-default-border)' })

function SourceIcon({ source }: { source: MistakeSource }) {
  const Icon = SOURCE_INFO[source].icon
  return (
    <ThemeIcon variant="light" color="gray" size={30} radius="md" title={SOURCE_INFO[source].label}>
      <Icon size={16} />
    </ThemeIcon>
  )
}

function SentenceRow({ ms, first, onDismiss }: { ms: Mistake[]; first: boolean; onDismiss: () => void }) {
  const head = ms[0]
  const ordered = [...ms].reverse()
  return (
    <Group component="li" align="flex-start" gap="sm" wrap="nowrap" px={18} py={14} style={rowStyle(first)}>
      <SourceIcon source={head.source} />
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Text className="fr" lang="fr" fz={16.5} mb={6}>
          {frTypo(head.prompt ?? '')}
        </Text>
        <Group gap={6} mb={4} className="fr" lang="fr">
          {ordered.map((m) =>
            m.given ? (
              <span key={m.id} className="mw">
                <del>{frTypo(m.given)}</del> <ArrowRight size={12} aria-hidden color="var(--mantine-color-dimmed)" /> <ins>{frTypo(m.expected)}</ins>
              </span>
            ) : (
              <span key={m.id} className="mw mw--miss" title={head.source === 'speaking' ? 'not understood' : 'missed'}>
                {frTypo(m.expected)}
              </span>
            ),
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {SOURCE_INFO[head.source].label} · {ago(head.at)} ·{' '}
          {head.source === 'speaking' ? `${ms.length} word${ms.length > 1 ? 's' : ''} not understood` : `${ms.length} word${ms.length > 1 ? 's' : ''} to check`}
        </Text>
      </Box>
      <ActionIcon variant="subtle" color="gray" size="sm" onClick={onDismiss} aria-label="Dismiss" title="Got it — dismiss">
        <X size={16} aria-hidden />
      </ActionIcon>
    </Group>
  )
}

function MistakeRow({ m, first, onDismiss }: { m: Mistake; first: boolean; onDismiss: () => void }) {
  const lesson = m.skill.startsWith('lesson:') ? LESSON_BY_ID[m.skill.slice(7)] : undefined
  return (
    <Group component="li" align="flex-start" gap="sm" wrap="nowrap" px={18} py={14} style={rowStyle(first)}>
      <SourceIcon source={m.source} />
      <Box style={{ minWidth: 0, flex: 1 }}>
        {m.prompt && (
          <Text size="sm" c="dimmed" truncate="end" mb={2} lang={m.source === 'words' || m.source === 'verbs' ? undefined : 'fr'}>
            {frTypo(m.prompt)}
          </Text>
        )}
        <Box className="fix__change fr" lang="fr" fz={16}>
          {m.given ? (
            <del>{frTypo(m.given)}</del>
          ) : (
            <Text span size="sm" c="dimmed">
              (no answer)
            </Text>
          )}
          <ArrowRight size={14} aria-hidden color="var(--mantine-color-dimmed)" />
          <ins>{frTypo(m.expected)}</ins>
        </Box>
        <Text size="sm" c="dimmed">
          {SOURCE_INFO[m.source].label} · {ago(m.at)}
          {lesson && (
            <>
              {' · '}
              <Anchor component={Link} to={`/grammar/${lesson.id}`} inherit>
                {lesson.title}
              </Anchor>
            </>
          )}
          {m.source === 'listening' && m.skill.startsWith('listen:') && (
            <> · {LISTEN_CATEGORIES[m.skill.slice(7) as keyof typeof LISTEN_CATEGORIES]?.label}</>
          )}
        </Text>
      </Box>
      <ActionIcon variant="subtle" color="gray" size="sm" onClick={onDismiss} aria-label="Dismiss this mistake" title="Got it — dismiss">
        {m.fixable ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
      </ActionIcon>
    </Group>
  )
}
