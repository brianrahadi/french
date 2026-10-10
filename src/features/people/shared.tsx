import { Alert, Button, Card, Group, Loader, Stack, Text, ThemeIcon } from '@mantine/core'
import { AlertTriangle, RefreshCw, Users } from 'lucide-react'
import { GoogleButton } from '../../components/SyncAccount'
import { syncConfigured, useSync } from '../../lib/sync/engine'
import { NotSetUpError } from '../../lib/sync/profiles'

/**
 * What to show instead of People when it can't be used: sync isn't set up,
 * the learner isn't signed in, or the account is still loading. Null when
 * People can be shown.
 */
export function PeopleGate() {
  const { state, user } = useSync()
  if (!syncConfigured)
    return (
      <Card>
        <Text c="dimmed">People needs sign-in, and this copy of the app isn’t connected to a sync server. The README explains how to set it up.</Text>
      </Card>
    )
  if (user) return null
  if (state === 'starting')
    return (
      <Group gap={8} c="dimmed" py="md">
        <Loader size={16} color="currentColor" aria-hidden />
        <Text size="sm">Connecting…</Text>
      </Group>
    )
  return (
    <Card>
      <Stack gap="sm" align="flex-start">
        <Group gap="md" wrap="nowrap">
          <ThemeIcon variant="light" size={40} radius="xl">
            <Users size={20} aria-hidden />
          </ThemeIcon>
          <div>
            <Text fw={650}>See who else is learning</Text>
            <Text size="sm" c="dimmed" mt={2}>
              Sign in with Google to see everyone learning with Petit à petit and open their profiles.
            </Text>
          </div>
        </Group>
        <GoogleButton label="Sign in with Google" />
      </Stack>
    </Card>
  )
}

export function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const setup = error instanceof NotSetUpError
  return (
    <Alert color="orange" variant="light" icon={<AlertTriangle size={18} aria-hidden />} title={setup ? 'People isn’t set up yet' : 'Couldn’t load people'}>
      <Text size="sm">{setup ? error.message : navigator.onLine === false ? 'You’re offline. People loads when you’re back online.' : error.message}</Text>
      {!setup && (
        <Button mt="sm" size="xs" variant="default" leftSection={<RefreshCw size={14} aria-hidden />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  )
}
