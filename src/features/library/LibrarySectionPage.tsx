import { useState, type ReactNode } from 'react'
import { Navigate, useParams } from 'react-router'
import { Container, Group, Switch, Text } from '@mantine/core'
import { ClipboardPaste, Feather, MessagesSquare, PencilLine, WandSparkles } from 'lucide-react'
import { AUDIO_LESSONS } from '../../data/audio'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { BOOKS, bookProgress } from '../../data/books'
import { SCENARIOS } from '../../data/scenarios'
import { WRITING_PROMPTS } from '../../data/writing'
import { LEVELS, type Level } from '../../data/types'
import { PageHeader } from '../../components/PageHeader'
import { LevelGroup } from '../../components/LevelGroup'
import { ActionTile, TileGrid } from '../../components/Tile'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { storyDone, useCurrentLevel } from '../../lib/level'
import { AudioTile } from '../audio/AudioTile'
import { StoryTile } from '../listening/StoryTile'
import { GradedTile, UserTextTile } from '../reading/texts'
import { BookTile } from '../books/shared'
import { ScenarioTile } from '../talk/TalkTiles'
import { PromptTile } from '../writing/tiles'
import { useLibraryDialogs } from './dialogs'
import { libraryEntries } from './entries'

export type SectionId = 'continue' | 'audio' | 'stories' | 'texts' | 'books' | 'talk' | 'writing' | 'completed'

const META: Record<SectionId, { title: string; eyebrow: string }> = {
  continue: { title: 'Continue', eyebrow: 'En cours' },
  audio: { title: 'Audio course', eyebrow: 'Cours audio' },
  stories: { title: 'Mini stories', eyebrow: 'Histoires' },
  texts: { title: 'Graded texts', eyebrow: 'Lecture' },
  books: { title: 'Books', eyebrow: 'Livres' },
  talk: { title: 'Conversations', eyebrow: 'Conversation' },
  writing: { title: 'Writing', eyebrow: 'Écriture' },
  completed: { title: 'Completed', eyebrow: 'Terminé' },
}

export const isSection = (x: string | undefined): x is SectionId => !!x && x in META

interface Item {
  key: string
  level: Level
  done: boolean
  node: ReactNode
}

/** One kind of Library content, every level, folded by level: a vertical list instead of a sideways shelf. */
export default function LibrarySectionPage() {
  const { section } = useParams()
  const s = useStore()
  const level = useCurrentLevel()
  const d = useLibraryDialogs(level)
  const [hideDone, setHideDone] = useState(false)
  const meta = isSection(section) ? META[section] : undefined
  useDocumentTitle(meta?.title ?? 'Library')
  if (!isSection(section) || !meta) return <Navigate to="/library" replace />

  const back = { to: '/library', label: 'Library' }

  // Continue and Completed are flat lists, newest first.
  if (section === 'continue' || section === 'completed') {
    const { continuing, done } = libraryEntries(s, d.askDelete)
    const list = section === 'continue' ? continuing : done
    return (
      <Container size="var(--page-w)" py="xl">
        <PageHeader back={back} eyebrow={meta.eyebrow} title={meta.title} subtitle={`${list.length} item${list.length === 1 ? '' : 's'}`} />
        {list.length ? <TileGrid>{list.map((e) => e.node)}</TileGrid> : <Text c="dimmed">Nothing here yet.</Text>}
        {d.dialogs}
      </Container>
    )
  }

  const audio = s.audio ?? {}
  const nextAudio = AUDIO_LESSONS.find((l) => !audio[l.id]?.done)
  const written = new Set(s.writings.map((w) => w.promptId))
  const talked = new Set(s.conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  for (const r of Object.values(s.talkLog ?? {})) talked.add(r.scenarioId)

  let items: Item[] = []
  let actions: ReactNode = null
  let extra: ReactNode = null
  switch (section) {
    case 'audio':
      items = AUDIO_LESSONS.map((l) => ({ key: l.id, level: l.level, done: !!audio[l.id]?.done, node: <AudioTile key={l.id} l={l} p={audio[l.id]} next={l === nextAudio} /> }))
      break
    case 'stories':
      items = STORIES.map((x) => ({ key: x.id, level: x.level, done: storyDone(s, x.id), node: <StoryTile key={x.id} s={x} result={s.stories?.[x.id]} /> }))
      break
    case 'texts': {
      items = BUILTIN_TEXTS.map((t) => ({ key: t.id, level: t.level, done: !!s.read[t.id], node: <GradedTile key={t.id} t={t} done={!!s.read[t.id]} /> }))
      actions = (
        <>
          <ActionTile icon={<WandSparkles size={18} aria-hidden />} title={`Write me a new ${level} story`} sub="On any topic, with your words" onClick={() => d.openGenerate(level)} />
          <ActionTile icon={<ClipboardPaste size={18} aria-hidden />} title="Paste a text" sub="An article, a song, a message…" onClick={d.openPaste} />
        </>
      )
      const mine = s.texts.filter((t) => !hideDone || !s.read[t.id])
      if (mine.length)
        extra = (
          <>
            <Text fw={650} mt="xl" mb="sm">
              Your texts <Text span c="dimmed" size="sm">{mine.length}</Text>
            </Text>
            <TileGrid>
              {mine.map((t) => (
                <UserTextTile key={t.id} t={t} done={!!s.read[t.id]} onDelete={() => d.askDelete(t.id)} />
              ))}
            </TileGrid>
          </>
        )
      break
    }
    case 'books':
      items = BOOKS.map((b) => ({ key: b.id, level: b.level, done: bookProgress(b, s.read).finished, node: <BookTile key={b.id} b={b} /> }))
      break
    case 'talk':
      items = SCENARIOS.map((x) => ({ key: x.id, level: x.level, done: talked.has(x.id), node: <ScenarioTile key={x.id} s={x} done={talked.has(x.id)} /> }))
      actions = <ActionTile icon={<MessagesSquare size={18} aria-hidden />} title="Free conversation" sub="Chat about anything with Camille" onClick={d.openFreeTalk} />
      break
    case 'writing':
      items = WRITING_PROMPTS.map((p) => ({ key: p.id, level: p.level, done: written.has(p.id), node: <PromptTile key={p.id} p={p} done={written.has(p.id)} /> }))
      actions = (
        <>
          <ActionTile icon={<Feather size={18} aria-hidden />} title="Free writing" sub="A diary entry, a message, anything" to="/writing/new?prompt=free" />
          <ActionTile icon={<PencilLine size={18} aria-hidden />} title="Your own topic" sub="Set the task yourself" to="/writing/new?prompt=custom" />
        </>
      )
      break
  }

  const doneCount = items.filter((i) => i.done).length
  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader
        back={back}
        eyebrow={meta.eyebrow}
        title={meta.title}
        subtitle={`${doneCount} of ${items.length} done`}
        actions={<Switch checked={hideDone} onChange={(e) => setHideDone(e.currentTarget.checked)} label="Hide done" />}
      />
      {actions && <TileGrid>{actions}</TileGrid>}
      {LEVELS.map((l) => {
        const all = items.filter((i) => i.level === l)
        if (!all.length) return null
        const shown = hideDone ? all.filter((i) => !i.done) : all
        return (
          <LevelGroup key={l} group={`library-${section}`} level={l} done={all.filter((i) => i.done).length} total={all.length} defaultOpen={l === level}>
            {shown.length ? (
              <TileGrid>{shown.map((i) => i.node)}</TileGrid>
            ) : (
              <Group py="sm">
                <Text size="sm" c="dimmed">
                  All done at {l}.
                </Text>
              </Group>
            )}
          </LevelGroup>
        )
      })}
      {extra}
      {d.dialogs}
    </Container>
  )
}
