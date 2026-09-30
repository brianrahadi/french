import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Sparkles, X } from 'lucide-react'
import { GenderTag } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { BUILTIN_WORDS } from '../../data/vocab'
import { useAiConfig } from '../../lib/ai'
import { lookupForms, readTokens, splitSentences } from '../../lib/french'
import { useStore } from '../../lib/store'
import { customWord, displayFr, frTypo, posLabel } from '../../lib/words'
import { dirsFor } from '../vocab/selectors'
import { cachedGloss, dictionaryLookup, glossInContext, key, verbFormLookup } from './lookup'
import type { Gloss } from './types'

interface Open {
  /** Which LookupText opened it — only one popup is open on the page at a time. */
  owner: string
  sentence: string
  /** Word tokens of the sentence. */
  words: string[]
  /** Selected range of word indexes (inclusive). */
  from: number
  to: number
  anchor: HTMLElement
}

const useOpen = create<{ open: Open | null; set: (o: Open | null) => void }>((set) => ({ open: null, set: (open) => set({ open }) }))

/** The set of words the learner is learning (custom words and started built-in words), as lookup keys. */
export function useLearningKeys(): Set<string> {
  const customWords = useStore((s) => s.customWords)
  const introduced = useStore((s) => s.introduced)
  return useMemo(() => {
    const out = new Set<string>()
    for (const w of customWords) out.add(key(w.fr))
    for (const w of BUILTIN_WORDS) if (introduced[w.id]) out.add(key(w.fr))
    return out
  }, [customWords, introduced])
}

/**
 * Text where every word can be tapped to see what it means in its sentence and
 * be added to flashcards. Phrases can be selected by extending the selection.
 */
export function LookupText({
  text,
  source,
  activeSentence,
  sentenceOffset = 0,
  className,
}: {
  text: string
  /** Stored on added words, e.g. 'text:<id>'. */
  source?: string
  /** Index (with sentenceOffset) of a sentence to highlight, e.g. while reading aloud. */
  activeSentence?: number
  sentenceOffset?: number
  className?: string
}) {
  const owner = useId()
  const current = useOpen((s) => s.open)
  const setOpen = useOpen((s) => s.set)
  const open = current?.owner === owner ? current : null
  const learning = useLearningKeys()
  // Close this text's popup when it unmounts.
  useEffect(() => () => {
    if (useOpen.getState().open?.owner === owner) useOpen.getState().set(null)
  }, [owner])
  const sentences = useMemo(() => splitSentences(text).map((s) => ({ text: s, tokens: readTokens(s) })), [text])

  return (
    <span className={className}>
      {sentences.map((s, si) => {
        const words = s.tokens.filter((t) => t.word).map((t) => t.text)
        let wi = -1
        const isActive = activeSentence === si + sentenceOffset
        return (
          <span key={si} className={`rd-sentence${isActive ? ' rd-sentence--active' : ''}`}>
            {s.tokens.map((t, ti) => {
              if (!t.word) return <span key={ti}>{frTypo(t.text)}</span>
              wi++
              const idx = wi
              const selected = open && open.sentence === s.text && idx >= open.from && idx <= open.to
              const known = lookupForms(t.text).some((f) => learning.has(f))
              return (
                <button
                  key={ti}
                  type="button"
                  className={`lk-word${known ? ' lk-word--learning' : ''}${selected ? ' lk-word--selected' : ''}`}
                  onClick={(e) => setOpen({ owner, sentence: s.text, words, from: idx, to: idx, anchor: e.currentTarget })}
                >
                  {frTypo(t.text)}
                </button>
              )
            })}
            {si < sentences.length - 1 ? ' ' : ''}
          </span>
        )
      })}
      {open && (
        <LookupPopover
          open={open}
          source={source}
          onClose={() => setOpen(null)}
          onExtend={(from, to) => setOpen({ ...open, from, to })}
        />
      )}
    </span>
  )
}

function LookupPopover({
  open,
  source,
  onClose,
  onExtend,
}: {
  open: Open
  source?: string
  onClose: () => void
  onExtend: (from: number, to: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)

  useLayoutEffect(() => {
    const place = () => {
      setMobile(window.matchMedia('(max-width: 640px)').matches)
      const a = open.anchor.getBoundingClientRect()
      const h = ref.current?.offsetHeight ?? 260
      const w = Math.min(360, window.innerWidth - 24)
      const above = a.bottom + h + 12 > window.innerHeight && a.top - h - 12 > 0
      const left = Math.max(12, Math.min(a.left + a.width / 2 - w / 2, window.innerWidth - w - 12))
      setPos({ top: above ? a.top - h - 8 : a.bottom + 8, left, above })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const ro = new ResizeObserver(place)
    if (ref.current) ro.observe(ref.current)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      ro.disconnect()
    }
  }, [open.anchor, open.from, open.to])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || open.anchor.contains(t)) return
      if ((t as HTMLElement).closest?.('.lk-word')) return // another word: the click opens it
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose, open.anchor])

  const phrase = open.words.slice(open.from, open.to + 1).join(' ')

  return createPortal(
    <>
      {mobile && <div className="lk-scrim" onClick={onClose} aria-hidden />}
      <div
        ref={ref}
        className={`lk-pop${mobile ? ' lk-pop--sheet' : ''}`}
        role="dialog"
        aria-label={`Meaning of ${phrase}`}
        style={mobile || !pos ? undefined : { top: pos.top, left: pos.left }}
      >
        <WordCard
          key={`${open.sentence}|${open.from}|${open.to}`}
          phrase={phrase}
          sentence={open.sentence}
          source={source}
          canLeft={open.from > 0}
          canRight={open.to < open.words.length - 1}
          onLeft={() => onExtend(open.from - 1, open.to)}
          onRight={() => onExtend(open.from, open.to + 1)}
          onShrink={open.to > open.from ? () => onExtend(open.from, open.from) : undefined}
          onClose={onClose}
        />
      </div>
    </>,
    document.body,
  )
}

function WordCard({
  phrase,
  sentence,
  source,
  canLeft,
  canRight,
  onLeft,
  onRight,
  onShrink,
  onClose,
}: {
  phrase: string
  sentence: string
  source?: string
  canLeft: boolean
  canRight: boolean
  onLeft: () => void
  onRight: () => void
  onShrink?: () => void
  onClose: () => void
}) {
  const ai = useAiConfig()
  const customWords = useStore((s) => s.customWords)
  const introduced = useStore((s) => s.introduced)
  const directions = useStore((s) => s.settings.directions)
  const addCustomWords = useStore((s) => s.addCustomWords)
  const introduceWord = useStore((s) => s.introduceWord)
  const single = !phrase.includes(' ')
  const dict = useMemo(() => (single ? dictionaryLookup(phrase, customWords) : []), [single, phrase, customWords])
  const forms = useMemo(() => (single ? verbFormLookup(phrase, customWords) : []), [single, phrase, customWords])
  const [gloss, setGloss] = useState<Gloss | null>(() => cachedGloss(phrase, sentence) ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meaning, setMeaning] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!ai || gloss) return
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    glossInContext(phrase, sentence, ai, ctrl.signal)
      .then(setGloss)
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Lookup failed.')
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai, phrase, sentence, attempt])

  const builtin = dict.find((w) => !w.custom)
  const custom = dict.find((w) => w.custom)
  const lemma = gloss?.lemma || (builtin ? displayFr(builtin) : phrase)
  const lemmaKey = key(lemma)
  const alreadyCustom = custom ?? customWords.find((w) => key(w.fr) === lemmaKey)
  const alreadyBuiltin = builtin && introduced[builtin.id] && (!gloss || key(builtin.fr) === lemmaKey || key(displayFr(builtin)) === lemmaKey)
  const inDeck = !!alreadyCustom || !!alreadyBuiltin
  const useBuiltin = builtin && !introduced[builtin.id] && (!gloss || key(builtin.fr) === lemmaKey || key(displayFr(builtin)) === lemmaKey)
  const en = gloss?.meaning || meaning.trim() || builtin?.en || ''

  const add = () => {
    if (useBuiltin && builtin) {
      introduceWord(builtin.id, dirsFor(directions))
      toast(`Added “${displayFr(builtin)}” to your flashcards`)
      return
    }
    if (!en) return
    const g = gloss?.gender || undefined
    const w = customWord(lemma, en, sentence, g === 'm' || g === 'f' ? g : undefined)
    if (gloss?.sentenceTranslation) w.exEn = gloss.sentenceTranslation
    if (source) w.from = source
    addCustomWords([w])
    toast(`Added “${lemma}” to your flashcards`)
  }

  return (
    <div className="lk-card">
      <div className="lk-card__head">
        <SpeakButton text={phrase} size="sm" />
        <span className="lk-card__word fr" lang="fr">
          {frTypo(phrase)}
        </span>
        <div className="spacer" />
        <div className="lk-card__extend" role="group" aria-label="Select a phrase">
          <button type="button" className="icon-btn icon-btn--sm" onClick={onLeft} disabled={!canLeft} aria-label="Include the previous word" title="Include the previous word">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" onClick={onRight} disabled={!canRight} aria-label="Include the next word" title="Include the next word">
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
        <button type="button" className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Close">
          <X size={16} aria-hidden />
        </button>
      </div>

      {(gloss || loading || error) && (
        <div className="lk-card__ai" aria-live="polite">
          {gloss ? (
            <>
              <div className="lk-card__meaning">{gloss.meaning || '—'}</div>
              <div className="lk-card__lemma">
                <span className="fr" lang="fr">
                  {frTypo(gloss.lemma)}
                </span>
                <span className="subtle">· {gloss.pos}</span>
                {gloss.gender && <GenderTag g={gloss.gender} />}
              </div>
              {gloss.note && <p className="lk-card__note">{gloss.note}</p>}
            </>
          ) : loading ? (
            <div className="lk-card__loading">
              <LoaderCircle size={15} className="spin" aria-hidden /> Meaning in this sentence…
            </div>
          ) : (
            <p className="small text-danger">
              {error}{' '}
              <button type="button" className="link-btn" onClick={() => setAttempt((a) => a + 1)}>
                Retry
              </button>
            </p>
          )}
        </div>
      )}

      {(builtin || forms.length > 0) && (
        <div className="lk-card__dict">
          {builtin && (
            <div>
              <span className="fr" lang="fr">
                {frTypo(displayFr(builtin))}
              </span>{' '}
              <span className="subtle small">{posLabel(builtin)}</span>{' '}
              {builtin.g && !builtin.both && <GenderTag g={builtin.g} />} <span className="muted">— {builtin.en}</span>
            </div>
          )}
          {forms.slice(0, 2).map((f) => (
            <div key={f.inf + f.label} className="small muted">
              Form of{' '}
              <Link to={`/verbs/${encodeURIComponent(f.inf)}`} className="fr" lang="fr">
                {f.inf}
              </Link>{' '}
              ({f.en}) · {f.label}
            </div>
          ))}
        </div>
      )}

      {!ai && !builtin && !gloss && (
        <p className="small muted" style={{ margin: '4px 0 8px' }}>
          <Sparkles size={14} aria-hidden style={{ verticalAlign: '-2px' }} /> <Link to="/settings#ai">Connect an AI</Link> to see
          meanings in context.
        </p>
      )}

      {gloss?.sentenceTranslation && (
        <p className="lk-card__sentence">
          <span className="subtle">Sentence:</span> {gloss.sentenceTranslation}
        </p>
      )}

      <div className="lk-card__actions">
        {inDeck ? (
          <span className="badge badge--success">
            <Check size={12} aria-hidden /> In your flashcards
          </span>
        ) : (
          <>
            {!useBuiltin && !gloss?.meaning && !builtin && (
              <input
                className="input input--sm"
                placeholder="Meaning in English"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && en && add()}
                aria-label="Meaning in English"
              />
            )}
            <button type="button" className="btn btn--primary btn--sm" onClick={add} disabled={!useBuiltin && !en}>
              <Plus size={15} aria-hidden /> {useBuiltin ? 'Learn this word' : 'Add to flashcards'}
            </button>
          </>
        )}
        {onShrink && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onShrink}>
            Just the first word
          </button>
        )}
      </div>
    </div>
  )
}
