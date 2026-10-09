import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Container, Divider, Group, List, SegmentedControl, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
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
import { ScoreBadge } from './tiles'

type View = 'marked' | 'corrected' | 'improved'

export default function WritingResult() {
  const { id = '' } = useParams()
  const entry = useStore((s) => s.writings.find((w) => w.id === id))
  const writings = useStore((s) => s.writings)
  useDocumentTitle(entry ? `Feedback · ${entry.title}` : 'Feedback')

  if (!entry) {
    return (
      <Container size="var(--page-w)" py="xl">
        <BackLink />
        <Empty icon={<PencilLine size={30} />} title="This text isn’t here any more">
          It may have been deleted.{' '}
          <Anchor component={Link} to="/library#writing">
            Write something new
          </Anchor>
        </Empty>
      </Container>
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
    <Container size="var(--page-w-narrow)" py="xl">
      <BackLink />

      <Group component="header" gap={20} wrap="nowrap" mb="md">
        <Ring value={fb.score / 100} size={84} stroke={8} label={`Score ${fb.score} out of 100`}>
          <span className="tnum">{fb.score}</span>
        </Ring>
        <Box style={{ minWidth: 0 }}>
          <Text size="sm" fw={600} c="dimmed" mb={2}>
            {new Date(entry.createdAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
            {entry.words} words
            {fb.level && <> · reads like {fb.level}</>}
          </Text>
          <Title order={1} fz={{ base: 24, sm: 30 }} lang="fr">
            {entry.title}
          </Title>
          {before && (
            <Text size="sm" c="dimmed" mt={4}>
              Rewrite · score <ScoreBadge score={before.feedback.score} /> → <ScoreBadge score={fb.score} />{' '}
              <Anchor component={Link} to={`/writing/${before.id}`} inherit>
                see first version
              </Anchor>
            </Text>
          )}
        </Box>
      </Group>

      {fb.summary && (
        <Text fz={16} lh={1.6} maw="68ch" mb={20}>
          {fb.summary}
        </Text>
      )}

      <Card component="section" padding={0} aria-label="Your text">
        <Group justify="space-between" gap={10} px={14} py={12} bg="var(--mantine-color-default-hover)">
          <SegmentedControl
            size="sm"
            aria-label="Version"
            value={view}
            onChange={(v) => setView(v as View)}
            data={[
              { value: 'marked', label: `Corrections${fb.errors.length ? ` (${fb.errors.length})` : ''}` },
              { value: 'corrected', label: 'Corrected' },
              { value: 'improved', label: 'More natural' },
            ]}
          />
          <Group gap={2}>
            <SpeakButton text={view === 'marked' ? fb.corrected : shownText} size="sm" label="Listen to the corrected text" />
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => copy(view === 'marked' ? fb.corrected : shownText)} aria-label="Copy text" title="Copy">
              <Copy size={15} aria-hidden />
            </ActionIcon>
          </Group>
        </Group>
        <Divider />
        {/* Core learning UI: the text with tappable correction marks keeps its own typography and mark styles. */}
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
      </Card>

      <Box component="section" mt="xl" aria-labelledby="fixes-title">
        <Title order={2} size="h4" mb="xs" id="fixes-title">
          <Group component="span" gap={8} wrap="nowrap">
            <span>What to fix</span>
            <Text span c="dimmed" size="sm" fw={500} className="tnum">
              {fb.errors.length}
            </Text>
          </Group>
        </Title>
        {fb.errors.length === 0 ? (
          <Card>
            <Empty icon={<CheckCircle2 size={32} color="var(--mantine-color-green-filled)" />} title="Aucune faute — no mistakes found!">
              Look at the “More natural” version for ways to sound even more fluent.
            </Empty>
          </Card>
        ) : (
          <Stack component="ol" gap={8} m={0} p={0} style={{ listStyle: 'none' }}>
            {fb.errors.map((e, i) => {
              const lesson = e.lesson ? LESSON_BY_ID[e.lesson] : undefined
              const on = active === i
              return (
                <Card
                  component="li"
                  key={i}
                  id={`err-${i}`}
                  padding="md"
                  radius="md"
                  onMouseEnter={() => setActive(i)}
                  style={{
                    scrollMargin: 90,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    ...(on
                      ? {
                          borderColor: 'var(--mantine-primary-color-filled)',
                          boxShadow: '0 0 0 3px var(--mantine-primary-color-light)',
                        }
                      : {}),
                  }}
                >
                  <Group gap={14} wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="default" radius="xl" size={26} fz={12.5} fw={700} className="tnum" aria-hidden>
                      {i + 1}
                    </ThemeIcon>
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      {/* The before → after change keeps the shared diff styles (red strike, green insert). */}
                      <div className="fix__change fr" lang="fr">
                        <del>{frTypo(e.original)}</del>
                        <Text span c="dimmed" display="inline-flex">
                          <ArrowRight size={15} aria-hidden />
                        </Text>
                        <ins>{frTypo(e.correction) || '(remove)'}</ins>
                        <Badge color="gray" ml={4} tt="capitalize">
                          {e.category}
                        </Badge>
                      </div>
                      <Text fz={14.5} c="dimmed" mt={4}>
                        {e.explanation}
                      </Text>
                      {lesson && (
                        <Anchor component={Link} to={`/grammar/${lesson.id}`} fz={13.5} fw={600} mt={6} display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
                          Review: {lesson.title} <ArrowRight size={14} aria-hidden />
                        </Anchor>
                      )}
                      {!located.has(i) && (
                        <Text size="xs" c="dimmed" mt={4}>
                          (couldn’t pinpoint this one in your text)
                        </Text>
                      )}
                    </Box>
                  </Group>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl" style={{ alignItems: 'start' }}>
        {fb.strengths.length > 0 && (
          <Card component="section" aria-labelledby="strengths-title">
            <Title order={2} id="strengths-title" fz="md" fw={650} mb={10}>
              What went well
            </Title>
            <List
              spacing={10}
              fz={14.5}
              center={false}
              icon={
                <Text span c="green" display="flex" mt={3}>
                  <Check size={16} aria-hidden />
                </Text>
              }
            >
              {fb.strengths.map((s, i) => (
                <List.Item key={i}>{s}</List.Item>
              ))}
            </List>
          </Card>
        )}
        {vocab.length > 0 && (
          <Card component="section" aria-labelledby="vocab-title">
            <Group justify="space-between" mb={10}>
              <Title order={2} id="vocab-title" fz="md" fw={650}>
                Words to keep
              </Title>
              {vocab.some((v) => !v.added) && (
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<Plus size={15} aria-hidden />}
                  onClick={() => {
                    const fresh = vocab.filter((v) => !v.added).map((v) => v.word)
                    addCustomWords(fresh)
                    toast(`Added ${fresh.length} word${fresh.length > 1 ? 's' : ''} to your flashcards`)
                  }}
                >
                  Add all
                </Button>
              )}
            </Group>
            <Stack component="ul" gap={10} m={0} p={0} style={{ listStyle: 'none' }}>
              {vocab.map((v) => (
                <Group component="li" key={v.word.id} gap={8} wrap="nowrap">
                  <SpeakButton text={v.word.fr} size="sm" />
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fz={17} className="fr" lang="fr">
                      {frTypo(v.fr)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {v.en}
                    </Text>
                  </Box>
                  {v.added ? (
                    <Badge color="green" leftSection={<Check size={12} aria-hidden />}>
                      added
                    </Badge>
                  ) : (
                    <ActionIcon
                      variant="default"
                      size="md"
                      aria-label={`Add ${v.fr} to flashcards`}
                      title="Add to flashcards"
                      onClick={() => {
                        addCustomWords([v.word])
                        toast(`Added “${v.fr}”`)
                      }}
                    >
                      <Plus size={15} aria-hidden />
                    </ActionIcon>
                  )}
                </Group>
              ))}
            </Stack>
          </Card>
        )}
      </SimpleGrid>

      <Divider mt={32} mb={20} />
      <Group gap={8}>
        <Button variant="subtle" color="red" leftSection={<Trash2 size={16} aria-hidden />} onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
        <Button component={Link} to="/library#writing" variant="default" ml="auto">
          New text
        </Button>
        {fb.errors.length > 0 && (
          <Button component={Link} to={`/writing/new?rewrite=${entry.id}`} leftSection={<RotateCcw size={16} aria-hidden />}>
            Rewrite it yourself
          </Button>
        )}
      </Group>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this text?"
        actions={
          <>
            <Button variant="subtle" color="gray" onClick={() => setConfirmDelete(false)} data-autofocus>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                deleteWriting(entry.id)
                navigate('/library#writing', { replace: true })
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <Text c="dimmed">The text and its feedback will be removed from this browser.</Text>
      </Dialog>
    </Container>
  )
}

function BackLink() {
  return (
    <Anchor component={Link} to="/library#writing" size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
      <ArrowLeft size={16} aria-hidden /> Library
    </Anchor>
  )
}
