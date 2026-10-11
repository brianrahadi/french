import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import { ThemeIcon, type MantineColor } from '@mantine/core'
import { AudioLines, BookAudio, BookMarked, BookOpen, BookOpenText, CircleCheck, CirclePlay, FileText, History, Layers, MessagesSquare, NotebookPen, Podcast } from 'lucide-react'

/** The kinds of things a shelf or a card can hold. */
export type Kind = 'continue' | 'completed' | 'history' | 'grammar' | 'audio' | 'story' | 'text' | 'book' | 'mytext' | 'talk' | 'writing' | 'vocab' | 'sounds'

type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

/**
 * One icon and colour per kind, so a card says what it is at a glance, even in
 * mixed rows like Continue and Completed. Colours match the Practice cards.
 */
export const KINDS: Record<Kind, { label: string; icon: Icon; color: MantineColor }> = {
  continue: { label: 'In progress', icon: CirclePlay, color: 'gray' },
  completed: { label: 'Completed', icon: CircleCheck, color: 'green' },
  history: { label: 'Your history', icon: History, color: 'gray' },
  grammar: { label: 'Grammar lesson', icon: BookOpen, color: 'violet' },
  audio: { label: 'Audio lesson', icon: Podcast, color: 'teal' },
  story: { label: 'Mini story', icon: BookAudio, color: 'pink' },
  text: { label: 'Graded text', icon: BookOpenText, color: 'blue' },
  book: { label: 'Book', icon: BookMarked, color: 'grape' },
  mytext: { label: 'Your text', icon: FileText, color: 'yellow' },
  talk: { label: 'Conversation', icon: MessagesSquare, color: 'orange' },
  writing: { label: 'Writing', icon: NotebookPen, color: 'indigo' },
  vocab: { label: 'Vocabulary deck', icon: Layers, color: 'accent' },
  sounds: { label: 'Sounds', icon: AudioLines, color: 'green' },
}

const Scope = createContext<Kind | null>(null)

/** Marks a row or page as holding one kind of card (e.g. the Grammar course shelf). */
export function KindScope({ kind, children }: { kind: Kind | null; children: ReactNode }) {
  return <Scope.Provider value={kind}>{children}</Scope.Provider>
}

/**
 * Whether a card should show its kind's icon: not inside a row of that same
 * kind, where it would only repeat the row's title (a lesson in Grammar
 * course), but yes in mixed rows like Continue, Completed and Your history.
 */
export function useShowKind(kind?: Kind) {
  const scope = useContext(Scope)
  return !!kind && scope !== kind
}

/** A kind's icon in a soft coloured square: `md` beside a shelf title, `sm` at the top of a card. */
export function KindIcon({ kind, size = 'md', color }: { kind: Kind; size?: 'sm' | 'md'; color?: MantineColor }) {
  const k = KINDS[kind]
  const Icon = k.icon
  const sm = size === 'sm'
  return (
    <ThemeIcon variant="light" color={color ?? k.color} size={sm ? 24 : 30} radius={sm ? 'sm' : 'md'} role="img" aria-label={k.label} title={k.label} style={{ flexShrink: 0 }}>
      <Icon size={sm ? 14 : 17} aria-hidden />
    </ThemeIcon>
  )
}
