import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LESSONS, LESSON_BY_ID } from '../data/grammar'
import { DECKS, THEMED_DECKS } from '../data/vocab'
import { BUILTIN_TEXTS } from '../data/texts'
import { BOOKS, loadBook } from '../data/books'
import { AUDIO_LESSONS } from '../data/audio'
import { STORIES } from '../data/stories'
import { SCENARIOS } from '../data/scenarios'
import { WRITING_PROMPTS } from '../data/writing'
import { SOUND_SETS } from '../data/sounds'

const ROOT = join(__dirname, '../../content')

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]))
}

describe('content folder', () => {
  it('loads every file (except README and _drafts)', () => {
    const md = files(ROOT)
      .map((f) => relative(ROOT, f))
      .filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.split('/').pop()!.startsWith('_'))
    const count = (kind: string) => md.filter((f) => f.startsWith(kind + '/')).length
    expect(LESSONS.length).toBe(count('grammar'))
    expect(DECKS.length).toBe(count('vocab'))
    expect(BUILTIN_TEXTS.length).toBe(count('reading'))
    expect(BOOKS.length).toBe(count('books'))
    expect(STORIES.length).toBe(count('stories'))
    expect(SCENARIOS.length).toBe(count('conversations'))
    expect(WRITING_PROMPTS.length).toBe(count('writing'))
    expect(SOUND_SETS.length).toBe(count('pronunciation'))
    expect(AUDIO_LESSONS.length).toBe(count('audio'))
    expect(md.length).toBe(
      LESSONS.length + DECKS.length + BUILTIN_TEXTS.length + BOOKS.length + STORIES.length + SCENARIOS.length + WRITING_PROMPTS.length + SOUND_SETS.length + AUDIO_LESSONS.length,
    )
  })

  it('uses each id once per kind', () => {
    for (const list of [LESSONS, DECKS, BUILTIN_TEXTS, BOOKS, STORIES, SCENARIOS, WRITING_PROMPTS, SOUND_SETS, AUDIO_LESSONS]) {
      const ids = list.map((x) => x.id)
      expect(ids.filter((id, i) => ids.indexOf(id) !== i), 'duplicate ids').toEqual([])
    }
  })

  it('links to lessons that exist', () => {
    for (const x of [...SCENARIOS, ...WRITING_PROMPTS])
      for (const id of x.lessons) expect(LESSON_BY_ID[id], `${x.id} → lesson "${id}"`).toBeDefined()
  })

  it('keeps each level in order', () => {
    const order = ['A1', 'A2', 'B1', 'B2']
    for (const list of [LESSONS, THEMED_DECKS, BUILTIN_TEXTS, BOOKS, STORIES, SCENARIOS, WRITING_PROMPTS]) {
      const levels = list.map((x) => order.indexOf(x.level))
      expect(levels).toEqual([...levels].sort((a, b) => a - b))
    }
  })
})

describe('books', () => {
  it('list chapters without their text, and load the text on demand', async () => {
    for (const meta of BOOKS) {
      expect(meta.chapters.length, meta.id).toBeGreaterThan(0)
      expect(meta.chapters[0], meta.id).not.toHaveProperty('paragraphs')
      const book = await loadBook(meta.id)
      expect(book.chapters.map((c) => c.title), meta.id).toEqual(meta.chapters.map((c) => c.title))
      expect(book.words, meta.id).toBe(meta.words)
    }
  })

  it('keep chapters to a readable length', () => {
    for (const b of BOOKS)
      for (const c of b.chapters) {
        expect(c.words, `${b.id}: ${c.title}`).toBeGreaterThanOrEqual(b.kind === 'adapted' ? 60 : 150)
        expect(c.words, `${b.id}: ${c.title}`).toBeLessThanOrEqual(b.kind === 'adapted' ? 900 : 4500)
      }
  })

  it('come from the public domain or are retold for the app', () => {
    for (const b of BOOKS) {
      if (b.kind === 'original') expect(b.source, b.id).toMatch(/^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/)
      else expect(b.translated, b.id).toBe(true)
      expect(Number(b.year), b.id).toBeLessThan(1929)
    }
  })
})

describe('listening stories', () => {
  it('last 1–2 minutes and have well-formed questions', async () => {
    const { storyMinutes } = await import('../data/stories')
    for (const st of STORIES) {
      expect(storyMinutes(st), st.id).toBeGreaterThanOrEqual(1)
      expect(storyMinutes(st), st.id).toBeLessThanOrEqual(2)
      expect(st.questions.length, st.id).toBeGreaterThanOrEqual(3)
      for (const q of st.questions) {
        expect(q.answer, `${st.id}: ${q.prompt}`).toBeLessThan(q.options.length)
        expect(new Set(q.options).size, `${st.id}: ${q.prompt}`).toBe(q.options.length)
      }
    }
  })
})
