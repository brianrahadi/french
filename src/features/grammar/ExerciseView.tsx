import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, Text, TextInput } from '@mantine/core'
import type { Exercise } from '../../data/types'
import { AccentBar } from '../../components/AccentBar'
import { Choices } from '../../components/Choices'
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
    <Box>
      <Text size="xs" c="dimmed" fw={650} tt="uppercase" lts="0.05em" mb={14}>
        {KICKER[ex.type]}
      </Text>
      {ex.type === 'cloze' && <Cloze {...props} ex={ex} />}
      {ex.type === 'mcq' && <Mcq {...props} ex={ex} />}
      {ex.type === 'order' && <Order {...props} ex={ex} />}
      {(ex.type === 'translate' || ex.type === 'transform') && <FreeText {...props} ex={ex} />}
    </Box>
  )
}

/** The question line (English prompt or instruction). */
function Prompt({ children, fz = 20 }: { children: ReactNode; fz?: number }) {
  return (
    <Text component="div" fz={fz} fw={620} lh={1.35} lts="-0.01em">
      {children}
    </Text>
  )
}

/** The French sentence being worked on. */
function Sentence({ children }: { children: ReactNode }) {
  return (
    <Text component="div" className="fr" lang="fr" mt={18} fz={{ base: 22, sm: 27 }} lh={1.55}>
      {children}
    </Text>
  )
}

const VERDICT_COLOR = { correct: 'green', almost: 'orange', wrong: 'red' } as const

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
      <Sentence>
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
        {ex.hint && (
          <Text span ff="text" fz="0.7em" fs="italic" c="dimmed">
            {' '}
            ({ex.hint})
          </Text>
        )}
      </Sentence>
      {ex.en && (
        <Text mt={10} fz={15} c="dimmed">
          {ex.en}
        </Text>
      )}
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
      <Prompt>
        <Rich text={ex.prompt} />
      </Prompt>
      {ex.sentence && <Sentence>{frTypo(ex.sentence)}</Sentence>}
      {/* Picking an option answers at once, so arrow keys must not move the radio selection. */}
      <Box
        mt={26}
        onKeyDownCapture={(e) => {
          if (e.key.startsWith('Arrow')) e.stopPropagation()
        }}
      >
        <Choices
          options={ex.options.map((o) => frTypo(o))}
          value={chosen < 0 ? undefined : chosen}
          onChange={(i) => !graded && onSubmit(String(i))}
          label="Answer options"
          columns={1}
          status={graded ? (i) => (i === ex.answer ? 'right' : i === chosen ? 'wrong' : undefined) : undefined}
          fr
        />
      </Box>
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
      <Prompt>{ex.en}</Prompt>
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
        <Text size="sm" c="dimmed" ta="center" mt={16}>
          Tap words in order. Tap a placed word to remove it<span className="kbd-hint"> · Backspace undoes</span>.
        </Text>
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
  const color = graded ? VERDICT_COLOR[graded.verdict === 'correct' ? 'correct' : graded.verdict === 'almost' ? 'almost' : 'wrong'] : undefined
  return (
    <>
      {ex.type === 'translate' ? (
        <Prompt fz={22}>{ex.en}</Prompt>
      ) : (
        <>
          <Prompt>
            <Rich text={ex.instruction} />
          </Prompt>
          <Sentence>{frTypo(ex.source)}</Sentence>
        </>
      )}
      <Box mt={24}>
        <TextInput
          ref={ref}
          size="lg"
          radius="md"
          classNames={{ input: 'fr' }}
          styles={
            color
              ? { input: { borderColor: `var(--mantine-color-${color}-filled)`, background: `var(--mantine-color-${color}-light)` } }
              : undefined
          }
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
      </Box>
    </>
  )
}
