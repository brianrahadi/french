import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionIcon, Box, Button, Card, Group, SegmentedControl, Switch, Text, UnstyledButton } from '@mantine/core'
import { Check, EyeOff, Plus, RotateCcw } from 'lucide-react'
import { GenderTag } from '../../components/ui'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { displayFr, frTypo } from '../../lib/words'
import { dirsFor } from '../vocab/selectors'
import type { ReadStatus, StatusWord, TextVocabView } from './vocabStatus'

const ORDER: ReadStatus[] = ['new', 'learning', 'known']
const LABEL: Record<ReadStatus, string> = { new: 'New', learning: 'Learning', known: 'Known' }
const EMPTY: Record<ReadStatus, string> = {
  new: 'No new words — you’ve met every word in this text.',
  learning: 'Nothing in learning from this text.',
  known: 'No known words yet. Mark the ones you know as you read.',
}

/**
 * LingQ-style sidebar: the text's vocabulary-bank words grouped into new,
 * learning and known, with how much of the text you know. Tapping a word
 * highlights it in the text; the buttons start it, mark it known or hide it.
 */
export function VocabPanel({
  view,
  focus,
  onFocus,
  highlight,
  onHighlight,
}: {
  view: TextVocabView
  focus: string | null
  onFocus: (wordId: string | null) => void
  highlight: boolean
  onHighlight: (on: boolean) => void
}) {
  const introduceWord = useStore((s) => s.introduceWord)
  const markWordsKnown = useStore((s) => s.markWordsKnown)
  const checkWords = useStore((s) => s.checkWords)
  const ignoreWord = useStore((s) => s.ignoreWord)
  const directions = useStore((s) => s.settings.directions)

  const counts = useMemo(() => {
    const c: Record<ReadStatus, number> = { new: 0, learning: 0, known: 0 }
    for (const w of view.words) c[w.status]++
    return c
  }, [view.words])
  const total = view.words.length
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const [tab, setTab] = useState<ReadStatus>(() => (counts.new ? 'new' : counts.learning ? 'learning' : 'known'))
  const list = view.words.filter((w) => w.status === tab)

  // A word tapped in the text: show its group and bring its row into view (inside the list only).
  const listRef = useRef<HTMLUListElement>(null)
  const focusStatus = focus ? view.status[focus] : undefined
  useEffect(() => {
    if (focusStatus && focusStatus !== tab) setTab(focusStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])
  useEffect(() => {
    const el = listRef.current
    const row = focus ? el?.querySelector<HTMLElement>(`[data-row="${CSS.escape(focus)}"]`) : null
    if (!el || !row) return
    if (row.offsetTop < el.scrollTop || row.offsetTop + row.offsetHeight > el.scrollTop + el.clientHeight)
      el.scrollTo({ top: row.offsetTop - 8, behavior: 'smooth' })
  }, [focus, tab])

  const showInText = (id: string) => {
    if (focus === id) return onFocus(null)
    onFocus(id)
    requestAnimationFrame(() =>
      document.querySelector(`.lk-word[data-wid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    )
  }

  const learn = (w: StatusWord) => {
    introduceWord(w.word.id, dirsFor(directions))
    toast(`Learning “${displayFr(w.word)}”`)
  }
  const know = (w: StatusWord) => markWordsKnown([w.word.id])
  const relearn = (w: StatusWord) => {
    checkWords([{ wordId: w.word.id, known: false }], dirsFor(directions))
    toast(`“${displayFr(w.word)}” is back in learning`)
  }
  const ignore = (w: StatusWord) => {
    ignoreWord(w.word.id)
    if (focus === w.word.id) onFocus(null)
  }
  const knowAllNew = () => {
    const ids = view.words.filter((w) => w.status === 'new').map((w) => w.word.id)
    markWordsKnown(ids)
    toast(`${ids.length} word${ids.length > 1 ? 's' : ''} marked as known`)
  }

  return (
    <Card component="aside" aria-labelledby="vocab-panel-title" padding="md" className="vocab-panel">
      <Group justify="space-between" align="baseline" gap={8}>
        <Text fw={650} id="vocab-panel-title">
          Vocabulary
        </Text>
        <Text size="sm" c="dimmed" className="tnum">
          {total} word{total === 1 ? '' : 's'}
        </Text>
      </Group>

      <Group gap={10} align="baseline" mt={6}>
        <Text fz={34} fw={700} lh={1} className="tnum">
          {Math.round(pct(counts.known))}%
        </Text>
        <Text size="sm" c="dimmed">
          known
        </Text>
      </Group>
      <div
        className="vp-bar"
        role="img"
        aria-label={`${counts.known} known, ${counts.learning} learning, ${counts.new} new`}
      >
        {(['known', 'learning', 'new'] as const).map((k) => (
          <span key={k} className={`vp-bar__seg vp-bar__seg--${k}`} style={{ width: `${pct(counts[k])}%` }} />
        ))}
      </div>

      <SegmentedControl
        fullWidth
        size="xs"
        mt="md"
        value={tab}
        onChange={(v) => setTab(v as ReadStatus)}
        aria-label="Words by status"
        data={ORDER.map((k) => ({
          value: k,
          label: (
            <span className="vp-tab">
              <span className={`vp-dot vp-dot--${k}`} aria-hidden />
              {LABEL[k]} <span className="tnum">{counts[k]}</span>
            </span>
          ),
        }))}
      />

      <ul ref={listRef} className="vp-list" aria-label={`${LABEL[tab]} words`}>
        {list.map((w) => {
          const id = w.word.id
          const focused = focus === id
          return (
            <li key={id} data-row={id} className={`vp-row${focused ? ' vp-row--focus' : ''}`}>
              <UnstyledButton className="vp-word" onClick={() => showInText(id)} aria-pressed={focused} title="Show it in the text">
                <span className="vp-word__fr fr" lang="fr">
                  {frTypo(displayFr(w.word))}
                  {w.word.pos === 'n' && w.word.g && !w.word.both && (
                    <>
                      {' '}
                      <GenderTag g={w.word.g} />
                    </>
                  )}
                  {w.count > 1 && (
                    <Text span size="xs" c="dimmed" ml={6} className="tnum">
                      ×{w.count}
                    </Text>
                  )}
                </span>
                <Text size="sm" c="dimmed" truncate="end">
                  {w.word.en}
                </Text>
              </UnstyledButton>
              <Group gap={2} wrap="nowrap">
                {w.status === 'new' && (
                  <ActionIcon variant="subtle" color="gray" onClick={() => learn(w)} aria-label={`Learn ${w.word.fr}`} title="Learn it (add to flashcards)">
                    <Plus size={16} aria-hidden />
                  </ActionIcon>
                )}
                {w.status !== 'known' ? (
                  <ActionIcon variant="subtle" color="green" onClick={() => know(w)} aria-label={`I know ${w.word.fr}`} title="I know it">
                    <Check size={16} aria-hidden />
                  </ActionIcon>
                ) : (
                  <ActionIcon variant="subtle" color="gray" onClick={() => relearn(w)} aria-label={`Still learning ${w.word.fr}`} title="Still learning it">
                    <RotateCcw size={15} aria-hidden />
                  </ActionIcon>
                )}
                {w.status === 'new' && (
                  <ActionIcon variant="subtle" color="gray" onClick={() => ignore(w)} aria-label={`Ignore ${w.word.fr}`} title="Ignore (never ask about it)">
                    <EyeOff size={15} aria-hidden />
                  </ActionIcon>
                )}
              </Group>
            </li>
          )
        })}
        {!list.length && (
          <Text component="li" size="sm" c="dimmed" py="sm">
            {EMPTY[tab]}
          </Text>
        )}
      </ul>

      {tab === 'new' && counts.new > 1 && (
        <Button variant="default" size="xs" fullWidth mt="sm" leftSection={<Check size={14} aria-hidden />} onClick={knowAllNew}>
          I know all {counts.new}
        </Button>
      )}

      <Box mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Switch size="xs" label="Colour new and learning words" checked={highlight} onChange={(e) => onHighlight(e.currentTarget.checked)} />
        {view.hidden > 0 && (
          <Text size="xs" c="dimmed" mt={6}>
            {view.hidden} ignored word{view.hidden > 1 ? 's' : ''} not shown
          </Text>
        )}
      </Box>
    </Card>
  )
}
