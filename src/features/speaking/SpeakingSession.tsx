import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge, Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { FocusShell } from '../../components/FocusShell'
import { SpeakButton } from '../../components/SpeakButton'
import { Callout, Kbd } from '../../components/ui'
import { SOUND_SETS } from '../../data/sounds'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { noteSpeaking } from '../../lib/mistakes'
import { frTypo } from '../../lib/words'
import { pickSentences, poolFor, type SentenceSource } from '../listening/sentences'
import { SpeakQuestion, type SpeakAnswer, type SpeakMode } from './SpeakQuestion'

export default function SpeakingRoute() {
  const [params] = useSearchParams()
  return <SpeakingSession key={params.toString()} />
}

function SpeakingSession() {
  useDocumentTitle('Speaking')
  const [params] = useSearchParams()
  const src = (params.get('src') ?? 'mine') as SentenceSource
  const mode = (params.get('mode') === 'repeat' ? 'repeat' : 'read') as SpeakMode
  const n = Math.max(1, Math.min(20, Number(params.get('n')) || 8))
  const items = useMemo(() => {
    const s = useStore.getState()
    const pool = poolFor(src, s)
    // Sound sets are short and meant to be done in order.
    return src.startsWith('sound:') ? pool.slice(0, n) : pickSentences(pool, s.speaking, n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const recordSentence = useStore((s) => s.recordSentence)
  const logActivity = useStore((s) => s.logActivity)
  const [pos, setPos] = useState(0)
  const [log, setLog] = useState<SpeakAnswer[]>([])

  const set = src.startsWith('sound:') ? SOUND_SETS.find((x) => `sound:${x.id}` === src) : undefined

  const onAnswered = (a: SpeakAnswer) => {
    setLog((l) => [...l, a])
    if (a.attempts > 0) {
      recordSentence('speaking', a.sentence.id, a.score)
      if (a.match) noteSpeaking(a.sentence, a.match)
      logActivity(a.score >= 60, { skill: 'speaking' })
    }
  }

  if (!items.length)
    return (
      <FocusShell progress={0} exitTo="/speaking" label="Speaking">
        <Stack align="center" ta="center" gap="xs" pt="xl">
          <Title order={1} className="fr" fz={28} fw={600}>
            No sentences here yet
          </Title>
          <Button component={Link} to="/speaking" mt="sm">
            Choose other sentences
          </Button>
        </Stack>
      </FocusShell>
    )

  if (pos >= items.length)
    return (
      <FocusShell progress={1} exitTo="/speaking" label="Speaking" count={`${items.length}/${items.length}`}>
        <SpeakingSummary log={log} />
      </FocusShell>
    )

  return (
    <FocusShell progress={pos / items.length} exitTo="/speaking" label="Speaking" count={`${pos + 1}/${items.length}`}>
      <SpeakQuestion
        key={items[pos].id + pos}
        sentence={items[pos]}
        mode={mode}
        context={
          set && pos === 0 ? (
            <Callout kind="tip">
              <strong>{set.title}.</strong> {set.tip}
            </Callout>
          ) : undefined
        }
        onAnswered={onAnswered}
        onContinue={() => setPos((p) => p + 1)}
      />
    </FocusShell>
  )
}

function SpeakingSummary({ log }: { log: SpeakAnswer[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useHotkeys({ Enter: () => navigate('/speaking') })
  const tried = log.filter((x) => x.attempts > 0)
  const avg = tried.length ? Math.round(tried.reduce((a, x) => a + x.score, 0) / tried.length) : 0
  return (
    <Stack align="center" ta="center" gap="xs" pt="xl">
      <CheckCircle2 size={44} color="var(--mantine-color-green-6)" aria-hidden />
      <Title order={1} className="fr" fz={28} fw={600}>
        Bien parlé&nbsp;!
      </Title>
      <Text c="dimmed">
        {tried.length} sentence{tried.length === 1 ? '' : 's'} spoken{tried.length ? ` · average ${avg}%` : ''}
      </Text>
      <Group justify="center" gap="sm" mt="md">
        <Button size="lg" variant="default" onClick={() => navigate(`/speaking/session?${params.toString()}&r=${Date.now()}`)} leftSection={<RotateCcw size={17} aria-hidden />}>
          Again
        </Button>
        <Button component={Link} to="/speaking" size="lg" rightSection={<Kbd>↵</Kbd>}>
          Done
        </Button>
      </Group>
      <Card padding={0} w="100%" ta="left" mt="lg">
        {log.map((x, i) => {
          const missed = x.match ? x.match.words.filter((_, k) => !x.match!.heard[k]) : []
          return (
            <Group
              key={i}
              align="flex-start"
              wrap="nowrap"
              gap={10}
              px="md"
              py="sm"
              style={i ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}
            >
              <SpeakButton text={x.sentence.fr} size="sm" />
              <Box flex={1} miw={0}>
                <Text className="fr" lang="fr" fw={700} fz={17}>
                  {frTypo(x.sentence.fr)}
                </Text>
                {missed.length > 0 && (
                  <Text size="sm" c="dimmed">
                    Not caught: <span lang="fr">{missed.map(frTypo).join(', ')}</span>
                  </Text>
                )}
              </Box>
              <Badge className="tnum" color={x.attempts === 0 ? 'gray' : x.score >= 90 ? 'green' : x.score >= 60 ? 'orange' : 'red'}>
                {x.attempts === 0 ? 'skipped' : `${x.score}%`}
              </Badge>
            </Group>
          )
        })}
      </Card>
    </Stack>
  )
}
