const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day, e.g. "2026-09-29". */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function endOfDay(d: Date = new Date()): Date {
  const out = new Date(d)
  out.setHours(23, 59, 59, 999)
  return out
}

export function startOfDay(d: Date = new Date()): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

/** Whole days from a to b (b - a), by calendar day. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

export function frenchDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

/** Compact interval label: 1m, 10m, 3h, 4d, 2mo, 1.5y */
export function formatInterval(ms: number): string {
  const min = ms / 60_000
  if (min < 1) return '<1m'
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)}d`
  const mo = d / 30.4
  if (mo < 12) return `${Math.round(mo)}mo`
  const y = d / 365
  return `${y < 10 ? y.toFixed(1).replace(/\.0$/, '') : Math.round(y)}y`
}

export function relativeDay(target: Date, now: Date = new Date()): string {
  const d = daysBetween(now, target)
  if (d <= 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d < 7) return `in ${d} days`
  if (d < 30) return `in ${Math.round(d / 7)} wk`
  return `in ${Math.round(d / 30)} mo`
}

/** “today”, “yesterday”, “3 days ago”, “last week”, or a short date. */
export function ago(iso: string, now = Date.now()): string {
  const days = Math.floor((new Date(new Date(now).toDateString()).getTime() - new Date(new Date(iso).toDateString()).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}
