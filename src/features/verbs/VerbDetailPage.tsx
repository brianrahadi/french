import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Play } from 'lucide-react'
import { VERB_BY_INF, hasTense } from '../../data/verbs'
import { TENSES, conjugate, pastParticiple, presentParticiple, tablePronoun } from '../../lib/conjugate'
import { LevelBadge } from '../../components/ui'
import { SpeakButton, useSpeak } from '../../components/SpeakButton'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'

export default function VerbDetailPage() {
  const { inf = '' } = useParams()
  const v = VERB_BY_INF[decodeURIComponent(inf)]
  const navigate = useNavigate()
  const say = useSpeak()
  useDocumentTitle(v ? v.inf : 'Verb')

  if (!v) {
    return (
      <div className="page">
        <Link to="/verbs" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Verb tables
        </Link>
        <h1 className="page-title">Verb not found</h1>
      </div>
    )
  }

  const tenses = TENSES.filter((t) => hasTense(v, t.id))

  return (
    <div className="page">
      <Link to="/verbs" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Verb tables
      </Link>
      <header className="page-header">
        <div>
          <div className="row" style={{ gap: 6 }}>
            <h1 className="page-title" lang="fr">
              {v.inf}
            </h1>
            <SpeakButton text={v.inf} />
          </div>
          <p className="page-subtitle">{v.en}</p>
          <div className="row-wrap" style={{ marginTop: 12 }}>
            {v.group === 'irr' ? <span className="badge badge--warning">irregular</span> : <span className="badge">regular -{v.group}</span>}
            <span className={`badge ${v.aux === 'etre' ? 'badge--primary' : ''}`}>auxiliary: {v.aux === 'etre' ? 'être' : 'avoir'}</span>
            <span className="badge">
              past participle: <span lang="fr" style={{ marginLeft: 4 }}>{pastParticiple(v)}</span>
            </span>
            <span className="badge">
              present participle: <span lang="fr" style={{ marginLeft: 4 }}>{presentParticiple(v)}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate(`/conjugation/drill?verbs=${encodeURIComponent(v.inf)}&tenses=${tenses.filter((t) => t.level !== 'B2').map((t) => t.id).join(',')}&n=15`)}
        >
          <Play size={17} aria-hidden /> Drill this verb
        </button>
      </header>

      <div className="tense-grid">
        {tenses.map((t) => {
          const cells = conjugate(v, t.id)
          return (
            <section key={t.id} className="tense-card" aria-labelledby={`t-${t.id}`}>
              <div className="tense-card__head">
                <h2 id={`t-${t.id}`} className="tense-card__title">
                  {t.label}
                </h2>
                <LevelBadge level={t.level} />
              </div>
              <ul className="tense-card__rows">
                {cells.map((c) => {
                  const pr = tablePronoun(t.id, c.person, c.display, v.inf)
                  const spoken = t.id === 'imperatif' ? c.display : `${pr.split('/')[0].replace(/^\(|\)$/g, '')}${pr.endsWith("'") ? '' : ' '}${c.display.replace(/\(.*?\)/g, '')}`
                  return (
                    <li key={c.person}>
                      <button type="button" className="conj-row" onClick={() => say(spoken)} lang="fr" title="Listen">
                        <span className="conj-row__pr">{frTypo(pr)}</span>
                        {pr && !pr.endsWith("'") ? ' ' : ''}
                        <span className="conj-row__form">{c.display}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
