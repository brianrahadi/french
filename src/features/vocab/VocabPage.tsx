import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  FileButton,
  Group,
  NativeSelect,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { Layers, Play, Search, Trash2, RotateCcw, Upload, Plus } from 'lucide-react'
import { DECKS, CUSTOM_DECK_ID, FREQUENCY_DECKS, FREQUENCY_DECK_IDS, FREQUENCY_ID, FREQUENCY_WORDS, THEMED_DECKS, BUILTIN_WORDS, allWords, alreadyHave, deckWords } from '../../data/vocab'
import { type Level, type Word } from '../../data/types'
import { Empty, GenderTag, Kbd, LevelBadge, ProgressBar, Stat, Switch } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { ActionTile } from '../../components/Tile'
import { harderLevels, useCurrentLevel, withinLevel } from '../../lib/level'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { customWord, definite, findSameWord, frTypo, matchesSearch, parseImport, speakText } from '../../lib/words'
import { relativeDay } from '../../lib/date'
import { useNavigate } from 'react-router'
import { dueCounts, forecast, newAvailableToday, newWordQueue, vocabCounts, wordStatus, wordStats } from './selectors'

type Tab = 'decks' | 'browse' | 'add'

const TABS: [Tab, string][] = [
  ['decks', 'Decks'],
  ['browse', 'Browse words'],
  ['add', 'Add & import'],
]

export default function VocabPage() {
  useDocumentTitle('Vocabulary')
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'decks'
  const setTab = (t: Tab) => setParams(t === 'decks' ? {} : { tab: t }, { replace: true })
  const state = useStore()
  const navigate = useNavigate()

  const { learning, review, total: due } = useMemo(() => dueCounts(state.cards, state.customWords), [state.cards, state.customWords])
  const fresh = newAvailableToday(state)
  const { learned, mature } = useMemo(() => vocabCounts(state), [state])
  const fc = useMemo(() => forecast(state.cards, 7), [state.cards])
  const canStudy = due + fresh > 0
  useHotkeys({ s: () => canStudy && navigate('/vocab/study') })

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Vocabulaire"
        title="Vocabulary"
        subtitle={
          <>
            Spaced repetition (FSRS) brings each word back right before you’d forget it — first French → English, then
            typing it in French.
          </>
        }
      />

      <Card px={24} py={22}>
        <Group justify="space-between" align="center" gap="lg" wrap="wrap">
          <Group justify="space-between" align="center" gap={20} wrap="wrap" style={{ flex: '1 1 320px' }}>
            <Group gap={28}>
              <DueCount n={fresh} color="indigo" label="new" />
              <DueCount n={learning} color="orange" label="learn" />
              <DueCount n={review} color="green" label="review" />
            </Group>
            {canStudy ? (
              <Button component={Link} to="/vocab/study" size="lg" leftSection={<Play size={18} aria-hidden />} rightSection={<Kbd>S</Kbd>}>
                Study now
              </Button>
            ) : (
              <Stack gap={6} align="flex-end">
                <Text size="sm" c="dimmed">
                  All caught up for today
                </Text>
                {newWordQueue(state).length > 0 && (
                  <Button component={Link} to="/vocab/study?extra=5" variant="default">
                    Learn 5 extra words
                  </Button>
                )}
              </Stack>
            )}
          </Group>
          {fc.some(Boolean) && (
            <>
              <Divider orientation="vertical" visibleFrom="sm" />
              <Forecast fc={fc} />
            </>
          )}
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, xs: 3 }} mt="md">
        <Stat label="Words started" value={learned} />
        <Stat label="Well known (21d+)" value={mature} />
        <Stat label="Still to discover" value={newWordQueue({ ...state, activeDecks: [...DECKS.map((d) => d.id), CUSTOM_DECK_ID] }).length} />
      </SimpleGrid>

      <Tabs value={tab} onChange={(v) => v && setTab(v as Tab)} mt="xl">
        <Tabs.List mb="lg">
          {TABS.map(([id, label]) => (
            <Tabs.Tab key={id} value={id}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="decks">{tab === 'decks' && <DecksTab onView={(deckId) => setParams({ tab: 'browse', deck: deckId })} />}</Tabs.Panel>
        <Tabs.Panel value="browse">{tab === 'browse' && <BrowseTab />}</Tabs.Panel>
        <Tabs.Panel value="add">{tab === 'add' && <AddTab onDone={() => setParams({ tab: 'browse' })} />}</Tabs.Panel>
      </Tabs>
    </Container>
  )
}

function DueCount({ n, color, label }: { n: number; color: string; label: string }) {
  return (
    <div>
      <Text fz={34} fw={720} lh={1.1} c={color} className="tnum">
        {n}
      </Text>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </div>
  )
}

/** Small bar chart of reviews due over the next week. */
function Forecast({ fc }: { fc: number[] }) {
  const max = Math.max(...fc, 1)
  return (
    <Group
      gap={6}
      h={92}
      align="flex-end"
      wrap="nowrap"
      aria-label="Reviews due over the next 7 days"
    >
      {fc.map((n, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return (
          <Stack key={i} gap={3} align="center" justify="flex-end" w={26} h="100%" title={`${n} due ${i === 0 ? 'today' : relativeDay(d)}`}>
            <Text fz={10.5} fw={600} c="dimmed" mih={13} lh="13px" className="tnum">
              {n || ''}
            </Text>
            <Box
              w="100%"
              mah={52}
              mih={3}
              bg={i === 0 ? 'indigo.6' : 'indigo.2'}
              style={{ height: `${(n / max) * 100}%`, borderRadius: '4px 4px 2px 2px' }}
            />
            <Text fz={10.5} fw={600} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'narrow' })}
            </Text>
          </Stack>
        )
      })}
    </Group>
  )
}

/** One deck in a shelf: title (click to view its words), progress, and the switch that includes it in new words. */
function DeckCard({
  title,
  titleFr,
  level,
  active,
  started,
  total,
  known,
  onView,
  onToggle,
  children,
}: {
  title: string
  titleFr: string
  level?: Level
  active: boolean
  started: number
  total: number
  known: number
  onView: () => void
  onToggle: () => void
  children?: ReactNode
}) {
  return (
    <Card
      w={{ base: '72vw', xs: 232 }}
      padding="md"
      style={{ flexShrink: 0, ...(active ? { borderColor: 'var(--mantine-primary-color-filled)' } : {}) }}
      bg={total > 0 && started === total ? 'var(--surface-2)' : undefined}
    >
      <Stack gap={6} h="100%">
        <Group justify="space-between" wrap="nowrap">
          {level ? <LevelBadge level={level} /> : <Badge color="gray">{title === 'My words' ? 'yours' : 'frequency'}</Badge>}
          <Switch checked={active} onChange={onToggle} label={`Include “${title}” in new words`} />
        </Group>
        <Box onClick={onView} style={{ cursor: 'pointer' }} title="View words">
          <Text fw={650} fz={17} lh={1.3}>
            {title}
          </Text>
          <Text size="sm" c="dimmed" className="fr" lang="fr">
            {titleFr}
          </Text>
          {children}
        </Box>
        <Group gap={10} mt="auto" pt={6} wrap="nowrap">
          <Box flex={1}>
            <ProgressBar value={total ? started / total : 0} label={`${title}: ${started} of ${total} words started`} thin />
          </Box>
          <Text size="xs" c="dimmed" className="tnum">
            {started}/{total}
            {known > 0 && ` · ${known} known`}
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}

function DecksTab({ onView }: { onView: (id: string) => void }) {
  const activeDecks = useStore((s) => s.activeDecks)
  const introduced = useStore((s) => s.introduced)
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const toggleDeck = useStore((s) => s.toggleDeck)
  const setDecksActive = useStore((s) => s.setDecksActive)
  const level = useCurrentLevel()
  const [showHarder, setShowHarder] = useState(false)
  const harder = harderLevels(level)

  const allDecksIds = useMemo(() => [...DECKS.map((d) => d.id), CUSTOM_DECK_ID], [])
  const allActive = allDecksIds.every((id) => activeDecks.includes(id))

  // Every deck as one item, so they can be sorted onto shelves: on (being learned), off, all started.
  type Item = { id: string; title: string; titleFr: string; level?: Level; words: Word[]; active: boolean; toggle: () => void; note?: ReactNode }
  const freqActive = FREQUENCY_DECK_IDS.every((id) => activeDecks.includes(id))
  const items: Item[] = [
    ...(FREQUENCY_DECKS.length
      ? [
          {
            id: FREQUENCY_ID,
            title: `Top ${FREQUENCY_WORDS.length.toLocaleString('en')} words`,
            titleFr: 'Les mots les plus fréquents',
            words: FREQUENCY_WORDS,
            active: freqActive,
            toggle: () => setDecksActive(FREQUENCY_DECK_IDS, !freqActive),
            note: (
              <Text size="xs" c="dimmed" mt={4}>
                Most common first, in order. Words already in a themed deck are shared.
              </Text>
            ),
          },
        ]
      : []),
    ...THEMED_DECKS.map((d) => ({ id: d.id, title: d.title, titleFr: d.titleFr, level: d.level, words: d.words, active: activeDecks.includes(d.id), toggle: () => toggleDeck(d.id) })),
    ...(customWords.length
      ? [{ id: CUSTOM_DECK_ID, title: 'My words', titleFr: 'Mes mots', words: customWords, active: activeDecks.includes(CUSTOM_DECK_ID), toggle: () => toggleDeck(CUSTOM_DECK_ID) }]
      : []),
  ]
  const startedIn = (w: Word[]) => w.filter((x) => introduced[x.id]).length
  const finished = (it: Item) => it.words.length > 0 && startedIn(it.words) === it.words.length
  const card = (it: Item) => (
    <DeckCard
      key={it.id}
      title={it.title}
      titleFr={it.titleFr}
      level={it.level}
      active={it.active}
      started={startedIn(it.words)}
      total={it.words.length}
      known={it.words.filter((w) => wordStatus(w.id, cards) === 'mature').length}
      onView={() => onView(it.id)}
      onToggle={it.toggle}
    >
      {it.note}
    </DeckCard>
  )
  const on = items.filter((it) => it.active && !finished(it))
  // Off decks: your level and below (easiest first), harder ones only when asked for.
  const off = items.filter((it) => !it.active && !finished(it) && (!it.level || showHarder || withinLevel(it.level, level)))
  const done = items.filter(finished)

  return (
    <div>
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" maw={600}>
          Switch on the decks you want new words from. Words are introduced in order, a few each day (change the number in Settings).
        </Text>
        <Button variant="default" size="xs" onClick={() => setDecksActive(allDecksIds, !allActive)}>
          {allActive ? 'Turn all off' : 'Turn all on'}
        </Button>
      </Group>

      <Shelf title="Learning now" count={on.length} hint={on.length ? 'New words come from these decks.' : 'Switch on a deck below to start getting new words.'}>
        {on.map(card)}
        {on.length === 0 && <ActionTile icon={<Layers size={18} aria-hidden />} title="No deck switched on" sub="Pick one from the row below." />}
      </Shelf>

      <Shelf
        title="More decks"
        count={off.length}
        hint={<>For your level ({level}) and below{showHarder && harder.length ? ', plus harder ones' : ''}.</>}
        action={
          harder.length > 0 && (
            <Button variant="subtle" size="xs" aria-pressed={showHarder} onClick={() => setShowHarder((v) => !v)}>
              {showHarder ? 'Hide harder levels' : `Show ${harder.join(', ')}`}
            </Button>
          )
        }
      >
        {off.map(card)}
        {!customWords.length && (
          <ActionTile icon={<Plus size={18} aria-hidden />} title="My words" sub="Add words from LingQ, Anki or your reading in “Add & import”." />
        )}
      </Shelf>

      {done.length > 0 && (
        <Shelf title="All words started" count={done.length} hint="Every word in these decks is in your reviews.">
          {done.map(card)}
        </Shelf>
      )}
    </div>
  )
}

const STATUS_BADGE = {
  new: <Badge color="gray">New</Badge>,
  learning: <Badge color="orange">Learning</Badge>,
  young: <Badge color="indigo">Reviewing</Badge>,
  mature: <Badge color="green">Known</Badge>,
}

function BrowseTab() {
  const [params, setParams] = useSearchParams()
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const resetWord = useStore((s) => s.resetWord)
  const removeCustomWord = useStore((s) => s.removeCustomWord)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'learning' | 'young' | 'mature' | 'custom'>('all')
  const [sortBy, setSortBy] = useState<'due-asc' | 'due-desc' | 'strength-asc' | 'strength-desc' | 'default'>('default')
  const [limit, setLimit] = useState(60)

  const deckFilter = params.get('deck') || 'all'

  const words = useMemo(() => {
    // A deck's words in its own order (frequency order for the top 5000).
    const base = deckFilter === 'all' ? allWords(customWords) : deckWords(deckFilter, customWords)
    const list = base.filter((w) => matchesSearch(w, q))
    const filtered = list.filter((w) => {
      if (filter === 'all') return true
      if (filter === 'custom') return w.custom
      return wordStatus(w.id, cards) === filter
    })

    if (sortBy === 'default') return filtered

    return filtered.sort((a, b) => {
      const statsA = wordStats(a.id, cards)
      const statsB = wordStats(b.id, cards)
      
      if (sortBy.startsWith('due')) {
        const timeA = statsA.nextDue ? statsA.nextDue.getTime() : Infinity
        const timeB = statsB.nextDue ? statsB.nextDue.getTime() : Infinity
        return sortBy === 'due-asc' ? timeA - timeB : timeB - timeA
      } else {
        const strA = statsA.interval || 0
        const strB = statsB.interval || 0
        return sortBy === 'strength-asc' ? strA - strB : strB - strA
      }
    })
  }, [customWords, q, filter, cards, deckFilter, sortBy])

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          type="search"
          leftSection={<Search size={17} aria-hidden />}
          placeholder="Search French or English…"
          value={q}
          onChange={(e) => {
            setQ(e.currentTarget.value)
            setLimit(60)
          }}
          aria-label="Search words"
          style={{ flex: '1 1 260px' }}
        />
        <NativeSelect
          value={deckFilter}
          onChange={(e) => {
            const next = new URLSearchParams(params)
            if (e.currentTarget.value === 'all') next.delete('deck')
            else next.set('deck', e.currentTarget.value)
            setParams(next)
          }}
          aria-label="Filter by deck"
        >
          <option value="all">All decks</option>
          <optgroup label="Themed">
            {THEMED_DECKS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </optgroup>
          {FREQUENCY_DECKS.length > 0 && <option value={FREQUENCY_ID}>Top {FREQUENCY_WORDS.length.toLocaleString('en')} words</option>}
          <option value={CUSTOM_DECK_ID}>My words</option>
        </NativeSelect>
        <NativeSelect value={filter} onChange={(e) => setFilter(e.currentTarget.value as typeof filter)} aria-label="Filter by status">
          <option value="all">All status</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="young">Reviewing</option>
          <option value="mature">Known</option>
          <option value="custom">My words</option>
        </NativeSelect>
        <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.currentTarget.value as typeof sortBy)} aria-label="Sort by">
          <option value="default">Default order</option>
          <option value="due-asc">Next review (Earliest)</option>
          <option value="due-desc">Next review (Latest)</option>
          <option value="strength-desc">Strength (Highest)</option>
          <option value="strength-asc">Strength (Lowest)</option>
        </NativeSelect>
      </Group>
      <Text size="sm" c="dimmed">
        {words.length} words
      </Text>
      {words.length === 0 ? (
        <Empty icon={<Layers size={32} />} title="No words match">
          Try another search or filter.
        </Empty>
      ) : (
        <Card padding={0}>
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {words.slice(0, limit).map((w, i) => {
              const st = wordStatus(w.id, cards)
              const { nextDue, interval } = wordStats(w.id, cards)
              return (
                <li key={w.id}>
                  {i > 0 && <Divider />}
                  <Group gap={12} px={14} py={9} wrap="nowrap">
                    <SpeakButton text={speakText(w)} size="sm" />
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12} verticalSpacing={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text fz={17} className="fr" lang="fr">
                        {w.pos === 'n' && w.g && !w.custom && <span className={w.both ? '' : w.g === 'f' ? 'art-f' : 'art-m'}>{frTypo(definite(w))}</span>}
                        {frTypo(w.fr)}
                        {w.pos === 'adj' && w.fem && w.fem !== w.fr && (
                          <Text span c="dimmed">
                            {' '}
                            · {w.fem}
                          </Text>
                        )}{' '}
                        {w.pos === 'n' && !w.both && (w.pl || /^l'/.test(definite(w))) && <GenderTag g={w.g} />}
                      </Text>
                      <Text size="sm" c="dimmed" truncate>
                        {w.en}
                      </Text>
                    </SimpleGrid>
                    <Stack gap={2} align="flex-end" style={{ whiteSpace: 'nowrap' }}>
                      <div>{STATUS_BADGE[st]}</div>
                      {st !== 'new' && (
                        <Group gap={6} wrap="nowrap">
                          {interval > 0 && (
                            <Text span size="xs" c="dimmed" title="Current interval">
                              Str: {interval}d
                            </Text>
                          )}
                          {nextDue && (
                            <Text span size="xs" c="dimmed" title="Next review date">
                              Due: {relativeDay(nextDue)}
                            </Text>
                          )}
                        </Group>
                      )}
                    </Stack>
                    <Group gap={2} justify="flex-end" wrap="nowrap" w={64}>
                      {st !== 'new' && (
                        <ActionIcon variant="subtle" color="gray" size="sm" title="Forget progress for this word" aria-label={`Reset ${w.fr}`} onClick={() => resetWord(w.id)}>
                          <RotateCcw size={15} aria-hidden />
                        </ActionIcon>
                      )}
                      {w.custom && (
                        <ActionIcon variant="subtle" color="gray" size="sm" title="Delete word" aria-label={`Delete ${w.fr}`} onClick={() => removeCustomWord(w.id)}>
                          <Trash2 size={15} aria-hidden />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </li>
              )
            })}
          </Box>
        </Card>
      )}
      {words.length > limit && (
        <Button variant="default" onClick={() => setLimit((l) => l + 100)} style={{ alignSelf: 'center' }}>
          Show more
        </Button>
      )}
    </Stack>
  )
}

function AddTab({ onDone }: { onDone: () => void }) {
  const addCustomWords = useStore((s) => s.addCustomWords)
  const customWords = useStore((s) => s.customWords)
  const introduced = useStore((s) => s.introduced)
  const [fr, setFr] = useState('')
  const [en, setEn] = useState('')
  const [ex, setEx] = useState('')
  const [bulk, setBulk] = useState('')
  const parsed = useMemo(() => parseImport(bulk), [bulk])

  const addOne = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fr.trim() || !en.trim()) return
    const g = /^(le|un) /i.test(fr) ? 'm' : /^(la|une) /i.test(fr) ? 'f' : undefined
    const w = customWord(fr, en, ex, g)
    if (alreadyHave(w, customWords, introduced)) toast(`“${fr.trim()}” is already in your words`)
    else {
      addCustomWords([w])
      toast(findSameWord(w, BUILTIN_WORDS) ? `“${fr.trim()}” is in the decks — added it from there` : `Added “${fr.trim()}”`)
    }
    setFr('')
    setEn('')
    setEx('')
  }

  const importAll = () => {
    if (!parsed.length) return
    const words = parsed.map((p) => customWord(p.fr, p.en, p.ex, p.g))
    const have = words.filter((w) => alreadyHave(w, customWords, introduced)).length
    addCustomWords(words)
    toast(have ? `Imported ${words.length - have} words · ${have} you already had were skipped` : `Imported ${words.length} words`)
    setBulk('')
    onDone()
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} style={{ alignItems: 'start' }}>
      <Card component="form" onSubmit={addOne}>
        <Stack gap="sm">
          <Title order={2} size="h4">
            Add a word
          </Title>
          <Text size="sm" c="dimmed">
            Found a word on LingQ or in a podcast? Add it here. For nouns, type the article (le, la, un, une) so you learn its gender.
          </Text>
          <TextInput id="add-fr" label="French" classNames={{ input: 'fr' }} lang="fr" value={fr} onChange={(e) => setFr(e.currentTarget.value)} placeholder="la bibliothèque" required />
          <TextInput id="add-en" label="English" value={en} onChange={(e) => setEn(e.currentTarget.value)} placeholder="library" required />
          <TextInput
            id="add-ex"
            label={
              <>
                Example sentence{' '}
                <Text span size="sm" c="dimmed" fw={400}>
                  (optional)
                </Text>
              </>
            }
            classNames={{ input: 'fr' }}
            lang="fr"
            value={ex}
            onChange={(e) => setEx(e.currentTarget.value)}
            placeholder="Je travaille à la bibliothèque."
          />
          <Button type="submit" disabled={!fr.trim() || !en.trim()} leftSection={<Plus size={17} aria-hidden />}>
            Add word
          </Button>
        </Stack>
      </Card>

      <Card>
        <Stack gap="sm">
          <Title order={2} size="h4">
            Import from Anki, LingQ or a spreadsheet
          </Title>
          <Text size="sm" c="dimmed">
            Paste one word per line: <code>french⇥english</code> (tab, semicolon or comma separated, optional third column for an
            example). In Anki use <em>File → Export → Notes in Plain Text</em>; in LingQ, export your LingQs as CSV.
          </Text>
          <Textarea
            autosize
            minRows={5}
            classNames={{ input: 'fr' }}
            lang="fr"
            value={bulk}
            onChange={(e) => setBulk(e.currentTarget.value)}
            placeholder={'la bibliothèque\tlibrary\nse débrouiller\tto manage, get by'}
            aria-label="Words to import"
          />
          <Group justify="space-between">
            <FileButton
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              onChange={async (f) => {
                if (f) setBulk(await f.text())
              }}
            >
              {(props) => (
                <Button {...props} variant="default" size="xs" leftSection={<Upload size={15} aria-hidden />}>
                  Choose file
                </Button>
              )}
            </FileButton>
            <Button onClick={importAll} disabled={!parsed.length}>
              Import {parsed.length || ''} word{parsed.length === 1 ? '' : 's'}
            </Button>
          </Group>
          {parsed.length > 0 && (
            <Stack gap={4} px={12} py={10} bg="var(--mantine-color-default-hover)" style={{ borderRadius: 'var(--mantine-radius-md)' }} aria-label="Preview">
              {parsed.slice(0, 5).map((p, i) => (
                <Group key={i} gap={8}>
                  <Text size="sm" className="fr" lang="fr">
                    {p.fr}
                  </Text>
                  <Text size="sm" c="dimmed">
                    →
                  </Text>
                  <Text size="sm" c="dimmed">
                    {p.en}
                  </Text>
                </Group>
              ))}
              {parsed.length > 5 && (
                <Text size="sm" c="dimmed">
                  …and {parsed.length - 5} more
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </SimpleGrid>
  )
}
