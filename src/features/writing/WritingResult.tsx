import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, PencilLine, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { LESSON_BY_ID } from '../../data/grammar'
import { findWord } from '../../data/vocab'
import { Dialog } from '../../components/Dialog'
import { Empty, Ring } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { useStore, type WritingEntry } from '../../lib/store'
import { segmentText } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { customWord, frTypo } from '../../lib/words'
import { scoreClass } from './WritingHome'

type View = 'marked' | 'corrected' | 'improved'

export default function WritingResult() {
  const { id = '' } = useParams()
  const entry = useStore((s) => s.writings.find((w) => w.id === id))
  const writings = useStore((s) => s.writings)
  useDocumentTitle(entry ? `Feedback · ${entry.title}` : 'Feedback')

  if (!entry) {
    return (
      <div className="page">
        <Link to="/writing" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Writing
        </Link>
        <Empty icon={<PencilLine size={30} />} title="This text isn’t here any more">
          It may have been deleted. <Link to="/writing">Write something new</Link>
        </Empty>
      </div>
    )
  }
  const before = entry.revisionOf ? writings.find((w) => w.id === entry.revisionOf) : undefined
  return <Result entry={entry} before={before} />
}

function Result({ entry, before }: { entry: WritingEntry; before?: WritingEntry }) {
  const navigate = useNavigate()
  const deleteWriting = useStore((s) => s.deleteWriting)
  const addCustomWords = useStore((s) => s.addCustomWords)
  const customWords = useStore((s) => s.customWords)
  const [view, setView] = useState<View>('marked')
  const [active, setActive] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fb = entry.feedback
  const { segments, located } = useMemo(() => segmentText(entry.text, fb.errors), [entry.text, fb.errors])

  const vocab = fb.vocabulary.map((v) => {
    const w = customWord(v.fr, v.en)
    return { ...v, word: w, added: !!findWord(w.id, customWords) }
  })

  const focusError = (i: number) => {
    setActive(i)
    document.getElementById(`err-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied')
    } catch {
      toast('Couldn’t copy')
    }
  }

  const shownText = view === 'corrected' ? fb.corrected : view === 'improved' ? fb.improved : entry.text

  return (
    <div className="page page--narrow">
      <Link to="/writing" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Writing
      </Link>

      <header className="result-head">
        <Ring value={fb.score / 100} size={84} stroke={8} label={`Score ${fb.score} out of 100`}>
          <span className="tnum">{fb.score}</span>
        </Ring>
        <div style={{ minWidth: 0 }}>
          <div className="page-eyebrow" style={{ marginBottom: 2 }}>
            {new Date(entry.createdAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
            {entry.words} words
            {fb.level && <> · reads like {fb.level}</>}
          </div>
          <h1 className="page-title" style={{ fontSize: 'clamp(24px, 3.4vw, 30px)' }} lang="fr">
            {entry.title}
          </h1>
          {before && (
            <p className="small muted" style={{ marginTop: 4 }}>
              Rewrite · score{' '}
              <span className={`badge ${scoreClass(before.feedback.score)} tnum`}>{before.feedback.score}</span> →{' '}
              <span className={`badge ${scoreClass(fb.score)} tnum`}>{fb.score}</span>{' '}
              <Link to={`/writing/${before.id}`}>see first version</Link>
            </p>
          )}
        </div>
      </header>

      {fb.summary && <p className="result-summary">{fb.summary}</p>}

      <section className="card result-text" aria-label="Your text">
        <div className="result-text__bar">
          <div className="segmented" role="tablist" aria-label="Version">
            {(
              [
                ['marked', `Corrections${fb.errors.length ? ` (${fb.errors.length})` : ''}`],
                ['corrected', 'Corrected'],
                ['improved', 'More natural'],
              ] as [View, string][]
            ).map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 2 }}>
            <SpeakButton text={view === 'marked' ? fb.corrected : shownText} size="sm" label="Listen to the corrected text" />
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => copy(view === 'marked' ? fb.corrected : shownText)} aria-label="Copy text" title="Copy">
              <Copy size={15} aria-hidden />
            </button>
          </div>
        </div>
        <div className="result-text__body fr" lang="fr">
          {view === 'marked'
            ? segments.map((s, i) =>
                s.error === undefined ? (
                  <span key={i}>{frTypo(s.text)}</span>
                ) : (
                  <button
                    key={i}
                    type="button"
                    className={`mark${active === s.error ? ' mark--active' : ''}`}
                    onClick={() => focusError(s.error!)}
                    aria-label={`Correction ${s.error + 1}: ${s.text} → ${fb.errors[s.error].correction}`}
                  >
                    <del>{frTypo(s.text)}</del>
                    {fb.errors[s.error].correction && <ins>{frTypo(fb.errors[s.error].correction)}</ins>}
                    <sup>{s.error + 1}</sup>
                  </button>
                ),
              )
            : frTypo(shownText)}
        </div>
      </section>

      <section className="section" aria-labelledby="fixes-title">
        <h2 id="fixes-title" className="section-title">
          <span>What to fix</span>
          <span className="tnum">{fb.errors.length}</span>
        </h2>
        {fb.errors.length === 0 ? (
          <div className="card">
            <Empty icon={<CheckCircle2 size={32} color="var(--success)" />} title="Aucune faute — no mistakes found!">
              Look at the “More natural” version for ways to sound even more fluent.
            </Empty>
          </div>
        ) : (
          <ol className="fix-list">
            {fb.errors.map((e, i) => {
              const lesson = e.lesson ? LESSON_BY_ID[e.lesson] : undefined
              return (
                <li
                  key={i}
                  id={`err-${i}`}
                  className={`fix${active === i ? ' fix--active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="fix__n tnum" aria-hidden>
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fix__change fr" lang="fr">
                      <del>{frTypo(e.original)}</del>
                      <ArrowRight size={15} aria-hidden className="subtle" />
                      <ins>{frTypo(e.correction) || '(remove)'}</ins>
                      <span className="badge fix__cat">{e.category}</span>
                    </div>
                    <p className="fix__why">{e.explanation}</p>
                    {lesson && (
                      <Link to={`/grammar/${lesson.id}`} className="fix__lesson">
                        Review: {lesson.title} <ArrowRight size={14} aria-hidden />
                      </Link>
                    )}
                    {!located.has(i) && <p className="hint">(couldn’t pinpoint this one in your text)</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="grid-2 section" style={{ alignItems: 'start' }}>
        {fb.strengths.length > 0 && (
          <section className="card" aria-labelledby="strengths-title">
            <h2 id="strengths-title" className="card__title" style={{ marginBottom: 10 }}>
              What went well
            </h2>
            <ul className="strengths">
              {fb.strengths.map((s, i) => (
                <li key={i}>
                  <Check size={16} aria-hidden />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {vocab.length > 0 && (
          <section className="card" aria-labelledby="vocab-title">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 id="vocab-title" className="card__title">
                Words to keep
              </h2>
              {vocab.some((v) => !v.added) && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    const fresh = vocab.filter((v) => !v.added).map((v) => v.word)
                    addCustomWords(fresh)
                    toast(`Added ${fresh.length} word${fresh.length > 1 ? 's' : ''} to your flashcards`)
                  }}
                >
                  <Plus size={15} aria-hidden /> Add all
                </button>
              )}
            </div>
            <ul className="keep-list">
              {vocab.map((v) => (
                <li key={v.word.id}>
                  <SpeakButton text={v.word.fr} size="sm" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fr" lang="fr">
                      {frTypo(v.fr)}
                    </div>
                    <div className="muted small">{v.en}</div>
                  </div>
                  {v.added ? (
                    <span className="badge badge--success">
                      <Check size={12} aria-hidden /> added
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm icon-btn--outline"
                      aria-label={`Add ${v.fr} to flashcards`}
                      title="Add to flashcards"
                      onClick={() => {
                        addCustomWords([v.word])
                        toast(`Added “${v.fr}”`)
                      }}
                    >
                      <Plus size={15} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="result-actions">
        <button type="button" className="btn btn--ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} aria-hidden /> Delete
        </button>
        <div className="spacer" />
        <Link to="/writing" className="btn btn--secondary">
          New text
        </Link>
        {fb.errors.length > 0 && (
          <Link to={`/writing/new?rewrite=${entry.id}`} className="btn btn--primary">
            <RotateCcw size={16} aria-hidden /> Rewrite it yourself
          </Link>
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this text?"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)} autoFocus>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                deleteWriting(entry.id)
                navigate('/writing', { replace: true })
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="muted">The text and its feedback will be removed from this browser.</p>
      </Dialog>
    </div>
  )
}
