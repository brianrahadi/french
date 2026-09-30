import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { FocusShell } from '../../components/FocusShell'
import { SpeakButton } from '../../components/SpeakButton'
import { Kbd } from '../../components/ui'
import { SOUND_SETS } from '../../data/sounds'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { noteSpeaking } from '../../lib/mistakes'
import { frTypo } from '../../lib/words'
import { pickSentences, poolFor, type SentenceSource } from '../listening/sentences'
import { SpeakQuestion, type SpeakAnswer, type SpeakMode } from './SpeakQuestion'

export default function SpeakingRoute() {
  const [params] = useSearchParams()
  return <SpeakingSession key={params.toString()} />
}

function SpeakingSession() {
  useDocumentTitle('Speaking')
  const [params] = useSearchParams()
  const src = (params.get('src') ?? 'mine') as SentenceSource
  const mode = (params.get('mode') === 'repeat' ? 'repeat' : 'read') as SpeakMode
  const n = Math.max(1, Math.min(20, Number(params.get('n')) || 8))
  const items = useMemo(() => {
    const s = useStore.getState()
    const pool = poolFor(src, s)
    // Sound sets are short and meant to be done in order.
    return src.startsWith('sound:') ? pool.slice(0, n) : pickSentences(pool, s.speaking, n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const recordSentence = useStore((s) => s.recordSentence)
  const logActivity = useStore((s) => s.logActivity)
  const [pos, setPos] = useState(0)
  const [log, setLog] = useState<SpeakAnswer[]>([])

  const set = src.startsWith('sound:') ? SOUND_SETS.find((x) => `sound:${x.id}` === src) : undefined

  const onAnswered = (a: SpeakAnswer) => {
    setLog((l) => [...l, a])
    if (a.attempts > 0) {
      recordSentence('speaking', a.sentence.id, a.score)
      if (a.match) noteSpeaking(a.sentence, a.match)
      logActivity(a.score >= 60)
    }
  }

  if (!items.length)
    return (
      <FocusShell progress={0} exitTo="/speaking" label="Speaking">
        <div className="results">
          <h1 className="results__title">No sentences here yet</h1>
          <Link to="/speaking" className="btn btn--primary">
            Choose other sentences
          </Link>
        </div>
      </FocusShell>
    )

  if (pos >= items.length)
    return (
      <FocusShell progress={1} exitTo="/speaking" label="Speaking" count={`${items.length}/${items.length}`}>
        <SpeakingSummary log={log} />
      </FocusShell>
    )

  return (
    <FocusShell progress={pos / items.length} exitTo="/speaking" label="Speaking" count={`${pos + 1}/${items.length}`}>
      <SpeakQuestion
        key={items[pos].id + pos}
        sentence={items[pos]}
        mode={mode}
        context={
          set && pos === 0 ? (
            <div className="callout callout--tip" style={{ marginBottom: 14 }}>
              <div>
                <strong>{set.title}.</strong> {set.tip}
              </div>
            </div>
          ) : undefined
        }
        onAnswered={onAnswered}
        onContinue={() => setPos((p) => p + 1)}
      />
    </FocusShell>
  )
}

function SpeakingSummary({ log }: { log: SpeakAnswer[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useHotkeys({ Enter: () => navigate('/speaking') })
  const tried = log.filter((x) => x.attempts > 0)
  const avg = tried.length ? Math.round(tried.reduce((a, x) => a + x.score, 0) / tried.length) : 0
  return (
    <div className="results">
      <CheckCircle2 size={44} color="var(--success)" aria-hidden />
      <h1 className="results__title">Bien parlé&nbsp;!</h1>
      <p className="muted">
        {tried.length} sentence{tried.length === 1 ? '' : 's'} spoken{tried.length ? ` · average ${avg}%` : ''}
      </p>
      <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 22 }}>
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => navigate(`/speaking/session?${params.toString()}&r=${Date.now()}`)}>
          <RotateCcw size={17} aria-hidden /> Again
        </button>
        <Link to="/speaking" className="btn btn--primary btn--lg">
          Done <Kbd>↵</Kbd>
        </Link>
      </div>
      <div className="card card--flush mistake-list">
        {log.map((x, i) => {
          const missed = x.match ? x.match.words.filter((_, k) => !x.match!.heard[k]) : []
          return (
            <div key={i} className="mistake row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <SpeakButton text={x.sentence.fr} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mistake__a" lang="fr">
                  <strong>{frTypo(x.sentence.fr)}</strong>
                </div>
                {missed.length > 0 && (
                  <div className="small muted">
                    Not caught: <span lang="fr">{missed.map(frTypo).join(', ')}</span>
                  </div>
                )}
              </div>
              <span className={`badge tnum ${x.attempts === 0 ? '' : x.score >= 90 ? 'badge--success' : x.score >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                {x.attempts === 0 ? 'skipped' : `${x.score}%`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
