import { useEffect, useRef, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react'
import { Kbd } from './ui'

export type SheetVerdict = 'correct' | 'almost' | 'wrong' | 'neutral'

const ICONS = {
  correct: <CheckCircle2 size={22} aria-hidden />,
  almost: <CircleAlert size={22} aria-hidden />,
  wrong: <XCircle size={22} aria-hidden />,
  neutral: null,
}

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
  const btnClass =
    verdict === 'correct' ? 'btn--success' : verdict === 'wrong' ? 'btn--danger' : 'btn--primary'
  return (
    <div className={`sheet sheet--${verdict} sheet--animate`} role="region" aria-label="Result">
      <div className="sheet__inner">
        <div className="sheet__body" aria-live="assertive">
          {title && (
            <div className="sheet__title">
              {ICONS[verdict]}
              {title}
            </div>
          )}
          {children}
        </div>
        <div className="sheet__actions">
          <button ref={btn} type="button" className={`btn btn--lg ${btnClass}`} onClick={onContinue}>
            {continueLabel} <Kbd>↵</Kbd>
          </button>
          {secondary}
        </div>
      </div>
    </div>
  )
}
