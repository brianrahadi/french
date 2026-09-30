import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, dayKey, startOfDay } from '../lib/date'
import type { DayActivity } from '../lib/store'

/** GitHub-style activity grid for the last N weeks. */
const CELL = 13
const GAP = 3

/** Fits as many weeks as the container allows (10–53). */
function useWeeks(ref: React.RefObject<HTMLDivElement | null>) {
  const [weeks, setWeeks] = useState(26)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      setWeeks(Math.max(10, Math.min(53, Math.floor((w + GAP) / (CELL + GAP)))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return weeks
}

export function Heatmap({ activity, goal }: { activity: Record<string, DayActivity>; goal: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const weeks = useWeeks(ref)
  const { columns, months } = useMemo(() => {
    const today = startOfDay()
    // Start on a Monday so rows are Mon..Sun
    const dow = (today.getDay() + 6) % 7
    const start = addDays(today, -(weeks - 1) * 7 - dow)
    const cols: { key: string; items: number; future: boolean; date: Date }[][] = []
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d)
        const key = dayKey(date)
        col.push({ key, items: activity[key]?.items ?? 0, future: date > today, date })
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth()
          monthLabels.push({ col: w, label: date.toLocaleDateString('en', { month: 'short' }) })
        }
      }
      cols.push(col)
    }
    // Drop a label that would collide with the next one (a partial first month).
    const months = monthLabels.filter((m, i) => !monthLabels[i + 1] || monthLabels[i + 1].col - m.col >= 3)
    return { columns: cols, months }
  }, [activity, weeks])

  const level = (n: number) => {
    if (n <= 0) return 0
    const r = n / Math.max(goal, 1)
    if (r < 0.34) return 1
    if (r < 0.67) return 2
    if (r < 1) return 3
    return 4
  }

  return (
    <div className="heatmap" ref={ref}>
      <div className="heatmap__months" aria-hidden style={{ gridTemplateColumns: `repeat(${weeks}, ${CELL}px)` }}>
        {months.map((m) => (
          <span key={m.col} style={{ gridColumn: m.col + 1 }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="heatmap__grid" role="img" aria-label={`Study activity over the last ${weeks} weeks`} style={{ gridTemplateColumns: `repeat(${weeks}, ${CELL}px)` }}>
        {columns.map((col, i) => (
          <div key={i} className="heatmap__col">
            {col.map((c) => (
              <span
                key={c.key}
                className={`heatmap__cell${c.future ? ' is-future' : ''}`}
                style={{ background: c.future ? 'transparent' : `var(--heat-${level(c.items)})` }}
                title={`${c.date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}: ${c.items} items`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap__legend" aria-hidden>
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="heatmap__cell" style={{ background: `var(--heat-${l})` }} />
        ))}
        More
      </div>
    </div>
  )
}
