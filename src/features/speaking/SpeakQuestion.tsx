import { useEffect, useState, type ReactNode } from 'react'
import { Ear, Mic, Play, RotateCcw, Snail, Square, Volume2 } from 'lucide-react'
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
      <div className="q-kicker">{mode === 'read' ? 'Read this sentence aloud' : 'Listen, then say it back'}</div>

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
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRevealed(true)}>
            Show the sentence
          </button>
        )}
      </div>
      {revealed && <p className="say-en">{sentence.en}</p>}

      <div className="say-controls">
        <button type="button" className={`btn btn--secondary${speaking ? ' is-playing' : ''}`} onClick={() => listen(false)} disabled={listening}>
          <Volume2 size={17} aria-hidden /> Listen
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => listen(true)} disabled={listening} aria-label="Listen slowly">
          <Snail size={16} aria-hidden />
        </button>

        <button
          type="button"
          className={`mic-btn${listening ? ' mic-btn--on' : ''}`}
          onClick={toggleMic}
          disabled={busy || done}
          aria-label={listening ? 'Stop recording' : 'Start recording'}
          aria-pressed={listening}
          ref={(el) => {
            cap.meterRef.current = el
          }}
        >
          {listening ? <Square size={24} aria-hidden /> : <Mic size={28} aria-hidden />}
        </button>

        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => playUrl(cap.result?.audioUrl ?? null)}
          disabled={!cap.result?.audioUrl || listening}
        >
          <Play size={16} aria-hidden /> You
        </button>
      </div>

      <div className="say-status" role="status" aria-live="polite">
        {cap.state === 'idle' && !attempts && (
          <span className="subtle">
            Tap the microphone{' '}
            <span className="hide-sm">
              or press <Kbd>Space</Kbd>
            </span>{' '}
            and speak.
          </span>
        )}
        {cap.state === 'starting' && <span className="subtle">Starting the microphone…</span>}
        {listening && (
          <span className="say-live">
            <Ear size={15} aria-hidden /> {cap.interim ? `« ${cap.interim} »` : recordOnly || cap.mode === 'ai' ? 'Recording… tap to stop' : 'Listening…'}
          </span>
        )}
        {cap.state === 'processing' && <span className="subtle">Transcribing…</span>}
        {cap.state === 'error' && <span className="text-danger">{cap.error}</span>}
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
        {cap.state === 'done' && recordOnly && <span className="subtle">Compare your recording with the model, then rate yourself.</span>}
      </div>

      {tips.length > 0 && cap.state === 'done' && (
        <ul className="say-tips">
          {tips.map((t) => (
            <li key={t.id}>
              <span className="badge">{t.label}</span> {t.tip}
            </li>
          ))}
        </ul>
      )}

      {recordOnly && attempts > 0 && !done && (
        <div className="row-wrap say-self" role="group" aria-label="How did it sound?">
          {[
            ['Needs work', 40],
            ['Good', 75],
            ['Great', 95],
          ].map(([label, v]) => (
            <button
              key={label}
              type="button"
              className="chip"
              aria-pressed={selfScore === v}
              onClick={() => setSelfScore(v as number)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {score === null ? (
        <CheckBar onSkip={next} skipLabel="Skip" />
      ) : (
        <div className={`sheet sheet--${verdict(score)} say-sheet`}>
          <div className="sheet__inner">
            <div className="sheet__body">
              <div className="sheet__title" style={{ marginBottom: 2 }}>
                {score >= 90 ? 'Très bien\u00a0!' : score >= 60 ? 'Pas mal\u00a0!' : 'Keep practising'}
              </div>
              <p className="small" style={{ margin: 0 }}>
                {recordOnly
                  ? 'Comparing yourself with a native model is one of the best ways to improve.'
                  : `Best: ${score}% of the words understood${attempts > 1 ? ` · ${attempts} tries` : ''}`}
              </p>
            </div>
            <div className="sheet__actions">
              <button type="button" className="btn btn--ghost" onClick={toggleMic} disabled={busy || listening}>
                <RotateCcw size={16} aria-hidden /> Try again
              </button>
              <button type="button" className="btn btn--lg btn--primary" onClick={next} disabled={listening}>
                Next <Kbd>↵</Kbd>
              </button>
            </div>
          </div>
        </div>
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
