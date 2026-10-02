import { Badge } from '@mantine/core'
import { BookOpen, Check, Clock } from 'lucide-react'
import type { Lesson } from '../../data/types'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import type { LessonProgress } from '../../lib/store'
import { lessonStatus } from './status'

/** A grammar lesson in a shelf; a due review opens straight into practice. */
export function LessonTile({ l, p, n }: { l: Lesson; p?: LessonProgress; n: number }) {
  const st = lessonStatus(p)
  return (
    <Tile
      to={st === 'due' ? `/grammar/${l.id}/practice` : `/grammar/${l.id}`}
      done={st === 'mastered'}
      top={<LevelBadge level={l.level} />}
      corner={
        st === 'due' ? (
          <Badge leftSection={<Clock size={11} aria-hidden />}>review</Badge>
        ) : st === 'mastered' ? (
          <Badge color="green" leftSection={<Check size={12} aria-hidden />}>
            {Math.round((p?.best ?? 0) * 100)}%
          </Badge>
        ) : (
          p && (
            <Badge color="orange" className="tnum">
              {Math.round(p.best * 100)}%
            </Badge>
          )
        )
      }
      title={l.title}
      sub={
        <span className="fr" lang="fr">
          {l.titleFr}
        </span>
      }
      foot={
        <>
          <BookOpen size={13} aria-hidden /> Lesson {n} · {l.minutes} min · {l.exercises.length} exercises
        </>
      }
    />
  )
}
