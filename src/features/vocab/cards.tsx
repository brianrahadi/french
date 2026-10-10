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
import { newCard, previewIntervals, Rating, State, type Grade } from '../../lib/srs'
import { definite, displayFr, frTypo, glossParts, posLabel, productionAnswers, speakText, startsWithVowelSound } from '../../lib/words'

/*
 * Flashcard building blocks shared by the vocabulary session and the mixed daily session.
 * Cards work like Anki: the front only, you guess, flip (Space), then rate 1–4. New words
 * aren't shown with their answer first — a new word is just a card you haven't seen yet.
 */

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

/** "New · A1" for a word seen for the first time (no card yet, or one never rated). */
function useIsNew(id: string) {
  const [isNew] = useState(() => {
    const c = useStore.getState().cards[id]
    return !c || c.state === State.New
  })
  return isNew
}

function CardKicker({ id, word: w, children }: { id: string; word: Word; children: ReactNode }) {
  const isNew = useIsNew(id)
  return (
    <Kicker>
      {isNew && (
        <Text span c="blue.7" fz="inherit" fw="inherit" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={15} aria-hidden /> New{w.level && !w.custom ? ` · ${w.level}` : ''} ·
        </Text>
      )}
      {children}
    </Kicker>
  )
}

/** Front-of-card actions: flip, and — for a word never seen — skip it as already known. */
function FrontSheet({ onFlip, onKnown }: { onFlip: () => void; onKnown?: () => void }) {
  useHotkeys({ Enter: onFlip, Space: onFlip, ...(onKnown ? { k: onKnown } : {}) })
  return (
    <BottomSheet verdict="neutral">
      <Stack gap={6} align="center">
        <Button size="lg" fullWidth maw={420} onClick={onFlip} autoFocus rightSection={<Kbd>Space</Kbd>}>
          Show answer
        </Button>
        {onKnown && (
          <Button variant="subtle" color="gray" size="xs" onClick={onKnown} rightSection={<Kbd>K</Kbd>}>
            I already know this
          </Button>
        )}
      </Stack>
    </BottomSheet>
  )
}

export function RatingBar({ id, onRate, suggested }: { id: string; onRate: (g: Grade) => void; suggested?: Grade }) {
  const card = useStore((s) => s.cards[id])
  const retention = useStore((s) => s.settings.retention)
  // A new word has no card until it's first rated: preview from a fresh one.
  const labels = useMemo(() => previewIntervals(card ?? newCard(), new Date(), retention), [card, retention])
  const buttons: { g: Grade; label: string; color: string }[] = [
    { g: Rating.Again, label: 'Again', color: 'red' },
    { g: Rating.Hard, label: 'Hard', color: 'orange' },
    { g: Rating.Good, label: 'Good', color: 'green' },
    { g: Rating.Easy, label: 'Easy', color: 'blue' },
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
                  {labels[b.g]}
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

interface CardProps {
  word: Word
  id: string
  onRate: (g: Grade) => void
  /** Offered on a word's very first card: skip it as already known. */
  onKnown?: () => void
}

export function RecognitionCard({ word: w, id, onRate, onKnown }: CardProps) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <CardKicker id={id} word={w}>
        What does this mean?
      </CardKicker>
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
      {revealed ? (
        <BottomSheet verdict="neutral">
          <RatingBar id={id} onRate={onRate} />
        </BottomSheet>
      ) : (
        <FrontSheet onFlip={() => setRevealed(true)} onKnown={onKnown} />
      )}
    </>
  )
}

/** EN → FR, in the card style chosen in Settings: flashcard (Anki), fill in the blank, or a mix. */
export function ProductionCard(props: CardProps) {
  const style = useStore((s) => s.settings.cardStyle)
  // Mixed: decided once per card shown, so it doesn't switch while you answer.
  const [coin] = useState(() => Math.random() < 0.5)
  const typed = style === 'type' || (style === 'mixed' && coin)
  return typed ? <TypedProductionCard {...props} /> : <FlipProductionCard {...props} />
}

/** The French example with the word blanked out, when the word appears in it as is. */
function blanked(w: Word): string | null {
  if (!w.ex) return null
  const target = (w.pos === 'n' && w.g && !w.custom ? w.fr : displayFr(w).split(' · ')[0]).trim()
  if (target.length < 2) return null
  const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\p{L}])${esc}(?![\\p{L}])`, 'iu')
  if (!re.test(w.ex)) return null
  return w.ex.replace(re, (_m, pre: string) => `${pre}_____`)
}

function FlipProductionCard({ word: w, id, onRate, onKnown }: CardProps) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const [revealed, setRevealed] = useState(false)
  const withArticle = w.pos === 'n' && w.g && !w.custom
  return (
    <>
      <CardKicker id={id} word={w}>
        Say it in French
      </CardKicker>
      <div className="flash">
        <div className="flash__en">{glossParts(w.en).join(', ')}</div>
        <div className="flash__pos">
          {posLabel(w)}
          {withArticle ? ' — with its article' : ''}
        </div>
        {w.exEn && !revealed && (
          <Box component="p" className="flash__example-en" mt={14}>
            “{w.exEn}”
          </Box>
        )}
        {revealed && (
          <>
            <div className="flash__divider" />
            <Group gap={6} justify="center" aria-live="polite">
              <FrWord w={w} />
              <SpeakButton text={speakText(w)} autoPlay={autoplay} />
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
      {revealed ? (
        <BottomSheet verdict="neutral">
          <RatingBar id={id} onRate={onRate} />
        </BottomSheet>
      ) : (
        <FrontSheet onFlip={() => setRevealed(true)} onKnown={onKnown} />
      )}
    </>
  )
}

type Verdict = 'correct' | 'almost' | 'wrong' | 'partial'
const sheetVerdict = (v: Verdict) => (v === 'correct' ? 'correct' : v === 'wrong' ? 'wrong' : 'almost')
const VERDICT_COLOR = { correct: 'green', almost: 'orange', wrong: 'red' } as const

function TypedProductionCard({ word: w, id, onRate, onKnown }: CardProps) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const strict = useStore((s) => s.settings.strictAccents)
  const say = useSpeak()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<null | { verdict: 'correct' | 'almost' | 'wrong' | 'partial'; expected: string }>(null)
  const ref = useRef<HTMLInputElement>(null)
  const { answers, partial } = productionAnswers(w)
  const blank = useMemo(() => blanked(w), [w])

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
      <CardKicker id={id} word={w}>
        Fill in the blank
      </CardKicker>
      <div className="flash">
        <div className="flash__en">{glossParts(w.en).join(', ')}</div>
        <div className="flash__pos">
          {posLabel(w)}
          {hintArticle ? ' — include the article' : ''}
        </div>
        {!result && blank && (
          <Box component="p" className="flash__example" lang="fr" mt={14}>
            {frTypo(blank)}
          </Box>
        )}
        {w.exEn && !result && (
          <Box component="p" className="flash__example-en" mt={blank ? 4 : 14}>
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
          <Group gap={4}>
            <Button variant="subtle" color="gray" onClick={() => check(true)}>
              Show answer
            </Button>
            {onKnown && (
              <Button variant="subtle" color="gray" onClick={onKnown}>
                I already know this
              </Button>
            )}
          </Group>
        </BottomSheet>
      )}
    </>
  )
}
