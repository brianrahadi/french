import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Container, Group, SegmentedControl, SimpleGrid, Text, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import { VERBS } from '../../data/verbs'
import { Empty } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'

type Filter = 'all' | 'irr' | 'er' | 'ir' | 're' | 'etre'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'irr', label: 'Irregular' },
  { id: 'er', label: '-er' },
  { id: 'ir', label: '-ir' },
  { id: 're', label: '-re' },
  { id: 'etre', label: 'With être' },
]

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function VerbsPage() {
  useDocumentTitle('Verb tables')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const stats = useStore((s) => s.conj)

  const acc = useMemo(() => {
    const m = new Map<string, { seen: number; correct: number }>()
    for (const [k, s] of Object.entries(stats)) {
      const inf = k.split('|')[0]
      const e = m.get(inf) ?? { seen: 0, correct: 0 }
      e.seen += s.seen
      e.correct += s.correct
      m.set(inf, e)
    }
    return m
  }, [stats])

  const list = VERBS.filter((v) => {
    if (filter === 'etre' && v.aux !== 'etre') return false
    if (filter !== 'all' && filter !== 'etre' && v.group !== filter) return false
    if (!q) return true
    const n = strip(q)
    return strip(v.inf).includes(n) || v.en.toLowerCase().includes(n)
  }).sort((a, b) => a.inf.localeCompare(b.inf, 'fr'))

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="Tableaux de conjugaison"
        title="Verb tables"
        subtitle="Every verb in every tense, with audio. Tap a verb to see its full conjugation."
      />
      <Group gap="sm" mb="md">
        <TextInput
          flex="1 1 260px"
          type="search"
          leftSection={<Search size={17} aria-hidden />}
          placeholder="Search a verb (French or English)…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          aria-label="Search verbs"
        />
        <SegmentedControl aria-label="Filter verbs" value={filter} onChange={(v) => setFilter(v as Filter)} data={FILTERS.map((f) => ({ value: f.id, label: f.label }))} />
      </Group>
      {list.length === 0 ? (
        <Empty icon={<Search size={30} />} title="No verbs found">
          Only the {VERBS.length} most useful verbs are included so far.
        </Empty>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing={10}>
          {list.map((v) => {
            const a = acc.get(v.inf)
            const pct = a && a.seen ? a.correct / a.seen : null
            return (
              <Card key={v.inf} component={Link} to={`/verbs/${encodeURIComponent(v.inf)}`} padding="md" style={{ color: 'inherit', textDecoration: 'none' }}>
                <Text className="fr" lang="fr" fz={20} fw={600} lh={1.3}>
                  {v.inf}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  {v.en}
                </Text>
                <Group gap={6} mt="xs">
                  {v.group === 'irr' ? <Badge color="orange">irregular</Badge> : <Badge color="gray">-{v.group}</Badge>}
                  {v.aux === 'etre' && <Badge color="indigo">être</Badge>}
                  {pct !== null && (
                    <Badge color={pct >= 0.8 ? 'green' : 'gray'} className="tnum" ml="auto" title="Drill accuracy">
                      {Math.round(pct * 100)}%
                    </Badge>
                  )}
                </Group>
              </Card>
            )
          })}
        </SimpleGrid>
      )}
    </Container>
  )
}
