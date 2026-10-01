import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookAudio, Check, Headphones, PenLine } from 'lucide-react'
import { LEVELS, type Level, type StoryDef } from '../../data/types'
import { STORIES, storyMinutes } from '../../data/stories'
import { Callout, LevelBadge } from '../../components/ui'
import { Shelf } from '../../components/Shelf'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore, type SentenceStat } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { speechSupported, useFrenchVoices } from '../../lib/speech'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { poolFor, sentenceById, type SentenceSource } from './sentences'

const LENGTHS = [5, 10, 15]

export default function ListeningPage() {
  useDocumentTitle('Listening')
  const navigate = useNavigate()
  const state = useStore()
  const voices = useFrenchVoices()
  const [n, setN] = useState(10)
  const results = state.stories ?? {}

  // Stories: not yet done first (your level first), done ones on the last shelves.
  const levelOrder = state.startLevel ? [state.startLevel, ...LEVELS.filter((l) => l !== state.startLevel)] : LEVELS
  const rank = (l: Level) => levelOrder.indexOf(l)
  const todo = STORIES.filter((s) => !results[s.id]).sort((a, b) => rank(a.level) - rank(b.level))
  const done = STORIES.filter((s) => results[s.id]).sort((a, b) => results[b.id].at.localeCompare(results[a.id].at))

  // Dictation sets, most useful first.
  const sources: SentenceSource[] = [...(Object.keys(state.introduced).length >= 8 ? (['mine'] as const) : []), ...levelOrder]
  const start = (src: SentenceSource) => navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${n}`)

  const stats = Object.values(state.listening)
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.last, 0) / stats.length) : 0
  const recent = Object.entries(state.listening)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 12)
    .map(([id, st]) => ({ s: sentenceById(id), st }))
    .filter((x) => x.s)

  const since = Date.now() - 30 * 86_400_000
  const cats = new Map<ListenCategory, number>()
  for (const m of state.mistakes)
    if (m.source === 'listening' && !m.resolved && new Date(m.at).getTime() > since) {
      const c = m.skill.slice(7) as ListenCategory
      cats.set(c, (cats.get(c) ?? 0) + 1)
    }
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="page">
      <header className="page-header page-header--compact">
        <div>
          <div className="page-eyebrow">Compréhension orale</div>
          <h1 className="page-title">Listening</h1>
          <p className="page-subtitle">Follow a short story and answer questions, or write down what you hear.</p>
        </div>
        {(done.length > 0 || stats.length > 0) && (
          <div className="inline-stats" aria-label="Your listening">
            {done.length > 0 && (
              <span>
                <strong>{done.length}</strong>/{STORIES.length} stories
              </span>
            )}
            {stats.length > 0 && (
              <span>
                <strong>{stats.length}</strong> sentences written · <strong>{avg}%</strong> average
              </span>
            )}
          </div>
        )}
      </header>

      {!speechSupported ? (
        <Callout kind="warn">This browser can’t read text aloud, so listening isn’t available here. Try Chrome, Edge or Safari.</Callout>
      ) : (
        voices.length === 0 && (
          <Callout kind="tip">
            No French voice found yet. On a Mac, add one in System Settings → Accessibility → Spoken Content → System voice →
            Manage voices (French “Enhanced” or “Premium” voices sound best). Then pick it in Settings.
          </Callout>
        )
      )}

      {todo.length > 0 && (
        <Shelf
          title={
            <>
              <BookAudio size={17} aria-hidden style={{ verticalAlign: '-3px' }} /> Short stories
            </>
          }
          count={todo.length}
          hint="1–2 minutes, no text: listen as often as you like, then answer the questions."
        >
          {todo.map((s) => (
            <StoryTile key={s.id} s={s} />
          ))}
        </Shelf>
      )}

      <Shelf
        title={
          <>
            <PenLine size={17} aria-hidden style={{ verticalAlign: '-3px' }} /> Dictation
          </>
        }
        hint="Hear a sentence, type it, and see which sounds you missed."
        action={
          <div className="segmented" role="group" aria-label="Sentences per session">
            {LENGTHS.map((x) => (
              <button key={x} type="button" aria-pressed={n === x} onClick={() => setN(x)}>
                {x}
              </button>
            ))}
          </div>
        }
      >
        {sources.map((src) => (
          <DictationTile key={src} src={src} n={n} onStart={() => start(src)} />
        ))}
      </Shelf>

      {topCats.length > 0 && (
        <Shelf
          title="What trips you up"
          count={topCats.length}
          action={
            <Link to="/weak" className="small">
              Weak spots <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Link>
          }
        >
          {topCats.map(([c, count]) => (
            <div key={c} className="stile">
              <div className="stile__top">
                <strong>{LISTEN_CATEGORIES[c].label}</strong>
                <span className="badge badge--warning tnum stile__corner">{count}</span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                {LISTEN_CATEGORIES[c].tip}
              </p>
            </div>
          ))}
        </Shelf>
      )}

      {done.length > 0 && (
        <Shelf title="Completed stories" count={done.length} hint="Listen again with the transcript, or try to beat your score.">
          {done.map((s) => (
            <StoryTile key={s.id} s={s} result={results[s.id]} />
          ))}
        </Shelf>
      )}

      {recent.length > 0 && (
        <Shelf title="Recent dictation" count={recent.length}>
          {recent.map(({ s, st }) => (
            <div key={s!.id} className="stile stile--done">
              <div className="stile__top">
                <SpeakButton text={s!.fr} size="sm" />
                <ScoreBadge score={st.last} />
              </div>
              <div className="stile__title fr" lang="fr" style={{ fontSize: 15, WebkitLineClamp: 3 }}>
                {frTypo(s!.fr)}
              </div>
              <div className="stile__sub">{s!.en}</div>
            </div>
          ))}
        </Shelf>
      )}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`badge tnum stile__corner ${score === 100 ? 'badge--success' : score >= 60 ? 'badge--warning' : 'badge--danger'}`}>
      {score === 100 && <Check size={12} aria-hidden />} {score}%
    </span>
  )
}

function StoryTile({ s, result }: { s: StoryDef; result?: SentenceStat }) {
  return (
    <div className={`stile${result ? ' stile--done' : ''}`}>
      <div className="stile__top">
        <LevelBadge level={s.level} />
        <span className="small subtle">{s.topic}</span>
        {result && <ScoreBadge score={result.best} />}
      </div>
      <Link to={`/listening/story/${s.id}`} className="stile__title stile__stretch fr" lang="fr">
        {frTypo(s.title)}
      </Link>
      <div className="stile__sub">{s.titleEn}</div>
      <div className="stile__foot">
        <Headphones size={13} aria-hidden /> {storyMinutes(s)} min · {s.questions.length} questions
      </div>
    </div>
  )
}

function DictationTile({ src, n, onStart }: { src: SentenceSource; n: number; onStart: () => void }) {
  const state = useStore()
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const doneIn = pool.filter((x) => state.listening[x.id]).length
  const label = src === 'mine' ? 'My words' : `${src} sentences`
  return (
    <button type="button" className="stile" onClick={onStart} disabled={!speechSupported || !pool.length}>
      <div className="stile__top">
        {src === 'mine' ? <span className="badge badge--primary">mine</span> : <LevelBadge level={src as Level} />}
      </div>
      <div className="stile__title">{label}</div>
      <div className="stile__sub">{src === 'mine' ? 'Sentences with the words you’re learning' : `${pool.length} sentences`}</div>
      <div className="stile__foot">
        {doneIn}/{pool.length} done · start {n}
      </div>
      <div className="stile__progress" aria-hidden>
        <span style={{ width: `${pool.length ? (doneIn / pool.length) * 100 : 0}%` }} />
      </div>
    </button>
  )
}
