import type { RefObject } from 'react'

const CHARS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ']

/**
 * On-screen accent keys for people without a French keyboard.
 * Inserts at the caret of the referenced input and keeps focus there.
 */
export function AccentBar({
  inputRef,
  onInsert,
  disabled,
}: {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  onInsert: (next: string) => void
  disabled?: boolean
}) {
  const insert = (ch: string, upper: boolean) => {
    const el = inputRef.current
    if (!el || disabled) return
    const c = upper ? ch.toUpperCase() : ch
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + c + el.value.slice(end)
    onInsert(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + c.length, start + c.length)
    })
  }
  return (
    <div className="accent-bar" role="group" aria-label="Insert accented letter (shift-click for capitals)">
      {CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => insert(ch, e.shiftKey)}
          aria-label={`Insert ${ch}`}
        >
          {ch}
        </button>
      ))}
    </div>
  )
}
