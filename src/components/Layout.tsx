import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { AppShell, Badge, Box, Group, Indicator, NavLink, ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { Dumbbell, House, Layers, LibraryBig, Map as MapIcon, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dayKey, endOfDay } from '../lib/date'
import { countWeakSpots } from '../features/weak/count'
import { ProfileLink } from './SyncAccount'

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

// Five places: what to do today, the plan behind it, content to study, your words, and drills.
const NAV: (NavItem & { also?: string[] })[] = [
  { to: '/', label: 'Today', short: 'Today', icon: House, end: true },
  { to: '/roadmap', label: 'Roadmap', short: 'Plan', icon: MapIcon },
  { to: '/library', label: 'Library', short: 'Library', icon: LibraryBig, also: ['/grammar', '/reading', '/listening/story', '/audio', '/talk', '/writing'] },
  { to: '/vocab', label: 'Vocabulary', short: 'Words', icon: Layers },
  { to: '/practice', label: 'Practice', short: 'Practice', icon: Dumbbell, also: ['/weak', '/conjugation', '/verbs', '/speaking', '/dictation', '/listening/session'] },
]

const isActive = (pathname: string, to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))

export function Layout() {
  const { due, grammar, weak } = useBadges()
  const { pathname } = useLocation()
  const active = (item: (typeof NAV)[number]) => isActive(pathname, item.to, item.end) || (item.also ?? []).some((p) => isActive(pathname, p))
  const badge = (to: string) => (to === '/vocab' ? due : to === '/library' ? grammar : to === '/practice' ? weak : 0)
  const soft = (to: string) => to === '/practice'
  const label = (to: string) => (to === '/vocab' ? 'due' : to === '/library' ? 'grammar reviews due' : 'weak spots')

  const link = (item: (typeof NAV)[number]) => {
    const { to, label: text, icon: Icon } = item
    const n = badge(to)
    return (
      <NavLink
        key={to}
        component={Link}
        to={to}
        label={text}
        active={active(item)}
        leftSection={<Icon size={19} aria-hidden />}
        rightSection={
          n > 0 && (
            <Badge size="sm" variant={soft(to) ? 'light' : 'filled'} color={soft(to) ? 'gray' : undefined} aria-label={`${n} ${label(to)}`}>
              {n > 999 ? '999+' : n}
            </Badge>
          )
        }
        fw={550}
        style={{ borderRadius: 'var(--mantine-radius-md)' }}
      />
    )
  }

  return (
    <AppShell navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: true } }} footer={{ height: { base: 64, sm: 0 } }} padding={0}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppShell.Navbar p="sm" bg="var(--nav-bg)" aria-label="Main navigation">
        <AppShell.Section>
          <UnstyledButton component={Link} to="/" aria-label="Petit à petit — home" p="xs" mb="sm">
            <Group gap="sm">
              <ThemeIcon size={32} radius="md" fz={20} className="fr">
                é
              </ThemeIcon>
              <Text fz={19} fw={600} className="fr">
                Petit à petit
              </Text>
            </Group>
          </UnstyledButton>
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={2}>{NAV.map(link)}</Stack>
        </AppShell.Section>
        <AppShell.Section>
          <ProfileLink active={isActive(pathname, '/profile')} />
          {link({ to: '/settings', label: 'Settings', short: 'Settings', icon: Settings })}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main id="main" bg="var(--bg)">
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer bg="var(--nav-bg)" aria-label="Main navigation" component="nav" hiddenFrom="sm">
        <Group grow h="100%" gap={0} px={4}>
          {NAV.map((item) => {
            const { to, short, icon: Icon } = item
            const on = active(item)
            const n = badge(to)
            return (
              <UnstyledButton key={to} component={Link} to={to} aria-current={on ? 'page' : undefined} c={on ? 'var(--mantine-primary-color-filled)' : 'dimmed'}>
                <Stack align="center" gap={2}>
                  <Indicator disabled={n === 0} label={n > 99 ? '99+' : n} size={16} color={soft(to) ? 'gray' : undefined} offset={2}>
                    <Icon size={22} aria-hidden />
                  </Indicator>
                  <Text size="xs" fw={600} inherit={false} c="inherit">
                    {short}
                  </Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>
      <ScrollRestoration />
    </AppShell>
  )
}

/** Wrapper for full-screen study sessions (no navigation chrome). */
export function FocusLayout() {
  return (
    <Box bg="var(--bg)" mih="100dvh">
      <Outlet />
      <ScrollRestoration />
    </Box>
  )
}
