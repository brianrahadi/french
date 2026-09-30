import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Mic, Play } from 'lucide-react'
import { LEVELS } from '../../data/types'
import { SOUND_SETS } from '../../data/sounds'
import { Callout, Kbd, Stat } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { captureMode, micSupported } from '../../lib/recognition'
import { useAiConfig } from '../../lib/ai'
import { frTypo } from '../../lib/words'
import { poolFor, type SentenceSource } from '../listening/sentences'
import type { SpeakMode } from './SpeakQuestion'

export default function SpeakingPage() {
  useDocumentTitle('Speaking')
  const navigate = useNavigate()
  const state = useStore()
  const ai = useAiConfig()
  const mode = useMemo(() => captureMode(), [ai]) // eslint-disable-line react-hooks/exhaustive-deps
  const [how, setHow] = useState<SpeakMode>('read')
  const [src, setSrc] = useState<SentenceSource>(() => (Object.keys(state.introduced).length >= 8 ? 'mine' : state.startLevel ?? 'A1'))
  const [n, setN] = useState(8)
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const start = (source: SentenceSource = src, count = n) =>
    navigate(`/speaking/session?src=${encodeURIComponent(source)}&mode=${how}&n=${count}`)
  useHotkeys({ Enter: () => micSupported && start() })

  const stats = Object.values(state.speaking)
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.best, 0) / stats.length) : 0
  const since = Date.now() - 30 * 86_400_000
  const words = new Map<string, number>()
  for (const m of state.mistakes)
    if (m.source === 'speaking' && !m.resolved && new Date(m.at).getTime() > since) words.set(m.expected, (words.get(m.expected) ?? 0) + 1)
  const hard = [...words.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Expression orale</div>
          <h1 className="page-title">Speaking</h1>
          <p className="page-subtitle">
            Read sentences aloud or repeat after a native voice. Speech recognition shows which words came across clearly, and
            you can play your recording next to the model.
          </p>
        </div>
      </header>

      {!micSupported ? (
        <Callout kind="warn">This page can’t use a microphone here. Open the app over https (or on localhost) in a recent browser.</Callout>
      ) : mode === 'record' ? (
        <Callout kind="warn">
          This browser can’t turn speech into text (Firefox and Brave don’t), so you’ll record yourself and compare by ear. For
          automatic feedback, use Chrome, Edge or Safari — or connect <Link to="/settings#ai">OpenAI or Gemini</Link> to
          transcribe your recordings.
        </Callout>
      ) : mode === 'ai' ? (
        <Callout kind="tip">
          This browser can’t transcribe speech itself, so your recordings are transcribed by {ai?.name}.
        </Callout>
      ) : null}

      <section className="card practice-setup" aria-labelledby="say-setup">
        <h2 id="say-setup" className="card__title">
          Practise sentences
        </h2>
        <div className="practice-setup__row">
          <span className="setup-label">Exercise</span>
          <div className="segmented" role="group" aria-label="Exercise">
            <button type="button" aria-pressed={how === 'read'} onClick={() => setHow('read')}>
              Read aloud
            </button>
            <button type="button" aria-pressed={how === 'repeat'} onClick={() => setHow('repeat')}>
              Listen &amp; repeat
            </button>
          </div>
        </div>
        <div className="practice-setup__row">
          <span className="setup-label">Sentences from</span>
          <div className="row-wrap" style={{ gap: 6 }} role="group" aria-label="Sentences from">
            <button type="button" className="chip" aria-pressed={src === 'mine'} onClick={() => setSrc('mine')}>
              My words
            </button>
            {LEVELS.map((l) => (
              <button key={l} type="button" className="chip" aria-pressed={src === l} onClick={() => setSrc(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="practice-setup__row">
          <span className="setup-label">Length</span>
          <div className="segmented" role="group" aria-label="Number of sentences">
            {[5, 8, 12].map((x) => (
              <button key={x} type="button" aria-pressed={n === x} onClick={() => setN(x)}>
                {x} sentences
              </button>
            ))}
          </div>
        </div>
        <div className="practice-setup__foot">
          <span className="small muted">
            {how === 'read' ? 'You see the sentence, then say it.' : 'You hear it first; the text appears after you speak.'} ·{' '}
            {pool.length} sentences
          </span>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => start()} disabled={!micSupported || !pool.length}>
            <Play size={18} aria-hidden /> Start <Kbd>↵</Kbd>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>Tricky sounds</span>
        </div>
        <div className="sound-grid">
          {SOUND_SETS.map((set) => (
            <button
              key={set.id}
              type="button"
              className="card card--interactive sound-card"
              onClick={() => start(`sound:${set.id}`, set.sentences.length)}
              disabled={!micSupported}
            >
              <span className="sound-card__sound fr">{set.sound}</span>
              <span className="card__title">{set.title}</span>
              <span className="small muted sound-card__tip">{set.tip}</span>
              <span className="sound-card__cta small">
                {set.sentences.length} sentences <ArrowRight size={14} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>

      {stats.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>Your speaking</span>
          </div>
          <div className="stats">
            <Stat label="Sentences spoken" value={stats.length} />
            <Stat label="Average best" value={avg} unit="%" />
            <Stat label="Clear (90%+)" value={stats.filter((x) => x.best >= 90).length} />
            <Stat label="Attempts" value={stats.reduce((a, x) => a + x.n, 0)} />
          </div>
        </section>
      )}

      {hard.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>
              <Mic size={16} aria-hidden style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Words that didn’t come across
            </span>
          </div>
          <div className="card">
            <div className="row-wrap" style={{ gap: 8 }}>
              {hard.map(([w, c]) => (
                <span key={w} className="word-chip">
                  <SpeakButton text={w} size="sm" />
                  <span className="fr" lang="fr">
                    {frTypo(w)}
                  </span>
                  <span className="subtle small tnum">×{c}</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
