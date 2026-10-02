import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Anchor, Badge, Box, Button, Card, Chip, Container, Group, SegmentedControl, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { Play, Search, Table2, Target } from 'lucide-react'
import { TENSES, type Tense } from '../../lib/conjugate'
import { VERBS, VERB_SETS } from '../../data/verbs'
import { LEVELS } from '../../data/types'
import { Dialog } from '../../components/Dialog'
import { PageHeader } from '../../components/PageHeader'
import { Kbd, LevelBadge, ProgressBar } from '../../components/ui'
import { useStore, type ConjConfig } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { accuracy, poolFor } from './drill'

export default function ConjugationPage() {
  useDocumentTitle('Conjugation')
  const config = useStore((s) => s.conjConfig)
  const setConfig = useStore((s) => s.setConjConfig)
  const stats = useStore((s) => s.conj)
  const navigate = useNavigate()
  const [picker, setPicker] = useState(false)

  const pool = poolFor(config)
  const canStart = config.tenses.length > 0 && pool.length > 0
  const start = () => canStart && navigate(`/conjugation/drill?seed=${Date.now()}`)
  useHotkeys({ Enter: start })

  const tenseStats = useMemo(
    () =>
      TENSES.map((t) => {
        let seen = 0
        let correct = 0
        for (const [k, s] of Object.entries(stats))
          if (k.endsWith(`|${t.id}`)) {
            seen += s.seen
            correct += s.correct
          }
        return { t, seen, acc: seen ? correct / seen : null }
      }),
    [stats],
  )

  const weakest = useMemo(() => {
    const byVerb = new Map<string, { recent: number[] }>()
    for (const [k, s] of Object.entries(stats)) {
      const inf = k.split('|')[0]
      const e = byVerb.get(inf) ?? { recent: [] }
      e.recent.push(...s.recent)
      byVerb.set(inf, e)
    }
    return [...byVerb.entries()]
      .filter(([, e]) => e.recent.length >= 2)
      .map(([inf, e]) => ({ inf, acc: accuracy({ seen: 0, correct: 0, recent: e.recent, lastAt: '' })! }))
      .filter((x) => x.acc < 0.9)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 8)
  }, [stats])

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Conjugaison"
        title="Conjugation"
        actions={
          <Button component={Link} to="/verbs" variant="default" leftSection={<Table2 size={17} aria-hidden />}>
            Verb tables
          </Button>
        }
      />

      <Card>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Tenses
            </Text>
            <Chip.Group multiple value={config.tenses} onChange={(v) => setConfig({ tenses: v as Tense[] })}>
              <Stack gap={10}>
                {LEVELS.map((lvl) => {
                  const ts = TENSES.filter((t) => t.level === lvl)
                  if (!ts.length) return null
                  return (
                    <Group key={lvl} gap="xs">
                      <LevelBadge level={lvl} />
                      {ts.map((t) => (
                        <Chip key={t.id} value={t.id} size="sm">
                          {t.label}
                        </Chip>
                      ))}
                    </Group>
                  )
                })}
              </Stack>
            </Chip.Group>
          </div>

          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Verbs
            </Text>
            <Group gap="sm">
              <SegmentedControl
                aria-label="Verb set"
                value={config.set}
                onChange={(id) => (id === 'custom' ? setPicker(true) : setConfig({ set: id as ConjConfig['set'] }))}
                data={[...VERB_SETS, { id: 'custom' as const, label: 'Choose…', description: '' }].map((s) => ({
                  value: s.id,
                  label:
                    s.id === 'custom' ? (
                      // Clicking "Choose…" again (already selected) must still reopen the picker.
                      <span onClick={() => setPicker(true)}>{s.label}</span>
                    ) : (
                      <span title={s.description}>{s.label}</span>
                    ),
                }))}
              />
              <Text size="sm" c="dimmed">
                {pool.length} verb{pool.length === 1 ? '' : 's'}
                {config.set === 'custom' && config.custom.length > 0 && `: ${config.custom.slice(0, 4).join(', ')}${config.custom.length > 4 ? '…' : ''}`}
              </Text>
            </Group>
          </div>

          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Length
            </Text>
            <SegmentedControl
              aria-label="Number of questions"
              value={String(config.length)}
              onChange={(v) => setConfig({ length: Number(v) })}
              data={[10, 20, 40].map((n) => ({ value: String(n), label: `${n} questions` }))}
            />
          </div>

          <Group justify="flex-end" gap="sm">
            {!config.tenses.length && (
              <Text size="sm" c="dimmed">
                Pick at least one tense
              </Text>
            )}
            <Button size="lg" disabled={!canStart} onClick={start} leftSection={<Play size={18} aria-hidden />} rightSection={<Kbd>↵</Kbd>}>
              Start drill
            </Button>
          </Group>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <Card>
          <Text fw={650} mb="md">
            Accuracy by tense
          </Text>
          <Stack gap="sm">
            {tenseStats.map(({ t, seen, acc }) => (
              <Group key={t.id} gap="sm" wrap="nowrap">
                <Text size="sm" w={150} flex="none">
                  {t.label}
                </Text>
                <Box flex={1}>
                  <ProgressBar value={acc ?? 0} label={`${t.label} accuracy`} variant={acc !== null && acc >= 0.8 ? 'success' : undefined} thin />
                </Box>
                <Text size="sm" c="dimmed" className="tnum" w={40} ta="right">
                  {acc === null ? '—' : `${Math.round(acc * 100)}%`}
                </Text>
                <span className="sr-only">{seen} answers</span>
              </Group>
            ))}
          </Stack>
        </Card>
        <Card>
          <Group justify="space-between" mb="md">
            <Text fw={650}>Weak spots</Text>
            {weakest.length > 0 && (
              <Button
                variant="default"
                size="xs"
                leftSection={<Target size={15} aria-hidden />}
                onClick={() => navigate(`/conjugation/drill?verbs=${weakest.map((w) => w.inf).join(',')}&tenses=${config.tenses.join(',') || 'present'}&n=20`)}
              >
                Drill these
              </Button>
            )}
          </Group>
          {weakest.length ? (
            <Stack component="ul" gap="xs" m={0} p={0} style={{ listStyle: 'none' }}>
              {weakest.map((w) => (
                <Group component="li" key={w.inf} justify="space-between">
                  <Anchor component={Link} to={`/verbs/${encodeURIComponent(w.inf)}`} className="fr" lang="fr">
                    {w.inf}
                  </Anchor>
                  <Badge color="orange" className="tnum">
                    {Math.round(w.acc * 100)}%
                  </Badge>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Verbs you get wrong will show up here after a few drills.
            </Text>
          )}
        </Card>
      </SimpleGrid>

      <VerbPicker open={picker} onClose={() => setPicker(false)} config={config} setConfig={setConfig} />
    </Container>
  )
}

function VerbPicker({
  open,
  onClose,
  config,
  setConfig,
}: {
  open: boolean
  onClose: () => void
  config: ConjConfig
  setConfig: (c: Partial<ConjConfig>) => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>(config.custom)
  const list = VERBS.filter((v) => !q || v.inf.includes(q.toLowerCase()) || v.en.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose verbs"
      wide
      actions={
        <>
          <Button variant="subtle" color="gray" onClick={() => setSel([])}>
            Clear
          </Button>
          <Button
            disabled={!sel.length}
            onClick={() => {
              setConfig({ set: 'custom', custom: sel })
              onClose()
            }}
          >
            Use {sel.length} verb{sel.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <TextInput
        my="sm"
        type="search"
        leftSection={<Search size={17} aria-hidden />}
        placeholder="Search verbs…"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        aria-label="Search verbs"
        data-autofocus
      />
      <Chip.Group multiple value={sel} onChange={setSel}>
        <Group gap={6}>
          {list.map((v) => (
            <Chip key={v.inf} value={v.inf} size="sm" lang="fr">
              {v.inf}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Dialog>
  )
}
