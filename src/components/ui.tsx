import type { ReactNode } from 'react'
import { AlertTriangle, Lightbulb } from 'lucide-react'
import type { Level } from '../data/types'

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd kbd-hint">{children}</kbd>
}

export function ProgressBar({
  value,
  label,
  variant,
  thin,
}: {
  value: number
  label: string
  variant?: 'success'
  thin?: boolean
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={`progress${variant ? ` progress--${variant}` : ''}${thin ? ' progress--thin' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Ring({
  value,
  size = 64,
  stroke = 7,
  label,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  label: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      className={`ring${v >= 1 ? ' ring--done' : ''}`}
      style={{ ['--size' as string]: `${size}px`, ['--stroke' as string]: `${stroke}px` }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className="fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  )
}

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge badge--${level}`}>{level}</span>
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden />
    </label>
  )
}

export function Callout({ kind, children }: { kind: 'tip' | 'warn'; children: ReactNode }) {
  return (
    <div className={`callout callout--${kind}`}>
      {kind === 'tip' ? <Lightbulb size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
      <div>
        <span className="sr-only">{kind === 'tip' ? 'Tip: ' : 'Watch out: '}</span>
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div style={{ fontWeight: 650, color: 'var(--text)' }}>{title}</div>
      {children}
    </div>
  )
}

export function GenderTag({ g }: { g?: 'm' | 'f' }) {
  if (!g) return null
  return (
    <span className={`gender-tag gender-tag--${g}`} title={g === 'm' ? 'masculine' : 'feminine'}>
      <span aria-hidden>{g}</span>
      <span className="sr-only">{g === 'm' ? 'masculine' : 'feminine'}</span>
    </span>
  )
}

type RichTag = 'strong' | 'em' | 's'
interface RichNode {
  tag: RichTag | null
  children: (string | RichNode)[]
}

/** Parses **bold**, *italic* (nestable) and ~~struck~~ into a small tree. */
export function parseRich(text: string): RichNode {
  const root: RichNode = { tag: null, children: [] }
  const stack: RichNode[] = [root]
  let buf = ''
  const flush = () => {
    if (buf) stack[stack.length - 1].children.push(buf)
    buf = ''
  }
  const toggle = (tag: RichTag) => {
    flush()
    const top = stack[stack.length - 1]
    if (top.tag === tag) {
      stack.pop()
      stack[stack.length - 1].children.push(top)
    } else stack.push({ tag, children: [] })
  }
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('~~', i)) {
      toggle('s')
      i++
    } else if (text.startsWith('**', i)) {
      toggle('strong')
      i++
    } else if (text[i] === '*') toggle('em')
    else buf += text[i]
  }
  flush()
  // Unclosed markers: fold their content back in as plain nodes.
  while (stack.length > 1) {
    const n = stack.pop()!
    stack[stack.length - 1].children.push({ tag: null, children: n.children })
  }
  return root
}

function renderRich(node: RichNode, key?: number): ReactNode {
  const kids = node.children.map((c, i) => (typeof c === 'string' ? c : renderRich(c, i)))
  switch (node.tag) {
    case 'strong':
      return <strong key={key}>{kids}</strong>
    case 's':
      return (
        <s key={key} className="wrong-form">
          {kids}
        </s>
      )
    case 'em':
      return (
        <em key={key} className="fr-inline" lang="fr">
          {kids}
        </em>
      )
    default:
      return <span key={key}>{kids}</span>
  }
}

/** Tiny inline markdown: **bold**, *italic* (rendered as French text), ~~wrong form~~. */
export function Rich({ text }: { text: string }) {
  return <>{renderRich(parseRich(text))}</>
}
