import type { ReactNode } from 'react'
import { Box, Container, Group, Transition } from '@mantine/core'

export type SheetVerdict = 'correct' | 'almost' | 'wrong' | 'neutral'

const BG: Record<SheetVerdict, string> = {
  correct: 'var(--mantine-color-green-light)',
  almost: 'var(--mantine-color-orange-light)',
  wrong: 'var(--mantine-color-red-light)',
  neutral: 'var(--mantine-color-body)',
}

/** The bar fixed to the bottom of a study session: the answer area's actions, or the result. */
export function BottomSheet({ verdict, actions, children, animate, label }: { verdict: SheetVerdict; actions?: ReactNode; children?: ReactNode; animate?: boolean; label?: string }) {
  const sheet = (style?: React.CSSProperties) => (
    <Box
      pos="fixed"
      left={0}
      right={0}
      bottom={0}
      py="md"
      role="region"
      aria-label={label}
      style={{ zIndex: 50, borderTop: '1px solid var(--mantine-color-default-border)', backdropFilter: 'blur(8px)', background: BG[verdict], ...style }}
    >
      <Box bg={verdict === 'neutral' ? undefined : 'var(--mantine-color-body)'} pos="absolute" inset={0} style={{ zIndex: -1 }} />
      <Container size={760}>
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Box style={{ flex: '1 1 260px', minWidth: 0 }}>{children}</Box>
          {actions && <Group gap="sm">{actions}</Group>}
        </Group>
      </Container>
    </Box>
  )
  if (!animate) return sheet()
  return (
    <Transition mounted transition="slide-up" duration={180} keepMounted={false}>
      {(style) => sheet(style)}
    </Transition>
  )
}
