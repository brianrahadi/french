import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Button, Container } from '@mantine/core'
import { BookOpen, ClipboardPaste, Feather, MessagesSquare, PencilLine, WandSparkles } from 'lucide-react'
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
import { DeleteTextDialog, GenerateDialog, GradedTile, PasteDialog, UserTextTile } from '../reading/texts'
import { ConversationTile, FreeTalkDialog, ScenarioTile } from '../talk/TalkTiles'
import { PromptTile, WritingTile, suggestPrompt } from '../writing/tiles'

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
  const [paste, setPaste] = useState(false)
  const [generate, setGenerate] = useState<Level | null>(null)
  const [freeTalk, setFreeTalk] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { hash } = useLocation()

  // /library#stories etc. scrolls to that row.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  // Your level first, then easier ones; harder levels only when asked for.
  const shown = (l: Level) => showHarder || withinLevel(l, level)
  const rank = (l: Level) => (withinLevel(l, level) ? LEVELS.indexOf(level) - LEVELS.indexOf(l) : 10 + LEVELS.indexOf(l))
  const byLevel = <T extends { level: Level }>(a: T, b: T) => rank(a.level) - rank(b.level)

  const stories = s.stories ?? {}
  const audio = s.audio ?? {}
  const conversations = s.conversations
  const written = new Set(s.writings.map((w) => w.promptId))
  const talked = new Set(conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  const lessonNo = (id: string) => LESSONS.findIndex((l) => l.id === id) + 1

  // ── In progress, newest first
  type Entry = { at: string; key: string; node: ReactNode }
  const continuing: Entry[] = [
    ...AUDIO_LESSONS.filter((l) => audio[l.id] && !audio[l.id].done && audio[l.id].pos > 0).map((l) => ({
      at: audio[l.id].at,
      key: l.id,
      node: <AudioTile key={l.id} l={l} p={audio[l.id]} />,
    })),
    ...s.texts
      .filter((t) => !s.read[t.id] && t.openedAt)
      .map((t) => ({ at: t.openedAt!, key: t.id, node: <UserTextTile key={t.id} t={t} onDelete={() => setDeleting(t.id)} /> })),
    ...conversations
      .filter((c) => !c.feedback && c.turns.some((t) => t.role === 'me'))
      .map((c) => ({ at: c.updatedAt, key: c.id, node: <ConversationTile key={c.id} c={c} /> })),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'started').map((l) => ({
      at: s.lessons[l.id].lastAt,
      key: l.id,
      node: <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  // ── Finished, newest first
  const done: Entry[] = [
    ...STORIES.filter((x) => stories[x.id]).map((x) => ({ at: stories[x.id].at, key: x.id, node: <StoryTile key={x.id} s={x} result={stories[x.id]} /> })),
    ...BUILTIN_TEXTS.filter((t) => s.read[t.id]).map((t) => ({ at: s.read[t.id], key: t.id, node: <GradedTile key={t.id} t={t} done /> })),
    ...s.texts
      .filter((t) => s.read[t.id])
      .map((t) => ({ at: s.read[t.id], key: t.id, node: <UserTextTile key={t.id} t={t} done onDelete={() => setDeleting(t.id)} /> })),
    ...AUDIO_LESSONS.filter((l) => audio[l.id]?.done).map((l) => ({ at: audio[l.id].done!, key: l.id, node: <AudioTile key={l.id} l={l} p={audio[l.id]} /> })),
    ...conversations.filter((c) => c.feedback).map((c) => ({ at: c.updatedAt, key: c.id, node: <ConversationTile key={c.id} c={c} /> })),
    ...s.writings.map((w) => ({ at: w.createdAt, key: w.id, node: <WritingTile key={w.id} w={w} /> })),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'mastered').map((l) => ({
      at: s.lessons[l.id].lastAt,
      key: l.id,
      node: <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

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
    <Container size={960} py="xl">
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
            <Button variant="default" leftSection={<ClipboardPaste size={16} aria-hidden />} onClick={() => setPaste(true)}>
              Paste a text
            </Button>
          </>
        }
      />

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons and stories won’t play here. Try Chrome, Edge or Safari.</Callout>}

      {continuing.length > 0 && (
        <Shelf id="continue" title="Continue" count={continuing.length}>
          {continuing.map((e) => e.node)}
        </Shelf>
      )}

      <Shelf
        id="grammar"
        title="Grammar course"
        count={grammar.length}
        action={
          <Button component={Link} to="/grammar" variant="subtle" size="xs" leftSection={<BookOpen size={14} aria-hidden />}>
            All lessons
          </Button>
        }
      >
        {grammar.map((l) => (
          <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />
        ))}
      </Shelf>

      <Shelf id="audio" title="Audio course" count={audioTodo.length}>
        {audioTodo.map((l) => (
          <AudioTile key={l.id} l={l} p={audio[l.id]} next={l === nextAudio} />
        ))}
      </Shelf>

      <Shelf id="stories" title="Mini stories" count={storiesTodo.length}>
        {storiesTodo.map((x) => (
          <StoryTile key={x.id} s={x} />
        ))}
      </Shelf>

      <Shelf id="texts" title="Graded texts" count={texts.length}>
        {texts.map((t) => (
          <GradedTile key={t.id} t={t} />
        ))}
        <ActionTile icon={<WandSparkles size={18} aria-hidden />} title={`Write me a new ${level} story`} sub="On any topic, with your words" onClick={() => setGenerate(level)} />
      </Shelf>

      {myTexts.length > 0 && (
        <Shelf id="my-texts" title="Your texts" count={myTexts.length}>
          {myTexts.map((t) => (
            <UserTextTile key={t.id} t={t} onDelete={() => setDeleting(t.id)} />
          ))}
          <ActionTile icon={<ClipboardPaste size={18} aria-hidden />} title="Paste a text" sub="An article, a song, a message…" onClick={() => setPaste(true)} />
        </Shelf>
      )}

      <Shelf id="talk" title="Conversations" count={scenarios.length}>
        <ActionTile icon={<MessagesSquare size={18} aria-hidden />} title="Free conversation" sub="Chat about anything with Camille" onClick={() => setFreeTalk(true)} />
        {scenarios.map((x) => (
          <ScenarioTile key={x.id} s={x} />
        ))}
      </Shelf>

      <Shelf id="writing" title="Writing" count={prompts.length + (suggested ? 1 : 0)}>
        {suggested && <PromptTile p={suggested} suggested />}
        <ActionTile icon={<Feather size={18} aria-hidden />} title="Free writing" sub="A diary entry, a message, anything" to="/writing/new?prompt=free" />
        {prompts.map((p) => (
          <PromptTile key={p.id} p={p} />
        ))}
        <ActionTile icon={<PencilLine size={18} aria-hidden />} title="Your own topic" sub="Set the task yourself" to="/writing/new?prompt=custom" />
      </Shelf>

      {done.length > 0 && (
        <Shelf id="completed" title="Completed" count={done.length}>
          {done.map((e) => e.node)}
        </Shelf>
      )}

      <PasteDialog open={paste} onClose={() => setPaste(false)} />
      <GenerateDialog key={generate ?? 'closed'} open={!!generate} onClose={() => setGenerate(null)} defaultLevel={generate ?? level} />
      <FreeTalkDialog key={freeTalk ? 'open' : 'closed'} open={freeTalk} onClose={() => setFreeTalk(false)} defaultLevel={level} />
      <DeleteTextDialog id={deleting} onClose={() => setDeleting(null)} />
    </Container>
  )
}
