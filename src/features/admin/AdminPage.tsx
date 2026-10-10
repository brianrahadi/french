import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BarChart } from '@mantine/charts'
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { LevelBadge, Stat } from '../../components/ui'
import { useDocumentTitle } from '../../lib/hooks'
import { addDays, dayKey } from '../../lib/date'
import { syncConfigured, useSync } from '../../lib/sync/engine'
import { ago, dailyActive, isAdminEmail, loadLearners, type Learner } from './admin'

type SortKey = 'name' | 'level' | 'lastActive' | 'streak' | 'week' | 'answers' | 'accuracy' | 'words' | 'joined'
type Filter = 'all' | 'week' | 'never'

const LEVEL_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4 }

const sortValue = (l: Learner, k: SortKey): string | number => {
  const p = l.progress
  switch (k) {
    case 'name':
      return l.name.toLowerCase()
    case 'level':
      return p ? LEVEL_ORDER[p.level] : 0
    case 'lastActive':
      return p?.lastActiveDay ?? ''
    case 'streak':
      return p?.streak ?? -1
    case 'week':
      return p?.answers7d ?? -1
    case 'answers':
      return p?.answers ?? -1
    case 'accuracy':
      return p?.accuracy ?? -1
    case 'words':
      return p?.words ?? -1
    case 'joined':
      return l.joined
  }
}

/** Stand-in for "now" before the first load (nothing is shown until then). */
const EPOCH = new Date(0)

const fmt = (n: number) => n.toLocaleString('en')
const pct = (x: number | null | undefined) => (x == null ? '—' : `${Math.round(x * 100)}%`)
const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AdminPage() {
  useDocumentTitle('Admin')
  const { state, user } = useSync()
  const admin = isAdminEmail(user?.email)

  if (!syncConfigured)
    return (
      <Gate title="Sign-in isn’t set up">
        The admin dashboard reads accounts from Supabase. Add the Supabase settings (see README → “Sign-in and sync”) and sign in.
      </Gate>
    )
  if (state === 'starting')
    return (
      <Container size="var(--page-w)" py="xl">
        <Loader size="sm" aria-label="Loading" />
      </Container>
    )
  if (!user)
    return (
      <Gate title="Sign in to continue">
        The admin dashboard is only for the app’s owner. <Link to="/settings#account">Sign in with Google</Link> first.
      </Gate>
    )
  if (!admin)
    return (
      <Gate title="Admins only">
        This page isn’t available for {user.email}. <Link to="/">Back to Today</Link>
      </Gate>
    )
  return <Dashboard />
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Container size="var(--page-w-narrow)" py="xl">
      <PageHeader eyebrow="Admin" title={title} />
      <Text c="dimmed">{children}</Text>
    </Container>
  )
}

function Dashboard() {
  const [result, setResult] = useState<{ learners: Learner[]; at: Date } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'lastActive', desc: true })
  const [open, setOpen] = useState<string | null>(null)

  const fetchLearners = useCallback(
    () =>
      loadLearners()
        .then(
          (learners) => {
            setResult({ learners, at: new Date() })
            setError('')
          },
          (e: unknown) => setError((e as Error)?.message ?? String(e)),
        )
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    void fetchLearners()
  }, [fetchLearners])

  const refresh = () => {
    setLoading(true)
    void fetchLearners()
  }

  const learners = result?.learners ?? null
  const loadedAt = result?.at ?? null
  const now = loadedAt ?? EPOCH
  const today = dayKey(now)
  const weekStart = dayKey(addDays(now, -6))
  const totals = useMemo(() => {
    const all = learners ?? []
    const activeOn = (from: string) => all.filter((l) => (l.progress?.lastActiveDay ?? '') >= from).length
    return {
      users: all.length,
      today: activeOn(today),
      week: activeOn(weekStart),
      newWeek: all.filter((l) => dayKey(new Date(l.joined)) >= weekStart).length,
      answersWeek: all.reduce((n, l) => n + (l.progress?.answers7d ?? 0), 0),
      never: all.filter((l) => !l.progress).length,
    }
  }, [learners, today, weekStart])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (learners ?? []).filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false
      if (filter === 'week') return (l.progress?.lastActiveDay ?? '') >= weekStart
      if (filter === 'never') return !l.progress
      return true
    })
    const dir = sort.desc ? -1 : 1
    return list.sort((a, b) => {
      const x = sortValue(a, sort.key)
      const y = sortValue(b, sort.key)
      return x < y ? -dir : x > y ? dir : a.name.localeCompare(b.name)
    })
  }, [learners, query, filter, sort, weekStart])

  const header = (key: SortKey, label: string, numeric = false) => {
    const on = sort.key === key
    const Arrow = sort.desc ? ArrowDown : ArrowUp
    return (
      <Table.Th ta={numeric ? 'right' : undefined} aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : undefined}>
        <UnstyledButton
          onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'name' }))}
          fz="xs"
          fw={650}
          c={on ? undefined : 'dimmed'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
        >
          {label}
          {on && <Arrow size={12} aria-hidden />}
        </UnstyledButton>
      </Table.Th>
    )
  }

  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader
        eyebrow="Admin"
        title="Learners"
        subtitle={loadedAt ? `Everyone who has signed in · updated ${loadedAt.toLocaleTimeString(undefined, { timeStyle: 'short' })}` : 'Everyone who has signed in'}
        actions={
          <Button
            variant="default"
            size="xs"
            onClick={refresh}
            disabled={loading}
            leftSection={loading ? <Loader size={14} color="currentColor" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert variant="light" color="red" icon={<AlertTriangle size={18} aria-hidden />} mb="lg" title="Couldn’t load learners">
          {error}
        </Alert>
      )}

      {!learners ? (
        !error && <Loader size="sm" aria-label="Loading learners" />
      ) : (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
            <Stat label="Learners" value={fmt(totals.users)} />
            <Stat label="Active today" value={fmt(totals.today)} />
            <Stat label="Active, last 7 days" value={fmt(totals.week)} />
            <Stat label="New, last 7 days" value={fmt(totals.newWeek)} />
            <Stat label="Answers, last 7 days" value={fmt(totals.answersWeek)} />
          </SimpleGrid>

          <ActivityChart learners={learners} now={now} />

          <Card padding={0}>
            <Group justify="space-between" gap="sm" p="md" wrap="wrap">
              <Chip.Group value={filter} onChange={(v) => setFilter(v as Filter)}>
                <Group gap={6}>
                  <Chip value="all" size="sm">
                    All ({fmt(totals.users)})
                  </Chip>
                  <Chip value="week" size="sm">
                    Active this week ({fmt(totals.week)})
                  </Chip>
                  <Chip value="never" size="sm">
                    Never synced ({fmt(totals.never)})
                  </Chip>
                </Group>
              </Chip.Group>
              <TextInput
                size="sm"
                placeholder="Search name or email"
                aria-label="Search learners"
                leftSection={<Search size={15} aria-hidden />}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                w={{ base: '100%', sm: 260 }}
              />
            </Group>

            {!rows.length ? (
              <Text c="dimmed" px="md" pb="md">
                No learners match.
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={880}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      {header('name', 'Learner')}
                      {header('level', 'Level')}
                      {header('lastActive', 'Last active')}
                      {header('streak', 'Streak', true)}
                      {header('week', '7 days', true)}
                      {header('answers', 'Answers', true)}
                      {header('accuracy', 'Accuracy', true)}
                      {header('words', 'Words', true)}
                      {header('joined', 'Joined')}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((l) => (
                      <LearnerRow key={l.id} l={l} now={now} open={open === l.id} onToggle={() => setOpen((o) => (o === l.id ? null : l.id))} />
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Card>
        </Stack>
      )}
    </Container>
  )
}

function LearnerRow({ l, now, open, onToggle }: { l: Learner; now: Date; open: boolean; onToggle: () => void }) {
  const p = l.progress
  const Chevron = open ? ChevronDown : ChevronRight
  const num = (n: number | undefined) => (
    <Table.Td ta="right" className="tnum">
      {n == null ? '—' : fmt(n)}
    </Table.Td>
  )
  return (
    <Fragment>
      <Table.Tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <Chevron size={14} aria-hidden style={{ flexShrink: 0, opacity: 0.6 }} />
            <Avatar src={l.avatar} size={30} radius="xl" name={l.name} color="initials" imageProps={{ referrerPolicy: 'no-referrer' }} />
            <Box miw={0}>
              <UnstyledButton onClick={(e) => { e.stopPropagation(); onToggle() }} aria-expanded={open} fz="sm" fw={600} display="block" style={{ whiteSpace: 'nowrap' }}>
                {l.name}
              </UnstyledButton>
              <Text size="xs" c="dimmed" truncate maw={240}>
                {l.email}
              </Text>
            </Box>
          </Group>
        </Table.Td>
        <Table.Td>{p ? <LevelBadge level={p.level} /> : <Badge variant="light" color="gray" size="sm">No data</Badge>}</Table.Td>
        <Table.Td style={{ whiteSpace: 'nowrap' }}>{ago(p?.lastActiveDay, now)}</Table.Td>
        {num(p?.streak)}
        {num(p?.answers7d)}
        {num(p?.answers)}
        <Table.Td ta="right" className="tnum">
          {pct(p?.accuracy)}
        </Table.Td>
        {num(p?.words)}
        <Table.Td style={{ whiteSpace: 'nowrap' }}>{ago(l.joined, now)}</Table.Td>
      </Table.Tr>
      {open && (
        <Table.Tr>
          <Table.Td colSpan={9} bg="var(--mantine-color-default-hover)">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" verticalSpacing="sm" py={4} px="md">
              <Detail label="Started at" value={p?.startLevel ?? '—'} />
              <Detail label="Lessons passed" value={p ? fmt(p.lessonsPassed) : '—'} />
              <Detail label="Texts read" value={p ? fmt(p.textsRead) : '—'} />
              <Detail label="Writings" value={p ? fmt(p.writings) : '—'} />
              <Detail label="Conversations" value={p ? fmt(p.conversations) : '—'} />
              <Detail label="Days studied" value={p ? fmt(p.activeDays) : '—'} />
              <Detail label="Devices" value={p ? fmt(p.devices) : '—'} />
              <Detail label="Sign-in" value={l.provider} />
              <Detail label="Joined" value={dateTime(l.joined)} />
              <Detail label="Last sign-in" value={dateTime(l.lastSignIn)} />
              <Detail label="Last sync" value={dateTime(l.lastSave)} />
              <Detail label="User ID" value={<Text span ff="monospace" size="xs">{l.id}</Text>} />
            </SimpleGrid>
            {l.error && (
              <Text size="sm" c="red" px="md" pt="xs">
                Couldn’t read progress: {l.error}
              </Text>
            )}
          </Table.Td>
        </Table.Tr>
      )}
    </Fragment>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box miw={0}>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
        {value}
      </Text>
    </Box>
  )
}

/** Learners who studied on each of the last 30 days. */
function ActivityChart({ learners, now }: { learners: Learner[]; now: Date }) {
  const dark = useComputedColorScheme('light') === 'dark'
  const data = useMemo(() => dailyActive(learners, 30, now), [learners, now])
  return (
    <Card>
      <Text size="sm" c="dimmed">
        Last 30 days
      </Text>
      <Title order={3} size="h4" mb="md">
        Learners studying each day
      </Title>
      <BarChart
        h={200}
        data={data}
        dataKey="label"
        series={[{ name: 'learners', label: 'Learners', color: dark ? '#4dabf7' : '#1971c2' }]}
        barProps={{ radius: [3, 3, 0, 0] }}
        gridAxis="y"
        tickLine="none"
        yAxisProps={{ allowDecimals: false }}
        xAxisProps={{ interval: 'preserveStartEnd', minTickGap: 24 }}
        tooltipProps={{
          content: ({ payload }) => {
            const row = payload?.[0]?.payload as { label: string; learners: number; answers: number } | undefined
            return row ? (
              <Card padding="xs" shadow="sm">
                <Text size="sm" fw={600}>
                  {row.label}
                </Text>
                <Text size="sm" className="tnum">
                  {fmt(row.learners)} {row.learners === 1 ? 'learner' : 'learners'} · {fmt(row.answers)} answers
                </Text>
              </Card>
            ) : null
          },
        }}
      />
    </Card>
  )
}
