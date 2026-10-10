import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Badge, Box, Card, Container, Group, Skeleton, Stack, Switch, Text, TextInput, UnstyledButton } from '@mantine/core'
import { ChevronRight, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { LevelBadge } from '../../components/ui'
import { LEVEL_INFO } from '../../data/types'
import { useDocumentTitle } from '../../lib/hooks'
import { liveStreak } from '../../lib/profile'
import { useSync } from '../../lib/sync/engine'
import { listPeople, setListed, type Person } from '../../lib/sync/profiles'
import { lastStudied, useSignedInLoad } from './load'
import { LoadError, PeopleGate } from './shared'

/** Most recently studied first; people who haven't studied yet by newest. */
function byActivity(a: Person, b: Person): number {
  const da = a.summary?.lastDay ?? ''
  const db = b.summary?.lastDay ?? ''
  return db.localeCompare(da) || b.joinedAt.localeCompare(a.joinedAt) || a.name.localeCompare(b.name)
}

export default function PeoplePage() {
  useDocumentTitle('People')
  const me = useSync((s) => s.user)
  const { data, error, loading, reload, setData } = useSignedInLoad('people', listPeople)
  const [q, setQ] = useState('')

  const { mine, others } = useMemo(() => {
    const all = data ?? []
    return { mine: all.find((p) => p.id === me?.id), others: all.filter((p) => p.id !== me?.id && p.listed).sort(byActivity) }
  }, [data, me?.id])
  const needle = q.trim().toLowerCase()
  const shown = needle ? others.filter((p) => p.name.toLowerCase().includes(needle)) : others
  const count = others.length + (mine ? 1 : 0)

  return (
    <Container size="var(--page-w-narrow)" py="xl">
      <PageHeader
        eyebrow="Communauté"
        title="People"
        subtitle={data ? `${count} ${count === 1 ? 'learner' : 'learners'} studying French with Petit à petit.` : 'Everyone studying French with Petit à petit.'}
      />
      <PeopleGate />
      {me && (
        <Stack gap="lg">
          {error ? (
            <LoadError error={error} onRetry={reload} />
          ) : !data && loading ? (
            <Card padding={0} aria-busy="true" aria-label="Loading people">
              {[0, 1, 2, 3].map((i) => (
                <Group key={i} px="md" py={12} gap="sm" wrap="nowrap" style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}>
                  <Skeleton circle height={40} />
                  <Box style={{ flex: 1 }}>
                    <Skeleton height={12} width="40%" mb={8} />
                    <Skeleton height={10} width="65%" />
                  </Box>
                </Group>
              ))}
            </Card>
          ) : data ? (
            <>
              <Visibility
                listed={mine?.listed ?? true}
                onChange={async (listed) => {
                  await setListed(me.id, listed)
                  setData((d) => (mine ? d?.map((p) => (p.id === me.id ? { ...p, listed } : p)) : d))
                  if (!mine) reload()
                }}
              />
              {mine && (
                <Card padding={0}>
                  <PersonRow p={mine} you />
                </Card>
              )}
              {others.length > 8 && (
                <TextInput
                  value={q}
                  onChange={(e) => setQ(e.currentTarget.value)}
                  placeholder="Find someone"
                  aria-label="Find someone by name"
                  leftSection={<Search size={16} aria-hidden />}
                />
              )}
              {!others.length ? (
                <Text c="dimmed">No one else yet. When friends sign in with Google, they’ll show up here.</Text>
              ) : !shown.length ? (
                <Text c="dimmed">No one called “{q.trim()}”.</Text>
              ) : (
                <Card padding={0} component="ul" aria-label="Learners" style={{ listStyle: 'none', margin: 0 }}>
                  {shown.map((p, i) => (
                    <li key={p.id} style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}>
                      <PersonRow p={p} />
                    </li>
                  ))}
                </Card>
              )}
            </>
          ) : null}
        </Stack>
      )}
    </Container>
  )
}

function PersonRow({ p, you }: { p: Person; you?: boolean }) {
  const s = p.summary
  const streak = s ? liveStreak(s) : 0
  const last = lastStudied(s?.lastDay ?? null)
  const meta = s
    ? [`${s.words.toLocaleString('en')} word${s.words === 1 ? '' : 's'}`, `${s.studyDays.toLocaleString('en')} study day${s.studyDays === 1 ? '' : 's'}`, streak > 1 ? `${streak}-day streak` : null]
        .filter(Boolean)
        .join(' · ')
    : 'Hasn’t shared progress yet'
  return (
    <UnstyledButton component={Link} to={you ? '/profile' : `/profile/${p.id}`} className="nav-row" px="md" py={12} display="block">
      <Group gap="sm" wrap="nowrap">
        <Avatar src={p.avatar} name={p.name} alt="" size={40} radius="xl" color="initials" imageProps={{ referrerPolicy: 'no-referrer' }} />
        <Box miw={0} style={{ flex: 1 }}>
          <Group gap={6} wrap="nowrap">
            <Text fw={600} truncate>
              {p.name}
            </Text>
            {you && (
              <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
                You
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {meta}
          </Text>
        </Box>
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          {s && (
            <span title={LEVEL_INFO[s.level].name}>
              <LevelBadge level={s.level} />
            </span>
          )}
          {last && (
            <Text size="xs" c="dimmed">
              {last}
            </Text>
          )}
        </Stack>
        <ChevronRight size={18} aria-hidden style={{ flexShrink: 0, color: 'var(--mantine-color-dimmed)' }} />
      </Group>
    </UnstyledButton>
  )
}

/** Show or hide yourself on People. */
function Visibility({ listed, onChange }: { listed: boolean; onChange: (listed: boolean) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Card padding="md">
      <Switch
        checked={listed}
        disabled={busy}
        label="Show me on People"
        description={
          listed
            ? 'Signed-in learners can see your name, picture and progress numbers. Never your email, writing, conversations or mistakes.'
            : 'You’re hidden: others can’t see you or open your profile.'
        }
        onChange={async (e) => {
          const next = e.currentTarget.checked
          setBusy(true)
          setErr('')
          try {
            await onChange(next)
          } catch (x) {
            setErr((x as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      />
      {err && (
        <Text size="sm" c="red" mt="xs">
          {err}
        </Text>
      )}
    </Card>
  )
}
