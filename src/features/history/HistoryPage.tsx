import { useState } from 'react'
import { Link } from 'react-router'
import { Badge, Box, Button, Card, Chip, Container, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { PageHeader } from '../../components/PageHeader'
import { useDocumentTitle } from '../../lib/hooks'
import { scoreColor } from '../writing/tiles'
import { dayLabel, KIND_LABEL, type HistoryKind } from './history'
import { ContinueRows, KIND_ICON, useContinue, useHistory } from './Activity'

const PAGE_DAYS = 14

export default function HistoryPage() {
  useDocumentTitle('History')
  const all = useHistory()
  const cont = useContinue()
  const [kind, setKind] = useState<HistoryKind | 'all'>('all')
  const [shown, setShown] = useState(PAGE_DAYS)
  const kinds = (Object.keys(KIND_LABEL) as HistoryKind[]).filter((k) => all.some((e) => e.kind === k))
  const list = kind === 'all' ? all : all.filter((e) => e.kind === kind)
  const days = [...new Set(list.map((e) => e.day))]

  return (
    <Container size={760} py="xl">
      <PageHeader eyebrow="Historique" title="History" />

      {cont.length > 0 && (
        <Card padding="sm" mb="lg">
          <Text size="sm" fw={650} px="xs" mb={4}>
            Continue
          </Text>
          <ContinueRows items={cont} />
        </Card>
      )}

      {kinds.length > 1 && (
        <Chip.Group value={kind} onChange={(v) => { setKind(v as HistoryKind | 'all'); setShown(PAGE_DAYS) }}>
          <Group gap={6} mb="lg">
            <Chip value="all" size="sm">
              All
            </Chip>
            {kinds.map((k) => (
              <Chip key={k} value={k} size="sm">
                {KIND_LABEL[k]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      )}

      {!list.length ? (
        <Text c="dimmed">Nothing yet. What you study shows up here.</Text>
      ) : (
        <Stack gap="lg">
          {days.slice(0, shown).map((d) => (
            <Box key={d} component="section" aria-label={dayLabel(d)}>
              <Text size="sm" fw={650} mb={6}>
                {dayLabel(d)}
              </Text>
              <Card padding={0}>
                {list
                  .filter((e) => e.day === d)
                  .map((e, i) => {
                    const Icon = KIND_ICON[e.kind]
                    return (
                      <UnstyledButton
                        key={e.id}
                        component={Link}
                        to={e.to}
                        className="nav-row"
                        px="md"
                        py={10}
                        display="block"
                        style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon variant="light" size={30} radius="md" style={{ flexShrink: 0 }}>
                            <Icon size={16} aria-hidden />
                          </ThemeIcon>
                          <Box miw={0} style={{ flex: 1 }}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {e.title}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {KIND_LABEL[e.kind]}
                              {e.detail ? ` · ${e.detail}` : ''}
                            </Text>
                          </Box>
                          {e.score !== undefined && (
                            <Badge color={scoreColor(e.score)} variant="light" className="tnum" style={{ flexShrink: 0 }}>
                              {e.score}%
                            </Badge>
                          )}
                        </Group>
                      </UnstyledButton>
                    )
                  })}
              </Card>
            </Box>
          ))}
          {days.length > shown && (
            <Button variant="default" onClick={() => setShown((n) => n + PAGE_DAYS)} style={{ alignSelf: 'center' }}>
              Show earlier days
            </Button>
          )}
        </Stack>
      )}
    </Container>
  )
}
