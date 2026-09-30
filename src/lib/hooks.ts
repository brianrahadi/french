import { useEffect, useLayoutEffect, useRef } from 'react'
import { useStore } from './store'

type Handler = (e: KeyboardEvent) => void

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

/**
 * Global keyboard shortcuts. Keys are matched against `e.key` (case-insensitive for letters).
 * Shortcuts are ignored while typing in a field, except those listed in `allowInInputs`.
 */
export function useHotkeys(map: Record<string, Handler>, opts: { enabled?: boolean; allowInInputs?: string[] } = {}) {
  const ref = useRef(map)
  useLayoutEffect(() => {
    ref.current = map
  })
  const enabled = opts.enabled ?? true
  const allow = (opts.allowInInputs ?? []).join('|')
  useEffect(() => {
    if (!enabled) return
    const allowed = new Set(allow ? allow.split('|') : [])
    const onKey = (e: KeyboardEvent) => {
      // Already handled (e.g. Enter inside an input that submitted an answer).
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key
      const h = ref.current[key]
      if (!h) return
      if (isTyping(e) && !allowed.has(key)) return
      // Let focused buttons/links handle their own Enter/Space.
      const t = e.target as HTMLElement | null
      if ((key === 'Enter' || key === 'Space') && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return
      if (e.repeat) return
      e.preventDefault()
      h(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, allow])
}

/** Keeps <html data-theme> in sync with the theme setting. */
export function useThemeSync() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Petit à petit` : 'Petit à petit — French study'
  }, [title])
}
