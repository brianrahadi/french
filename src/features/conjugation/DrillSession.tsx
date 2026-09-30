import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { RotateCcw, Trophy } from 'lucide-react'
import { TENSE_BY_ID, type Tense } from '../../lib/conjugate'
import { FocusShell } from '../../components/FocusShell'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { fullForm, makeDrill, poolFor, type DrillItem } from './drill'
import { frTypo } from '../../lib/words'
import { DrillQuestion, type DrillAnswer } from './DrillQuestion'
import { noteConj } from '../../lib/mistakes'

type Answered = DrillAnswer

function useInitialItems(): DrillItem[] {
  const [params] = useSearchParams()
  const config = useStore((s) => s.conjConfig)
  const stats = useStore.getState().conj
  const key = params.toString()
  return useMemo(() => {
    const verbsParam = params.get('verbs')
    const tensesParam = params.get('tenses')
    const n = Number(params.get('n') ?? config.length)
    const verbs = verbsParam ? poolFor({ set: 'custom', custom: verbsParam.split(',') }) : poolFor(config)
    const tenses = (tensesParam ? tensesParam.split(',') : config.tenses).filter((t): t is Tense => t in TENSE_BY_ID)
    return makeDrill(verbs, tenses.length ? tenses : ['present'], stats, n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Remount the drill whenever the query changes (new drill, drill my mistakes). */
export default function DrillRoute() {
  const [params] = useSearchParams()
  return <DrillSession key={params.toString()} />
}

function DrillSession() {
  useDocumentTitle('Conjugation drill')
  const initial = useInitialItems()
  const navigate = useNavigate()
  const recordConj = useStore((s) => s.recordConj)
  const logActivity = useStore((s) => s.logActivity)

  const [queue, setQueue] = useState<DrillItem[]>(initial)
  const [pos, setPos] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [log, setLog] = useState<Answered[]>([])
  const [requeued, setRequeued] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)

  const total = initial.length
  const item = queue[pos]

  if (!total) {
    return (
      <FocusShell progress={0} exitTo="/conjugation" label="Drill">
        <div className="results">
          <h1 className="results__title">Nothing to drill</h1>
          <p className="muted">Pick at least one tense and a verb set.</p>
          <Link to="/conjugation" className="btn btn--primary">
            Set up a drill
          </Link>
        </div>
      </FocusShell>
    )
  }

  const onAnswered = (a: Answered) => {
    setAnswered(true)
    const firstTime = pos < total
    if (firstTime) {
      setLog((l) => [...l, a])
      recordConj(a.item.inf, a.item.tense, a.pass)
      noteConj(a.item.inf, a.item.tense, { pass: a.pass, given: a.given, expected: fullForm(a.item) })
    }
    logActivity(a.pass)
    if (!a.pass && !requeued.has(pos) && firstTime) {
      setQueue((q) => [...q, a.item])
      setRequeued((r) => new Set(r).add(pos))
    }
  }

  const next = () => {
    if (pos + 1 >= queue.length) {
      setDone(true)
      return
    }
    setPos((p) => p + 1)
    setAnswered(false)
  }

  const firstAnswers = log
  const correct = firstAnswers.filter((a) => a.pass).length

  if (done) {
    const mistakes = firstAnswers.filter((a) => !a.pass)
    const pct = Math.round((correct / total) * 100)
    const retryUrl = () => {
      const verbs = [...new Set(mistakes.map((m) => m.item.inf))].join(',')
      const tenses = [...new Set(mistakes.map((m) => m.item.tense))].join(',')
      return `/conjugation/drill?verbs=${encodeURIComponent(verbs)}&tenses=${tenses}&n=${Math.max(10, mistakes.length * 2)}`
    }
    return (
      <FocusShell progress={1} exitTo="/conjugation" label="Drill" count={`${total}/${total}`}>
        <div className="results">
          <Trophy size={40} color={pct >= 80 ? 'var(--success)' : 'var(--warning)'} aria-hidden />
          <div className="results__score tnum">{pct}%</div>
          <h1 className="results__title">{pct === 100 ? 'Sans faute !' : pct >= 80 ? 'Très bien !' : 'Continue comme ça !'}</h1>
          <p className="muted">
            {correct} of {total} right on the first try.
          </p>
          <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 18 }}>
            {mistakes.length > 0 && (
              <button className="btn btn--primary btn--lg" onClick={() => navigate(retryUrl())} autoFocus>
                <RotateCcw size={17} aria-hidden /> Drill my mistakes
              </button>
            )}
            <button className="btn btn--secondary btn--lg" onClick={() => navigate(`/conjugation/drill?seed=${Date.now()}`)}>
              New drill
            </button>
            <Link to="/conjugation" className={`btn btn--lg ${mistakes.length ? 'btn--ghost' : 'btn--primary'}`}>
              Done
            </Link>
          </div>
          {mistakes.length > 0 && (
            <div className="card card--flush mistake-list">
              <div className="section-title" style={{ padding: '14px 18px 0', margin: 0 }}>
                To review
              </div>
              {mistakes.map((m, i) => (
                <div key={i} className="mistake">
                  <div className="mistake__q">
                    {m.item.inf} · {TENSE_BY_ID[m.item.tense].label}
                  </div>
                  <div className="mistake__a" lang="fr">
                    {m.given && <span className="mistake__yours">{m.given}</span>}
                    <strong>{frTypo(fullForm(m.item))}</strong>
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
      progress={Math.min(pos, total) / total}
      count={`${Math.min(firstAnswers.length + (answered ? 0 : 1), total)}/${total}`}
      exitTo="/conjugation"
      label="Drill"
    >
      <DrillQuestion
        key={pos}
        item={item}
        badge={pos >= total ? <span className="badge badge--warning">Retry</span> : undefined}
        onAnswered={onAnswered}
        onContinue={next}
      />
    </FocusShell>
  )
}
