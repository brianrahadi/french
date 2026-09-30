import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2, Headphones, RotateCcw } from 'lucide-react'
import { FocusShell } from '../../components/FocusShell'
import { SpeakButton } from '../../components/SpeakButton'
import { Kbd } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { noteDictation } from '../../lib/mistakes'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { DictationQuestion, type DictationAnswer } from './DictationQuestion'
import { pickSentences, poolFor, type SentenceSource } from './sentences'

export function useDictationItems() {
  const [params] = useSearchParams()
  const src = (params.get('src') ?? 'mine') as SentenceSource
  const n = Math.max(1, Math.min(30, Number(params.get('n')) || 10))
  return useMemo(() => {
    const s = useStore.getState()
    return { src, items: pickSentences(poolFor(src, s), s.listening, n) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])
}

export default function DictationRoute() {
  const [params] = useSearchParams()
  return <DictationSession key={params.toString()} />
}

function DictationSession() {
  useDocumentTitle('Dictation')
  const { items } = useDictationItems()
  const recordSentence = useStore((s) => s.recordSentence)
  const logActivity = useStore((s) => s.logActivity)
  const [pos, setPos] = useState(0)
  const [log, setLog] = useState<DictationAnswer[]>([])
  const [answered, setAnswered] = useState(false)

  const done = pos >= items.length
  const onAnswered = (a: DictationAnswer) => {
    setAnswered(true)
    setLog((l) => [...l, a])
    recordSentence('listening', a.sentence.id, a.result.score)
    noteDictation(a.sentence, a.result)
    logActivity(a.result.score >= 70)
  }
  const next = () => {
    setAnswered(false)
    setPos((p) => p + 1)
  }

  if (!items.length) {
    return (
      <FocusShell progress={0} exitTo="/listening" label="Dictation">
        <div className="results">
          <h1 className="results__title">No sentences here yet</h1>
          <Link to="/listening" className="btn btn--primary">
            Choose other sentences
          </Link>
        </div>
      </FocusShell>
    )
  }

  if (done) {
    return (
      <FocusShell progress={1} exitTo="/listening" label="Dictation" count={`${items.length}/${items.length}`}>
        <DictationSummary log={log} />
      </FocusShell>
    )
  }

  const progress = (pos + (answered ? 1 : 0)) / items.length
  return (
    <FocusShell progress={progress} exitTo="/listening" label="Dictation" count={`${pos + 1}/${items.length}`}>
      <DictationQuestion key={items[pos].id + pos} sentence={items[pos]} onAnswered={onAnswered} onContinue={next} />
    </FocusShell>
  )
}

function DictationSummary({ log }: { log: DictationAnswer[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useHotkeys({ Enter: () => navigate('/listening') })
  const avg = log.length ? Math.round(log.reduce((a, x) => a + x.result.score, 0) / log.length) : 0
  const perfect = log.filter((x) => x.result.perfect).length
  const cats: Partial<Record<ListenCategory, number>> = {}
  for (const x of log) for (const [c, n] of Object.entries(x.result.categories)) cats[c as ListenCategory] = (cats[c as ListenCategory] ?? 0) + (n ?? 0)
  const sorted = (Object.keys(cats) as ListenCategory[]).sort((a, b) => (cats[b] ?? 0) - (cats[a] ?? 0))

  return (
    <div className="results">
      <CheckCircle2 size={44} color="var(--success)" aria-hidden />
      <h1 className="results__title">Dictée terminée&nbsp;!</h1>
      <p className="muted">
        {perfect} of {log.length} perfect · average {avg}%
      </p>

      {sorted.length > 0 && (
        <div className="card listen-cats" style={{ width: '100%', marginTop: 18, textAlign: 'left' }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>
            What to listen for
          </div>
          <ul className="stack" style={{ gap: 12 }}>
            {sorted.map((c) => (
              <li key={c}>
                <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                  <strong>{LISTEN_CATEGORIES[c].label}</strong>
                  <span className="badge">× {cats[c]}</span>
                </div>
                <p className="small muted">{LISTEN_CATEGORIES[c].tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 22 }}>
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => navigate(`/listening/session?${params.toString()}&r=${Date.now()}`)}>
          <RotateCcw size={17} aria-hidden /> New sentences
        </button>
        <Link to="/listening" className="btn btn--primary btn--lg">
          Done <Kbd>↵</Kbd>
        </Link>
      </div>

      <div className="card card--flush mistake-list">
        <div className="section-title" style={{ padding: '14px 18px 0', margin: 0 }}>
          <Headphones size={16} aria-hidden style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Sentences
        </div>
        {log.map((x, i) => (
          <div key={i} className="mistake row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <SpeakButton text={x.sentence.fr} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mistake__a" lang="fr">
                <strong>{frTypo(x.sentence.fr)}</strong>
              </div>
              {!x.result.perfect && x.typed.trim() && (
                <div className="small muted" lang="fr">
                  <span className="mistake__yours">{frTypo(x.typed)}</span>
                </div>
              )}
              <div className="small subtle">{x.sentence.en}</div>
            </div>
            <span className={`badge ${x.result.perfect ? 'badge--success' : x.result.score >= 70 ? 'badge--warning' : 'badge--danger'} tnum`}>
              {x.result.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
