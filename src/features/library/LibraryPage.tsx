import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useMediaQuery } from '@mantine/hooks'
import { Button, Container, Divider, Group, Text } from '@mantine/core'
import { ClipboardPaste, WandSparkles } from 'lucide-react'
import { LESSONS } from '../../data/grammar'
import { AUDIO_LESSONS } from '../../data/audio'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { BOOKS, bookProgress } from '../../data/books'
import { LEVELS, type Level } from '../../data/types'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { ActionTile } from '../../components/Tile'
import { Callout } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { harderLevels, useCurrentLevel, withinLevel } from '../../lib/level'
import { speechSupported } from '../../lib/speech'
import { lessonStatus } from '../grammar/status'
import { LessonTile } from '../grammar/LessonTile'
import { AudioTile } from '../audio/AudioTile'
import { StoryTile } from '../listening/StoryTile'
import { GradedTile, UserTextTile } from '../reading/texts'
import { BookTile } from '../books/shared'
import { useLibraryDialogs } from './dialogs'
import { libraryEntries, lessonNo } from './entries'
import { isSection, sectionArea } from './LibrarySectionPage'

/**
 * Everything to take in, LingQ-style: what you're in the middle of at the
 * top, then rows grouped as Courses (grammar, audio), Listen (stories) and
 * Read (graded texts, books, your texts), and what you've finished at the
 * bottom. Conversations and writing are in Practice.
 */
export default function LibraryPage() {
  useDocumentTitle('Library')
  const s = useStore()
  const level = useCurrentLevel()
  const [showHarder, setShowHarder] = useState(false)
  const harder = harderLevels(level)
  // /library?generate=B1#texts opens “Write me a new story” at that level.
  const [params] = useSearchParams()
  const d = useLibraryDialogs(level, params.get('generate'))
  const { hash } = useLocation()
  const navigate = useNavigate()
  const phone = useMediaQuery('(max-width: 48em)')

  // /library#stories etc. scrolls to that row; on a phone it opens that section's own page instead.
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    // Conversations and writing moved to Practice; old links follow them there.
    if (isSection(id) && sectionArea(id) === 'practice') navigate(`/practice#${id}`, { replace: true })
    else if (phone && isSection(id) && !params.get('generate')) navigate(`/library/${id}`, { replace: true })
    else if (phone && id === 'grammar') navigate('/grammar', { replace: true })
    else document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [hash, phone, navigate, params])

  // Your level first, then easier ones; harder levels only when asked for.
  const shown = (l: Level) => showHarder || withinLevel(l, level)
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const byLevel = <T extends { level: Level }>(a: T, b: T) => rank(a.level) - rank(b.level)

  const stories = s.stories ?? {}
  const audio = s.audio ?? {}
  const { continuing, done } = libraryEntries(s, d.askDelete)

  // ── Rows of things to start
  const grammar = [
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'due'),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'new' && shown(l.level)),
  ]
  const audioTodo = AUDIO_LESSONS.filter((l) => !audio[l.id]?.done && !(audio[l.id]?.pos > 0) && shown(l.level))
  const nextAudio = AUDIO_LESSONS.find((l) => !audio[l.id]?.done)
  const storiesTodo = STORIES.filter((x) => !stories[x.id] && shown(x.level)).sort(byLevel)
  const texts = BUILTIN_TEXTS.filter((t) => !s.read[t.id] && shown(t.level)).sort(byLevel)
  // Texts you pasted or had written for you, until you finish them (opened ones also show in Continue).
  const myTexts = s.texts.filter((t) => !s.read[t.id])
  // Books you're reading first, then the rest by level; finished ones move to Completed.
  const bookState = (id: string) => bookProgress(BOOKS.find((b) => b.id === id)!, s.read, s.books?.[id]?.chapter)
  const books = BOOKS.filter((b) => !bookState(b.id).finished && shown(b.level)).sort((a, b) => {
    const started = (x: typeof a) => (s.books?.[x.id] || bookState(x.id).done ? 0 : 1)
    return started(a) - started(b) || byLevel(a, b)
  })

  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader
        eyebrow="Bibliothèque"
        title="Library"
        actions={
          <>
            {harder.length > 0 && (
              <Button variant="subtle" aria-pressed={showHarder} onClick={() => setShowHarder((v) => !v)}>
                {showHarder ? 'Hide harder levels' : `Show ${harder.join(', ')}`}
              </Button>
            )}
            <Button variant="default" leftSection={<ClipboardPaste size={16} aria-hidden />} onClick={d.openPaste}>
              Paste a text
            </Button>
          </>
        }
      />

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons and stories won’t play here. Try Chrome, Edge or Safari.</Callout>}

      {continuing.length > 0 && (
        <Shelf id="continue" kind="continue" title="Continue" count={continuing.length} to="/library/continue">
          {continuing.map((e) => e.node)}
        </Shelf>
      )}

      <GroupLabel title="Courses" fr="Cours" />

      <Shelf id="grammar" kind="grammar" title="Grammar course" count={grammar.length} to="/grammar">
        {grammar.map((l) => (
          <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />
        ))}
      </Shelf>

      <Shelf id="audio" kind="audio" title="Audio course" count={audioTodo.length} to="/library/audio">
        {audioTodo.map((l) => (
          <AudioTile key={l.id} l={l} p={audio[l.id]} next={l === nextAudio} />
        ))}
      </Shelf>

      <GroupLabel title="Listen" fr="Écouter" />

      <Shelf id="stories" kind="story" title="Mini stories" count={storiesTodo.length} to="/library/stories">
        {storiesTodo.map((x) => (
          <StoryTile key={x.id} s={x} />
        ))}
      </Shelf>

      <GroupLabel title="Read" fr="Lire" />

      <Shelf id="texts" kind="text" title="Graded texts" count={texts.length} to="/library/texts">
        {texts.map((t) => (
          <GradedTile key={t.id} t={t} />
        ))}
        <ActionTile icon={<WandSparkles size={18} aria-hidden />} title={`Write me a new ${level} story`} sub="On any topic, with your words" onClick={() => d.openGenerate(level)} />
      </Shelf>

      <Shelf id="books" kind="book" title="Books" count={books.length} to="/library/books">
        {books.map((b) => (
          <BookTile key={b.id} b={b} />
        ))}
      </Shelf>

      <Shelf id="my-texts" kind="mytext" title="Your texts" count={myTexts.length}>
        {myTexts.map((t) => (
          <UserTextTile key={t.id} t={t} onDelete={() => d.askDelete(t.id)} />
        ))}
        <ActionTile icon={<ClipboardPaste size={18} aria-hidden />} title="Paste a text" sub="An article, a song, a message…" onClick={d.openPaste} />
      </Shelf>

      {done.length > 0 && (
        <Shelf id="completed" kind="completed" title="Completed" count={done.length} to="/library/completed">
          {done.map((e) => e.node)}
        </Shelf>
      )}

      {d.dialogs}
    </Container>
  )
}

/** A divider naming a group of shelves (Courses, Listen, Read). */
function GroupLabel({ title, fr }: { title: string; fr: string }) {
  return (
    <Divider
      mt={44}
      mb={-12}
      labelPosition="left"
      label={
        <Group gap={8} align="baseline" wrap="nowrap">
          <Text fw={650} size="lg" c="var(--mantine-color-text)">
            {title}
          </Text>
          <Text size="sm" c="dimmed" className="fr" lang="fr">
            {fr}
          </Text>
        </Group>
      }
    />
  )
}
