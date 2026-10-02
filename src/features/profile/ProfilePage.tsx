import { useMemo, useState, type ReactNode } from 'react'
import { ActionIcon, Box, Card, Container, Group, SegmentedControl, SimpleGrid, Stack, Text, Title, Tooltip, useComputedColorScheme } from '@mantine/core'
import { BarChart, RadarChart } from '@mantine/charts'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { SyncAccount } from '../../components/SyncAccount'
import { useStore, STUDY_SKILLS, type StudySkill } from '../../lib/store'
import { useSync } from '../../lib/sync/engine'
import { useDocumentTitle } from '../../lib/hooks'
import { computeStreak } from '../../lib/store'
import { dayKey } from '../../lib/date'
import { answersHistory, periodDays, periodLabel, periodOf, recap, samePeriod, shiftPeriod, skillsByDay, type Period, type PeriodKind, type Recap } from '../../lib/stats'

const SKILL_LABEL: Record<StudySkill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
}

/** Two series, checked for colour-blind separation in both themes: this month (indigo) vs last month (orange). */
function useSeriesColors() {
  const dark = useComputedColorScheme('light') === 'dark'
  return { now: dark ? '#5c7cfa' : '#4263eb', before: '#e8590c', muted: dark ? 'dark.4' : 'gray.3' }
}

const PREV: Record<PeriodKind, string> = { week: 'last week', month: 'last month' }
/** Legend names for the two periods compared: "This week" / "Last week", or month names. */
function seriesNames(cur: Period, last: Period): [string, string] {
  if (cur.kind === 'month') return [cur.start.toLocaleDateString('en', { month: 'short' }), last.start.toLocaleDateString('en', { month: 'short' })]
  return samePeriod(cur, periodOf('week')) ? ['This week', 'Last week'] : [periodLabel(cur), periodLabel(last)]
}

export default function ProfilePage() {
  const user = useSync((s) => s.user)
  useDocumentTitle('Profile')
  const s = useStore()
  const [kind, setKind] = useState<PeriodKind>('month')
  const [offset, setOffset] = useState(0) // 0 = current period, -1 = the one before…
  const period = shiftPeriod(periodOf(kind), offset)
  const prev = shiftPeriod(period, -1)

  const bySkill = useMemo(() => skillsByDay(s), [s])
  const cur = recap(s, period, bySkill)
  const last = recap(s, prev, bySkill)
  const streak = computeStreak(s.activity)

  return (
    <Container size={960} py="xl">
      <PageHeader eyebrow="Profil" title={user?.name ?? 'Profile'} />
      <SyncAccount />

      <Group justify="space-between" mt="xl" mb="sm" gap="sm">
        <Group gap="sm">
          <Title order={2} size="h3">
            Recap
          </Title>
          <SegmentedControl
            size="xs"
            value={kind}
            onChange={(v) => {
              setKind(v as PeriodKind)
              setOffset(0)
            }}
            data={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            aria-label="Recap period"
          />
        </Group>
        <Group gap={4}>
          <ActionIcon variant="subtle" color="gray" onClick={() => setOffset((o) => o - 1)} aria-label={`Previous ${kind}`}>
            <ChevronLeft size={18} />
          </ActionIcon>
          <Text fw={600} miw={140} ta="center">
            {periodLabel(period)}
          </Text>
          <ActionIcon variant="subtle" color="gray" onClick={() => setOffset((o) => o + 1)} disabled={offset >= 0} aria-label={`Next ${kind}`}>
            <ChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Summary cur={cur} last={last} streak={offset === 0 ? streak : undefined} />
        <DaysLog period={period} active={cur.activeDays} activity={s.activity} />
        <Skills cur={cur} last={last} />
        <Answers period={period} rows={answersHistory(s, period)} onPick={(i) => setOffset((o) => o + i - 11)} />
      </SimpleGrid>
    </Container>
  )
}

function Panel({ period, title, children }: { period: Period; title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <Text size="sm" c="dimmed">
        {periodLabel(period)}
      </Text>
      <Title order={3} size="h4" mb="md">
        {title}
      </Title>
      {children}
    </Card>
  )
}

/** ↑ / ↓ change against last month, with an icon so it never relies on colour. */
function Delta({ now, before, unit = '', kind }: { now: number; before: number; unit?: string; kind: PeriodKind }) {
  const d = now - before
  if (!d)
    return (
      <Text size="sm" c="dimmed">
        same as {PREV[kind]}
      </Text>
    )
  const up = d > 0
  return (
    <Group gap={2} c={up ? 'green.7' : 'red.7'}>
      {up ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
      <Text size="sm" fw={600} c="inherit">
        <span className="sr-only">{up ? 'up' : 'down'} </span>
        {Math.abs(d).toLocaleString('en')}
        {unit}
      </Text>
    </Group>
  )
}

function Summary({ cur, last, streak }: { cur: Recap; last: Recap; streak?: number }) {
  const acc = (r: Recap) => (r.answers ? Math.round((r.correct / r.answers) * 100) : 0)
  const tiles = [
    { label: 'Study days', value: cur.activeDays.length, before: last.activeDays.length },
    { label: 'Answers', value: cur.answers, before: last.answers },
    { label: 'New words', value: cur.newWords, before: last.newWords },
    { label: 'Accuracy', value: acc(cur), before: acc(last), unit: '%' },
  ]
  return (
    <Panel period={cur.period} title="Overview">
      <SimpleGrid cols={2} spacing="lg" verticalSpacing="lg">
        {tiles.map((t) => (
          <Stack key={t.label} gap={0}>
            <Text size="sm" c="dimmed">
              {t.label}
            </Text>
            <Text fz={30} fw={700} lh={1.15} className="tnum">
              {t.unit === '%' && !cur.answers ? '–' : `${t.value.toLocaleString('en')}${t.unit ?? ''}`}
            </Text>
            <Delta now={t.value} before={t.before} unit={t.unit === '%' ? ' pts' : ''} kind={cur.period.kind} />
          </Stack>
        ))}
      </SimpleGrid>
      {streak !== undefined && (
        <Text size="sm" c="dimmed" mt="lg">
          Current streak:{' '}
          <Text span fw={700} c="var(--mantine-color-text)">
            {streak} day{streak === 1 ? '' : 's'}
          </Text>
        </Text>
      )}
    </Panel>
  )
}

function DaysLog({ period, active, activity }: { period: Period; active: string[]; activity: ReturnType<typeof useStore.getState>['activity'] }) {
  const { now } = useSeriesColors()
  const days = periodDays(period)
  const lead = (days[0].getDay() + 6) % 7 // Monday first
  const on = new Set(active)
  const todayKey = dayKey()
  return (
    <Panel period={period} title="Study days">
      <SimpleGrid cols={7} spacing={6} verticalSpacing={6} w="100%" maw={340} mx="auto">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} size="xs" fw={600} c="dimmed" ta="center">
            {d}
          </Text>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {days.map((date) => {
          const key = dayKey(date)
          const studied = on.has(key)
          const items = activity[key]?.items ?? 0
          const label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
          return (
            <Tooltip key={key} label={`${label} · ${studied ? `${items} answer${items === 1 ? '' : 's'}` : 'no study'}`} withArrow openDelay={150}>
              <Box
                aria-label={`${label}: ${studied ? `studied, ${items} answers` : 'no study'}`}
                style={{
                  aspectRatio: '1',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  fontSize: 13,
                  fontWeight: 600,
                  background: studied ? now : 'var(--surface-2)',
                  color: studied ? '#fff' : 'var(--mantine-color-dimmed)',
                  outline: key === todayKey ? `2px solid ${now}` : undefined,
                  outlineOffset: 2,
                }}
              >
                {date.getDate()}
              </Box>
            </Tooltip>
          )
        })}
      </SimpleGrid>
    </Panel>
  )
}

function Skills({ cur, last }: { cur: Recap; last: Recap }) {
  const { now, before } = useSeriesColors()
  const total = (r: Record<StudySkill, number>) => STUDY_SKILLS.reduce((a, k) => a + r[k], 0) || 1
  const tc = total(cur.skills)
  const tl = total(last.skills)
  const [nowName, beforeName] = seriesNames(cur.period, last.period)
  // Share of each period's practice, so a busy period and a quiet one compare by mix, not size.
  const data = STUDY_SKILLS.map((k) => ({ skill: SKILL_LABEL[k], [nowName]: Math.round((cur.skills[k] / tc) * 100), [beforeName]: Math.round((last.skills[k] / tl) * 100) }))
  return (
    <Panel period={cur.period} title="Skill mix">
      <RadarChart
        h={280}
        data={data}
        dataKey="skill"
        withLegend
        legendProps={{ verticalAlign: 'bottom', height: 28, wrapperStyle: { paddingTop: 12 } }}
        withTooltip
        series={[
          { name: beforeName, color: before, opacity: 0.15 },
          { name: nowName, color: now, opacity: 0.3 },
        ]}
        withDots
        tooltipProps={{ formatter: (v) => `${v}% of practice` }}
      />
    </Panel>
  )
}

function Answers({ period, rows, onPick }: { period: Period; rows: { period: Period; answers: number }[]; onPick: (index: number) => void }) {
  const { now, muted } = useSeriesColors()
  const cur = rows[rows.length - 1]?.answers ?? 0
  const prev = rows[rows.length - 2]?.answers ?? 0
  // The picked period stands out; the others give context.
  const data = rows.map((r, i) => {
    const picked = i === rows.length - 1
    return { label: periodLabel(r.period, true), name: periodLabel(r.period), i, total: r.answers, Other: picked ? 0 : r.answers, Picked: picked ? r.answers : 0 }
  })
  return (
    <Panel
      period={period}
      title={
        <Group gap="sm" align="baseline">
          <span>Answers</span>
          <Text span fz={26} fw={700} className="tnum">
            {cur.toLocaleString('en')}
          </Text>
          <Delta now={cur} before={prev} kind={period.kind} />
        </Group>
      }
    >
      <BarChart
        h={220}
        data={data}
        dataKey="label"
        type="stacked"
        series={[
          { name: 'Other', color: muted, label: 'Answers' },
          { name: 'Picked', color: now, label: 'Answers' },
        ]}
        barProps={{ radius: [4, 4, 0, 0], onClick: (d: { payload?: { i?: number } }) => d.payload?.i !== undefined && onPick(d.payload.i), style: { cursor: 'pointer' } }}
        gridAxis="x"
        tickLine="none"
        withTooltip
        tooltipProps={{
          content: ({ payload }) => {
            const row = payload?.[0]?.payload as { name: string; total: number } | undefined
            return row ? (
              <Card padding="xs" shadow="sm">
                <Text size="sm" fw={600}>
                  {row.name}
                </Text>
                <Text size="sm" className="tnum">
                  {row.total.toLocaleString('en')} answers
                </Text>
              </Card>
            ) : null
          },
        }}
      />
    </Panel>
  )
}
