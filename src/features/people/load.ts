import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSync } from '../../lib/sync/engine'
import { ago, parseDayKey } from '../../lib/date'

/**
 * Loads something that needs the signed-in user, again when the account, the
 * key or reload() changes. Data from the last load of the same key stays
 * while a reload runs.
 */
export function useSignedInLoad<T>(key: string, load: () => Promise<T>) {
  const userId = useSync((s) => s.user?.id)
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })
  const [n, setN] = useState(0)
  const scope = userId ? `${userId}|${key}|` : ''
  const want = scope && `${scope}${n}`
  const [res, setRes] = useState<{ at: string; data?: T; error?: Error } | null>(null)

  useEffect(() => {
    if (!want) return
    let live = true
    loadRef.current().then(
      (data) => live && setRes({ at: want, data }),
      (e: unknown) => live && setRes((r) => ({ at: want, data: r?.data, error: e instanceof Error ? e : new Error(String(e)) })),
    )
    return () => {
      live = false
    }
  }, [want])

  const mine = !!res && !!scope && res.at.startsWith(scope)
  return {
    data: mine ? res.data : undefined,
    error: res?.at === want ? (res.error ?? null) : null,
    loading: !!want && res?.at !== want,
    reload: () => setN((x) => x + 1),
    /** Change the loaded data in place (after a save). */
    setData: (f: (d: T | undefined) => T | undefined) => setRes((r) => (r ? { ...r, data: f(r.data) } : r)),
  }
}

/** "today", "yesterday", "3 days ago"… for a learner's last study day. */
export function lastStudied(day: string | null): string | null {
  // A day ahead of ours (their time zone) also reads "today".
  return day ? ago(parseDayKey(day).toISOString()) : null
}

export const joinedLabel = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : '')
