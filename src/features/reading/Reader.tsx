import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ActionIcon, Badge, Box, Button, Card, Container, Group, Loader, SegmentedControl, Text, VisuallyHidden } from '@mantine/core'
import { ArrowRight, Check, Languages, Pause, Play, Square } from 'lucide-react'
import type { Level } from '../../data/types'
import { Callout, LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { countWords } from '../../lib/ai/writing'
import { splitSentences } from '../../lib/french'
import { speak, speechSupported, stopSpeaking } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { LookupText } from './LookupText'
import { translateParagraphs } from './ai'
import { WordCheck } from './WordCheck'
import { useWordsToCheck } from './useWordsToCheck'
import { VocabPanel } from './VocabPanel'
import { VocabToggle } from './VocabToggle'
import { knownPercent, useHighlightPref, usePanelPref, useTextVocab, type TextVocabMarks } from './vocabStatus'

/** Something to read: a graded text, a saved text or a book chapter. */
export interface ReaderDoc {
  /** Key in `read` once finished, and the source stored on words added from it ("text:<id>"). */
  id: string
  title: string
  subtitle?: string
  level?: Level
  paragraphs: string[]
  /** English per paragraph, when there is one. */
  translation?: string[]
  /** Paragraphs that are sub-headings inside the text (a chapter's numbered parts). */
  subs?: ReadonlySet<number>
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

/**
 * The reading view: tap-to-translate text, read aloud, translation, the
 * vocabulary sidebar, and "Mark as read" with a check of the words you met.
 */
export function Reader({
  doc,
  back,
  eyebrow,
  meta,
  nav,
  onOpen,
  saveTranslation,
  next,
  doneToast = 'Texte terminé — bravo !',
}: {
  doc: ReaderDoc
  back: { to: string; label: string }
  eyebrow?: ReactNode
  /** Extra items in the header's meta row (after level and length). */
  meta?: ReactNode
  /** Under the header, e.g. chapter navigation. */
  nav?: ReactNode
  onOpen?: () => void
  /** Keep a translation fetched from the AI (texts without a built-in one). */
  saveTranslation?: (t: string[]) => void
  /** What to read after this one (a book's next chapter). */
  next?: { to: string; label: string }
  doneToast?: string
}) {
  const ai = useAiConfig()
  const markRead = useStore((s) => s.markRead)
  const read = useStore((s) => s.read[doc.id])
  const logActivityBulk = useStore((s) => s.logActivityBulk)
  const customWords = useStore((s) => s.customWords)
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const [translation, setTranslation] = useState(doc.translation)
  const [showEn, setShowEn] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [size, setSize] = useState(readPref)
  const [playing, setPlaying] = useState<'playing' | 'paused' | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const playRef = useRef({ index: 0, stopped: true })

  useEffect(() => {
    onOpen?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])
  useEffect(() => setTranslation(doc.translation), [doc.translation])

  const isSub = (i: number) => !!doc.subs?.has(i)
  // The running text, without sub-headings: what's read aloud, counted and checked.
  const text = useMemo(() => doc.paragraphs.filter((_, i) => !doc.subs?.has(i)), [doc.paragraphs, doc.subs])

  // Sentences in reading order, with the index where each paragraph starts.
  const { sentences, offsets } = useMemo(() => {
    const all: string[] = []
    const offs: number[] = []
    doc.paragraphs.forEach((p, i) => {
      offs.push(all.length)
      if (!doc.subs?.has(i)) all.push(...splitSentences(p))
    })
    return { sentences: all, offsets: offs }
  }, [doc.paragraphs, doc.subs])

  const words = useMemo(() => countWords(text.join(' ')), [text])
  const minutes = Math.max(1, Math.round(words / 120))
  const saved = customWords.filter((w) => w.from === `text:${doc.id}`)

  // After "Mark as read": which of the text's vocabulary-bank words did you recognise?
  const toCheck = useWordsToCheck(text)
  const [checking, setChecking] = useState(false)

  // The vocabulary panel: the text's words as new / learning / known, coloured in the text.
  const vocab = useTextVocab(text)
  const [focus, setFocus] = useState<string | null>(null)
  const [highlight, setHighlight] = useHighlightPref()
  const marks: TextVocabMarks = useMemo(
    () => ({ idFor: vocab.idFor, status: vocab.status, highlight, focus, onOpen: setFocus }),
    [vocab.idFor, vocab.status, highlight, focus],
  )
  const hasVocab = vocab.words.length > 0 || vocab.hidden > 0
  const [panelOpen, setPanelOpen] = usePanelPref()
  const withPanel = hasVocab && panelOpen

  const toggleTranslation = async () => {
    if (showEn) return setShowEn(false)
    if (translation?.length) return setShowEn(true)
    if (!ai) {
      setError('Connect an AI in Settings to translate this text.')
      return
    }
    setTranslating(true)
    setError('')
    try {
      const t = await translateParagraphs(doc.paragraphs, ai)
      setTranslation(t)
      saveTranslation?.(t)
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
    if (!read) logActivityBulk(Math.max(1, Math.round(words / 25)), Math.max(1, Math.round(words / 25)), 'reading')
    markRead(doc.id)
    toast(doneToast)
  }

  const handleMarkAsRead = () => {
    finish()
    if (toCheck.length) setChecking(true)
  }

  return (
    <Container size="var(--page-w)" py="xl">
      <div className="reading-wrap">
        <div className={`reading-layout${withPanel ? ' reading-layout--aside' : ''}`}>
          <div>
            <PageHeader eyebrow={eyebrow} title={frTypo(doc.title)} subtitle={doc.subtitle} back={back} fr>
              <Group gap={8} mt="xs">
                {doc.level && <LevelBadge level={doc.level} />}
                <Text size="sm" c="dimmed">
                  {words} words · {minutes} min
                </Text>
                {meta}
                {read && (
                  <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
                    read
                  </Badge>
                )}
              </Group>
            </PageHeader>
            {nav}

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
              {hasVocab && <VocabToggle open={panelOpen} onChange={setPanelOpen} known={knownPercent(vocab)} />}
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
              {hasVocab && highlight && ' Blue words are new, yellow ones you’re learning.'}
            </Text>

            <article className="reader-body fr" lang="fr" style={{ fontSize: SIZES[size].size }}>
              {doc.paragraphs.map((p, i) =>
                isSub(i) ? (
                  <h3 key={i} className="reader-sub">
                    {frTypo(p)}
                  </h3>
                ) : (
                  <div key={i} className="reader-para">
                    <p>
                      <LookupText text={p} source={`text:${doc.id}`} activeSentence={active ?? undefined} sentenceOffset={offsets[i]} vocab={hasVocab ? marks : undefined} />
                    </p>
                    {showEn && translation?.[i] && (
                      <p className="reader-en" lang="en">
                        {translation[i]}
                      </p>
                    )}
                  </div>
                ),
              )}
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
                    {read && next ? (
                      <Button component={Link} to={next.to} rightSection={<ArrowRight size={16} aria-hidden />}>
                        {next.label}
                      </Button>
                    ) : (
                      <Button leftSection={<Check size={16} aria-hidden />} onClick={handleMarkAsRead}>
                        {read ? 'Read again' : 'Mark as read'}
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            )}
            {checking && read && next && (
              <Group justify="flex-end" mt="md">
                <Button variant="default" component={Link} to={next.to} rightSection={<ArrowRight size={16} aria-hidden />}>
                  {next.label}
                </Button>
              </Group>
            )}
          </div>
          {withPanel && (
            <VocabPanel view={vocab} focus={focus} onFocus={setFocus} highlight={highlight} onHighlight={setHighlight} onHide={() => setPanelOpen(false)} />
          )}
        </div>
      </div>
    </Container>
  )
}
