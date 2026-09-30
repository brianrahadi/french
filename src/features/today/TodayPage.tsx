import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Flame,
  Headphones,
  Layers,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Play,
  Settings,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react'
import { DECKS } from '../../data/vocab'
import { LESSONS, lessonsByLevel } from '../../data/grammar'
import { LEVEL_INFO, LEVELS, type Level } from '../../data/types'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { Heatmap } from '../../components/Heatmap'
import { Kbd, Ring, Stat } from '../../components/ui'
import { computeStreak, useStore } from '../../lib/store'
import { dayKey, frenchDate } from '../../lib/date'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { buildMixedPlan } from '../session/plan'
import { dueCardIds, newAvailableToday, vocabCounts } from '../vocab/selectors'
import { dueLessons, lessonStatus, nextUp } from '../grammar/status'
import { computeWeakSpots } from '../weak/weak'
import { speechSupported } from '../../lib/speech'
import { recognitionSupported } from '../../lib/recognition'

export default function TodayPage() {
  useDocumentTitle('')
  const state = useStore()
  const navigate = useNavigate()
  const today = state.activity[dayKey()] ?? { items: 0, correct: 0, newWords: 0 }
  const streak = computeStreak(state.activity)
  const goal = state.settings.dailyGoal
  const due = useMemo(() => dueCardIds(state.cards, state.customWords).length, [state.cards, state.customWords])
  const fresh = newAvailableToday(state)
  const grammarDue = dueLessons(state.lessons)
  const up = nextUp(state.lessons)
  const { learned } = useMemo(() => vocabCounts(state), [state])
  const mastered = LESSONS.filter((l) => ['mastered', 'due'].includes(lessonStatus(state.lessons[l.id]))).length
  const totalItems = Object.values(state.activity).reduce((a, d) => a + d.items, 0)
  const hour = new Date().getHours()
  const greeting = hour >= 18 || hour < 4 ? 'Bonsoir' : 'Bonjour'
  const firstRun = !state.startLevel && totalItems === 0
  const tenses = state.conjConfig.tenses.map((t) => TENSE_BY_ID[t]?.label).filter(Boolean)
  const plan = useMemo(() => buildMixedPlan(state, Math.random, { tts: speechSupported, asr: recognitionSupported }), [state])
  const hasSession = plan.items.length > 0
  const weak = useMemo(() => computeWeakSpots(state), [state])
  const weakCount = weak.total + weak.fixables.length
  useHotkeys({ Enter: () => hasSession && navigate('/session') })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">{capitalize(frenchDate())}</div>
          <h1 className="page-title">{greeting}&nbsp;!</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {streak > 0 && (
            <div className="streak" title={`${streak}-day streak`}>
              <Flame size={18} aria-hidden /> <span className="tnum">{streak}</span> day{streak > 1 ? 's' : ''}
            </div>
          )}
          <Link to="/settings" className="icon-btn icon-btn--outline mobile-only" aria-label="Settings">
            <Settings size={19} aria-hidden />
          </Link>
        </div>
      </header>

      {firstRun && <Welcome onPick={(lvl) => {
        const decks = DECKS.filter((d) => d.level === lvl).map((d) => d.id)
        state.setStartLevel(lvl, decks)
        navigate(`/grammar/${lessonsByLevel(lvl)[0].id}`)
      }} />}

      <section className="card session-hero" aria-labelledby="session-title">
        <div className="session-hero__goal">
          <Ring value={today.items / goal} size={88} stroke={9} label={`${today.items} of ${goal} answers today`}>
            <span className="tnum">{Math.min(100, Math.round((today.items / goal) * 100))}%</span>
          </Ring>
          <span className="subtle small tnum">
            {today.items}/{goal} today
          </span>
        </div>
        <div className="session-hero__text">
          <div className="page-eyebrow" style={{ margin: 0 }}>
            Séance du jour
          </div>
          <h2 id="session-title" className="session-hero__title">
            {hasSession ? 'Today’s session' : today.items >= goal ? 'Objectif atteint\u00a0!' : 'All caught up'}
          </h2>
          {hasSession ? (
            <>
              <p className="muted">
                About {plan.minutes} min — everything that’s due, mixed together so it sticks.
              </p>
              <div className="session-hero__chips">
                {plan.counts.reviews > 0 && (
                  <span className="pill">
                    <Layers size={14} aria-hidden /> {plan.counts.reviews} review{plan.counts.reviews > 1 ? 's' : ''}
                  </span>
                )}
                {plan.counts.newWords > 0 && (
                  <span className="pill">
                    <Sparkles size={14} aria-hidden /> {plan.counts.newWords} new word{plan.counts.newWords > 1 ? 's' : ''}
                  </span>
                )}
                {plan.counts.grammar > 0 && (
                  <span className="pill pill--green">
                    <BookOpen size={14} aria-hidden /> {plan.counts.grammar} grammar
                  </span>
                )}
                {plan.counts.conj > 0 && (
                  <span className="pill pill--pink">
                    <PenLine size={14} aria-hidden /> {plan.counts.conj} verbs
                  </span>
                )}
                {plan.counts.listen > 0 && (
                  <span className="pill">
                    <Headphones size={14} aria-hidden /> {plan.counts.listen} dictation
                  </span>
                )}
                {plan.counts.say > 0 && (
                  <span className="pill pill--green">
                    <Mic size={14} aria-hidden /> {plan.counts.say} to say
                  </span>
                )}
                {plan.counts.fix > 0 && (
                  <span className="pill pill--pink">
                    <Wrench size={14} aria-hidden /> {plan.counts.fix} to fix
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="muted">Nothing is due. A good moment to learn a new grammar point or write a few sentences.</p>
          )}
        </div>
        <div className="session-hero__cta">
          {hasSession ? (
            <Link to="/session" className="btn btn--primary btn--lg">
              <Play size={18} aria-hidden /> Start <Kbd>↵</Kbd>
            </Link>
          ) : up ? (
            <Link to={`/grammar/${up.id}`} className="btn btn--primary btn--lg">
              Next lesson <ArrowRight size={17} aria-hidden />
            </Link>
          ) : (
            <Link to="/writing" className="btn btn--primary btn--lg">
              Write <ArrowRight size={17} aria-hidden />
            </Link>
          )}
        </div>
      </section>

      <section className="section" style={{ marginTop: 28 }}>
        <div className="section-title">
          <span>Or focus on one thing</span>
        </div>
        <div className="action-grid">
          <ActionCard
            to={due + fresh > 0 ? '/vocab/study' : '/vocab'}
            icon={<Layers size={22} aria-hidden />}
            title="Vocabulary"
            meta={due + fresh > 0 ? `${due} to review · ${fresh} new` : 'All caught up — nice!'}
            cta={due + fresh > 0 ? 'Study' : 'Open'}
          />
          <ActionCard
            to={grammarDue.length ? `/grammar/${grammarDue[0].id}/practice` : up ? `/grammar/${up.id}` : '/grammar'}
            icon={<BookOpen size={22} aria-hidden />}
            tone="green"
            title="Grammar"
            meta={grammarDue.length ? `Review: ${grammarDue[0].title}` : up ? `${state.lessons[up.id] ? 'Continue' : 'Next'}: ${up.title}` : 'Every lesson mastered!'}
            cta={grammarDue.length ? 'Review' : 'Learn'}
          />
          <ActionCard
            to={`/conjugation/drill?seed=${dayKey()}`}
            icon={<PenLine size={22} aria-hidden />}
            tone="pink"
            title="Conjugation"
            meta={`Quick drill · ${tenses.slice(0, 3).join(', ') || 'Présent'}${tenses.length > 3 ? '…' : ''}`}
            cta="Drill"
          />
          {weakCount > 0 ? (
            <ActionCard
              to="/weak"
              icon={<Target size={22} aria-hidden />}
              tone="pink"
              title="Weak spots"
              meta={`${weak.total ? `${weak.total} weak spot${weak.total > 1 ? 's' : ''}` : ''}${weak.total && weak.fixables.length ? ' · ' : ''}${weak.fixables.length ? `${weak.fixables.length} correction${weak.fixables.length > 1 ? 's' : ''} to fix` : ''}`}
              cta="Fix"
            />
          ) : (
            <ActionCard
              to="/talk"
              icon={<MessagesSquare size={22} aria-hidden />}
              tone="amber"
              title="Conversation"
              meta={state.conversations.length ? 'Pick up a situation or chat freely' : 'Role-play a real situation in French'}
              cta="Talk"
            />
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="skills-title">
        <div className="section-title">
          <span id="skills-title">Practise a skill</span>
          <Link to="/practice" className="small">
            All practice <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
          </Link>
        </div>
        <div className="skill-strip">
          <SkillTile to="/listening" icon={<Headphones size={20} aria-hidden />} label="Listen" meta="Dictation" />
          <SkillTile to="/speaking" icon={<Mic size={20} aria-hidden />} label="Speak" meta="Pronunciation" />
          <SkillTile to="/reading" icon={<BookOpenText size={20} aria-hidden />} label="Read" meta="Graded texts" />
          <SkillTile
            to="/writing"
            icon={<NotebookPen size={20} aria-hidden />}
            label="Write"
            meta={state.writings.length ? `${state.writings.length} corrected` : 'With corrections'}
          />
          <SkillTile to="/talk" icon={<MessagesSquare size={20} aria-hidden />} label="Talk" meta="Role-play" />
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>Your progress</span>
        </div>
        <div className="stats">
          <Stat label="Day streak" value={streak} />
          <Stat label="Words started" value={learned} />
          <Stat label="Lessons mastered" value={mastered} unit={`/ ${LESSONS.length}`} />
          <Stat label="Total answers" value={totalItems.toLocaleString()} />
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <Heatmap activity={state.activity} goal={goal} />
        </div>
      </section>
    </div>
  )
}

function ActionCard({
  to,
  icon,
  title,
  meta,
  cta,
  tone,
  primary,
}: {
  to: string
  icon: React.ReactNode
  title: string
  meta: string
  cta: string
  tone?: 'green' | 'pink' | 'amber'
  primary?: boolean
}) {
  return (
    <Link to={to} className="card card--interactive hero-card action-card">
      <div className={`hero-card__icon${tone ? ` hero-card__icon--${tone}` : ''}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="card__title">{title}</div>
        <div className="card__meta action-card__meta">{meta}</div>
      </div>
      <span className={`btn ${primary ? 'btn--primary' : 'btn--secondary'} btn--sm`} aria-hidden>
        {cta} <ArrowRight size={15} />
      </span>
    </Link>
  )
}

function SkillTile({ to, icon, label, meta }: { to: string; icon: React.ReactNode; label: string; meta: string }) {
  return (
    <Link to={to} className="skill-tile">
      <span className="skill-tile__icon">{icon}</span>
      <span className="skill-tile__label">{label}</span>
      <span className="skill-tile__meta">{meta}</span>
    </Link>
  )
}

function Welcome({ onPick }: { onPick: (l: Level) => void }) {
  return (
    <section className="card welcome" aria-labelledby="welcome-title">
      <div className="row" style={{ gap: 10, marginBottom: 6 }}>
        <Sparkles size={20} color="var(--primary-text)" aria-hidden />
        <h2 id="welcome-title" className="welcome__title">
          Bienvenue&nbsp;! Where would you like to start?
        </h2>
      </div>
      <p className="muted" style={{ maxWidth: '62ch' }}>
        Three short daily habits: review vocabulary with spaced repetition, learn one grammar point at a time, and drill
        verb forms until they’re automatic. It pairs well with input from LingQ and listening with Alexa — and you can
        import your Anki or LingQ words under Vocabulary → Add & import.
      </p>
      <div className="level-pick">
        {LEVELS.map((l) => (
          <button key={l} type="button" className="level-pick__btn" onClick={() => onPick(l)}>
            <span className={`badge badge--${l}`}>{l}</span>
            <strong>{LEVEL_INFO[l].name}</strong>
            <span className="muted small">{LEVEL_INFO[l].description}</span>
          </button>
        ))}
      </div>
      <p className="subtle small" style={{ marginTop: 12 }}>
        You can change decks any time, and mark words you already know with one key.
      </p>
    </section>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
