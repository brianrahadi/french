import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Group,
  NativeSelect,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  type MantineColor,
} from '@mantine/core'
import {
  Briefcase,
  Check,
  Coffee,
  Croissant,
  Handshake,
  Hotel,
  House,
  Map as MapIcon,
  MessagesSquare,
  Newspaper,
  Package,
  PartyPopper,
  Phone,
  Plane,
  ShoppingBag,
  Stethoscope,
  Ticket,
  TrainFront,
  Trash2,
  User,
  Utensils,
} from 'lucide-react'
import { SCENARIOS, SCENARIO_BY_ID, type ScenarioIcon } from '../../data/scenarios'
import { LEVELS, type Level } from '../../data/types'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { PageHeader } from '../../components/PageHeader'
import { LevelBadge } from '../../components/ui'
import { newId, useStore } from '../../lib/store'
import { describeConfig, useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { ago } from '../../lib/date'
import { frTypo } from '../../lib/words'
import type { Conversation } from './types'

export const SCENARIO_ICONS: Record<ScenarioIcon, React.ComponentType<{ size?: number }>> = {
  coffee: Coffee,
  croissant: Croissant,
  map: MapIcon,
  hotel: Hotel,
  stethoscope: Stethoscope,
  shopping: ShoppingBag,
  phone: Phone,
  briefcase: Briefcase,
  home: House,
  train: TrainFront,
  party: PartyPopper,
  package: Package,
  utensils: Utensils,
  handshake: Handshake,
  newspaper: Newspaper,
  plane: Plane,
  user: User,
  ticket: Ticket,
}

/** Badge colour for a 0–100 feedback score. */
function scoreColor(score: number): MantineColor {
  return score >= 85 ? 'green' : score >= 60 ? 'orange' : 'red'
}

const FREE_TOPICS = ['ton week-end', 'les films et les séries', 'la cuisine', 'ton travail ou tes études', 'les voyages', 'ta ville']

/** Creates a conversation and returns its id. */
export function useStartConversation() {
  const saveConversation = useStore((s) => s.saveConversation)
  const ai = useAiConfig()
  return (opts: { scenarioId: string; level: Level; topic?: string }) => {
    const sc = SCENARIO_BY_ID[opts.scenarioId]
    const now = new Date().toISOString()
    const c: Conversation = {
      id: newId('c'),
      scenarioId: opts.scenarioId,
      title: sc ? sc.titleFr : opts.topic?.trim() ? opts.topic.trim() : 'Conversation libre',
      level: sc?.level ?? opts.level,
      topic: opts.topic?.trim() || undefined,
      turns: [
        {
          id: newId('t'),
          role: 'ai',
          text: sc ? sc.opening : freeOpening(opts.topic),
          translation: sc ? sc.openingEn : freeOpeningEn(opts.topic),
          at: now,
        },
      ],
      goalsMet: [],
      startedAt: now,
      updatedAt: now,
      model: ai ? describeConfig(ai) : '',
    }
    saveConversation(c)
    return c.id
  }
}

function freeOpening(topic?: string): string {
  return topic?.trim()
    ? `Salut ! Moi, c'est Camille. Alors, parlons un peu de ça : ${topic.trim()}. Tu commences ?`
    : "Salut ! Je suis Camille. De quoi est-ce que tu veux parler aujourd'hui ?"
}
function freeOpeningEn(topic?: string): string {
  return topic?.trim()
    ? `Hi! I’m Camille. So, let’s talk a bit about this: ${topic.trim()}. Do you want to start?`
    : 'Hi! I’m Camille. What would you like to talk about today?'
}

export default function TalkHome() {
  useDocumentTitle('Conversation')
  const navigate = useNavigate()
  const ai = useAiConfig()
  const conversations = useStore((s) => s.conversations)
  const deleteConversation = useStore((s) => s.deleteConversation)
  const startLevel = useStore((s) => s.startLevel)
  const start = useStartConversation()
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [freeLevel, setFreeLevel] = useState<Level>(startLevel ?? 'A2')
  const [topic, setTopic] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  const done = new Set(conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  const shown = SCENARIOS.filter((s) => level === 'all' || s.level === level)
  const go = (scenarioId: string, lvl: Level, t?: string) => navigate(`/talk/${start({ scenarioId, level: lvl, topic: t })}`)

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Conversation"
        title="Talk"
        subtitle="Role-play real situations with an AI partner who stays in character. Each message you send gets quietly corrected, you can ask for help or hear every reply, and at the end you get feedback on the whole conversation."
      />

      {!ai && (
        <Box mb="lg">
          <ConnectAiCard title="Connect an AI to start talking" />
        </Box>
      )}

      <Card component="section" aria-labelledby="free-title">
        <Group align="flex-start" gap={18} wrap="nowrap">
          <ThemeIcon size={44} radius="md" variant="light" visibleFrom="xs">
            <MessagesSquare size={22} aria-hidden />
          </ThemeIcon>
          <Box flex={1} miw={0}>
            <Title order={2} id="free-title" fz={17} fw={650}>
              Free conversation
            </Title>
            <Text size="sm" c="dimmed">
              Chat about anything with Camille, a friendly French speaker.
            </Text>
            <Group
              component="form"
              gap={8}
              mt={12}
              wrap="wrap"
              onSubmit={(e) => {
                e.preventDefault()
                if (ai) go('free', freeLevel, topic)
              }}
            >
              <TextInput
                flex="1 1 200px"
                miw={0}
                value={topic}
                onChange={(e) => setTopic(e.currentTarget.value)}
                placeholder="Topic (optional) — e.g. les vacances"
                aria-label="Topic"
              />
              <NativeSelect w={84} value={freeLevel} onChange={(e) => setFreeLevel(e.currentTarget.value as Level)} aria-label="Your level" data={[...LEVELS]} />
              <Button type="submit" disabled={!ai}>
                Start
              </Button>
            </Group>
            <Group gap={6} mt={8}>
              {FREE_TOPICS.map((t) => (
                <Chip key={t} size="xs" checked={topic === t} onChange={() => setTopic(t)}>
                  {t}
                </Chip>
              ))}
            </Group>
          </Box>
        </Group>
      </Card>

      <Box component="section" mt="xl" aria-labelledby="scenarios-title">
        <Group justify="space-between" gap="sm" mb="xs">
          <Title order={2} size="h4" id="scenarios-title">
            Situations
          </Title>
          <SegmentedControl
            size="xs"
            value={level}
            onChange={(v) => setLevel(v as Level | 'all')}
            data={(['all', ...LEVELS] as const).map((l) => ({ value: l, label: l === 'all' ? 'All' : l }))}
            aria-label="Level"
          />
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing={12}>
          {shown.map((s) => {
            const Icon = SCENARIO_ICONS[s.icon] ?? MessagesSquare
            return (
              <Card
                key={s.id}
                component="button"
                type="button"
                padding="md"
                ta="left"
                onClick={() => go(s.id, s.level)}
                disabled={!ai}
                title={ai ? undefined : 'Connect an AI first'}
                opacity={ai ? undefined : 0.55}
                style={{ font: 'inherit', color: 'inherit', cursor: ai ? 'pointer' : 'not-allowed' }}
              >
                <Stack gap={3} align="flex-start">
                  <Group gap={10} w="100%" mb={4}>
                    <ThemeIcon size={38} radius="md" variant="light">
                      <Icon size={20} />
                    </ThemeIcon>
                    <LevelBadge level={s.level} />
                    {done.has(s.id) && (
                      <Badge color="green" size="sm" ml="auto" leftSection={<Check size={12} aria-hidden />}>
                        done
                      </Badge>
                    )}
                  </Group>
                  <Text fz={17} fw={600} lh={1.25} className="fr" lang="fr">
                    {frTypo(s.titleFr)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {s.title}
                  </Text>
                  <Text size="sm" c="dimmed" mt={6}>
                    {s.goals.length} goals · with {s.aiName}
                  </Text>
                </Stack>
              </Card>
            )
          })}
        </SimpleGrid>
      </Box>

      {conversations.length > 0 && (
        <Box component="section" mt="xl" aria-labelledby="history-title">
          <Title order={2} size="h4" id="history-title" mb="xs">
            <Group component="span" gap={8} wrap="nowrap">
              <span>Your conversations</span>
              <Text span c="dimmed" size="sm" fw={500} className="tnum">
                {conversations.length}
              </Text>
            </Group>
          </Title>
          <Card padding={0}>
            {conversations.map((c, i) => {
              const mine = c.turns.filter((t) => t.role === 'me').length
              return (
                <Box key={c.id}>
                  {i > 0 && <Divider />}
                  <Group gap={10} wrap="nowrap" px="md" py="sm">
                    <Anchor component={Link} to={`/talk/${c.id}`} c="inherit" underline="never" flex={1} miw={0}>
                      <Text fz={17} fw={600} truncate className="fr" lang="fr">
                        {frTypo(c.title)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {ago(c.updatedAt)} · {mine} message{mine === 1 ? '' : 's'}
                        {SCENARIO_BY_ID[c.scenarioId] ? ` · ${c.goalsMet.length}/${SCENARIO_BY_ID[c.scenarioId].goals.length} goals` : ''}
                        {!c.feedback && mine > 0 ? ' · in progress' : ''}
                      </Text>
                    </Anchor>
                    <LevelBadge level={c.level} />
                    {c.feedback && (
                      <Badge color={scoreColor(c.feedback.score)} className="tnum">
                        {c.feedback.score}
                      </Badge>
                    )}
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setConfirm(c.id)} aria-label={`Delete ${c.title}`}>
                      <Trash2 size={15} aria-hidden />
                    </ActionIcon>
                  </Group>
                </Box>
              )
            })}
          </Card>
        </Box>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this conversation?"
        actions={
          <>
            <Button variant="subtle" color="gray" onClick={() => setConfirm(null)} data-autofocus>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (confirm) deleteConversation(confirm)
                setConfirm(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <Text c="dimmed">The transcript and feedback will be removed from this browser.</Text>
      </Dialog>
    </Container>
  )
}
