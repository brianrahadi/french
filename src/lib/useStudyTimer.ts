import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { dayKey } from './date'
import { useStore } from './store'
import { isAttentive, watchInput } from './attention'
import { timeKeyFor, type DayTime, type TimeKey } from './studyTime'

const TICK_S = 5
const FLUSH_EVERY = 12 // ticks, i.e. once a minute

/** Seconds counted but not saved yet, per day. */
let pending: Record<string, DayTime> = {}

/** Saves the counted seconds to the store (and so to sync). */
export function flushStudyTime(): void {
  const out = pending
  pending = {}
  for (const [day, add] of Object.entries(out)) {
    // Whole seconds only; a fraction left over waits for the next save.
    const whole: DayTime = {}
    for (const [k, n] of Object.entries(add) as [TimeKey, number][]) {
      const w = Math.floor(n)
      if (w > 0) whole[k] = w
      if (n - w > 0) ((pending[day] ??= {})[k] = n - w)
    }
    if (Object.keys(whole).length) useStore.getState().addStudyTime(day, whole)
  }
}

function count(key: TimeKey, sec: number) {
  const day = dayKey()
  const d = (pending[day] ??= {})
  d[key] = (d[key] ?? 0) + sec
}

/**
 * Counts study time on the current page. Mounted once in each layout; time is
 * saved every minute, when the page is hidden or closed, and when you move to
 * another kind of page.
 */
export function useStudyTimer(): void {
  const { pathname } = useLocation()
  const key = timeKeyFor(pathname)

  useEffect(() => {
    watchInput()
    const save = () => flushStudyTime()
    const onVisibility = () => document.visibilityState === 'hidden' && save()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', save)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [])

  useEffect(() => {
    if (!key) return
    let ticks = 0
    let last = Date.now()
    // Counts the time since the last tick, if you were studying (capped, in case the tab was asleep).
    const tick = () => {
      const now = Date.now()
      const sec = Math.min(TICK_S * 2, (now - last) / 1000)
      last = now
      if (isAttentive(key === 'audio', now)) count(key, sec)
    }
    const id = window.setInterval(() => {
      tick()
      if (++ticks % FLUSH_EVERY === 0) flushStudyTime()
    }, TICK_S * 1000)
    return () => {
      window.clearInterval(id)
      tick()
      flushStudyTime()
    }
  }, [key])
}
