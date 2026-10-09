import { useMemo } from 'react'
import { Link } from 'react-router'
import { Anchor, Box, Card, Group, Progress, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import { ArrowRight, BookOpen, Flame, Layers, Target } from 'lucide-react'
import { Heatmap } from '../../components/Heatmap'
import { LEVEL_COLORS } from '../../components/ui'
import { LEVELS } from '../../data/types'
import { lessonsByLevel } from '../../data/grammar'
import { addDays, dayKey, startOfDay } from '../../lib/date'
import { bestStreak, computeStreak, useStore } from '../../lib/store'
import { vocabCounts } from '../vocab/selectors'
import { lessonStatus } from '../grammar/status'
import { useDayDetails } from '../history/Activity'

const SPARK_DAYS = 14

/** The Today page's progress section: four headline numbers, each with a small picture, over the activity grid. */
export function ProgressCard() {
  const state = useStore()
  const { activity } = state
  const goal = state.settings.dailyGoal
  const dayDetails = useDayDetails()

  const streak = computeStreak(activity)
  const best = useMemo(() => bestStreak(activity), [activity])
  const { learned, mature } = useMemo(() => vocabCounts(state), [state])
  const levels = useMemo(
    () =>
      LEVELS.map((l) => {
        const lessons = lessonsByLevel(l)
        const done = lessons.filter((x) => ['mastered', 'due'].includes(lessonStatus(state.lessons[x.id]))).length
        return { level: l, done, total: lessons.length }
      }),
    [state.lessons],
  )
  const mastered = levels.reduce((a, l) => a + l.done, 0)
  const lessonTotal = levels.reduce((a, l) => a + l.total, 0)
  const working = levels.find((l) => l.done < l.total)

  const { days, total, week, weekAcc } = useMemo(() => {
    const today = startOfDay()
    const days = Array.from({ length: SPARK_DAYS }, (_, i) => {
      const date = addDays(today, i - SPARK_DAYS + 1)
      const a = activity[dayKey(date)]
      return { key: dayKey(date), date, items: a?.items ?? 0, correct: a?.correct ?? 0 }
    })
    const last7 = days.slice(-7)
    const week = last7.reduce((n, d) => n + d.items, 0)
    const right = last7.reduce((n, d) => n + d.correct, 0)
    const total = Object.values(activity).reduce((n, d) => n + d.items, 0)
    return { days, total, week, weekAcc: week ? Math.round((right / week) * 100) : null }
  }, [activity])

  return (
    <Box component="section" aria-labelledby="progress-title" mt="xl">
      <Group justify="space-between" gap="sm" mb="sm">
        <Title order={2} size="h4" id="progress-title">
          Your progress
        </Title>
        <Anchor component={Link} to="/profile" size="sm" fw={600} display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
          Profile <ArrowRight size={14} aria-hidden />
        </Anchor>
      </Group>
      <Card padding={0}>
        <div className="progress-metrics">
          <Metric
            icon={<Flame size={15} aria-hidden />}
            color="orange"
            label="Day streak"
            value={streak}
            unit={streak === 1 ? 'day' : 'days'}
            caption={best > streak ? `Best: ${best} days` : streak > 0 ? 'Your best yet' : 'Study today to start one'}
          >
            <WeekDots days={days.slice(-7)} />
          </Metric>
          <Metric
            icon={<Layers size={15} aria-hidden />}
            color="accent"
            label="Words started"
            value={learned.toLocaleString()}
            caption={learned ? `${mature.toLocaleString()} well known` : 'Open a deck to begin'}
          >
            <Progress.Root size={8} radius="xl" aria-label={`${mature} of ${learned} words well known`}>
              <Progress.Section value={learned ? (mature / learned) * 100 : 0} color="accent" />
              <Progress.Section value={learned ? ((learned - mature) / learned) * 100 : 0} color="var(--primary-soft)" />
            </Progress.Root>
          </Metric>
          <Metric
            icon={<BookOpen size={15} aria-hidden />}
            color="green"
            label="Lessons mastered"
            value={mastered}
            unit={`/ ${lessonTotal}`}
            caption={working ? `Working on ${working.level} · ${working.done} of ${working.total}` : 'Every level mastered'}
          >
            <div className="progress-levels">
              {levels.map((l) => (
                <div key={l.level} title={`${l.level}: ${l.done} of ${l.total} mastered`}>
                  <Progress value={(l.done / Math.max(1, l.total)) * 100} color={LEVEL_COLORS[l.level]} size={8} radius="xl" aria-label={`${l.level}: ${l.done} of ${l.total} mastered`} />
                  <Text fz={10} lh={1} c="dimmed" mt={6}>
                    {l.level}
                  </Text>
                </div>
              ))}
            </div>
          </Metric>
          <Metric
            icon={<Target size={15} aria-hidden />}
            color="blue"
            label="Total answers"
            value={total.toLocaleString()}
            caption={week ? `${week.toLocaleString()} this week${weekAcc !== null ? ` · ${weekAcc}% right` : ''}` : 'None this week yet'}
          >
            <Sparkline days={days} goal={goal} />
          </Metric>
        </div>
        <Box p="lg" className="progress-heatmap">
          <Heatmap activity={activity} goal={goal} details={dayDetails} />
        </Box>
      </Card>
    </Box>
  )
}

function Metric({
  icon,
  color,
  label,
  value,
  unit,
  caption,
  children,
}: {
  icon: React.ReactNode
  color: MantineColor
  label: string
  value: React.ReactNode
  unit?: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <div className="progress-metric">
      <Group gap={8} wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={26} radius="md">
          {icon}
        </ThemeIcon>
        <Text size="xs" fw={600} c="dimmed" lineClamp={1}>
          {label}
        </Text>
      </Group>
      <Text fz={28} fw={700} lh={1.1} mt={10} className="tnum">
        {value}
        {unit && (
          <Text span c="dimmed" size="sm" fw={500} ml={4}>
            {unit}
          </Text>
        )}
      </Text>
      <div className="progress-metric__visual">{children}</div>
      {caption && (
        <Text size="xs" c="dimmed" mt={8} lineClamp={1}>
          {caption}
        </Text>
      )}
    </div>
  )
}

/** The last seven days, one dot each, today last. */
function WeekDots({ days }: { days: { key: string; date: Date; items: number }[] }) {
  const today = dayKey()
  const studied = days.filter((d) => d.items > 0).length
  return (
    <div className="progress-week" role="img" aria-label={`Studied ${studied} of the last 7 days`}>
      {days.map((d) => (
        <div key={d.key} className="progress-week__day">
          <span className={`progress-week__dot${d.items ? ' is-on' : ''}${d.key === today ? ' is-today' : ''}`} />
          <span className="progress-week__label">{d.date.toLocaleDateString('en', { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  )
}

/** Answers per day for the last two weeks; a full bar is the daily goal (or the best day, if higher). */
function Sparkline({ days, goal }: { days: { key: string; items: number }[]; goal: number }) {
  const top = Math.max(goal, ...days.map((d) => d.items), 1)
  return (
    <div className="progress-spark" role="img" aria-label={`Answers per day over the last ${days.length} days: ${days.map((d) => d.items).join(', ')}`}>
      {days.map((d) => (
        <span
          key={d.key}
          className={`progress-spark__bar${d.items ? ' is-on' : ''}${d.items >= goal ? ' is-goal' : ''}`}
          style={{ height: d.items ? `${Math.max(12, (d.items / top) * 100)}%` : undefined }}
        />
      ))}
    </div>
  )
}
