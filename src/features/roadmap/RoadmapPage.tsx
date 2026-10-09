import { Link } from 'react-router'
import { Accordion, Anchor, Badge, Box, Card, Container, Group, Stack, Table, Text, Title } from '@mantine/core'
import { Check } from 'lucide-react'
import { lessonsByLevel } from '../../data/grammar'
import { DECKS } from '../../data/vocab'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { AUDIO_LESSONS } from '../../data/audio'
import { SCENARIOS } from '../../data/scenarios'
import { WRITING_PROMPTS } from '../../data/writing'
import { SOUND_SETS } from '../../data/sounds'
import { LEVEL_INFO, type Level } from '../../data/types'
import { PageHeader } from '../../components/PageHeader'
import { LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { currentLevel } from '../../lib/level'
import { useDocumentTitle } from '../../lib/hooks'
import { lessonStatus } from '../grammar/status'

/** One line per level: what it should let you do. */
const GOALS: Record<Level, string> = {
  A1: 'Introduce yourself and handle simple everyday exchanges in the present tense.',
  A2: 'Talk about the past and your plans, use pronouns, and run errands on your own.',
  B1: 'Give and defend opinions, tell detailed stories, use the subjunctive and si-clauses.',
  B2: 'Argue in a structured way, control register and nuance, follow French at natural speed.',
}

const BANDS: { name: string; levels: Level[] }[] = [
  { name: 'Basic user', levels: ['A1', 'A2'] },
  { name: 'Independent user', levels: ['B1', 'B2'] },
]

/** TCF sections, with the score that counts as B2. */
const TCF: [string, string, string][] = [
  ['Listening', '39 questions · 35 min', '400–499'],
  ['Reading', '39 questions · 60 min', '400–499'],
  ['Writing', '3 tasks · 60 min', '10–13 / 20'],
  ['Speaking', '3 tasks · 12 min', '10–13 / 20'],
]

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function RoadmapPage() {
  useDocumentTitle('Roadmap')
  const s = useStore()
  const level = currentLevel(s)

  return (
    <Container size={960} py="xl">
      <PageHeader eyebrow="Feuille de route" title="The road to TCF B2" />

      <Stack gap="xl">
        {BANDS.map((b) => (
          <Box component="section" key={b.name} aria-labelledby={`band-${b.levels[0]}`}>
            <Group gap={8} align="baseline" mb="sm">
              <Title order={2} size="h4" id={`band-${b.levels[0]}`}>
                {b.name}
              </Title>
              <Text size="sm" c="dimmed">
                {b.levels.join('–')}
              </Text>
            </Group>
            <Accordion variant="separated" multiple defaultValue={b.levels.includes(level) ? [level] : []}>
              {b.levels.map((l) => (
                <LevelItem key={l} level={l} />
              ))}
            </Accordion>
          </Box>
        ))}

        <Card component="section" aria-labelledby="exam-title" padding="lg">
          <Title order={2} size="h4" id="exam-title" mb="sm">
            TCF B2
          </Title>
          <Table verticalSpacing={6} fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Section</Table.Th>
                <Table.Th>Format</Table.Th>
                <Table.Th>B2 score</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {TCF.map(([name, format, score]) => (
                <Table.Tr key={name}>
                  <Table.Td fw={600}>{name}</Table.Td>
                  <Table.Td c="dimmed">{format}</Table.Td>
                  <Table.Td className="tnum">{score}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group gap="md" mt="md">
            <Anchor component={Link} to="/writing/new?prompt=free&timed=60" size="sm">
              Timed writing (60 min)
            </Anchor>
            <Anchor component={Link} to="/library#talk" size="sm">
              Conversations
            </Anchor>
            <Anchor component={Link} to="/weak" size="sm">
              Weak spots
            </Anchor>
          </Group>
        </Card>
      </Stack>
    </Container>
  )
}

function LevelItem({ level }: { level: Level }) {
  const lessons = useStore((s) => s.lessons)
  const grammar = lessonsByLevel(level)
  const at = <T extends { level: Level }>(xs: T[]) => xs.filter((x) => x.level === level).length
  const content: [string, string][] = [
    [count(at(DECKS.filter((d) => !d.group)), 'word deck'), '/vocab'],
    [count(at(STORIES), 'story', 'stories'), '/library#stories'],
    [count(at(BUILTIN_TEXTS), 'graded text'), '/library#texts'],
    [count(at(AUDIO_LESSONS), 'audio lesson'), '/library#audio'],
    [count(at(SCENARIOS), 'role-play'), '/library#talk'],
    [count(at(WRITING_PROMPTS), 'writing prompt'), '/library#writing'],
    ...(level === 'A1' ? ([[count(SOUND_SETS.length, 'pronunciation set'), '/speaking']] as [string, string][]) : []),
  ]

  return (
    <Accordion.Item value={level}>
      <Accordion.Control>
        <Group gap="sm" wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <LevelBadge level={level} />
          </Box>
          <Text fw={650}>{LEVEL_INFO[level].name}</Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          <Text size="sm">{GOALS[level]}</Text>
          <Group gap={6}>
            {grammar.map((l) => {
              const st = lessonStatus(lessons[l.id])
              const done = st === 'mastered' || st === 'due'
              return (
                <Badge
                  key={l.id}
                  component={Link}
                  to={`/grammar/${l.id}`}
                  variant={done ? 'light' : 'default'}
                  color={done ? 'green' : undefined}
                  radius="xl"
                  tt="none"
                  fw={500}
                  size="lg"
                  leftSection={done ? <Check size={12} aria-label="Mastered" /> : undefined}
                  style={{ cursor: 'pointer' }}
                >
                  {l.title}
                </Badge>
              )
            })}
          </Group>
          <Group gap="md">
            {content.map(([label, to]) => (
              <Anchor key={label} component={Link} to={to} size="sm">
                {label}
              </Anchor>
            ))}
          </Group>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  )
}
