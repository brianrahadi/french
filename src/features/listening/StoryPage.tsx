import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Container, Group, SegmentedControl, Stack, Stepper, Text, ThemeIcon, Title } from '@mantine/core'
import { Check, Eye, EyeOff, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react'
import { STORY_BY_ID, storyMinutes } from '../../data/stories'
import type { StoryDef } from '../../data/types'
import { Callout, Empty, LevelBadge, ProgressBar, Rich } from '../../components/ui'
import { Choices } from '../../components/Choices'
import { PageHeader } from '../../components/PageHeader'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { splitSentences } from '../../lib/french'
import { speak, speechSupported, stopSpeaking } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { LookupText } from '../reading/LookupText'

const SPEEDS = [
  { label: 'Slow', factor: 0.8 },
  { label: 'Normal', factor: 1 },
  { label: 'Fast', factor: 1.15 },
]

export default function StoryPage() {
  const { id = '' } = useParams()
  const story = STORY_BY_ID[id]
  useDocumentTitle(story ? story.title : 'Listening')
  if (!story)
    return (
      <Container size={760} py="xl">
        <PageHeader back={{ to: '/listening', label: 'Listening' }} title="Listening" />
        <Empty icon={<Headphones size={30} />} title="This story isn’t here">
          <Anchor component={Link} to="/listening">
            Back to the stories
          </Anchor>
        </Empty>
      </Container>
    )
  return <Story key={story.id} story={story} />
}

type Step = 'listen' | 'questions' | 'results'
const STEPS: Step[] = ['listen', 'questions', 'results']

function Story({ story }: { story: StoryDef }) {
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const best = useStore((s) => s.stories?.[story.id]?.best)
  const recordSentence = useStore((s) => s.recordSentence)
  const logActivityBulk = useStore((s) => s.logActivityBulk)

  const [step, setStep] = useState<Step>('listen')
  const [speed, setSpeed] = useState(1)
  const [showText, setShowText] = useState(false)
  const [showEn, setShowEn] = useState(false)
  const [playing, setPlaying] = useState<'playing' | 'paused' | null>(null)
  const [current, setCurrent] = useState(0)
  const [listens, setListens] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const playRef = useRef({ index: 0, stopped: true })

  // Sentences in order, with the index where each paragraph starts.
  const { sentences, offsets } = useMemo(() => {
    const all: string[] = []
    const offs: number[] = []
    for (const p of story.paragraphs) {
      offs.push(all.length)
      all.push(...splitSentences(p.fr))
    }
    return { sentences: all, offsets: offs }
  }, [story])

  const sayFrom = (i: number) => {
    if (i >= sentences.length) {
      playRef.current = { index: 0, stopped: true }
      setPlaying(null)
      setCurrent(0)
      setListens((n) => n + 1)
      return
    }
    playRef.current.index = i
    setCurrent(i)
    speak(sentences[i], {
      voiceURI,
      rate: (rate ?? 0.95) * speed,
      onEnd: () => {
        if (!playRef.current.stopped) sayFrom(i + 1)
      },
    })
  }
  const play = (from = playRef.current.index) => {
    playRef.current.stopped = false
    setPlaying('playing')
    sayFrom(from)
  }
  const pause = () => {
    playRef.current.stopped = true
    stopSpeaking()
    setPlaying('paused')
  }
  const jump = (i: number) => {
    const to = Math.max(0, Math.min(sentences.length - 1, i))
    playRef.current.index = to
    setCurrent(to)
    if (playing === 'playing') {
      playRef.current.stopped = true
      stopSpeaking()
      play(to)
    }
  }
  const restart = () => {
    playRef.current.stopped = true
    stopSpeaking()
    play(0)
  }
  useEffect(
    () => () => {
      playRef.current.stopped = true
      stopSpeaking()
    },
    [],
  )

  const goQuestions = () => {
    if (playing) pause()
    setShowText(false)
    setStep('questions')
    window.scrollTo({ top: 0 })
  }
  const answered = Object.keys(answers).length
  const correct = story.questions.filter((q, i) => answers[i] === q.answer).length
  const pct = Math.round((correct / story.questions.length) * 100)
  const submit = () => {
    recordSentence('stories', story.id, pct)
    logActivityBulk(story.questions.length, correct)
    setStep('results')
    setShowText(true)
    window.scrollTo({ top: 0 })
    if (pct === 100) toast('Parfait ! Tout compris.')
  }
  const retry = () => {
    setAnswers({})
    setShowText(false)
    setShowEn(false)
    setStep('listen')
    playRef.current = { index: 0, stopped: true }
    setCurrent(0)
  }

  const progress = playing || current > 0 ? (current + (playing ? 0.5 : 0)) / sentences.length : 0

  return (
    <Container size={760} py="xl">
      <PageHeader back={{ to: '/listening', label: 'Listening' }} title={frTypo(story.title)} fr subtitle={story.titleEn}>
        <Group gap={8} mt="sm">
          <LevelBadge level={story.level} />
          <Text size="sm" c="dimmed">
            {story.topic} · {storyMinutes(story)} min · {story.questions.length} questions
          </Text>
          {best !== undefined && (
            <Badge color="gray" className="tnum">
              best {best}%
            </Badge>
          )}
        </Group>
      </PageHeader>

      <Stepper active={STEPS.indexOf(step)} size="xs" mb="lg" allowNextStepsSelect={false}>
        <Stepper.Step label="Listen" />
        <Stepper.Step label="Answer" />
        <Stepper.Step label="Check" />
      </Stepper>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud. Try Chrome, Edge or Safari, or read the text instead.</Callout>}

      {/* ── Player (always available) */}
      <Card aria-label="Audio player" padding={step === 'listen' ? 'lg' : 'md'}>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => jump(current - 1)} aria-label="Previous sentence" title="Previous sentence">
            <SkipBack size={18} aria-hidden />
          </ActionIcon>
          {playing === 'playing' ? (
            <Button miw={140} onClick={pause} leftSection={<Pause size={18} aria-hidden />}>
              Pause
            </Button>
          ) : (
            <Button miw={140} onClick={() => play()} disabled={!speechSupported} leftSection={<Play size={18} aria-hidden />}>
              {playing === 'paused' ? 'Resume' : listens ? 'Listen again' : 'Listen'}
            </Button>
          )}
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => jump(current + 1)} aria-label="Next sentence" title="Next sentence">
            <SkipForward size={18} aria-hidden />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={restart} aria-label="From the start" title="From the start" disabled={!speechSupported}>
            <RotateCcw size={17} aria-hidden />
          </ActionIcon>
          <SegmentedControl
            ml="auto"
            size="xs"
            value={String(speed)}
            onChange={(v) => setSpeed(Number(v))}
            data={SPEEDS.map((s) => ({ value: String(s.factor), label: s.label }))}
            aria-label="Speed"
          />
        </Group>
        <Group gap="sm" mt="md" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <ProgressBar value={progress} label={`Sentence ${current + 1} of ${sentences.length}`} thin />
          </div>
          <Text size="sm" c="dimmed" className="tnum">
            {current + 1}/{sentences.length}
            {listens > 0 && ` · heard ${listens}×`}
          </Text>
        </Group>
        {step === 'listen' && (
          <Text size="sm" c="dimmed" mt="sm">
            Listen without the text first — as many times as you like. Get the gist, then the details. When you’re ready, answer the questions.
          </Text>
        )}
      </Card>

      {/* ── Step 1: listening */}
      {step === 'listen' && (
        <Group justify="space-between" mt="md">
          <Button variant="subtle" color="gray" onClick={() => setShowText((v) => !v)} leftSection={showText ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}>
            {showText ? 'Hide the text' : 'Peek at the text'}
          </Button>
          <Button onClick={goQuestions}>Answer the questions</Button>
        </Group>
      )}

      {/* ── Step 2: questions */}
      {step === 'questions' && (
        <Stack gap="lg" mt="lg" component="section" aria-label="Questions">
          {story.questions.map((q, qi) => (
            <Card key={qi}>
              <Text size="xs" c="dimmed" fw={600}>
                Question {qi + 1}
              </Text>
              <Text fz={18} fw={600} mt={2} mb="md">
                <Rich text={q.prompt} />
              </Text>
              <Choices
                options={q.options.map((o) => frTypo(o))}
                value={answers[qi]}
                onChange={(oi) => setAnswers((a) => ({ ...a, [qi]: oi }))}
                label={`Question ${qi + 1}`}
                fr
              />
            </Card>
          ))}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {answered}/{story.questions.length} answered
            </Text>
            <Button size="lg" onClick={submit} disabled={answered < story.questions.length} leftSection={<Check size={18} aria-hidden />}>
              Check my answers
            </Button>
          </Group>
        </Stack>
      )}

      {/* ── Step 3: results */}
      {step === 'results' && (
        <Stack gap="md" mt="lg" component="section" aria-label="Results">
          <Card>
            <Group wrap="nowrap" align="center" gap="lg">
              <Text fz={44} fw={700} lh={1} className="tnum" c={pct === 100 ? 'green' : pct >= 60 ? undefined : 'red'}>
                {pct}%
              </Text>
              <div style={{ flex: 1 }}>
                <Text fw={650}>
                  {correct} of {story.questions.length} right
                </Text>
                <Text size="sm" c="dimmed">
                  {pct === 100
                    ? 'Perfect comprehension. Now listen once more with the text to catch every word.'
                    : 'Read the text below, then listen again while following it — the bits you missed usually become clear.'}
                </Text>
              </div>
              <Button variant="default" onClick={retry} leftSection={<RotateCcw size={16} aria-hidden />}>
                Try again
              </Button>
            </Group>
          </Card>
          <Card padding={0}>
            {story.questions.map((q, qi) => {
              const ok = answers[qi] === q.answer
              return (
                <Group key={qi} align="flex-start" wrap="nowrap" gap="sm" p="md" style={qi ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}>
                  <ThemeIcon color={ok ? 'green' : 'red'} variant="light" radius="xl" size={24} aria-label={ok ? 'Right' : 'Wrong'}>
                    {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
                  </ThemeIcon>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={600}>
                      <Rich text={q.prompt} />
                    </Text>
                    <Group gap={8}>
                      {!ok && (
                        <Text size="sm" c="red" td="line-through" className="fr" lang="fr">
                          {frTypo(q.options[answers[qi]])}
                        </Text>
                      )}
                      <Text size="sm" c="green.8" fw={600} className="fr" lang="fr">
                        {frTypo(q.options[q.answer])}
                      </Text>
                    </Group>
                    {q.explain && (
                      <Text size="sm" c="dimmed">
                        <Rich text={q.explain} />
                      </Text>
                    )}
                  </Stack>
                </Group>
              )
            })}
          </Card>
        </Stack>
      )}

      {/* ── Transcript */}
      {showText && (
        <Box component="section" mt="xl" aria-label="Transcript">
          <Group justify="space-between" mb={4}>
            <Title order={2} size="h5" c="dimmed" tt="uppercase">
              Transcript
            </Title>
            <Button variant="subtle" size="xs" onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
              {showEn ? 'Hide translation' : 'Show translation'}
            </Button>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Tap any word to see what it means and add it to your flashcards.
          </Text>
          <article className="reader-body fr" lang="fr">
            {story.paragraphs.map((p, i) => (
              <div key={i} className="reader-para">
                <p>
                  <LookupText text={p.fr} source={`story:${story.id}`} activeSentence={playing ? current : undefined} sentenceOffset={offsets[i]} />
                </p>
                {showEn && (
                  <p className="reader-en" lang="en">
                    {p.en}
                  </p>
                )}
              </div>
            ))}
          </article>
        </Box>
      )}
    </Container>
  )
}
