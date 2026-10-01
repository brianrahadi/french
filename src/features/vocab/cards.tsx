import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import type { Word } from '../../data/types'
import { SpeakButton, useSpeak } from '../../components/SpeakButton'
import { AccentBar } from '../../components/AccentBar'
import { Diff } from '../../components/Diff'
import { GenderTag, Kbd } from '../../components/ui'
import { checkAnswer, normalize } from '../../lib/answer'
import { useStore } from '../../lib/store'
import { useHotkeys } from '../../lib/hooks'
import { previewIntervals, Rating, State, type Grade } from '../../lib/srs'
import { definite, displayFr, frTypo, glossParts, posLabel, productionAnswers, speakText, startsWithVowelSound } from '../../lib/words'

/* Flashcard building blocks shared by the vocabulary session and the mixed daily session. */

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
    <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'center', gap: 6, textAlign: 'center' }}>
      <div>
        <div className="flash__example" lang="fr">
          {frTypo(w.ex)}
        </div>
        {w.exEn && <div className="flash__example-en">{w.exEn}</div>}
      </div>
      <SpeakButton text={w.ex} size="sm" autoPlay={autoPlay} label="Listen to the example" />
    </div>
  )
}

export function IntroCard({ word: w, onDone }: { word: Word; onDone: (known: boolean) => void }) {
  const autoplay = useStore((s) => s.settings.autoplay)
  useHotkeys({ Enter: () => onDone(false), Space: () => onDone(false), k: () => onDone(true) })
  return (
    <>
      <div className="q-kicker">
        <Sparkles size={15} aria-hidden /> New word · {w.level}
      </div>
      <div className="flash">
        <div className="row" style={{ gap: 6 }}>
          <FrWord w={w} />
          <SpeakButton text={speakText(w)} autoPlay={autoplay} />
        </div>
        <WordMeta w={w} />
        <div className="flash__divider" />
        <div className="flash__en">{w.en}</div>
        {w.ex && <div style={{ marginTop: 22 }}><Example w={w} /></div>}
        {w.note && <p className="flash__note">{w.note}</p>}
      </div>
      <div className="sheet sheet--neutral">
        <div className="sheet__inner" style={{ alignItems: 'center' }}>
          <div className="sheet__body">
            <button type="button" className="btn btn--ghost" onClick={() => onDone(true)}>
              I already know this <Kbd>K</Kbd>
            </button>
          </div>
          <div className="sheet__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => onDone(false)} autoFocus>
              Got it <Kbd>↵</Kbd>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function RatingBar({ id, onRate, suggested }: { id: string; onRate: (g: Grade) => void; suggested?: Grade }) {
  const card = useStore((s) => s.cards[id])
  const retention = useStore((s) => s.settings.retention)
  const labels = useMemo(() => (card ? previewIntervals(card, new Date(), retention) : null), [card, retention])
  const buttons: { g: Grade; label: string; cls: string }[] = [
    { g: Rating.Again, label: 'Again', cls: 'again' },
    { g: Rating.Hard, label: 'Hard', cls: 'hard' },
    { g: Rating.Good, label: 'Good', cls: 'good' },
    { g: Rating.Easy, label: 'Easy', cls: 'easy' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rating-bar" role="group" aria-label="How well did you remember?">
        {buttons.map((b, i) => (
          <button
            key={b.g}
            type="button"
            className={`rate-btn rate-btn--${b.cls}${b.g === suggested ? ' rate-btn--suggested' : ''}`}
            onClick={() => onRate(b.g)}
            aria-keyshortcuts={String(i + 1)}
          >
            {b.label}
            <small>
              {labels?.[b.g] ?? ''}
              <span className="kbd-hint"> · {i + 1}</span>
            </small>
          </button>
        ))}
      </div>
      {card && card.state !== State.New && (
        <div className="subtle small" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Interval: {card.scheduled_days}d · Stability: {card.stability.toFixed(2)}
        </div>
      )}
    </div>
  )
}

export function RecognitionCard({ word: w, id, onRate }: { word: Word; id: string; onRate: (g: Grade) => void }) {
  const autoplay = useStore((s) => s.settings.autoplay)
  const [revealed, setRevealed] = useState(false)
  useHotkeys({ Enter: () => setRevealed(true), Space: () => setRevealed(true) }, { enabled: !revealed })
  return (
    <>
      <div className="q-kicker">What does this mean?</div>
      <div className="flash">
        <div className="row" style={{ gap: 6 }}>
          <FrWord w={w} />
          <SpeakButton text={speakText(w)} autoPlay={autoplay} />
        </div>
        <WordMeta w={w} />
        {revealed && (
          <>
            <div className="flash__divider" />
            <div className="flash__en" aria-live="polite">
              {w.en}
            </div>
            {w.ex && <div style={{ marginTop: 22 }}><Example w={w} /></div>}
            {w.note && <p className="flash__note">{w.note}</p>}
          </>
        )}
      </div>
      <div className="sheet sheet--neutral">
        <div className="sheet__inner" style={{ justifyContent: 'center' }}>
          {revealed ? (
            <RatingBar id={id} onRate={onRate} />
          ) : (
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => setRevealed(true)} style={{ maxWidth: 420 }}>
              Show answer <Kbd>Space</Kbd>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

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
      <div className="q-kicker">Say it in French</div>
      <div className="flash">
        <div className="flash__en">{glossParts(w.en).join(', ')}</div>
        <div className="flash__pos">
          {posLabel(w)}
          {hintArticle ? ' — include the article' : ''}
        </div>
        {w.exEn && !result && <p className="flash__example-en" style={{ marginTop: 14 }}>“{w.exEn}”</p>}
        {result && (
          <>
            <div className="flash__divider" />
            <div className="row" style={{ gap: 6 }}>
              <FrWord w={w} />
              <SpeakButton text={speakText(w)} />
            </div>
            {w.pos === 'n' && w.g && !w.both && (startsWithVowelSound(w.fr) || w.pl) && (
              <div className="flash__pos">
                <GenderTag g={w.g} />
              </div>
            )}
            {w.ex && <div style={{ marginTop: 18 }}><Example w={w} /></div>}
            {w.note && <p className="flash__note">{w.note}</p>}
          </>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
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
      </div>

      <div className={`sheet ${result ? `sheet--${result.verdict === 'correct' ? 'correct' : result.verdict === 'wrong' ? 'wrong' : 'almost'} sheet--animate` : 'sheet--neutral'}`}>
        <div className="sheet__inner" style={result ? { flexDirection: 'column', alignItems: 'stretch' } : { alignItems: 'center' }}>
          {result ? (
            <>
              <div className="sheet__title" aria-live="assertive">
                {result.verdict === 'correct' && (
                  <>
                    <CheckCircle2 size={22} aria-hidden /> Correct !
                  </>
                )}
                {result.verdict === 'almost' && 'Almost — watch the accents'}
                {result.verdict === 'partial' && 'Right word — now add the article to learn its gender'}
                {result.verdict === 'wrong' && (value.trim() ? 'Not quite' : 'Here’s the answer')}
              </div>
              {result.verdict !== 'correct' && value.trim() && (
                <div className="sheet__answer">
                  <Diff given={value} expected={result.expected} />
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <RatingBar id={id} onRate={onRate} suggested={suggested} />
              </div>
            </>
          ) : (
            <>
              <div className="sheet__body">
                <button type="button" className="btn btn--ghost" onClick={() => check(true)}>
                  Show answer
                </button>
              </div>
              <div className="sheet__actions">
                <button type="button" className="btn btn--primary btn--lg" disabled={!value.trim()} onMouseDown={(e) => e.preventDefault()} onClick={() => check()}>
                  Check <Kbd>↵</Kbd>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
