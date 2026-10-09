import { useMemo, useState, type ReactNode } from 'react'
import { ActionIcon, Box, Button, Card, Container, Group, SegmentedControl, SimpleGrid, Stack, Text, Title, Tooltip, useComputedColorScheme } from '@mantine/core'
import { BarChart, RadarChart } from '@mantine/charts'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, History, Map as MapIcon } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { SyncAccount } from '../../components/SyncAccount'
import { useStore, STUDY_SKILLS, type StudySkill } from '../../lib/store'
import { useSync } from '../../lib/sync/engine'
import { useDocumentTitle } from '../../lib/hooks'
import { computeStreak } from '../../lib/store'
import { dayKey } from '../../lib/date'
import { LEVEL_INFO, LEVELS, type Level } from '../../data/types'
import { currentLevel, LEVEL_UP_AT, levelProgress } from '../../lib/level'
import {
  answersHistory,
  levelSections,
  percent,
  periodDays,
  periodLabel,
  periodOf,
  recap,
  samePeriod,
  shiftPeriod,
  skillsByDay,
  type Period,
  type PeriodKind,
  type Recap,
  type Tally,
} from '../../lib/stats'

const SKILL_LABEL: Record<StudySkill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
}

/** Two series, checked for colour-blind separation in both themes: this month (blue) vs last month (orange). */
function useSeriesColors() {
  const dark = useComputedColorScheme('light') === 'dark'
  return { now: dark ? '#4dabf7' : '#1971c2', before: '#e8590c', muted: dark ? 'dark.4' : 'gray.3' }
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
  const level = currentLevel(s)
  const sections = useMemo(() => Object.fromEntries(LEVELS.map((l) => [l, levelSections(l, s)])) as Record<Level, Record<StudySkill, Tally>>, [s])

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Profil"
        title={user?.name ?? 'Profile'}
        actions={
          <>
            <Button component={Link} to="/history" variant="default" size="sm" leftSection={<History size={16} aria-hidden />}>
              History
            </Button>
            {/* On phones the roadmap isn't in the bottom bar, so it lives here. */}
            <Button component={Link} to="/roadmap" variant="default" size="sm" leftSection={<MapIcon size={16} aria-hidden />} hiddenFrom="sm">
              Roadmap
            </Button>
          </>
        }
      />
      <SyncAccount />

      <Title order={2} size="h3" mt="xl" mb="sm">
        Progress
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Levels level={level} overall={LEVELS.map((l) => Math.floor(levelProgress(l, s) * 100))} />
        <Sections level={level} sections={sections} />
      </SimpleGrid>

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

function Panel({ eyebrow, title, children }: { eyebrow: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <Text size="sm" c="dimmed">
        {eyebrow}
      </Text>
      <Title order={3} size="h4" mb="md">
        {title}
      </Title>
      {children}
    </Card>
  )
}

/** Share of each level done (what moves you up: grammar, reading, stories); your level stands out. */
function Levels({ level, overall }: { level: Level; overall: number[] }) {
  const { now, muted } = useSeriesColors()
  const data = LEVELS.map((l, i) => ({ level: l, Done: overall[i], color: l === level ? now : muted }))
  return (
    <Panel eyebrow="Current level" title={`${level} · ${LEVEL_INFO[level].name}`}>
      <BarChart
        h={224}
        data={data}
        dataKey="level"
        series={[{ name: 'Done', color: now }]}
        withBarValueLabel
        valueFormatter={(v) => `${v}%`}
        valueLabelProps={{ fill: 'var(--mantine-color-text)', fontWeight: 600 }}
        withYAxis={false}
        yAxisProps={{ domain: [0, 100] }}
        gridAxis="none"
        tickLine="none"
        maxBarWidth={56}
        barProps={{ radius: [4, 4, 0, 0] }}
        barChartProps={{ margin: { top: 20, right: 4, left: 4 } }}
        referenceLines={[{ y: LEVEL_UP_AT * 100, label: 'Level up', labelPosition: 'insideTopRight', strokeDasharray: '4 3', color: 'dimmed' }]}
        withTooltip
        tooltipProps={{
          content: ({ payload }) => {
            const row = payload?.[0]?.payload as { level: Level; Done: number } | undefined
            return row ? (
              <Card padding="xs" shadow="sm">
                <Text size="sm" fw={600}>
                  {row.level} · {LEVEL_INFO[row.level].name}
                </Text>
                <Text size="sm" className="tnum">
                  {row.Done}% of grammar, reading and stories
                </Text>
              </Card>
            ) : null
          },
        }}
      />
    </Panel>
  )
}

const DONE_UNIT: Record<StudySkill, string> = {
  vocabulary: 'words started',
  grammar: 'lessons passed',
  reading: 'texts read',
  writing: 'prompts written',
  listening: 'stories and audio lessons',
  speaking: 'role-plays',
}

/** Text on each heat step (--heat-0…4), picked for contrast in each theme; quieter where nothing is done yet. */
const HEAT_INK = {
  light: ['var(--text-2)', 'var(--mantine-color-text)', 'var(--mantine-color-text)', 'var(--mantine-color-text)', '#fff'],
  dark: ['var(--text-2)', '#fff', '#fff', 'var(--mantine-color-dark-9)', 'var(--mantine-color-dark-9)'],
}
const heatStep = (p: number) => (p === 0 ? 0 : p < 25 ? 1 : p < 50 ? 2 : p < 75 ? 3 : 4)

/** Skills × levels: how much of each level's material you've done. */
function Sections({ level, sections }: { level: Level; sections: Record<Level, Record<StudySkill, Tally>> }) {
  const ink = HEAT_INK[useComputedColorScheme('light')]
  return (
    <Panel eyebrow={`${LEVELS[0]} – ${LEVELS[LEVELS.length - 1]}`} title="By section">
      <Box role="table" aria-label="Progress by section and level" style={{ display: 'grid', gridTemplateColumns: `auto repeat(${LEVELS.length}, minmax(0, 1fr))`, gap: 4, alignItems: 'center' }}>
        <Box role="row" style={{ display: 'contents' }}>
          <span role="columnheader" />
          {LEVELS.map((l) => (
            <Text key={l} role="columnheader" size="xs" ta="center" fw={l === level ? 700 : 600} c={l === level ? undefined : 'dimmed'}>
              {l}
            </Text>
          ))}
        </Box>
        {STUDY_SKILLS.map((k) => (
          <Box key={k} role="row" style={{ display: 'contents' }}>
            <Text role="rowheader" size="sm" pr="xs">
              {SKILL_LABEL[k]}
            </Text>
            {LEVELS.map((l) => {
              const t = sections[l][k]
              const p = percent(t)
              const step = heatStep(p)
              const label = t.total ? `${SKILL_LABEL[k]} ${l}: ${t.done} of ${t.total} ${DONE_UNIT[k]}` : `${SKILL_LABEL[k]} ${l}: nothing yet`
              return (
                <Tooltip key={l} label={label} withArrow openDelay={150}>
                  <Box
                    role="cell"
                    aria-label={label}
                    className="tnum"
                    style={{
                      height: 32,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      background: t.total ? `var(--heat-${step})` : 'transparent',
                      color: t.total ? ink[step] : 'var(--mantine-color-dimmed)',
                    }}
                  >
                    {t.total ? `${p}%` : '–'}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        ))}
      </Box>
    </Panel>
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
    <Panel eyebrow={periodLabel(cur.period)} title="Overview">
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
    <Panel eyebrow={periodLabel(period)} title="Study days">
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
    <Panel eyebrow={periodLabel(cur.period)} title="Skill mix">
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
      eyebrow={periodLabel(period)}
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
