import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, Circle, CircleDashed, Clock } from 'lucide-react'
import { lessonsByLevel, LESSONS } from '../../data/grammar'
import { LEVEL_INFO, LEVELS } from '../../data/types'
import { LevelBadge, ProgressBar } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { dueLessons, lessonStatus, nextUp, type LessonStatus } from './status'

const STATUS_ICON: Record<LessonStatus, React.ReactNode> = {
  new: <Circle size={20} color="var(--border-strong)" aria-hidden />,
  started: <CircleDashed size={20} color="var(--warning)" aria-hidden />,
  mastered: <CheckCircle2 size={20} color="var(--success)" aria-hidden />,
  due: <Clock size={20} color="var(--primary-text)" aria-hidden />,
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  new: 'Not started',
  started: 'In progress',
  mastered: 'Mastered',
  due: 'Review due',
}

export default function GrammarPage() {
  useDocumentTitle('Grammar')
  const progress = useStore((s) => s.lessons)
  const due = dueLessons(progress)
  const up = nextUp(progress)
  const mastered = LESSONS.filter((l) => {
    const s = lessonStatus(progress[l.id])
    return s === 'mastered' || s === 'due'
  }).length

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Grammaire</div>
          <h1 className="page-title">Grammar</h1>
          <p className="page-subtitle">
            Short explanations, then practice with instant feedback. Score 80% to master a lesson — it comes back for
            spaced review so you don’t forget it.
          </p>
        </div>
      </header>

      <div className="grid-2">
        {due.length > 0 && (
          <Link to={`/grammar/${due[0].id}/practice`} className="card card--interactive hero-card">
            <div className="hero-card__icon">
              <Clock size={22} aria-hidden />
            </div>
            <div>
              <div className="card__title">
                {due.length} review{due.length > 1 ? 's' : ''} due
              </div>
              <div className="card__meta">Next: {due[0].title}</div>
            </div>
            <ArrowRight size={20} aria-hidden className="subtle" />
          </Link>
        )}
        {up && (
          <Link to={`/grammar/${up.id}`} className="card card--interactive hero-card">
            <div className="hero-card__icon hero-card__icon--green">
              <ArrowRight size={22} aria-hidden />
            </div>
            <div>
              <div className="card__title">{progress[up.id] ? 'Continue' : 'Up next'}: {up.title}</div>
              <div className="card__meta">
                {up.level} · {up.minutes} min · {up.exercises.length} exercises
              </div>
            </div>
            <ArrowRight size={20} aria-hidden className="subtle" />
          </Link>
        )}
        <div className="card" style={{ gridColumn: due.length && up ? '1 / -1' : undefined }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="card__title">Overall progress</span>
            <span className="muted tnum">
              {mastered} / {LESSONS.length} mastered
            </span>
          </div>
          <ProgressBar value={mastered / LESSONS.length} label="Lessons mastered" variant="success" />
        </div>
      </div>

      {LEVELS.map((level) => {
        const lessons = lessonsByLevel(level)
        const done = lessons.filter((l) => ['mastered', 'due'].includes(lessonStatus(progress[l.id]))).length
        return (
          <section key={level} className="section" aria-labelledby={`lvl-${level}`}>
            <div className="level-head">
              <LevelBadge level={level} />
              <h2 id={`lvl-${level}`} className="level-head__title">
                {LEVEL_INFO[level].name}
              </h2>
              <span className="subtle small tnum" style={{ marginLeft: 'auto' }}>
                {done}/{lessons.length}
              </span>
            </div>
            <p className="muted small" style={{ margin: '4px 0 12px' }}>
              {LEVEL_INFO[level].description}
            </p>
            <div className="card card--flush">
              <div className="list">
                {lessons.map((l) => {
                  const p = progress[l.id]
                  const st = lessonStatus(p)
                  return (
                    <Link key={l.id} to={`/grammar/${l.id}`} className="list-row lesson-row">
                      <span title={STATUS_LABEL[st]}>{STATUS_ICON[st]}</span>
                      <span className="sr-only">{STATUS_LABEL[st]}.</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="lesson-row__title">{l.title}</div>
                        <div className="lesson-row__fr fr" lang="fr">
                          {l.titleFr}
                        </div>
                      </div>
                      {st === 'due' && <span className="badge badge--primary">Review</span>}
                      {p && (
                        <span className={`badge ${p.best >= 0.8 ? 'badge--success' : 'badge--warning'} tnum`} title="Best score">
                          {Math.round(p.best * 100)}%
                        </span>
                      )}
                      <span className="subtle small lesson-row__min">{l.minutes} min</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
