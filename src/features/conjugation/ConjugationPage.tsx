import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Play, Search, Table2, Target } from 'lucide-react'
import { TENSES, type Tense } from '../../lib/conjugate'
import { VERBS, VERB_SETS } from '../../data/verbs'
import { LEVELS } from '../../data/types'
import { Dialog } from '../../components/Dialog'
import { Kbd, LevelBadge, ProgressBar } from '../../components/ui'
import { useStore, type ConjConfig } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { accuracy, poolFor } from './drill'

export default function ConjugationPage() {
  useDocumentTitle('Conjugation')
  const config = useStore((s) => s.conjConfig)
  const setConfig = useStore((s) => s.setConjConfig)
  const stats = useStore((s) => s.conj)
  const navigate = useNavigate()
  const [picker, setPicker] = useState(false)

  const pool = poolFor(config)
  const canStart = config.tenses.length > 0 && pool.length > 0
  const start = () => canStart && navigate(`/conjugation/drill?seed=${Date.now()}`)
  useHotkeys({ Enter: start })

  const toggleTense = (t: Tense) =>
    setConfig({ tenses: config.tenses.includes(t) ? config.tenses.filter((x) => x !== t) : [...config.tenses, t] })

  const tenseStats = useMemo(
    () =>
      TENSES.map((t) => {
        let seen = 0
        let correct = 0
        for (const [k, s] of Object.entries(stats))
          if (k.endsWith(`|${t.id}`)) {
            seen += s.seen
            correct += s.correct
          }
        return { t, seen, acc: seen ? correct / seen : null }
      }),
    [stats],
  )

  const weakest = useMemo(() => {
    const byVerb = new Map<string, { recent: number[] }>()
    for (const [k, s] of Object.entries(stats)) {
      const inf = k.split('|')[0]
      const e = byVerb.get(inf) ?? { recent: [] }
      e.recent.push(...s.recent)
      byVerb.set(inf, e)
    }
    return [...byVerb.entries()]
      .filter(([, e]) => e.recent.length >= 2)
      .map(([inf, e]) => ({ inf, acc: accuracy({ seen: 0, correct: 0, recent: e.recent, lastAt: '' })! }))
      .filter((x) => x.acc < 0.9)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 8)
  }, [stats])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Conjugaison</div>
          <h1 className="page-title">Conjugation</h1>
          <p className="page-subtitle">
            Type the right form, fast. Drills adapt to you — verbs and tenses you miss come back more often.
          </p>
        </div>
        <Link to="/verbs" className="btn btn--secondary">
          <Table2 size={17} aria-hidden /> Verb tables
        </Link>
      </header>

      <div className="card stack-lg drill-setup">
        <div>
          <div className="setup-label">Tenses</div>
          <div className="stack" style={{ gap: 10 }}>
            {LEVELS.map((lvl) => {
              const ts = TENSES.filter((t) => t.level === lvl)
              if (!ts.length) return null
              return (
                <div key={lvl} className="row-wrap">
                  <LevelBadge level={lvl} />
                  {ts.map((t) => (
                    <button key={t.id} type="button" className="chip" aria-pressed={config.tenses.includes(t.id)} onClick={() => toggleTense(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="setup-label">Verbs</div>
          <div className="row-wrap">
            <div className="segmented" role="group" aria-label="Verb set">
              {[...VERB_SETS, { id: 'custom' as const, label: 'Choose…', description: '' }].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={config.set === s.id}
                  onClick={() => (s.id === 'custom' ? setPicker(true) : setConfig({ set: s.id }))}
                  title={s.description}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <span className="muted small">
              {pool.length} verb{pool.length === 1 ? '' : 's'}
              {config.set === 'custom' && config.custom.length > 0 && `: ${config.custom.slice(0, 4).join(', ')}${config.custom.length > 4 ? '…' : ''}`}
            </span>
          </div>
        </div>

        <div>
          <div className="setup-label">Length</div>
          <div className="segmented" role="group" aria-label="Number of questions">
            {[10, 20, 40].map((n) => (
              <button key={n} type="button" aria-pressed={config.length === n} onClick={() => setConfig({ length: n })}>
                {n} questions
              </button>
            ))}
          </div>
        </div>

        <div className="row drill-start" style={{ justifyContent: 'flex-end' }}>
          {!config.tenses.length && <span className="muted small">Pick at least one tense</span>}
          <button type="button" className="btn btn--primary btn--lg" disabled={!canStart} onClick={start}>
            <Play size={18} aria-hidden /> Start drill <Kbd>↵</Kbd>
          </button>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card__title" style={{ marginBottom: 14 }}>
            Accuracy by tense
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {tenseStats.map(({ t, seen, acc }) => (
              <div key={t.id} className="tense-stat">
                <span className="tense-stat__label">{t.label}</span>
                <ProgressBar value={acc ?? 0} label={`${t.label} accuracy`} variant={acc !== null && acc >= 0.8 ? 'success' : undefined} thin />
                <span className="subtle small tnum tense-stat__val">{acc === null ? '—' : `${Math.round(acc * 100)}%`}</span>
                <span className="sr-only">{seen} answers</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="card__title">Weak spots</span>
            {weakest.length > 0 && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => navigate(`/conjugation/drill?verbs=${weakest.map((w) => w.inf).join(',')}&tenses=${config.tenses.join(',') || 'present'}&n=20`)}
              >
                <Target size={15} aria-hidden /> Drill these
              </button>
            )}
          </div>
          {weakest.length ? (
            <ul className="weak-list">
              {weakest.map((w) => (
                <li key={w.inf}>
                  <Link to={`/verbs/${encodeURIComponent(w.inf)}`} className="fr" lang="fr">
                    {w.inf}
                  </Link>
                  <span className="badge badge--warning tnum">{Math.round(w.acc * 100)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Verbs you get wrong will show up here after a few drills.</p>
          )}
        </div>
      </div>

      <VerbPicker open={picker} onClose={() => setPicker(false)} config={config} setConfig={setConfig} />
    </div>
  )
}

function VerbPicker({
  open,
  onClose,
  config,
  setConfig,
}: {
  open: boolean
  onClose: () => void
  config: ConjConfig
  setConfig: (c: Partial<ConjConfig>) => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>(config.custom)
  const list = VERBS.filter((v) => !q || v.inf.includes(q.toLowerCase()) || v.en.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose verbs"
      wide
      actions={
        <>
          <button className="btn btn--ghost" onClick={() => setSel([])}>
            Clear
          </button>
          <button
            className="btn btn--primary"
            disabled={!sel.length}
            onClick={() => {
              setConfig({ set: 'custom', custom: sel })
              onClose()
            }}
          >
            Use {sel.length} verb{sel.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="search" style={{ margin: '12px 0' }}>
        <Search size={17} aria-hidden />
        <input className="input" type="search" placeholder="Search verbs…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search verbs" autoFocus />
      </div>
      <div className="verb-pick">
        {list.map((v) => {
          const on = sel.includes(v.inf)
          return (
            <button
              key={v.inf}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => setSel((s) => (on ? s.filter((x) => x !== v.inf) : [...s, v.inf]))}
              lang="fr"
            >
              {v.inf}
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
