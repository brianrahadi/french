import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '../../data/types'
import { AccentBar } from '../../components/AccentBar'
import { Rich } from '../../components/ui'
import { useHotkeys } from '../../lib/hooks'
import type { Graded } from './grade'
import { frTypo } from '../../lib/words'

const KICKER: Record<Exercise['type'], string> = {
  cloze: 'Fill in the blank',
  mcq: 'Choose the answer',
  order: 'Build the sentence',
  translate: 'Translate into French',
  transform: 'Rewrite the sentence',
}

interface Props {
  ex: Exercise
  value: string
  setValue: (v: string) => void
  graded: Graded | null
  onSubmit: (value?: string) => void
}

export function ExerciseView(props: Props) {
  const { ex } = props
  return (
    <div className="exercise">
      <div className="q-kicker">{KICKER[ex.type]}</div>
      {ex.type === 'cloze' && <Cloze {...props} ex={ex} />}
      {ex.type === 'mcq' && <Mcq {...props} ex={ex} />}
      {ex.type === 'order' && <Order {...props} ex={ex} />}
      {(ex.type === 'translate' || ex.type === 'transform') && <FreeText {...props} ex={ex} />}
    </div>
  )
}

function verdictClass(prefix: string, graded: Graded | null) {
  if (!graded) return ''
  return ` ${prefix}--${graded.verdict === 'correct' ? 'correct' : graded.verdict === 'almost' ? 'almost' : 'wrong'}`
}

function Cloze({ ex, value, setValue, graded, onSubmit }: Props & { ex: Extract<Exercise, { type: 'cloze' }> }) {
  const ref = useRef<HTMLInputElement>(null)
  const [before, after] = ex.sentence.split('___')
  const size = Math.max(6, value.length + 1)
  return (
    <>
      <div className="q-sentence" lang="fr">
        {frTypo(before)}
        <input
          ref={ref}
          className={`blank${verdictClass('blank', graded)}`}
          value={value}
          size={size}
          autoFocus
          readOnly={!!graded}
          aria-label={`Missing word${ex.hint ? ` (hint: ${ex.hint})` : ''}`}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !graded) {
              e.preventDefault()
              if (value.trim()) onSubmit()
            }
          }}
        />
        {frTypo(after)}
        {ex.hint && <span className="q-hint"> ({ex.hint})</span>}
      </div>
      {ex.en && <p className="q-translation">{ex.en}</p>}
      {!graded && <AccentBar inputRef={ref} onInsert={setValue} />}
    </>
  )
}

function Mcq({ ex, value, graded, onSubmit }: Props & { ex: Extract<Exercise, { type: 'mcq' }> }) {
  const chosen = value === '' ? -1 : Number(value)
  useHotkeys(
    Object.fromEntries(ex.options.map((_, i) => [String(i + 1), () => !graded && onSubmit(String(i))])),
    { enabled: !graded },
  )
  return (
    <>
      <div className="q-prompt">
        <Rich text={ex.prompt} />
      </div>
      {ex.sentence && (
        <div className="q-sentence" lang="fr">
          {frTypo(ex.sentence)}
        </div>
      )}
      <div className="options" role="group" aria-label="Answer options">
        {ex.options.map((o, i) => {
          let cls = 'option'
          if (graded) {
            if (i === ex.answer) cls += ' option--correct'
            else if (i === chosen) cls += ' option--wrong'
            else cls += ' option--dim'
          }
          return (
            <button key={i} type="button" className={cls} disabled={!!graded} onClick={() => onSubmit(String(i))}>
              <span className="option__key" aria-hidden>
                {i + 1}
              </span>
              <span>{frTypo(o)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Order({ ex, setValue, graded, onSubmit }: Props & { ex: Extract<Exercise, { type: 'order' }> }) {
  const bank = useMemo(() => {
    const tiles = [...ex.words, ...(ex.extra ?? [])].map((text, id) => ({ id, text }))
    let s = shuffle(tiles)
    // Make sure the shuffled order isn't already the answer.
    for (let k = 0; k < 5 && s.slice(0, ex.words.length).map((t) => t.text).join(' ') === ex.words.join(' '); k++) s = shuffle(tiles)
    return s
  }, [ex])
  const [picked, setPicked] = useState<number[]>([])

  useEffect(() => {
    setValue(picked.map((id) => bank.find((t) => t.id === id)!.text).join(' '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  useHotkeys(
    {
      Enter: () => picked.length && onSubmit(),
      Backspace: () => setPicked((p) => p.slice(0, -1)),
    },
    { enabled: !graded },
  )

  return (
    <>
      <div className="q-prompt">{ex.en}</div>
      <div
        className={`tile-line${graded ? (graded.pass ? ' tile-line--correct' : ' tile-line--wrong') : ''}`}
        aria-label="Your sentence"
        aria-live="polite"
      >
        {picked.map((id, i) => {
          const t = bank.find((x) => x.id === id)!
          return (
            <button
              key={id}
              type="button"
              className="tile"
              lang="fr"
              disabled={!!graded}
              onClick={() => setPicked((p) => p.filter((x) => x !== id))}
              aria-label={`Remove ${t.text}`}
            >
              {frTypo(t.text)}
              {i === picked.length - 1 && ex.punct && graded ? ex.punct : ''}
            </button>
          )
        })}
      </div>
      <div className="tile-bank" aria-label="Word tiles">
        {bank.map((t) => {
          const used = picked.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              lang="fr"
              className={`tile${used ? ' tile--used' : ''}`}
              disabled={used || !!graded}
              aria-hidden={used}
              onClick={() => setPicked((p) => [...p, t.id])}
            >
              {frTypo(t.text)}
            </button>
          )
        })}
      </div>
      {!graded && (
        <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
          Tap words in order. Tap a placed word to remove it<span className="kbd-hint"> · Backspace undoes</span>.
        </p>
      )}
    </>
  )
}

function FreeText({
  ex,
  value,
  setValue,
  graded,
  onSubmit,
}: Props & { ex: Extract<Exercise, { type: 'translate' | 'transform' }> }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      {ex.type === 'translate' ? (
        <div className="q-prompt" style={{ fontSize: 22 }}>
          {ex.en}
        </div>
      ) : (
        <>
          <div className="q-prompt">
            <Rich text={ex.instruction} />
          </div>
          <div className="q-sentence" lang="fr">
            {frTypo(ex.source)}
          </div>
        </>
      )}
      <div style={{ marginTop: 24 }}>
        <input
          ref={ref}
          className={`answer-input${verdictClass('answer-input', graded)}`}
          value={value}
          lang="fr"
          autoFocus
          readOnly={!!graded}
          placeholder="Type in French…"
          aria-label="Your answer in French"
          autoCapitalize="sentences"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !graded) {
              e.preventDefault()
              if (value.trim()) onSubmit()
            }
          }}
        />
        {!graded && <AccentBar inputRef={ref} onInsert={setValue} />}
      </div>
    </>
  )
}
