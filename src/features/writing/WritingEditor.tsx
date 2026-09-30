import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { PROMPT_BY_ID } from '../../data/writing'
import { LESSONS, LESSON_BY_ID } from '../../data/grammar'
import { LEVELS, type Level } from '../../data/types'
import { AccentBar } from '../../components/AccentBar'
import { Callout, Kbd, LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { countWords, getWritingFeedback, useAi, AiError } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'
import { ApiKeySetup } from './ApiKeySetup'

const DRAFT_KEY = 'petit-a-petit-draft:'

function loadDraft(key: string): string {
  try {
    return localStorage.getItem(DRAFT_KEY + key) ?? ''
  } catch {
    return ''
  }
}
function saveDraft(key: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(DRAFT_KEY + key, text)
    else localStorage.removeItem(DRAFT_KEY + key)
  } catch {
    /* storage unavailable — drafts are a convenience */
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export default function WritingEditor() {
  const [params] = useSearchParams()
  const promptId = params.get('prompt') ?? 'free'
  const rewriteId = params.get('rewrite')
  const navigate = useNavigate()

  const writings = useStore((s) => s.writings)
  const startLevel = useStore((s) => s.startLevel)
  const addWriting = useStore((s) => s.addWriting)
  const logActivityBulk = useStore((s) => s.logActivityBulk)
  const apiKey = useAi((s) => s.apiKey)
  const model = useAi((s) => s.model)

  const original = rewriteId ? writings.find((w) => w.id === rewriteId) : undefined
  const prompt = PROMPT_BY_ID[original?.promptId ?? promptId]
  const kind = prompt ? 'prompt' : (original?.promptId ?? promptId) === 'custom' ? 'custom' : 'free'
  useDocumentTitle(original ? 'Rewrite' : prompt ? prompt.titleFr : 'Writing')

  const draftKey = rewriteId ? `rewrite-${rewriteId}` : promptId
  const [text, setText] = useState(() => loadDraft(draftKey) || original?.text || '')
  const [customTask, setCustomTask] = useState(original && kind === 'custom' ? original.task : '')
  const [level, setLevel] = useState<Level>(prompt?.level ?? original?.level ?? startLevel ?? 'A2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => saveDraft(draftKey, text === original?.text ? '' : text), [draftKey, text, original?.text])
  useEffect(() => () => abort.current?.abort(), [])

  // Grow the textarea with its content.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(260, el.scrollHeight + 2)}px`
  }, [text])

  const words = countWords(text)
  const [min, max] = prompt?.words ?? [30, 250]
  const task =
    kind === 'prompt'
      ? prompt!.task
      : kind === 'custom'
        ? customTask.trim() || 'Write about a topic of your choice.'
        : 'Free writing — any topic the learner chooses.'
  const title = kind === 'prompt' ? `${prompt!.titleFr}` : kind === 'custom' ? customTask.trim().slice(0, 60) || 'Your own topic' : 'Free writing'
  const canSubmit = words >= 5 && !loading && !!apiKey && (kind !== 'custom' || customTask.trim().length > 0)

  const lessonList = useMemo(() => LESSONS.map((l) => ({ id: l.id, title: `${l.title} (${l.level})` })), [])

  const submit = async () => {
    if (!canSubmit) return
    setError('')
    setLoading(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const feedback = await getWritingFeedback({
        apiKey,
        model,
        text,
        task,
        focus: prompt?.focus,
        level,
        lessons: lessonList,
        signal: ctrl.signal,
      })
      const id = newId()
      addWriting({
        id,
        promptId: kind === 'prompt' ? prompt!.id : kind,
        title,
        task,
        level,
        text: text.trim(),
        words,
        createdAt: new Date().toISOString(),
        model,
        feedback,
        revisionOf: original?.id,
      })
      // Count writing toward the daily goal: roughly one "answer" per ten words.
      const items = Math.max(1, Math.round(words / 10))
      logActivityBulk(items, Math.round((items * feedback.score) / 100))
      saveDraft(draftKey, '')
      navigate(`/writing/${id}`, { replace: true })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(e instanceof AiError || e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const insert = (phrase: string) => {
    const el = area.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const before = text.slice(0, start)
    const sep = before && !/\s$/.test(before) ? ' ' : ''
    const piece = sep + phrase.replace(/…$/, '')
    setText(before + piece + text.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + piece.length, start + piece.length)
    })
  }

  const counterClass = words === 0 ? '' : words < min ? 'text-warning' : words > max ? 'text-warning' : 'text-success'

  return (
    <div className="page page--narrow">
      <Link to={original ? `/writing/${original.id}` : '/writing'} className="back-link">
        <ArrowLeft size={16} aria-hidden /> {original ? 'Back to feedback' : 'Writing'}
      </Link>

      <section className="card writing-task" aria-labelledby="task-title">
        {original && (
          <div className="pill" style={{ marginBottom: 10 }}>
            Rewrite — use your corrections, but try not to copy them
          </div>
        )}
        {kind === 'prompt' ? (
          <>
            <div className="row-wrap" style={{ marginBottom: 8 }}>
              <LevelBadge level={prompt!.level} />
              <span className="subtle small">
                {min}–{max} words
              </span>
            </div>
            <h1 id="task-title" className="writing-task__title fr" lang="fr">
              {prompt!.titleFr}
            </h1>
            <p className="writing-task__text">{prompt!.task}</p>
            <div className="row-wrap small" style={{ marginTop: 10 }}>
              <span className="subtle">Practises:</span>
              {prompt!.lessons.map((id) => (
                <Link key={id} to={`/grammar/${id}`} className="chip chip--sm">
                  {LESSON_BY_ID[id]?.title ?? id}
                </Link>
              ))}
            </div>
            <details className="phrases">
              <summary>Useful phrases</summary>
              <div className="phrases__list">
                {prompt!.phrases.map((ph) => (
                  <button key={ph} type="button" className="chip chip--sm fr" lang="fr" onClick={() => insert(ph)} title="Insert">
                    {frTypo(ph)}
                  </button>
                ))}
              </div>
            </details>
          </>
        ) : (
          <>
            <h1 id="task-title" className="writing-task__title fr" lang="fr">
              {kind === 'custom' ? 'Ton propre sujet' : 'Écriture libre'}
            </h1>
            {kind === 'custom' ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label className="label" htmlFor="custom-task">
                  What will you write about?
                </label>
                <input
                  id="custom-task"
                  className="input"
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="e.g. Describe your favourite café in Vancouver"
                />
              </div>
            ) : (
              <p className="writing-task__text">Write about anything — your day, a plan, a message to a friend.</p>
            )}
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <span className="label">Your level</span>
              <div className="segmented" role="group" aria-label="Your level">
                {LEVELS.map((l) => (
                  <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <div className="writing-editor">
        <label htmlFor="writing-text" className="sr-only">
          Your text in French
        </label>
        <textarea
          id="writing-text"
          ref={area}
          className="writing-area"
          lang="fr"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris ici…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="sentences"
          readOnly={loading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className="writing-editor__bar">
          <AccentBar inputRef={area} onInsert={setText} disabled={loading} />
          <span className={`small tnum ${counterClass}`} aria-live="polite">
            {words} word{words === 1 ? '' : 's'}
            {kind === 'prompt' && <span className="subtle"> · aim for {min}–{max}</span>}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14 }}>
          <Callout kind="warn">{error}</Callout>
        </div>
      )}

      {!apiKey && (
        <section className="card stack" style={{ marginTop: 16 }}>
          <div className="card__title">Add your Claude API key to get feedback</div>
          <ApiKeySetup compact />
        </section>
      )}

      <div className="writing-submit">
        {loading ? (
          <>
            <div className="writing-loading" role="status">
              <LoaderCircle size={18} className="spin" aria-hidden />
              Claude is reading your text…
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="subtle small">
              <Sparkles size={14} aria-hidden style={{ verticalAlign: '-2px' }} /> Corrections explain every change
            </span>
            <button type="button" className="btn btn--primary btn--lg" onClick={submit} disabled={!canSubmit}>
              <Send size={17} aria-hidden /> Get feedback <Kbd>⌘↵</Kbd>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
