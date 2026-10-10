import { Badge, Text } from '@mantine/core'
import { BookOpen, Check } from 'lucide-react'
import { bookMinutes, bookProgress, hoursLabel, type BookMeta } from '../../data/books'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import { useStore } from '../../lib/store'
import { frTypo } from '../../lib/words'

/** "Retold" for books rewritten in graded French, "Original" for the author's own text. */
export function KindBadge({ kind }: { kind: BookMeta['kind'] }) {
  return kind === 'adapted' ? (
    <Badge variant="light" color="gray" size="sm" title="Retold in graded French, with an English translation">
      Retold
    </Badge>
  ) : (
    <Badge variant="outline" color="gray" size="sm" title="The author’s own words, as first published">
      Original
    </Badge>
  )
}

/** Where to open a book: the chapter you're on, or its page if you haven't started. */
export function useBookPlace(book: BookMeta) {
  const read = useStore((s) => s.read)
  const at = useStore((s) => s.books?.[book.id]?.chapter)
  const p = bookProgress(book, read, at)
  const started = p.done > 0 || !!at
  return { ...p, started }
}

export function BookTile({ b }: { b: BookMeta }) {
  const p = useBookPlace(b)
  const min = bookMinutes(b.words, b.kind)
  return (
    <Tile
      to={`/books/${b.id}`}
      done={p.finished}
      top={
        <>
          <LevelBadge level={b.level} />
          <KindBadge kind={b.kind} />
        </>
      }
      corner={
        p.finished && (
          <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
            read
          </Badge>
        )
      }
      title={frTypo(b.title)}
      fr
      sub={
        <>
          {b.author}, {b.year}
        </>
      }
      foot={
        <>
          <BookOpen size={13} aria-hidden />
          <Text span inherit>
            {p.started && !p.finished ? `Chapter ${p.next} of ${p.total}` : `${p.total} chapter${p.total > 1 ? 's' : ''} · ${hoursLabel(min)}`}
          </Text>
        </>
      }
      progress={p.started && !p.finished ? p.done / p.total : undefined}
    />
  )
}
