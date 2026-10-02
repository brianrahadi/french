import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { CheckCircle2, Sparkles } from 'lucide-react'
import type { Word } from '../../data/types'
import { SpeakButton, useSpeak } from '../../components/SpeakButton'
import { AccentBar } from '../../components/AccentBar'
import { BottomSheet } from '../../components/BottomSheet'
import { Diff } from '../../components/Diff'
import { GenderTag, Kbd } from '../../components/ui'
import { checkAnswer, normalize } from '../../lib/answer'
import { useStore } from '../../lib/store'
import { useHotkeys } from '../../lib/hooks'
import { previewIntervals, Rating, State, type Grade } from '../../lib/srs'
import { definite, displayFr, frTypo, glossParts, posLabel, productionAnswers, speakText, startsWithVowelSound } from '../../lib/words'

/* Flashcard building blocks shared by the vocabulary session and the mixed daily session. */

/** Small uppercase line above the card saying what to do. */
function Kicker({ children }: { children: ReactNode }) {
  return (
    <Group gap={8} mb={14} c="dimmed" fz={12.5} fw={650} tt="uppercase" lts="0.05em">
      {children}
    </Group>
  )
}

export function FrWord({ w, size = 'lg' }: { w: Word; size?: 'lg' | 'md' }) {
  const art = w.pos === 'n' && w.g && !w.custom ? definite(w) : ''
  const cls = w.g === 'f' ? 'art-f' : 'art-m'
  return (
    <span className={size === 'lg' ? 'flash__word' : 'fr'} lang="fr">
      {art && <span className={w.both ? '' : cls}>{frTypo(art)}</span>}
      {frTypo(art ? w.fr : displayFr(w))}
    </span>
  )
}

export function WordMeta({ w }: { w: Word }) {
  const showGender = w.pos === 'n' && w.g && !w.both && (startsWithVowelSound(w.fr) || w.pl)
  return (
    <div className="flash__pos">
      {posLabel(w)}
      {w.pl ? ' · plural' : ''} {showGender && <GenderTag g={w.g} />}
    </div>
  )
}

export function Example({ w, autoPlay = false }: { w: Word; autoPlay?: boolean }) {
  if (!w.ex) return null
  return (
    <Group align="flex-start" justify="center" gap={6} ta="center" wrap="nowrap">
      <div>
        <div className="flash__example" lang="fr">
          {frTypo(w.ex)}
        </div>
        {w.exEn && <div className="flash__example-en">{w.exEn}</div>}
      </div>
      <SpeakButton text={w.ex} size="sm" autoPlay={autoPlay} label="Listen to the example" />
    </Group>
  )
}

export function IntroCard({ word: w, onDone }: { word: Word; onDone: (known: boolean) => void }) {
  const autoplay = useStore((s) => s.settings.autoplay)
  useHotkeys({ Enter: () => onDone(false), Space: () => onDone(false), k: () => onDone(true) })
  return (
    <>
      <Kicker>
        <Sparkles size={15} aria-hidden /> New word · {w.level}
      </Kicker>
      <div className="flash">
        <Group gap={6} justify="center">
          <FrWord w={w} />
          <SpeakButton text={speakText(w)} autoPlay={autoplay} />
        </Group>
        <WordMeta w={w} />
        <div className="flash__divider" />
        <div className="flash__en">{w.en}</div>
        {w.ex && (
              <Box mt={22}>
                <Example w={w} />
              </Box>
            )}
        {w.note && <p className="flash__note">{w.note}</p>}
      </div>
      <BottomSheet
        verdict="neutral"
        actions={
          <Button size="lg" onClick={() => onDone(false)} autoFocus rightSection={<Kbd>↵</Kbd>}>
            Got it
          </Button>
        }
      >
        <Button variant="subtle" color="gray" onClick={() => onDone(true)} rightSection={<Kbd>K</Kbd>}>
          I already know this
        </Button>
      </BottomSheet>
    </>
  )
}

export function RatingBar({ id, onRate, suggested }: { id: string; onRate: (g: Grade) => void; suggested?: Grade }) {
  const card = useStore((s) => s.cards[id])
  const retention = useStore((s) => s.settings.retention)
  const labels = useMemo(() => (card ? previewIntervals(card, new Date(), retention) : null), [card, retention])
  const buttons: { g: Grade; label: string; color: string }[] = [
    { g: Rating.Again, label: 'Again', color: 'red' },
    { g: Rating.Hard, label: 'Hard', color: 'orange' },
    { g: Rating.Good, label: 'Good', color: 'green' },
    { g: Rating.Easy, label: 'Easy', color: 'indigo' },
  ]
  const def = suggested ?? Rating.Good
  useHotkeys({
    '1': () => onRate(Rating.Again),
    '2': () => onRate(Rating.Hard),
    '3': () => onRate(Rating.Good),
    '4': () => onRate(Rating.Easy),
    Enter: () => onRate(def),
    Space: () => onRate(def),
  })
  return (
    <Stack gap={12}>
      <SimpleGrid cols={4} spacing={8} role="group" aria-label="How well did you remember?">
        {buttons.map((b, i) => {
          const isSuggested = b.g === suggested
          return (
            <Button
              key={b.g}
              variant={isSuggested ? 'light' : 'default'}
              color={b.color}
              c={isSuggested ? undefined : b.color}
              h={58}
              px={6}
              fullWidth
              onClick={() => onRate(b.g)}
              aria-keyshortcuts={String(i + 1)}
              style={isSuggested ? { outline: `2px solid var(--mantine-color-${b.color}-filled)`, outlineOffset: -2 } : undefined}
            >
              <Stack gap={2} align="center">
                {b.label}
                <Text span size="xs" fw={560} c="dimmed" className="tnum">
                  {labels?.[b.g] ?? ''}
                  <span className="kbd-hint"> · {i + 1}</span>
                </Text>
              </Stack>
            </Button>
          )
        })}
      </SimpleGrid>
      {card && card.state !== State.New && (
        <Text size="sm" c="dimmed" ta="center" ff="monospace">
          Interval: {card.scheduled_days}d · Stability: {card.stability.toFixed(2)}
        </Text>
      )}
    </Stack>
  )
}

export function RecognitionCard({ word: w, id, onRate }: { word: Word; id: string; onRate: (g: Grade) => void }) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const [revealed, setRevealed] = useState(false)
  useHotkeys({ Enter: () => setRevealed(true), Space: () => setRevealed(true) }, { enabled: !revealed })
  return (
    <>
      <Kicker>What does this mean?</Kicker>
      <div className="flash">
        <Group gap={6} justify="center">
          <FrWord w={w} />
          <SpeakButton text={speakText(w)} autoPlay={autoplay} />
        </Group>
        <WordMeta w={w} />
        {revealed && (
          <>
            <div className="flash__divider" />
            <div className="flash__en" aria-live="polite">
              {w.en}
            </div>
            {w.ex && (
              <Box mt={22}>
                <Example w={w} />
              </Box>
            )}
            {w.note && <p className="flash__note">{w.note}</p>}
          </>
        )}
      </div>
      <BottomSheet verdict="neutral">
        {revealed ? (
          <RatingBar id={id} onRate={onRate} />
        ) : (
          <Button size="lg" fullWidth maw={420} mx="auto" display="flex" onClick={() => setRevealed(true)} rightSection={<Kbd>Space</Kbd>}>
            Show answer
          </Button>
        )}
      </BottomSheet>
    </>
  )
}

type Verdict = 'correct' | 'almost' | 'wrong' | 'partial'
const sheetVerdict = (v: Verdict) => (v === 'correct' ? 'correct' : v === 'wrong' ? 'wrong' : 'almost')
const VERDICT_COLOR = { correct: 'green', almost: 'orange', wrong: 'red' } as const

export function ProductionCard({ word: w, id, onRate }: { word: Word; id: string; onRate: (g: Grade) => void }) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const strict = useStore((s) => s.settings.strictAccents)
  const say = useSpeak()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<null | { verdict: 'correct' | 'almost' | 'wrong' | 'partial'; expected: string }>(null)
  const ref = useRef<HTMLInputElement>(null)
  const { answers, partial } = productionAnswers(w)

  const check = (giveUp = false) => {
    if (result) return
    const shown = displayFr(w).replace(' · ', ', ')
    if (giveUp || !value.trim()) {
      setResult({ verdict: 'wrong', expected: shown })
    } else if (partial.some((p) => normalize(p) === normalize(value))) {
      setResult({ verdict: 'partial', expected: answers[0] })
    } else {
      const r = checkAnswer(value, answers)
      setResult({ verdict: r.verdict, expected: r.verdict === 'correct' ? r.expected : answers[0] })
    }
    ref.current?.blur()
    if (autoplay) say(speakText(w))
  }

  const suggested: Grade | undefined = result
    ? result.verdict === 'correct'
      ? Rating.Good
      : result.verdict === 'wrong' || (result.verdict === 'almost' && strict)
        ? Rating.Again
        : Rating.Hard
    : undefined

  const hintArticle = w.pos === 'n' && w.g && !w.custom
  const verdictCls =
    result && (result.verdict === 'correct' ? ' answer-input--correct' : result.verdict === 'wrong' ? ' answer-input--wrong' : ' answer-input--almost')

  return (
    <>
      <Kicker>Say it in French</Kicker>
      <div className="flash">
        <div className="flash__en">{glossParts(w.en).join(', ')}</div>
        <div className="flash__pos">
          {posLabel(w)}
          {hintArticle ? ' — include the article' : ''}
        </div>
        {w.exEn && !result && (
          <Box component="p" className="flash__example-en" mt={14}>
            “{w.exEn}”
          </Box>
        )}
        {result && (
          <>
            <div className="flash__divider" />
            <Group gap={6} justify="center">
              <FrWord w={w} />
              <SpeakButton text={speakText(w)} />
            </Group>
            {w.pos === 'n' && w.g && !w.both && (startsWithVowelSound(w.fr) || w.pl) && (
              <div className="flash__pos">
                <GenderTag g={w.g} />
              </div>
            )}
            {w.ex && (
              <Box mt={18}>
                <Example w={w} />
              </Box>
            )}
            {w.note && <p className="flash__note">{w.note}</p>}
          </>
        )}
      </div>

      <Box mt={20}>
        <input
          ref={ref}
          className={`answer-input${verdictCls ?? ''}`}
          value={value}
          lang="fr"
          autoFocus
          readOnly={!!result}
          placeholder={hintArticle ? 'le / la / l’ …' : 'Type in French…'}
          aria-label="Your answer in French"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !result) {
              e.preventDefault()
              check()
            }
          }}
        />
        {!result && <AccentBar inputRef={ref} onInsert={setValue} />}
      </Box>

      {result ? (
        <BottomSheet verdict={sheetVerdict(result.verdict)} animate label="Result">
          <Group gap={8} c={`${VERDICT_COLOR[sheetVerdict(result.verdict)]}.8`} aria-live="assertive">
            {result.verdict === 'correct' && <CheckCircle2 size={22} aria-hidden />}
            <Text fw={700} fz={18} c="inherit">
              {result.verdict === 'correct' && 'Correct !'}
              {result.verdict === 'almost' && 'Almost — watch the accents'}
              {result.verdict === 'partial' && 'Right word — now add the article to learn its gender'}
              {result.verdict === 'wrong' && (value.trim() ? 'Not quite' : 'Here’s the answer')}
            </Text>
          </Group>
          {result.verdict !== 'correct' && value.trim() && (
            <Text mt={6} fz={18} className="fr" lang="fr" component="div">
              <Diff given={value} expected={result.expected} />
            </Text>
          )}
          <Box mt={12}>
            <RatingBar id={id} onRate={onRate} suggested={suggested} />
          </Box>
        </BottomSheet>
      ) : (
        <BottomSheet
          verdict="neutral"
          actions={
            <Button size="lg" disabled={!value.trim()} onMouseDown={(e) => e.preventDefault()} onClick={() => check()} rightSection={<Kbd>↵</Kbd>}>
              Check
            </Button>
          }
        >
          <Button variant="subtle" color="gray" onClick={() => check(true)}>
            Show answer
          </Button>
        </BottomSheet>
      )}
    </>
  )
}
