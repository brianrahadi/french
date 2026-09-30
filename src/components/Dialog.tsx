import { useEffect, useRef, type ReactNode } from 'react'

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="native-dialog"
      style={wide ? { maxWidth: 680 } : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="native-dialog__inner">
          <h2 id="dialog-title" className="dialog__title">
            {title}
          </h2>
          {children}
          {actions && <div className="dialog__actions">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
