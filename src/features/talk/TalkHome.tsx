import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Briefcase,
  Check,
  Coffee,
  Croissant,
  Handshake,
  Hotel,
  House,
  Map as MapIcon,
  MessagesSquare,
  Newspaper,
  Package,
  PartyPopper,
  Phone,
  Plane,
  ShoppingBag,
  Stethoscope,
  Ticket,
  TrainFront,
  Trash2,
  User,
  Utensils,
} from 'lucide-react'
import { SCENARIOS, SCENARIO_BY_ID, type ScenarioIcon } from '../../data/scenarios'
import { LEVELS, type Level } from '../../data/types'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { LevelBadge } from '../../components/ui'
import { newId, useStore } from '../../lib/store'
import { describeConfig, useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { scoreClass } from '../writing/WritingHome'
import { ago } from '../../lib/date'
import { frTypo } from '../../lib/words'
import type { Conversation } from './types'

export const SCENARIO_ICONS: Record<ScenarioIcon, React.ComponentType<{ size?: number }>> = {
  coffee: Coffee,
  croissant: Croissant,
  map: MapIcon,
  hotel: Hotel,
  stethoscope: Stethoscope,
  shopping: ShoppingBag,
  phone: Phone,
  briefcase: Briefcase,
  home: House,
  train: TrainFront,
  party: PartyPopper,
  package: Package,
  utensils: Utensils,
  handshake: Handshake,
  newspaper: Newspaper,
  plane: Plane,
  user: User,
  ticket: Ticket,
}

const FREE_TOPICS = ['ton week-end', 'les films et les séries', 'la cuisine', 'ton travail ou tes études', 'les voyages', 'ta ville']

/** Creates a conversation and returns its id. */
export function useStartConversation() {
  const saveConversation = useStore((s) => s.saveConversation)
  const ai = useAiConfig()
  return (opts: { scenarioId: string; level: Level; topic?: string }) => {
    const sc = SCENARIO_BY_ID[opts.scenarioId]
    const now = new Date().toISOString()
    const c: Conversation = {
      id: newId('c'),
      scenarioId: opts.scenarioId,
      title: sc ? sc.titleFr : opts.topic?.trim() ? opts.topic.trim() : 'Conversation libre',
      level: sc?.level ?? opts.level,
      topic: opts.topic?.trim() || undefined,
      turns: [
        {
          id: newId('t'),
          role: 'ai',
          text: sc ? sc.opening : freeOpening(opts.topic),
          translation: sc ? sc.openingEn : freeOpeningEn(opts.topic),
          at: now,
        },
      ],
      goalsMet: [],
      startedAt: now,
      updatedAt: now,
      model: ai ? describeConfig(ai) : '',
    }
    saveConversation(c)
    return c.id
  }
}

function freeOpening(topic?: string): string {
  return topic?.trim()
    ? `Salut ! Moi, c'est Camille. Alors, parlons un peu de ça : ${topic.trim()}. Tu commences ?`
    : "Salut ! Je suis Camille. De quoi est-ce que tu veux parler aujourd'hui ?"
}
function freeOpeningEn(topic?: string): string {
  return topic?.trim()
    ? `Hi! I’m Camille. So, let’s talk a bit about this: ${topic.trim()}. Do you want to start?`
    : 'Hi! I’m Camille. What would you like to talk about today?'
}

export default function TalkHome() {
  useDocumentTitle('Conversation')
  const navigate = useNavigate()
  const ai = useAiConfig()
  const conversations = useStore((s) => s.conversations)
  const deleteConversation = useStore((s) => s.deleteConversation)
  const startLevel = useStore((s) => s.startLevel)
  const start = useStartConversation()
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [freeLevel, setFreeLevel] = useState<Level>(startLevel ?? 'A2')
  const [topic, setTopic] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  const done = new Set(conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  const shown = SCENARIOS.filter((s) => level === 'all' || s.level === level)
  const go = (scenarioId: string, lvl: Level, t?: string) => navigate(`/talk/${start({ scenarioId, level: lvl, topic: t })}`)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Conversation</div>
          <h1 className="page-title">Talk</h1>
          <p className="page-subtitle">
            Role-play real situations with an AI partner who stays in character. Each message you send gets quietly corrected,
            you can ask for help or hear every reply, and at the end you get feedback on the whole conversation.
          </p>
        </div>
      </header>

      {!ai && (
        <div style={{ marginBottom: 24 }}>
          <ConnectAiCard title="Connect an AI to start talking" />
        </div>
      )}

      <section className="card free-talk" aria-labelledby="free-title">
        <div className="hero-card__icon">
          <MessagesSquare size={22} aria-hidden />
        </div>
        <div className="free-talk__body">
          <h2 id="free-title" className="card__title">
            Free conversation
          </h2>
          <p className="small muted">Chat about anything with Camille, a friendly French speaker.</p>
          <form
            className="free-talk__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (ai) go('free', freeLevel, topic)
            }}
          >
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic (optional) — e.g. les vacances"
              aria-label="Topic"
            />
            <select className="select" value={freeLevel} onChange={(e) => setFreeLevel(e.target.value as Level)} aria-label="Your level">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn--primary" disabled={!ai}>
              Start
            </button>
          </form>
          <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
            {FREE_TOPICS.map((t) => (
              <button key={t} type="button" className="chip chip--sm" onClick={() => setTopic(t)} aria-pressed={topic === t}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="scenarios-title">
        <div className="section-title">
          <h2 id="scenarios-title" style={{ font: 'inherit', margin: 0 }}>
            Situations
          </h2>
          <div className="segmented" role="group" aria-label="Level">
            {(['all', ...LEVELS] as const).map((l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>
                {l === 'all' ? 'All' : l}
              </button>
            ))}
          </div>
        </div>
        <div className="scenario-grid">
          {shown.map((s) => {
            const Icon = SCENARIO_ICONS[s.icon] ?? MessagesSquare
            return (
              <button
                key={s.id}
                type="button"
                className="card card--interactive scenario-card"
                onClick={() => go(s.id, s.level)}
                disabled={!ai}
                title={ai ? undefined : 'Connect an AI first'}
              >
                <div className="row" style={{ gap: 10, width: '100%' }}>
                  <span className="scenario-card__icon">
                    <Icon size={20} />
                  </span>
                  <LevelBadge level={s.level} />
                  <div className="spacer" />
                  {done.has(s.id) && (
                    <span className="badge badge--success">
                      <Check size={12} aria-hidden /> done
                    </span>
                  )}
                </div>
                <span className="scenario-card__title fr" lang="fr">
                  {frTypo(s.titleFr)}
                </span>
                <span className="small muted">{s.title}</span>
                <span className="small subtle scenario-card__goals">
                  {s.goals.length} goals · with {s.aiName}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {conversations.length > 0 && (
        <section className="section" aria-labelledby="history-title">
          <h2 id="history-title" className="section-title">
            <span>Your conversations</span>
            <span className="tnum">{conversations.length}</span>
          </h2>
          <div className="card card--flush">
            {conversations.map((c) => {
              const mine = c.turns.filter((t) => t.role === 'me').length
              return (
                <div key={c.id} className="list-row text-row">
                  <Link to={`/talk/${c.id}`} className="text-row__main">
                    <span className="text-row__title fr" lang="fr">
                      {frTypo(c.title)}
                    </span>
                    <span className="small subtle">
                      {ago(c.updatedAt)} · {mine} message{mine === 1 ? '' : 's'}
                      {SCENARIO_BY_ID[c.scenarioId] ? ` · ${c.goalsMet.length}/${SCENARIO_BY_ID[c.scenarioId].goals.length} goals` : ''}
                      {!c.feedback && mine > 0 ? ' · in progress' : ''}
                    </span>
                  </Link>
                  <LevelBadge level={c.level} />
                  {c.feedback && <span className={`badge ${scoreClass(c.feedback.score)} tnum`}>{c.feedback.score}</span>}
                  <button type="button" className="icon-btn icon-btn--sm" onClick={() => setConfirm(c.id)} aria-label={`Delete ${c.title}`}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this conversation?"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirm(null)} autoFocus>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                if (confirm) deleteConversation(confirm)
                setConfirm(null)
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="muted">The transcript and feedback will be removed from this browser.</p>
      </Dialog>
    </div>
  )
}
