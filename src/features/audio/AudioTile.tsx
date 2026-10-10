import { Badge, Text } from '@mantine/core'
import { AudioLines, Check } from 'lucide-react'
import { AUDIO_LESSONS } from '../../data/audio'
import type { AudioLessonDef } from '../../data/types'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import type { AudioProgress } from '../../lib/store'
import { frTypo } from '../../lib/words'
import { buildScript, minutesOf, scriptSeconds } from './script'

/** Each lesson's length in minutes (worked out once from its generated script). */
export const AUDIO_MINUTES: Record<string, number> = Object.fromEntries(
  AUDIO_LESSONS.map((l, i) => [l.id, minutesOf(scriptSeconds(buildScript(l, i + 1, AUDIO_LESSONS.slice(0, i)).steps))]),
)

export const audioNumber = (id: string) => AUDIO_LESSONS.findIndex((l) => l.id === id) + 1

export function AudioTile({ l, p, next }: { l: AudioLessonDef; p?: AudioProgress; next?: boolean }) {
  const started = p && !p.done && p.pos > 0
  return (
    <Tile
      kind="audio"
      to={`/audio/${l.id}`}
      done={!!p?.done}
      highlight={next}
      top={
        <>
          <LevelBadge level={l.level} />
          <Text size="sm" c="dimmed">
            Lesson {audioNumber(l.id)}
          </Text>
        </>
      }
      corner={
        p?.done ? (
          <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
            done
          </Badge>
        ) : (
          next && (
            <Badge size="sm" variant="filled">
              next
            </Badge>
          )
        )
      }
      title={frTypo(l.title)}
      fr
      sub={l.titleEn}
      foot={
        <>
          <AudioLines size={13} aria-hidden /> {AUDIO_MINUTES[l.id]} min · {l.phrases.length} phrases
        </>
      }
      progress={started ? p.pos / p.total : undefined}
    />
  )
}
