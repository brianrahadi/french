import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A titled row of cards that scrolls sideways (like a library shelf), so a page
 * can show many collections without growing tall. Arrows appear when there's
 * more to see; touch and trackpads scroll natively.
 */
export function Shelf({
  title,
  count,
  action,
  hint,
  children,
}: {
  title: ReactNode
  count?: number
  /** Something on the right of the title, e.g. a filter or a "see all" link. */
  action?: ReactNode
  /** One short line under the title. */
  hint?: ReactNode
  children: ReactNode
}) {
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const el = track.current
    if (!el) return
    const update = () => setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [children])

  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' })

  return (
    <section className="shelf">
      <div className="shelf__head">
        <h2 className="shelf__title">
          {title}
          {count !== undefined && <span className="shelf__count tnum">{count}</span>}
        </h2>
        <div className="shelf__actions">
          {action}
          {!(edges.start && edges.end) && (
            <span className="shelf__arrows">
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Scroll left">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => scroll(1)} disabled={edges.end} aria-label="Scroll right">
                <ChevronRight size={16} aria-hidden />
              </button>
            </span>
          )}
        </div>
      </div>
      {hint && <p className="shelf__hint">{hint}</p>}
      <div className="shelf__track" ref={track}>
        {children}
      </div>
    </section>
  )
}
