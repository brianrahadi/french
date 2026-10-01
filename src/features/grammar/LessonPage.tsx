import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Clock, Dumbbell } from 'lucide-react'
import { LESSON_BY_ID, LESSONS, nextLesson } from '../../data/grammar'
import type { Block } from '../../data/types'
import { Callout, Kbd, LevelBadge, Rich } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { lessonStatus } from './status'
import { frTypo } from '../../lib/words'
import { relativeDay, parseDayKey } from '../../lib/date'

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return (
        <p className="prose-p">
          <Rich text={block.text} />
        </p>
      )
    case 'list':
      return (
        <ul className="prose-list">
          {block.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="table-wrap">
          <table className="gtable">
            {block.caption && <caption>{block.caption}</caption>}
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'examples':
      return (
        <ul className="examples">
          {block.items.map((e, i) => (
            <li key={i} className="example">
              <SpeakButton text={e.fr.replace(/\s*[/→]\s*/g, '. ')} size="sm" label={`Listen: ${e.fr}`} />
              <div>
                <div className="example__fr fr" lang="fr">
                  {frTypo(e.fr)}
                </div>
                <div className="example__en">{e.en}</div>
              </div>
            </li>
          ))}
        </ul>
      )
    case 'tip':
      return (
        <Callout kind="tip">
          <Rich text={block.text} />
        </Callout>
      )
    case 'warn':
      return (
        <Callout kind="warn">
          <Rich text={block.text} />
        </Callout>
      )
  }
}

export default function LessonPage() {
  const { id = '' } = useParams()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const p = useStore((s) => s.lessons[id])
  useDocumentTitle(lesson?.title ?? 'Lesson')
  useHotkeys({ p: () => lesson && navigate(`/grammar/${lesson.id}/practice`) })

  if (!lesson) {
    return (
      <div className="page">
        <Link to="/grammar" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Grammar
        </Link>
        <h1 className="page-title">Lesson not found</h1>
      </div>
    )
  }

  const status = lessonStatus(p)
  const nl = nextLesson(lesson.id)
  const index = LESSONS.findIndex((l) => l.id === lesson.id)

  return (
    <div className="page page--lesson">
      <Link to="/grammar" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Grammar
      </Link>
      <header className="lesson-header">
        <div className="row-wrap" style={{ marginBottom: 10 }}>
          <LevelBadge level={lesson.level} />
          <span className="subtle small">
            Lesson {index + 1} of {LESSONS.length}
          </span>
          <span className="subtle small row" style={{ gap: 4 }}>
            <Clock size={14} aria-hidden /> {lesson.minutes} min
          </span>
        </div>
        <h1 className="page-title" lang="fr">
          {lesson.titleFr}
        </h1>
        <p className="lesson-header__en">{lesson.title}</p>
        <p className="page-subtitle">{lesson.summary}</p>
        {p && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Best score <strong className="tnum">{Math.round(p.best * 100)}%</strong>
            {p.nextReview && status !== 'started' && (
              <> · next review {relativeDay(parseDayKey(p.nextReview))}</>
            )}
          </p>
        )}
      </header>

      {lesson.sections.length > 2 && (
        <nav className="toc" aria-label="On this page">
          {lesson.sections.map((s, i) => (
            <a key={i} href={`#s${i}`} className="chip">
              {s.heading}
            </a>
          ))}
        </nav>
      )}

      <article className="lesson-body">
        {lesson.sections.map((s, i) => (
          <section key={i} id={`s${i}`} className="lesson-section">
            <h2 className="lesson-section__title">{s.heading}</h2>
            <div className="stack" style={{ gap: 14 }}>
              {s.blocks.map((b, j) => (
                <BlockView key={j} block={b} />
              ))}
            </div>
          </section>
        ))}
      </article>

      {nl && (
        <Link to={`/grammar/${nl.id}`} className="card card--interactive next-lesson">
          <div>
            <div className="subtle small">Next lesson</div>
            <div className="card__title">{nl.title}</div>
          </div>
          <ArrowRight size={18} aria-hidden />
        </Link>
      )}

      <div className="practice-cta">
        <div className="practice-cta__inner">
          <div className="practice-cta__text">
            <strong>{status === 'due' ? 'Time for a quick review' : p ? 'Practice again' : 'Ready to practice?'}</strong>
            <span className="muted small">{lesson.exercises.length} exercises · instant feedback</span>
          </div>
          <Link to={`/grammar/${lesson.id}/practice`} className="btn btn--primary btn--lg">
            <Dumbbell size={18} aria-hidden /> Practice <Kbd>P</Kbd>
          </Link>
        </div>
      </div>
    </div>
  )
}
