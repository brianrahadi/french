import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookAudio, Check, Headphones, Play } from 'lucide-react'
import { LEVELS, type Level } from '../../data/types'
import { STORIES, storyMinutes } from '../../data/stories'
import { Callout, Kbd, LevelBadge, Stat } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
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
  const [src, setSrc] = useState<SentenceSource>(() => (Object.keys(state.introduced).length >= 8 ? 'mine' : state.startLevel ?? 'A1'))
  const [n, setN] = useState(10)
  const pool = useMemo(() => poolFor(src, state), [src, state])
  const doneInPool = pool.filter((x) => state.listening[x.id]).length
  const start = () => navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${n}`)
  useHotkeys({ Enter: () => speechSupported && start() })

  const stats = Object.values(state.listening)
  const avg = stats.length ? Math.round(stats.reduce((a, x) => a + x.last, 0) / stats.length) : 0
  const perfect = stats.filter((x) => x.best === 100).length
  const recent = Object.entries(state.listening)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 6)
    .map(([id, st]) => ({ s: sentenceById(id), st }))
    .filter((x) => x.s)

  const since = Date.now() - 30 * 86_400_000
  const cats = new Map<ListenCategory, number>()
  for (const m of state.mistakes)
    if (m.source === 'listening' && !m.resolved && new Date(m.at).getTime() > since) {
      const c = m.skill.slice(7) as ListenCategory
      cats.set(c, (cats.get(c) ?? 0) + 1)
    }
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Compréhension orale</div>
          <h1 className="page-title">Listening</h1>
          <p className="page-subtitle">
            Two ways to train your ear: short stories to follow from start to finish and answer questions about, and
            dictation to hear every sound and spelling.
          </p>
        </div>
      </header>

      {!speechSupported ? (
        <Callout kind="warn">This browser can’t read text aloud, so dictation isn’t available here. Try Chrome, Edge or Safari.</Callout>
      ) : (
        voices.length === 0 && (
          <Callout kind="tip">
            No French voice found yet. On a Mac, add one in System Settings → Accessibility → Spoken Content → System voice →
            Manage voices (French “Enhanced” or “Premium” voices sound best). Then pick it in Settings.
          </Callout>
        )
      )}

      {STORIES.length > 0 && <Stories />}

      <section className="card practice-setup" aria-labelledby="dict-setup">
        <h2 id="dict-setup" className="card__title">
          Dictée
        </h2>
        <p className="small muted" style={{ marginTop: -4 }}>
          Hear a sentence, write it down, and see exactly which sounds you missed — silent endings, sound-alikes, swallowed
          little words.
        </p>
        <div className="practice-setup__row">
          <span className="setup-label">Sentences from</span>
          <div className="row-wrap" style={{ gap: 6 }} role="group" aria-label="Sentences from">
            <button type="button" className="chip" aria-pressed={src === 'mine'} onClick={() => setSrc('mine')}>
              My words
            </button>
            {LEVELS.map((l) => (
              <button key={l} type="button" className="chip" aria-pressed={src === l} onClick={() => setSrc(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="practice-setup__row">
          <span className="setup-label">Length</span>
          <div className="segmented" role="group" aria-label="Number of sentences">
            {LENGTHS.map((x) => (
              <button key={x} type="button" aria-pressed={n === x} onClick={() => setN(x)}>
                {x} sentences
              </button>
            ))}
          </div>
        </div>
        <div className="practice-setup__foot">
          <span className="small muted">
            {src === 'mine' ? 'Sentences with the words you’re learning' : `${src} sentences`} · {pool.length} available · {doneInPool} done
          </span>
          <button type="button" className="btn btn--primary btn--lg" onClick={start} disabled={!speechSupported || !pool.length}>
            <Play size={18} aria-hidden /> Start <Kbd>↵</Kbd>
          </button>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>Your listening</span>
          </div>
          <div className="stats">
            <Stat label="Sentences written" value={stats.length} />
            <Stat label="Perfect" value={perfect} />
            <Stat label="Average score" value={avg} unit="%" />
            <Stat label="Played again" value={stats.reduce((a, x) => a + x.n - 1, 0)} />
          </div>
        </section>
      )}

      {topCats.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>What trips you up</span>
            <Link to="/weak" className="small">
              Weak spots <ArrowRight size={14} aria-hidden style={{ verticalAlign: '-2px' }} />
            </Link>
          </div>
          <div className="grid-3">
            {topCats.map(([c, count]) => (
              <div key={c} className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{LISTEN_CATEGORIES[c].label}</strong>
                  <span className="badge badge--warning tnum">{count}</span>
                </div>
                <p className="small muted">{LISTEN_CATEGORIES[c].tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>
              <Headphones size={16} aria-hidden style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Recently
            </span>
          </div>
          <div className="card card--flush">
            {recent.map(({ s, st }) => (
              <div key={s!.id} className="list-row" style={{ gap: 10 }}>
                <SpeakButton text={s!.fr} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr" lang="fr">
                    {frTypo(s!.fr)}
                  </div>
                  <div className="small subtle">{s!.en}</div>
                </div>
                <span className={`badge tnum ${st.last === 100 ? 'badge--success' : st.last >= 70 ? 'badge--warning' : 'badge--danger'}`}>
                  {st.last}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Short stories (1–2 minutes) to listen to, then answer questions about. */
function Stories() {
  const results = useStore((s) => s.stories ?? {})
  const startLevel = useStore((s) => s.startLevel)
  const [level, setLevel] = useState<Level | 'all'>(startLevel ?? 'all')
  const shown = STORIES.filter((s) => level === 'all' || s.level === level)
  return (
    <section className="section" aria-labelledby="stories-title" style={{ marginTop: 0, marginBottom: 24 }}>
      <div className="section-title">
        <span id="stories-title">
          <BookAudio size={16} aria-hidden style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Histoires — short stories
        </span>
        <div className="row-wrap" style={{ gap: 6 }} role="group" aria-label="Level">
          <button type="button" className="chip" aria-pressed={level === 'all'} onClick={() => setLevel('all')}>
            All
          </button>
          {LEVELS.map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted" style={{ margin: '0 0 12px' }}>
        Listen to a 1–2 minute story without the text, as many times as you need, then answer comprehension questions.
        The transcript and translation come after.
      </p>
      <div className="card card--flush">
        {shown.map((s) => {
          const r = results[s.id]
          return (
            <Link key={s.id} to={`/listening/story/${s.id}`} className="list-row story-list__row">
              <LevelBadge level={s.level} />
              <div className="story-list__text">
                <div className="fr" lang="fr">
                  {frTypo(s.title)}
                </div>
                <div className="small subtle">
                  {s.titleEn} · {s.topic} · {storyMinutes(s)} min
                </div>
              </div>
              {r ? (
                <span className={`badge tnum ${r.best === 100 ? 'badge--success' : r.best >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                  {r.best === 100 && <Check size={12} aria-hidden />} {r.best}%
                </span>
              ) : (
                <Play size={16} aria-hidden className="subtle" />
              )}
            </Link>
          )
        })}
        {shown.length === 0 && <div className="list-row small muted">No stories at this level yet.</div>}
      </div>
    </section>
  )
}
