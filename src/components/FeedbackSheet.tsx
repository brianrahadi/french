import { useEffect, useRef, type ReactNode } from 'react'
import { Button, Group, Text } from '@mantine/core'
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react'
import { BottomSheet, type SheetVerdict } from './BottomSheet'
import { Kbd } from './ui'

export type { SheetVerdict }

const ICONS = {
  correct: <CheckCircle2 size={22} aria-hidden />,
  almost: <CircleAlert size={22} aria-hidden />,
  wrong: <XCircle size={22} aria-hidden />,
  neutral: null,
}
const COLOR = { correct: 'green', almost: 'orange', wrong: 'red', neutral: undefined } as const

/**
 * Bottom sheet with the result of an answer. The primary button is focused
 * so Enter continues — keeping hands on the keyboard.
 */
export function FeedbackSheet({
  verdict,
  title,
  children,
  onContinue,
  continueLabel = 'Continue',
  secondary,
}: {
  verdict: SheetVerdict
  title?: ReactNode
  children?: ReactNode
  onContinue: () => void
  continueLabel?: string
  secondary?: ReactNode
}) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Defer so the Enter that submitted the answer doesn't also trigger Continue.
    const t = setTimeout(() => btn.current?.focus({ preventScroll: true }), 30)
    return () => clearTimeout(t)
  }, [])
  return (
    <BottomSheet
      verdict={verdict}
      animate
      label="Result"
      actions={
        <>
          <Button ref={btn} size="lg" color={COLOR[verdict]} onClick={onContinue} rightSection={<Kbd>↵</Kbd>}>
            {continueLabel}
          </Button>
          {secondary}
        </>
      }
    >
      <div aria-live="assertive">
        {title && (
          <Group gap={8} c={COLOR[verdict] ? `${COLOR[verdict]}.8` : undefined} mb={4}>
            {ICONS[verdict]}
            <Text fw={700} fz="lg" c="inherit">
              {title}
            </Text>
          </Group>
        )}
        {children}
      </div>
    </BottomSheet>
  )
}
