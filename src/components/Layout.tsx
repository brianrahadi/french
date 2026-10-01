import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import {
  BookOpen,
  BookOpenText,
  Dumbbell,
  Headphones,
  House,
  Layers,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Settings,
  Table2,
  Target,
} from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dayKey, endOfDay } from '../lib/date'
import { countWeakSpots } from '../features/weak/count'
import { Toaster } from './Toast'
import { SyncBadge } from './SyncAccount'

function useBadges() {
  const cards = useStore((s) => s.cards)
  const lessons = useStore((s) => s.lessons)
  const mistakes = useStore((s) => s.mistakes)
  const skills = useStore((s) => s.skills)
  const conj = useStore((s) => s.conj)
  const counts = useMemo(() => {
    const end = endOfDay().toISOString()
    let due = 0
    for (const c of Object.values(cards)) if (c.due <= end) due++
    const today = dayKey()
    let grammar = 0
    for (const l of Object.values(lessons)) if (l.nextReview && l.nextReview <= today && l.best >= 0.8) grammar++
    return { due, grammar }
  }, [cards, lessons])
  const weak = useMemo(() => countWeakSpots({ mistakes, skills, conj, cards }), [mistakes, skills, conj, cards])
  return { ...counts, weak }
}

type NavItem = { to: string; label: string; short: string; icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; end?: boolean }

const TODAY: NavItem = { to: '/', label: 'Today', short: 'Today', icon: House, end: true }
const LEARN: NavItem[] = [
  { to: '/vocab', label: 'Vocabulary', short: 'Words', icon: Layers },
  { to: '/grammar', label: 'Grammar', short: 'Grammar', icon: BookOpen },
  { to: '/conjugation', label: 'Conjugation', short: 'Verbs', icon: PenLine },
  { to: '/verbs', label: 'Verb tables', short: 'Tables', icon: Table2 },
]
const PRACTISE: NavItem[] = [
  { to: '/listening', label: 'Listening', short: 'Listen', icon: Headphones },
  { to: '/speaking', label: 'Speaking', short: 'Speak', icon: Mic },
  { to: '/reading', label: 'Reading', short: 'Read', icon: BookOpenText },
  { to: '/writing', label: 'Writing', short: 'Write', icon: NotebookPen },
  { to: '/talk', label: 'Conversation', short: 'Talk', icon: MessagesSquare },
  { to: '/weak', label: 'Weak spots', short: 'Weak', icon: Target },
]
const PRACTICE_PATHS = ['/practice', ...PRACTISE.map((p) => p.to)]

export function Layout() {
  const { due, grammar, weak } = useBadges()
  const { pathname } = useLocation()
  const inPractice = PRACTICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const badge = (to: string) => (to === '/vocab' ? due : to === '/grammar' ? grammar : to === '/weak' ? weak : 0)

  const link = ({ to, label, icon: Icon, end }: NavItem) => (
    <NavLink key={to} to={to} end={end} className="nav-link">
      <Icon size={19} aria-hidden />
      {label}
      {badge(to) > 0 && (
        <span className={`nav-link__count${to === '/weak' ? ' nav-link__count--soft' : ''}`} aria-label={`${badge(to)} ${to === '/weak' ? 'weak spots' : 'due'}`}>
          {badge(to) > 999 ? '999+' : badge(to)}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        <NavLink to="/" className="brand" aria-label="Petit à petit — home">
          <span className="brand__mark" aria-hidden>
            é
          </span>
          <span className="brand__name">Petit à petit</span>
        </NavLink>
        <nav className="sidebar__nav">
          <div className="stack" style={{ gap: 2 }}>
            {link(TODAY)}
          </div>
          <div className="nav-group">
            <div className="nav-group__label">Learn</div>
            <div className="stack" style={{ gap: 2 }}>
              {LEARN.map(link)}
            </div>
          </div>
          <div className="nav-group">
            <NavLink to="/practice" className="nav-group__label nav-group__label--link">
              Practice
            </NavLink>
            <div className="stack" style={{ gap: 2 }}>
              {PRACTISE.map(link)}
            </div>
          </div>
        </nav>
        <div className="sidebar__footer">
          <SyncBadge />
          <NavLink to="/settings" className="nav-link">
            <Settings size={19} aria-hidden />
            Settings
          </NavLink>
        </div>
      </aside>

      <main id="main" className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {[TODAY, LEARN[0], LEARN[1], LEARN[2]].map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} aria-hidden />
            {short}
            {badge(to) > 0 && (
              <span className="dot" aria-label={`${badge(to)} due`}>
                {badge(to) > 99 ? '99+' : badge(to)}
              </span>
            )}
          </NavLink>
        ))}
        <NavLink
          to="/practice"
          className={({ isActive }) => (isActive || inPractice ? 'active' : '')}
          aria-current={inPractice ? 'page' : undefined}
        >
          <Dumbbell size={22} aria-hidden />
          Practice
          {weak > 0 && (
            <span className="dot dot--soft" aria-label={`${weak} weak spots`}>
              {weak > 99 ? '99+' : weak}
            </span>
          )}
        </NavLink>
      </nav>
      <Toaster />
      <ScrollRestoration />
    </div>
  )
}

/** Wrapper for full-screen study sessions (no navigation chrome). */
export function FocusLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <ScrollRestoration />
    </>
  )
}
