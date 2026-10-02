import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Box, Button, Card, Container, Group, NavLink, SimpleGrid, Stack, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import { ArrowRight, Check, Feather, PencilLine, Sparkles } from 'lucide-react'
import { WRITING_PROMPTS, type WritingPrompt } from '../../data/writing'
import { LEVELS, LEVEL_INFO } from '../../data/types'
import { LevelBadge } from '../../components/ui'
import { useStore, type LessonProgress, type WritingEntry } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { ConnectAiCard } from '../../components/AiSetup'
import { PageHeader } from '../../components/PageHeader'

/** Suggest a prompt that practices grammar the learner has recently mastered. */
function suggest(lessons: Record<string, LessonProgress>, written: Set<string>, startLevel: string | null): WritingPrompt | undefined {
  const mastered = Object.entries(lessons)
    .filter(([, p]) => p.best >= 0.8)
    .sort((a, b) => (a[1].lastAt < b[1].lastAt ? 1 : -1))
    .map(([id]) => id)
  for (const id of mastered) {
    const p = WRITING_PROMPTS.find((w) => !written.has(w.id) && w.lessons.includes(id))
    if (p) return p
  }
  return WRITING_PROMPTS.find((w) => !written.has(w.id) && w.level === (startLevel ?? 'A1')) ?? WRITING_PROMPTS.find((w) => !written.has(w.id))
}

/** Badge colour for a 0–100 correction score. */
export function scoreColor(score: number): MantineColor {
  return score >= 85 ? 'green' : score >= 60 ? 'orange' : 'red'
}

/** A small badge with a 0–100 score, coloured by how good it is. */
export function ScoreBadge({ score, miw }: { score: number; miw?: number }) {
  return (
    <Badge color={scoreColor(score)} className="tnum" miw={miw} style={{ flexShrink: 0 }}>
      {score}
    </Badge>
  )
}

export default function WritingHome() {
  useDocumentTitle('Writing')
  const writings = useStore((s) => s.writings)
  const lessons = useStore((s) => s.lessons)
  const startLevel = useStore((s) => s.startLevel)
  const ai = useAiConfig()
  const written = new Set(writings.map((w) => w.promptId))
  const pick = suggest(lessons, written, startLevel)

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Expression écrite"
        title="Writing"
        subtitle="Write a short text and get it corrected like a teacher would: every mistake explained, linked to the lesson that covers it, plus a more natural version to learn from."
      />

      {!ai && (
        <Box mb="lg">
          <ConnectAiCard title="Connect an AI to get corrections">
            Corrections come from the AI model of your choice, with your own key. You can still write without it — you just won’t get feedback until one is connected.
          </ConnectAiCard>
        </Box>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {pick && (
          <Card component={Link} to={`/writing/new?prompt=${pick.id}`} c="inherit" td="none">
            <Group gap={8} mb={10}>
              <Badge leftSection={<Sparkles size={12} aria-hidden />} tt="none">
                Suggested for you
              </Badge>
              <LevelBadge level={pick.level} />
            </Group>
            <Text fz={23} fw={560} lh={1.25} mb={4} className="fr" lang="fr">
              {pick.titleFr}
            </Text>
            <Text c="dimmed">{pick.task}</Text>
            <Text size="sm" c="dimmed" mt={8}>
              Practices {pick.focus}
            </Text>
            <Box mt={14}>
              <Button component="span" size="xs" rightSection={<ArrowRight size={15} />} style={{ pointerEvents: 'none' }} aria-hidden>
                Start writing
              </Button>
            </Box>
          </Card>
        )}
        <Stack gap={12}>
          <ActionCard to="/writing/new?prompt=free" icon={<Feather size={22} aria-hidden />} color="orange" title="Free writing" meta="A diary entry, a message, anything" />
          <ActionCard to="/writing/new?prompt=custom" icon={<PencilLine size={22} aria-hidden />} title="Your own topic" meta="Set the task yourself" />
        </Stack>
      </SimpleGrid>

      {writings.length > 0 && <History writings={writings} />}

      {LEVELS.map((level) => (
        <Box component="section" key={level} mt="xl" aria-labelledby={`wl-${level}`}>
          <Group gap={8} mb={12}>
            <LevelBadge level={level} />
            <Title order={2} size="h4" id={`wl-${level}`}>
              {LEVEL_INFO[level].name}
            </Title>
          </Group>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing={10}>
            {WRITING_PROMPTS.filter((p) => p.level === level).map((p) => (
              <Card key={p.id} component={Link} to={`/writing/new?prompt=${p.id}`} padding="md" radius="md" c="inherit" td="none">
                <Group justify="space-between" gap={8} wrap="nowrap" align="flex-start">
                  <Text fz={19} fw={560} lh={1.25} className="fr" lang="fr">
                    {p.titleFr}
                  </Text>
                  {written.has(p.id) && (
                    <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />} title="You’ve written this one" style={{ flexShrink: 0 }}>
                      done
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  {p.title}
                </Text>
                <Text size="sm" c="dimmed" mt={6}>
                  {p.focus} · {p.words[0]}–{p.words[1]} words
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </Container>
  )
}

function ActionCard({ to, icon, color, title, meta }: { to: string; icon: ReactNode; color?: MantineColor; title: string; meta: string }) {
  return (
    <Card component={Link} to={to} padding="md" c="inherit" td="none">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={44} radius="md">
          {icon}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={650}>{title}</Text>
          <Text size="sm" c="dimmed">
            {meta}
          </Text>
        </Box>
        <Text span c="dimmed" display="flex">
          <ArrowRight size={18} aria-hidden />
        </Text>
      </Group>
    </Card>
  )
}

function History({ writings }: { writings: WritingEntry[] }) {
  return (
    <Box component="section" mt="xl" aria-labelledby="history-title">
      <Title order={2} size="h4" mb="xs">
        <Group component="span" gap={8} wrap="nowrap">
          <span id="history-title">Your texts</span>
          <Text span c="dimmed" size="sm" fw={500} className="tnum">
            {writings.length}
          </Text>
        </Group>
      </Title>
      <Card padding={0}>
        <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
          {writings.slice(0, 12).map((w, i) => (
            <Box component="li" key={w.id} style={i > 0 ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}>
              <NavLink
                component={Link}
                to={`/writing/${w.id}`}
                px="md"
                py="sm"
                td="none"
                noWrap
                leftSection={<ScoreBadge score={w.feedback.score} miw={38} />}
                label={
                  <Text span fw={600}>
                    {w.title}
                    {w.revisionOf && (
                      <Text span size="sm" c="dimmed" fw={400}>
                        {' '}
                        · rewrite
                      </Text>
                    )}
                  </Text>
                }
                description={
                  <Text span fz={14.5} className="fr" lang="fr">
                    {w.text.slice(0, 110)}
                    {w.text.length > 110 ? '…' : ''}
                  </Text>
                }
                rightSection={
                  <Text span size="sm" c="dimmed" ta="right" display="block" style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block' }}>{new Date(w.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                    <span style={{ display: 'block' }}>
                      {w.feedback.errors.length} fix{w.feedback.errors.length === 1 ? '' : 'es'}
                    </span>
                  </Text>
                }
              />
            </Box>
          ))}
        </Box>
      </Card>
    </Box>
  )
}
