import { Badge, Text } from '@mantine/core'
import { Check, Headphones } from 'lucide-react'
import type { StoryDef } from '../../data/types'
import { storyMinutes } from '../../data/stories'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import type { SentenceStat } from '../../lib/store'
import { frTypo } from '../../lib/words'

/** A 0–100% score: green when perfect, orange from 60, red below. */
export function PercentBadge({ score }: { score: number }) {
  return (
    <Badge color={score === 100 ? 'green' : score >= 60 ? 'orange' : 'red'} className="tnum" leftSection={score === 100 ? <Check size={12} aria-hidden /> : undefined}>
      {score}%
    </Badge>
  )
}

export function StoryTile({ s, result }: { s: StoryDef; result?: SentenceStat }) {
  return (
    <Tile
      to={`/listening/story/${s.id}`}
      done={!!result}
      top={
        <>
          <LevelBadge level={s.level} />
          <Text size="sm" c="dimmed">
            {s.topic}
          </Text>
        </>
      }
      corner={result && <PercentBadge score={result.best} />}
      title={frTypo(s.title)}
      fr
      sub={s.titleEn}
      foot={
        <>
          <Headphones size={13} aria-hidden /> {storyMinutes(s)} min · {s.questions.length} questions
        </>
      }
    />
  )
}
