import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionIcon, Badge, Button, Chip, Group, SegmentedControl, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core'
import { BookOpenText, Check, Trash2, WandSparkles } from 'lucide-react'
import type { ReaderTextDef } from '../../data/texts'
import { LEVELS, type Level } from '../../data/types'
import { findWord } from '../../data/vocab'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { Callout, LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import type { ReaderText } from './types'
import { newId, useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { countWords } from '../../lib/ai/writing'
import { ago } from '../../lib/date'
import { parseCardId, State } from '../../lib/srs'
import { displayFr, frTypo } from '../../lib/words'
import { generateText } from './ai'

const TOPICS = ['a day in Paris', 'cooking at home', 'a job interview', 'a mystery in a small village', 'holidays by the sea', 'a new neighbour', 'city vs countryside', 'a family tradition']
const LENGTHS: { label: string; words: number }[] = [
  { label: 'Short', words: 130 },
  { label: 'Medium', words: 250 },
  { label: 'Long', words: 400 },
]

/** Confirm before deleting a saved text. */
export function DeleteTextDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const deleteText = useStore((s) => s.deleteText)
  return (
    <Dialog
      open={!!id}
      onClose={onClose}
      title="Delete this text?"
      actions={
        <>
          <Button variant="default" onClick={onClose} data-autofocus>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (id) deleteText(id)
              onClose()
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <Text c="dimmed">Words you added from it stay in your flashcards.</Text>
    </Dialog>
  )
}

const doneBadge = (
  <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
    read
  </Badge>
)

export function GradedTile({ t, done }: { t: ReaderTextDef; done?: boolean }) {
  const words = countWords(t.paragraphs.map((p) => p.fr).join(' '))
  return (
    <Tile
      kind="text"
      to={`/reading/${t.id}`}
      done={done}
      top={
        <>
          <LevelBadge level={t.level} />
          <Text size="sm" c="dimmed">
            {t.topic}
          </Text>
        </>
      }
      corner={done && doneBadge}
      title={frTypo(t.title)}
      fr
      sub={t.titleEn}
      foot={
        <>
          <BookOpenText size={13} aria-hidden /> {words} words · {Math.max(1, Math.round(words / 120))} min
        </>
      }
    />
  )
}

export function UserTextTile({ t, done, onDelete }: { t: ReaderText; done?: boolean; onDelete: () => void }) {
  return (
    <Tile
      kind="mytext"
      to={`/reading/${t.id}`}
      done={done}
      top={
        <>
          {t.level && <LevelBadge level={t.level} />}
          <Text size="sm" c="dimmed">
            {t.source === 'ai' ? 'Generated' : 'Pasted'}
          </Text>
        </>
      }
      corner={
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onDelete} aria-label={`Delete ${t.title}`}>
          <Trash2 size={14} aria-hidden />
        </ActionIcon>
      }
      title={frTypo(t.title)}
      fr
      sub={t.topic ?? `${countWords(t.content)} words`}
      foot={
        <>
          {done ? <Check size={13} aria-hidden /> : <BookOpenText size={13} aria-hidden />} {countWords(t.content)} words · {ago(t.openedAt ?? t.createdAt)}
        </>
      }
    />
  )
}

export function PasteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const saveText = useStore((s) => s.saveText)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const words = countWords(content)
  const save = () => {
    const id = newId('t')
    const firstLine = content.trim().split('\n')[0].slice(0, 60)
    saveText({
      id,
      title: title.trim() || firstLine || 'Mon texte',
      content: content.trim(),
      level: level || undefined,
      source: 'paste',
      createdAt: new Date().toISOString(),
    })
    setTitle('')
    setContent('')
    onClose()
    navigate(`/reading/${id}`)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Paste a French text"
      wide
      actions={
        <>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={words < 3}>
            Read it
          </Button>
        </>
      }
    >
      <Stack gap="md">
        <TextInput label="Title" description="Optional" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea
          label="Text"
          classNames={{ input: 'fr' }}
          lang="fr"
          autosize
          minRows={8}
          maxRows={16}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          placeholder="Collez votre texte ici…"
          description={`${words} words. Separate paragraphs with a blank line. The text stays in this browser.`}
          inputWrapperOrder={['label', 'input', 'description']}
          data-autofocus
        />
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Level:
          </Text>
          <Chip.Group value={level} onChange={(v) => setLevel(v as Level | '')}>
            <Group gap={6}>
              {(['', ...LEVELS] as const).map((l) => (
                <Chip key={l || 'none'} value={l} size="xs">
                  {l || 'Not sure'}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>
      </Stack>
    </Dialog>
  )
}

export function GenerateDialog({ open, onClose, defaultLevel }: { open: boolean; onClose: () => void; defaultLevel: Level }) {
  const navigate = useNavigate()
  const ai = useAiConfig()
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const saveText = useStore((s) => s.saveText)
  const [level, setLevel] = useState<Level>(defaultLevel)
  const [topic, setTopic] = useState('')
  const [length, setLength] = useState(1)
  const [useMine, setUseMine] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)

  // Words still being learned: in the learning steps or not yet stable.
  const learning = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    const entries = Object.entries(cards).sort((a, b) => a[1].stability - b[1].stability)
    for (const [id, c] of entries) {
      if (c.state === State.New) continue
      const { wordId } = parseCardId(id)
      if (seen.has(wordId)) continue
      seen.add(wordId)
      const w = findWord(wordId, customWords)
      if (w && (c.state === State.Learning || c.state === State.Relearning || c.scheduled_days < 21)) out.push(displayFr(w))
      if (out.length >= 10) break
    }
    return out
  }, [cards, customWords])

  const generate = async () => {
    setError('')
    setLoading(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const t = await generateText(
        { level, topic, words: LENGTHS[length].words, useWords: useMine ? learning : [], config: ai },
        ctrl.signal,
      )
      const id = newId('t')
      saveText({
        id,
        title: t.title,
        content: t.paragraphs.join('\n\n'),
        level,
        topic: topic.trim() || undefined,
        source: 'ai',
        createdAt: new Date().toISOString(),
      })
      onClose()
      navigate(`/reading/${id}`)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        abort.current?.abort()
        onClose()
      }}
      title="Write me a story"
      wide
      actions={
        ai ? (
          <>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generate} loading={loading} leftSection={<WandSparkles size={16} aria-hidden />}>
              Write it
            </Button>
          </>
        ) : undefined
      }
    >
      {!ai ? (
        <ConnectAiCard title="Connect an AI to write texts" />
      ) : (
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Level
            </Text>
            <SegmentedControl value={level} onChange={(v) => setLevel(v as Level)} data={LEVELS} aria-label="Level" />
          </Stack>
          <div>
            <TextInput label="Topic" value={topic} onChange={(e) => setTopic(e.currentTarget.value)} placeholder="Anything — e.g. a cat who runs a bakery" />
            <Group gap={6} mt="xs">
              {TOPICS.map((t) => (
                <Chip key={t} size="xs" checked={topic === t} onChange={() => setTopic(t)}>
                  {t}
                </Chip>
              ))}
            </Group>
          </div>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Length
            </Text>
            <SegmentedControl
              value={String(length)}
              onChange={(v) => setLength(Number(v))}
              data={LENGTHS.map((l, i) => ({ value: String(i), label: `${l.label} · ~${l.words}` }))}
              aria-label="Length"
            />
          </Stack>
          <Switch
            checked={useMine && learning.length > 0}
            onChange={(e) => setUseMine(e.currentTarget.checked)}
            label="Use words I’m learning"
            description={learning.length ? learning.slice(0, 6).join(', ') + (learning.length > 6 ? '…' : '') : 'Start some flashcards first.'}
            labelPosition="left"
          />
          {error && <Callout kind="warn">{error}</Callout>}
        </Stack>
      )}
    </Dialog>
  )
}
