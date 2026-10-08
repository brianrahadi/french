import type { ReactNode } from 'react'
import {
  Alert,
  Badge,
  EmptyState,
  Kbd as MKbd,
  Paper,
  Progress,
  RingProgress,
  Switch as MSwitch,
  Text,
  type MantineColor,
} from '@mantine/core'
import { AlertTriangle, Lightbulb } from 'lucide-react'
import type { Level } from '../data/types'

/*
 * Small app-level wrappers over Mantine, so features share one vocabulary
 * (a level badge, a progress bar…) without repeating props everywhere.
 */

export function Kbd({ children }: { children: ReactNode }) {
  return <MKbd size="xs">{children}</MKbd>
}

export function ProgressBar({ value, label, variant, thin }: { value: number; label: string; variant?: 'success'; thin?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return <Progress value={pct} size={thin ? 'xs' : 'sm'} color={variant === 'success' ? 'green' : undefined} aria-label={label} radius="xl" />
}

export function Ring({ value, size = 64, stroke = 7, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <RingProgress
      size={size}
      thickness={stroke}
      roundCaps={v > 0}
      sections={[{ value: v * 100, color: v >= 1 ? 'green' : 'accent' }]}
      label={
        <Text ta="center" fw={700} size="sm">
          {children}
        </Text>
      }
      role="img"
      aria-label={label}
    />
  )
}

export const LEVEL_COLORS: Record<Level, MantineColor> = { A1: 'green', A2: 'blue', B1: 'violet', B2: 'pink' }

export function LevelBadge({ level }: { level: Level }) {
  return (
    <Badge color={LEVEL_COLORS[level]} size="sm">
      {level}
    </Badge>
  )
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <Paper p="md">
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text fz={26} fw={700} lh={1.2} className="tnum">
        {value}
        {unit && (
          <Text span c="dimmed" size="sm" fw={500}>
            {unit}
          </Text>
        )}
      </Text>
    </Paper>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <MSwitch checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} aria-label={label} />
}

export function Callout({ kind, children }: { kind: 'tip' | 'warn'; children: ReactNode }) {
  return (
    <Alert
      variant="light"
      color={kind === 'tip' ? 'blue' : 'orange'}
      icon={kind === 'tip' ? <Lightbulb size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
      my="md"
    >
      <span className="sr-only">{kind === 'tip' ? 'Tip: ' : 'Watch out: '}</span>
      {children}
    </Alert>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <EmptyState icon={icon} title={title} description={children} py="xl" />
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
