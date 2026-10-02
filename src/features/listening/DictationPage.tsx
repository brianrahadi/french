import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Anchor, Badge, Button, Card, Container, Divider, Group, SegmentedControl, SimpleGrid, Text, Title } from '@mantine/core'
import { ArrowRight } from 'lucide-react'
import { LEVELS, type Level } from '../../data/types'
import { Callout, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { Tile } from '../../components/Tile'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { harderLevels, useCurrentLevel, withinLevel } from '../../lib/level'
import { speechSupported, useFrenchVoices } from '../../lib/speech'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { poolFor, sentenceById, type SentenceSource } from './sentences'
import { PercentBadge } from './StoryTile'

const LENGTHS = [5, 10, 15]

/** Dictation drill: pick a sentence set and a length, see your weak sounds and recent sentences. */
export default function DictationPage() {
  useDocumentTitle('Dictation')
  const navigate = useNavigate()
  const state = useStore()
  const voices = useFrenchVoices()
  const [n, setN] = useState(10)
  const level = useCurrentLevel()
  const [showHarder, setShowHarder] = useState(false)
  const harder = harderLevels(level)

  // Your words first, then your level and the ones below it.
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const levelOrder = [...LEVELS].filter((l) => showHarder || withinLevel(l, level)).sort((a, b) => rank(a) - rank(b))
  const sources: SentenceSource[] = [...(Object.keys(state.introduced).length >= 8 ? (['mine'] as const) : []), ...levelOrder]
  const start = (src: SentenceSource) => navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${n}`)

  const recent = Object.entries(state.listening)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 8)
    .map(([id, st]) => ({ s: sentenceById(id), st }))
    .filter((x) => x.s)

  const since = Date.now() - 30 * 86_400_000
  const cats = new Map<ListenCategory, number>()
  for (const m of state.mistakes)
    if (m.source === 'listening' && !m.resolved && new Date(m.at).getTime() > since) {
      const c = m.skill.slice(7) as ListenCategory
      cats.set(c, (cats.get(c) ?? 0) + 1)
    }
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <Container size={960} py="xl">
      <PageHeader
        back={{ to: '/practice', label: 'Practice' }}
        eyebrow="Dictée"
        title="Dictation"
        subtitle="Hear a sentence, type it, and see which sounds you missed."
        actions={
          <>
            {harder.length > 0 && (
              <Button variant="subtle" aria-pressed={showHarder} onClick={() => setShowHarder((v) => !v)}>
                {showHarder ? 'Hide harder levels' : `Show ${harder.join(', ')}`}
              </Button>
            )}
            <SegmentedControl value={String(n)} onChange={(v) => setN(Number(v))} data={LENGTHS.map((x) => ({ value: String(x), label: `${x} sentences` }))} aria-label="Sentences per session" />
          </>
        }
      />

      {!speechSupported ? (
        <Callout kind="warn">This browser can’t read text aloud, so dictation isn’t available here. Try Chrome, Edge or Safari.</Callout>
      ) : (
        voices.length === 0 && (
          <Callout kind="tip">
            No French voice found yet. On a Mac, add one in System Settings → Accessibility → Spoken Content → System voice → Manage voices
            (French “Enhanced” or “Premium” voices sound best). Then pick it in Settings.
          </Callout>
        )
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
        {sources.map((src) => (
          <DictationTile key={src} src={src} n={n} onStart={() => start(src)} />
        ))}
      </SimpleGrid>

      {topCats.length > 0 && (
        <>
          <Group justify="space-between" mt="xl" mb="xs">
            <Title order={2} size="h4">
              Sounds that trip you up
            </Title>
            <Anchor component={Link} to="/weak" size="sm">
              Weak spots <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Anchor>
          </Group>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            {topCats.map(([c, count]) => (
              <Card key={c} padding="md">
                <Group justify="space-between" wrap="nowrap" mb={6}>
                  <Text fw={650}>{LISTEN_CATEGORIES[c].label}</Text>
                  <Badge color="orange" className="tnum">
                    {count}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {LISTEN_CATEGORIES[c].tip}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </>
      )}

      {recent.length > 0 && (
        <>
          <Title order={2} size="h4" mt="xl" mb="xs">
            Recent sentences
          </Title>
          <Card padding={0}>
            {recent.map(({ s, st }, i) => (
              <div key={s!.id}>
                {i > 0 && <Divider />}
                <Group gap="sm" wrap="nowrap" px="md" py="sm">
                  <SpeakButton text={s!.fr} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text className="fr" lang="fr" truncate>
                      {frTypo(s!.fr)}
                    </Text>
                    <Text size="sm" c="dimmed" truncate>
                      {s!.en}
                    </Text>
                  </div>
                  <PercentBadge score={st.last} />
                </Group>
              </div>
            ))}
          </Card>
        </>
      )}
    </Container>
  )
}

function DictationTile({ src, n, onStart }: { src: SentenceSource; n: number; onStart: () => void }) {
  const state = useStore()
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const doneIn = pool.filter((x) => state.listening[x.id]).length
  return (
    <Tile
      fluid
      onClick={onStart}
      disabled={!speechSupported || !pool.length}
      top={src === 'mine' ? <Badge>mine</Badge> : <LevelBadge level={src as Level} />}
      title={src === 'mine' ? 'My words' : `${src} sentences`}
      sub={src === 'mine' ? 'Sentences with the words you’re learning' : `${pool.length} sentences`}
      foot={
        <>
          {doneIn}/{pool.length} done · start {n}
        </>
      }
      progress={pool.length ? doneIn / pool.length : 0}
    />
  )
}
