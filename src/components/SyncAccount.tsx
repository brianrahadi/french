import { useEffect, useState, type ReactNode } from 'react'
import { ActionIcon, Alert, Anchor, Avatar, Box, Button, Card, Group, Loader, NavLink, Stack, Text, ThemeIcon } from '@mantine/core'
import { Link } from 'react-router'
import { AlertTriangle, Cloud, CloudCog, CloudOff, LogIn, LogOut, RefreshCw, X } from 'lucide-react'
import { signInWithGoogle, signOut, syncConfigured, syncNow, useSync, type SyncState } from '../lib/sync/engine'

/** "just now", "3 min ago", "at 14:05" */
function since(iso: string | null, now = Date.now()): string {
  if (!iso) return ''
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `at ${new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

/** Re-renders every 30 s so relative times stay fresh. */
function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

export function GoogleButton({ label = 'Continue with Google', size }: { label?: string; size?: 'sm' }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      size={size === 'sm' ? 'xs' : 'sm'}
      disabled={busy}
      leftSection={busy ? <Loader size={14} color="currentColor" aria-hidden /> : <LogIn size={16} aria-hidden />}
      onClick={async () => {
        setBusy(true)
        await signInWithGoogle()
        setBusy(false)
      }}
    >
      {label}
    </Button>
  )
}

const LABEL: Record<SyncState, string> = {
  off: 'Sync not set up',
  starting: 'Connecting…',
  'signed-out': 'Not signed in',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline — will sync later',
  error: 'Sync paused',
}

const LINE_COLOR: Partial<Record<SyncState, string>> = { synced: 'green', error: 'orange', offline: 'orange' }

/** Icon + title + one line of text, the head of every sync card. */
function CardHead({ icon, title, children }: { icon: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <Group gap="md" wrap="nowrap" align="center">
      {icon}
      <Box miw={0}>
        <Text fw={650}>{title}</Text>
        {children}
      </Box>
    </Group>
  )
}

const cloudIcon = (Icon: typeof Cloud, hideOnPhone?: boolean) => (
  <ThemeIcon variant="light" size={40} radius="xl" visibleFrom={hideOnPhone ? 'xs' : undefined}>
    <Icon size={20} aria-hidden />
  </ThemeIcon>
)

/** Settings section: sign in with Google, sync status, sign out. */
export function SyncAccount() {
  const { state, user, lastSyncAt, error } = useSync()
  const [leaving, setLeaving] = useState(false)
  useTick()

  if (!syncConfigured)
    return (
      <Card>
        <CardHead icon={cloudIcon(CloudCog)} title="Sync across devices">
          <Text size="sm" c="dimmed" mt={2}>
            This copy of the app isn’t connected to a sync server yet, so progress stays in this browser. Whoever runs it can
            connect a free Supabase project with Google sign-in — the README explains how in a few steps.
          </Text>
        </CardHead>
      </Card>
    )

  if (!user)
    return (
      <Card>
        <Stack gap="sm">
          <CardHead icon={cloudIcon(Cloud)} title="Keep your progress on every device">
            <Text size="sm" c="dimmed" mt={2}>
              Sign in with Google and your flashcards, lessons, mistakes, texts and conversations stay in sync between your
              phone and computer. What’s already on this device is kept and merged.
            </Text>
          </CardHead>
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <Group gap="md">
            {state === 'starting' ? (
              <Group gap={6} c="dimmed">
                <Loader size={14} color="currentColor" aria-hidden />
                <Text size="sm">Connecting…</Text>
              </Group>
            ) : (
              <GoogleButton />
            )}
            <Anchor component={Link} to="/privacy" size="sm" c="dimmed">
              What’s stored and where
            </Anchor>
          </Group>
        </Stack>
      </Card>
    )

  return (
    <Card>
      <Stack gap="sm">
        <CardHead
          icon={
            <Avatar src={user.avatar || null} alt="" size={44} radius="xl" color="indigo" variant="filled" imageProps={{ referrerPolicy: 'no-referrer' }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          }
          title={user.name}
        >
          <Text size="sm" c="dimmed" truncate>
            {user.email}
          </Text>
        </CardHead>
        <Alert
          role="status"
          variant="light"
          color={LINE_COLOR[state] ?? 'gray'}
          icon={<SyncGlyph state={state} />}
          py={8}
          px="sm"
          styles={{ icon: { marginInlineEnd: 8 } }}
        >
          <Text size="sm" fw={600} c="inherit">
            {LABEL[state]}
            {state === 'synced' && lastSyncAt ? ` · ${since(lastSyncAt)}` : ''}
          </Text>
        </Alert>
        {error && state !== 'synced' && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Progress saves to your account when you pause or switch apps, and updates whenever you open the app. AI keys, voice and theme stay on each device.
        </Text>
        <Group gap="sm">
          <Button
            variant="default"
            size="xs"
            onClick={() => void syncNow()}
            disabled={state === 'syncing'}
            leftSection={state === 'syncing' ? <Loader size={14} color="currentColor" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
          >
            Sync now
          </Button>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            disabled={leaving}
            leftSection={<LogOut size={15} aria-hidden />}
            onClick={async () => {
              setLeaving(true)
              await signOut()
              setLeaving(false)
            }}
          >
            Sign out
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}

export function SyncGlyph({ state, size = 16 }: { state: SyncState; size?: number }) {
  if (state === 'syncing' || state === 'starting') return <Loader size={size} color="currentColor" aria-hidden />
  if (state === 'offline') return <CloudOff size={size} aria-hidden />
  if (state === 'error') return <AlertTriangle size={size} aria-hidden />
  return <Cloud size={size} aria-hidden />
}

/** Compact status for the sidebar: synced / syncing / sign-in prompt. */
export function SyncBadge() {
  const { state, user, lastSyncAt } = useSync()
  useTick()
  if (!syncConfigured) return null
  if (!user)
    return (
      <NavLink component={Link} to="/settings#account" label="Sign in to sync" leftSection={<Cloud size={19} aria-hidden />} fw={550} style={{ borderRadius: 'var(--mantine-radius-md)' }} />
    )
  return (
    <NavLink
      component={Link}
      to="/settings#account"
      title={state === 'synced' && lastSyncAt ? `Synced ${since(lastSyncAt)}` : LABEL[state]}
      label={state === 'synced' ? 'Synced' : LABEL[state]}
      leftSection={<SyncGlyph state={state} size={19} />}
      c={state === 'error' ? 'red' : undefined}
      fw={550}
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    />
  )
}

const DISMISS = 'petit-a-petit-sync-prompt'

/** A one-time nudge on Today for people who haven't signed in. */
export function SyncPrompt() {
  const { state, user, error } = useSync()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS) === '1'
    } catch {
      return false
    }
  })
  if (!syncConfigured || user || hidden || state !== 'signed-out') return null
  return (
    <Card component="section" aria-label="Sync across devices" padding="md" mb="md">
      <Group gap="md" wrap="wrap">
        {cloudIcon(Cloud, true)}
        <Box miw={0} style={{ flex: '1 1 220px' }}>
          <Text fw={650}>Study on your phone too?</Text>
          <Text size="sm" c="dimmed" mt={2}>
            Sign in with Google to keep your progress in sync on all your devices.
          </Text>
          {error && (
            <Text size="sm" c="red" mt={4}>
              {error}
            </Text>
          )}
        </Box>
        <Group gap="xs" wrap="nowrap">
          <GoogleButton size="sm" label="Sign in" />
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label="Not now"
            onClick={() => {
              setHidden(true)
              try {
                localStorage.setItem(DISMISS, '1')
              } catch {
                /* ignore */
              }
            }}
          >
            <X size={16} aria-hidden />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}
