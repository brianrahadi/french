import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Eye, Snail, Volume2 } from 'lucide-react'
import { AccentBar } from '../../components/AccentBar'
import { CheckBar } from '../../components/CheckBar'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { MarkedText } from '../../components/MarkedText'
import { Kbd } from '../../components/ui'
import { gradeDictation, LISTEN_CATEGORIES, type DictationMark, type DictationResult, type ListenCategory } from '../../lib/french'
import { speak, stopSpeaking } from '../../lib/speech'
import { useStore } from '../../lib/store'
import { praise } from '../grammar/grade'
import type { PracticeSentence } from './sentences'

export interface DictationAnswer {
  sentence: PracticeSentence
  typed: string
  result: DictationResult
  plays: number
}

export const verdictFor = (r: DictationResult): 'correct' | 'almost' | 'wrong' => (r.perfect ? 'correct' : r.score >= 70 ? 'almost' : 'wrong')

/** One dictation sentence: listen (normal or slow), type, check. Mount with a fresh key. */
export function DictationQuestion({
  sentence,
  context,
  onAnswered,
  onContinue,
}: {
  sentence: PracticeSentence
  context?: ReactNode
  onAnswered: (a: DictationAnswer) => void
  onContinue: () => void
}) {
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const [value, setValue] = useState('')
  const [answer, setAnswer] = useState<DictationAnswer | null>(null)
  const [plays, setPlays] = useState(0)
  const [playing, setPlaying] = useState<'normal' | 'slow' | null>(null)
  const [showCount, setShowCount] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)

  const play = (slow = false) => {
    speak(sentence.fr, {
      voiceURI,
      rate: slow ? Math.max(0.5, rate * 0.68) : rate,
      onStart: () => setPlaying(slow ? 'slow' : 'normal'),
      onEnd: () => setPlaying(null),
    })
    setPlays((p) => p + 1)
    input.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const t = setTimeout(() => play(), 350)
    return () => {
      clearTimeout(t)
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Grow with the text.
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])

  const check = (giveUp = false) => {
    if (answer) return
    const typed = giveUp ? '' : value
    const result = gradeDictation(sentence.fr, typed)
    const a = { sentence, typed, result, plays }
    setAnswer(a)
    onAnswered(a)
  }

  const words = sentence.fr.trim().split(/\s+/).length
  const r = answer?.result

  return (
    <>
      {context}
      <div className="q-kicker">Listen and write what you hear</div>
      <div className="listen-player">
        <button
          type="button"
          className={`listen-play${playing === 'normal' ? ' is-playing' : ''}`}
          onClick={() => play(false)}
          aria-label="Play the sentence"
        >
          <Volume2 size={30} aria-hidden />
        </button>
        <div className="stack" style={{ gap: 6, alignItems: 'flex-start' }}>
          <button type="button" className={`btn btn--secondary btn--sm${playing === 'slow' ? ' is-playing' : ''}`} onClick={() => play(true)}>
            <Snail size={16} aria-hidden /> Slower
          </button>
          <span className="subtle small">
            {plays > 1 ? `Played ${plays}×` : 'Replay as often as you like'}
            <span className="hide-sm">
              {' '}
              · <Kbd>⇧↵</Kbd>
            </span>
          </span>
        </div>
        <button type="button" className="chip chip--sm listen-count" aria-pressed={showCount} onClick={() => setShowCount((v) => !v)}>
          <Eye size={14} aria-hidden /> {showCount ? `${words} words` : 'Word count'}
        </button>
      </div>

      {!r ? (
        <>
          <textarea
            ref={input}
            className="answer-input dictation-input fr"
            lang="fr"
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                play(false)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (value.trim()) check()
              }
            }}
            placeholder="Type the sentence…"
            aria-label="What you heard"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <AccentBar inputRef={input} onInsert={setValue} />
          <CheckBar onCheck={() => check()} disabled={!value.trim()} onSkip={() => check(true)} skipLabel="Show me" />
        </>
      ) : (
        <>
          <DictationFeedback answer={answer!} />
          <FeedbackSheet
            verdict={verdictFor(r)}
            title={r.perfect ? praise() : r.score >= 70 ? `Almost — ${r.score}%` : answer!.typed.trim() ? `${r.score}% — listen again` : 'Here it is'}
            onContinue={onContinue}
            secondary={
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => play(true)}>
                <Snail size={15} aria-hidden /> Hear it slowly
              </button>
            }
          >
            <CategoryTips categories={r.categories} />
          </FeedbackSheet>
        </>
      )}
    </>
  )
}

function markClass(m: DictationMark): string {
  return `dmark dmark--${m.kind === 'sub' ? 'wrong' : m.kind}`
}

/** The sentence with each word marked, what the learner typed, and the translation. */
export function DictationFeedback({ answer }: { answer: DictationAnswer }) {
  const { result: r, sentence, typed } = answer
  const byE = new Map<number, DictationMark>()
  const byG = new Map<number, DictationMark>()
  for (const m of r.marks) {
    if (m.e !== undefined) byE.set(m.e, m)
    if (m.g !== undefined) byG.set(m.g, m)
  }
  return (
    <div className="dict-feedback">
      <div className="dict-line fr" lang="fr">
        <MarkedText
          text={sentence.fr}
          tokens={r.exp}
          render={(i, c) => {
            const m = byE.get(i)
            if (!m || m.kind === 'ok') return <span className="dmark dmark--ok">{c}</span>
            return (
              <span className={markClass(m)} title={m.kind === 'miss' ? 'missed' : `you wrote “${m.given}”`}>
                {c}
              </span>
            )
          }}
        />
      </div>
      {typed.trim() && !r.perfect && (
        <div className="dict-given">
          <span className="diff__label">You wrote</span>
          <span className="fr" lang="fr">
            <MarkedText
              text={typed}
              tokens={r.giv}
              render={(i, c) => {
                const m = byG.get(i)
                if (!m || m.kind === 'ok') return null
                return m.kind === 'extra' ? <del className="dmark dmark--extra">{c}</del> : <span className={markClass(m)}>{c}</span>
              }}
            />
          </span>
        </div>
      )}
      <p className="dict-en">{sentence.en}</p>
    </div>
  )
}

export function CategoryTips({ categories }: { categories: Partial<Record<ListenCategory, number>> }) {
  const cats = (Object.keys(categories) as ListenCategory[]).sort((a, b) => (categories[b] ?? 0) - (categories[a] ?? 0))
  if (!cats.length) return null
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row-wrap" style={{ gap: 6 }}>
        {cats.map((c) => (
          <span key={c} className="badge badge--warning">
            {LISTEN_CATEGORIES[c].label} × {categories[c]}
          </span>
        ))}
      </div>
      <p className="sheet__explain" style={{ margin: 0 }}>
        {LISTEN_CATEGORIES[cats[0]].tip}
      </p>
    </div>
  )
}
