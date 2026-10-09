import { useMemo } from 'react'
import { Link, useLocation } from 'react-router'
import { Anchor, Box, Group, Progress, Stack, Text, UnstyledButton } from '@mantine/core'
import { BookOpen, BookOpenText, Headphones, Layers, MessagesSquare, Mic, NotebookPen, PenLine, Play } from 'lucide-react'
import { useStore } from '../../lib/store'
import { loadSession } from '../session/saved'
import { remaining } from '../session/run'
import { buildHistory, continueItems, dayLabel, type ContinueItem, type HistoryEntry, type HistoryKind } from './history'

export const KIND_ICON: Record<HistoryKind | 'session', React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  session: Play,
  grammar: BookOpen,
  vocab: Layers,
  verbs: PenLine,
  listening: Headphones,
  speaking: Mic,
  reading: BookOpenText,
  writing: NotebookPen,
  talk: MessagesSquare,
}

export function useHistory(): HistoryEntry[] {
  const s = useStore()
  return useMemo(() => buildHistory(s), [s])
}

export function useContinue(): ContinueItem[] {
  const s = useStore()
  // Re-read on navigation too: the saved session lives outside the store.
  const { pathname } = useLocation()
  return useMemo(() => {
    const saved = loadSession(s)
    return continueItems(s, saved ? { done: saved.run.done, left: remaining(saved.run) } : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, pathname])
}

const heading = (text: string) => (
  <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" mb={4} style={{ letterSpacing: '0.04em' }}>
    {text}
  </Text>
)

/** One compact row: icon, title, and a dimmed detail or score on the right. */
function Row({ to, kind, title, right, sub, progress }: { to: string; kind: HistoryKind | 'session'; title: string; right?: string; sub?: string; progress?: number }) {
  const Icon = KIND_ICON[kind]
  return (
    <UnstyledButton component={Link} to={to} px="xs" py={5} className="nav-row" style={{ borderRadius: 'var(--mantine-radius-sm)', display: 'block' }}>
      <Group gap={8} wrap="nowrap" align="flex-start">
        <Box c="dimmed" mt={2} style={{ flexShrink: 0, display: 'flex' }}>
          <Icon size={14} aria-hidden />
        </Box>
        <Box miw={0} style={{ flex: 1 }}>
          <Group gap={6} wrap="nowrap" justify="space-between">
            <Text size="sm" lineClamp={1} title={title}>
              {title}
            </Text>
            {right && (
              <Text size="xs" c="dimmed" className="tnum" style={{ flexShrink: 0 }}>
                {right}
              </Text>
            )}
          </Group>
          {sub && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {sub}
            </Text>
          )}
          {progress !== undefined && <Progress value={progress * 100} size={3} mt={4} radius="xl" aria-hidden />}
        </Box>
      </Group>
    </UnstyledButton>
  )
}

export function ContinueRows({ items }: { items: ContinueItem[] }) {
  return (
    <Stack gap={0}>
      {items.map((c) => (
        <Row key={c.id} to={c.to} kind={c.kind} title={c.title} sub={c.detail} progress={c.progress} />
      ))}
    </Stack>
  )
}

const RECENT = 6

/** The sidebar's lower half: what you left half-way, and what you did last. */
export function SidebarActivity() {
  const cont = useContinue().slice(0, 3)
  const recent = useHistory().slice(0, RECENT)
  const days = [...new Set(recent.map((e) => e.day))]
  if (!cont.length && !recent.length) return null
  return (
    <Stack gap="md" mt="lg">
      {cont.length > 0 && (
        <Box component="section" aria-label="Continue">
          {heading('Continue')}
          <ContinueRows items={cont} />
        </Box>
      )}
      {recent.length > 0 && (
        <Box component="section" aria-label="Recent">
          {heading('Recent')}
          <Stack gap={6}>
            {days.map((d) => (
              <Box key={d}>
                <Text size="xs" c="dimmed" px="xs" mb={2}>
                  {dayLabel(d)}
                </Text>
                {recent
                  .filter((e) => e.day === d)
                  .map((e) => (
                    <Row key={e.id} to={e.to} kind={e.kind} title={e.title} right={e.score !== undefined ? `${e.score}%` : e.detail} />
                  ))}
              </Box>
            ))}
          </Stack>
          <Anchor component={Link} to="/history" size="xs" fw={600} px="xs" mt={6} display="block">
            See all →
          </Anchor>
        </Box>
      )}
    </Stack>
  )
}
