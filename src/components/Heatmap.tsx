import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Group, Stack, Text } from '@mantine/core'
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

interface HeatmapProps {
  activity: Record<string, DayActivity>
  goal: number
  /** What happened on a day, shown in the hover card under the date and count. */
  details?: (day: string) => React.ReactNode
}

export function Heatmap({ activity, goal, details }: HeatmapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const weeks = useWeeks(ref)
  const [hover, setHover] = useState<{ key: string; date: Date; rect: DOMRect } | null>(null)
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
    <Stack gap={6} ref={ref}>
      <div className="heatmap__months" aria-hidden style={{ gridTemplateColumns: `repeat(${weeks}, ${CELL}px)` }}>
        {months.map((m) => (
          <span key={m.col} style={{ gridColumn: m.col + 1 }}>
            {m.label}
          </span>
        ))}
      </div>
      <div
        className="heatmap__grid"
        role="img"
        aria-label={`Study activity over the last ${weeks} weeks`}
        style={{ gridTemplateColumns: `repeat(${weeks}, ${CELL}px)` }}
        onPointerLeave={() => setHover(null)}
      >
        {columns.map((col, i) => (
          <div key={i} className="heatmap__col">
            {col.map((c) => (
              <span
                key={c.key}
                className={`heatmap__cell${c.future ? ' is-future' : ''}${hover?.key === c.key ? ' is-hover' : ''}`}
                style={{ background: c.future ? 'transparent' : `var(--heat-${level(c.items)})` }}
                onPointerEnter={c.future ? () => setHover(null) : (e) => setHover({ key: c.key, date: c.date, rect: e.currentTarget.getBoundingClientRect() })}
              />
            ))}
          </div>
        ))}
      </div>
      {hover && (
        <DayCard anchor={hover.rect} onDismiss={() => setHover(null)}>
          <DayHeader date={hover.date} day={activity[hover.key]} />
          {details?.(hover.key)}
        </DayCard>
      )}
      <Group gap={4} justify="flex-end" c="dimmed" fz={11} aria-hidden>
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="heatmap__cell" style={{ background: `var(--heat-${l})`, width: 11, height: 11 }} />
        ))}
        More
      </Group>
    </Stack>
  )
}

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

function DayHeader({ date, day }: { date: Date; day?: DayActivity }) {
  const items = day?.items ?? 0
  const acc = items ? Math.round(((day?.correct ?? 0) / items) * 100) : null
  const isToday = dayKey(date) === dayKey()
  return (
    <Group gap={8} justify="space-between" wrap="nowrap" mb={items ? 6 : 0}>
      <Text size="sm" fw={650}>
        {isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
      </Text>
      <Text size="xs" c="dimmed" className="tnum" style={{ whiteSpace: 'nowrap' }}>
        {items ? `${plural(items, 'answer')}${acc !== null ? ` · ${acc}%` : ''}${day?.newWords ? ` · ${plural(day.newWords, 'new word')}` : ''}` : 'No study'}
      </Text>
    </Group>
  )
}

/** A floating card above (or, near the top of the screen, below) the hovered cell. */
function DayCard({ anchor, onDismiss, children }: { anchor: DOMRect; onDismiss: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const margin = 8
    const above = anchor.top - height - 6
    const top = above >= margin ? above : anchor.bottom + 6
    const left = Math.min(Math.max(margin, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - margin)
    setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }))
    // Content follows the anchor, so re-measuring when the anchor moves is enough.
  }, [anchor])

  // The card is pinned to the viewport, so it would drift away from the cell on scroll.
  useEffect(() => {
    window.addEventListener('scroll', onDismiss, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onDismiss, { capture: true })
  }, [onDismiss])

  return createPortal(
    <div ref={ref} className="heatmap__card" role="tooltip" style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}>
      {children}
    </div>,
    document.body,
  )
}
