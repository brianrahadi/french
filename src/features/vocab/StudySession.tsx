import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { findWord } from '../../data/vocab'
import { FocusShell } from '../../components/FocusShell'
import { Kbd } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { cardId, parseCardId, Rating, State, type Grade } from '../../lib/srs'
import { dirsFor, dueCardIds, newAvailableToday, newWordQueue } from './selectors'
import { IntroCard, ProductionCard, RecognitionCard } from './cards'

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

  const onIntroduced = (wordId: string, known: boolean) => {
    const dirs = dirsFor(directions)
    introduceWord(wordId, dirs, known)
    logActivity(true, { newWord: true })
    setSession((s) => {
      let items = s.items
      if (!known) {
        // Test it soon, after a couple of other cards, then the other direction later.
        items = insertAt(items, 2, { kind: 'card', id: cardId(wordId, dirs[0]) })
        if (dirs[1]) items = insertAt(items, 6, { kind: 'card', id: cardId(wordId, dirs[1]) })
      }
      return pick({ ...s, items, done: s.done + 1, learned: s.learned + 1 })
    })
  }

  const onRated = (id: string, grade: Grade) => {
    const next = rateCard(id, grade)
    logActivity(grade !== Rating.Again)
    setSession((s) => {
      const dueMs = new Date(next.due).getTime()
      const inSession = (next.state === State.Learning || next.state === State.Relearning) && dueMs - Date.now() < 60 * 60_000
      return pick({
        ...s,
        learning: inSession ? [...s.learning, { id, due: dueMs }] : s.learning,
        done: s.done + 1,
        reviews: s.reviews + 1,
        correct: s.correct + (grade !== Rating.Again ? 1 : 0),
      })
    })
  }

  const cur = session.current
  const count = `${session.done}/${session.done + remaining}`

  if (!cur) {
    return (
      <FocusShell progress={1} exitTo="/vocab" label="Study" count={count}>
        <SessionSummary session={session} startedAt={startedAt} onMore={() => navigate(`/vocab/study?extra=${extra >= 5 ? extra + 5 : 5}`)} />
      </FocusShell>
    )
  }

  if (cur.kind === 'intro') {
    const w = findWord(cur.wordId, customWords)
    if (!w) {
      setTimeout(() => setSession((s) => pick(s)))
      return null
    }
    return (
      <FocusShell progress={progress} exitTo="/vocab" label="Study" count={count}>
        <IntroCard key={w.id} word={w} onDone={(known) => onIntroduced(w.id, known)} />
      </FocusShell>
    )
  }

  const { wordId, dir } = parseCardId(cur.id)
  const w = findWord(wordId, customWords)
  if (!w) {
    setTimeout(() => setSession((s) => pick(s)))
    return null
  }
  return (
    <FocusShell progress={progress} exitTo="/vocab" label="Study" count={count}>
      {dir === 'r' ? (
        <RecognitionCard key={`${cur.id}-${session.done}`} word={w} id={cur.id} onRate={(g) => onRated(cur.id, g)} />
      ) : (
        <ProductionCard key={`${cur.id}-${session.done}`} word={w} id={cur.id} onRate={(g) => onRated(cur.id, g)} />
      )}
    </FocusShell>
  )
}

function SessionSummary({ session, startedAt, onMore }: { session: Session; startedAt: number; onMore: () => void }) {
  const state = useStore()
  const moreAvailable = newWordQueue(state).length
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
  const nothing = session.done === 0
  useHotkeys({ Enter: () => document.getElementById('summary-primary')?.click() })
  return (
    <div className="results">
      <CheckCircle2 size={44} color="var(--success)" aria-hidden />
      <h1 className="results__title">{nothing ? 'Tout est à jour !' : 'Session terminée !'}</h1>
      <p className="muted" style={{ maxWidth: 420 }}>
        {nothing
          ? 'Nothing is due right now. Come back later — or learn a few extra words.'
          : 'Great work. Reviewing at the right moment is what moves words into long-term memory.'}
      </p>
      {!nothing && (
        <div className="stats" style={{ width: '100%', marginTop: 18 }}>
          <div className="stat">
            <div className="stat__label">Reviews</div>
            <div className="stat__value">{session.reviews}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Recalled</div>
            <div className="stat__value">
              {session.reviews ? Math.round((session.correct / session.reviews) * 100) : 0}
              <small>%</small>
            </div>
          </div>
          <div className="stat">
            <div className="stat__label">New words</div>
            <div className="stat__value">{session.learned}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Time</div>
            <div className="stat__value">
              {minutes}
              <small>min</small>
            </div>
          </div>
        </div>
      )}
      <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 22 }}>
        {moreAvailable > 0 && (
          <button className="btn btn--secondary btn--lg" onClick={onMore}>
            Learn 5 more words
          </button>
        )}
        <Link id="summary-primary" to="/vocab" className="btn btn--primary btn--lg">
          Done <Kbd>↵</Kbd>
        </Link>
      </div>
    </div>
  )
}
