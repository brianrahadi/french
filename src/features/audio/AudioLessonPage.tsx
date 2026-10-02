import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ActionIcon, Anchor, Badge, Button, Card, Container, Group, Progress, SegmentedControl, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { ArrowRight, AudioLines, Check, Eye, EyeOff, Headphones, Mic, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { AUDIO_BY_ID, AUDIO_LESSONS } from '../../data/audio'
import type { AudioLessonDef } from '../../data/types'
import { Callout, Empty, LevelBadge, ProgressBar } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { say, speechSupported, stopSpeaking } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { buildScript, minutesOf, scriptSeconds, turnSeconds, type Step } from './script'

const PAUSES = [
  { label: 'Short', factor: 0.75 },
  { label: 'Normal', factor: 1 },
  { label: 'Long', factor: 1.4 },
]
const PAUSE_KEY = 'petit-a-petit:audio-pause'

function savedPause(): number {
  try {
    const v = Number(localStorage.getItem(PAUSE_KEY))
    return PAUSES.some((p) => p.factor === v) ? v : 1
  } catch {
    return 1
  }
}

export default function AudioLessonPage() {
  const { id = '' } = useParams()
  const lesson = AUDIO_BY_ID[id]
  useDocumentTitle(lesson ? lesson.title : 'Audio lessons')
  if (!lesson)
    return (
      <Container size={720} py="xl">
        <PageHeader back={{ to: '/library#audio', label: 'Library' }} title="Audio lessons" />
        <Empty icon={<AudioLines size={30} />} title="This lesson isn’t here">
          <Anchor component={Link} to="/library#audio">
            Back to the lessons
          </Anchor>
        </Empty>
      </Container>
    )
  return <Player key={lesson.id} lesson={lesson} />
}

/** Index of the narrator line that starts the item containing step i. */
function anchor(steps: Step[], i: number): number {
  for (let k = Math.min(i, steps.length - 1); k > 0; k--) if (steps[k].kind === 'en') return k
  return 0
}

function Player({ lesson }: { lesson: AudioLessonDef }) {
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const saved = useStore((s) => s.audio?.[lesson.id])
  const saveAudio = useStore((s) => s.saveAudio)
  const logActivityBulk = useStore((s) => s.logActivityBulk)

  const index = AUDIO_LESSONS.findIndex((l) => l.id === lesson.id)
  const next = AUDIO_LESSONS[index + 1]
  const { parts, steps } = useMemo(() => buildScript(lesson, index + 1, AUDIO_LESSONS.slice(0, index)), [lesson, index])

  const [i, setI] = useState(() => (saved && !saved.done && saved.total === steps.length ? Math.min(saved.pos, steps.length - 1) : 0))
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const [pause, setPause] = useState(savedPause)
  const [showFr, setShowFr] = useState(false)

  const step = steps[Math.min(i, steps.length - 1)]

  // Play the current step, then move on.
  useEffect(() => {
    if (!playing || i >= steps.length) return
    let cancelled = false
    const st = steps[i]
    const advance = () => {
      if (cancelled) return
      if (i + 1 < steps.length) return setI(i + 1)
      setPlaying(false)
      setFinished(true)
      saveAudio(lesson.id, 0, steps.length, true)
      logActivityBulk(steps.filter((s) => s.kind === 'turn' && !s.repeat).length, 0, 'listening')
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    if (st.kind === 'en') void say(st.text, { lang: 'en', rate: 1 }).then(advance)
    else if (st.kind === 'fr') void say(st.text, { lang: 'fr', voiceURI, speaker: st.voice, rate: st.slow ? rate * 0.75 : rate }).then(advance)
    else timer = setTimeout(advance, (st.kind === 'turn' ? turnSeconds(st.answer, pause, st.repeat) : st.seconds) * 1000)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [playing, i, steps, voiceURI, rate, pause, lesson.id, saveAudio, logActivityBulk])

  // Stop talking when paused or when leaving the page.
  useEffect(() => {
    if (!playing) stopSpeaking()
  }, [playing])
  useEffect(() => () => stopSpeaking(), [])

  // Remember where you are (at the start of each item, so resuming makes sense).
  const at = anchor(steps, i)
  useEffect(() => {
    if (at > 0 && !finished) saveAudio(lesson.id, at, steps.length)
  }, [at, finished, lesson.id, steps.length, saveAudio])

  // Keep the screen on while playing: speech stops when the phone locks.
  useEffect(() => {
    if (!playing || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let gone = false
    navigator.wakeLock
      .request('screen')
      .then((l) => (gone ? void l.release() : (lock = l)))
      .catch(() => {})
    return () => {
      gone = true
      void lock?.release()
    }
  }, [playing])

  const go = (k: number) => {
    setFinished(false)
    setI(Math.max(0, Math.min(steps.length - 1, k)))
  }
  const back = () => go(i - at > 1 ? at : anchor(steps, at - 1))
  const forward = () => {
    const k = steps.findIndex((s, j) => j > i && s.kind === 'en')
    go(k < 0 ? steps.length - 1 : k)
  }
  const toggle = () => {
    if (finished) {
      go(0)
      setPlaying(true)
    } else setPlaying((p) => !p)
  }

  // Headset / lock-screen buttons.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = new MediaMetadata({ title: `${lesson.title} — ${lesson.titleEn}`, artist: 'Petit à petit', album: 'Audio lessons' })
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', () => setPlaying(true)],
      ['pause', () => setPlaying(false)],
      ['previoustrack', back],
      ['nexttrack', forward],
    ]
    for (const [a, h] of handlers)
      try {
        ms.setActionHandler(a, h)
      } catch {
        /* not supported */
      }
    return () => {
      for (const [a] of handlers)
        try {
          ms.setActionHandler(a, null)
        } catch {
          /* not supported */
        }
    }
  })

  const total = useMemo(() => scriptSeconds(steps, pause), [steps, pause])
  const left = useMemo(() => scriptSeconds(steps.slice(i), pause), [steps, i, pause])
  const progress = finished ? 1 : i / steps.length

  const savePause = (v: number) => {
    setPause(v)
    try {
      localStorage.setItem(PAUSE_KEY, String(v))
    } catch {
      /* private mode */
    }
  }

  return (
    <Container size={720} py="xl">
      <PageHeader back={{ to: '/library#audio', label: 'Library' }} title={frTypo(lesson.title)} fr subtitle={lesson.titleEn}>
        <Group gap={8} mt="sm">
          <LevelBadge level={lesson.level} />
          <Text size="sm" c="dimmed">
            Lesson {index + 1} · about {minutesOf(total)} min
          </Text>
          {saved?.done && (
            <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
              done
            </Badge>
          )}
        </Group>
      </PageHeader>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons don’t work here. Try Chrome, Edge or Safari.</Callout>}

      <Card mih={230} aria-live="polite">
        <Stack gap="sm" style={{ flex: 1 }}>
          {finished ? (
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon color="green" variant="light" size={40} radius="xl">
                <Check size={22} aria-hidden />
              </ThemeIcon>
              <div>
                <Text fw={650}>Lesson complete — bravo !</Text>
                <Text size="sm" c="dimmed">
                  One a day. Repeat it tomorrow if it felt hard.
                </Text>
              </div>
            </Group>
          ) : step.kind === 'turn' ? (
            <>
              <Group gap="sm">
                <ThemeIcon color="green" variant="light" size={40} radius="xl">
                  <Mic size={20} aria-hidden />
                </ThemeIcon>
                <Text fw={650}>{step.repeat ? 'Repeat out loud' : 'Your turn — say it out loud'}</Text>
              </Group>
              {!step.repeat && <Text fz={19}>{step.cue}</Text>}
              {showFr && (
                <Text fz={22} className="fr" lang="fr">
                  {frTypo(step.answer)}
                </Text>
              )}
              {playing && <Countdown key={i} seconds={turnSeconds(step.answer, pause, step.repeat)} />}
            </>
          ) : (
            <>
              <Group gap="sm">
                <ThemeIcon variant="light" size={40} radius="xl">
                  <Headphones size={20} aria-hidden />
                </ThemeIcon>
                <Text fw={650}>{step.kind === 'fr' ? (step.slow ? 'Listen carefully' : 'Listen') : playing ? 'Listen' : 'Ready'}</Text>
              </Group>
              {step.kind === 'en' && <Text fz={19}>{step.text}</Text>}
              {step.kind === 'fr' && (
                <Text fz={22} className="fr" lang="fr">
                  {showFr ? frTypo(step.text) : '• • •'}
                </Text>
              )}
            </>
          )}
        </Stack>

        <Group gap="xs" mt="lg">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={back} aria-label="Back" title="Back" disabled={finished}>
            <SkipBack size={18} aria-hidden />
          </ActionIcon>
          <Button
            miw={150}
            onClick={toggle}
            disabled={!speechSupported}
            leftSection={playing ? <Pause size={18} aria-hidden /> : finished ? <RotateCcw size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          >
            {playing ? 'Pause' : finished ? 'Play again' : i > 0 ? 'Resume' : 'Start'}
          </Button>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={forward} aria-label="Skip" title="Skip" disabled={finished}>
            <SkipForward size={18} aria-hidden />
          </ActionIcon>
          <Button
            variant="subtle"
            size="xs"
            ml="auto"
            aria-pressed={showFr}
            onClick={() => setShowFr((v) => !v)}
            leftSection={showFr ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          >
            French text
          </Button>
        </Group>
        <Group gap="sm" mt="md" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <ProgressBar value={progress} label="Lesson progress" thin />
          </div>
          <Text size="sm" c="dimmed" className="tnum">
            {finished ? 'done' : `${minutesOf(left)} min left`}
          </Text>
        </Group>
      </Card>

      <Group justify="space-between" mt="md">
        {finished && next ? (
          <Button component={Link} to={`/audio/${next.id}`} rightSection={<ArrowRight size={16} aria-hidden />}>
            Next: {frTypo(next.title)}
          </Button>
        ) : (
          <span />
        )}
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Time to answer
          </Text>
          <SegmentedControl
            size="xs"
            value={String(pause)}
            onChange={(v) => savePause(Number(v))}
            data={PAUSES.map((p) => ({ value: String(p.factor), label: p.label }))}
            aria-label="Time to answer"
          />
        </Group>
      </Group>

      <Title order={2} size="h5" mt="xl" mb="xs" c="dimmed" tt="uppercase">
        In this lesson
      </Title>
      <Group gap={6} component="ol" p={0} m={0} style={{ listStyle: 'none' }}>
        {parts.map((title, p) => {
          const first = steps.findIndex((s) => s.part === p)
          const state = finished || step.part > p ? 'done' : step.part === p ? 'now' : ''
          return (
            <li key={p}>
              <Button
                size="compact-sm"
                radius="xl"
                variant={state === 'now' ? 'light' : 'default'}
                color={state === 'done' ? 'green' : undefined}
                leftSection={state === 'done' ? <Check size={13} aria-hidden /> : <Text span size="xs" fw={700}>{p + 1}</Text>}
                onClick={() => go(first)}
                fw={500}
              >
                {title}
              </Button>
            </li>
          )
        })}
      </Group>
    </Container>
  )
}

/** A bar that empties over `seconds`: the learner's time to answer. */
function Countdown({ seconds }: { seconds: number }) {
  const [v, setV] = useState(100)
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(0))
    return () => cancelAnimationFrame(id)
  }, [])
  return <Progress value={v} color="green" size="sm" radius="xl" transitionDuration={seconds * 1000} aria-hidden styles={{ section: { transitionTimingFunction: 'linear' } }} />
}
