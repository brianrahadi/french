import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, BookOpenText, Check, Languages, LoaderCircle, Pause, Play, Square } from 'lucide-react'
import { TEXT_BY_ID } from '../../data/texts'
import type { Level } from '../../data/types'
import { Callout, Empty, LevelBadge } from '../../components/ui'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { countWords } from '../../lib/ai/writing'
import { useDocumentTitle } from '../../lib/hooks'
import { paragraphs as splitParagraphs, splitSentences } from '../../lib/french'
import { speak, speechSupported, stopSpeaking } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { LookupText } from './LookupText'
import { translateParagraphs } from './ai'

interface Doc {
  id: string
  title: string
  subtitle?: string
  level?: Level
  paragraphs: string[]
  translation?: string[]
  builtin: boolean
}

const SIZES = [
  { id: 's', label: 'A', size: 18 },
  { id: 'm', label: 'A', size: 21 },
  { id: 'l', label: 'A', size: 25 },
]

function readPref(): number {
  try {
    return Number(localStorage.getItem('petit-a-petit-reader-size') ?? 1) || 1
  } catch {
    return 1
  }
}

export default function ReaderPage() {
  const { id = '' } = useParams()
  const userText = useStore((s) => s.texts.find((t) => t.id === id))
  const builtin = TEXT_BY_ID[id]
  const doc: Doc | null = useMemo(() => {
    if (builtin)
      return {
        id,
        title: builtin.title,
        subtitle: builtin.titleEn,
        level: builtin.level,
        paragraphs: builtin.paragraphs.map((p) => p.fr),
        translation: builtin.paragraphs.map((p) => p.en),
        builtin: true,
      }
    if (userText)
      return {
        id,
        title: userText.title,
        level: userText.level,
        paragraphs: splitParagraphs(userText.content),
        translation: userText.translation,
        builtin: false,
      }
    return null
  }, [builtin, userText, id])
  useDocumentTitle(doc ? doc.title : 'Reading')

  if (!doc)
    return (
      <div className="page">
        <Link to="/reading" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Reading
        </Link>
        <Empty icon={<BookOpenText size={30} />} title="This text isn’t here any more">
          It may have been deleted. <Link to="/reading">Back to your texts</Link>
        </Empty>
      </div>
    )
  return <Reader key={doc.id} doc={doc} />
}

function Reader({ doc }: { doc: Doc }) {
  const ai = useAiConfig()
  const updateText = useStore((s) => s.updateText)
  const markRead = useStore((s) => s.markRead)
  const read = useStore((s) => s.read[doc.id])
  const logActivityBulk = useStore((s) => s.logActivityBulk)
  const customWords = useStore((s) => s.customWords)
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const [showEn, setShowEn] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [size, setSize] = useState(readPref)
  const [playing, setPlaying] = useState<'playing' | 'paused' | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const playRef = useRef({ index: 0, stopped: true })

  useEffect(() => {
    if (!doc.builtin) updateText(doc.id, { openedAt: new Date().toISOString() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  // Sentences in reading order, with the index where each paragraph starts.
  const { sentences, offsets } = useMemo(() => {
    const all: string[] = []
    const offs: number[] = []
    for (const p of doc.paragraphs) {
      offs.push(all.length)
      all.push(...splitSentences(p))
    }
    return { sentences: all, offsets: offs }
  }, [doc.paragraphs])

  const words = useMemo(() => countWords(doc.paragraphs.join(' ')), [doc.paragraphs])
  const saved = customWords.filter((w) => w.from === `text:${doc.id}`)

  const toggleTranslation = async () => {
    if (showEn) return setShowEn(false)
    if (doc.translation?.length) return setShowEn(true)
    if (!ai) {
      setError('Connect an AI in Settings to translate your own texts.')
      return
    }
    setTranslating(true)
    setError('')
    try {
      const t = await translateParagraphs(doc.paragraphs, ai)
      updateText(doc.id, { translation: t })
      setShowEn(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed.')
    } finally {
      setTranslating(false)
    }
  }

  // ── read aloud, sentence by sentence, highlighting as it goes
  const sayFrom = (i: number) => {
    if (i >= sentences.length) {
      playRef.current.stopped = true
      setPlaying(null)
      setActive(null)
      return
    }
    playRef.current.index = i
    setActive(i)
    speak(sentences[i], {
      voiceURI,
      rate,
      onEnd: () => {
        if (playRef.current.stopped) return
        sayFrom(i + 1)
      },
    })
  }
  const play = () => {
    playRef.current.stopped = false
    setPlaying('playing')
    sayFrom(playing === 'paused' ? playRef.current.index : 0)
  }
  const pause = () => {
    playRef.current.stopped = true
    stopSpeaking()
    setPlaying('paused')
  }
  const stop = () => {
    playRef.current.stopped = true
    stopSpeaking()
    setPlaying(null)
    setActive(null)
  }
  useEffect(
    () => () => {
      playRef.current.stopped = true
      stopSpeaking()
    },
    [],
  )

  const setFont = (i: number) => {
    setSize(i)
    try {
      localStorage.setItem('petit-a-petit-reader-size', String(i))
    } catch {
      /* ignore */
    }
  }

  const finish = () => {
    if (!read) logActivityBulk(Math.max(1, Math.round(words / 25)), Math.max(1, Math.round(words / 25)))
    markRead(doc.id)
    toast('Texte terminé — bravo !')
  }

  return (
    <div className="page page--reader">
      <Link to="/reading" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Reading
      </Link>
      <header className="reader-head">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          {doc.level && <LevelBadge level={doc.level} />}
          <span className="small subtle">
            {words} words · {Math.max(1, Math.round(words / 120))} min
          </span>
          {read && (
            <span className="badge badge--success">
              <Check size={12} aria-hidden /> read
            </span>
          )}
        </div>
        <h1 className="page-title fr" lang="fr">
          {frTypo(doc.title)}
        </h1>
        {doc.subtitle && <p className="muted">{doc.subtitle}</p>}
      </header>

      <div className="reader-bar" role="toolbar" aria-label="Reading tools">
        {speechSupported && (
          <div className="row" style={{ gap: 4 }}>
            {playing === 'playing' ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={pause}>
                <Pause size={15} aria-hidden /> Pause
              </button>
            ) : (
              <button type="button" className="btn btn--secondary btn--sm" onClick={play}>
                <Play size={15} aria-hidden /> {playing === 'paused' ? 'Resume' : 'Listen'}
              </button>
            )}
            {playing && (
              <button type="button" className="icon-btn icon-btn--sm" onClick={stop} aria-label="Stop reading">
                <Square size={14} aria-hidden />
              </button>
            )}
          </div>
        )}
        <button type="button" className="btn btn--secondary btn--sm" onClick={toggleTranslation} aria-pressed={showEn} disabled={translating}>
          {translating ? <LoaderCircle size={15} className="spin" aria-hidden /> : <Languages size={15} aria-hidden />}
          {showEn ? 'Hide translation' : 'Translation'}
        </button>
        <div className="spacer" />
        <div className="segmented reader-size" role="group" aria-label="Text size">
          {SIZES.map((s, i) => (
            <button key={s.id} type="button" aria-pressed={size === i} onClick={() => setFont(i)} style={{ fontSize: 11 + i * 3 }} aria-label={`Text size ${i + 1}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <Callout kind="warn">{error}</Callout>
        </div>
      )}

      <p className="hint reader-hint">Tap any word to see what it means here. Use ‹ › in the popup to select a whole expression.</p>

      <article className="reader-body fr" lang="fr" style={{ fontSize: SIZES[size].size }}>
        {doc.paragraphs.map((p, i) => (
          <div key={i} className="reader-para">
            <p>
              <LookupText text={p} source={`text:${doc.id}`} activeSentence={active ?? undefined} sentenceOffset={offsets[i]} />
            </p>
            {showEn && doc.translation?.[i] && (
              <p className="reader-en" lang="en">
                {doc.translation[i]}
              </p>
            )}
          </div>
        ))}
      </article>

      <footer className="reader-foot card">
        <div style={{ minWidth: 0 }}>
          <div className="card__title">{read ? 'Finished' : 'Done reading?'}</div>
          <p className="small muted">
            {saved.length
              ? `${saved.length} word${saved.length > 1 ? 's' : ''} from this text in your flashcards: ${saved
                  .slice(0, 6)
                  .map((w) => frTypo(w.fr))
                  .join(', ')}${saved.length > 6 ? '…' : ''}`
              : 'Tap words you don’t know to add them to your flashcards.'}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {saved.length > 0 && (
            <Link to="/vocab/study" className="btn btn--secondary">
              Study them
            </Link>
          )}
          <button type="button" className="btn btn--primary" onClick={finish}>
            <Check size={16} aria-hidden /> {read ? 'Read again' : 'Mark as read'}
          </button>
        </div>
      </footer>
    </div>
  )
}
