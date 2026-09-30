import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookOpenText, Check, ClipboardPaste, LoaderCircle, Trash2, WandSparkles } from 'lucide-react'
import { BUILTIN_TEXTS } from '../../data/texts'
import { LEVELS, type Level } from '../../data/types'
import { findWord } from '../../data/vocab'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { Callout, LevelBadge, Switch } from '../../components/ui'
import { newId, useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { countWords } from '../../lib/ai/writing'
import { useDocumentTitle } from '../../lib/hooks'
import { parseCardId, State } from '../../lib/srs'
import { displayFr, frTypo } from '../../lib/words'
import { ago } from '../weak/WeakPage'
import { generateText } from './ai'

const TOPICS = ['a day in Paris', 'cooking at home', 'a job interview', 'a mystery in a small village', 'holidays by the sea', 'a new neighbour', 'city vs countryside', 'a family tradition']
const LENGTHS: { label: string; words: number }[] = [
  { label: 'Short', words: 130 },
  { label: 'Medium', words: 250 },
  { label: 'Long', words: 400 },
]

export default function ReadingHome() {
  useDocumentTitle('Reading')
  const texts = useStore((s) => s.texts)
  const read = useStore((s) => s.read)
  const deleteText = useStore((s) => s.deleteText)
  const startLevel = useStore((s) => s.startLevel)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [paste, setPaste] = useState(false)
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all')
  const builtin = BUILTIN_TEXTS.filter((t) => levelFilter === 'all' || t.level === levelFilter)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Compréhension écrite</div>
          <h1 className="page-title">Reading</h1>
          <p className="page-subtitle">
            Read graded texts or anything you paste in. Tap a word to see what it means in that sentence and add it to your
            flashcards with the sentence as its example — or have a text read aloud.
          </p>
        </div>
      </header>

      <div className="grid-2">
        <button type="button" className="card card--interactive hero-card" onClick={() => setPaste(true)}>
          <div className="hero-card__icon">
            <ClipboardPaste size={22} aria-hidden />
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div className="card__title">Paste a text</div>
            <div className="card__meta">An article, a LingQ lesson, song notes, an email…</div>
          </div>
        </button>
        <GenerateCard defaultLevel={startLevel ?? 'A2'} />
      </div>

      {texts.length > 0 && (
        <section className="section" aria-labelledby="my-texts">
          <h2 id="my-texts" className="section-title">
            <span>Your texts</span>
            <span className="tnum">{texts.length}</span>
          </h2>
          <div className="card card--flush">
            {texts.map((t) => (
              <div key={t.id} className="list-row text-row">
                <Link to={`/reading/${t.id}`} className="text-row__main">
                  <span className="text-row__title fr" lang="fr">
                    {frTypo(t.title)}
                  </span>
                  <span className="small subtle">
                    {t.source === 'ai' ? 'Generated' : 'Pasted'} · {countWords(t.content)} words · {ago(t.openedAt ?? t.createdAt)}
                  </span>
                </Link>
                {t.level && <LevelBadge level={t.level} />}
                {read[t.id] && (
                  <span className="badge badge--success" title="Finished">
                    <Check size={12} aria-hidden /> read
                  </span>
                )}
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setConfirm(t.id)} aria-label={`Delete ${t.title}`}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="library">
        <h2 id="library" className="section-title">
          <span>Graded texts</span>
          <div className="segmented" role="group" aria-label="Level">
            {(['all', ...LEVELS] as const).map((l) => (
              <button key={l} type="button" aria-pressed={levelFilter === l} onClick={() => setLevelFilter(l)}>
                {l === 'all' ? 'All' : l}
              </button>
            ))}
          </div>
        </h2>
        <div className="text-grid">
          {builtin.map((t) => {
            const words = countWords(t.paragraphs.map((p) => p.fr).join(' '))
            return (
              <Link key={t.id} to={`/reading/${t.id}`} className="card card--interactive text-card">
                <div className="row" style={{ gap: 8 }}>
                  <LevelBadge level={t.level} />
                  <span className="small subtle">{t.topic}</span>
                  <div className="spacer" />
                  {read[t.id] && (
                    <span className="badge badge--success">
                      <Check size={12} aria-hidden /> read
                    </span>
                  )}
                </div>
                <div className="text-card__title fr" lang="fr">
                  {frTypo(t.title)}
                </div>
                <div className="small muted">{t.titleEn}</div>
                <div className="small subtle" style={{ marginTop: 'auto' }}>
                  <BookOpenText size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> {words} words · {Math.max(1, Math.round(words / 120))} min
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <PasteDialog open={paste} onClose={() => setPaste(false)} />
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this text?"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirm(null)} autoFocus>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                if (confirm) deleteText(confirm)
                setConfirm(null)
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="muted">Words you added from it stay in your flashcards.</p>
      </Dialog>
    </div>
  )
}

function PasteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const saveText = useStore((s) => s.saveText)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const words = countWords(content)
  const save = () => {
    const id = newId('t')
    const firstLine = content.trim().split('\n')[0].slice(0, 60)
    saveText({
      id,
      title: title.trim() || firstLine || 'Mon texte',
      content: content.trim(),
      level: level || undefined,
      source: 'paste',
      createdAt: new Date().toISOString(),
    })
    setTitle('')
    setContent('')
    onClose()
    navigate(`/reading/${id}`)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Paste a French text"
      wide
      actions={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={words < 3}>
            Read it
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="paste-title">
            Title <span className="subtle">(optional)</span>
          </label>
          <input id="paste-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="paste-text">
            Text
          </label>
          <textarea
            id="paste-text"
            className="textarea fr"
            lang="fr"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Collez votre texte ici…"
            autoFocus
          />
          <p className="hint">{words} words. Separate paragraphs with a blank line. The text stays in this browser.</p>
        </div>
        <div className="row-wrap" style={{ gap: 6 }} role="group" aria-label="Level">
          <span className="small muted">Level:</span>
          {(['', ...LEVELS] as const).map((l) => (
            <button key={l || 'none'} type="button" className="chip chip--sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l || 'Not sure'}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

function GenerateCard({ defaultLevel }: { defaultLevel: Level }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="card card--interactive hero-card" onClick={() => setOpen(true)}>
        <div className="hero-card__icon hero-card__icon--amber">
          <WandSparkles size={22} aria-hidden />
        </div>
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div className="card__title">Write me a story</div>
          <div className="card__meta">A new text at your level, on any topic — with the words you’re learning</div>
        </div>
      </button>
      <GenerateDialog open={open} onClose={() => setOpen(false)} defaultLevel={defaultLevel} />
    </>
  )
}

function GenerateDialog({ open, onClose, defaultLevel }: { open: boolean; onClose: () => void; defaultLevel: Level }) {
  const navigate = useNavigate()
  const ai = useAiConfig()
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const saveText = useStore((s) => s.saveText)
  const [level, setLevel] = useState<Level>(defaultLevel)
  const [topic, setTopic] = useState('')
  const [length, setLength] = useState(1)
  const [useMine, setUseMine] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)

  // Words still being learned: in the learning steps or not yet stable.
  const learning = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    const entries = Object.entries(cards).sort((a, b) => a[1].stability - b[1].stability)
    for (const [id, c] of entries) {
      if (c.state === State.New) continue
      const { wordId } = parseCardId(id)
      if (seen.has(wordId)) continue
      seen.add(wordId)
      const w = findWord(wordId, customWords)
      if (w && (c.state === State.Learning || c.state === State.Relearning || c.scheduled_days < 21)) out.push(displayFr(w))
      if (out.length >= 10) break
    }
    return out
  }, [cards, customWords])

  const generate = async () => {
    setError('')
    setLoading(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const t = await generateText(
        { level, topic, words: LENGTHS[length].words, useWords: useMine ? learning : [], config: ai },
        ctrl.signal,
      )
      const id = newId('t')
      saveText({
        id,
        title: t.title,
        content: t.paragraphs.join('\n\n'),
        level,
        topic: topic.trim() || undefined,
        source: 'ai',
        createdAt: new Date().toISOString(),
      })
      onClose()
      navigate(`/reading/${id}`)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        abort.current?.abort()
        onClose()
      }}
      title="Write me a story"
      wide
      actions={
        ai ? (
          <>
            <button className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={generate} disabled={loading}>
              {loading ? <LoaderCircle size={16} className="spin" aria-hidden /> : <WandSparkles size={16} aria-hidden />}
              {loading ? 'Writing…' : 'Write it'}
            </button>
          </>
        ) : undefined
      }
    >
      {!ai ? (
        <ConnectAiCard title="Connect an AI to write texts" />
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          <div className="practice-setup__row">
            <span className="setup-label">Level</span>
            <div className="segmented" role="group" aria-label="Level">
              {LEVELS.map((l) => (
                <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="gen-topic">
              Topic
            </label>
            <input
              id="gen-topic"
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Anything — e.g. a cat who runs a bakery"
            />
            <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
              {TOPICS.map((t) => (
                <button key={t} type="button" className="chip chip--sm" aria-pressed={topic === t} onClick={() => setTopic(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="practice-setup__row">
            <span className="setup-label">Length</span>
            <div className="segmented" role="group" aria-label="Length">
              {LENGTHS.map((l, i) => (
                <button key={l.label} type="button" aria-pressed={length === i} onClick={() => setLength(i)}>
                  {l.label} · ~{l.words}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row" style={{ padding: 0 }}>
            <div className="setting-row__text">
              <div className="setting-row__title">Use words I’m learning</div>
              <div className="setting-row__desc">
                {learning.length ? learning.slice(0, 6).join(', ') + (learning.length > 6 ? '…' : '') : 'Start some flashcards first.'}
              </div>
            </div>
            <Switch checked={useMine && learning.length > 0} onChange={setUseMine} label="Use words I’m learning" />
          </div>
          {error && <Callout kind="warn">{error}</Callout>}
        </div>
      )}
    </Dialog>
  )
}
