/**
 * A small, strict reader for the Markdown used in content/: front matter,
 * headings, paragraphs, "- " lists (with [ ] / [x] checkboxes), tables and
 * "> " quotes (with [!TIP] / [!WARNING] markers). Inline formatting (**bold**,
 * *italic*, ~~struck~~) is kept as text for the app to render. Every block
 * remembers its line number so errors can point at the exact spot.
 */

export class ContentError extends Error {
  line: number
  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

export interface Field {
  value: string
  line: number
}

export type MdBlock =
  | { kind: 'heading'; depth: number; text: string; line: number }
  | { kind: 'paragraph'; text: string; line: number }
  | { kind: 'list'; items: ListItem[]; line: number }
  | { kind: 'table'; head: string[]; rows: string[][]; line: number }
  | { kind: 'quote'; alert?: string; text: string; line: number }

export interface ListItem {
  text: string
  line: number
  /** true for "- [x]", false for "- [ ]", undefined for a plain item. */
  checked?: boolean
}

export interface MdDocument {
  meta: Record<string, Field>
  blocks: MdBlock[]
}

/** Blanks out <!-- comments --> while keeping line numbers. */
function stripComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''))
}

function frontMatter(lines: string[]): { meta: Record<string, Field>; start: number } {
  const meta: Record<string, Field> = {}
  if (lines[0]?.trim() !== '---') throw new ContentError('The file must start with a --- front matter block (id, title, …).', 1)
  let i = 1
  for (; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (t === '---') return { meta, start: i + 1 }
    if (!t || t.startsWith('#')) continue
    const m = /^([A-Za-z][\w-]*)\s*:\s?(.*)$/.exec(t)
    if (!m) throw new ContentError(`Expected "key: value" in the front matter, found "${t}".`, i + 1)
    const [, key, rest] = m
    if (key in meta) throw new ContentError(`"${key}" appears twice in the front matter.`, i + 1)
    let value = rest.trim()
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    meta[key] = { value, line: i + 1 }
  }
  throw new ContentError('The front matter is never closed: add a line with --- after it.', 1)
}

const LIST = /^- (.*)$/
const CHECK = /^\[( |x|X)\] (.*)$/

function splitRow(line: string, n: number): string[] {
  let s = line.trim()
  if (!s.startsWith('|')) throw new ContentError('Table rows must start with |.', n)
  s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cur += '|'
      i++
    } else if (s[i] === '|') {
      cells.push(cur.trim())
      cur = ''
    } else cur += s[i]
  }
  cells.push(cur.trim())
  return cells
}

/** Parses a content file into front matter and blocks. */
export function parseMarkdown(source: string): MdDocument {
  const lines = stripComments(source.replace(/\r\n?/g, '\n')).split('\n')
  const { meta, start } = frontMatter(lines)
  const blocks: MdBlock[] = []
  let i = start
  const at = (k: number) => lines[k] ?? ''
  const blank = (k: number) => at(k).trim() === ''
  const startsBlock = (t: string) => /^#{1,6}\s/.test(t) || t.startsWith('|') || t.startsWith('>') || LIST.test(t) || t.startsWith('```')

  while (i < lines.length) {
    const raw = at(i)
    const t = raw.trim()
    const n = i + 1
    if (!t) {
      i++
      continue
    }
    if (t.startsWith('```')) throw new ContentError('Code blocks (```) aren’t used in content files.', n)

    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) {
      blocks.push({ kind: 'heading', depth: h[1].length, text: h[2].trim(), line: n })
      i++
      continue
    }

    if (t.startsWith('|')) {
      const head = splitRow(t, n)
      const sep = at(i + 1).trim()
      if (!/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(sep))
        throw new ContentError('A table needs a separator line like |---|---| under its header row.', n + 1)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && at(i).trim().startsWith('|')) {
        const cells = splitRow(at(i), i + 1)
        if (cells.length !== head.length)
          throw new ContentError(`This row has ${cells.length} cells but the header has ${head.length}. Keep one | between every cell, even empty ones.`, i + 1)
        rows.push(cells)
        i++
      }
      blocks.push({ kind: 'table', head, rows, line: n })
      continue
    }

    if (t.startsWith('>')) {
      const parts: string[] = []
      while (i < lines.length && at(i).trim().startsWith('>')) {
        parts.push(at(i).trim().replace(/^>\s?/, ''))
        i++
      }
      let alert: string | undefined
      const first = /^\[!(\w+)\]\s*(.*)$/.exec(parts[0] ?? '')
      if (first) {
        alert = first[1].toUpperCase()
        parts[0] = first[2]
      }
      blocks.push({ kind: 'quote', alert, text: parts.map((p) => p.trim()).filter(Boolean).join(' '), line: n })
      continue
    }

    const li = LIST.exec(t)
    if (li) {
      const items: ListItem[] = []
      while (i < lines.length) {
        const cur = at(i)
        const m = LIST.exec(cur.trim())
        if (m && !/^\s{2,}/.test(cur)) {
          const c = CHECK.exec(m[1])
          items.push(c ? { text: c[2].trim(), line: i + 1, checked: c[1] !== ' ' } : { text: m[1].trim(), line: i + 1 })
          i++
        } else if (!blank(i) && /^\s{2,}\S/.test(cur) && items.length) {
          // A continuation line, indented under the item above.
          items[items.length - 1].text += ' ' + cur.trim()
          i++
        } else break
      }
      blocks.push({ kind: 'list', items, line: n })
      continue
    }

    const parts = [t]
    i++
    while (i < lines.length && !blank(i) && !startsBlock(at(i).trim())) {
      parts.push(at(i).trim())
      i++
    }
    blocks.push({ kind: 'paragraph', text: parts.join(' '), line: n })
  }
  return { meta, blocks }
}
