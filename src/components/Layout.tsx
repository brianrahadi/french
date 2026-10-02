import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { AppShell, Badge, Box, Group, Indicator, NavLink, ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import {
  AudioLines,
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
  { to: '/audio', label: 'Audio lessons', short: 'Audio', icon: AudioLines },
  { to: '/listening', label: 'Listening', short: 'Listen', icon: Headphones },
  { to: '/speaking', label: 'Speaking', short: 'Speak', icon: Mic },
  { to: '/reading', label: 'Reading', short: 'Read', icon: BookOpenText },
  { to: '/writing', label: 'Writing', short: 'Write', icon: NotebookPen },
  { to: '/talk', label: 'Conversation', short: 'Talk', icon: MessagesSquare },
  { to: '/weak', label: 'Weak spots', short: 'Weak', icon: Target },
]
const PRACTICE_PATHS = ['/practice', ...PRACTISE.map((p) => p.to)]

const isActive = (pathname: string, to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mt="md" mb={4} style={{ letterSpacing: '0.06em' }}>
      {children}
    </Text>
  )
}

export function Layout() {
  const { due, grammar, weak } = useBadges()
  const { pathname } = useLocation()
  const inPractice = PRACTICE_PATHS.some((p) => isActive(pathname, p))
  const badge = (to: string) => (to === '/vocab' ? due : to === '/grammar' ? grammar : to === '/weak' ? weak : 0)

  const link = ({ to, label, icon: Icon, end }: NavItem) => (
    <NavLink
      key={to}
      component={Link}
      to={to}
      label={label}
      active={isActive(pathname, to, end)}
      leftSection={<Icon size={19} aria-hidden />}
      rightSection={
        badge(to) > 0 && (
          <Badge size="sm" variant={to === '/weak' ? 'light' : 'filled'} color={to === '/weak' ? 'gray' : undefined} aria-label={`${badge(to)} ${to === '/weak' ? 'weak spots' : 'due'}`}>
            {badge(to) > 999 ? '999+' : badge(to)}
          </Badge>
        )
      }
      fw={550}
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    />
  )

  const bottom: NavItem[] = [TODAY, LEARN[0], LEARN[1], LEARN[2], { to: '/practice', label: 'Practice', short: 'Practice', icon: Dumbbell }]

  return (
    <AppShell navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: true } }} footer={{ height: { base: 64, sm: 0 } }} padding={0}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppShell.Navbar p="sm" aria-label="Main navigation">
        <AppShell.Section>
          <UnstyledButton component={Link} to="/" aria-label="Petit à petit — home" p="xs" mb="xs">
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
          <Stack gap={2}>{link(TODAY)}</Stack>
          <GroupLabel>Learn</GroupLabel>
          <Stack gap={2}>{LEARN.map(link)}</Stack>
          <GroupLabel>
            <Text component={Link} to="/practice" inherit c="dimmed" td="none">
              Practice
            </Text>
          </GroupLabel>
          <Stack gap={2}>{PRACTISE.map(link)}</Stack>
        </AppShell.Section>
        <AppShell.Section>
          <SyncBadge />
          {link({ to: '/settings', label: 'Settings', short: 'Settings', icon: Settings })}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main id="main" bg="var(--bg)">
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer aria-label="Main navigation" component="nav" hiddenFrom="sm">
        <Group grow h="100%" gap={0} px={4}>
          {bottom.map(({ to, short, icon: Icon, end }) => {
            const active = to === '/practice' ? inPractice : isActive(pathname, to, end)
            const n = to === '/practice' ? weak : badge(to)
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                aria-current={active ? 'page' : undefined}
                c={active ? 'var(--mantine-primary-color-filled)' : 'dimmed'}
              >
                <Stack align="center" gap={2}>
                  <Indicator disabled={n === 0} label={n > 99 ? '99+' : n} size={16} color={to === '/practice' ? 'gray' : undefined} offset={2}>
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
