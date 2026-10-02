import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge, Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { CheckCircle2, Headphones, RotateCcw } from 'lucide-react'
import { FocusShell } from '../../components/FocusShell'
import { SpeakButton } from '../../components/SpeakButton'
import { Kbd } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { noteDictation } from '../../lib/mistakes'
import { LISTEN_CATEGORIES, type ListenCategory } from '../../lib/french'
import { frTypo } from '../../lib/words'
import { DictationQuestion, type DictationAnswer } from './DictationQuestion'
import { pickSentences, poolFor, type SentenceSource } from './sentences'

export function useDictationItems() {
  const [params] = useSearchParams()
  const src = (params.get('src') ?? 'mine') as SentenceSource
  const n = Math.max(1, Math.min(30, Number(params.get('n')) || 10))
  return useMemo(() => {
    const s = useStore.getState()
    return { src, items: pickSentences(poolFor(src, s), s.listening, n) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])
}

export default function DictationRoute() {
  const [params] = useSearchParams()
  return <DictationSession key={params.toString()} />
}

function DictationSession() {
  useDocumentTitle('Dictation')
  const { items } = useDictationItems()
  const recordSentence = useStore((s) => s.recordSentence)
  const logActivity = useStore((s) => s.logActivity)
  const [pos, setPos] = useState(0)
  const [log, setLog] = useState<DictationAnswer[]>([])
  const [answered, setAnswered] = useState(false)

  const done = pos >= items.length
  const onAnswered = (a: DictationAnswer) => {
    setAnswered(true)
    setLog((l) => [...l, a])
    recordSentence('listening', a.sentence.id, a.result.score)
    noteDictation(a.sentence, a.result)
    logActivity(a.result.score >= 70)
  }
  const next = () => {
    setAnswered(false)
    setPos((p) => p + 1)
  }

  if (!items.length) {
    return (
      <FocusShell progress={0} exitTo="/practice" label="Dictation">
        <Stack align="center" ta="center" gap="xs" pt="xl">
          <Title order={1} className="fr" fz={28} fw={600}>
            No sentences here yet
          </Title>
          <Button component={Link} to="/practice" mt="sm">
            Choose other sentences
          </Button>
        </Stack>
      </FocusShell>
    )
  }

  if (done) {
    return (
      <FocusShell progress={1} exitTo="/practice" label="Dictation" count={`${items.length}/${items.length}`}>
        <DictationSummary log={log} />
      </FocusShell>
    )
  }

  const progress = (pos + (answered ? 1 : 0)) / items.length
  return (
    <FocusShell progress={progress} exitTo="/practice" label="Dictation" count={`${pos + 1}/${items.length}`}>
      <DictationQuestion key={items[pos].id + pos} sentence={items[pos]} onAnswered={onAnswered} onContinue={next} />
    </FocusShell>
  )
}

function DictationSummary({ log }: { log: DictationAnswer[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useHotkeys({ Enter: () => navigate('/practice') })
  const avg = log.length ? Math.round(log.reduce((a, x) => a + x.result.score, 0) / log.length) : 0
  const perfect = log.filter((x) => x.result.perfect).length
  const cats: Partial<Record<ListenCategory, number>> = {}
  for (const x of log) for (const [c, n] of Object.entries(x.result.categories)) cats[c as ListenCategory] = (cats[c as ListenCategory] ?? 0) + (n ?? 0)
  const sorted = (Object.keys(cats) as ListenCategory[]).sort((a, b) => (cats[b] ?? 0) - (cats[a] ?? 0))

  return (
    <Stack align="center" ta="center" gap="xs" pt="xl">
      <CheckCircle2 size={44} color="var(--mantine-color-green-6)" aria-hidden />
      <Title order={1} className="fr" fz={28} fw={600}>
        Dictée terminée&nbsp;!
      </Title>
      <Text c="dimmed">
        {perfect} of {log.length} perfect · average {avg}%
      </Text>

      {sorted.length > 0 && (
        <Card w="100%" ta="left" mt="md">
          <Title order={2} size="h5" c="dimmed" tt="uppercase" mb="sm">
            What to listen for
          </Title>
          <Stack component="ul" gap="sm" m={0} p={0} style={{ listStyle: 'none' }}>
            {sorted.map((c) => (
              <li key={c}>
                <Group gap={8} mb={2}>
                  <Text fw={700}>{LISTEN_CATEGORIES[c].label}</Text>
                  <Badge color="gray">× {cats[c]}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {LISTEN_CATEGORIES[c].tip}
                </Text>
              </li>
            ))}
          </Stack>
        </Card>
      )}

      <Group justify="center" gap="sm" mt="lg">
        <Button
          size="lg"
          variant="default"
          onClick={() => navigate(`/listening/session?${params.toString()}&r=${Date.now()}`)}
          leftSection={<RotateCcw size={17} aria-hidden />}
        >
          New sentences
        </Button>
        <Button component={Link} to="/practice" size="lg" rightSection={<Kbd>↵</Kbd>}>
          Done
        </Button>
      </Group>

      <Card padding={0} w="100%" ta="left" mt="lg">
        <Title order={2} size="h5" c="dimmed" tt="uppercase" px="md" pt="md" pb="xs">
          <Group component="span" gap={6} wrap="nowrap">
            <Headphones size={16} aria-hidden />
            Sentences
          </Group>
        </Title>
        {log.map((x, i) => (
          <Group
            key={i}
            align="flex-start"
            wrap="nowrap"
            gap={10}
            px="md"
            py="sm"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <SpeakButton text={x.sentence.fr} size="sm" />
            <Box flex={1} miw={0}>
              <Text className="fr" lang="fr" fw={700} fz={17}>
                {frTypo(x.sentence.fr)}
              </Text>
              {!x.result.perfect && x.typed.trim() && (
                <Text size="sm" c="red" td="line-through" className="fr" lang="fr">
                  {frTypo(x.typed)}
                </Text>
              )}
              <Text size="sm" c="dimmed">
                {x.sentence.en}
              </Text>
            </Box>
            <Badge className="tnum" color={x.result.perfect ? 'green' : x.result.score >= 70 ? 'orange' : 'red'}>
              {x.result.score}%
            </Badge>
          </Group>
        ))}
      </Card>
    </Stack>
  )
}
