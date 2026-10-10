/**
 * Vite plugin: content/**\/*.md files are parsed at build time and imported as
 * plain data (see parse.ts). Errors point at the file and line, in the dev
 * server overlay and in `npm run build`.
 */
import type { Plugin } from 'vite'
import { bookMeta, ContentError, describePath, parseContent, parseDeckRows } from './parse.ts'
import type { BookDef } from '../data/types.ts'
import { parseMarkdown } from './markdown.ts'

/** Expands compact deck rows into words (resolved from the project root). */
const BUILD = '/src/data/vocab/build.ts'

export function contentPlugin(): Plugin {
  return {
    name: 'petit-a-petit-content',
    enforce: 'pre',
    transform(source, id) {
      let where
      try {
        where = describePath(id)
      } catch (e) {
        if (e instanceof ContentError) this.error({ message: `${id}: ${e.message}`, id })
        throw e
      }
      if (!where) return null
      try {
        if (where.kind === 'vocab') {
          // Decks ship as compact rows and are expanded in the browser, as before.
          const d = parseDeckRows(parseMarkdown(source), where.level, where.group)
          const args = JSON.stringify([d.id, d.level, d.title, d.titleFr, d.rows, d.group])
          return { code: `import { deck } from ${JSON.stringify(BUILD)}\nexport default deck(...JSON.parse(${JSON.stringify(args)}))`, map: null }
        }
        const parsed = parseContent(source, id)
        // Books: `?meta` imports leave out the chapter text, which is loaded only when you open the book.
        const data = where.kind === 'books' && /[?&]meta\b/.test(id) ? bookMeta(parsed as BookDef) : parsed
        return { code: `export default JSON.parse(${JSON.stringify(JSON.stringify(data))})`, map: null }
      } catch (e) {
        if (e instanceof ContentError)
          this.error({ message: `${where.file}:${e.line}: ${e.message}`, id, loc: { file: id, line: e.line, column: 0 } })
        throw e
      }
    },
  }
}
