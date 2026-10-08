import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Accordion, Anchor, Badge, Box, Button, Card, Container, Group, List, Progress, SegmentedControl, SimpleGrid, Stack, Table, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { Check, Circle } from 'lucide-react'
import { LESSON_BY_ID } from '../../data/grammar'
import { LEVELS, type Level } from '../../data/types'
import { PageHeader } from '../../components/PageHeader'
import { Stat } from '../../components/ui'
import { useStore } from '../../lib/store'
import { addDays, parseDayKey } from '../../lib/date'
import { useDocumentTitle } from '../../lib/hooks'
import { nextMonday, PHASES, phaseOf, position, START_WEEK, WEEK_KIND_LABEL, WEEKS, WEEKS_TOTAL, weekStart, type PhaseId } from './plan'
import { activePhase, areaPlanThrough, checksIn, EXIT_AREAS, exitChecks, hoursThrough, type ExitArea, type ExitCheck } from './exits'
import { fmtCheck } from './status'
import { AREA_LABEL, formatHours, timeTotals, trackingSince } from '../../lib/studyTime'

const fmt = (d: Date, year = false) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) })
const levelForWeek = (w: number): Level => (Object.entries(START_WEEK) as [Level, number][]).reduce<Level>((l, [lv, from]) => (w >= from ? lv : l), 'A1')

const RULES: [string, string][] = [
  ['The daily session comes first, every day', 'Reviews only work if they happen on the day they’re due. On a rough day, switch to the minimum: the session plus one audio. A short day keeps the streak; a skipped day costs a week of reviews piling up.'],
  ['Writing only helps once it’s corrected', 'Write a little every weekday. Each mistake is explained, linked to its lesson and logged to Weak spots, so the next practice targets it.'],
  ['Talk twice a week, out loud', 'A role-play on Tuesday and a free conversation on Friday; from B2, the DELF oral examiner. Answer with the microphone rather than typing whenever you can, and always press Finish for the score.'],
  ['Expect the B1 plateau', 'Weeks 25–38 will feel slow, because comprehension grows faster than speaking. The phase is long on purpose, and its exit test checks skills rather than how it feels.'],
  ['Light weeks are planned in', 'Travel, holidays and three deload weeks run on the session plus audio, with no new grammar, so life doesn’t knock the plan off course.'],
  ['Move on when the exit test says so', 'Each phase has an exit test measured from your progress: everything the app has at that level done, plus the volume of writing, conversation, listening, reading and study time the phase’s daily lessons add up to. If a line is still grey when the phase ends, keep its practice going before the next phase’s new grammar.'],
  ['Time is counted while you study', 'The app counts the minutes a study page is open and in use (you typed, tapped or scrolled, or it was speaking, in the last two minutes), per area and per device. Days from before tracking started are estimated from what you did.'],
]

const EXIT_AREA_LABEL: Record<ExitArea, string> = { ...AREA_LABEL, time: 'Study time' }

export default function RoadmapPage() {
  useDocumentTitle('Roadmap')
  const roadmap = useStore((s) => s.roadmap)
  const setRoadmap = useStore((s) => s.setRoadmap)
  const progress = useStore()
  const startLevel = useStore((s) => s.startLevel)

  const [draftStart, setDraftStart] = useState(roadmap.start ?? nextMonday())
  const [draftLevel, setDraftLevel] = useState<Level>(roadmap.start ? levelForWeek(roadmap.startWeek) : (startLevel ?? 'A1'))
  const [dateError, setDateError] = useState('')
  const [today] = useState(() => new Date())
  const pos = position(roadmap, today)
  const current = phaseOf(pos.week)
  const started = !!roadmap.start
  const daysStudied = Object.entries(progress.activity).filter(([d, a]) => !!roadmap.start && d >= roadmap.start && a.items > 0).length
  const end = addDays(weekStart(roadmap, WEEKS_TOTAL), 6)
  const hours = PHASES.filter((p) => p.to >= roadmap.startWeek).reduce((n, p) => n + p.hours, 0)
  const time = useMemo(() => timeTotals(progress), [progress])
  const since = trackingSince(progress.studyTime)
  // The phase whose exit test still needs work (it can be behind the calendar); /roadmap#exit-listening links to its areas.
  const focus = started ? activePhase(progress, pos.week) : undefined

  const save = () => {
    const d = parseDayKey(draftStart)
    if (Number.isNaN(d.getTime()) || d.getDay() !== 1) {
      setDateError('Pick a Monday, so each plan week runs Monday to Sunday.')
      return
    }
    setDateError('')
    setRoadmap({ start: draftStart, startWeek: START_WEEK[draftLevel] })
  }
  const dirty = !started || draftStart !== roadmap.start || START_WEEK[draftLevel] !== roadmap.startWeek

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Feuille de route"
        title="The road to B2"
        subtitle="52 weeks in five phases, each with an exit test measured from your progress. Every day of it appears on Today as a lesson to work through, all of it in the app."
      />

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="lg">
        <Stat label="Week" value={started && pos.week >= 1 ? Math.min(pos.week, WEEKS_TOTAL) : 0} unit={`/ ${WEEKS_TOTAL}`} />
        <Stat label="Phase" value={current ? current.id : pos.week > WEEKS_TOTAL ? 'Done' : 'Setup'} />
        <Stat label="Study time" value={formatHours(time.total)} unit={` / ${hours} h`} />
        <Stat label="Days studied" value={daysStudied} />
      </SimpleGrid>

      <Card component="section" aria-labelledby="setup-title" padding="lg" mb="lg">
        <Title order={2} size="h4" id="setup-title" mb={4}>
          {started ? 'Your plan' : 'Start the plan'}
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          {started
            ? `Started ${fmt(parseDayKey(roadmap.start!), true)} · ends around ${fmt(end, true)}.`
            : 'Pick the Monday you start and where you’re starting from. Until then, Today shows the setup steps.'}
        </Text>
        <Group align="flex-end" gap="md" wrap="wrap">
          <TextInput type="date" label="First Monday" value={draftStart} onChange={(e) => setDraftStart(e.currentTarget.value)} error={dateError || undefined} w={190} />
          <Box>
            <Text size="sm" fw={500} mb={4} id="start-level-label">
              Starting level
            </Text>
            <SegmentedControl value={draftLevel} onChange={(v) => setDraftLevel(v as Level)} data={LEVELS} aria-labelledby="start-level-label" />
          </Box>
          <Button onClick={save} disabled={!dirty}>
            {started ? 'Save changes' : 'Start the plan'}
          </Button>
        </Group>
        {draftLevel !== 'A1' && (
          <Text size="xs" c="dimmed" mt="sm">
            Starting at {draftLevel} skips to week {START_WEEK[draftLevel]}. Only do that if you can pass the previous phase’s exit test now.
          </Text>
        )}
      </Card>

      <Box mb="lg" aria-hidden>
        <Group gap={2} wrap="nowrap" style={{ position: 'relative', height: 30, borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
          {PHASES.map((p, i) => (
            <Box
              key={p.id}
              style={{
                flex: p.to - p.from + 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 650,
                background: `var(--mantine-color-${['blue', 'green', 'grape', 'orange', 'red'][i]}-light)`,
                opacity: p.to < roadmap.startWeek ? 0.4 : 1,
              }}
            >
              {p.id === 'EX' ? 'Exam' : p.id}
            </Box>
          ))}
          {started && pos.week >= 1 && pos.week <= WEEKS_TOTAL && (
            <Box style={{ position: 'absolute', top: 0, bottom: 0, width: 3, left: `calc(${(((pos.week - 0.5) / WEEKS_TOTAL) * 100).toFixed(2)}% - 1px)`, background: 'var(--mantine-color-text)' }} />
          )}
        </Group>
      </Box>

      <Accordion variant="separated" multiple defaultValue={[...new Set([current?.id ?? phaseOf(roadmap.startWeek)?.id, focus?.id].filter((x): x is PhaseId => !!x))]} mb="xl">
        {PHASES.map((p) => {
          const skipped = p.to < roadmap.startWeek
          const from = weekStart(roadmap, p.from)
          const to = addDays(weekStart(roadmap, p.to), 6)
          const checks = exitChecks(p.id, progress)
          const passed = checks.filter((c) => c.done).length
          return (
            <Accordion.Item key={p.id} value={p.id}>
              <Accordion.Control>
                <Group gap="md" wrap="nowrap">
                  <Text fw={750} fz={22} w={56} c={skipped ? 'dimmed' : undefined}>
                    {p.id === 'EX' ? 'B2✓' : p.id}
                  </Text>
                  <Box miw={0}>
                    <Group gap={8}>
                      <Text fw={650}>{p.name}</Text>
                      {current?.id === p.id && (
                        <Badge size="sm" radius="xl" tt="none">
                          You are here
                        </Badge>
                      )}
                      {skipped && (
                        <Badge size="sm" variant="default" radius="xl" tt="none">
                          Skipped
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" className="tnum">
                      Weeks {p.from}–{p.to}
                      {!skipped && ` · ${fmt(from)} – ${fmt(to, true)}`} · ≈ {p.hours} h · exit test {passed}/{checks.length}
                    </Text>
                  </Box>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text maw={680}>{p.goal}</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <Box miw={0}>
                      <Text size="sm" fw={650} mb={6}>
                        What you’ll use
                      </Text>
                      <List size="sm" spacing={4}>
                        {p.uses.map((m) => (
                          <List.Item key={m}>{m}</List.Item>
                        ))}
                      </List>
                      <Text size="xs" c="dimmed" mt="sm">
                        Suggested new words per day: {p.newPerDay}.{' '}
                        <Anchor component={Link} to="/settings" size="xs">
                          Settings
                        </Anchor>
                      </Text>
                    </Box>
                    <Box miw={0}>
                      <Text size="sm" fw={650} mb={2}>
                        Time by area
                      </Text>
                      <Text size="xs" c="dimmed" mb={8}>
                        Your study time against what the daily lessons ask for, from where you started to the end of this phase ({hoursThrough(p.id, roadmap.startWeek)} h).
                      </Text>
                      <Stack gap={8}>
                        {Object.entries(areaPlanThrough(p.id, roadmap.startWeek)).map(([a, min]) => {
                          const spent = time.areas[a as keyof typeof time.areas]
                          const ok = spent >= min * 60
                          return (
                            <Box key={a}>
                              <Group justify="space-between" gap={8} wrap="nowrap">
                                <Text size="sm">{AREA_LABEL[a as keyof typeof AREA_LABEL]}</Text>
                                <Text size="sm" c={ok ? 'green' : 'dimmed'} className="tnum">
                                  {formatHours(spent)} / {formatHours(min * 60)} h
                                </Text>
                              </Group>
                              <Progress value={Math.min(100, (spent / Math.max(1, min * 60)) * 100)} size={4} mt={4} color={ok ? 'green' : undefined} aria-label={`${AREA_LABEL[a as keyof typeof AREA_LABEL]} time`} />
                            </Box>
                          )
                        })}
                      </Stack>
                      {time.estimated > 0 && (
                        <Text size="xs" c="dimmed" mt="xs">
                          Includes about {formatHours(time.estimated)} h estimated for days before time tracking started{since ? ` (${fmt(parseDayKey(since), true)})` : ''}.
                        </Text>
                      )}
                    </Box>
                  </SimpleGrid>
                  <Box>
                    <Text size="sm" fw={650} mb={2}>
                      Exit test
                    </Text>
                    <Text size="xs" c="dimmed" mb={10}>
                      Everything the app has at this level, plus the volume the phase’s daily lessons add up to. Don’t move on until every line is green.
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="lg">
                      {EXIT_AREAS.map((a) => {
                        const cs = checksIn(checks, a)
                        if (!cs.length) return null
                        return (
                          <Box key={a} miw={0} id={p.id === focus?.id ? `exit-${a}` : undefined} style={{ scrollMarginTop: 16 }}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '0.04em' }}>
                              {EXIT_AREA_LABEL[a]}
                            </Text>
                            <Stack gap={10}>
                              {cs.map((c) => (
                                <ExitLine key={c.id} c={c} />
                              ))}
                            </Stack>
                          </Box>
                        )
                      })}
                    </SimpleGrid>
                  </Box>
                  <Table.ScrollContainer minWidth={640}>
                    <Table verticalSpacing={6} fz="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Week</Table.Th>
                          <Table.Th>Grammar</Table.Th>
                          <Table.Th>Theme</Table.Th>
                          <Table.Th>Output</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i).map((n) => {
                          const w = WEEKS[n]
                          const here = started && n === pos.week
                          const dim = w.kind !== 'study' || n < roadmap.startWeek
                          return (
                            <Table.Tr key={n} bg={here ? 'var(--mantine-primary-color-light)' : undefined}>
                              <Table.Td c="dimmed" className="tnum" style={{ whiteSpace: 'nowrap' }}>
                                {n} · {fmt(weekStart(roadmap, n))}
                              </Table.Td>
                              {w.kind === 'study' ? (
                                <>
                                  <Table.Td c={dim ? 'dimmed' : undefined}>
                                    {w.grammar}
                                    {w.lessons?.length ? (
                                      <Group gap={6} mt={4}>
                                        {w.lessons.map((id) => (
                                          <Anchor key={id} component={Link} to={`/grammar/${id}`} size="xs" fw={600}>
                                            {LESSON_BY_ID[id]?.title ?? id}
                                          </Anchor>
                                        ))}
                                      </Group>
                                    ) : null}
                                  </Table.Td>
                                  <Table.Td c={dim ? 'dimmed' : undefined}>{w.theme}</Table.Td>
                                  <Table.Td c={dim ? 'dimmed' : undefined}>{w.output}</Table.Td>
                                </>
                              ) : (
                                <Table.Td colSpan={3} c="dimmed" fs="italic">
                                  {WEEK_KIND_LABEL[w.kind]}
                                </Table.Td>
                              )}
                            </Table.Tr>
                          )
                        })}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )
        })}
      </Accordion>

      <Box component="section" aria-labelledby="rules-title">
        <Title order={2} size="h4" id="rules-title" mb="sm">
          How the plan works
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {RULES.map(([t, d]) => (
            <Box key={t} miw={0}>
              <Text fw={650}>{t}</Text>
              <Text size="sm" c="dimmed">
                {d}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        <Text size="sm" c="dimmed" mt="lg" maw={680}>
          A typical week: Monday new grammar, Tuesday listening, Wednesday writing, Thursday consolidation, Friday conversation, Saturday a long reading and listening session, Sunday review. Typical estimates put B2 at 550–650 hours of study in total; the plan adds up to about {hours} hours, plus whatever extra listening you do.
        </Text>
      </Box>
    </Container>
  )
}

function ExitLine({ c }: { c: ExitCheck }) {
  return (
    <Group gap={8} wrap="nowrap" align="flex-start">
      {c.done ? (
        <ThemeIcon size={20} radius="xl" color="green" mt={1} aria-label="Done">
          <Check size={13} />
        </ThemeIcon>
      ) : (
        <Circle size={20} color="var(--mantine-color-dimmed)" style={{ marginTop: 1, flexShrink: 0 }} aria-label="Not yet" />
      )}
      <Box miw={0} style={{ flex: 1 }}>
        <Group justify="space-between" gap={8} wrap="nowrap" align="flex-start">
          <Anchor component={Link} to={c.to} size="sm" c="var(--mantine-color-text)">
            {c.label}
          </Anchor>
          <Text size="sm" c={c.done ? 'green' : 'dimmed'} className="tnum" style={{ flexShrink: 0 }}>
            {fmtCheck(c)}
          </Text>
        </Group>
        {!c.atMost && <Progress value={Math.min(100, (c.value / Math.max(1, c.target)) * 100)} size={4} mt={4} color={c.done ? 'green' : undefined} aria-label={c.label} />}
      </Box>
    </Group>
  )
}
