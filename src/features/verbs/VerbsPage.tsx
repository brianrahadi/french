import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { VERBS } from '../../data/verbs'
import { Empty } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'

type Filter = 'all' | 'irr' | 'er' | 'ir' | 're' | 'etre'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'irr', label: 'Irregular' },
  { id: 'er', label: '-er' },
  { id: 'ir', label: '-ir' },
  { id: 're', label: '-re' },
  { id: 'etre', label: 'With être' },
]

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function VerbsPage() {
  useDocumentTitle('Verb tables')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const stats = useStore((s) => s.conj)

  const acc = useMemo(() => {
    const m = new Map<string, { seen: number; correct: number }>()
    for (const [k, s] of Object.entries(stats)) {
      const inf = k.split('|')[0]
      const e = m.get(inf) ?? { seen: 0, correct: 0 }
      e.seen += s.seen
      e.correct += s.correct
      m.set(inf, e)
    }
    return m
  }, [stats])

  const list = VERBS.filter((v) => {
    if (filter === 'etre' && v.aux !== 'etre') return false
    if (filter !== 'all' && filter !== 'etre' && v.group !== filter) return false
    if (!q) return true
    const n = strip(q)
    return strip(v.inf).includes(n) || v.en.toLowerCase().includes(n)
  }).sort((a, b) => a.inf.localeCompare(b.inf, 'fr'))

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Tableaux de conjugaison</div>
          <h1 className="page-title">Verb tables</h1>
          <p className="page-subtitle">Every verb in every tense, with audio. Tap a verb to see its full conjugation.</p>
        </div>
      </header>
      <div className="row-wrap" style={{ marginBottom: 16 }}>
        <div className="search" style={{ flex: '1 1 260px' }}>
          <Search size={17} aria-hidden />
          <input className="input" type="search" placeholder="Search a verb (French or English)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search verbs" />
        </div>
        <div className="segmented" role="group" aria-label="Filter verbs">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <Empty icon={<Search size={30} />} title="No verbs found">
          Only the {VERBS.length} most useful verbs are included so far.
        </Empty>
      ) : (
        <div className="verb-grid">
          {list.map((v) => {
            const a = acc.get(v.inf)
            const pct = a && a.seen ? a.correct / a.seen : null
            return (
              <Link key={v.inf} to={`/verbs/${encodeURIComponent(v.inf)}`} className="verb-card card--interactive">
                <div className="verb-card__inf fr" lang="fr">
                  {v.inf}
                </div>
                <div className="verb-card__en muted">{v.en}</div>
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  {v.group === 'irr' ? <span className="badge badge--warning">irregular</span> : <span className="badge">-{v.group}</span>}
                  {v.aux === 'etre' && <span className="badge badge--primary">être</span>}
                  {pct !== null && (
                    <span className={`badge tnum ${pct >= 0.8 ? 'badge--success' : ''}`} style={{ marginLeft: 'auto' }} title="Drill accuracy">
                      {Math.round(pct * 100)}%
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
