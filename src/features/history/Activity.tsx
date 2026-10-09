import { useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router'
import { Anchor, Box, Group, Progress, Stack, Text, UnstyledButton } from '@mantine/core'
import { BookOpen, BookOpenText, Headphones, Layers, MessagesSquare, Mic, NotebookPen, PenLine, Play } from 'lucide-react'
import { useStore, type StudySkill } from '../../lib/store'
import { loadSession } from '../session/saved'
import { remaining } from '../session/run'
import { buildHistory, continueItems, recentGroups, type ContinueItem, type HistoryEntry, type HistoryKind } from './history'

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
    <UnstyledButton component={Link} to={to} px="xs" py={3} className="nav-row" style={{ borderRadius: 'var(--mantine-radius-sm)', display: 'block' }}>
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

/** How many past items the sidebar lists before pointing to History. */
const RECENT = 30

const short = (t?: string) => (t && t.length <= 10 ? t : undefined)

const subheading = (text: string) => (
  <Text size="xs" c="dimmed" px="xs" mt={6} mb={2}>
    {text}
  </Text>
)

/** The sidebar's lower half, one line per item: what you left half-way, and what you did recently. */
export function SidebarActivity() {
  const cont = useContinue().slice(0, 3)
  // Something already under Continue isn't listed twice.
  const open = new Set(cont.map((c) => c.to))
  const history = useHistory().filter((e) => !open.has(e.to))
  const groups = recentGroups(history.slice(0, RECENT))
  if (!cont.length && !groups.length) return null
  return (
    <Stack gap="sm" mt="md">
      {cont.length > 0 && (
        <Box component="section" aria-label="Continue">
          {heading('Continue')}
          {cont.map((c) => (
            <Row key={c.id} to={c.to} kind={c.kind} title={c.title} right={c.progress !== undefined ? `${Math.round(c.progress * 100)}%` : short(c.detail)} />
          ))}
        </Box>
      )}
      {groups.length > 0 && (
        <Box component="section" aria-label="Recent">
          <Group justify="space-between" pr="xs">
            {heading('Recent')}
            <Anchor component={Link} to="/history" size="xs" mb={4}>
              All
            </Anchor>
          </Group>
          {groups.map((g) => (
            <Box key={g.label} role="group" aria-label={g.label}>
              {subheading(g.label)}
              {g.entries.map((e) => (
                <Row key={e.id} to={e.to} kind={e.kind} title={e.title} right={e.score !== undefined ? `${e.score}%` : short(e.detail)} />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  )
}

const DAY_MAX = 6

const SKILL_NAME: Record<StudySkill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
}

/**
 * What you did on a given day, for the progress heatmap's hover card. Falls back
 * to the per-skill counts for days whose records have since been overwritten.
 */
export function useDayDetails(): (day: string) => React.ReactNode {
  const history = useHistory()
  const { activity } = useStore()
  const byDay = useMemo(() => {
    const m = new Map<string, HistoryEntry[]>()
    for (const e of history) {
      const list = m.get(e.day)
      if (list) list.push(e)
      else m.set(e.day, [e])
    }
    return m
  }, [history])

  return useCallback(
    (day: string) => {
      const entries = byDay.get(day) ?? []
      if (entries.length) {
        // Oldest first reads as the day's story.
        const shown = [...entries].reverse().slice(0, DAY_MAX)
        return (
          <Stack gap={3}>
            {shown.map((e) => {
              const Icon = KIND_ICON[e.kind]
              const right = e.score !== undefined ? `${e.score}%` : short(e.detail)
              return (
                <Group key={e.id} gap={8} wrap="nowrap">
                  <Box c="dimmed" style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon size={13} aria-hidden />
                  </Box>
                  <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                    {e.title}
                    {e.detail && !right ? <Text span c="dimmed" size="xs">{` · ${e.detail}`}</Text> : null}
                  </Text>
                  {right && (
                    <Text size="xs" c="dimmed" className="tnum" style={{ flexShrink: 0 }}>
                      {right}
                    </Text>
                  )}
                </Group>
              )
            })}
            {entries.length > DAY_MAX && (
              <Text size="xs" c="dimmed">
                +{entries.length - DAY_MAX} more
              </Text>
            )}
          </Stack>
        )
      }
      const skills = Object.entries(activity[day]?.skills ?? {}).filter(([, n]) => n) as [StudySkill, number][]
      if (!skills.length) return null
      return (
        <Stack gap={3}>
          {skills.map(([k, n]) => (
            <Group key={k} gap={8} justify="space-between" wrap="nowrap">
              <Text size="xs">{SKILL_NAME[k]}</Text>
              <Text size="xs" c="dimmed" className="tnum">
                {n}
              </Text>
            </Group>
          ))}
        </Stack>
      )
    },
    [byDay, activity],
  )
}
