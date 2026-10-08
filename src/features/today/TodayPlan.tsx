import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Anchor, Badge, Box, Button, Card, Checkbox, Divider, Group, Stack, Switch, Text, Title, UnstyledButton } from '@mantine/core'
import { ArrowRight, Map as MapIcon } from 'lucide-react'
import { useStore } from '../../lib/store'
import { addDays, dayKey, startOfDay } from '../../lib/date'
import { SCENARIO_BY_ID } from '../../data/scenarios'
import { useStartConversation } from '../talk/start'
import { blockMinutes, blocksFor, DAY_FR, DAY_NAMES, MINIMUM_DAY, PHASES, phaseOf, position, WEEK_KIND_LABEL, WEEKS, WEEKS_TOTAL, type PlanBlock } from '../roadmap/plan'
import { autoDone, blockDone } from '../roadmap/done'
import { exitChecks } from '../roadmap/exits'
import { planContext } from '../roadmap/context'
import { AreaOverview } from '../roadmap/progress'
import { formatDuration, sumTime } from '../../lib/studyTime'

const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Today's lesson from the road-to-B2 plan: what to do, in order, and what's already done. */
export function TodayPlan() {
  const state = useStore()
  const navigate = useNavigate()
  const startConversation = useStartConversation()
  const [today] = useState(() => startOfDay())
  const [view, setView] = useState(today)
  const key = dayKey(view)
  const isToday = key === dayKey(today)
  const pos = position(state.roadmap, view)
  const phase = phaseOf(pos.week)
  const week = pos.week >= 1 && pos.week <= WEEKS_TOTAL ? WEEKS[pos.week] : undefined
  const level = phase?.level ?? 'A1'
  const ctx = planContext(state, level)
  const minDay = !!state.planDays[key]?.min
  const blocks = minDay ? MINIMUM_DAY : blocksFor(pos, ctx)
  const total = blockMinutes(blocks)
  const done = blocks.filter((b) => blockDone(b, state, key))
  const doneMin = blockMinutes(done)
  const tracked = Object.values(sumTime(state.studyTime)[key] ?? {}).reduce((a, b) => a + b, 0)
  const notStarted = !state.roadmap.start
  // The exit test that matters now: this phase's in its last week, or the previous one if it isn't passed yet.
  const prev = phase ? PHASES[PHASES.indexOf(phase) - 1] : undefined
  const exitPhase = phase && pos.week === phase.to ? phase : prev && prev.to >= state.roadmap.startWeek ? prev : undefined
  const exit = exitPhase ? exitChecks(exitPhase.id, state) : []
  const exitLeft = exit.filter((c) => !c.done).length

  const monday = addDays(view, -pos.dow)
  const strip = DOW_SHORT.map((label, i) => {
    const d = addDays(monday, i)
    const k = dayKey(d)
    const p = position(state.roadmap, d)
    const bs = state.planDays[k]?.min ? MINIMUM_DAY : blocksFor(p, ctx)
    const complete = bs.length > 0 && bs.every((b) => blockDone(b, state, k))
    return { d, k, label, complete, min: !!state.planDays[k]?.min }
  })

  const open = (b: PlanBlock) => {
    if (b.talk) {
      const sc = SCENARIO_BY_ID[b.talk.scenario]
      navigate(`/talk/${startConversation({ scenarioId: b.talk.scenario, level: sc?.level ?? phase?.level ?? 'A1', topic: b.talk.topic })}`)
    } else if (b.to) navigate(b.to)
  }

  return (
    <Card component="section" aria-labelledby="plan-title" padding="xl" mb={28}>
      <Group justify="space-between" align="flex-start" gap="sm" mb="sm">
        <Box miw={0} style={{ flex: '1 1 320px' }}>
          <Text size="sm" fw={600} c="dimmed">
            {isToday ? 'Leçon du jour' : 'Leçon'} · {DAY_FR[pos.dow]}
          </Text>
          <Title order={2} size="h3" id="plan-title">
            {pos.week === 0 ? 'Week 0: get set up' : pos.week > WEEKS_TOTAL ? 'Plan complete' : week?.kind === 'study' ? DAY_NAMES[pos.dow] : WEEK_KIND_LABEL[week!.kind]}
          </Title>
          <Group gap={6} mt={6}>
            {pos.week >= 1 && pos.week <= WEEKS_TOTAL && (
              <Badge variant="light" radius="xl" tt="none" className="tnum">
                Week {pos.week} of {WEEKS_TOTAL}
              </Badge>
            )}
            {phase && (
              <Badge variant="light" color="green" radius="xl" tt="none">
                {phase.id === 'EX' ? 'Exam block' : `${phase.id} · ${phase.name}`}
              </Badge>
            )}
            {minDay && (
              <Badge variant="light" color="yellow" radius="xl" tt="none">
                Minimum day
              </Badge>
            )}
          </Group>
        </Box>
        <Button component={Link} to="/roadmap" variant="default" size="sm" leftSection={<MapIcon size={16} aria-hidden />}>
          {notStarted ? 'Set up the plan' : 'Roadmap'}
        </Button>
      </Group>

      {week?.kind === 'study' && (
        <Text size="sm" mb="md" maw={680}>
          <Text span fw={650}>
            This week:{' '}
          </Text>
          {week.grammar} <Text span c="dimmed">Theme: {week.theme}.</Text>
        </Text>
      )}
      {exitPhase && exitLeft > 0 && (
        <Text size="sm" mb="md" maw={680} c="orange">
          {exitPhase === phase ? `Last week of ${phase.id}: ` : `${exitPhase.id} exit test not passed yet: `}
          {exit.length - exitLeft} of {exit.length} lines done.{' '}
          <Anchor component={Link} to="/roadmap" size="sm">
            See what’s left
          </Anchor>
        </Text>
      )}
      {notStarted && (
        <Text size="sm" c="dimmed" mb="md" maw={680}>
          A 52-week plan to B2, all in the app: about 75 minutes on weekdays, 2 hours on Saturday, 1 hour on Sunday. Do these setup steps this week, then set your start date on the Roadmap.
        </Text>
      )}

      <Group gap={6} mb="md" wrap="nowrap" role="group" aria-label="Days this week">
        {strip.map((x) => (
          <UnstyledButton
            key={x.k}
            onClick={() => setView(x.d)}
            aria-pressed={x.k === key}
            aria-label={`${x.d.toDateString()}${x.complete ? ', done' : ''}`}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 0',
              borderRadius: 'var(--mantine-radius-md)',
              border: `1px solid ${x.k === key ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)'}`,
              background: x.complete ? (x.min ? 'var(--mantine-color-yellow-light)' : 'var(--mantine-color-green-light)') : undefined,
            }}
          >
            <Text size="xs" c="dimmed">
              {x.label}
            </Text>
            <Text size="sm" fw={650} className="tnum">
              {x.d.getDate()}
            </Text>
          </UnstyledButton>
        ))}
      </Group>

      <Stack gap="xs" component="ol" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {blocks.map((b) => {
          const auto = !!b.auto && autoDone(b.auto, state, key)
          const ok = blockDone(b, state, key)
          return (
            <Card component="li" key={b.id} withBorder padding="sm" radius="md" style={{ opacity: ok ? 0.65 : 1 }}>
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Checkbox
                  mt={3}
                  checked={ok}
                  disabled={auto}
                  onChange={(e) => state.tickBlock(key, b.id, e.currentTarget.checked)}
                  aria-label={`${b.title}${auto ? ' (done in the app)' : ''}`}
                />
                <Box miw={0} style={{ flex: 1 }}>
                  <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
                    <Group gap={8} wrap="wrap" miw={0}>
                      <Text fw={650} td={ok ? 'line-through' : undefined}>
                        {b.title}
                      </Text>
                      {auto && (
                        <Badge size="xs" variant="light" color="green" tt="none">
                          Done in the app
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" className="tnum" style={{ flexShrink: 0 }}>
                      {b.minutes} min
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed" maw={680}>
                    {b.detail}
                  </Text>
                  {(b.to || b.talk) && (
                    <Button mt={8} size="xs" variant={b.id === 'session' && !ok ? 'filled' : 'default'} rightSection={<ArrowRight size={14} aria-hidden />} onClick={() => open(b)}>
                      {b.cta ?? 'Open'}
                    </Button>
                  )}
                </Box>
              </Group>
            </Card>
          )
        })}
      </Stack>

      <Group justify="space-between" mt="md" gap="sm">
        {pos.week >= 1 ? (
          <Switch checked={minDay} onChange={(e) => state.setMinimumDay(key, e.currentTarget.checked)} label="Rough day: just the 25-minute minimum" />
        ) : (
          <span />
        )}
        <Group gap="md">
          <Text size="sm" c="dimmed" className="tnum">
            {doneMin} / {total} min done · {formatDuration(tracked)} studied{isToday ? ' so far' : ''}
          </Text>
          {!isToday && (
            <Anchor component="button" type="button" size="sm" onClick={() => setView(today)}>
              Back to today
            </Anchor>
          )}
        </Group>
      </Group>

      <Divider my="md" />
      <AreaOverview />
    </Card>
  )
}
