import type { ReactNode } from 'react'
import { CloseButton, Container, Group, Text } from '@mantine/core'
import { useNavigate } from 'react-router'
import { ProgressBar } from './ui'
import { useHotkeys } from '../lib/hooks'

/** Distraction-free frame for study sessions: close button, progress, content. */
export function FocusShell({
  progress,
  count,
  exitTo,
  children,
  label,
}: {
  progress: number
  count?: ReactNode
  exitTo: string
  label: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  useHotkeys({ Escape: () => navigate(exitTo) }, { allowInInputs: ['Escape'] })
  return (
    <Container size={760} px="md" pb={120}>
      <Group gap="md" py="md" wrap="nowrap" pos="sticky" top={0} bg="var(--bg)" style={{ zIndex: 5 }}>
        <CloseButton size="lg" onClick={() => navigate(exitTo)} aria-label="End session (Esc)" title="End session (Esc)" />
        <div style={{ flex: 1 }}>
          <ProgressBar value={progress} label={`${label} progress`} />
        </div>
        <Text component="div" size="sm" c="dimmed" fw={600} className="tnum" miw={40} ta="right" aria-live="polite">
          {count}
        </Text>
      </Group>
      {children}
    </Container>
  )
}
