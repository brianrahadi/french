import { useMemo, useState, type ReactNode } from 'react'
import { ActionIcon, Box, Card, Container, Group, SimpleGrid, Stack, Text, Title, Tooltip, useComputedColorScheme } from '@mantine/core'
import { BarChart, RadarChart } from '@mantine/charts'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { SyncAccount } from '../../components/SyncAccount'
import { useStore, STUDY_SKILLS, type StudySkill } from '../../lib/store'
import { useSync } from '../../lib/sync/engine'
import { useDocumentTitle } from '../../lib/hooks'
import { computeStreak } from '../../lib/store'
import { addMonths, answersByMonth, daysIn, monthLabel, monthOf, monthRecap, sameMonth, skillsByDay, type Month } from '../../lib/stats'

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

export default function ProfilePage() {
  const user = useSync((s) => s.user)
  useDocumentTitle('Profile')
  const s = useStore()
  const today = monthOf(new Date())
  const [month, setMonth] = useState<Month>(today)
  const prev = addMonths(month, -1)

  const bySkill = useMemo(() => skillsByDay(s), [s])
  const cur = useMemo(() => monthRecap(s, month, bySkill), [s, month, bySkill])
  const last = useMemo(() => monthRecap(s, prev, bySkill), [s, prev.year, prev.month, bySkill]) // eslint-disable-line react-hooks/exhaustive-deps
  const streak = computeStreak(s.activity)

  return (
    <Container size={960} py="xl">
      <PageHeader eyebrow="Profil" title={user?.name ?? 'Profile'} />
      <SyncAccount />

      <Group justify="space-between" mt="xl" mb="sm">
        <Title order={2} size="h3">
          Monthly recap
        </Title>
        <Group gap={4}>
          <ActionIcon variant="subtle" color="gray" onClick={() => setMonth(prev)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </ActionIcon>
          <Text fw={600} miw={130} ta="center">
            {monthLabel(month)}
          </Text>
          <ActionIcon variant="subtle" color="gray" onClick={() => setMonth(addMonths(month, 1))} disabled={sameMonth(month, today)} aria-label="Next month">
            <ChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Summary cur={cur} last={last} streak={sameMonth(month, today) ? streak : undefined} />
        <DaysLog month={month} active={cur.activeDays} activity={s.activity} />
        <Skills cur={cur.skills} last={last.skills} month={month} />
        <Answers month={month} rows={answersByMonth(s, month)} onPick={setMonth} />
      </SimpleGrid>
    </Container>
  )
}

function Panel({ month, title, children }: { month: Month; title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <Text size="sm" c="dimmed">
        {monthLabel(month)}
      </Text>
      <Title order={3} size="h4" mb="md">
        {title}
      </Title>
      {children}
    </Card>
  )
}

/** ↑ / ↓ change against last month, with an icon so it never relies on colour. */
function Delta({ now, before, unit = '' }: { now: number; before: number; unit?: string }) {
  const d = now - before
  if (!d)
    return (
      <Text size="sm" c="dimmed">
        same as last month
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

function Summary({ cur, last, streak }: { cur: ReturnType<typeof monthRecap>; last: ReturnType<typeof monthRecap>; streak?: number }) {
  const acc = (r: typeof cur) => (r.answers ? Math.round((r.correct / r.answers) * 100) : 0)
  const tiles = [
    { label: 'Study days', value: cur.activeDays.length, before: last.activeDays.length },
    { label: 'Answers', value: cur.answers, before: last.answers },
    { label: 'New words', value: cur.newWords, before: last.newWords },
    { label: 'Accuracy', value: acc(cur), before: acc(last), unit: '%' },
  ]
  return (
    <Panel month={cur.month} title="Overview">
      <SimpleGrid cols={2} spacing="lg" verticalSpacing="lg">
        {tiles.map((t) => (
          <Stack key={t.label} gap={0}>
            <Text size="sm" c="dimmed">
              {t.label}
            </Text>
            <Text fz={30} fw={700} lh={1.15} className="tnum">
              {t.unit === '%' && !cur.answers ? '–' : `${t.value.toLocaleString('en')}${t.unit ?? ''}`}
            </Text>
            <Delta now={t.value} before={t.before} unit={t.unit === '%' ? ' pts' : ''} />
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

function DaysLog({ month, active, activity }: { month: Month; active: number[]; activity: ReturnType<typeof useStore.getState>['activity'] }) {
  const { now } = useSeriesColors()
  const n = daysIn(month)
  const lead = (new Date(month.year, month.month, 1).getDay() + 6) % 7 // Monday first
  const on = new Set(active)
  const todayKey = new Date().toDateString()
  const key = (d: number) => `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return (
    <Panel month={month} title="Study days">
      <SimpleGrid cols={7} spacing={6} verticalSpacing={6} w="100%" maw={340} mx="auto">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} size="xs" fw={600} c="dimmed" ta="center">
            {d}
          </Text>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const d = i + 1
          const studied = on.has(d)
          const items = activity[key(d)]?.items ?? 0
          const isToday = new Date(month.year, month.month, d).toDateString() === todayKey
          return (
            <Tooltip key={d} label={studied ? `${items} answer${items === 1 ? '' : 's'}` : 'No study'} withArrow openDelay={150}>
              <Box
                aria-label={`${monthLabel(month, 'short')} ${d}: ${studied ? `studied, ${items} answers` : 'no study'}`}
                style={{
                  aspectRatio: '1',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  fontSize: 13,
                  fontWeight: 600,
                  background: studied ? now : 'var(--surface-2)',
                  color: studied ? '#fff' : 'var(--mantine-color-dimmed)',
                  outline: isToday ? `2px solid ${now}` : undefined,
                  outlineOffset: 2,
                }}
              >
                {d}
              </Box>
            </Tooltip>
          )
        })}
      </SimpleGrid>
    </Panel>
  )
}

function Skills({ cur, last, month }: { cur: Record<StudySkill, number>; last: Record<StudySkill, number>; month: Month }) {
  const { now, before } = useSeriesColors()
  const total = (r: Record<StudySkill, number>) => STUDY_SKILLS.reduce((a, k) => a + r[k], 0) || 1
  const tc = total(cur)
  const tl = total(last)
  // Share of each month's practice, so a busy month and a quiet one compare by mix, not size.
  const data = STUDY_SKILLS.map((k) => ({ skill: SKILL_LABEL[k], [monthLabel(month, 'short')]: Math.round((cur[k] / tc) * 100), [monthLabel(addMonths(month, -1), 'short')]: Math.round((last[k] / tl) * 100) }))
  return (
    <Panel month={month} title="Skill mix">
      <RadarChart
        h={280}
        data={data}
        dataKey="skill"
        withLegend
        legendProps={{ verticalAlign: 'bottom', height: 28, wrapperStyle: { paddingTop: 12 } }}
        withTooltip
        series={[
          { name: monthLabel(addMonths(month, -1), 'short'), color: before, opacity: 0.15 },
          { name: monthLabel(month, 'short'), color: now, opacity: 0.3 },
        ]}
        withDots
        tooltipProps={{ formatter: (v) => `${v}% of practice` }}
      />
    </Panel>
  )
}

function Answers({ month, rows, onPick }: { month: Month; rows: { month: Month; answers: number }[]; onPick: (m: Month) => void }) {
  const { now, muted } = useSeriesColors()
  const cur = rows[rows.length - 1]?.answers ?? 0
  const prev = rows[rows.length - 2]?.answers ?? 0
  // The picked month stands out; the others give context.
  const data = rows.map((r, i) => {
    const picked = i === rows.length - 1
    return { label: monthLabel(r.month, 'narrow'), name: monthLabel(r.month), m: r.month, total: r.answers, Other: picked ? 0 : r.answers, Picked: picked ? r.answers : 0 }
  })
  return (
    <Panel
      month={month}
      title={
        <Group gap="sm" align="baseline">
          <span>Answers</span>
          <Text span fz={26} fw={700} className="tnum">
            {cur.toLocaleString('en')}
          </Text>
          <Delta now={cur} before={prev} />
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
        barProps={{ radius: [4, 4, 0, 0], onClick: (d: { payload?: { m?: Month } }) => d.payload?.m && onPick(d.payload.m), style: { cursor: 'pointer' } }}
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
