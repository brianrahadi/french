import { useState } from 'react'
import { Check, EyeOff, X } from 'lucide-react'
import { GenderTag, ProgressBar } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { displayFr, frTypo, speakText } from '../../lib/words'
import { dirsFor, wordStatus } from '../vocab/selectors'
import type { TextWord } from './textVocab'

const PAGE = 25

/** The sentence with the word's form in bold, shortened around it. */
function Context({ t }: { t: TextWord }) {
  const i = t.sentence.indexOf(t.form)
  if (i < 0) return <>{frTypo(t.sentence)}</>
  const before = t.sentence.slice(0, i)
  const after = t.sentence.slice(i + t.form.length)
  const cut = (s: string, end: boolean) => {
    const words = s.split(' ')
    if (words.length <= 7) return s
    return end ? words.slice(0, 7).join(' ') + '…' : '…' + words.slice(-7).join(' ')
  }
  return (
    <>
      {frTypo(cut(before, false))}
      <strong>{frTypo(t.form)}</strong>
      {frTypo(cut(after, true))}
    </>
  )
}

/**
 * After reading: every vocabulary-bank word from the text, rarest first. The
 * learner says whether they recognised each one, and the answers go into
 * spaced repetition (see checkWords in the store).
 */
export function WordCheck({ words, onDone }: { words: TextWord[]; onDone: () => void }) {
  const checkWords = useStore((s) => s.checkWords)
  const ignoreWord = useStore((s) => s.ignoreWord)
  const directions = useStore((s) => s.settings.directions)
  const cards = useStore((s) => s.cards)
  // Fixed when the check opens, so answering doesn't reshuffle the list.
  const [items, setItems] = useState(() => [...words].sort((a, b) => b.rank - a.rank))
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState(PAGE)

  const answered = items.filter((t) => t.word.id in answers).length
  const unanswered = items.length - answered

  const answer = (id: string, known: boolean) => setAnswers((a) => ({ ...a, [id]: known }))
  const hide = (id: string) => {
    ignoreWord(id)
    setItems((list) => list.filter((t) => t.word.id !== id))
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== id)))
  }
  const knowTheRest = () =>
    setAnswers((a) => {
      const next = { ...a }
      for (const t of items) if (!(t.word.id in next)) next[t.word.id] = true
      return next
    })

  const save = () => {
    const results = items.filter((t) => t.word.id in answers).map((t) => ({ wordId: t.word.id, known: answers[t.word.id] }))
    if (results.length) {
      checkWords(results, dirsFor(directions))
      const unknown = results.filter((r) => !r.known).length
      toast(
        unknown
          ? `${results.length - unknown} known · ${unknown} to learn — they’re in your reviews`
          : `${results.length} word${results.length > 1 ? 's' : ''} marked as known`,
      )
    }
    onDone()
  }

  return (
    <section className="reader-foot reader-check card" aria-labelledby="check-title">
      <div className="reader-check__head">
        <div style={{ minWidth: 0 }}>
          <div className="card__title" id="check-title">
            {items.length} word{items.length === 1 ? '' : 's'} from your vocabulary
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Did you recognise them? Words you know are scheduled for later; the others start learning today. The meaning
            shows once you answer.
          </p>
        </div>
        <div className="reader-check__progress">
          <ProgressBar value={items.length ? answered / items.length : 0} label={`${answered} of ${items.length} checked`} thin />
          <span className="subtle small tnum">
            {answered}/{items.length}
          </span>
        </div>
      </div>

      <ul className="list word-list reader-check__list">
        {items.slice(0, shown).map((t) => {
          const w = t.word
          const a = answers[w.id]
          const done = a !== undefined
          const inReviews = wordStatus(w.id, cards) !== 'new'
          return (
            <li key={w.id} className={`reader-check__row${done ? (a ? ' is-known' : ' is-unknown') : ''}`}>
              <SpeakButton text={speakText(w)} size="sm" />
              <div className="reader-check__word">
                <div className="fr" lang="fr">
                  <span className="reader-check__fr">{frTypo(displayFr(w))}</span>{' '}
                  {w.pos === 'n' && w.g && !w.both && <GenderTag g={w.g} />}
                  {inReviews && <span className="badge" style={{ marginLeft: 6 }}>in reviews</span>}
                </div>
                <div className="reader-check__context fr small subtle" lang="fr">
                  <Context t={t} />
                </div>
                <div className="reader-check__en small">{done ? w.en : ' '}</div>
              </div>
              <div className="reader-check__actions">
                <div className="segmented" role="group" aria-label={`Did you recognise ${w.fr}?`}>
                  <button type="button" aria-pressed={a === true} onClick={() => answer(w.id, true)}>
                    <Check size={14} aria-hidden /> Know
                  </button>
                  <button type="button" aria-pressed={a === false} onClick={() => answer(w.id, false)}>
                    <X size={14} aria-hidden /> Don’t know
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => hide(w.id)}
                  aria-label={`Never ask about ${w.fr}`}
                  title="Never ask about this word"
                >
                  <EyeOff size={15} aria-hidden />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {shown < items.length && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, items.length - shown)} more
        </button>
      )}

      <div className="reader-check__foot">
        <button type="button" className="btn btn--ghost" onClick={onDone}>
          Not now
        </button>
        <div className="spacer" />
        {unanswered > 0 && (
          <button type="button" className="btn btn--secondary" onClick={knowTheRest}>
            I know the other {unanswered}
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={save} disabled={!answered}>
          <Check size={16} aria-hidden /> Save {answered || ''} to my reviews
        </button>
      </div>
    </section>
  )
}
