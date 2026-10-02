import { useMemo } from 'react'
import { Link } from 'react-router'
import { Badge, Button, Container, Group, Text } from '@mantine/core'
import { AudioLines, Check, Headphones, Mic, Play, Repeat } from 'lucide-react'
import { AUDIO_LESSONS } from '../../data/audio'
import type { AudioLessonDef } from '../../data/types'
import { Callout, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { Tile } from '../../components/Tile'
import { useStore, type AudioProgress } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { speechSupported } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { buildScript, minutesOf, scriptSeconds } from './script'

export default function AudioHome() {
  useDocumentTitle('Audio lessons')
  const audio = useStore((s) => s.audio) ?? {}
  const minutes = useMemo(
    () => Object.fromEntries(AUDIO_LESSONS.map((l, i) => [l.id, minutesOf(scriptSeconds(buildScript(l, i + 1, AUDIO_LESSONS.slice(0, i)).steps))])),
    [],
  )
  const numbered = AUDIO_LESSONS.map((l, i) => ({ l, n: i + 1 }))
  const todo = numbered.filter(({ l }) => !audio[l.id]?.done)
  const done = numbered.filter(({ l }) => audio[l.id]?.done).sort((a, b) => audio[b.l.id].done!.localeCompare(audio[a.l.id].done!))
  const next = todo[0]

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Cours audio"
        title="Audio lessons"
        subtitle="Hands-free, like Pimsleur: listen, answer out loud, and every phrase comes back until it sticks."
        actions={
          next && (
            <Button component={Link} to={`/audio/${next.l.id}`} leftSection={<Play size={16} aria-hidden />}>
              {audio[next.l.id]?.pos ? 'Continue' : 'Start'} lesson {next.n}
            </Button>
          )
        }
      >
        <Group gap="lg" mt="sm" c="dimmed" fz="sm">
          <Group gap={6}>
            <Headphones size={16} aria-hidden /> Listen to a short conversation
          </Group>
          <Group gap={6}>
            <Mic size={16} aria-hidden /> Answer out loud in the pause
          </Group>
          <Group gap={6}>
            <Repeat size={16} aria-hidden /> Phrases return at growing intervals
          </Group>
        </Group>
      </PageHeader>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons don’t work here. Try Chrome, Edge or Safari.</Callout>}

      {todo.length > 0 && (
        <Shelf title="Up next" count={todo.length} hint="One lesson a day, in order — each builds on the ones before.">
          {todo.map(({ l, n }) => (
            <AudioTile key={l.id} l={l} n={n} min={minutes[l.id]} p={audio[l.id]} next={l === next?.l} />
          ))}
        </Shelf>
      )}

      {done.length > 0 && (
        <Shelf title="Completed" count={done.length} hint="Repeat a lesson any time you felt unsure.">
          {done.map(({ l, n }) => (
            <AudioTile key={l.id} l={l} n={n} min={minutes[l.id]} p={audio[l.id]} />
          ))}
        </Shelf>
      )}
    </Container>
  )
}

function AudioTile({ l, n, min, p, next }: { l: AudioLessonDef; n: number; min: number; p?: AudioProgress; next?: boolean }) {
  const started = p && !p.done && p.pos > 0
  return (
    <Tile
      to={`/audio/${l.id}`}
      done={!!p?.done}
      highlight={next}
      top={
        <>
          <LevelBadge level={l.level} />
          <Text size="sm" c="dimmed">
            Lesson {n}
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
          <AudioLines size={13} aria-hidden /> {min} min · {l.phrases.length} phrases
        </>
      }
      progress={started ? p.pos / p.total : undefined}
    />
  )
}
