import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Check, Eye, EyeOff, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react'
import { STORY_BY_ID, storyMinutes } from '../../data/stories'
import type { StoryDef } from '../../data/types'
import { Callout, Empty, LevelBadge, ProgressBar, Rich } from '../../components/ui'
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
      <div className="page">
        <Link to="/listening" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Listening
        </Link>
        <Empty icon={<Headphones size={30} />} title="This story isn’t here">
          <Link to="/listening">Back to the stories</Link>
        </Empty>
      </div>
    )
  return <Story key={story.id} story={story} />
}

type Step = 'listen' | 'questions' | 'results'

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
    <div className="page page--reader">
      <Link to="/listening" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Listening
      </Link>
      <header className="reader-head">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <LevelBadge level={story.level} />
          <span className="small subtle">
            {story.topic} · {storyMinutes(story)} min · {story.questions.length} questions
          </span>
          {best !== undefined && <span className="badge tnum">best {best}%</span>}
        </div>
        <h1 className="page-title fr" lang="fr">
          {frTypo(story.title)}
        </h1>
        <p className="muted">{story.titleEn}</p>
      </header>

      <div className="story-steps" aria-label="Steps">
        {(['listen', 'questions', 'results'] as Step[]).map((s, i) => (
          <span key={s} className={`story-steps__item${step === s ? ' is-current' : ''}`}>
            {i + 1}. {s === 'listen' ? 'Listen' : s === 'questions' ? 'Answer' : 'Check'}
          </span>
        ))}
      </div>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud. Try Chrome, Edge or Safari, or read the text instead.</Callout>}

      {/* ── Player (always available, smaller after the listening step) */}
      <section className={`card story-player${step !== 'listen' ? ' story-player--compact' : ''}`} aria-label="Audio player">
        <div className="story-player__controls">
          <button type="button" className="icon-btn" onClick={() => jump(current - 1)} aria-label="Previous sentence" title="Previous sentence">
            <SkipBack size={18} aria-hidden />
          </button>
          {playing === 'playing' ? (
            <button type="button" className="btn btn--primary story-player__main" onClick={pause}>
              <Pause size={20} aria-hidden /> Pause
            </button>
          ) : (
            <button type="button" className="btn btn--primary story-player__main" onClick={() => play()} disabled={!speechSupported}>
              <Play size={20} aria-hidden /> {playing === 'paused' ? 'Resume' : listens ? 'Listen again' : 'Listen'}
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => jump(current + 1)} aria-label="Next sentence" title="Next sentence">
            <SkipForward size={18} aria-hidden />
          </button>
          <button type="button" className="icon-btn" onClick={restart} aria-label="From the start" title="From the start" disabled={!speechSupported}>
            <RotateCcw size={17} aria-hidden />
          </button>
          <div className="spacer" />
          <div className="segmented" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button key={s.label} type="button" aria-pressed={speed === s.factor} onClick={() => setSpeed(s.factor)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="story-player__progress">
          <ProgressBar value={progress} label={`Sentence ${current + 1} of ${sentences.length}`} thin />
          <span className="subtle small tnum">
            {current + 1}/{sentences.length}
            {listens > 0 && ` · heard ${listens}×`}
          </span>
        </div>
        {step === 'listen' && (
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            Listen without the text first — as many times as you like. Get the gist, then the details. When you’re ready,
            answer the questions.
          </p>
        )}
      </section>

      {/* ── Step 1: listening */}
      {step === 'listen' && (
        <div className="row-wrap" style={{ justifyContent: 'space-between', marginTop: 16 }}>
          <button type="button" className="btn btn--ghost" onClick={() => setShowText((v) => !v)}>
            {showText ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />} {showText ? 'Hide the text' : 'Peek at the text'}
          </button>
          <button type="button" className="btn btn--primary" onClick={goQuestions}>
            Answer the questions
          </button>
        </div>
      )}

      {/* ── Step 2: questions */}
      {step === 'questions' && (
        <section className="stack-lg" style={{ marginTop: 20 }} aria-label="Questions">
          {story.questions.map((q, qi) => (
            <div key={qi} className="card story-q">
              <div className="story-q__prompt">
                <span className="subtle small">Question {qi + 1}</span>
                <div>
                  <Rich text={q.prompt} />
                </div>
              </div>
              <div className="options" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((o, oi) => (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={answers[qi] === oi}
                    className={`option${answers[qi] === oi ? ' option--selected' : ''}`}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  >
                    <span className="option__key" aria-hidden>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{frTypo(o)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">
              {answered}/{story.questions.length} answered
            </span>
            <button type="button" className="btn btn--primary btn--lg" onClick={submit} disabled={answered < story.questions.length}>
              <Check size={18} aria-hidden /> Check my answers
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3: results */}
      {step === 'results' && (
        <section className="stack-lg" style={{ marginTop: 20 }} aria-label="Results">
          <div className="card story-score">
            <div className={`story-score__num tnum ${pct === 100 ? 'text-success' : pct >= 60 ? '' : 'text-danger'}`}>{pct}%</div>
            <div>
              <div className="card__title">
                {correct} of {story.questions.length} right
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                {pct === 100
                  ? 'Perfect comprehension. Now listen once more with the text to catch every word.'
                  : 'Read the text below, then listen again while following it — the bits you missed usually become clear.'}
              </p>
            </div>
            <button type="button" className="btn btn--secondary" onClick={retry}>
              <RotateCcw size={16} aria-hidden /> Try again
            </button>
          </div>
          <div className="card card--flush">
            {story.questions.map((q, qi) => {
              const ok = answers[qi] === q.answer
              return (
                <div key={qi} className="list-row story-result">
                  <span className={`story-result__mark ${ok ? 'is-ok' : 'is-wrong'}`} aria-label={ok ? 'Right' : 'Wrong'}>
                    {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
                  </span>
                  <div className="story-result__body">
                    <div className="story-result__q">
                      <Rich text={q.prompt} />
                    </div>
                    <div className="small">
                      {!ok && (
                        <span className="story-result__wrong fr" lang="fr">
                          {frTypo(q.options[answers[qi]])}
                        </span>
                      )}
                      <span className="story-result__right fr" lang="fr">
                        {frTypo(q.options[q.answer])}
                      </span>
                    </div>
                    {q.explain && (
                      <div className="small subtle">
                        <Rich text={q.explain} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Transcript */}
      {showText && (
        <section style={{ marginTop: 24 }} aria-label="Transcript">
          <div className="row-wrap" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              <span>Transcript</span>
            </h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
              {showEn ? 'Hide translation' : 'Show translation'}
            </button>
          </div>
          <p className="hint">Tap any word to see what it means and add it to your flashcards.</p>
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
        </section>
      )}
    </div>
  )
}
