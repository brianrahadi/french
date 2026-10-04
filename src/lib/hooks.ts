import { useEffect, useLayoutEffect, useRef, useState } from 'react'

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

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Petit à petit` : 'Petit à petit — French study'
  }, [title])
}

/**
 * "Hide on scroll down, reveal on scroll up" for floating bars on small screens.
 * Returns `true` while the bar should be tucked away. It always shows near the top
 * of the page and near the end (where the reader has finished and the action is due).
 */
export function useHideOnScroll({ enabled = true, threshold = 12, edge = 160 }: { enabled?: boolean; threshold?: number; edge?: number } = {}) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (!enabled) {
      setHidden(false)
      return
    }
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const nearEnd = window.innerHeight + y >= document.documentElement.scrollHeight - edge
      if (y < edge || nearEnd) {
        setHidden(false)
        lastY = y
        return
      }
      const dy = y - lastY
      // Ignore jitter (and iOS rubber-banding) until the movement is deliberate.
      if (Math.abs(dy) < threshold) return
      setHidden(dy > 0)
      lastY = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, threshold, edge])
  return hidden
}
