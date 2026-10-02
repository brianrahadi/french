import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge, Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { RotateCcw, Trophy } from 'lucide-react'
import { TENSE_BY_ID, type Tense } from '../../lib/conjugate'
import { FocusShell } from '../../components/FocusShell'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { fullForm, makeDrill, poolFor, type DrillItem } from './drill'
import { frTypo } from '../../lib/words'
import { DrillQuestion, type DrillAnswer } from './DrillQuestion'
import { noteConj } from '../../lib/mistakes'

type Answered = DrillAnswer

function useInitialItems(): DrillItem[] {
  const [params] = useSearchParams()
  const config = useStore((s) => s.conjConfig)
  const stats = useStore.getState().conj
  const key = params.toString()
  return useMemo(() => {
    const verbsParam = params.get('verbs')
    const tensesParam = params.get('tenses')
    const n = Number(params.get('n') ?? config.length)
    const verbs = verbsParam ? poolFor({ set: 'custom', custom: verbsParam.split(',') }) : poolFor(config)
    const tenses = (tensesParam ? tensesParam.split(',') : config.tenses).filter((t): t is Tense => t in TENSE_BY_ID)
    return makeDrill(verbs, tenses.length ? tenses : ['present'], stats, n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Remount the drill whenever the query changes (new drill, drill my mistakes). */
export default function DrillRoute() {
  const [params] = useSearchParams()
  return <DrillSession key={params.toString()} />
}

function DrillSession() {
  useDocumentTitle('Conjugation drill')
  const initial = useInitialItems()
  const navigate = useNavigate()
  const recordConj = useStore((s) => s.recordConj)
  const logActivity = useStore((s) => s.logActivity)

  const [queue, setQueue] = useState<DrillItem[]>(initial)
  const [pos, setPos] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [log, setLog] = useState<Answered[]>([])
  const [requeued, setRequeued] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)

  const total = initial.length
  const item = queue[pos]

  if (!total) {
    return (
      <FocusShell progress={0} exitTo="/conjugation" label="Drill">
        <Stack align="center" ta="center" gap="xs" pt="xl">
          <Title order={1} className="fr" fz={28} fw={600}>
            Nothing to drill
          </Title>
          <Text c="dimmed">Pick at least one tense and a verb set.</Text>
          <Button component={Link} to="/conjugation" mt="sm">
            Set up a drill
          </Button>
        </Stack>
      </FocusShell>
    )
  }

  const onAnswered = (a: Answered) => {
    setAnswered(true)
    const firstTime = pos < total
    if (firstTime) {
      setLog((l) => [...l, a])
      recordConj(a.item.inf, a.item.tense, a.pass)
      noteConj(a.item.inf, a.item.tense, { pass: a.pass, given: a.given, expected: fullForm(a.item) })
    }
    logActivity(a.pass)
    if (!a.pass && !requeued.has(pos) && firstTime) {
      setQueue((q) => [...q, a.item])
      setRequeued((r) => new Set(r).add(pos))
    }
  }

  const next = () => {
    if (pos + 1 >= queue.length) {
      setDone(true)
      return
    }
    setPos((p) => p + 1)
    setAnswered(false)
  }

  const firstAnswers = log
  const correct = firstAnswers.filter((a) => a.pass).length

  if (done) {
    const mistakes = firstAnswers.filter((a) => !a.pass)
    const pct = Math.round((correct / total) * 100)
    const retryUrl = () => {
      const verbs = [...new Set(mistakes.map((m) => m.item.inf))].join(',')
      const tenses = [...new Set(mistakes.map((m) => m.item.tense))].join(',')
      return `/conjugation/drill?verbs=${encodeURIComponent(verbs)}&tenses=${tenses}&n=${Math.max(10, mistakes.length * 2)}`
    }
    return (
      <FocusShell progress={1} exitTo="/conjugation" label="Drill" count={`${total}/${total}`}>
        <Stack align="center" ta="center" gap="xs" pt="xl">
          <Trophy size={40} color={pct >= 80 ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-orange-6)'} aria-hidden />
          <Text className="fr tnum" fz={64} fw={600} lh={1} lts="-0.03em">
            {pct}%
          </Text>
          <Title order={1} className="fr" fz={28} fw={600}>
            {pct === 100 ? 'Sans faute !' : pct >= 80 ? 'Très bien !' : 'Continue comme ça !'}
          </Title>
          <Text c="dimmed">
            {correct} of {total} right on the first try.
          </Text>
          <Group justify="center" gap="sm" mt="md">
            {mistakes.length > 0 && (
              <Button size="lg" onClick={() => navigate(retryUrl())} autoFocus leftSection={<RotateCcw size={17} aria-hidden />}>
                Drill my mistakes
              </Button>
            )}
            <Button size="lg" variant="default" onClick={() => navigate(`/conjugation/drill?seed=${Date.now()}`)}>
              New drill
            </Button>
            <Button component={Link} to="/conjugation" size="lg" variant={mistakes.length ? 'subtle' : 'filled'} color={mistakes.length ? 'gray' : undefined}>
              Done
            </Button>
          </Group>
          {mistakes.length > 0 && (
            <Card padding={0} w="100%" ta="left" mt="lg">
              <Title order={2} size="h5" c="dimmed" tt="uppercase" px="md" pt="md" pb="xs">
                To review
              </Title>
              {mistakes.map((m, i) => (
                <Box key={i} px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                  <Text size="sm" c="dimmed">
                    {m.item.inf} · {TENSE_BY_ID[m.item.tense].label}
                  </Text>
                  <Group gap="sm" className="fr" lang="fr" fz={17}>
                    {m.given && (
                      <Text span c="red" td="line-through" fz="inherit">
                        {m.given}
                      </Text>
                    )}
                    <Text span fw={700} fz="inherit">
                      {frTypo(fullForm(m.item))}
                    </Text>
                  </Group>
                </Box>
              ))}
            </Card>
          )}
        </Stack>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      progress={Math.min(pos, total) / total}
      count={`${Math.min(firstAnswers.length + (answered ? 0 : 1), total)}/${total}`}
      exitTo="/conjugation"
      label="Drill"
    >
      <DrillQuestion
        key={pos}
        item={item}
        badge={pos >= total ? <Badge color="orange">Retry</Badge> : undefined}
        onAnswered={onAnswered}
        onContinue={next}
      />
    </FocusShell>
  )
}
