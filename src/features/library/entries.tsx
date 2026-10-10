import type { ReactNode } from 'react'
import { LESSONS } from '../../data/grammar'
import { AUDIO_LESSONS } from '../../data/audio'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { BOOKS, bookProgress } from '../../data/books'
import type { State } from '../../lib/store'
import { lessonStatus } from '../grammar/status'
import { LessonTile } from '../grammar/LessonTile'
import { AudioTile } from '../audio/AudioTile'
import { StoryTile } from '../listening/StoryTile'
import { GradedTile, UserTextTile } from '../reading/texts'
import { BookTile } from '../books/shared'
import { ConversationTile } from '../talk/TalkTiles'
import { WritingTile } from '../writing/tiles'

export type Entry = { at: string; key: string; node: ReactNode }

const latest = (...xs: (string | undefined)[]) => xs.filter((x): x is string => !!x).sort().pop() ?? ''

export const lessonNo = (id: string) => LESSONS.findIndex((l) => l.id === id) + 1

/** What you're in the middle of, and what you've finished, newest first. */
export function libraryEntries(s: State, askDelete: (id: string) => void): { continuing: Entry[]; done: Entry[] } {
  const stories = s.stories ?? {}
  const audio = s.audio ?? {}
  const conversations = s.conversations
  const books = BOOKS.map((b) => ({ b, p: bookProgress(b, s.read, s.books?.[b.id]?.chapter), place: s.books?.[b.id] }))
  const continuing: Entry[] = [
    ...books
      .filter(({ p, place }) => !p.finished && (p.done > 0 || place))
      .map(({ b, p, place }) => ({ at: latest(place?.at, p.lastDay && `${p.lastDay}T12:00:00`), key: b.id, node: <BookTile key={b.id} b={b} /> })),
    ...AUDIO_LESSONS.filter((l) => audio[l.id] && !audio[l.id].done && audio[l.id].pos > 0).map((l) => ({
      at: audio[l.id].at,
      key: l.id,
      node: <AudioTile key={l.id} l={l} p={audio[l.id]} />,
    })),
    ...s.texts
      .filter((t) => !s.read[t.id] && t.openedAt)
      .map((t) => ({ at: t.openedAt!, key: t.id, node: <UserTextTile key={t.id} t={t} onDelete={() => askDelete(t.id)} /> })),
    ...conversations
      .filter((c) => !c.feedback && c.turns.some((t) => t.role === 'me'))
      .map((c) => ({ at: c.updatedAt, key: c.id, node: <ConversationTile key={c.id} c={c} /> })),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'started').map((l) => ({
      at: s.lessons[l.id].lastAt,
      key: l.id,
      node: <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const done: Entry[] = [
    ...STORIES.filter((x) => stories[x.id]).map((x) => ({ at: stories[x.id].at, key: x.id, node: <StoryTile key={x.id} s={x} result={stories[x.id]} /> })),
    ...books.filter(({ p }) => p.finished).map(({ b, p }) => ({ at: p.lastDay!, key: b.id, node: <BookTile key={b.id} b={b} /> })),
    ...BUILTIN_TEXTS.filter((t) => s.read[t.id]).map((t) => ({ at: s.read[t.id], key: t.id, node: <GradedTile key={t.id} t={t} done /> })),
    ...s.texts
      .filter((t) => s.read[t.id])
      .map((t) => ({ at: s.read[t.id], key: t.id, node: <UserTextTile key={t.id} t={t} done onDelete={() => askDelete(t.id)} /> })),
    ...AUDIO_LESSONS.filter((l) => audio[l.id]?.done).map((l) => ({ at: audio[l.id].done!, key: l.id, node: <AudioTile key={l.id} l={l} p={audio[l.id]} /> })),
    ...conversations.filter((c) => c.feedback).map((c) => ({ at: c.updatedAt, key: c.id, node: <ConversationTile key={c.id} c={c} /> })),
    ...s.writings.map((w) => ({ at: w.createdAt, key: w.id, node: <WritingTile key={w.id} w={w} /> })),
    ...LESSONS.filter((l) => lessonStatus(s.lessons[l.id]) === 'mastered').map((l) => ({
      at: s.lessons[l.id].lastAt,
      key: l.id,
      node: <LessonTile key={l.id} l={l} p={s.lessons[l.id]} n={lessonNo(l.id)} />,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return { continuing, done }
}
