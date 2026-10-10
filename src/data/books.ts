import { useEffect, useState } from 'react'
import type { BookDef, BookMeta } from './types'
import { inOrder } from '../content/load'

export type { BookDef, BookMeta } from './types'

/**
 * Books from content/books/<level>/*.md. Lists only need titles and chapter
 * lengths (`?meta`); the text of a book is a separate chunk, loaded when it's opened.
 */
const metaModules = import.meta.glob<BookMeta>(['/content/books/**/*.md', '!**/_*.md'], { eager: true, import: 'default', query: '?meta' })
const textModules = import.meta.glob<BookDef>(['/content/books/**/*.md', '!**/_*.md'], { import: 'default' })

export const BOOKS: BookMeta[] = inOrder(metaModules)
export const BOOK_BY_ID: Record<string, BookMeta> = Object.fromEntries(BOOKS.map((b) => [b.id, b]))
const PATH_BY_ID: Record<string, string> = Object.fromEntries(Object.entries(metaModules).map(([path, b]) => [b.id, path]))

const loaded = new Map<string, BookDef>()
const pending = new Map<string, Promise<BookDef>>()

/** The full text of a book (cached after the first load). */
export function loadBook(id: string): Promise<BookDef> {
  const hit = loaded.get(id)
  if (hit) return Promise.resolve(hit)
  const path = PATH_BY_ID[id]
  const load = path && textModules[path]
  if (!load) return Promise.reject(new Error(`No book "${id}".`))
  let p = pending.get(id)
  if (!p) {
    p = load().then((b) => {
      loaded.set(id, b)
      pending.delete(id)
      return b
    })
    p.catch(() => pending.delete(id))
    pending.set(id, p)
  }
  return p
}

/** The book's full text once loaded; `error` if it couldn't be (e.g. offline before it was cached). */
export function useBookText(id: string): { book?: BookDef; error?: string } {
  const [state, setState] = useState<{ id: string; book?: BookDef; error?: string }>({ id })
  const cached = loaded.get(id)
  useEffect(() => {
    if (loaded.has(id)) return
    let live = true
    loadBook(id).then(
      (book) => live && setState({ id, book }),
      (e: unknown) => live && setState({ id, error: e instanceof Error ? e.message : 'The book couldn’t be loaded.' }),
    )
    return () => {
      live = false
    }
  }, [id])
  if (cached) return { book: cached }
  return state.id === id ? state : {}
}

// ── Progress: each finished chapter is a "read" entry, so it syncs and counts as reading.

/** The `read` key for a chapter (1-based). */
export const chapterKey = (bookId: string, n: number) => `book:${bookId}:${n}`

/** Splits a `read` key back into book and chapter, or null for other texts. */
export function parseChapterKey(key: string): { bookId: string; n: number } | null {
  const m = /^book:([a-z0-9-]+):(\d+)$/.exec(key)
  return m ? { bookId: m[1], n: Number(m[2]) } : null
}

export interface BookProgress {
  /** Chapters finished. */
  done: number
  total: number
  /** 1-based chapter to read next: the first unfinished one after the furthest you've been. */
  next: number
  finished: boolean
  /** Latest day a chapter was finished (dayKey), if any. */
  lastDay?: string
}

/**
 * Where you are in a book. `at` is the chapter you last opened (it may be
 * unfinished), so "Continue" goes back there rather than to the first gap.
 */
export function bookProgress(book: Pick<BookMeta, 'id' | 'chapters'>, read: Record<string, string>, at?: number): BookProgress {
  const total = book.chapters.length
  let done = 0
  let lastDay: string | undefined
  let furthest = 0
  for (let n = 1; n <= total; n++) {
    const day = read[chapterKey(book.id, n)]
    if (!day) continue
    done++
    furthest = n
    if (!lastDay || day > lastDay) lastDay = day
  }
  const finished = done === total
  let next: number
  if (at && at >= 1 && at <= total && !read[chapterKey(book.id, at)]) next = at
  else {
    // The first unread chapter after the furthest one read (or after the one you were on), wrapping round to any gap.
    const from = Math.max(furthest, at && at <= total ? at : 0)
    next = 0
    for (let n = from + 1; n <= total && !next; n++) if (!read[chapterKey(book.id, n)]) next = n
    for (let n = 1; n <= total && !next; n++) if (!read[chapterKey(book.id, n)]) next = n
    if (!next) next = 1
  }
  return { done, total, next, finished, lastDay }
}

/** Reading time at about 150 words a minute for originals, 120 for graded French. */
export const bookMinutes = (words: number, kind: BookMeta['kind']) => Math.max(1, Math.round(words / (kind === 'original' ? 150 : 120)))

/** "2 h 10 min", "45 min". */
export function hoursLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = Math.round((min % 60) / 5) * 5
  return m ? `${h} h ${m} min` : `${h} h`
}
