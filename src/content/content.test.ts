import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LESSONS, LESSON_BY_ID } from '../data/grammar'
import { DECKS, THEMED_DECKS } from '../data/vocab'
import { BUILTIN_TEXTS } from '../data/texts'
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
    expect(SCENARIOS.length).toBe(count('conversations'))
    expect(WRITING_PROMPTS.length).toBe(count('writing'))
    expect(SOUND_SETS.length).toBe(count('pronunciation'))
    expect(md.length).toBe(LESSONS.length + DECKS.length + BUILTIN_TEXTS.length + SCENARIOS.length + WRITING_PROMPTS.length + SOUND_SETS.length)
  })

  it('uses each id once per kind', () => {
    for (const list of [LESSONS, DECKS, BUILTIN_TEXTS, SCENARIOS, WRITING_PROMPTS, SOUND_SETS]) {
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
    for (const list of [LESSONS, THEMED_DECKS, BUILTIN_TEXTS, SCENARIOS, WRITING_PROMPTS]) {
      const levels = list.map((x) => order.indexOf(x.level))
      expect(levels).toEqual([...levels].sort((a, b) => a - b))
    }
  })
})
