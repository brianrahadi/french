import { Badge, Text, type MantineColor } from '@mantine/core'
import { Check, NotebookPen, Sparkles } from 'lucide-react'
import { WRITING_PROMPTS, type WritingPrompt } from '../../data/writing'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import type { LessonProgress, WritingEntry } from '../../lib/store'

/** Suggest a prompt that practices grammar the learner has recently mastered. */
export function suggestPrompt(lessons: Record<string, LessonProgress>, written: Set<string>, level: string): WritingPrompt | undefined {
  const mastered = Object.entries(lessons)
    .filter(([, p]) => p.best >= 0.8)
    .sort((a, b) => (a[1].lastAt < b[1].lastAt ? 1 : -1))
    .map(([id]) => id)
  for (const id of mastered) {
    const p = WRITING_PROMPTS.find((w) => !written.has(w.id) && w.lessons.includes(id))
    if (p) return p
  }
  return WRITING_PROMPTS.find((w) => !written.has(w.id) && w.level === level) ?? WRITING_PROMPTS.find((w) => !written.has(w.id))
}

/** Badge colour for a 0–100 correction score. */
export function scoreColor(score: number): MantineColor {
  return score >= 85 ? 'green' : score >= 60 ? 'orange' : 'red'
}

/** A small badge with a 0–100 score, coloured by how good it is. */
export function ScoreBadge({ score, miw }: { score: number; miw?: number }) {
  return (
    <Badge color={scoreColor(score)} className="tnum" miw={miw} style={{ flexShrink: 0 }}>
      {score}
    </Badge>
  )
}

/** A writing task; opens the editor. */
export function PromptTile({ p, done, suggested }: { p: WritingPrompt; done?: boolean; suggested?: boolean }) {
  return (
    <Tile
      to={`/writing/new?prompt=${p.id}`}
      highlight={suggested}
      top={
        <>
          <LevelBadge level={p.level} />
          {suggested && (
            <Badge size="sm" leftSection={<Sparkles size={11} aria-hidden />} tt="none">
              for you
            </Badge>
          )}
        </>
      }
      corner={
        done && (
          <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
            done
          </Badge>
        )
      }
      title={p.titleFr}
      fr
      sub={p.title}
      foot={
        <>
          <NotebookPen size={13} aria-hidden /> {p.focus} · {p.words[0]}–{p.words[1]} words
        </>
      }
    />
  )
}

/** A text you wrote, with its score. */
export function WritingTile({ w }: { w: WritingEntry }) {
  return (
    <Tile
      to={`/writing/${w.id}`}
      done
      top={
        <>
          <LevelBadge level={w.level} />
          <Text size="sm" c="dimmed">
            {w.revisionOf ? 'Rewrite' : 'Writing'}
          </Text>
        </>
      }
      corner={<ScoreBadge score={w.feedback.score} />}
      title={w.title}
      sub={
        <Text span className="fr" lang="fr" inherit>
          {w.text.slice(0, 90)}
          {w.text.length > 90 ? '…' : ''}
        </Text>
      }
      foot={`${new Date(w.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })} · ${w.feedback.errors.length} fix${w.feedback.errors.length === 1 ? '' : 'es'}`}
    />
  )
}
