import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { BookOpen, House, Layers, NotebookPen, Settings, Table2, PenLine } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dayKey, endOfDay } from '../lib/date'
import { Toaster } from './Toast'

function useBadges() {
  const cards = useStore((s) => s.cards)
  const lessons = useStore((s) => s.lessons)
  return useMemo(() => {
    const end = endOfDay().toISOString()
    let due = 0
    for (const c of Object.values(cards)) if (c.due <= end) due++
    const today = dayKey()
    let grammar = 0
    for (const l of Object.values(lessons)) if (l.nextReview && l.nextReview <= today && l.best >= 0.8) grammar++
    return { due, grammar }
  }, [cards, lessons])
}

const NAV = [
  { to: '/', label: 'Today', short: 'Today', icon: House, end: true },
  { to: '/vocab', label: 'Vocabulary', short: 'Words', icon: Layers },
  { to: '/grammar', label: 'Grammar', short: 'Grammar', icon: BookOpen },
  { to: '/conjugation', label: 'Conjugation', short: 'Verbs', icon: PenLine },
  { to: '/writing', label: 'Writing', short: 'Write', icon: NotebookPen },
  { to: '/verbs', label: 'Verb tables', short: 'Tables', icon: Table2 },
] as const

export function Layout() {
  const { due, grammar } = useBadges()
  const badge = (to: string) => (to === '/vocab' ? due : to === '/grammar' ? grammar : 0)

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
        <nav className="stack" style={{ gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} end={'end' in rest} className="nav-link">
              <Icon size={19} aria-hidden />
              {label}
              {badge(to) > 0 && (
                <span className="nav-link__count" aria-label={`${badge(to)} due`}>
                  {badge(to) > 999 ? '999+' : badge(to)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
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
        {[NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]].map(
          ({ to, short, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={22} aria-hidden />
              {short}
              {badge(to) > 0 && (
                <span className="dot" aria-label={`${badge(to)} due`}>
                  {badge(to) > 99 ? '99+' : badge(to)}
                </span>
              )}
            </NavLink>
          ),
        )}
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
