import { describe, expect, it } from 'vitest'
import { bookProgress, chapterKey, hoursLabel, parseChapterKey } from './books'

const book = { id: 'b', chapters: [{ title: '1', words: 1 }, { title: '2', words: 1 }, { title: '3', words: 1 }, { title: '4', words: 1 }] }
const read = (...ns: number[]) => Object.fromEntries(ns.map((n, i) => [chapterKey('b', n), `2026-10-0${i + 1}`]))

describe('book progress', () => {
  it('starts at chapter 1 and goes on after the furthest chapter read', () => {
    expect(bookProgress(book, {})).toMatchObject({ done: 0, next: 1, finished: false })
    expect(bookProgress(book, read(1, 2))).toMatchObject({ done: 2, next: 3, lastDay: '2026-10-02' })
    // Skipped ahead: carry on from there, then come back for the gap.
    expect(bookProgress(book, read(1, 3)).next).toBe(4)
    expect(bookProgress(book, read(1, 3, 4)).next).toBe(2)
  })

  it('returns to the chapter you left half-read', () => {
    expect(bookProgress(book, read(1), 3).next).toBe(3)
    // …but not once it's finished.
    expect(bookProgress(book, read(1, 3), 3).next).toBe(4)
  })

  it('knows when the book is finished', () => {
    expect(bookProgress(book, read(1, 2, 3, 4))).toMatchObject({ done: 4, finished: true, next: 1 })
  })

  it('keys chapters so they can be told apart from texts', () => {
    expect(parseChapterKey(chapterKey('candide', 12))).toEqual({ bookId: 'candide', n: 12 })
    expect(parseChapterKey('a1-ma-famille')).toBeNull()
  })

  it('writes reading time in hours and minutes', () => {
    expect(hoursLabel(45)).toBe('45 min')
    expect(hoursLabel(60)).toBe('1 h')
    expect(hoursLabel(134)).toBe('2 h 15 min')
  })
})
