import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Flame,
  Headphones,
  Layers,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Play,
  Settings,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react'
import { THEMED_DECKS } from '../../data/vocab'
import { LESSONS, lessonsByLevel } from '../../data/grammar'
import { LEVEL_INFO, LEVELS, type Level } from '../../data/types'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { Heatmap } from '../../components/Heatmap'
import { Kbd, LevelBadge, Ring, Stat } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { computeStreak, useStore } from '../../lib/store'
import { dayKey, frenchDate } from '../../lib/date'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { buildMixedPlan } from '../session/plan'
import { remaining } from '../session/run'
import { loadSession, settleSession } from '../session/saved'
import { dueCardIds, newAvailableToday, vocabCounts } from '../vocab/selectors'
import { dueLessons, lessonStatus, nextUp } from '../grammar/status'
import { computeWeakSpots } from '../weak/weak'
import { speechSupported } from '../../lib/speech'
import { recognitionSupported } from '../../lib/recognition'
import { SyncPrompt } from '../../components/SyncAccount'
import { ContinueRows, useContinue, useDayDetails } from '../history/Activity'

export default function TodayPage() {
  useDocumentTitle('')
  const state = useStore()
  const navigate = useNavigate()
  const today = state.activity[dayKey()] ?? { items: 0, correct: 0, newWords: 0 }
  const streak = computeStreak(state.activity)
  const goal = state.settings.dailyGoal
  const dayDetails = useDayDetails()
  const due = useMemo(() => dueCardIds(state.cards, state.customWords).length, [state.cards, state.customWords])
  const fresh = newAvailableToday(state)
  const grammarDue = dueLessons(state.lessons)
  const up = nextUp(state.lessons)
  const { learned } = useMemo(() => vocabCounts(state), [state])
  const mastered = LESSONS.filter((l) => ['mastered', 'due'].includes(lessonStatus(state.lessons[l.id]))).length
  const totalItems = Object.values(state.activity).reduce((a, d) => a + d.items, 0)
  const hour = new Date().getHours()
  const greeting = hour >= 18 || hour < 4 ? 'Bonsoir' : 'Bonjour'
  const firstRun = !state.startLevel && totalItems === 0
  const tenses = state.conjConfig.tenses.map((t) => TENSE_BY_ID[t]?.label).filter(Boolean)
  const plan = useMemo(() => buildMixedPlan(state, Math.random, { tts: speechSupported, asr: recognitionSupported }), [state])
  // A session left part-way today is carried on rather than started again.
  const saved = useMemo(() => loadSession(state), [state])
  useEffect(() => settleSession(), [])
  const hasSession = !!saved || plan.items.length > 0
  const weak = useMemo(() => computeWeakSpots(state), [state])
  const weakCount = weak.total + weak.fixables.length
  useHotkeys({ Enter: () => hasSession && navigate('/session') })
  // On phones there's no sidebar, so what's left half-way shows here (the session card covers the session).
  const cont = useContinue().filter((c) => c.kind !== 'session').slice(0, 3)

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow={capitalize(frenchDate())}
        title={<>{greeting}&nbsp;!</>}
        actions={
          <>
            {streak > 0 && (
              <Badge
                size="lg"
                color="orange"
                radius="xl"
                tt="none"
                leftSection={<Flame size={16} aria-hidden />}
                title={`${streak}-day streak`}
              >
                <span className="tnum">{streak}</span> day{streak > 1 ? 's' : ''}
              </Badge>
            )}
            <ActionIcon component={Link} to="/settings" variant="default" size="lg" hiddenFrom="sm" aria-label="Settings">
              <Settings size={19} aria-hidden />
            </ActionIcon>
          </>
        }
      />

      <SyncPrompt />

      {firstRun && <Welcome onPick={(lvl) => {
        const decks = THEMED_DECKS.filter((d) => d.level === lvl).map((d) => d.id)
        state.setStartLevel(lvl, decks)
        navigate(`/grammar/${lessonsByLevel(lvl)[0].id}`)
      }} />}

      <Card component="section" aria-labelledby="session-title" padding="xl">
        <Group gap="xl" align="center" wrap="wrap">
          <Stack gap={4} align="center">
            <Ring value={today.items / goal} size={88} stroke={9} label={`${today.items} of ${goal} answers today`}>
              <span className="tnum">{Math.min(100, Math.round((today.items / goal) * 100))}%</span>
            </Ring>
            <Text size="sm" c="dimmed" className="tnum">
              {today.items}/{goal} today
            </Text>
          </Stack>
          <Stack gap={6} miw={0} style={{ flex: '1 1 300px' }}>
            <Text size="sm" fw={600} c="dimmed">
              Séance du jour
            </Text>
            <Title order={2} size="h3" id="session-title">
              {hasSession ? 'Today’s session' : today.items >= goal ? 'Objectif atteint !' : 'All caught up'}
            </Title>
            {saved ? (
              <Text c="dimmed" className="tnum">
                {saved.run.done} done · {remaining(saved.run)} to go — picks up where you stopped.
              </Text>
            ) : hasSession ? (
              <>
                <Text c="dimmed">About {plan.minutes} min — everything that’s due, mixed together so it sticks.</Text>
                <Group gap={6} mt={4}>
                  {plan.counts.reviews > 0 && (
                    <PlanBadge icon={<Layers size={14} aria-hidden />}>
                      {plan.counts.reviews} review{plan.counts.reviews > 1 ? 's' : ''}
                    </PlanBadge>
                  )}
                  {plan.counts.newWords > 0 && (
                    <PlanBadge icon={<Sparkles size={14} aria-hidden />}>
                      {plan.counts.newWords} new word{plan.counts.newWords > 1 ? 's' : ''}
                    </PlanBadge>
                  )}
                  {plan.counts.grammar > 0 && (
                    <PlanBadge color="green" icon={<BookOpen size={14} aria-hidden />}>
                      {plan.counts.grammar} grammar
                    </PlanBadge>
                  )}
                  {plan.counts.conj > 0 && (
                    <PlanBadge color="pink" icon={<PenLine size={14} aria-hidden />}>
                      {plan.counts.conj} verbs
                    </PlanBadge>
                  )}
                  {plan.counts.listen > 0 && (
                    <PlanBadge icon={<Headphones size={14} aria-hidden />}>{plan.counts.listen} dictation</PlanBadge>
                  )}
                  {plan.counts.say > 0 && (
                    <PlanBadge color="green" icon={<Mic size={14} aria-hidden />}>
                      {plan.counts.say} to say
                    </PlanBadge>
                  )}
                  {plan.counts.fix > 0 && (
                    <PlanBadge color="pink" icon={<Wrench size={14} aria-hidden />}>
                      {plan.counts.fix} to fix
                    </PlanBadge>
                  )}
                </Group>
              </>
            ) : (
              <Text c="dimmed">Nothing is due. A good moment to learn a new grammar point or write a few sentences.</Text>
            )}
          </Stack>
          {hasSession ? (
            <Button component={Link} to="/session" size="lg" leftSection={<Play size={18} aria-hidden />} rightSection={<Kbd>↵</Kbd>}>
              {saved ? 'Continue' : 'Start'}
            </Button>
          ) : up ? (
            <Button component={Link} to={`/grammar/${up.id}`} size="lg" rightSection={<ArrowRight size={17} aria-hidden />}>
              Next lesson
            </Button>
          ) : (
            <Button component={Link} to="/library#writing" size="lg" rightSection={<ArrowRight size={17} aria-hidden />}>
              Write
            </Button>
          )}
        </Group>
      </Card>

      {cont.length > 0 && (
        <Box component="section" aria-labelledby="continue-title" mt={28} hiddenFrom="sm">
          <Group justify="space-between" gap="sm" mb="sm">
            <Title order={2} size="h4" id="continue-title">
              Continue
            </Title>
            <Anchor component={Link} to="/history" size="sm" fw={600}>
              History
            </Anchor>
          </Group>
          <Card padding="xs">
            <ContinueRows items={cont} />
          </Card>
        </Box>
      )}

      <Box component="section" mt={28}>
        <Title order={2} size="h4" mb="sm">
          Or focus on one thing
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <ActionCard
            to={due + fresh > 0 ? '/vocab/study' : '/vocab'}
            icon={<Layers size={22} aria-hidden />}
            title="Vocabulary"
            meta={due + fresh > 0 ? `${due} to review · ${fresh} new` : 'All caught up — nice!'}
            cta={due + fresh > 0 ? 'Study' : 'Open'}
          />
          <ActionCard
            to={grammarDue.length ? `/grammar/${grammarDue[0].id}/practice` : up ? `/grammar/${up.id}` : '/grammar'}
            icon={<BookOpen size={22} aria-hidden />}
            tone="green"
            title="Grammar"
            meta={grammarDue.length ? `Review: ${grammarDue[0].title}` : up ? `${state.lessons[up.id] ? 'Continue' : 'Next'}: ${up.title}` : 'Every lesson mastered!'}
            cta={grammarDue.length ? 'Review' : 'Learn'}
          />
          <ActionCard
            to={`/conjugation/drill?seed=${dayKey()}`}
            icon={<PenLine size={22} aria-hidden />}
            tone="pink"
            title="Conjugation"
            meta={`Quick drill · ${tenses.slice(0, 3).join(', ') || 'Présent'}${tenses.length > 3 ? '…' : ''}`}
            cta="Drill"
          />
          {weakCount > 0 ? (
            <ActionCard
              to="/weak"
              icon={<Target size={22} aria-hidden />}
              tone="pink"
              title="Weak spots"
              meta={`${weak.total ? `${weak.total} weak spot${weak.total > 1 ? 's' : ''}` : ''}${weak.total && weak.fixables.length ? ' · ' : ''}${weak.fixables.length ? `${weak.fixables.length} correction${weak.fixables.length > 1 ? 's' : ''} to fix` : ''}`}
              cta="Fix"
            />
          ) : (
            <ActionCard
              to="/library#talk"
              icon={<MessagesSquare size={22} aria-hidden />}
              tone="amber"
              title="Conversation"
              meta={state.conversations.length ? 'Pick up a situation or chat freely' : 'Role-play a real situation in French'}
              cta="Talk"
            />
          )}
        </SimpleGrid>
      </Box>

      <Box component="section" aria-labelledby="skills-title" mt="xl">
        <Group justify="space-between" gap="sm" mb="sm">
          <Title order={2} size="h4" id="skills-title">
            Practice a skill
          </Title>
          <Anchor component={Link} to="/practice" size="sm" fw={600} display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
            All practice <ArrowRight size={14} aria-hidden />
          </Anchor>
        </Group>
        <SimpleGrid cols={{ base: 3, sm: 5 }} spacing="sm">
          <SkillTile to="/library#stories" icon={<Headphones size={20} aria-hidden />} label="Listen" meta="Mini stories" />
          <SkillTile to="/speaking" icon={<Mic size={20} aria-hidden />} label="Speak" meta="Pronunciation" />
          <SkillTile to="/library#texts" icon={<BookOpenText size={20} aria-hidden />} label="Read" meta="Graded texts" />
          <SkillTile
            to="/library#writing"
            icon={<NotebookPen size={20} aria-hidden />}
            label="Write"
            meta={state.writings.length ? `${state.writings.length} corrected` : 'With corrections'}
          />
          <SkillTile to="/library#talk" icon={<MessagesSquare size={20} aria-hidden />} label="Talk" meta="Role-play" />
        </SimpleGrid>
      </Box>

      <Box component="section" aria-labelledby="progress-title" mt="xl">
        <Title order={2} size="h4" id="progress-title" mb="sm">
          Your progress
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Stat label="Day streak" value={streak} />
          <Stat label="Words started" value={learned} />
          <Stat label="Lessons mastered" value={mastered} unit={`/ ${LESSONS.length}`} />
          <Stat label="Total answers" value={totalItems.toLocaleString()} />
        </SimpleGrid>
        <Card mt="sm">
          <Heatmap activity={state.activity} goal={goal} details={dayDetails} />
        </Card>
      </Box>
    </Container>
  )
}

const linkCard = { color: 'inherit', textDecoration: 'none' } as const

function PlanBadge({ icon, color, children }: { icon: React.ReactNode; color?: MantineColor; children: React.ReactNode }) {
  return (
    <Badge size="lg" color={color ?? 'accent'} radius="xl" tt="none" fw={600} leftSection={icon}>
      {children}
    </Badge>
  )
}

const TONE: Record<'green' | 'pink' | 'amber', MantineColor> = { green: 'green', pink: 'pink', amber: 'yellow' }

function ActionCard({
  to,
  icon,
  title,
  meta,
  cta,
  tone,
  primary,
}: {
  to: string
  icon: React.ReactNode
  title: string
  meta: string
  cta: string
  tone?: 'green' | 'pink' | 'amber'
  primary?: boolean
}) {
  return (
    <Card component={Link} to={to} padding="md" style={linkCard}>
      <Group gap="md" wrap="nowrap" h="100%">
        <ThemeIcon variant="light" color={tone ? TONE[tone] : 'accent'} size={44} radius="md">
          {icon}
        </ThemeIcon>
        <Box miw={0} style={{ flex: 1 }}>
          <Text fw={650}>{title}</Text>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {meta}
          </Text>
        </Box>
        <Button component="span" variant={primary ? 'filled' : 'default'} size="xs" rightSection={<ArrowRight size={15} />} aria-hidden>
          {cta}
        </Button>
      </Group>
    </Card>
  )
}

function SkillTile({ to, icon, label, meta }: { to: string; icon: React.ReactNode; label: string; meta: string }) {
  return (
    <Card component={Link} to={to} padding="sm" style={linkCard}>
      <Stack gap={2} align="center" ta="center">
        <ThemeIcon variant="light" size="lg" radius="md" mb={4}>
          {icon}
        </ThemeIcon>
        <Text fw={650} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {meta}
        </Text>
      </Stack>
    </Card>
  )
}

function Welcome({ onPick }: { onPick: (l: Level) => void }) {
  return (
    <Card component="section" aria-labelledby="welcome-title" mb="lg" padding="xl">
      <Group gap={10} mb={6} wrap="nowrap">
        <ThemeIcon variant="transparent" size="md">
          <Sparkles size={20} aria-hidden />
        </ThemeIcon>
        <Title order={2} size="h3" id="welcome-title">
          Bienvenue&nbsp;! Where would you like to start?
        </Title>
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm" mt="md">
        {LEVELS.map((l) => (
          <Card key={l} component="button" type="button" padding="md" ta="left" onClick={() => onPick(l)} style={{ font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
            <Stack gap={4} align="flex-start">
              <LevelBadge level={l} />
              <Text fw={700}>{LEVEL_INFO[l].name}</Text>
              <Text size="sm" c="dimmed">
                {LEVEL_INFO[l].description}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
