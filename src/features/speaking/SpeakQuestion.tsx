import { useEffect, useState, type ReactNode } from 'react'
import { ActionIcon, Badge, Box, Button, Chip, Group, Stack, Text } from '@mantine/core'
import { Ear, Mic, Play, RotateCcw, Snail, Square, Volume2 } from 'lucide-react'
import { BottomSheet } from '../../components/BottomSheet'
import { CheckBar } from '../../components/CheckBar'
import { MarkedText } from '../../components/MarkedText'
import { Kbd } from '../../components/ui'
import { tipsFor } from '../../data/soundTips'
import { bestAlternative, tokens, type SpeechMatch } from '../../lib/french'
import { useHotkeys } from '../../lib/hooks'
import { playUrl, useSpeechCapture } from '../../lib/recognition'
import { speak, stopSpeaking } from '../../lib/speech'
import { useStore } from '../../lib/store'
import { frTypo } from '../../lib/words'
import type { PracticeSentence } from '../listening/sentences'

export type SpeakMode = 'read' | 'repeat'

export interface SpeakAnswer {
  sentence: PracticeSentence
  score: number
  match: SpeechMatch | null
  transcript: string
  attempts: number
}

const VERDICT_COLOR = { correct: 'green', almost: 'orange', wrong: 'red' } as const

const verdict = (score: number): 'correct' | 'almost' | 'wrong' => (score >= 90 ? 'correct' : score >= 60 ? 'almost' : 'wrong')

/**
 * One read-aloud sentence: listen to the model, record yourself, see which words
 * were understood, compare recordings, try again. Mount with a fresh key.
 */
export function SpeakQuestion({
  sentence,
  mode = 'read',
  context,
  onAnswered,
  onContinue,
}: {
  sentence: PracticeSentence
  mode?: SpeakMode
  context?: ReactNode
  onAnswered: (a: SpeakAnswer) => void
  onContinue: () => void
}) {
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const cap = useSpeechCapture({ recordVoice: true })
  const [best, setBest] = useState<{ match: SpeechMatch; transcript: string } | null>(null)
  const [last, setLast] = useState<{ match: SpeechMatch; transcript: string } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [selfScore, setSelfScore] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(mode === 'read')
  const [speaking, setSpeaking] = useState(false)
  const [done, setDone] = useState(false)

  const listen = (slow = false) => {
    if (cap.state === 'listening') return
    speak(sentence.fr, {
      voiceURI,
      rate: slow ? Math.max(0.5, rate * 0.7) : rate,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    })
  }

  // "Listen and repeat" starts by playing the model.
  useEffect(() => {
    if (mode !== 'repeat') return
    const t = setTimeout(() => listen(), 350)
    return () => {
      clearTimeout(t)
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Score each finished attempt.
  useEffect(() => {
    if (cap.state !== 'done' || !cap.result) return
    setAttempts((n) => n + 1)
    setRevealed(true)
    if (cap.mode === 'record' || !cap.result.alternatives.length) return
    const b = bestAlternative(sentence.fr, cap.result.alternatives)
    const attempt = { match: b.match, transcript: b.transcript }
    setLast(attempt)
    setBest((prev) => (!prev || attempt.match.score >= prev.match.score ? attempt : prev))
  }, [cap.state, cap.result, cap.mode, sentence.fr])

  const toggleMic = () => {
    if (done) return
    if (cap.state === 'listening') cap.stop()
    else if (cap.state !== 'starting' && cap.state !== 'processing') {
      stopSpeaking()
      cap.start()
    }
  }
  useHotkeys({ Space: toggleMic }, { enabled: !done })

  const recordOnly = cap.mode === 'record'
  const score = recordOnly ? selfScore : best?.match.score ?? null
  const shown = last ?? best
  const missed = shown ? shown.match.words.filter((_, i) => !shown.match.heard[i]) : []
  const tips = tipsFor(missed)

  const next = () => {
    if (done) return
    setDone(true)
    stopSpeaking()
    cap.reset()
    onAnswered({ sentence, score: score ?? 0, match: best?.match ?? null, transcript: best?.transcript ?? '', attempts })
    onContinue()
  }

  const busy = cap.state === 'starting' || cap.state === 'processing'
  const listening = cap.state === 'listening'

  return (
    <>
      {context}
      <Text size="xs" fw={650} c="dimmed" tt="uppercase" lts="0.05em" mb="sm">
        {mode === 'read' ? 'Read this sentence aloud' : 'Listen, then say it back'}
      </Text>

      {/* The recognised-words view keeps its own classes (say-ok / say-miss marks). */}
      <div className={`say-sentence fr${revealed ? '' : ' say-sentence--hidden'}`} lang="fr" aria-live="polite">
        {revealed ? (
          shown ? (
            <MarkedText
              text={sentence.fr}
              tokens={shown.match.tokens}
              render={(i, c) => <span className={shown.match.heard[i] ? 'say-ok' : 'say-miss'}>{c}</span>}
            />
          ) : (
            frTypo(sentence.fr)
          )
        ) : (
          <Button variant="subtle" color="gray" size="xs" onClick={() => setRevealed(true)}>
            Show the sentence
          </Button>
        )}
      </div>
      {revealed && (
        <Text c="dimmed" fz={15} mb="lg">
          {sentence.en}
        </Text>
      )}

      <Group justify="center" gap="sm" mt="xs" mb="md" wrap="nowrap">
        <Button
          variant={speaking ? 'light' : 'default'}
          onClick={() => listen(false)}
          disabled={listening}
          leftSection={<Volume2 size={17} aria-hidden />}
        >
          Listen
        </Button>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => listen(true)} disabled={listening} aria-label="Listen slowly" title="Listen slowly">
          <Snail size={16} aria-hidden />
        </ActionIcon>

        <Box
          pos="relative"
          mx={8}
          ref={(el: HTMLDivElement | null) => {
            cap.meterRef.current = el
          }}
        >
          {/* Ring that grows with the input level (the capture hook sets --level on this box). */}
          <Box
            pos="absolute"
            inset={-6}
            style={{
              borderRadius: '50%',
              border: '3px solid color-mix(in srgb, var(--mantine-color-red-6) 55%, transparent)',
              opacity: listening ? 1 : 0,
              transform: 'scale(calc(1 + var(--level, 0) * 0.35))',
              transition: 'transform 0.08s linear, opacity 0.2s',
              pointerEvents: 'none',
            }}
          />
          <ActionIcon
            size={84}
            radius="xl"
            variant="filled"
            color={listening ? 'red' : undefined}
            onClick={toggleMic}
            disabled={busy || done}
            aria-label={listening ? 'Stop recording' : 'Start recording'}
            aria-pressed={listening}
          >
            {listening ? <Square size={24} aria-hidden /> : <Mic size={28} aria-hidden />}
          </ActionIcon>
        </Box>

        <Button
          variant="default"
          onClick={() => playUrl(cap.result?.audioUrl ?? null)}
          disabled={!cap.result?.audioUrl || listening}
          leftSection={<Play size={16} aria-hidden />}
        >
          You
        </Button>
      </Group>

      <Text ta="center" fz={15} mih={26} role="status" aria-live="polite">
        {cap.state === 'idle' && !attempts && (
          <Text span c="dimmed" fz="inherit">
            Tap the microphone{' '}
            <span className="kbd-hint">
              or press <Kbd>Space</Kbd>
            </span>{' '}
            and speak.
          </Text>
        )}
        {cap.state === 'starting' && (
          <Text span c="dimmed" fz="inherit">
            Starting the microphone…
          </Text>
        )}
        {listening && (
          <Text span className="fr" c="dimmed" fz="inherit">
            <Ear size={15} aria-hidden color="var(--mantine-color-red-6)" style={{ verticalAlign: '-2px' }} />{' '}
            {cap.interim ? `« ${cap.interim} »` : recordOnly || cap.mode === 'ai' ? 'Recording… tap to stop' : 'Listening…'}
          </Text>
        )}
        {cap.state === 'processing' && (
          <Text span c="dimmed" fz="inherit">
            Transcribing…
          </Text>
        )}
        {cap.state === 'error' && (
          <Text span c="red" fz="inherit">
            {cap.error}
          </Text>
        )}
        {cap.state === 'done' && !recordOnly && last && (
          <span>
            <strong className="tnum">{last.match.score}%</strong> understood
            {last.transcript && (
              <>
                {' '}
                · heard <span className="fr" lang="fr">« {frTypo(last.transcript)} »</span>
              </>
            )}
          </span>
        )}
        {cap.state === 'done' && recordOnly && (
          <Text span c="dimmed" fz="inherit">
            Compare your recording with the model, then rate yourself.
          </Text>
        )}
      </Text>

      {tips.length > 0 && cap.state === 'done' && (
        <Stack
          component="ul"
          gap={8}
          mt="md"
          mb={0}
          p="md"
          bg="var(--mantine-color-default-hover)"
          style={{ listStyle: 'none', borderRadius: 'var(--mantine-radius-md)' }}
        >
          {tips.map((t) => (
            <Text component="li" key={t.id} size="sm">
              <Badge color="gray" mr={6}>
                {t.label}
              </Badge>{' '}
              {t.tip}
            </Text>
          ))}
        </Stack>
      )}

      {recordOnly && attempts > 0 && !done && (
        <Chip.Group value={selfScore === null ? null : String(selfScore)} onChange={(v) => setSelfScore(Number(v))}>
          <Group justify="center" gap={8} mt="md" role="group" aria-label="How did it sound?">
            {(
              [
                ['Needs work', 40],
                ['Good', 75],
                ['Great', 95],
              ] as const
            ).map(([label, v]) => (
              <Chip key={label} value={String(v)}>
                {label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      )}

      {score === null ? (
        <CheckBar onSkip={next} skipLabel="Skip" />
      ) : (
        <BottomSheet
          verdict={verdict(score)}
          label="Result"
          actions={
            <>
              <Button variant="subtle" color="gray" onClick={toggleMic} disabled={busy || listening} leftSection={<RotateCcw size={16} aria-hidden />}>
                Try again
              </Button>
              <Button size="lg" color={VERDICT_COLOR[verdict(score)]} onClick={next} disabled={listening} rightSection={<Kbd>↵</Kbd>}>
                Next
              </Button>
            </>
          }
        >
          <Text fw={700} fz="lg" mb={2} c={`${VERDICT_COLOR[verdict(score)]}.8`}>
            {score >= 90 ? 'Très bien\u00a0!' : score >= 60 ? 'Pas mal\u00a0!' : 'Keep practising'}
          </Text>
          <Text size="sm">
            {recordOnly
              ? 'Comparing yourself with a native model is one of the best ways to improve.'
              : `Best: ${score}% of the words understood${attempts > 1 ? ` · ${attempts} tries` : ''}`}
          </Text>
        </BottomSheet>
      )}
      <NextHotkey enabled={score !== null && !done && !listening} onNext={next} />
    </>
  )
}

function NextHotkey({ enabled, onNext }: { enabled: boolean; onNext: () => void }) {
  useHotkeys({ Enter: onNext }, { enabled })
  return null
}

/** Word count for a sentence (for estimates). */
export const wordCount = (s: string) => tokens(s).length
