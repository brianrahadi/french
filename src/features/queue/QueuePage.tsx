import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Anchor, Badge, Box, Button, Card, Chip, Container, Group, List, Pagination, Progress, SegmentedControl, SimpleGrid, Stack, Table, Tabs, Text, Tooltip } from '@mantine/core'
import { Play } from 'lucide-react'
import { LEVELS, type Level } from '../../data/types'
import { PageHeader } from '../../components/PageHeader'
import { LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useCurrentLevel } from '../../lib/level'
import { dayKey } from '../../lib/date'
import { useDocumentTitle } from '../../lib/hooks'
import { speechSupported } from '../../lib/speech'
import { recognitionSupported } from '../../lib/recognition'
import { buildMixedPlan, MIX } from '../session/plan'
import { loadSession } from '../session/saved'
import {
  explainSession,
  LEVEL_KIND_LABEL,
  levelSummary,
  newWordSchedule,
  reviewSchedule,
  reviewsPerDay,
  SESSION_KIND_LABEL,
  sessionRules,
  type ItemStatus,
  type LevelKind,
  type SessionKind,
} from './queue'

type Tab = 'session' | 'level' | 'reviews' | 'new'
const TABS: [Tab, string][] = [
  ['session', 'Today’s session'],
  ['level', 'Level'],
  ['reviews', 'Reviews'],
  ['new', 'New words'],
]

const PAGE = 50

export default function QueuePage() {
  useDocumentTitle('Study queue')
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some(([t]) => t === params.get('tab')) ? params.get('tab') : 'session') as Tab
  const setTab = (t: Tab) => setParams((p) => ({ ...Object.fromEntries(p), tab: t }), { replace: true })

  return (
    <Container size={1040} py="xl">
      <PageHeader eyebrow="File d’attente" title="Study queue" subtitle="Why the app picks what it picks, and everything still ahead." />
      <Tabs value={tab} onChange={(v) => v && setTab(v as Tab)}>
        <Tabs.List mb="lg" style={{ flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(([id, label]) => (
            <Tabs.Tab key={id} value={id}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tab === 'session' && <SessionTab />}
        {tab === 'level' && <LevelTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'new' && <NewWordsTab />}
      </Tabs>
    </Container>
  )
}

// ───────────── shared ─────────────

/** A table that shows one page of rows at a time, with the count and page controls under it. */
function Paged<T>({ rows, head, row, minWidth = 640, empty }: { rows: T[]; head: ReactNode[]; row: (r: T) => ReactNode; minWidth?: number; empty: string }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const p = Math.min(page, pages)
  const slice = rows.slice((p - 1) * PAGE, p * PAGE)
  if (!rows.length)
    return (
      <Text c="dimmed" size="sm" py="md">
        {empty}
      </Text>
    )
  return (
    <>
      <Card padding={0}>
        <Table.ScrollContainer minWidth={minWidth}>
          <Table verticalSpacing={8} horizontalSpacing="md" fz="sm" highlightOnHover striped>
            <Table.Thead>
              <Table.Tr>
                {head.map((h, i) => (
                  <Table.Th key={i}>{h}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{slice.map(row)}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
      <Group justify="space-between" mt="sm" gap="sm">
        <Text size="sm" c="dimmed" className="tnum">
          {(p - 1) * PAGE + 1}–{Math.min(p * PAGE, rows.length)} of {rows.length.toLocaleString()}
        </Text>
        {pages > 1 && (
          <Pagination
            total={pages}
            value={p}
            onChange={(n) => {
              setPage(n)
              document.getElementById('main')?.scrollIntoView({ block: 'start' })
            }}
            size="sm"
            withEdges
          />
        )}
      </Group>
    </>
  )
}

const STATUS: Record<ItemStatus, [string, string | undefined]> = { done: ['Done', 'green'], started: ['Started', 'orange'], todo: ['To do', undefined] }
function StatusBadge({ s }: { s: ItemStatus }) {
  const [label, color] = STATUS[s]
  return (
    <Badge size="sm" variant={color ? 'light' : 'default'} color={color} tt="none">
      {label}
    </Badge>
  )
}

function Cell({ title, sub, to }: { title: string; sub?: string; to?: string }) {
  return (
    <Box miw={0}>
      {to ? (
        <Anchor component={Link} to={to} size="sm" fw={600} c="var(--mantine-color-text)">
          {title}
        </Anchor>
      ) : (
        <Text size="sm" fw={600}>
          {title}
        </Text>
      )}
      {sub && (
        <Text size="xs" c="dimmed">
          {sub}
        </Text>
      )}
    </Box>
  )
}

const fmtDay = (day: string, today: string, tomorrow: string) =>
  day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : new Date(`${day}T12:00:00`).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

function useDays() {
  const [now] = useState(() => new Date())
  return { now, today: dayKey(now), tomorrow: dayKey(new Date(now.getTime() + 86_400_000)) }
}

// ───────────── Today's session ─────────────

const SESSION_COLOR: Record<SessionKind, string> = { review: 'accent', new: 'blue', grammar: 'green', verb: 'pink', fix: 'pink', listen: 'grape', say: 'teal' }

function SessionTab() {
  const s = useStore()
  // The session in progress if there is one; otherwise the one Start would build now.
  const [saved] = useState(() => loadSession(useStore.getState()))
  const [fresh] = useState(() => buildMixedPlan(useStore.getState(), Math.random, { tts: speechSupported, asr: recognitionSupported }))
  const plan = saved?.plan ?? fresh
  const rows = useMemo(() => explainSession(plan, s), [plan, s])
  const rules = sessionRules(plan, s)
  const [kind, setKind] = useState<SessionKind | 'all'>('all')
  const kinds = (Object.keys(SESSION_KIND_LABEL) as SessionKind[]).filter((k) => rows.some((r) => r.kind === k))
  const shown = kind === 'all' ? rows : rows.filter((r) => r.kind === kind)

  return (
    <Stack gap="md">
      <Card padding="md">
        <Group justify="space-between" align="flex-start" gap="md">
          <Box style={{ flex: '1 1 420px' }} miw={0}>
            <Text fw={650} mb={4}>
              {saved ? `Your session in progress: ${rows.length} items` : `${rows.length} items, about ${plan.minutes} min`}
            </Text>
            <List size="sm" spacing={2} c="dimmed">
              {rules.map((r) => (
                <List.Item key={r}>{r}</List.Item>
              ))}
            </List>
            {!saved && (
              <Text size="xs" c="dimmed" mt={6}>
                Which questions are picked within a lesson, and some refreshers, are shuffled each time a session starts.
              </Text>
            )}
          </Box>
          {rows.length > 0 && (
            <Button component={Link} to="/session" leftSection={<Play size={16} aria-hidden />}>
              {saved ? 'Continue' : 'Start'}
            </Button>
          )}
        </Group>
      </Card>
      {kinds.length > 1 && (
        <KindChips value={kind} onChange={setKind} options={kinds.map((k) => [k, SESSION_KIND_LABEL[k], rows.filter((r) => r.kind === k).length])} />
      )}
      <Paged
        key={kind}
        rows={shown}
        empty="Nothing is due or new right now."
        head={['#', 'Type', 'Item', 'Why it’s here']}
        row={(r) => (
          <Table.Tr key={r.n}>
            <Table.Td c="dimmed" className="tnum" w={44}>
              {r.n}
            </Table.Td>
            <Table.Td w={110}>
              <Badge size="sm" variant="light" color={SESSION_COLOR[r.kind]} tt="none">
                {SESSION_KIND_LABEL[r.kind]}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={600} lang="fr">
                {r.title}
              </Text>
            </Table.Td>
            <Table.Td c="dimmed">{r.reason}</Table.Td>
          </Table.Tr>
        )}
      />
    </Stack>
  )
}

function KindChips<K extends string>({ value, onChange, options }: { value: K | 'all'; onChange: (k: K | 'all') => void; options: [K, string, number][] }) {
  return (
    <Chip.Group value={value as string} onChange={(v: string) => onChange(v as K | 'all')}>
      <Group gap={6}>
        <Chip value="all" size="sm">
          All
        </Chip>
        {options.map(([k, label, n]) => (
          <Chip key={k} value={k} size="sm">
            {label} <span className="tnum">· {n.toLocaleString()}</span>
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  )
}

// ───────────── Level ─────────────

function LevelTab() {
  const s = useStore()
  const current = useCurrentLevel()
  const [params, setParams] = useSearchParams()
  const level = (LEVELS.includes(params.get('level') as Level) ? params.get('level') : current) as Level
  const setLevel = (l: Level) => setParams((p) => ({ ...Object.fromEntries(p), level: l }), { replace: true })
  const sum = useMemo(() => levelSummary(level, s), [level, s])
  const [kind, setKind] = useState<LevelKind | 'all'>('all')
  const [status, setStatus] = useState<ItemStatus | 'left'>('left')
  const [countedOnly, setCountedOnly] = useState(false)
  const kinds = (Object.keys(LEVEL_KIND_LABEL) as LevelKind[]).filter((k) => sum.rows.some((r) => r.kind === k))
  const rows = sum.rows.filter(
    (r) => (kind === 'all' || r.kind === kind) && (status === 'left' ? r.status !== 'done' : r.status === status) && (!countedOnly || r.counts),
  )
  const next = LEVELS[LEVELS.indexOf(level) + 1]
  const share = sum.needed ? Math.min(1, sum.done / sum.needed) : 1

  return (
    <Stack gap="md">
      <Group gap="sm">
        <SegmentedControl value={level} onChange={(v) => setLevel(v as Level)} data={LEVELS} aria-label="Level" />
        {level === current && (
          <Text size="sm" c="dimmed">
            Your level now
          </Text>
        )}
      </Group>

      <Card padding="md">
        <Group justify="space-between" gap="sm" mb={6}>
          <Group gap={8}>
            <LevelBadge level={level} />
            <Text fw={650}>
              {sum.left === 0 ? (next ? `Enough done to move up to ${next}` : 'B2 complete') : `${sum.left} more to ${next ? `move up to ${next}` : 'complete B2'}`}
            </Text>
          </Group>
          <Text size="sm" c="dimmed" className="tnum">
            {sum.done} of {sum.needed} needed · {sum.total} in the level
          </Text>
        </Group>
        <Progress value={share * 100} size={8} radius="xl" color={sum.left === 0 ? 'green' : undefined} aria-label="Toward the next level" />
        <Text size="xs" c="dimmed" mt={8}>
          The app moves you up once 70% of the level’s grammar lessons (best score 70%+), graded texts (read to the end) and stories (60%+) are done. Audio, role-plays, writing and words don’t count toward it, but they’re listed so you can see everything.
        </Text>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <KindChips value={kind} onChange={setKind} options={kinds.map((k) => [k, LEVEL_KIND_LABEL[k], sum.rows.filter((r) => r.kind === k).length])} />
        <Group gap="sm" justify="flex-end">
          <Chip size="sm" checked={countedOnly} onChange={setCountedOnly} variant="outline">
            Counts toward level-up
          </Chip>
          <SegmentedControl
            size="xs"
            value={status}
            onChange={(v) => setStatus(v as ItemStatus | 'left')}
            data={[
              { value: 'left', label: 'Not done' },
              { value: 'started', label: 'Started' },
              { value: 'done', label: 'Done' },
            ]}
            aria-label="Status"
          />
        </Group>
      </SimpleGrid>

      <Paged
        key={`${level}-${kind}-${status}-${countedOnly}`}
        rows={rows}
        empty={status === 'done' ? 'Nothing done here yet.' : 'All done here.'}
        head={['Item', 'Type', 'Status', 'So far', 'Level-up']}
        row={(r) => (
          <Table.Tr key={r.id}>
            <Table.Td>
              <Cell title={r.title} sub={r.sub} to={r.to} />
            </Table.Td>
            <Table.Td c="dimmed">{LEVEL_KIND_LABEL[r.kind]}</Table.Td>
            <Table.Td>
              <StatusBadge s={r.status} />
            </Table.Td>
            <Table.Td className="tnum">{r.have ?? '–'}</Table.Td>
            <Table.Td c="dimmed">{r.counts ? 'Counts' : '–'}</Table.Td>
          </Table.Tr>
        )}
      />
    </Stack>
  )
}

// ───────────── Reviews ─────────────

function ReviewsTab() {
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const lessons = useStore((s) => s.lessons)
  const { now, today, tomorrow } = useDays()
  const all = useMemo(() => reviewSchedule({ cards, customWords, lessons }, now), [cards, customWords, lessons, now])
  const days = useMemo(() => reviewsPerDay(all, 14, now), [all, now])
  const [kind, setKind] = useState<'all' | 'card' | 'lesson'>('all')
  const rows = kind === 'all' ? all : all.filter((r) => r.kind === kind)
  const max = Math.max(1, ...days.map((d) => d.cards + d.lessons))

  return (
    <Stack gap="md">
      <Card padding="md">
        <Text fw={650} mb={8}>
          Next two weeks
        </Text>
        <Group gap={4} wrap="nowrap" align="flex-end" h={84}>
          {days.map((d, i) => {
            const n = d.cards + d.lessons
            return (
              <Tooltip key={d.day} label={`${fmtDay(d.day, today, tomorrow)}: ${d.cards} cards, ${d.lessons} lessons`} withArrow>
                <Stack gap={2} align="center" style={{ flex: 1 }} miw={0}>
                  <Text size="xs" c="dimmed" className="tnum">
                    {n || ''}
                  </Text>
                  <Box w="100%" h={Math.max(2, (n / max) * 52)} bg={n ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)'} style={{ borderRadius: 3, opacity: i === 0 ? 1 : 0.75 }} />
                  <Text size="xs" c="dimmed">
                    {i === 0 ? 'Today' : new Date(`${d.day}T12:00:00`).toLocaleDateString('en', { weekday: 'narrow' })}
                  </Text>
                </Stack>
              </Tooltip>
            )
          })}
        </Group>
        <Text size="xs" c="dimmed" mt={8}>
          Overdue reviews count as today. Today’s session takes the {MIX.maxReviews} most overdue cards at a time.
        </Text>
      </Card>

      <KindChips
        value={kind}
        onChange={setKind}
        options={[
          ['card', 'Flashcards', all.filter((r) => r.kind === 'card').length],
          ['lesson', 'Grammar lessons', all.filter((r) => r.kind === 'lesson').length],
        ]}
      />

      <Paged
        key={kind}
        rows={rows}
        minWidth={720}
        empty="Nothing scheduled yet. Learn some words or pass a lesson and its reviews show up here."
        head={['Due', 'Item', 'State', 'Interval']}
        row={(r) => (
          <Table.Tr key={r.id}>
            <Table.Td w={150} style={{ whiteSpace: 'nowrap' }}>
              <Text size="sm" c={r.overdue ? 'orange' : r.day === today ? undefined : 'dimmed'} fw={r.day === today ? 600 : undefined}>
                {r.overdue ? 'Overdue' : fmtDay(r.day, today, tomorrow)}
                {r.kind === 'card' && !r.overdue && r.day === today ? ` · ${new Date(r.due).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}` : ''}
              </Text>
              {r.overdue && (
                <Text size="xs" c="dimmed">
                  since {new Date(r.kind === 'lesson' ? `${r.due}T12:00:00` : r.due).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              <Cell title={r.title} sub={r.sub} to={r.to} />
            </Table.Td>
            <Table.Td c="dimmed">{r.state}</Table.Td>
            <Table.Td className="tnum" c="dimmed">
              {r.kind === 'card' ? (r.interval ? `${r.interval} d` : '< 1 d') : '–'}
            </Table.Td>
          </Table.Tr>
        )}
      />
    </Stack>
  )
}

// ───────────── New words ─────────────

function NewWordsTab() {
  const activeDecks = useStore((s) => s.activeDecks)
  const introduced = useStore((s) => s.introduced)
  const customWords = useStore((s) => s.customWords)
  const settings = useStore((s) => s.settings)
  const { now, today, tomorrow } = useDays()
  const rows = useMemo(() => newWordSchedule({ activeDecks, introduced, customWords, settings }, now), [activeDecks, introduced, customWords, settings, now])
  const last = rows[rows.length - 1]

  return (
    <Stack gap="md">
      <Card padding="md">
        <Text fw={650}>
          {rows.length.toLocaleString()} words waiting{last ? `, through ${fmtDay(last.day, today, tomorrow)}${last.day.slice(0, 4) !== today.slice(0, 4) ? ` ${last.day.slice(0, 4)}` : ''}` : ''}
        </Text>
        <Text size="sm" c="dimmed">
          From your active decks, A1 → B2, at {settings.newPerDay} new words a day if you study every day.{' '}
          <Anchor component={Link} to="/settings" size="sm">
            Change it in Settings
          </Anchor>{' '}
          or pick decks in{' '}
          <Anchor component={Link} to="/vocab" size="sm">
            Vocabulary
          </Anchor>
          .
        </Text>
      </Card>
      <Paged
        rows={rows}
        empty="No new words left in your active decks. Turn on more decks in Vocabulary."
        head={['#', 'Word', 'English', 'Deck', 'Level', 'Comes up']}
        row={(r) => (
          <Table.Tr key={r.id}>
            <Table.Td c="dimmed" className="tnum" w={56}>
              {r.position}
            </Table.Td>
            <Table.Td fw={600} lang="fr">
              {r.fr}
            </Table.Td>
            <Table.Td c="dimmed">{r.en}</Table.Td>
            <Table.Td c="dimmed">{r.deck}</Table.Td>
            <Table.Td>
              <LevelBadge level={r.level} />
            </Table.Td>
            <Table.Td style={{ whiteSpace: 'nowrap' }}>{fmtDay(r.day, today, tomorrow)}</Table.Td>
          </Table.Tr>
        )}
      />
    </Stack>
  )
}
