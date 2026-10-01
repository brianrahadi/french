import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  Check,
  Headphones,
  Layers,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Play,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { LESSON_BY_ID } from '../../data/grammar'
import { Empty, Kbd, LevelBadge } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore, type Mistake, type MistakeSource } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { speechSupported } from '../../lib/speech'
import { LISTEN_CATEGORIES } from '../../lib/french'
import { displayFr, frTypo } from '../../lib/words'
import { buildWeakPlan } from '../session/plan'
import { computeWeakSpots } from './weak'

export const SOURCE_INFO: Record<MistakeSource, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  grammar: { label: 'Grammar', icon: BookOpen },
  verbs: { label: 'Verbs', icon: PenLine },
  words: { label: 'Words', icon: Layers },
  writing: { label: 'Writing', icon: NotebookPen },
  talk: { label: 'Conversation', icon: MessagesSquare },
  listening: { label: 'Listening', icon: Headphones },
  speaking: { label: 'Speaking', icon: Mic },
}

export function ago(iso: string, now = Date.now()): string {
  const days = Math.floor((new Date(new Date(now).toDateString()).getTime() - new Date(new Date(iso).toDateString()).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function WeakPage() {
  useDocumentTitle('Weak spots')
  const navigate = useNavigate()
  const mistakes = useStore((s) => s.mistakes)
  const skills = useStore((s) => s.skills)
  const conj = useStore((s) => s.conj)
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const resolveMistake = useStore((s) => s.resolveMistake)
  const weak = useMemo(() => computeWeakSpots({ mistakes, skills, conj, cards, customWords }), [mistakes, skills, conj, cards, customWords])
  const plan = useMemo(
    () => buildWeakPlan(useStore.getState(), Math.random, { tts: speechSupported }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weak],
  )
  const [filter, setFilter] = useState<MistakeSource | 'all'>('all')
  const [limit, setLimit] = useState(12)
  const hasSession = plan.items.length > 0
  useHotkeys({ Enter: () => hasSession && navigate('/session?mode=weak') })

  const recent = groupRows(weak.recent.filter((m) => filter === 'all' || m.source === filter))
  const sourcesPresent = [...new Set(weak.recent.map((m) => m.source))]
  const nothing = !weak.recent.length && !weak.lessons.length && !weak.verbs.length && !weak.words.length

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Points faibles</div>
          <h1 className="page-title">Weak spots</h1>
          <p className="page-subtitle">
            What keeps tripping you up — collected from drills, flashcards, writing, conversations, dictation and speaking. Recent
            mistakes count most; a run of right answers makes a spot fade.
          </p>
        </div>
      </header>

      {nothing ? (
        <div className="card">
          <Empty icon={<Target size={32} />} title="Nothing here yet">
            As you practice, mistakes from every exercise are gathered here, grouped by the rule behind them.{' '}
            <Link to="/">Start today’s session</Link>
          </Empty>
        </div>
      ) : (
        <section className="card session-hero weak-hero" aria-labelledby="weak-title">
          <div className="hero-card__icon hero-card__icon--pink" style={{ width: 52, height: 52 }}>
            <Target size={26} aria-hidden />
          </div>
          <div className="session-hero__text">
            <h2 id="weak-title" className="session-hero__title">
              {hasSession ? 'Targeted practice' : 'Looking good'}
            </h2>
            <p className="muted">
              {hasSession
                ? `${plan.items.length} questions on your weakest points · about ${plan.minutes} min`
                : 'No weak spot stands out right now. Recent mistakes are listed below.'}
            </p>
            {hasSession && (
              <div className="session-hero__chips">
                {plan.counts.grammar > 0 && <span className="pill pill--green">{plan.counts.grammar} grammar</span>}
                {plan.counts.conj > 0 && <span className="pill pill--pink">{plan.counts.conj} verbs</span>}
                {plan.counts.reviews > 0 && <span className="pill">{plan.counts.reviews} words</span>}
                {plan.counts.fix > 0 && <span className="pill">{plan.counts.fix} corrections</span>}
                {plan.counts.listen > 0 && <span className="pill">{plan.counts.listen} dictation</span>}
              </div>
            )}
          </div>
          {hasSession && (
            <div className="session-hero__cta">
              <Link to="/session?mode=weak" className="btn btn--primary btn--lg">
                <Play size={18} aria-hidden /> Practice <Kbd>↵</Kbd>
              </Link>
            </div>
          )}
        </section>
      )}

      {weak.lessons.length > 0 && (
        <section className="section" aria-labelledby="weak-grammar">
          <h2 id="weak-grammar" className="section-title">
            <span>Grammar points</span>
            <span className="tnum">{weak.lessons.length}</span>
          </h2>
          <div className="weak-grid">
            {weak.lessons.map((w) => {
              const l = LESSON_BY_ID[w.lessonId]
              const ex = w.examples[0]
              return (
                <article key={w.lessonId} className="card weak-card">
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <LevelBadge level={l.level} />
                    {w.improving && (
                      <span className="badge badge--success">
                        <TrendingUp size={12} aria-hidden /> improving
                      </span>
                    )}
                  </div>
                  <h3 className="card__title">{l.title}</h3>
                  <p className="small muted" style={{ marginTop: 2 }}>
                    {w.count} mistake{w.count > 1 ? 's' : ''} ·{' '}
                    {Object.entries(w.sources)
                      .map(([src, n]) => `${SOURCE_INFO[src as MistakeSource].label.toLowerCase()} ${n}`)
                      .join(', ')}
                  </p>
                  {ex && (ex.given || ex.expected) && (
                    <div className="weak-example fr" lang="fr">
                      {ex.given && <del>{frTypo(ex.given)}</del>}
                      {ex.given && <ArrowRight size={14} aria-hidden className="subtle" />}
                      <ins>{frTypo(ex.expected)}</ins>
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                    <Link to={`/grammar/${l.id}`} className="btn btn--ghost btn--sm">
                      Lesson
                    </Link>
                    <Link to={`/grammar/${l.id}/practice`} className="btn btn--secondary btn--sm">
                      Practice <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {weak.verbs.length > 0 && (
        <section className="section" aria-labelledby="weak-verbs">
          <h2 id="weak-verbs" className="section-title">
            <span>Verb forms</span>
            <Link
              className="small"
              to={`/conjugation/drill?verbs=${[...new Set(weak.verbs.map((v) => v.inf))].join(',')}&tenses=${[...new Set(weak.verbs.map((v) => v.tense))].join(',')}&n=12`}
            >
              Drill these <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Link>
          </h2>
          <div className="card card--flush">
            {weak.verbs.map((v) => (
              <div key={`${v.inf}|${v.tense}`} className="list-row weak-verb">
                <Link to={`/verbs/${encodeURIComponent(v.inf)}`} className="fr weak-verb__inf" lang="fr">
                  {v.inf}
                </Link>
                <span className="muted small">{v.label}</span>
                <div className="spacer" />
                <div className="weak-meter" aria-label={`${Math.round(v.accuracy * 100)}% right recently`}>
                  <span style={{ width: `${Math.round(v.accuracy * 100)}%` }} />
                </div>
                <span className="small tnum subtle" style={{ width: 40, textAlign: 'right' }}>
                  {Math.round(v.accuracy * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {weak.words.length > 0 && (
        <section className="section" aria-labelledby="weak-words">
          <h2 id="weak-words" className="section-title">
            <span>Words that keep slipping</span>
            <span className="tnum">{weak.words.length}</span>
          </h2>
          <div className="card">
            <div className="row-wrap" style={{ gap: 8 }}>
              {weak.words.map(({ word, lapses }) => (
                <span key={word.id} className="word-chip" title={`Forgotten ${lapses} times`}>
                  <SpeakButton text={displayFr(word)} size="sm" />
                  <span className="fr" lang="fr">
                    {frTypo(displayFr(word))}
                  </span>
                  <span className="muted small">{word.en.split(/[,;]/)[0]}</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {weak.listening.length > 0 && (
        <section className="section" aria-labelledby="weak-listen">
          <h2 id="weak-listen" className="section-title">
            <span>Listening</span>
            <Link to="/listening" className="small">
              Dictation <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Link>
          </h2>
          <div className="grid-3">
            {weak.listening.slice(0, 3).map(({ category, count }) => (
              <div key={category} className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{LISTEN_CATEGORIES[category].label}</strong>
                  <span className="badge badge--warning tnum">{count}</span>
                </div>
                <p className="small muted">{LISTEN_CATEGORIES[category].tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {weak.recent.length > 0 && (
        <section className="section" aria-labelledby="weak-recent">
          <h2 id="weak-recent" className="section-title">
            <span>Recent mistakes</span>
          </h2>
          {sourcesPresent.length > 1 && (
            <div className="row-wrap" style={{ gap: 6, marginBottom: 12 }} role="group" aria-label="Filter by source">
              <button type="button" className="chip chip--sm" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </button>
              {sourcesPresent.map((src) => (
                <button key={src} type="button" className="chip chip--sm" aria-pressed={filter === src} onClick={() => setFilter(src)}>
                  {SOURCE_INFO[src].label}
                </button>
              ))}
            </div>
          )}
          <ul className="card card--flush mistake-log">
            {recent.slice(0, limit).map((row) =>
              row.length === 1 ? (
                <MistakeRow key={row[0].id} m={row[0]} onDismiss={() => resolveMistake(row[0].id)} />
              ) : (
                <SentenceRow key={row[0].id} ms={row} onDismiss={() => row.forEach((m) => resolveMistake(m.id))} />
              ),
            )}
          </ul>
          {recent.length > limit && (
            <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => setLimit(recent.length)}>
              Show all {recent.length}
            </button>
          )}
        </section>
      )}
    </div>
  )
}

/** Mistakes logged together for one dictation or speaking sentence become one row. */
function groupRows(ms: Mistake[]): Mistake[][] {
  const rows: Mistake[][] = []
  for (const m of ms) {
    const last = rows[rows.length - 1]
    const head = last?.[0]
    if (head && m.ref && head.ref === m.ref && head.source === m.source && head.at === m.at && (m.source === 'listening' || m.source === 'speaking'))
      last.push(m)
    else rows.push([m])
  }
  return rows
}

function SentenceRow({ ms, onDismiss }: { ms: Mistake[]; onDismiss: () => void }) {
  const head = ms[0]
  const Icon = SOURCE_INFO[head.source].icon
  const ordered = [...ms].reverse()
  return (
    <li className="mistake-log__row">
      <span className="mistake-log__icon" title={SOURCE_INFO[head.source].label}>
        <Icon size={16} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mistake-log__sentence fr" lang="fr">
          {frTypo(head.prompt ?? '')}
        </div>
        <div className="mistake-log__words fr" lang="fr">
          {ordered.map((m) =>
            m.given ? (
              <span key={m.id} className="mw">
                <del>{frTypo(m.given)}</del> <ArrowRight size={12} aria-hidden className="subtle" /> <ins>{frTypo(m.expected)}</ins>
              </span>
            ) : (
              <span key={m.id} className="mw mw--miss" title={head.source === 'speaking' ? 'not understood' : 'missed'}>
                {frTypo(m.expected)}
              </span>
            ),
          )}
        </div>
        <div className="small subtle">
          {SOURCE_INFO[head.source].label} · {ago(head.at)} ·{' '}
          {head.source === 'speaking' ? `${ms.length} word${ms.length > 1 ? 's' : ''} not understood` : `${ms.length} word${ms.length > 1 ? 's' : ''} to check`}
        </div>
      </div>
      <button type="button" className="icon-btn icon-btn--sm" onClick={onDismiss} aria-label="Dismiss" title="Got it — dismiss">
        <X size={16} aria-hidden />
      </button>
    </li>
  )
}

function MistakeRow({ m, onDismiss }: { m: Mistake; onDismiss: () => void }) {
  const Icon = SOURCE_INFO[m.source].icon
  const lesson = m.skill.startsWith('lesson:') ? LESSON_BY_ID[m.skill.slice(7)] : undefined
  return (
    <li className="mistake-log__row">
      <span className="mistake-log__icon" title={SOURCE_INFO[m.source].label}>
        <Icon size={16} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {m.prompt && (
          <div className="small muted mistake-log__prompt" lang={m.source === 'words' || m.source === 'verbs' ? undefined : 'fr'}>
            {frTypo(m.prompt)}
          </div>
        )}
        <div className="fix__change fr" lang="fr">
          {m.given ? <del>{frTypo(m.given)}</del> : <span className="subtle small">(no answer)</span>}
          <ArrowRight size={14} aria-hidden className="subtle" />
          <ins>{frTypo(m.expected)}</ins>
        </div>
        <div className="small subtle">
          {SOURCE_INFO[m.source].label} · {ago(m.at)}
          {lesson && (
            <>
              {' · '}
              <Link to={`/grammar/${lesson.id}`}>{lesson.title}</Link>
            </>
          )}
          {m.source === 'listening' && m.skill.startsWith('listen:') && (
            <> · {LISTEN_CATEGORIES[m.skill.slice(7) as keyof typeof LISTEN_CATEGORIES]?.label}</>
          )}
        </div>
      </div>
      <button type="button" className="icon-btn icon-btn--sm" onClick={onDismiss} aria-label="Dismiss this mistake" title="Got it — dismiss">
        {m.fixable ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
      </button>
    </li>
  )
}
