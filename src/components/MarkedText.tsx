import type { ReactNode } from 'react'
import type { Token } from '../lib/french'
import { frTypo } from '../lib/words'

/**
 * Renders `text` with some of its tokens wrapped (for highlighting), keeping the
 * original punctuation and spacing in between.
 */
export function MarkedText({
  text,
  tokens,
  render,
}: {
  text: string
  tokens: Token[]
  /** Return a wrapper for token i, or null to leave it plain. */
  render: (i: number, content: ReactNode) => ReactNode | null
}) {
  const out: ReactNode[] = []
  let pos = 0
  tokens.forEach((t, i) => {
    if (t.start > pos) out.push(<span key={`p${i}`}>{frTypo(text.slice(pos, t.start))}</span>)
    const content = frTypo(t.text)
    out.push(<span key={`t${i}`}>{render(i, content) ?? content}</span>)
    pos = t.end
  })
  if (pos < text.length) out.push(<span key="end">{frTypo(text.slice(pos))}</span>)
  return <>{out}</>
}
