import { useMemo } from 'react'
import { Button, Container } from '@mantine/core'
import { Link } from 'react-router'
import { History, Map as MapIcon, Users } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { SyncAccount } from '../../components/SyncAccount'
import { useStore } from '../../lib/store'
import { syncConfigured, useSync } from '../../lib/sync/engine'
import { useDocumentTitle } from '../../lib/hooks'
import { profileStats } from '../../lib/profile'
import { ProfileView } from './ProfileView'

/** Your own profile: account and sync, then your progress. */
export default function ProfilePage() {
  const user = useSync((s) => s.user)
  useDocumentTitle('Profile')
  const s = useStore()
  const stats = useMemo(() => profileStats(s), [s])

  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader
        eyebrow="Profil"
        title={user?.name ?? 'Profile'}
        actions={
          <>
            <Button component={Link} to="/history" variant="default" size="sm" leftSection={<History size={16} aria-hidden />}>
              History
            </Button>
            {/* On phones People and the roadmap aren't in the bottom bar, so they live here. */}
            {syncConfigured && (
              <Button component={Link} to="/people" variant="default" size="sm" leftSection={<Users size={16} aria-hidden />} hiddenFrom="sm">
                People
              </Button>
            )}
            <Button component={Link} to="/roadmap" variant="default" size="sm" leftSection={<MapIcon size={16} aria-hidden />} hiddenFrom="sm">
              Roadmap
            </Button>
          </>
        }
      />
      <SyncAccount />
      <ProfileView stats={stats} />
    </Container>
  )
}
