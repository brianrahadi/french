import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Anchor, Badge, Button, Card, Container, Group, SegmentedControl, Text } from '@mantine/core'
import { ArrowRight, BookOpen, Mic, PenLine, Table2, Target } from 'lucide-react'
import { LEVELS, type Level } from '../../data/types'
import { Callout, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { Tile } from '../../components/Tile'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { harderLevels, useCurrentLevel, withinLevel } from '../../lib/level'
import { speechSupported, useFrenchVoices } from '../../lib/speech'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { dueLessons } from '../grammar/status'
import { countWeakSpots } from '../weak/count'
import { poolFor, sentenceById, type SentenceSource } from '../listening/sentences'
import { PercentBadge } from '../listening/StoryTile'

const LENGTHS = [5, 10, 15]

/** Short drills that train one skill at a time (content to read, hear and talk about lives in the Library). */
export default function PracticeHub() {
  useDocumentTitle('Practice')
  const navigate = useNavigate()
  const state = useStore()
  const voices = useFrenchVoices()
  const [n, setN] = useState(10)
  const level = useCurrentLevel()
  const [showHarder, setShowHarder] = useState(false)
  const harder = harderLevels(level)

  const weak = useMemo(() => countWeakSpots(state), [state])
  const grammarDue = dueLessons(state.lessons).length

  // Dictation sets: your words first, then your level and the ones below it.
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const levelOrder = [...LEVELS].filter((l) => showHarder || withinLevel(l, level)).sort((a, b) => rank(a) - rank(b))
  const sources: SentenceSource[] = [...(Object.keys(state.introduced).length >= 8 ? (['mine'] as const) : []), ...levelOrder]
  const start = (src: SentenceSource) => navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${n}`)

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
      <PageHeader eyebrow="S’entraîner" title="Practice" subtitle="Quick drills, one skill at a time. Stories, texts and conversations are in the Library." />

      {!speechSupported ? (
        <Callout kind="warn">This browser can’t read text aloud, so dictation and speaking aren’t available here. Try Chrome, Edge or Safari.</Callout>
      ) : (
        voices.length === 0 && (
          <Callout kind="tip">
            No French voice found yet. On a Mac, add one in System Settings → Accessibility → Spoken Content → System voice → Manage voices
            (French “Enhanced” or “Premium” voices sound best). Then pick it in Settings.
          </Callout>
        )
      )}

      <Shelf title="Drills">
        <Tile to="/weak" top={<Target size={18} aria-hidden />} corner={weak > 0 && <Badge color="pink">{weak}</Badge>} title="Weak spots" sub="Everything you got wrong, grouped by the rule behind it." />
        <Tile to="/conjugation" top={<PenLine size={18} aria-hidden />} title="Conjugation" sub="Type the right form, fast. Tenses you miss come back more." />
        <Tile to="/speaking" top={<Mic size={18} aria-hidden />} title="Speaking" sub="Read aloud or repeat after a native voice; see which words came across." />
        <Tile
          to="/grammar"
          top={<BookOpen size={18} aria-hidden />}
          corner={grammarDue > 0 && <Badge>{grammarDue} due</Badge>}
          title="Grammar reviews"
          sub="Lessons you mastered come back for a quick review."
        />
        <Tile to="/verbs" top={<Table2 size={18} aria-hidden />} title="Verb tables" sub="Every verb in every tense, with audio." />
      </Shelf>

      <Shelf
        title="Dictation"
        hint="Hear a sentence, type it, and see which sounds you missed."
        action={
          <>
            {harder.length > 0 && (
              <Button variant="subtle" size="xs" aria-pressed={showHarder} onClick={() => setShowHarder((v) => !v)}>
                {showHarder ? 'Hide harder levels' : `Show ${harder.join(', ')}`}
              </Button>
            )}
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
          title="Sounds that trip you up"
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

      {recent.length > 0 && (
        <Shelf title="Recent dictation" count={recent.length}>
          {recent.map(({ s, st }) => (
            <Tile key={s!.id} done small top={<SpeakButton text={s!.fr} size="sm" />} corner={<PercentBadge score={st.last} />} title={frTypo(s!.fr)} fr sub={s!.en} />
          ))}
        </Shelf>
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
