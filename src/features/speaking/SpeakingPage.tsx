import { useMemo, useState, type ReactNode } from 'react'
import { Anchor, Box, Button, Card, Chip, Container, Group, SegmentedControl, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Mic, Play } from 'lucide-react'
import { LEVELS } from '../../data/types'
import { SOUND_SETS } from '../../data/sounds'
import { Callout, Kbd, Stat } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { Tile } from '../../components/Tile'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { captureMode, micSupported } from '../../lib/recognition'
import { useAiConfig } from '../../lib/ai'
import { frTypo } from '../../lib/words'
import { poolFor, type SentenceSource } from '../listening/sentences'
import type { SpeakMode } from './SpeakQuestion'

export default function SpeakingPage() {
  useDocumentTitle('Speaking')
  const navigate = useNavigate()
  const state = useStore()
  const ai = useAiConfig()
  const mode = useMemo(() => captureMode(), [ai]) // eslint-disable-line react-hooks/exhaustive-deps
  const [how, setHow] = useState<SpeakMode>('read')
  const [src, setSrc] = useState<SentenceSource>(() => (Object.keys(state.introduced).length >= 8 ? 'mine' : state.startLevel ?? 'A1'))
  const [n, setN] = useState(8)
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const start = (source: SentenceSource = src, count = n) =>
    navigate(`/speaking/session?src=${encodeURIComponent(source)}&mode=${how}&n=${count}`)
  useHotkeys({ Enter: () => micSupported && start() })

  const stats = Object.values(state.speaking)
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.best, 0) / stats.length) : 0
  const since = Date.now() - 30 * 86_400_000
  const words = new Map<string, number>()
  for (const m of state.mistakes)
    if (m.source === 'speaking' && !m.resolved && new Date(m.at).getTime() > since) words.set(m.expected, (words.get(m.expected) ?? 0) + 1)
  const hard = [...words.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Expression orale"
        title="Speaking"
      />

      {!micSupported ? (
        <Callout kind="warn">This page can’t use a microphone here. Open the app over https (or on localhost) in a recent browser.</Callout>
      ) : mode === 'record' ? (
        <Callout kind="warn">
          This browser can’t turn speech into text (Firefox and Brave don’t), so you’ll record yourself and compare by ear. For
          automatic feedback, use Chrome, Edge or Safari — or connect{' '}
          <Anchor component={Link} to="/settings#ai" inherit>
            OpenAI or Gemini
          </Anchor>{' '}
          to transcribe your recordings.
        </Callout>
      ) : mode === 'ai' ? (
        <Callout kind="tip">
          This browser can’t transcribe speech itself, so your recordings are transcribed by {ai?.name}.
        </Callout>
      ) : null}

      <Card component="section" aria-labelledby="say-setup">
        <Title order={2} id="say-setup" fz="lg" fw={650} mb="md">
          Practice sentences
        </Title>
        <Stack gap="md">
          <SetupRow label="Exercise">
            <SegmentedControl
              aria-label="Exercise"
              value={how}
              onChange={(v) => setHow(v as SpeakMode)}
              data={[
                { value: 'read', label: 'Read aloud' },
                { value: 'repeat', label: 'Listen & repeat' },
              ]}
            />
          </SetupRow>
          <SetupRow label="Sentences from">
            <Chip.Group value={src} onChange={(v) => setSrc(v as SentenceSource)}>
              <Group gap={6} role="group" aria-label="Sentences from">
                <Chip value="mine" size="sm">
                  My words
                </Chip>
                {LEVELS.map((l) => (
                  <Chip key={l} value={l} size="sm">
                    {l}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </SetupRow>
          <SetupRow label="Length">
            <SegmentedControl
              aria-label="Number of sentences"
              value={String(n)}
              onChange={(v) => setN(Number(v))}
              data={[5, 8, 12].map((x) => ({ value: String(x), label: `${x} sentences` }))}
            />
          </SetupRow>
          <Group justify="space-between" gap="sm" mt="xs">
            <Text size="sm" c="dimmed">
              {how === 'read' ? 'You see the sentence, then say it.' : 'You hear it first; the text appears after you speak.'} ·{' '}
              {pool.length} sentences
            </Text>
            <Button size="lg" onClick={() => start()} disabled={!micSupported || !pool.length} leftSection={<Play size={18} aria-hidden />} rightSection={<Kbd>↵</Kbd>}>
              Start
            </Button>
          </Group>
        </Stack>
      </Card>

      <Shelf title="Tricky sounds" count={SOUND_SETS.length}>
        {SOUND_SETS.map((set) => (
          <Tile
            key={set.id}
            onClick={() => start(`sound:${set.id}`, set.sentences.length)}
            disabled={!micSupported}
            top={
              <Text className="fr" fz={22} fw={600} c="accent" lh={1}>
                {set.sound}
              </Text>
            }
            title={set.title}
            sub={set.tip}
            foot={
              <>
                {set.sentences.length} sentences <ArrowRight size={14} aria-hidden />
              </>
            }
          />
        ))}
      </Shelf>

      {stats.length > 0 && (
        <Box component="section" mt="xl">
          <Title order={2} size="h4" mb="xs">
            Your speaking
          </Title>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <Stat label="Sentences spoken" value={stats.length} />
            <Stat label="Average best" value={avg} unit="%" />
            <Stat label="Clear (90%+)" value={stats.filter((x) => x.best >= 90).length} />
            <Stat label="Attempts" value={stats.reduce((a, x) => a + x.n, 0)} />
          </SimpleGrid>
        </Box>
      )}

      {hard.length > 0 && (
        <Box component="section" mt="xl">
          <Title order={2} size="h4" mb="xs">
            <Group component="span" gap={8} wrap="nowrap">
              <Mic size={18} aria-hidden />
              Words that didn’t come across
            </Group>
          </Title>
          <Card>
            <Group gap={8}>
              {hard.map(([w, c]) => (
                <Group
                  key={w}
                  gap={6}
                  wrap="nowrap"
                  pl={4}
                  pr={12}
                  py={4}
                  style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 999 }}
                >
                  <SpeakButton text={w} size="sm" />
                  <Text span className="fr" lang="fr">
                    {frTypo(w)}
                  </Text>
                  <Text span size="sm" c="dimmed" className="tnum">
                    ×{c}
                  </Text>
                </Group>
              ))}
            </Group>
          </Card>
        </Box>
      )}
    </Container>
  )
}

function SetupRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="sm" align="center">
      <Text size="sm" fw={600} c="dimmed" w={130}>
        {label}
      </Text>
      {children}
    </Group>
  )
}
