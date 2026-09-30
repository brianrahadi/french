import { Link } from 'react-router'
import { ArrowRight, Check, Feather, PencilLine, Sparkles } from 'lucide-react'
import { WRITING_PROMPTS, type WritingPrompt } from '../../data/writing'
import { LEVELS, LEVEL_INFO } from '../../data/types'
import { LevelBadge } from '../../components/ui'
import { useStore, type LessonProgress, type WritingEntry } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { ConnectAiCard } from '../../components/AiSetup'

/** Suggest a prompt that practises grammar the learner has recently mastered. */
function suggest(lessons: Record<string, LessonProgress>, written: Set<string>, startLevel: string | null): WritingPrompt | undefined {
  const mastered = Object.entries(lessons)
    .filter(([, p]) => p.best >= 0.8)
    .sort((a, b) => (a[1].lastAt < b[1].lastAt ? 1 : -1))
    .map(([id]) => id)
  for (const id of mastered) {
    const p = WRITING_PROMPTS.find((w) => !written.has(w.id) && w.lessons.includes(id))
    if (p) return p
  }
  return WRITING_PROMPTS.find((w) => !written.has(w.id) && w.level === (startLevel ?? 'A1')) ?? WRITING_PROMPTS.find((w) => !written.has(w.id))
}

export function scoreClass(score: number): string {
  return score >= 85 ? 'badge--success' : score >= 60 ? 'badge--warning' : 'badge--danger'
}

export default function WritingHome() {
  useDocumentTitle('Writing')
  const writings = useStore((s) => s.writings)
  const lessons = useStore((s) => s.lessons)
  const startLevel = useStore((s) => s.startLevel)
  const ai = useAiConfig()
  const written = new Set(writings.map((w) => w.promptId))
  const pick = suggest(lessons, written, startLevel)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Expression écrite</div>
          <h1 className="page-title">Writing</h1>
          <p className="page-subtitle">
            Write a short text and get it corrected like a teacher would: every mistake explained, linked to the lesson that
            covers it, plus a more natural version to learn from.
          </p>
        </div>
      </header>

      {!ai && (
        <div style={{ marginBottom: 24 }}>
          <ConnectAiCard title="Connect an AI to get corrections">
            Corrections come from the AI model of your choice, with your own key. You can still write without it — you just won’t get feedback until one is connected.
          </ConnectAiCard>
        </div>
      )}

      <div className="grid-2">
        {pick && (
          <Link to={`/writing/new?prompt=${pick.id}`} className="card card--interactive writing-suggest">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <span className="pill">
                <Sparkles size={14} aria-hidden /> Suggested for you
              </span>
              <LevelBadge level={pick.level} />
            </div>
            <div className="writing-card__fr fr" lang="fr">
              {pick.titleFr}
            </div>
            <div className="muted">{pick.task}</div>
            <div className="subtle small" style={{ marginTop: 8 }}>
              Practises {pick.focus}
            </div>
            <span className="btn btn--primary btn--sm" style={{ marginTop: 14, pointerEvents: 'none' }} aria-hidden>
              Start writing <ArrowRight size={15} />
            </span>
          </Link>
        )}
        <div className="stack" style={{ gap: 12 }}>
          <Link to="/writing/new?prompt=free" className="card card--interactive hero-card action-card">
            <div className="hero-card__icon hero-card__icon--amber">
              <Feather size={22} aria-hidden />
            </div>
            <div>
              <div className="card__title">Free writing</div>
              <div className="card__meta">A diary entry, a message, anything</div>
            </div>
            <ArrowRight size={18} className="subtle" aria-hidden />
          </Link>
          <Link to="/writing/new?prompt=custom" className="card card--interactive hero-card action-card">
            <div className="hero-card__icon">
              <PencilLine size={22} aria-hidden />
            </div>
            <div>
              <div className="card__title">Your own topic</div>
              <div className="card__meta">Set the task yourself</div>
            </div>
            <ArrowRight size={18} className="subtle" aria-hidden />
          </Link>
        </div>
      </div>

      {writings.length > 0 && <History writings={writings} />}

      {LEVELS.map((level) => (
        <section key={level} className="section" aria-labelledby={`wl-${level}`}>
          <div className="level-head" style={{ marginBottom: 12 }}>
            <LevelBadge level={level} />
            <h2 id={`wl-${level}`} className="level-head__title">
              {LEVEL_INFO[level].name}
            </h2>
          </div>
          <div className="writing-grid">
            {WRITING_PROMPTS.filter((p) => p.level === level).map((p) => (
              <Link key={p.id} to={`/writing/new?prompt=${p.id}`} className="writing-card card--interactive">
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span className="writing-card__fr fr" lang="fr">
                    {p.titleFr}
                  </span>
                  {written.has(p.id) && (
                    <span className="badge badge--success" title="You’ve written this one">
                      <Check size={12} aria-hidden /> done
                    </span>
                  )}
                </div>
                <div className="writing-card__en muted">{p.title}</div>
                <div className="writing-card__focus subtle small">
                  {p.focus} · {p.words[0]}–{p.words[1]} words
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function History({ writings }: { writings: WritingEntry[] }) {
  return (
    <section className="section" aria-labelledby="history-title">
      <div className="section-title">
        <span id="history-title">Your texts</span>
        <span className="tnum">{writings.length}</span>
      </div>
      <div className="card card--flush">
        <ul className="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {writings.slice(0, 12).map((w) => (
            <li key={w.id}>
              <Link to={`/writing/${w.id}`} className="list-row history-row">
                <span className={`badge ${scoreClass(w.feedback.score)} tnum history-row__score`}>{w.feedback.score}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="history-row__title">
                    {w.title}
                    {w.revisionOf && <span className="subtle small"> · rewrite</span>}
                  </div>
                  <div className="history-row__excerpt fr" lang="fr">
                    {w.text.slice(0, 110)}
                    {w.text.length > 110 ? '…' : ''}
                  </div>
                </div>
                <div className="history-row__meta subtle small">
                  <div>{new Date(w.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                  <div>
                    {w.feedback.errors.length} fix{w.feedback.errors.length === 1 ? '' : 'es'}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
