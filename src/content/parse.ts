/**
 * Turns the Markdown files in content/ into the data the app uses. Runs at
 * build time (see plugin.ts), so a mistake in a file shows up as a clear error
 * with the file and line instead of a broken page. The formats are described
 * in content/README.md.
 *
 * (Imports carry .ts extensions because this file is also loaded by vite.config.ts.)
 */
import {
  SCENARIO_ICONS,
  type Block,
  type Deck,
  type Exercise,
  type Lesson,
  type LessonSection,
  type Level,
  type ReaderTextDef,
  type Scenario,
  type ScenarioIcon,
  type SoundSet,
  type WritingPrompt,
} from '../data/types.ts'
import { deck, type Row } from '../data/vocab/build.ts'
import { ContentError, parseMarkdown, type Field, type ListItem, type MdBlock, type MdDocument } from './markdown.ts'

export { ContentError }

export const CONTENT_KINDS = ['grammar', 'vocab', 'reading', 'conversations', 'writing', 'pronunciation'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]
const LEVELED: ContentKind[] = ['grammar', 'vocab', 'reading', 'conversations', 'writing']
const LEVEL_DIRS: Record<string, Level> = { a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' }
/** Vocabulary decks that aren't sorted by level or theme (the level comes from their front matter). */
export const FREQUENCY_DIR = 'top5000'

export interface ContentPath {
  kind: ContentKind
  level?: Level
  /** Set for decks in content/vocab/top5000/ (the 5000 most frequent words). */
  group?: 'frequency'
  /** Path from the project root, e.g. content/grammar/a1/01-etre-avoir.md */
  file: string
}

/** Works out what a file under content/ holds from where it is. Returns null for other files. */
export function describePath(path: string): ContentPath | null {
  const p = path.replace(/\\/g, '/').split('?')[0]
  const at = p.lastIndexOf('/content/')
  if (at < 0 || !p.endsWith('.md')) return null
  const file = p.slice(at + 1)
  const parts = file.split('/').slice(1)
  const kind = parts[0] as ContentKind
  if (!CONTENT_KINDS.includes(kind)) return null
  if (!LEVELED.includes(kind)) {
    if (parts.length !== 2) throw new ContentError(`Put ${kind} files directly in content/${kind}/.`, 1)
    return { kind, file }
  }
  if (kind === 'vocab' && parts[1] === FREQUENCY_DIR && parts.length === 3) return { kind, group: 'frequency', file }
  const level = LEVEL_DIRS[parts[1]]
  if (parts.length !== 3 || !level)
    throw new ContentError(
      `Put ${kind} files in a level folder: content/${kind}/a1/, a2/, b1/ or b2/${kind === 'vocab' ? ` (or ${FREQUENCY_DIR}/)` : ''}.`,
      1,
    )
  return { kind, level, file }
}

/** Parses one content file (by its path) into app data. */
export function parseContent(source: string, path: string): Lesson | Deck | ReaderTextDef | Scenario | WritingPrompt | SoundSet {
  const where = describePath(path)
  if (!where) throw new ContentError('This file is not in a content folder the app knows about.', 1)
  const doc = parseMarkdown(source)
  const level = where.level as Level
  switch (where.kind) {
    case 'grammar':
      return parseLesson(doc, level)
    case 'vocab':
      return parseDeck(doc, level, where.group)
    case 'reading':
      return parseText(doc, level)
    case 'conversations':
      return parseScenario(doc, level)
    case 'writing':
      return parseWriting(doc, level)
    case 'pronunciation':
      return parseSoundSet(doc)
  }
}

// ───────────── Helpers ─────────────

const fail = (message: string, line: number): never => {
  throw new ContentError(message, line)
}

function readMeta(doc: MdDocument, required: string[], optional: string[] = []): Record<string, Field> {
  const known = [...required, ...optional]
  for (const [key, f] of Object.entries(doc.meta)) {
    if (known.includes(key)) continue
    if (key === 'level') fail('Leave out "level": it comes from the folder the file is in (a1/, a2/, b1/, b2/).', f.line)
    const near = known.find((k) => k.toLowerCase() === key.toLowerCase())
    fail(near ? `Unknown field "${key}" — did you mean "${near}"?` : `Unknown field "${key}". Allowed here: ${known.join(', ')}.`, f.line)
  }
  for (const key of required) {
    const f = doc.meta[key]
    if (!f) fail(`The front matter needs "${key}: …".`, 1)
    if (!f.value) fail(`"${key}" is empty.`, f.line)
  }
  return doc.meta
}

function readId(f: Field): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.value))
    fail(`"${f.value}" isn't a valid id: use lowercase letters, digits and dashes, e.g. passe-compose.`, f.line)
  return f.value
}

const commaList = (f?: Field) => (f?.value ?? '').split(',').map((s) => s.trim()).filter(Boolean)

/** "French | English" */
function pair(item: ListItem): { fr: string; en: string } {
  const parts = item.text.split(' | ')
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim())
    fail('Write each example as "French | English" (one | with a space on each side).', item.line)
  return { fr: parts[0].trim(), en: parts[1].trim() }
}

const isPairList = (b: MdBlock) => b.kind === 'list' && b.items.some((i) => i.text.includes(' | '))

function pairs(b: MdBlock): { fr: string; en: string }[] {
  if (b.kind !== 'list') return fail('Expected a list of "French | English" lines.', b.line)
  return b.items.map(pair)
}

/** Splits a document into its ## sections (the part before the first heading is under ''). */
function sections(doc: MdDocument): { heading: string; line: number; blocks: MdBlock[] }[] {
  const out: { heading: string; line: number; blocks: MdBlock[] }[] = [{ heading: '', line: 1, blocks: [] }]
  for (const b of doc.blocks) {
    if (b.kind === 'heading' && b.depth === 1) fail('Use ## for headings; the title goes in the front matter.', b.line)
    if (b.kind === 'heading' && b.depth === 2) out.push({ heading: b.text, line: b.line, blocks: [] })
    else out[out.length - 1].blocks.push(b)
  }
  return out
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

function paragraphs(blocks: MdBlock[], what: string, line: number): string {
  if (!blocks.length) fail(`Add the ${what}.`, line)
  for (const b of blocks) if (b.kind !== 'paragraph') fail(`Only plain text is expected for the ${what}.`, b.line)
  return blocks.map((b) => (b as { text: string }).text).join(' ')
}

// ───────────── Grammar lessons ─────────────

const EXERCISE_TYPES = ['cloze', 'mcq', 'order', 'translate', 'transform'] as const

export function parseLesson(doc: MdDocument, level: Level): Lesson {
  const m = readMeta(doc, ['id', 'title', 'titleFr', 'summary', 'minutes'])
  const minutes = Number(m.minutes.value)
  if (!Number.isInteger(minutes) || minutes <= 0) fail('"minutes" should be a whole number, e.g. 8.', m.minutes.line)

  const lessonSections: LessonSection[] = []
  const exercises: Exercise[] = []
  let inExercises = false
  let current: { type: string; line: number; items: ListItem[] } | null = null
  const finishExercise = () => {
    if (current) exercises.push(parseExercise(current.type, current.items, current.line))
    current = null
  }

  for (const b of doc.blocks) {
    if (b.kind === 'heading' && b.depth === 1) fail('Use ## for section headings; the title goes in the front matter.', b.line)
    if (b.kind === 'heading' && b.depth === 2) {
      if (inExercises) fail('"## Exercises" must be the last section.', b.line)
      if (key(b.text) === 'exercises') inExercises = true
      else lessonSections.push({ heading: b.text, blocks: [] })
      continue
    }
    if (inExercises) {
      if (b.kind === 'heading' && b.depth === 3) {
        finishExercise()
        const type = b.text.trim().toLowerCase()
        if (!(EXERCISE_TYPES as readonly string[]).includes(type))
          fail(`Unknown exercise type "${b.text}". Use one of: ${EXERCISE_TYPES.join(', ')}.`, b.line)
        current = { type, line: b.line, items: [] }
      } else if (b.kind === 'list' && current) current.items.push(...b.items)
      else fail('Under "## Exercises", start each exercise with a ### heading (### cloze, ### mcq, …) followed by "- field: value" lines.', b.line)
      continue
    }
    const section = lessonSections[lessonSections.length - 1]
    if (!section) fail('Start the lesson with a ## section heading.', b.line)
    section.blocks.push(...lessonBlock(b, section.blocks))
  }
  finishExercise()
  if (!lessonSections.length) fail('A lesson needs at least one ## section.', 1)
  for (const s of lessonSections) if (!s.blocks.length) fail(`The section "${s.heading}" is empty.`, 1)
  if (!exercises.length) fail('Add a "## Exercises" section with at least one exercise.', 1)

  return {
    id: readId(m.id),
    level,
    title: m.title.value,
    titleFr: m.titleFr.value,
    summary: m.summary.value,
    minutes,
    sections: lessonSections,
    exercises,
  }
}

function lessonBlock(b: MdBlock, previous: Block[]): Block[] {
  switch (b.kind) {
    case 'paragraph': {
      const last = previous[previous.length - 1]
      if (b.text.startsWith('Table: ') && last?.type === 'table') {
        last.caption = b.text.slice(7).trim()
        return []
      }
      return [{ type: 'p', text: b.text }]
    }
    case 'list':
      if (isPairList(b)) return [{ type: 'examples', items: pairs(b) }]
      return [{ type: 'list', items: b.items.map((i) => i.text) }]
    case 'table':
      return [{ type: 'table', head: b.head, rows: b.rows }]
    case 'quote':
      if (b.alert === 'TIP') return [{ type: 'tip', text: b.text }]
      if (b.alert === 'WARNING') return [{ type: 'warn', text: b.text }]
      return fail('Start a quote with [!TIP] or [!WARNING], e.g. "> [!TIP] Liaison is optional here."', b.line)
    case 'heading':
      return fail('Only ## headings are used inside lessons (### is for exercises).', b.line)
  }
}

function parseExercise(type: string, items: ListItem[], line: number): Exercise {
  const fields: Record<string, { value: string; line: number }[]> = {}
  const options: { text: string; checked: boolean; line: number }[] = []
  for (const item of items) {
    if (item.checked !== undefined) {
      if (type !== 'mcq') fail('Checkbox options ([ ] / [x]) are only for mcq exercises.', item.line)
      options.push({ text: item.text, checked: item.checked, line: item.line })
      continue
    }
    const f = /^([a-zA-Z]+):\s*(.*)$/.exec(item.text)
    if (!f) fail('Write exercise lines as "- field: value", e.g. "- answer: sommes".', item.line)
    const [, name, value] = f as RegExpExecArray
    if (!value.trim()) fail(`"${name}" is empty.`, item.line)
    ;(fields[name.toLowerCase()] ??= []).push({ value: value.trim(), line: item.line })
  }

  const allowed: Record<string, string[]> = {
    cloze: ['sentence', 'answer', 'hint', 'en', 'explain'],
    mcq: ['prompt', 'sentence', 'explain'],
    order: ['en', 'words', 'also', 'extra', 'punct', 'explain'],
    translate: ['en', 'answer', 'explain'],
    transform: ['instruction', 'source', 'answer', 'explain'],
  }
  for (const [name, list] of Object.entries(fields)) {
    if (!allowed[type].includes(name)) {
      const hint = type === 'mcq' && name === 'answer' ? ' Mark the right option with [x] instead.' : ''
      fail(`"${name}" isn't used in ${type} exercises (use: ${allowed[type].join(', ')}).${hint}`, list[0].line)
    }
    if (name !== 'answer' && name !== 'also' && list.length > 1) fail(`"${name}" appears more than once.`, list[1].line)
  }
  const one = (name: string) => fields[name]?.[0]?.value
  const need = (name: string) => one(name) ?? fail(`This ${type} exercise needs "- ${name}: …".`, line)
  const answers = () => (fields.answer ?? []).map((a) => a.value)
  const needAnswers = () => {
    const a = answers()
    if (!a.length) fail(`This ${type} exercise needs at least one "- answer: …".`, line)
    return a
  }
  const opt = <K extends string>(k: K, name: string) => (one(name) !== undefined ? ({ [k]: one(name) } as Record<K, string>) : {})

  switch (type) {
    case 'cloze': {
      const sentence = need('sentence')
      if (sentence.split('___').length !== 2) fail('The sentence needs exactly one ___ blank.', fields.sentence[0].line)
      return { type: 'cloze', sentence, ...opt('hint', 'hint'), answers: needAnswers(), ...opt('en', 'en'), explain: need('explain') }
    }
    case 'mcq': {
      if (options.length < 2) fail('An mcq needs at least two options, written as "- [ ] …" and "- [x] …".', line)
      const right = options.filter((o) => o.checked)
      if (right.length !== 1) fail('Mark exactly one option as right with [x].', right[1]?.line ?? line)
      return {
        type: 'mcq',
        prompt: need('prompt'),
        ...opt('sentence', 'sentence'),
        options: options.map((o) => o.text),
        answer: options.findIndex((o) => o.checked),
        explain: need('explain'),
      }
    }
    case 'order': {
      const words = need('words').split(/\s+/)
      const extra = one('extra')?.split(/\s+/)
      const alt = fields.also?.map((a) => a.value)
      return {
        type: 'order',
        en: need('en'),
        words,
        ...(alt ? { alt } : {}),
        ...(extra ? { extra } : {}),
        ...opt('punct', 'punct'),
        ...opt('explain', 'explain'),
      }
    }
    case 'translate':
      return { type: 'translate', en: need('en'), answers: needAnswers(), ...opt('explain', 'explain') }
    default:
      return { type: 'transform', instruction: need('instruction'), source: need('source'), answers: needAnswers(), ...opt('explain', 'explain') }
  }
}

// ───────────── Vocabulary decks ─────────────

const KINDS = /^(m|f|mf|mpl|fpl|adj(:.+)?|v|adv|prep|conj|pron|expr|num|det|interj)$/

export function parseDeck(doc: MdDocument, level?: Level, group?: 'frequency'): Deck {
  const d = parseDeckRows(doc, level, group)
  return deck(d.id, d.level, d.title, d.titleFr, d.rows, d.group)
}

/** A deck in its compact form (the app expands the rows with deck()). */
export interface DeckRows {
  id: string
  level: Level
  title: string
  titleFr: string
  rows: Row[]
  group?: 'frequency'
}

/**
 * Decks in a level folder take their level from the folder. Frequency decks
 * (content/vocab/top5000/) aren't in one, so they say it in the front matter.
 */
export function parseDeckRows(doc: MdDocument, level?: Level, group?: 'frequency'): DeckRows {
  const m = readMeta(doc, group ? ['id', 'title', 'titleFr', 'level'] : ['id', 'title', 'titleFr'])
  if (group) {
    level = LEVEL_DIRS[m.level.value.toLowerCase()]
    if (!level) fail(`"${m.level.value}" isn't a level. Use A1, A2, B1 or B2.`, m.level.line)
  }
  const tables = doc.blocks.filter((b) => b.kind === 'table')
  for (const b of doc.blocks) if (b.kind !== 'table') fail('A deck file holds just its front matter and one table of words.', b.line)
  if (tables.length !== 1) fail('A deck file needs exactly one table of words.', tables[1]?.line ?? 1)
  const t = tables[0] as Extract<MdBlock, { kind: 'table' }>
  const col = (name: string) => t.head.findIndex((h) => h.toLowerCase() === name)
  const cols = { fr: col('french'), en: col('english'), kind: col('type'), ex: col('example'), exEn: col('translation'), note: col('note') }
  if (cols.fr < 0 || cols.en < 0 || cols.kind < 0) fail('The table needs the columns French, English and Type (Example, Translation and Note are optional).', t.line)
  for (const h of t.head)
    if (!['french', 'english', 'type', 'example', 'translation', 'note'].includes(h.toLowerCase()))
      fail(`Unknown column "${h}". Use: French, English, Type, Example, Translation, Note.`, t.line)
  const cell = (row: string[], i: number) => (i >= 0 && row[i] ? row[i] : undefined)
  const rows: Row[] = t.rows.map((r, i) => {
    const line = t.line + 2 + i
    const fr = cell(r, cols.fr) ?? fail('Every word needs its French.', line)
    const en = cell(r, cols.en) ?? fail(`"${fr}" needs an English meaning.`, line)
    const kind = cell(r, cols.kind) ?? fail(`"${fr}" needs a Type (m, f, v, adj, …).`, line)
    if (!KINDS.test(kind))
      fail(`"${kind}" isn't a word type. Use m, f, mf, mpl, fpl for nouns, adj or adj:feminine-form, or v, adv, prep, conj, pron, expr, num, det, interj.`, line)
    const ex = cell(r, cols.ex)
    const exEn = cell(r, cols.exEn)
    if (ex && !exEn) fail(`The example for "${fr}" needs a translation.`, line)
    const row: Row = [fr, en, kind]
    const note = cell(r, cols.note)
    if (ex || note) row.push(ex, exEn)
    if (note) row.push(note)
    return row
  })
  if (!rows.length) fail('The deck has no words yet.', t.line)
  return { id: readId(m.id), level: level!, title: m.title.value, titleFr: m.titleFr.value, rows, ...(group && { group }) }
}

// ───────────── Reading texts ─────────────

export function parseText(doc: MdDocument, level: Level): ReaderTextDef {
  const m = readMeta(doc, ['id', 'title', 'titleEn', 'topic'])
  const paragraphs: { fr: string; en: string }[] = []
  for (const b of doc.blocks) {
    if (b.kind === 'paragraph') {
      const last = paragraphs[paragraphs.length - 1]
      if (last && !last.en) fail('Add the English translation of the paragraph above as a "> " line before starting the next one.', b.line)
      paragraphs.push({ fr: b.text, en: '' })
    } else if (b.kind === 'quote' && !b.alert) {
      const last = paragraphs[paragraphs.length - 1]
      if (!last || last.en) fail('A "> " translation must follow a French paragraph.', b.line)
      last.en = b.text
    } else fail('A text is French paragraphs, each followed by its English translation on a "> " line.', b.line)
  }
  if (!paragraphs.length) fail('The text is empty.', 1)
  if (!paragraphs[paragraphs.length - 1].en) fail('The last paragraph needs its English translation ("> …").', doc.blocks[doc.blocks.length - 1].line)
  return { id: readId(m.id), level, title: m.title.value, titleEn: m.titleEn.value, topic: m.topic.value, paragraphs }
}

// ───────────── Conversation scenarios ─────────────

export function parseScenario(doc: MdDocument, level: Level): Scenario {
  const m = readMeta(doc, ['id', 'title', 'titleFr', 'icon', 'aiName', 'lessons'])
  const icon = m.icon.value as ScenarioIcon
  if (!(SCENARIO_ICONS as readonly string[]).includes(icon)) fail(`Unknown icon "${icon}". Use one of: ${SCENARIO_ICONS.join(', ')}.`, m.icon.line)
  const parts = sections(doc)
  if (parts[0].blocks.length) fail('Put everything under a ## heading (Setting, AI role, Opening, Goals, Phrases).', parts[0].blocks[0].line)
  const byKey: Record<string, (typeof parts)[number]> = {}
  for (const s of parts.slice(1)) {
    const k = key(s.heading)
    if (!['setting', 'airole', 'opening', 'goals', 'phrases'].includes(k))
      fail(`Unknown section "${s.heading}". Use: Setting, AI role, Opening, Goals, Phrases.`, s.line)
    if (byKey[k]) fail(`"${s.heading}" appears twice.`, s.line)
    byKey[k] = s
  }
  const section = (k: string, name: string) => byKey[k] ?? fail(`Add a "## ${name}" section.`, 1)

  const opening = section('opening', 'Opening')
  const [fr, en, ...rest] = opening.blocks
  if (fr?.kind !== 'paragraph' || en?.kind !== 'quote' || en.alert || rest.length)
    fail('The opening is the character’s first line in French, then its English translation on a "> " line.', opening.line)

  const goals = section('goals', 'Goals')
  const goalItems = goals.blocks.flatMap((b) => (b.kind === 'list' ? b.items : fail('Write goals as "- id: what to do".', b.line)))
  const ids = new Set<string>()
  const goalList = goalItems.map((item) => {
    const g = /^([a-z0-9]+(?:-[a-z0-9]+)*):\s+(.+)$/.exec(item.text)
    if (!g) fail('Write each goal as "- short-id: What to do", e.g. "- order-drink: Order a hot drink".', item.line)
    const [, id, text] = g as RegExpExecArray
    if (ids.has(id)) fail(`The goal id "${id}" is used twice.`, item.line)
    ids.add(id)
    return { id, text }
  })
  if (!goalList.length) fail('Add at least one goal.', goals.line)

  const phrases = section('phrases', 'Phrases')
  if (phrases.blocks.length !== 1) fail('Write the phrases as one list of "French | English" lines.', phrases.line)

  return {
    id: readId(m.id),
    level,
    title: m.title.value,
    titleFr: m.titleFr.value,
    icon,
    setting: paragraphs(section('setting', 'Setting').blocks, 'setting', byKey.setting.line),
    aiRole: paragraphs(section('airole', 'AI role').blocks, 'AI role', byKey.airole.line),
    aiName: m.aiName.value,
    opening: (fr as { text: string }).text,
    openingEn: (en as { text: string }).text,
    goals: goalList,
    phrases: pairs(phrases.blocks[0]),
    lessons: commaList(m.lessons),
  }
}

// ───────────── Writing prompts ─────────────

export function parseWriting(doc: MdDocument, level: Level): WritingPrompt {
  const m = readMeta(doc, ['id', 'title', 'titleFr', 'focus', 'lessons', 'words'])
  const w = /^(\d+)\s*[-–]\s*(\d+)$/.exec(m.words.value)
  if (!w || Number(w[1]) >= Number(w[2])) fail('"words" is the length range, e.g. 40-80.', m.words.line)
  const parts = sections(doc)
  const extra = parts.slice(1).filter((s) => key(s.heading) !== 'phrases')
  if (extra.length) fail(`Unknown section "${extra[0].heading}". A writing prompt has the task, then "## Phrases".`, extra[0].line)
  const phrases = parts.find((s) => key(s.heading) === 'phrases') ?? fail('Add a "## Phrases" section with a few useful expressions.', 1)
  const list = phrases.blocks.flatMap((b) => (b.kind === 'list' ? b.items.map((i) => i.text) : fail('Write the phrases as a "- " list.', b.line)))
  return {
    id: readId(m.id),
    level,
    titleFr: m.titleFr.value,
    title: m.title.value,
    task: paragraphs(parts[0].blocks, 'task (what to write, before "## Phrases")', 1),
    focus: m.focus.value,
    lessons: commaList(m.lessons),
    words: [Number(w![1]), Number(w![2])],
    phrases: list,
  }
}

// ───────────── Pronunciation sets ─────────────

export function parseSoundSet(doc: MdDocument): SoundSet {
  const m = readMeta(doc, ['id', 'title', 'sound'])
  const parts = sections(doc)
  const extra = parts.slice(1).filter((s) => key(s.heading) !== 'sentences')
  if (extra.length) fail(`Unknown section "${extra[0].heading}". A pronunciation set has the tip, then "## Sentences".`, extra[0].line)
  const sentences = parts.find((s) => key(s.heading) === 'sentences') ?? fail('Add a "## Sentences" section.', 1)
  if (sentences.blocks.length !== 1) fail('Write the sentences as one list of "French | English" lines.', sentences.line)
  return {
    id: readId(m.id),
    title: m.title.value,
    sound: m.sound.value,
    tip: paragraphs(parts[0].blocks, 'tip (how to make the sound, before "## Sentences")', 1),
    sentences: pairs(sentences.blocks[0]),
  }
}
