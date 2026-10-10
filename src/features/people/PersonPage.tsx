import { Navigate, useParams } from 'react-router'
import { Anchor, Avatar, Box, Card, Container, Group, Loader, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { LEVEL_INFO } from '../../data/types'
import { useDocumentTitle } from '../../lib/hooks'
import { useSync } from '../../lib/sync/engine'
import { getPerson } from '../../lib/sync/profiles'
import { ProfileView } from '../profile/ProfileView'
import { joinedLabel, lastStudied, useSignedInLoad } from './load'
import { LoadError, PeopleGate } from './shared'

/** Another learner's profile: the same page as your own /profile, from what they share. */
export default function PersonPage() {
  const { id = '' } = useParams()
  const me = useSync((s) => s.user)
  const { data: p, error, reload } = useSignedInLoad(`person:${id}`, () => getPerson(id))
  useDocumentTitle(p?.name ?? 'Profile')

  if (me && me.id === id) return <Navigate to="/profile" replace />

  const back = (
    <Anchor component={Link} to="/people" size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
      <ArrowLeft size={16} aria-hidden /> People
    </Anchor>
  )

  if (!me || error || p === undefined)
    return (
      <Container size="var(--page-w)" py="xl">
        {back}
        <PeopleGate />
        {me && error && <LoadError error={error} onRetry={reload} />}
        {me && !error && (
          <Group gap={8} c="dimmed" py="md" aria-busy="true">
            <Loader size={16} color="currentColor" aria-hidden />
            <Text size="sm">Loading profile…</Text>
          </Group>
        )}
      </Container>
    )

  if (!p)
    return (
      <Container size="var(--page-w)" py="xl">
        {back}
        <Title order={1} fz={{ base: 28, sm: 34 }} mb="xs">
          Profile not available
        </Title>
        <Text c="dimmed">This learner doesn’t exist or has chosen not to show their profile.</Text>
      </Container>
    )

  const last = lastStudied(p.summary?.lastDay ?? null)
  return (
    <Container size="var(--page-w)" py="xl">
      <Box component="header" mb="lg">
        {back}
        <Group gap="md" wrap="nowrap" align="center">
          <Avatar src={p.avatar} name={p.name} alt="" size={64} radius="xl" color="initials" imageProps={{ referrerPolicy: 'no-referrer' }} />
          <Box miw={0}>
            <Text size="sm" fw={600} c="dimmed" mb={2}>
              Profil
              {p.stats && ` · ${p.stats.level} ${LEVEL_INFO[p.stats.level].name}`}
            </Text>
            <Title order={1} fz={{ base: 28, sm: 34 }} style={{ overflowWrap: 'anywhere' }}>
              {p.name}
            </Title>
            <Text c="dimmed" mt={4} size="sm">
              {[p.joinedAt && `Joined ${joinedLabel(p.joinedAt)}`, last && `last studied ${last}`].filter(Boolean).join(' · ')}
            </Text>
          </Box>
        </Group>
      </Box>
      {p.stats ? (
        <ProfileView stats={p.stats} />
      ) : (
        <Card>
          <Text fw={650}>Nothing to show yet</Text>
          <Text size="sm" c="dimmed" mt={2}>
            {p.name}’s progress appears here the next time they open Petit à petit while signed in.
          </Text>
        </Card>
      )}
    </Container>
  )
}
