import { useState } from 'react'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Checkbox, Group, Loader, Text } from '@mantine/core'
import { Check, EyeOff, Languages, X } from 'lucide-react'
import { GenderTag, ProgressBar } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { displayFr, frTypo, speakText } from '../../lib/words'
import { useAiConfig } from '../../lib/ai'
import { dirsFor, wordStatus } from '../vocab/selectors'
import { fallbackTranslate, glossInContext } from './lookup'
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
      <Text component="strong" span inherit fw={700} c="bright">
        {frTypo(t.form)}
      </Text>
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
  // Translations: the word's meaning (from the dictionary) and its sentence (fetched on demand).
  const ai = useAiConfig()
  const [showAll, setShowAll] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [sentenceEn, setSentenceEn] = useState<Record<string, string | 'loading' | 'error'>>({})
  const translate = async (t: TextWord) => {
    const id = t.word.id
    setRevealed((r) => ({ ...r, [id]: true }))
    const cur = sentenceEn[id]
    if (cur && cur !== 'error') return
    setSentenceEn((m) => ({ ...m, [id]: 'loading' }))
    try {
      const en = ai ? (await glossInContext(t.form, t.sentence, ai)).sentenceTranslation : await fallbackTranslate(t.sentence)
      setSentenceEn((m) => ({ ...m, [id]: en || 'error' }))
    } catch {
      setSentenceEn((m) => ({ ...m, [id]: 'error' }))
    }
  }

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
    <Card component="section" mt={28} aria-labelledby="check-title">
      <Group justify="space-between" align="flex-end" gap={12} mb={12}>
        <Box miw={0} flex="1 1 320px">
          <Text fw={650} mb={2} id="check-title">
            {items.length} word{items.length === 1 ? '' : 's'} from your vocabulary
          </Text>
          <Text size="sm" c="dimmed">
            Did you recognise them? Words you know are scheduled for later; the others start learning today. The meaning
            shows once you answer, or tap <Languages size={13} aria-label="translate" style={{ verticalAlign: '-2px' }} /> to
            translate a word and its sentence.
          </Text>
          <Checkbox size="xs" mt={8} label="Show all meanings" checked={showAll} onChange={(e) => setShowAll(e.currentTarget.checked)} />
        </Box>
        <Group gap={8} miw={160} wrap="nowrap">
          <Box flex={1}>
            <ProgressBar value={items.length ? answered / items.length : 0} label={`${answered} of ${items.length} checked`} thin />
          </Box>
          <Text span size="sm" c="dimmed" className="tnum">
            {answered}/{items.length}
          </Text>
        </Group>
      </Group>

      <Card.Section component="ul" my={0} p={0} style={{ listStyle: 'none' }}>
        {items.slice(0, shown).map((t) => {
          const w = t.word
          const a = answers[w.id]
          const done = a !== undefined
          const inReviews = wordStatus(w.id, cards) !== 'new'
          return (
            <Group
              key={w.id}
              component="li"
              gap={12}
              px="lg"
              py={10}
              style={{
                borderTop: '1px solid var(--mantine-color-default-border)',
                borderLeft: `3px solid ${done ? (a ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-orange-6)') : 'transparent'}`,
              }}
            >
              <SpeakButton text={speakText(w)} size="sm" />
              <Box miw={0} flex="1 1 200px">
                <div className="fr" lang="fr">
                  <Text span fz={17}>
                    {frTypo(displayFr(w))}
                  </Text>{' '}
                  {w.pos === 'n' && w.g && !w.both && <GenderTag g={w.g} />}
                  {inReviews && (
                    <Badge size="sm" color="gray" ml={6}>
                      in reviews
                    </Badge>
                  )}
                </div>
                <Text size="sm" c="dimmed" truncate="end" className="fr" lang="fr">
                  <Context t={t} />
                </Text>
                <Text size="sm" c="dimmed" mih="1.4em">
                  {done || showAll || revealed[w.id] ? w.en : ' '}
                </Text>
                {revealed[w.id] && sentenceEn[w.id] && (
                  <Text size="sm" c="dimmed" fs="italic">
                    {sentenceEn[w.id] === 'loading' ? (
                      <>
                        <Loader size={12} aria-hidden /> Translating…
                      </>
                    ) : sentenceEn[w.id] === 'error' ? (
                      <>
                        Couldn’t translate the sentence.{' '}
                        <Anchor component="button" type="button" inherit onClick={() => translate(t)}>
                          Retry
                        </Anchor>
                      </>
                    ) : (
                      <>“{sentenceEn[w.id]}”</>
                    )}
                  </Text>
                )}
              </Box>
              <Group gap={4} ml="auto" wrap="nowrap">
                <ActionIcon
                  variant={revealed[w.id] ? 'light' : 'subtle'}
                  color={revealed[w.id] ? undefined : 'gray'}
                  onClick={() => translate(t)}
                  aria-pressed={!!revealed[w.id]}
                  aria-label={`Translate ${w.fr} and its sentence`}
                  title="Translate the word and its sentence"
                >
                  <Languages size={15} aria-hidden />
                </ActionIcon>
                <Button.Group aria-label={`Did you recognise ${w.fr}?`}>
                  <Button
                    size="xs"
                    variant={a === true ? 'filled' : 'default'}
                    color={a === true ? 'green' : undefined}
                    aria-pressed={a === true}
                    leftSection={<Check size={14} aria-hidden />}
                    onClick={() => answer(w.id, true)}
                  >
                    Know
                  </Button>
                  <Button
                    size="xs"
                    variant={a === false ? 'filled' : 'default'}
                    color={a === false ? 'orange' : undefined}
                    aria-pressed={a === false}
                    leftSection={<X size={14} aria-hidden />}
                    onClick={() => answer(w.id, false)}
                  >
                    Don’t know
                  </Button>
                </Button.Group>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => hide(w.id)}
                  aria-label={`Never ask about ${w.fr}`}
                  title="Never ask about this word"
                >
                  <EyeOff size={15} aria-hidden />
                </ActionIcon>
              </Group>
            </Group>
          )
        })}
      </Card.Section>
      {shown < items.length && (
        <Button variant="subtle" size="xs" mt="xs" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, items.length - shown)} more
        </Button>
      )}

      <Group gap={8} mt={14}>
        <Button variant="subtle" color="gray" onClick={onDone}>
          Not now
        </Button>
        {unanswered > 0 && (
          <Button variant="default" ml="auto" onClick={knowTheRest}>
            I know the other {unanswered}
          </Button>
        )}
        <Button ml={unanswered > 0 ? undefined : 'auto'} leftSection={<Check size={16} aria-hidden />} onClick={save} disabled={!answered}>
          Save {answered || ''} to my reviews
        </Button>
      </Group>
    </Card>
  )
}
