import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ActionIcon, Anchor, Container, Group, Loader, NativeSelect, Text } from '@mantine/core'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { BOOK_BY_ID, chapterKey, useBookText, type BookDef } from '../../data/books'
import { Empty } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'
import { Reader, type ReaderDoc } from '../reading/Reader'
import { KindBadge } from './shared'
import { cachedTranslation, saveTranslation } from './translation'

/** One chapter of a book in the reader, with the vocabulary sidebar like any text. */
export default function ChapterPage() {
  const { id = '', n: nParam = '' } = useParams()
  const meta = BOOK_BY_ID[id]
  const n = Number(nParam)
  const { book, error } = useBookText(id)
  useDocumentTitle(meta ? `${meta.title} · ${n}` : 'Book')

  if (!meta)
    return (
      <Container size="var(--page-w-narrow)" py="xl">
        <Empty icon={<BookOpen size={30} />} title="This book isn’t here">
          <Anchor component={Link} to="/library/books">See all books</Anchor>
        </Empty>
      </Container>
    )
  if (!Number.isInteger(n) || n < 1 || n > meta.chapters.length) return <Navigate to={`/books/${id}`} replace />
  if (error)
    return (
      <Container size="var(--page-w-narrow)" py="xl">
        <Anchor component={Link} to={`/books/${id}`} size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> {meta.title}
        </Anchor>
        <Empty icon={<BookOpen size={30} />} title="The book couldn’t be opened">
          Check your connection and try again. Books you’ve opened before also work offline.
        </Empty>
      </Container>
    )
  if (!book)
    return (
      <Container size="var(--page-w-narrow)" py="xl" aria-busy="true">
        <Group justify="center" py="xl">
          <Loader size="sm" />
          <Text c="dimmed">Opening {meta.title}…</Text>
        </Group>
      </Container>
    )
  return <Chapter key={`${id}:${n}`} book={book} n={n} />
}

function Chapter({ book, n }: { book: BookDef; n: number }) {
  const navigate = useNavigate()
  const openBookChapter = useStore((s) => s.openBookChapter)
  const ch = book.chapters[n - 1]
  const total = book.chapters.length
  const key = chapterKey(book.id, n)

  const doc: ReaderDoc = useMemo(() => {
    const subs = new Set<number>()
    ch.paragraphs.forEach((p, i) => p.sub && subs.add(i))
    return {
      id: key,
      title: ch.title,
      level: book.level,
      paragraphs: ch.paragraphs.map((p) => p.fr),
      translation: book.translated ? ch.paragraphs.map((p) => p.en ?? '') : cachedTranslation(key),
      subs,
    }
  }, [book, ch, key])

  const to = (k: number) => `/books/${book.id}/${k}`
  const last = n === total

  const nav = (
    <Group gap={6} mb="md" wrap="nowrap" role="navigation" aria-label="Chapters">
      <ActionIcon variant="default" size="lg" component={Link} to={to(n - 1)} disabled={n === 1} aria-label="Previous chapter" onClick={(e) => n === 1 && e.preventDefault()}>
        <ChevronLeft size={18} aria-hidden />
      </ActionIcon>
      <NativeSelect
        aria-label="Go to chapter"
        value={String(n)}
        onChange={(e) => navigate(to(Number(e.currentTarget.value)))}
        data={book.chapters.map((c, i) => ({ value: String(i + 1), label: `${i + 1}. ${frTypo(c.title)}` }))}
        style={{ flex: 1, minWidth: 0 }}
      />
      <ActionIcon variant="default" size="lg" component={Link} to={to(n + 1)} disabled={last} aria-label="Next chapter" onClick={(e) => last && e.preventDefault()}>
        <ChevronRight size={18} aria-hidden />
      </ActionIcon>
    </Group>
  )

  return (
    <Reader
      doc={doc}
      back={{ to: `/books/${book.id}`, label: book.title }}
      eyebrow={
        <>
          {book.title} · chapter {n} of {total}
        </>
      }
      meta={<KindBadge kind={book.kind} />}
      nav={nav}
      onOpen={() => openBookChapter(book.id, n)}
      saveTranslation={book.translated ? undefined : (t) => saveTranslation(key, t)}
      next={last ? { to: `/books/${book.id}`, label: 'Back to the book' } : { to: to(n + 1), label: 'Next chapter' }}
      doneToast={last ? 'Livre terminé — félicitations !' : 'Chapitre terminé — bravo !'}
    />
  )
}
