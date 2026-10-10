import { describe, expect, it } from 'vitest'
import { ContentError, describePath, parseContent } from './parse'
import { parseMarkdown } from './markdown'

const LESSON = `---
id: test-lesson
title: A test
titleFr: Un test
summary: Just checking.
minutes: 5
---

<!-- Notes for editors are ignored. -->

## First section

Some **bold** text that
wraps onto a second line.

| | être |
| --- | --- |
| je | suis |

Table: A caption.

- Je suis ici. | I am here.
- Tu es là ? | Are you there?

- A plain point
- Another one

> [!TIP]
> A tip.

> [!WARNING]
> Careful.

## Exercises

### cloze
- sentence: Nous ___ ici.
- hint: être
- answer: sommes
- answer: étions
- explain: nous → sommes.

### mcq
- prompt: Pick one: which?
- [ ] a
- [x] b
- explain: Because.

### order
- en: We are here.
- words: Nous sommes ici
- extra: avons
- punct: .

### translate
- en: I am here.
- answer: Je suis ici

### transform
- instruction: Make it negative.
- source: Je suis ici.
- answer: Je ne suis pas ici.
`

const lesson = (src: string) => parseContent(src, '/x/content/grammar/a1/01-test.md')

/** The error a file raises, as "line: message". */
function error(src: string, path = '/x/content/grammar/a1/01-test.md'): string {
  try {
    parseContent(src, path)
  } catch (e) {
    if (e instanceof ContentError) return `${e.line}: ${e.message}`
    throw e
  }
  return 'no error'
}

describe('lesson files', () => {
  it('parse every block and exercise type', () => {
    const l = lesson(LESSON)
    expect(l).toMatchObject({ id: 'test-lesson', level: 'A1', minutes: 5 })
    const blocks = (l as { sections: { blocks: unknown[] }[] }).sections[0].blocks
    expect(blocks).toEqual([
      { type: 'p', text: 'Some **bold** text that wraps onto a second line.' },
      { type: 'table', head: ['', 'être'], rows: [['je', 'suis']], caption: 'A caption.' },
      { type: 'examples', items: [{ fr: 'Je suis ici.', en: 'I am here.' }, { fr: 'Tu es là ?', en: 'Are you there?' }] },
      { type: 'list', items: ['A plain point', 'Another one'] },
      { type: 'tip', text: 'A tip.' },
      { type: 'warn', text: 'Careful.' },
    ])
    expect((l as { exercises: unknown[] }).exercises).toEqual([
      { type: 'cloze', sentence: 'Nous ___ ici.', hint: 'être', answers: ['sommes', 'étions'], explain: 'nous → sommes.' },
      { type: 'mcq', prompt: 'Pick one: which?', options: ['a', 'b'], answer: 1, explain: 'Because.' },
      { type: 'order', en: 'We are here.', words: ['Nous', 'sommes', 'ici'], extra: ['avons'], punct: '.' },
      { type: 'translate', en: 'I am here.', answers: ['Je suis ici'] },
      { type: 'transform', instruction: 'Make it negative.', source: 'Je suis ici.', answers: ['Je ne suis pas ici.'] },
    ])
  })

  it('point at the line of common mistakes', () => {
    const line = (needle: string) => LESSON.split('\n').findIndex((l) => l.includes(needle)) + 1
    expect(error(LESSON.replace('- sentence: Nous ___ ici.', '- sentence: Nous ici.'))).toBe(`${line('- sentence: Nous')}: The sentence needs exactly one ___ blank.`)
    expect(error(LESSON.replace('- [x] b', '- [ ] b'))).toMatch(/: Mark exactly one option as right with \[x\]\.$/)
    expect(error(LESSON.replace('| je | suis |', '| je | suis | extra |'))).toBe(`${line('| je | suis |')}: This row has 3 cells but the header has 2. Keep one | between every cell, even empty ones.`)
    expect(error(LESSON.replace('titleFr: Un test', 'titlefr: Un test'))).toBe('4: Unknown field "titlefr" — did you mean "titleFr"?')
    expect(error(LESSON.replace('minutes: 5', 'minutes: 5\nlevel: A1'))).toMatch(/^7: Leave out "level"/)
    expect(error(LESSON.replace('### order', '### ordering'))).toMatch(/Unknown exercise type "ordering"/)
    expect(error(LESSON.replace('> [!TIP]', '>'))).toMatch(/Start a quote with \[!TIP\] or \[!WARNING\]/)
    expect(error(LESSON.replace('- Tu es là ? | Are you there?', '- Tu es là ?'))).toMatch(/French \| English/)
    expect(error(LESSON.replace('- hint: être', '- clue: être'))).toMatch(/"clue" isn't used in cloze exercises/)
    expect(error(LESSON.replace('id: test-lesson', 'id: Test Lesson'))).toMatch(/isn't a valid id/)
    expect(error(LESSON.replace(/^---\n/, ''))).toMatch(/^1: The file must start with a --- front matter block/)
  })
})

describe('other content files', () => {
  it('parse decks, texts, role-plays, prompts and pronunciation sets', () => {
    const deck = parseContent(
      `---\nid: a1-test\ntitle: Test\ntitleFr: Essai\n---\n\n| French | English | Type | Example | Translation |\n|---|---|---|---|---|\n| maison | house | f | La maison est grande. | The house is big. |\n| grand | big | adj:grande | | |\n`,
      '/content/vocab/a1/01-test.md',
    )
    expect(deck).toMatchObject({ id: 'a1-test', level: 'A1', words: [{ id: 'maison-n', g: 'f', ex: 'La maison est grande.' }, { id: 'grand-adj', fem: 'grande' }] })

    const text = parseContent(`---\nid: b1-t\ntitle: T\ntitleEn: T\ntopic: Work\n---\n\nBonjour.\n\n> Hello.\n\nAu revoir.\n\n> Goodbye.\n`, '/content/reading/b1/01-t.md')
    expect(text).toMatchObject({ level: 'B1', paragraphs: [{ fr: 'Bonjour.', en: 'Hello.' }, { fr: 'Au revoir.', en: 'Goodbye.' }] })

    const scenario = parseContent(
      `---\nid: cafe\ntitle: Café\ntitleFr: Au café\nicon: coffee\naiName: Julien\nlessons: partitive, questions\n---\n\n## Setting\n\nYou're in a café.\n\n## AI role\n\nYou play a waiter.\n\n## Opening\n\nBonjour !\n\n> Hello!\n\n## Goals\n\n- order: Order a drink\n\n## Phrases\n\n- Un café. | A coffee.\n`,
      '/content/conversations/a1/01-cafe.md',
    )
    expect(scenario).toMatchObject({ opening: 'Bonjour !', openingEn: 'Hello!', goals: [{ id: 'order', text: 'Order a drink' }], lessons: ['partitive', 'questions'] })

    const prompt = parseContent(
      `---\nid: p\ntitle: T\ntitleFr: T\nfocus: past tenses\nlessons: passe-compose\nwords: 40-80\n---\n\nWrite about your weekend.\n\n## Phrases\n\n- Samedi, …\n`,
      '/content/writing/a2/01-p.md',
    )
    expect(prompt).toMatchObject({ task: 'Write about your weekend.', words: [40, 80], phrases: ['Samedi, …'] })

    const sounds = parseContent(`---\nid: r\ntitle: The r\nsound: r\n---\n\nGargle gently.\n\n## Sentences\n\n- Rue. | Street.\n`, '/content/pronunciation/01-r.md')
    expect(sounds).toMatchObject({ tip: 'Gargle gently.', sentences: [{ fr: 'Rue.', en: 'Street.' }] })
  })

  it('parse books: chapters, translations and sub-headings', () => {
    const head = (kind: string) => `---\nid: b\ntitle: Livre\ntitleEn: Book\nauthor: A. Auteur\nyear: 1880\nkind: ${kind}\nsummary: About.\n---\n\n`
    const book = parseContent(`${head('adapted')}## Un\n\nIl part.\n\n> He leaves.\n\n## Deux\n\n### I\n\nIl revient vite.\n\n> He comes back fast.\n`, '/content/books/a2/01-b.md')
    expect(book).toMatchObject({
      level: 'A2',
      kind: 'adapted',
      translated: true,
      words: 5,
      chapters: [
        { title: 'Un', words: 2, paragraphs: [{ fr: 'Il part.', en: 'He leaves.' }] },
        { title: 'Deux', words: 3, paragraphs: [{ fr: 'I', sub: true }, { fr: 'Il revient vite.', en: 'He comes back fast.' }] },
      ],
    })
    const original = parseContent(`${head('original')}## Un\n\nIl part.\n\nIl revient.\n`, '/content/books/b2/01-b.md')
    expect(original).toMatchObject({ kind: 'original', translated: false })

    expect(error(`${head('adapted')}## Un\n\nIl part.\n`, '/content/books/a1/b.md')).toMatch(/Adapted books need an English translation/)
    expect(error(`${head('original')}## Un\n\nIl part.\n\n> He leaves.\n\nIl revient.\n`, '/content/books/b1/b.md')).toMatch(/Translate every paragraph or none/)
    expect(error(`${head('original')}Il part.\n`, '/content/books/b1/b.md')).toMatch(/^11: Start the book with a "## Chapter title" heading/)
    expect(error(`${head('novel')}## Un\n\nIl part.\n`, '/content/books/b1/b.md')).toMatch(/"kind" is either adapted/)
    expect(error(`${head('original')}## Un\n\n## Deux\n\nIl part.\n`, '/content/books/b1/b.md')).toMatch(/This chapter has no text/)
  })

  it('explain mistakes in them too', () => {
    expect(error(`---\nid: a1-x\ntitle: X\ntitleFr: X\n---\n\n| French | English | Type |\n|---|---|---|\n| chat | cat | n |\n`, '/content/vocab/a1/x.md')).toMatch(/^9: "n" isn't a word type/)
    expect(error(`---\nid: t\ntitle: T\ntitleEn: T\ntopic: X\n---\n\nUn.\n\nDeux.\n\n> Two.\n`, '/content/reading/a1/t.md')).toMatch(/^10: Add the English translation of the paragraph above/)
  })

  it('know where files belong', () => {
    expect(describePath('/p/content/grammar/b2/03-x.md')).toEqual({ kind: 'grammar', level: 'B2', file: 'content/grammar/b2/03-x.md' })
    expect(describePath('/p/content/README.md')).toBeNull()
    expect(describePath('/p/src/notes.md')).toBeNull()
    expect(() => describePath('/p/content/grammar/03-x.md')).toThrow(/level folder/)
    expect(describePath('/p/content/vocab/top5000/01-x.md')).toEqual({ kind: 'vocab', group: 'frequency', file: 'content/vocab/top5000/01-x.md' })
    expect(() => describePath('/p/content/grammar/top5000/01-x.md')).toThrow(/level folder/)
    expect(() => describePath('/p/content/pronunciation/sub/x.md')).toThrow(/directly in content\/pronunciation/)
  })

  it('keep line numbers through comments', () => {
    const doc = parseMarkdown('---\nid: x\n---\n<!-- one\ntwo -->\n\n## Heading\n')
    expect(doc.blocks[0]).toEqual({ kind: 'heading', depth: 2, text: 'Heading', line: 7 })
  })
})
