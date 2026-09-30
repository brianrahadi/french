import type { ReactNode } from 'react'
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
    <div className="sheet sheet--neutral">
      <div className="sheet__inner" style={{ alignItems: 'center' }}>
        <div className="sheet__body">
          {children ??
            (onSkip && (
              <button type="button" className="btn btn--ghost" onClick={onSkip}>
                {skipLabel}
              </button>
            ))}
        </div>
        {onCheck && (
          <div className="sheet__actions">
            <button
              type="button"
              className="btn btn--lg btn--primary"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCheck}
            >
              {checkLabel} <Kbd>↵</Kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
