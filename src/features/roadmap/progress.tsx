import { Link } from 'react-router'
import { Anchor, Box, Group, Paper, Progress, SimpleGrid, Text, UnstyledButton } from '@mantine/core'
import { Check, Clock } from 'lucide-react'
import { AREA_LABEL, AREAS, formatHours, type Area } from '../../lib/studyTime'
import { checksIn } from './exits'
import { areaShare, checkShare, fmtCheck, useRoadmapStatus } from './status'

function Meter({ label, value, numbers, done, to }: { label: string; value: number; numbers: string; done: boolean; to?: string }) {
  const text = (
    <Text size="xs" c="dimmed" lineClamp={1} title={label}>
      {label}
    </Text>
  )
  return (
    <Box miw={0}>
      {to ? (
        <Anchor component={Link} to={to} underline="hover" c="dimmed" display="block">
          {text}
        </Anchor>
      ) : (
        text
      )}
      <Group gap={8} wrap="nowrap">
        <Progress value={value * 100} size={6} radius="xl" color={done ? 'green' : undefined} style={{ flex: 1 }} aria-label={`${label}: ${numbers}`} />
        <Text size="xs" fw={600} className="tnum" c={done ? 'green' : undefined} style={{ flexShrink: 0 }}>
          {done && <Check size={11} aria-hidden style={{ marginRight: 2, verticalAlign: -1 }} />}
          {numbers}
        </Text>
      </Group>
    </Box>
  )
}

/**
 * One area's part of the roadmap, for the top of a section: the exit-test lines
 * for this area (or some of them) and, optionally, time spent here against the plan.
 */
export function RoadmapStrip({ area, only, showTime = true }: { area: Area; only?: string[]; showTime?: boolean }) {
  const { phase, checks, time, plan, started } = useRoadmapStatus()
  const mine = checksIn(checks, area).filter((c) => !only || only.includes(c.id))
  const planned = plan[area] * 60
  const spent = time.areas[area]
  if (!mine.length && !showTime) return null
  return (
    <Paper withBorder radius="md" px="sm" py={8} mb="sm" component="section" aria-label={`Roadmap: ${AREA_LABEL[area]}`}>
      <Group justify="space-between" gap={8} mb={4}>
        <Text size="xs" fw={650}>
          {started ? `Roadmap · ${phase.id === 'EX' ? 'exam block' : phase.id} exit test` : `${phase.level} goals`}
        </Text>
        <Anchor component={Link} to="/roadmap" size="xs">
          Roadmap
        </Anchor>
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md" verticalSpacing={6}>
        {mine.map((c) => (
          <Meter key={c.id} label={c.label} value={checkShare(c)} numbers={fmtCheck(c)} done={c.done} to={c.to} />
        ))}
        {showTime && (
          <Meter
            label={`${AREA_LABEL[area]} time (plan to end of ${phase.id === 'EX' ? 'the exam block' : phase.id})`}
            value={planned ? Math.min(1, spent / planned) : 1}
            numbers={`${formatHours(spent)} / ${formatHours(planned)} h`}
            done={spent >= planned}
            to="/profile#time"
          />
        )}
      </SimpleGrid>
    </Paper>
  )
}

/** Every area at a glance: share of its exit-test lines done, and time against the plan. Links to the roadmap. */
export function AreaOverview({ compact = false }: { compact?: boolean }) {
  const { phase, checks, time, plan, started } = useRoadmapStatus()
  const total = checks.find((c) => c.id === 'time')
  return (
    <Box>
      <Group justify="space-between" gap={8} mb={8}>
        <Text size="sm" fw={650}>
          {started ? `Toward the ${phase.id === 'EX' ? 'exam block' : phase.id} exit test` : `${phase.level} goals`}
          <Text span c="dimmed" size="sm" fw={500}>
            {' '}
            · {checks.filter((c) => c.done).length}/{checks.length} lines done
          </Text>
        </Text>
        {total && (
          <Group gap={4} wrap="nowrap">
            <Clock size={14} aria-hidden />
            <Text size="sm" className="tnum" fw={600}>
              {formatHours(time.total)} / {total.target} h
            </Text>
          </Group>
        )}
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" verticalSpacing={compact ? 6 : 10}>
        {AREAS.map((a) => {
          const cs = checksIn(checks, a)
          const v = areaShare(cs)
          const done = cs.length > 0 && cs.every((c) => c.done)
          return (
            <UnstyledButton key={a} component={Link} to={`/roadmap#exit-${a}`} style={{ minWidth: 0 }}>
              <Meter
                label={AREA_LABEL[a]}
                value={v}
                numbers={`${Math.round(v * 100)}% · ${formatHours(time.areas[a])}/${formatHours(plan[a] * 60)} h`}
                done={done}
              />
            </UnstyledButton>
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
