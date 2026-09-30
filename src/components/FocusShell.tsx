import type { ReactNode } from 'react'
import { X } from 'lucide-react'
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
  count?: string
  exitTo: string
  label: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  useHotkeys({ Escape: () => navigate(exitTo) }, { allowInInputs: ['Escape'] })
  return (
    <div className="focus">
      <header className="focus-top">
        <button type="button" className="icon-btn" onClick={() => navigate(exitTo)} aria-label="End session (Esc)" title="End session (Esc)">
          <X size={22} aria-hidden />
        </button>
        <ProgressBar value={progress} label={`${label} progress`} />
        <div className="focus-top__count" aria-live="polite">
          {count}
        </div>
      </header>
      <div className="focus-main">{children}</div>
    </div>
  )
}
