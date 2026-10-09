import { useState, type ReactNode } from 'react'
import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { ChevronDown } from 'lucide-react'
import { LEVEL_INFO, type Level } from '../data/types'
import { LevelBadge } from './ui'

const KEY = 'petit-a-petit-open-levels'

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

/**
 * One level's part of a long list, with a header that folds it away. Whether
 * it's open is remembered per list (`group`) on this device; the first time,
 * only `defaultOpen` levels are.
 */
export function LevelGroup({
  group,
  level,
  done,
  total,
  defaultOpen,
  extra,
  children,
}: {
  group: string
  level: Level
  done?: number
  total?: number
  defaultOpen: boolean
  /** Something on the header's right, before the count (e.g. a test-out link). */
  extra?: ReactNode
  children: ReactNode
}) {
  const id = `${group}:${level}`
  const [open, setOpen] = useState(() => readOpen()[id] ?? defaultOpen)
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...readOpen(), [id]: !o }))
      } catch {
        // Not remembered, that's all.
      }
      return !o
    })
  }
  return (
    <Box component="section" mt="lg" aria-labelledby={`${id}-title`}>
      <Group gap="sm" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }} pb={8} mb={open ? 'sm' : 0}>
        <UnstyledButton onClick={toggle} aria-expanded={open} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap">
            <LevelBadge level={level} />
            <Text fw={650} id={`${id}-title`} lineClamp={1}>
              {LEVEL_INFO[level].name}
            </Text>
            {total !== undefined && (
              <Text size="sm" c="dimmed" className="tnum" ml="auto">
                {done ?? 0}/{total}
              </Text>
            )}
            <Box c="dimmed" display="flex" ml={total === undefined ? 'auto' : undefined} style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : undefined }}>
              <ChevronDown size={18} aria-hidden />
            </Box>
          </Group>
        </UnstyledButton>
        {extra}
      </Group>
      <Collapse expanded={open}>{children}</Collapse>
    </Box>
  )
}
