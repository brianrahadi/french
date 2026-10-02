import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Container, Group, Loader, SegmentedControl, Text, VisuallyHidden } from '@mantine/core'
import { ArrowLeft, BookOpenText, Check, Languages, Pause, Play, Square } from 'lucide-react'
import { TEXT_BY_ID } from '../../data/texts'
import type { Level } from '../../data/types'
import { Callout, Empty, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { countWords } from '../../lib/ai/writing'
import { useDocumentTitle } from '../../lib/hooks'
import { paragraphs as splitParagraphs, splitSentences } from '../../lib/french'
import { speak, speechSupported, stopSpeaking } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { LookupText } from './LookupText'
import { translateParagraphs } from './ai'
import { WordCheck } from './WordCheck'
import { useWordsToCheck } from './useWordsToCheck'

interface Doc {
  id: string
  title: string
  subtitle?: string
  level?: Level
  paragraphs: string[]
  translation?: string[]
  builtin: boolean
}

const SIZES = [
  { id: 's', label: 'A', size: 18 },
  { id: 'm', label: 'A', size: 21 },
  { id: 'l', label: 'A', size: 25 },
]

function readPref(): number {
  try {
    return Number(localStorage.getItem('petit-a-petit-reader-size') ?? 1) || 1
  } catch {
    return 1
  }
}

export default function ReaderPage() {
  const { id = '' } = useParams()
  const userText = useStore((s) => s.texts.find((t) => t.id === id))
  const builtin = TEXT_BY_ID[id]
  const doc: Doc | null = useMemo(() => {
    if (builtin)
      return {
        id,
        title: builtin.title,
        subtitle: builtin.titleEn,
        level: builtin.level,
        paragraphs: builtin.paragraphs.map((p) => p.fr),
        translation: builtin.paragraphs.map((p) => p.en),
        builtin: true,
      }
    if (userText)
      return {
        id,
        title: userText.title,
        level: userText.level,
        paragraphs: splitParagraphs(userText.content),
        translation: userText.translation,
        builtin: false,
      }
    return null
  }, [builtin, userText, id])
  useDocumentTitle(doc ? doc.title : 'Reading')

  if (!doc)
    return (
      <Container size={760} py="xl">
        <Anchor component={Link} to="/library#texts" size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Library
        </Anchor>
        <Empty icon={<BookOpenText size={30} />} title="This text isn’t here any more">
          It may have been deleted. <Anchor component={Link} to="/library#texts">Back to your texts</Anchor>
        </Empty>
      </Container>
    )
  return <Reader key={doc.id} doc={doc} />
}

function Reader({ doc }: { doc: Doc }) {
  const ai = useAiConfig()
  const updateText = useStore((s) => s.updateText)
  const markRead = useStore((s) => s.markRead)
  const read = useStore((s) => s.read[doc.id])
  const logActivityBulk = useStore((s) => s.logActivityBulk)
  const customWords = useStore((s) => s.customWords)
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const [showEn, setShowEn] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [size, setSize] = useState(readPref)
  const [playing, setPlaying] = useState<'playing' | 'paused' | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const playRef = useRef({ index: 0, stopped: true })

  useEffect(() => {
    if (!doc.builtin) updateText(doc.id, { openedAt: new Date().toISOString() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  // Sentences in reading order, with the index where each paragraph starts.
  const { sentences, offsets } = useMemo(() => {
    const all: string[] = []
    const offs: number[] = []
    for (const p of doc.paragraphs) {
      offs.push(all.length)
      all.push(...splitSentences(p))
    }
    return { sentences: all, offsets: offs }
  }, [doc.paragraphs])

  const words = useMemo(() => countWords(doc.paragraphs.join(' ')), [doc.paragraphs])
  const saved = customWords.filter((w) => w.from === `text:${doc.id}`)

  // After "Mark as read": which of the text's vocabulary-bank words did you recognise?
  const toCheck = useWordsToCheck(doc.paragraphs)
  const [checking, setChecking] = useState(false)

  const toggleTranslation = async () => {
    if (showEn) return setShowEn(false)
    if (doc.translation?.length) return setShowEn(true)
    if (!ai) {
      setError('Connect an AI in Settings to translate your own texts.')
      return
    }
    setTranslating(true)
    setError('')
    try {
      const t = await translateParagraphs(doc.paragraphs, ai)
      updateText(doc.id, { translation: t })
      setShowEn(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed.')
    } finally {
      setTranslating(false)
    }
  }

  // ── read aloud, sentence by sentence, highlighting as it goes
  const sayFrom = (i: number) => {
    if (i >= sentences.length) {
      playRef.current.stopped = true
      setPlaying(null)
      setActive(null)
      return
    }
    playRef.current.index = i
    setActive(i)
    speak(sentences[i], {
      voiceURI,
      rate,
      onEnd: () => {
        if (playRef.current.stopped) return
        sayFrom(i + 1)
      },
    })
  }
  const play = () => {
    playRef.current.stopped = false
    setPlaying('playing')
    sayFrom(playing === 'paused' ? playRef.current.index : 0)
  }
  const pause = () => {
    playRef.current.stopped = true
    stopSpeaking()
    setPlaying('paused')
  }
  const stop = () => {
    playRef.current.stopped = true
    stopSpeaking()
    setPlaying(null)
    setActive(null)
  }
  useEffect(
    () => () => {
      playRef.current.stopped = true
      stopSpeaking()
    },
    [],
  )

  const setFont = (i: number) => {
    setSize(i)
    try {
      localStorage.setItem('petit-a-petit-reader-size', String(i))
    } catch {
      /* ignore */
    }
  }

  const finish = () => {
    if (!read) logActivityBulk(Math.max(1, Math.round(words / 25)), Math.max(1, Math.round(words / 25)))
    markRead(doc.id)
    toast('Texte terminé — bravo !')
  }

  const handleMarkAsRead = () => {
    finish()
    if (toCheck.length) setChecking(true)
  }

  return (
    <Container size={760} py="xl">
      <PageHeader title={frTypo(doc.title)} subtitle={doc.subtitle} back={{ to: '/library#texts', label: 'Library' }} fr>
        <Group gap={8} mt="xs">
          {doc.level && <LevelBadge level={doc.level} />}
          <Text size="sm" c="dimmed">
            {words} words · {Math.max(1, Math.round(words / 120))} min
          </Text>
          {read && (
            <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
              read
            </Badge>
          )}
        </Group>
      </PageHeader>

      <Group
        role="toolbar"
        aria-label="Reading tools"
        gap={8}
        pos="sticky"
        top={0}
        mx={-8}
        mb={10}
        px={8}
        py={10}
        bg="var(--bg)"
        style={{ zIndex: 5, borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        {speechSupported && (
          <Group gap={4}>
            {playing === 'playing' ? (
              <Button variant="default" size="xs" leftSection={<Pause size={15} aria-hidden />} onClick={pause}>
                Pause
              </Button>
            ) : (
              <Button variant="default" size="xs" leftSection={<Play size={15} aria-hidden />} onClick={play}>
                {playing === 'paused' ? 'Resume' : 'Listen'}
              </Button>
            )}
            {playing && (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={stop} aria-label="Stop reading">
                <Square size={14} aria-hidden />
              </ActionIcon>
            )}
          </Group>
        )}
        <Button
          variant={showEn ? 'light' : 'default'}
          size="xs"
          onClick={toggleTranslation}
          aria-pressed={showEn}
          disabled={translating}
          leftSection={translating ? <Loader size={14} aria-hidden /> : <Languages size={15} aria-hidden />}
        >
          {showEn ? 'Hide translation' : 'Translation'}
        </Button>
        <SegmentedControl
          ml="auto"
          size="xs"
          aria-label="Text size"
          value={String(size)}
          onChange={(v) => setFont(Number(v))}
          data={SIZES.map((s, i) => ({
            value: String(i),
            label: (
              <>
                <Text span inherit fz={11 + i * 3} className="fr" aria-hidden>
                  {s.label}
                </Text>
                <VisuallyHidden>Text size {i + 1}</VisuallyHidden>
              </>
            ),
          }))}
        />
      </Group>
      {error && <Callout kind="warn">{error}</Callout>}

      <Text size="sm" c="dimmed" mb={18}>
        Tap a word for its meaning.
      </Text>

      <article className="reader-body fr" lang="fr" style={{ fontSize: SIZES[size].size }}>
        {doc.paragraphs.map((p, i) => (
          <div key={i} className="reader-para">
            <p>
              <LookupText text={p} source={`text:${doc.id}`} activeSentence={active ?? undefined} sentenceOffset={offsets[i]} />
            </p>
            {showEn && doc.translation?.[i] && (
              <p className="reader-en" lang="en">
                {doc.translation[i]}
              </p>
            )}
          </div>
        ))}
      </article>

      {checking ? (
        <WordCheck words={toCheck} onDone={() => setChecking(false)} />
      ) : (
        <Card component="footer" mt={28}>
          <Group justify="space-between" gap={14}>
            <Box miw={0}>
              <Text fw={650} mb={2}>
                {read ? 'Finished' : 'Done reading?'}
              </Text>
              <Text size="sm" c="dimmed">
                {saved.length
                  ? `${saved.length} word${saved.length > 1 ? 's' : ''} from this text in your flashcards: ${saved
                      .slice(0, 6)
                      .map((w) => frTypo(w.fr))
                      .join(', ')}${saved.length > 6 ? '…' : ''}`
                  : 'Tap words you don’t know to add them to your flashcards.'}
              </Text>
            </Box>
            <Group gap={8}>
              {read && toCheck.length > 0 && (
                <Button variant="default" onClick={() => setChecking(true)}>
                  Check {toCheck.length} word{toCheck.length > 1 ? 's' : ''}
                </Button>
              )}
              {saved.length > 0 && (
                <Button variant="default" component={Link} to="/vocab/study">
                  Study them
                </Button>
              )}
              <Button leftSection={<Check size={16} aria-hidden />} onClick={handleMarkAsRead}>
                {read ? 'Read again' : 'Mark as read'}
              </Button>
            </Group>
          </Group>
        </Card>
      )}
    </Container>
  )
}
