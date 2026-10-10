import { Link, useParams } from 'react-router'
import { Anchor, Box, Button, Card, Container, Group, Progress, Text, UnstyledButton } from '@mantine/core'
import { ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react'
import { BOOK_BY_ID, bookMinutes, chapterKey, hoursLabel } from '../../data/books'
import { LEVEL_INFO } from '../../data/types'
import { Empty, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'
import { KindBadge, useBookPlace } from './shared'

const BACK = { to: '/library#books', label: 'Library' }

/** A book's cover page: what it is, how far you've got, and its chapters. */
export default function BookPage() {
  const { id = '' } = useParams()
  const book = BOOK_BY_ID[id]
  useDocumentTitle(book ? book.title : 'Book')
  if (!book)
    return (
      <Container size="var(--page-w-narrow)" py="xl">
        <Anchor component={Link} to={BACK.to} size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> {BACK.label}
        </Anchor>
        <Empty icon={<BookOpen size={30} />} title="This book isn’t here">
          <Anchor component={Link} to="/library/books">See all books</Anchor>
        </Empty>
      </Container>
    )
  return <Book id={id} />
}

function Book({ id }: { id: string }) {
  const book = BOOK_BY_ID[id]
  const read = useStore((s) => s.read)
  const p = useBookPlace(book)
  const minutes = bookMinutes(book.words, book.kind)
  const rate = book.kind === 'original' ? 150 : 120
  const to = (n: number) => `/books/${book.id}/${n}`

  const action = p.finished ? (
    <Button variant="default" component={Link} to={to(1)} leftSection={<RotateCcw size={16} aria-hidden />}>
      Read again
    </Button>
  ) : (
    <Button component={Link} to={to(p.next)} rightSection={<ArrowRight size={16} aria-hidden />}>
      {p.started ? `Continue · chapter ${p.next}` : 'Start reading'}
    </Button>
  )

  return (
    <Container size="var(--page-w-narrow)" py="xl">
      <PageHeader back={BACK} eyebrow={`${book.author} · ${book.year}`} title={frTypo(book.title)} subtitle={book.titleEn} fr actions={action}>
        <Group gap={8} mt="xs">
          <LevelBadge level={book.level} />
          <KindBadge kind={book.kind} />
          <Text size="sm" c="dimmed">
            {book.chapters.length} chapter{book.chapters.length > 1 ? 's' : ''} · {book.words.toLocaleString('en')} words · about {hoursLabel(minutes)}
          </Text>
        </Group>
      </PageHeader>

      <Text maw={640} mb="lg">
        {book.summary}
      </Text>

      {p.started && (
        <Box mb="lg" maw={640}>
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={600}>
              {p.finished ? 'Finished — félicitations !' : `${p.done} of ${p.total} chapters read`}
            </Text>
            <Text size="sm" c="dimmed" className="tnum">
              {Math.round((p.done / p.total) * 100)}%
            </Text>
          </Group>
          <Progress value={(p.done / p.total) * 100} size="sm" radius="xl" color={p.finished ? 'green' : undefined} aria-hidden />
        </Box>
      )}

      <Card padding={0} component="nav" aria-label="Chapters">
        <ol className="book-chapters">
          {book.chapters.map((c, i) => {
            const n = i + 1
            const done = !!read[chapterKey(book.id, n)]
            const here = !p.finished && p.started && n === p.next
            return (
              <li key={n}>
                <UnstyledButton component={Link} to={to(n)} className={`book-ch${here ? ' book-ch--here' : ''}`} aria-current={here ? 'step' : undefined}>
                  <span className="book-ch__n tnum" aria-hidden>
                    {done ? <Check size={15} /> : n}
                  </span>
                  <span className="book-ch__title fr" lang="fr">
                    {frTypo(c.title)}
                    {done && <span className="sr-only"> (read)</span>}
                  </span>
                  <Text span size="xs" c="dimmed" className="book-ch__meta tnum">
                    {here ? 'Continue here' : `${Math.max(1, Math.round(c.words / rate))} min`}
                  </Text>
                </UnstyledButton>
              </li>
            )
          })}
        </ol>
      </Card>

      <Text size="sm" c="dimmed" mt="lg" maw={640}>
        {book.kind === 'adapted' ? (
          <>
            Retold in {LEVEL_INFO[book.level].name.toLowerCase()} French ({book.level}) for this app, with an English translation of every paragraph. Based on {book.author}’s{' '}
            <i>{book.title}</i> ({book.year}).
          </>
        ) : (
          <>
            The original text ({book.year}), in the public domain.{' '}
            {book.source && (
              <Anchor href={book.source} target="_blank" rel="noreferrer" inherit>
                Project Gutenberg edition
              </Anchor>
            )}
            . Tap any word for its meaning; Translation uses your AI and is kept on this device.
          </>
        )}
      </Text>
    </Container>
  )
}
