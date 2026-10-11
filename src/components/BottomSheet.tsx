import type { ReactNode } from 'react'
import { Box, Container, Transition } from '@mantine/core'

export type SheetVerdict = 'correct' | 'almost' | 'wrong' | 'neutral'

const BG: Record<SheetVerdict, string> = {
  correct: 'var(--mantine-color-green-light)',
  almost: 'var(--mantine-color-orange-light)',
  wrong: 'var(--mantine-color-red-light)',
  neutral: 'var(--mantine-color-body)',
}

/**
 * The bar fixed to the bottom of a study session: the answer area's actions, or the result.
 * With `stack`, phones put the content above full-width buttons instead of beside them,
 * so a long answer or explanation gets the whole width.
 */
export function BottomSheet({
  verdict,
  actions,
  children,
  animate,
  label,
  stack,
}: {
  verdict: SheetVerdict
  actions?: ReactNode
  children?: ReactNode
  animate?: boolean
  label?: string
  stack?: boolean
}) {
  const sheet = (style?: React.CSSProperties) => (
    <Box
      pos="fixed"
      left={0}
      right={0}
      bottom={0}
      pt="md"
      role="region"
      aria-label={label}
      style={{ zIndex: 50, paddingBottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))', borderTop: '1px solid var(--mantine-color-default-border)', backdropFilter: 'blur(8px)', background: BG[verdict], ...style }}
    >
      <Box bg={verdict === 'neutral' ? undefined : 'var(--mantine-color-body)'} pos="absolute" inset={0} style={{ zIndex: -1 }} />
      <Container size={760}>
        <div className="sheet-row" data-stack={stack || undefined}>
          <div className="sheet-body">{children}</div>
          {actions && <div className="sheet-actions">{actions}</div>}
        </div>
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
