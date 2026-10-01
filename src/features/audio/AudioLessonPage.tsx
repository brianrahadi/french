import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, AudioLines, Check, Eye, EyeOff, Headphones, Mic, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { AUDIO_BY_ID, AUDIO_LESSONS } from '../../data/audio'
import type { AudioLessonDef } from '../../data/types'
import { Callout, Empty, LevelBadge, ProgressBar } from '../../components/ui'
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
      <div className="page">
        <Link to="/audio" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Audio lessons
        </Link>
        <Empty icon={<AudioLines size={30} />} title="This lesson isn’t here">
          <Link to="/audio">Back to the lessons</Link>
        </Empty>
      </div>
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
      logActivityBulk(steps.filter((s) => s.kind === 'turn' && !s.repeat).length, 0)
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

  return (
    <div className="page page--narrow">
      <Link to="/audio" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Audio lessons
      </Link>
      <header className="reader-head">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <LevelBadge level={lesson.level} />
          <span className="small subtle">
            Lesson {index + 1} · about {minutesOf(total)} min
          </span>
          {saved?.done && (
            <span className="badge badge--success">
              <Check size={12} aria-hidden /> done
            </span>
          )}
        </div>
        <h1 className="page-title fr" lang="fr">
          {frTypo(lesson.title)}
        </h1>
        <p className="muted">{lesson.titleEn}</p>
      </header>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons don’t work here. Try Chrome, Edge or Safari.</Callout>}

      <section className="card audio-now" aria-live="polite">
        {finished ? (
          <div className="audio-now__done">
            <span className="audio-now__icon audio-now__icon--done">
              <Check size={22} aria-hidden />
            </span>
            <div>
              <div className="audio-now__label">Lesson complete — bravo !</div>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Do one lesson a day. If you got fewer than about 80% right, repeat this one tomorrow before moving on.
              </p>
            </div>
          </div>
        ) : step.kind === 'turn' ? (
          <>
            <div className="audio-now__head">
              <span className="audio-now__icon audio-now__icon--turn">
                <Mic size={20} aria-hidden />
              </span>
              <span className="audio-now__label">{step.repeat ? 'Repeat out loud' : 'Your turn — say it out loud'}</span>
            </div>
            {!step.repeat && <p className="audio-now__cue">{step.cue}</p>}
            {showFr && (
              <p className="audio-now__fr fr" lang="fr">
                {frTypo(step.answer)}
              </p>
            )}
            {playing && (
              <div key={i} className="audio-countdown" style={{ animationDuration: `${turnSeconds(step.answer, pause, step.repeat)}s` }} aria-hidden />
            )}
          </>
        ) : (
          <>
            <div className="audio-now__head">
              <span className="audio-now__icon">
                <Headphones size={20} aria-hidden />
              </span>
              <span className="audio-now__label">{step.kind === 'fr' ? (step.slow ? 'Listen carefully' : 'Listen') : playing ? 'Listen' : 'Ready'}</span>
            </div>
            {step.kind === 'en' && <p className="audio-now__cue">{step.text}</p>}
            {step.kind === 'fr' && (
              <p className="audio-now__fr fr" lang="fr">
                {showFr ? frTypo(step.text) : '• • •'}
              </p>
            )}
          </>
        )}

        <div className="story-player__controls" style={{ marginTop: 18 }}>
          <button type="button" className="icon-btn" onClick={back} aria-label="Back" title="Back" disabled={finished}>
            <SkipBack size={18} aria-hidden />
          </button>
          <button type="button" className="btn btn--primary story-player__main" onClick={toggle} disabled={!speechSupported}>
            {playing ? <Pause size={20} aria-hidden /> : finished ? <RotateCcw size={18} aria-hidden /> : <Play size={20} aria-hidden />}
            {playing ? 'Pause' : finished ? 'Play again' : i > 0 ? 'Resume' : 'Start'}
          </button>
          <button type="button" className="icon-btn" onClick={forward} aria-label="Skip" title="Skip" disabled={finished}>
            <SkipForward size={18} aria-hidden />
          </button>
          <div className="spacer" />
          <button type="button" className="btn btn--ghost btn--sm" aria-pressed={showFr} onClick={() => setShowFr((v) => !v)}>
            {showFr ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />} French text
          </button>
        </div>
        <div className="story-player__progress">
          <ProgressBar value={progress} label="Lesson progress" thin />
          <span className="subtle small tnum">{finished ? 'done' : `${minutesOf(left)} min left`}</span>
        </div>
      </section>

      {finished && next && (
        <Link to={`/audio/${next.id}`} className="btn btn--primary" style={{ marginTop: 14 }}>
          Next: {frTypo(next.title)} <ArrowRight size={16} aria-hidden />
        </Link>
      )}

      <div className="audio-settings">
        <span className="small muted">Time to answer</span>
        <div className="segmented" role="group" aria-label="Time to answer">
          {PAUSES.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={pause === p.factor}
              onClick={() => {
                setPause(p.factor)
                try {
                  localStorage.setItem(PAUSE_KEY, String(p.factor))
                } catch {
                  /* private mode */
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 24 }}>
        In this lesson
      </h2>
      <ol className="audio-parts">
        {parts.map((title, p) => {
          const first = steps.findIndex((s) => s.part === p)
          const state = finished || step.part > p ? 'done' : step.part === p ? 'now' : ''
          return (
            <li key={p}>
              <button type="button" className={`audio-part${state ? ` audio-part--${state}` : ''}`} onClick={() => go(first)}>
                <span className="audio-part__mark" aria-hidden>
                  {state === 'done' ? <Check size={13} /> : p + 1}
                </span>
                <span>{title}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <p className="small subtle" style={{ marginTop: 18 }}>
        How it works: listen, and when you’re asked something, answer <strong>out loud</strong> before the answer comes — even if
        you’re not sure. That effort is what makes it stick. No need to look at the screen.
      </p>
    </div>
  )
}
