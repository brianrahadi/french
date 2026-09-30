import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { RotateCcw, Trophy } from 'lucide-react'
import { LESSON_BY_ID, nextLesson } from '../../data/grammar'
import type { Exercise } from '../../data/types'
import { FocusShell } from '../../components/FocusShell'
import { PASS_MARK, useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import type { Graded } from './grade'
import { frTypo } from '../../lib/words'
import { GrammarQuestion, promptText } from './GrammarQuestion'

interface Mistake {
  ex: Exercise
  given: string
  expected: string
}

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PracticeSession() {
  const { id = '' } = useParams()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const prev = useStore((s) => s.lessons[id])
  const recordLesson = useStore((s) => s.recordLesson)
  const logActivity = useStore((s) => s.logActivity)
  useDocumentTitle(lesson ? `Practice · ${lesson.title}` : 'Practice')

  // First attempt keeps the teaching order; reviews are shuffled.
  const initial = useMemo(
    () => (lesson ? (prev?.best ? shuffled(lesson.exercises.length) : lesson.exercises.map((_, i) => i)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson],
  )
  const [queue, setQueue] = useState<number[]>(initial)
  const [pos, setPos] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({})
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [done, setDone] = useState(false)
  const [retried, setRetried] = useState<Set<number>>(new Set())

  if (!lesson) {
    return (
      <div className="page">
        <p>Lesson not found. <Link to="/grammar">Back to grammar</Link></p>
      </div>
    )
  }

  const total = lesson.exercises.length
  const exIndex = queue[pos]
  const ex = lesson.exercises[exIndex]
  const answeredFirst = Object.keys(firstTry).length
  const score = answeredFirst ? Object.values(firstTry).filter(Boolean).length / total : 0

  const onAnswered = (g: Graded) => {
    setAnswered(true)
    logActivity(g.pass)
    if (!(exIndex in firstTry)) {
      setFirstTry((f) => ({ ...f, [exIndex]: g.pass }))
      if (!g.pass) setMistakes((m) => [...m, { ex, given: g.given, expected: g.expected }])
    }
    // Wrong answers come back once at the end of the session.
    if (!g.pass && !retried.has(exIndex)) {
      setQueue((q) => [...q, exIndex])
      setRetried((r) => new Set(r).add(exIndex))
    }
  }

  const next = (q = queue, ft = firstTry) => {
    if (pos + 1 >= q.length) {
      const final = Object.values(ft).filter(Boolean).length / total
      recordLesson(lesson.id, final)
      setDone(true)
      return
    }
    setPos((p) => p + 1)
    setAnswered(false)
  }

  const restart = () => {
    setQueue(shuffled(total))
    setPos(0)
    setAnswered(false)
    setFirstTry({})
    setMistakes([])
    setRetried(new Set())
    setDone(false)
  }

  const overrideCorrect = () => {
    const ft = { ...firstTry, [exIndex]: true }
    const q = queue[queue.length - 1] === exIndex && queue.length - 1 > pos ? queue.slice(0, -1) : queue
    setFirstTry(ft)
    setMistakes((m) => m.filter((x) => x.ex !== ex))
    setQueue(q)
    next(q, ft)
  }

  if (done) {
    const passed = score >= PASS_MARK
    const nl = nextLesson(lesson.id)
    return (
      <FocusShell progress={1} exitTo={`/grammar/${lesson.id}`} label="Practice" count={`${total}/${total}`}>
        <div className="results">
          <Trophy size={40} color={passed ? 'var(--success)' : 'var(--warning)'} aria-hidden />
          <div className="results__score tnum">{Math.round(score * 100)}%</div>
          <h1 className="results__title">
            {passed ? (score === 1 ? 'Parfait\u00a0!' : 'Bien joué\u00a0!') : score >= 0.5 ? 'Presque\u00a0!' : 'On continue\u00a0!'}
          </h1>
          <p className="muted" style={{ maxWidth: 440 }}>
            {passed
              ? `You’ve mastered “${lesson.title}”. We’ll bring it back for a quick review so it sticks.`
              : `You need ${Math.round(PASS_MARK * 100)}% to master this lesson. Re-read the tricky parts and try again — mistakes are how it sticks.`}
          </p>
          <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 18 }}>
            {!passed && (
              <button className="btn btn--primary btn--lg" onClick={() => navigate(`/grammar/${lesson.id}`)} autoFocus>
                Review the lesson
              </button>
            )}
            <button className="btn btn--lg btn--secondary" onClick={restart}>
              <RotateCcw size={17} aria-hidden /> Practice again
            </button>
            {passed && nl && (
              <button className="btn btn--primary btn--lg" onClick={() => navigate(`/grammar/${nl.id}`)} autoFocus>
                Next: {nl.title}
              </button>
            )}
            {passed && !nl && (
              <button className="btn btn--primary btn--lg" onClick={() => navigate('/grammar')} autoFocus>
                Back to grammar
              </button>
            )}
          </div>
          {mistakes.length > 0 && (
            <div className="card card--flush mistake-list">
              <div className="section-title" style={{ padding: '14px 18px 0', margin: 0 }}>
                To review
              </div>
              {mistakes.map((m, i) => (
                <div key={i} className="mistake">
                  <div className="mistake__q">{promptText(m.ex)}</div>
                  <div className="mistake__a" lang="fr">
                    {m.given && <span className="mistake__yours">{m.given}</span>}
                    <strong>{frTypo(m.expected)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      progress={pos / queue.length}
      count={`${Math.min(answeredFirst + (answered ? 0 : 1), total)}/${total}`}
      exitTo={`/grammar/${lesson.id}`}
      label="Practice"
    >
      <GrammarQuestion
        key={pos}
        ex={ex}
        context={pos >= total ? <span className="badge badge--warning" style={{ marginBottom: 10 }}>Retry</span> : undefined}
        onAnswered={onAnswered}
        onContinue={() => next()}
        onOverride={overrideCorrect}
      />
    </FocusShell>
  )
}
