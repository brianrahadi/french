import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookOpenText, Check, ClipboardPaste, LoaderCircle, Trash2, WandSparkles } from 'lucide-react'
import { BUILTIN_TEXTS, type ReaderTextDef } from '../../data/texts'
import { LEVELS, type Level } from '../../data/types'
import { findWord } from '../../data/vocab'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { Callout, LevelBadge, Switch } from '../../components/ui'
import { Shelf } from '../../components/Shelf'
import type { ReaderText } from './types'
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
  const [generate, setGenerate] = useState<Level | null>(null)

  // Unfinished things first, shelf by shelf; everything finished goes to the last shelf.
  const opened = texts.filter((t) => !read[t.id] && t.openedAt).sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''))
  const fresh = texts.filter((t) => !read[t.id] && !t.openedAt)
  const levels = startLevel ? [startLevel, ...LEVELS.filter((l) => l !== startLevel)] : LEVELS
  const done = [
    ...texts.filter((t) => read[t.id]).map((t) => ({ at: read[t.id], user: t, builtin: undefined })),
    ...BUILTIN_TEXTS.filter((t) => read[t.id]).map((t) => ({ at: read[t.id], user: undefined, builtin: t })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="page">
      <header className="page-header page-header--compact">
        <div>
          <div className="page-eyebrow">Compréhension écrite</div>
          <h1 className="page-title">Reading</h1>
          <p className="page-subtitle">Tap any word to see what it means in its sentence and add it to your flashcards.</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setPaste(true)}>
            <ClipboardPaste size={16} aria-hidden /> Paste a text
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setGenerate(startLevel ?? 'A2')}>
            <WandSparkles size={16} aria-hidden /> Write me a story
          </button>
        </div>
      </header>

      {opened.length > 0 && (
        <Shelf title="Continue reading" count={opened.length}>
          {opened.map((t) => (
            <UserTextTile key={t.id} t={t} onDelete={() => setConfirm(t.id)} />
          ))}
        </Shelf>
      )}

      {fresh.length > 0 && (
        <Shelf title="Your texts" count={fresh.length}>
          {fresh.map((t) => (
            <UserTextTile key={t.id} t={t} onDelete={() => setConfirm(t.id)} />
          ))}
        </Shelf>
      )}

      {levels.map((level) => {
        const list = BUILTIN_TEXTS.filter((t) => t.level === level && !read[t.id])
        return (
          <Shelf key={level} title={<>Graded texts · {level}</>} count={list.length}>
            {list.map((t) => (
              <GradedTile key={t.id} t={t} />
            ))}
            <button type="button" className="stile stile--action" onClick={() => setGenerate(level)}>
              <span className="stile__icon">
                <WandSparkles size={18} aria-hidden />
              </span>
              <span className="stile__title" style={{ fontSize: 15 }}>
                {list.length ? 'Want more?' : 'All read!'} Write a new {level} story
              </span>
              <span className="stile__sub">On any topic, with your words</span>
            </button>
          </Shelf>
        )
      })}

      {done.length > 0 && (
        <Shelf title="Completed" count={done.length} hint="Read them again any time — you’ll be surprised how much easier they get.">
          {done.map((d) =>
            d.user ? (
              <UserTextTile key={d.user.id} t={d.user} done onDelete={() => setConfirm(d.user!.id)} />
            ) : (
              <GradedTile key={d.builtin!.id} t={d.builtin!} done />
            ),
          )}
        </Shelf>
      )}

      <PasteDialog open={paste} onClose={() => setPaste(false)} />
      <GenerateDialog key={generate ?? 'closed'} open={!!generate} onClose={() => setGenerate(null)} defaultLevel={generate ?? startLevel ?? 'A2'} />
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

function GradedTile({ t, done }: { t: ReaderTextDef; done?: boolean }) {
  const words = countWords(t.paragraphs.map((p) => p.fr).join(' '))
  return (
    <div className={`stile${done ? ' stile--done' : ''}`}>
      <div className="stile__top">
        <LevelBadge level={t.level} />
        <span className="small subtle">{t.topic}</span>
        {done && (
          <span className="badge badge--success stile__corner">
            <Check size={12} aria-hidden /> read
          </span>
        )}
      </div>
      <Link to={`/reading/${t.id}`} className="stile__title stile__stretch fr" lang="fr">
        {frTypo(t.title)}
      </Link>
      <div className="stile__sub">{t.titleEn}</div>
      <div className="stile__foot">
        <BookOpenText size={13} aria-hidden /> {words} words · {Math.max(1, Math.round(words / 120))} min
      </div>
    </div>
  )
}

function UserTextTile({ t, done, onDelete }: { t: ReaderText; done?: boolean; onDelete: () => void }) {
  return (
    <div className={`stile${done ? ' stile--done' : ''}`}>
      <div className="stile__top">
        {t.level && <LevelBadge level={t.level} />}
        <span className="small subtle">{t.source === 'ai' ? 'Generated' : 'Pasted'}</span>
        <button type="button" className="icon-btn icon-btn--sm stile__corner" onClick={onDelete} aria-label={`Delete ${t.title}`}>
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
      <Link to={`/reading/${t.id}`} className="stile__title stile__stretch fr" lang="fr">
        {frTypo(t.title)}
      </Link>
      <div className="stile__sub">{t.topic ?? `${countWords(t.content)} words`}</div>
      <div className="stile__foot">
        {done ? <Check size={13} aria-hidden /> : <BookOpenText size={13} aria-hidden />} {countWords(t.content)} words · {ago(t.openedAt ?? t.createdAt)}
      </div>
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
