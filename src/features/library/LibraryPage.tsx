import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useMediaQuery } from '@mantine/hooks'
import { Button, Container } from '@mantine/core'
import { ClipboardPaste, Feather, MessagesSquare, PencilLine, WandSparkles } from 'lucide-react'
import { LESSONS } from '../../data/grammar'
import { AUDIO_LESSONS } from '../../data/audio'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { SCENARIOS } from '../../data/scenarios'
import { WRITING_PROMPTS } from '../../data/writing'
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
import { ScenarioTile } from '../talk/TalkTiles'
import { PromptTile, suggestPrompt } from '../writing/tiles'
import { useLibraryDialogs } from './dialogs'
import { libraryEntries, lessonNo } from './entries'
import { isSection } from './LibrarySectionPage'

/**
 * Everything to study, LingQ-style: one row per kind of content (courses,
 * stories, texts, conversations, writing), what you're in the middle of at the
 * top and what you've finished at the bottom.
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
    if (phone && isSection(id) && !params.get('generate')) navigate(`/library/${id}`, { replace: true })
    else if (phone && id === 'grammar') navigate('/grammar', { replace: true })
    else document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [hash, phone, navigate, params])

  // Your level first, then easier ones; harder levels only when asked for.
  const shown = (l: Level) => showHarder || withinLevel(l, level)
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const byLevel = <T extends { level: Level }>(a: T, b: T) => rank(a.level) - rank(b.level)

  const stories = s.stories ?? {}
  const audio = s.audio ?? {}
  const written = new Set(s.writings.map((w) => w.promptId))
  const talked = new Set(s.conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  const { continuing, done } = libraryEntries(s, d.askDelete)

  // ── Rows of things to start
  const grammar = [
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'due'),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'new'),
  ]
  const audioTodo = AUDIO_LESSONS.filter((l) => !audio[l.id]?.done && !(audio[l.id]?.pos > 0))
  const nextAudio = AUDIO_LESSONS.find((l) => !audio[l.id]?.done)
  const storiesTodo = STORIES.filter((x) => !stories[x.id] && shown(x.level)).sort(byLevel)
  const texts = BUILTIN_TEXTS.filter((t) => !s.read[t.id] && shown(t.level)).sort(byLevel)
  const myTexts = s.texts.filter((t) => !s.read[t.id] && !t.openedAt)
  const scenarios = SCENARIOS.filter((x) => !talked.has(x.id) && shown(x.level)).sort(byLevel)
  const suggested = suggestPrompt(s.lessons, written, level)
  const prompts = WRITING_PROMPTS.filter((p) => !written.has(p.id) && p !== suggested && shown(p.level)).sort(byLevel)

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
        <Shelf id="continue" title="Continue" count={continuing.length} to="/library/continue">
          {continuing.map((e) => e.node)}
        </Shelf>
      )}

      <Shelf
        id="grammar"
        title="Grammar course"
        count={grammar.length}
        to="/grammar"
      >
        {grammar.map((l) => (
          <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />
        ))}
      </Shelf>

      <Shelf id="audio" title="Audio course" count={audioTodo.length} to="/library/audio">
        {audioTodo.map((l) => (
          <AudioTile key={l.id} l={l} p={audio[l.id]} next={l === nextAudio} />
        ))}
      </Shelf>

      <Shelf id="stories" title="Mini stories" count={storiesTodo.length} to="/library/stories">
        {storiesTodo.map((x) => (
          <StoryTile key={x.id} s={x} />
        ))}
      </Shelf>

      <Shelf id="texts" title="Graded texts" count={texts.length} to="/library/texts">
        {texts.map((t) => (
          <GradedTile key={t.id} t={t} />
        ))}
        <ActionTile icon={<WandSparkles size={18} aria-hidden />} title={`Write me a new ${level} story`} sub="On any topic, with your words" onClick={() => d.openGenerate(level)} />
      </Shelf>

      {myTexts.length > 0 && (
        <Shelf id="my-texts" title="Your texts" count={myTexts.length}>
          {myTexts.map((t) => (
            <UserTextTile key={t.id} t={t} onDelete={() => d.askDelete(t.id)} />
          ))}
          <ActionTile icon={<ClipboardPaste size={18} aria-hidden />} title="Paste a text" sub="An article, a song, a message…" onClick={d.openPaste} />
        </Shelf>
      )}

      <Shelf id="talk" title="Conversations" count={scenarios.length} to="/library/talk">
        <ActionTile icon={<MessagesSquare size={18} aria-hidden />} title="Free conversation" sub="Chat about anything with Camille" onClick={d.openFreeTalk} />
        {scenarios.map((x) => (
          <ScenarioTile key={x.id} s={x} />
        ))}
      </Shelf>

      <Shelf id="writing" title="Writing" count={prompts.length + (suggested ? 1 : 0)} to="/library/writing">
        {suggested && <PromptTile p={suggested} suggested />}
        <ActionTile icon={<Feather size={18} aria-hidden />} title="Free writing" sub="A diary entry, a message, anything" to="/writing/new?prompt=free" />
        {prompts.map((p) => (
          <PromptTile key={p.id} p={p} />
        ))}
        <ActionTile icon={<PencilLine size={18} aria-hidden />} title="Your own topic" sub="Set the task yourself" to="/writing/new?prompt=custom" />
      </Shelf>

      {done.length > 0 && (
        <Shelf id="completed" title="Completed" count={done.length} to="/library/completed">
          {done.map((e) => e.node)}
        </Shelf>
      )}

      {d.dialogs}
    </Container>
  )
}
