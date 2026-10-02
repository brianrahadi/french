import type { ReactNode } from 'react'
import { Button } from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { Kbd } from './ui'

/** Bottom bar shown while answering; replaced by the FeedbackSheet once checked. */
export function CheckBar({
  onCheck,
  disabled,
  onSkip,
  skipLabel = 'I don’t know',
  children,
  checkLabel = 'Check',
}: {
  onCheck?: () => void
  disabled?: boolean
  onSkip?: () => void
  skipLabel?: string
  checkLabel?: string
  children?: ReactNode
}) {
  return (
    <BottomSheet
      verdict="neutral"
      actions={
        onCheck && (
          <Button size="lg" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onCheck} rightSection={<Kbd>↵</Kbd>}>
            {checkLabel}
          </Button>
        )
      }
    >
      {children ??
        (onSkip && (
          <Button variant="subtle" color="gray" onClick={onSkip}>
            {skipLabel}
          </Button>
        ))}
    </BottomSheet>
  )
}
