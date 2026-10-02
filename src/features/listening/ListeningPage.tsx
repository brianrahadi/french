import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Anchor, Badge, Button, Card, Container, Group, SegmentedControl, Text } from '@mantine/core'
import { ArrowRight, BookAudio, Check, Headphones, PenLine } from 'lucide-react'
import { LEVELS, type Level, type StoryDef } from '../../data/types'
import { STORIES, storyMinutes } from '../../data/stories'
import { Callout, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { ActionTile, Tile } from '../../components/Tile'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore, type SentenceStat } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { harderLevels, useCurrentLevel, withinLevel } from '../../lib/level'
import { speechSupported, useFrenchVoices } from '../../lib/speech'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { poolFor, sentenceById, type SentenceSource } from './sentences'

const LENGTHS = [5, 10, 15]

export default function ListeningPage() {
  useDocumentTitle('Listening')
  const navigate = useNavigate()
  const state = useStore()
  const voices = useFrenchVoices()
  const [n, setN] = useState(10)
  const results = state.stories ?? {}

  // Stories: not yet done first (your level first), done ones on the last shelves.
  // Your level and below by default (your level first); harder ones only when asked for.
  const level = useCurrentLevel()
  const [showHarder, setShowHarder] = useState(false)
  const harder = harderLevels(level)
  const shown = (l: Level) => showHarder || withinLevel(l, level)
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const levelOrder = [...LEVELS].filter(shown).sort((a, b) => rank(a) - rank(b))
  const todo = STORIES.filter((s) => !results[s.id] && shown(s.level)).sort((a, b) => rank(a.level) - rank(b.level))
  const harderToggle = harder.length > 0 && (
    <Button variant="subtle" size="xs" aria-pressed={showHarder} onClick={() => setShowHarder((v) => !v)}>
      {showHarder ? 'Hide harder levels' : `Show ${harder.join(', ')}`}
    </Button>
  )
  const done = STORIES.filter((s) => results[s.id]).sort((a, b) => results[b.id].at.localeCompare(results[a.id].at))

  // Dictation sets, most useful first.
  const sources: SentenceSource[] = [...(Object.keys(state.introduced).length >= 8 ? (['mine'] as const) : []), ...levelOrder]
  const start = (src: SentenceSource) => navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${n}`)

  const stats = Object.values(state.listening)
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.last, 0) / stats.length) : 0
  const recent = Object.entries(state.listening)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 12)
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
        eyebrow="Compréhension orale"
        title="Listening"
        subtitle="Follow a short story and answer questions, or write down what you hear."
        actions={
          (done.length > 0 || stats.length > 0) && (
            <Group gap="lg" aria-label="Your listening">
              {done.length > 0 && (
                <Text size="sm" c="dimmed">
                  <Text span fw={700} c="var(--mantine-color-text)">
                    {done.length}
                  </Text>
                  /{STORIES.length} stories
                </Text>
              )}
              {stats.length > 0 && (
                <Text size="sm" c="dimmed">
                  <Text span fw={700} c="var(--mantine-color-text)">
                    {stats.length}
                  </Text>{' '}
                  sentences ·{' '}
                  <Text span fw={700} c="var(--mantine-color-text)">
                    {avg}%
                  </Text>{' '}
                  average
                </Text>
              )}
            </Group>
          )
        }
      />

      {!speechSupported ? (
        <Callout kind="warn">This browser can’t read text aloud, so listening isn’t available here. Try Chrome, Edge or Safari.</Callout>
      ) : (
        voices.length === 0 && (
          <Callout kind="tip">
            No French voice found yet. On a Mac, add one in System Settings → Accessibility → Spoken Content → System voice →
            Manage voices (French “Enhanced” or “Premium” voices sound best). Then pick it in Settings.
          </Callout>
        )
      )}

      <Shelf
        title={
          <>
            <BookAudio size={18} aria-hidden /> Short stories
          </>
        }
        count={todo.length}
        hint={<>1–2 minutes, no text: listen as often as you like, then answer the questions. For your level ({level}) and below.</>}
        action={harderToggle}
      >
        {todo.map((s) => (
          <StoryTile key={s.id} s={s} />
        ))}
        {todo.length === 0 && (
          <ActionTile
            icon={<Check size={18} aria-hidden />}
            title={`All ${level} stories done!`}
            sub={harder.length ? `Try ${harder[0]}, or replay them below.` : 'Replay them below to beat your score.'}
          />
        )}
      </Shelf>

      <Shelf
        title={
          <>
            <PenLine size={18} aria-hidden /> Dictation
          </>
        }
        hint="Hear a sentence, type it, and see which sounds you missed."
        action={
          <>
            {harderToggle}
            <SegmentedControl size="xs" value={String(n)} onChange={(v) => setN(Number(v))} data={LENGTHS.map(String)} aria-label="Sentences per session" />
          </>
        }
      >
        {sources.map((src) => (
          <DictationTile key={src} src={src} n={n} onStart={() => start(src)} />
        ))}
      </Shelf>

      {topCats.length > 0 && (
        <Shelf
          title="What trips you up"
          count={topCats.length}
          action={
            <Anchor component={Link} to="/weak" size="sm">
              Weak spots <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Anchor>
          }
        >
          {topCats.map(([c, count]) => (
            <Card key={c} w={{ base: '72vw', xs: 232 }} padding="md" style={{ flexShrink: 0 }}>
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
        </Shelf>
      )}

      {done.length > 0 && (
        <Shelf title="Completed stories" count={done.length} hint="Listen again with the transcript, or try to beat your score.">
          {done.map((s) => (
            <StoryTile key={s.id} s={s} result={results[s.id]} />
          ))}
        </Shelf>
      )}

      {recent.length > 0 && (
        <Shelf title="Recent dictation" count={recent.length}>
          {recent.map(({ s, st }) => (
            <Tile key={s!.id} done small top={<SpeakButton text={s!.fr} size="sm" />} corner={<ScoreBadge score={st.last} />} title={frTypo(s!.fr)} fr sub={s!.en} />
          ))}
        </Shelf>
      )}
    </Container>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge color={score === 100 ? 'green' : score >= 60 ? 'orange' : 'red'} className="tnum" leftSection={score === 100 ? <Check size={12} aria-hidden /> : undefined}>
      {score}%
    </Badge>
  )
}

function StoryTile({ s, result }: { s: StoryDef; result?: SentenceStat }) {
  return (
    <Tile
      to={`/listening/story/${s.id}`}
      done={!!result}
      top={
        <>
          <LevelBadge level={s.level} />
          <Text size="sm" c="dimmed">
            {s.topic}
          </Text>
        </>
      }
      corner={result && <ScoreBadge score={result.best} />}
      title={frTypo(s.title)}
      fr
      sub={s.titleEn}
      foot={
        <>
          <Headphones size={13} aria-hidden /> {storyMinutes(s)} min · {s.questions.length} questions
        </>
      }
    />
  )
}

function DictationTile({ src, n, onStart }: { src: SentenceSource; n: number; onStart: () => void }) {
  const state = useStore()
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const doneIn = pool.filter((x) => state.listening[x.id]).length
  return (
    <Tile
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
