import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { CheckCircle2 } from 'lucide-react'
import { findWord } from '../../data/vocab'
import { FocusShell } from '../../components/FocusShell'
import { Kbd, Stat } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { cardId, parseCardId, Rating, State, type Grade } from '../../lib/srs'
import { dirsFor, dueCardIds, newAvailableToday, newWordQueue } from './selectors'
import { ProductionCard, RecognitionCard } from './cards'
import { noteLapse } from '../../lib/mistakes'
import { displayFr } from '../../lib/words'

type Item = { kind: 'intro'; wordId: string } | { kind: 'card'; id: string }

interface Session {
  items: Item[]
  learning: { id: string; due: number }[]
  current: Item | null
  done: number
  reviews: number
  correct: number
  learned: number
}

const LEARN_AHEAD_MS = 20 * 60_000

function pick(s: Session): Session {
  const now = Date.now()
  const learning = [...s.learning].sort((a, b) => a.due - b.due)
  if (learning[0] && learning[0].due <= now) {
    const [first, ...rest] = learning
    return { ...s, learning: rest, current: { kind: 'card', id: first.id } }
  }
  if (s.items.length) {
    const [first, ...rest] = s.items
    return { ...s, items: rest, current: first, learning }
  }
  if (learning[0] && learning[0].due - now < LEARN_AHEAD_MS) {
    const [first, ...rest] = learning
    return { ...s, learning: rest, current: { kind: 'card', id: first.id } }
  }
  return { ...s, current: null, learning }
}

function buildSession(extra: number): Session {
  const s = useStore.getState()
  const due = dueCardIds(s.cards, s.customWords)
  const limit = extra > 0 ? extra : newAvailableToday(s)
  const fresh = newWordQueue(s).slice(0, limit)
  const items: Item[] = []
  let ni = 0
  due.forEach((id, i) => {
    items.push({ kind: 'card', id })
    if ((i + 1) % 4 === 0 && ni < fresh.length) items.push({ kind: 'intro', wordId: fresh[ni++].id })
  })
  while (ni < fresh.length) items.push({ kind: 'intro', wordId: fresh[ni++].id })
  return pick({ items, learning: [], current: null, done: 0, reviews: 0, correct: 0, learned: 0 })
}

function insertAt<T>(arr: T[], index: number, item: T): T[] {
  const a = [...arr]
  a.splice(Math.min(index, a.length), 0, item)
  return a
}

/** A new session is built whenever the query changes (e.g. "learn 5 more"). */
export default function StudyRoute() {
  const [params] = useSearchParams()
  const extra = Number(params.get('extra') ?? 0)
  return <StudySession key={params.toString()} extra={extra} />
}

function StudySession({ extra }: { extra: number }) {
  useDocumentTitle('Study vocabulary')
  const navigate = useNavigate()
  const [session, setSession] = useState<Session>(() => buildSession(extra))
  const [startedAt] = useState(() => Date.now())

  const directions = useStore((s) => s.settings.directions)
  const customWords = useStore((s) => s.customWords)
  const introduceWord = useStore((s) => s.introduceWord)
  const rateCard = useStore((s) => s.rateCard)
  const logActivity = useStore((s) => s.logActivity)

  const remaining = session.items.length + session.learning.length + (session.current ? 1 : 0)
  const progress = session.done / Math.max(1, session.done + remaining)

  // A word's first card is shown straight away, front only — no study screen first.
  const onKnown = (wordId: string) => {
    introduceWord(wordId, dirsFor(directions), true)
    logActivity(true, { newWord: true, skill: 'vocabulary' })
    setSession((s) => pick({ ...s, done: s.done + 1, learned: s.learned + 1 }))
  }

  const onRated = (id: string, grade: Grade, isNew = false) => {
    const { wordId, dir } = parseCardId(id)
    const dirs = dirsFor(directions)
    if (isNew) introduceWord(wordId, dirs)
    const next = rateCard(id, grade)
    logActivity(grade !== Rating.Again, { newWord: isNew, skill: 'vocabulary' })
    if (grade === Rating.Again) {
      const w = findWord(wordId, useStore.getState().customWords)
      if (w) noteLapse(wordId, dir === 'r' ? w.fr : w.en, dir === 'r' ? w.en : displayFr(w))
    }
    // The other direction of a new word comes up later, as a new card of its own.
    const sibling = isNew ? dirs.find((d) => d !== dir) : undefined
    setSession((s) => {
      const dueMs = new Date(next.due).getTime()
      const inSession = (next.state === State.Learning || next.state === State.Relearning) && dueMs - Date.now() < 60 * 60_000
      return pick({
        ...s,
        items: sibling ? insertAt(s.items, 5, { kind: 'card', id: cardId(wordId, sibling) }) : s.items,
        learning: inSession ? [...s.learning, { id, due: dueMs }] : s.learning,
        done: s.done + 1,
        reviews: s.reviews + 1,
        correct: s.correct + (grade !== Rating.Again ? 1 : 0),
        learned: s.learned + (isNew ? 1 : 0),
      })
    })
  }

  const cur = session.current
  const count = <AnkiCounts session={session} />

  if (!cur) {
    return (
      <FocusShell progress={1} exitTo="/vocab" label="Study" count={count}>
        <SessionSummary session={session} startedAt={startedAt} onMore={() => navigate(`/vocab/study?extra=${extra >= 5 ? extra + 5 : 5}`)} />
      </FocusShell>
    )
  }

  const isNew = cur.kind === 'intro'
  const id = isNew ? cardId(cur.wordId, dirsFor(directions)[0]) : cur.id
  const { wordId, dir } = parseCardId(id)
  const w = findWord(wordId, customWords)
  if (!w) {
    setTimeout(() => setSession((s) => pick(s)))
    return null
  }
  const key = `${id}-${session.done}`
  const props = {
    word: w,
    id,
    onRate: (g: Grade) => onRated(id, g, isNew),
    onKnown: isNew ? () => onKnown(w.id) : undefined,
  }
  return (
    <FocusShell progress={progress} exitTo="/vocab" label="Study" count={count}>
      {dir === 'r' ? <RecognitionCard key={key} {...props} /> : <ProductionCard key={key} {...props} />}
    </FocusShell>
  )
}

type Kind = 'new' | 'learning' | 'review'

function kindOf(item: Item, cards: ReturnType<typeof useStore.getState>['cards']): Kind {
  if (item.kind === 'intro') return 'new'
  const c = cards[item.id]
  if (!c || c.state === State.New) return 'new'
  return c.state === State.Review ? 'review' : 'learning'
}

/** Anki's counter: cards left to see — new (blue), learning (red), review (green); the current kind underlined. */
function AnkiCounts({ session }: { session: Session }) {
  const cards = useStore((s) => s.cards)
  const n: Record<Kind, number> = { new: 0, learning: 0, review: 0 }
  for (const it of session.items) n[kindOf(it, cards)]++
  n.learning += session.learning.length
  const cur = session.current ? kindOf(session.current, cards) : null
  if (cur) n[cur]++
  const label = `${n.new} new, ${n.learning} learning, ${n.review} to review`
  return (
    <span className="anki-counts" aria-label={label} title={label}>
      {(['new', 'learning', 'review'] as Kind[]).map((k) => (
        <span key={k} className={`anki-counts__${k}${cur === k ? ' is-current' : ''}`}>
          {n[k]}
        </span>
      ))}
    </span>
  )
}

function SessionSummary({ session, startedAt, onMore }: { session: Session; startedAt: number; onMore: () => void }) {
  const state = useStore()
  const moreAvailable = newWordQueue(state).length
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
  const nothing = session.done === 0
  useHotkeys({ Enter: () => document.getElementById('summary-primary')?.click() })
  return (
    <Stack align="center" ta="center" gap={8} pt={32}>
      <CheckCircle2 size={44} color="var(--mantine-color-green-6)" aria-hidden />
      <Title order={1} fz={28} fw={600} className="fr" lang="fr">
        {nothing ? 'Tout est à jour !' : 'Session terminée !'}
      </Title>
      <Text c="dimmed" maw={420}>
        {nothing
          ? 'Nothing is due right now. Come back later — or learn a few extra words.'
          : 'Great work. Reviewing at the right moment is what moves words into long-term memory.'}
      </Text>
      {!nothing && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} w="100%" mt={18} ta="left">
          <Stat label="Reviews" value={session.reviews} />
          <Stat label="Recalled" value={session.reviews ? Math.round((session.correct / session.reviews) * 100) : 0} unit="%" />
          <Stat label="New words" value={session.learned} />
          <Stat label="Time" value={minutes} unit="min" />
        </SimpleGrid>
      )}
      <Group justify="center" mt={22}>
        {moreAvailable > 0 && (
          <Button variant="default" size="lg" onClick={onMore}>
            Learn 5 more words
          </Button>
        )}
        <Button component={Link} id="summary-primary" to="/vocab" size="lg" rightSection={<Kbd>↵</Kbd>}>
          Done
        </Button>
      </Group>
    </Stack>
  )
}
