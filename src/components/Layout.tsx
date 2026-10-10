import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { ActionIcon, AppShell, Badge, Box, Group, Indicator, NavLink, ScrollArea, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { CircleUserRound, Dumbbell, House, Layers, LibraryBig, Map as MapIcon, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dayKey, endOfDay } from '../lib/date'
import { countWeakSpots } from '../features/weak/count'
import { ProfileLink } from './SyncAccount'
import { RAIL_W, railLink, SIDEBAR_SHORTCUT } from './rail'
import { SidebarActivity } from '../features/history/Activity'
import { syncConfigured, useSync } from '../lib/sync/engine'
import { isAdminEmail } from '../features/admin/access'

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

// Four places: what to do today, content to study, your words, and drills. The roadmap sits with Profile.
const NAV: (NavItem & { also?: string[] })[] = [
  { to: '/', label: 'Today', short: 'Today', icon: House, end: true },
  { to: '/library', label: 'Library', short: 'Library', icon: LibraryBig, also: ['/grammar', '/reading', '/books', '/listening/story', '/audio', '/talk', '/writing'] },
  { to: '/vocab', label: 'Vocabulary', short: 'Words', icon: Layers },
  { to: '/practice', label: 'Practice', short: 'Practice', icon: Dumbbell, also: ['/weak', '/conjugation', '/verbs', '/speaking', '/dictation', '/listening/session'] },
]

// Phones have no sidebar footer, so Profile (with History and Roadmap behind it) is the bottom bar's fifth tab.
const PHONE_PROFILE: NavItem & { also?: string[] } = { to: '/profile', label: 'Profile', short: 'Profile', icon: CircleUserRound, also: ['/history', '/roadmap', '/people'] }

// Everyone else's profiles (/profile/:id) belong to People, not to your own Profile.
const PEOPLE: NavItem & { also?: string[] } = { to: '/people', label: 'People', short: 'People', icon: Users, also: ['/profile/'] }
const isOwnProfile = (pathname: string) => pathname === '/profile' || pathname === '/profile/'

const isActive = (pathname: string, to: string, end?: boolean) =>
  end ? pathname === to : to.endsWith('/') ? pathname.startsWith(to) && pathname !== to : pathname === to || pathname.startsWith(`${to}/`)

const NAV_W = 232

export function Layout() {
  const { due, grammar, weak } = useBadges()
  const { pathname } = useLocation()
  const admin = isAdminEmail(useSync((s) => s.user?.email))
  // The sidebar can shrink to a rail of icons (wide screens; phones use the bottom bar).
  const collapsed = useStore((s) => s.settings.navCollapsed)
  const updateSettings = useStore((s) => s.updateSettings)
  const toggleNav = () => updateSettings({ navCollapsed: !collapsed })
  useHotkeys([['mod+B', toggleNav]])
  const active = (item: (typeof NAV)[number]) => isActive(pathname, item.to, item.end) || (item.also ?? []).some((p) => isActive(pathname, p))
  const badge = (to: string) => (to === '/vocab' ? due : to === '/library' ? grammar : to === '/practice' ? weak : 0)
  const soft = (to: string) => to === '/practice'
  const label = (to: string) => (to === '/vocab' ? 'due' : to === '/library' ? 'grammar reviews due' : 'weak spots')

  const link = (item: (typeof NAV)[number]) => {
    const { to, label: text, icon: Icon } = item
    const n = badge(to)
    if (collapsed) {
      return (
        <Tooltip key={to} label={n > 0 ? `${text} · ${n} ${label(to)}` : text} position="right" withArrow openDelay={150}>
          <NavLink
            component={Link}
            to={to}
            aria-label={n > 0 ? `${text}, ${n} ${label(to)}` : text}
            active={active(item)}
            leftSection={
              <Indicator disabled={n === 0} size={8} offset={1} color={soft(to) ? 'gray' : undefined}>
                <Icon size={19} aria-hidden />
              </Indicator>
            }
            {...railLink}
          />
        </Tooltip>
      )
    }
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
    <AppShell navbar={{ width: collapsed ? RAIL_W : NAV_W, breakpoint: 'sm', collapsed: { mobile: true } }} footer={{ height: { base: 64, sm: 0 } }} padding={0}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppShell.Navbar p="sm" bg="var(--nav-bg)" aria-label="Main navigation" className="app-nav" data-collapsed={collapsed || undefined}>
        <AppShell.Section>
          {collapsed ? (
            <Stack gap={6} align="center" mb="sm">
              <UnstyledButton component={Link} to="/" aria-label="Petit à petit — home" py="xs">
                <ThemeIcon size={32} radius="md" fz={20} className="fr">
                  é
                </ThemeIcon>
              </UnstyledButton>
              <NavToggle collapsed onClick={toggleNav} />
            </Stack>
          ) : (
            <Group justify="space-between" wrap="nowrap" gap={4} mb="sm">
              <UnstyledButton component={Link} to="/" aria-label="Petit à petit — home" p="xs" miw={0}>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size={32} radius="md" fz={20} className="fr">
                    é
                  </ThemeIcon>
                  <Text fz={19} fw={600} className="fr" truncate>
                    Petit à petit
                  </Text>
                </Group>
              </UnstyledButton>
              <NavToggle collapsed={false} onClick={toggleNav} />
            </Group>
          )}
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} scrollbars="y">
          <Stack gap={2}>{NAV.map(link)}</Stack>
          {!collapsed && <SidebarActivity />}
        </AppShell.Section>
        <AppShell.Section>
          <Stack gap={2}>
            {admin && link({ to: '/admin', label: 'Admin', short: 'Admin', icon: ShieldCheck })}
            {link({ to: '/roadmap', label: 'Roadmap', short: 'Roadmap', icon: MapIcon })}
            {syncConfigured && link(PEOPLE)}
            <ProfileLink active={isOwnProfile(pathname)} compact={collapsed} />
            {link({ to: '/settings', label: 'Settings', short: 'Settings', icon: Settings })}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main id="main" bg="var(--bg)">
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer bg="var(--nav-bg)" aria-label="Main navigation" component="nav" hiddenFrom="sm">
        <Group grow h="100%" gap={0} px={4}>
          {[...NAV, PHONE_PROFILE].map((item) => {
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

/** Shrink the sidebar to icons, or open it back up. */
function NavToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const text = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <Tooltip label={`${text} (${SIDEBAR_SHORTCUT})`} position="right" withArrow openDelay={300}>
      <ActionIcon variant="subtle" color="gray" size="lg" onClick={onClick} aria-label={text} aria-expanded={!collapsed}>
        <Icon size={18} aria-hidden />
      </ActionIcon>
    </Tooltip>
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
