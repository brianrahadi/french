import { useMemo } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, type MantineColor } from '@mantine/core'
import { BookOpen, Headphones, Mic, PenLine, Table2, Target } from 'lucide-react'
import { VERBS } from '../../data/verbs'
import { PageHeader } from '../../components/PageHeader'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { dueLessons } from '../grammar/status'
import { countWeakSpots } from '../weak/count'

interface Drill {
  to: string
  icon: React.ReactNode
  color?: MantineColor
  title: string
  meta: string
  badge?: number
}

/** Short drills that train one skill at a time (content to read, hear and talk about lives in the Library). */
export default function PracticeHub() {
  useDocumentTitle('Practice')
  const s = useStore()
  const weak = useMemo(() => countWeakSpots(s), [s])
  const grammarDue = dueLessons(s.lessons).length
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  const drills: Drill[] = [
    {
      to: '/weak',
      icon: <Target size={22} aria-hidden />,
      color: 'pink',
      title: 'Weak spots',
      meta: weak ? plural(weak, 'weak spot') : 'Nothing stands out right now',
      badge: weak,
    },
    {
      to: '/conjugation',
      icon: <PenLine size={22} aria-hidden />,
      title: 'Conjugation',
      meta: Object.keys(s.conj).length ? plural(Object.keys(s.conj).length, 'verb form') + ' practised' : 'Start with the present tense',
    },
    {
      to: '/dictation',
      icon: <Headphones size={22} aria-hidden />,
      color: 'cyan',
      title: 'Dictation',
      meta: Object.keys(s.listening).length ? plural(Object.keys(s.listening).length, 'sentence') + ' written' : 'Start with sentences using your words',
    },
    {
      to: '/speaking',
      icon: <Mic size={22} aria-hidden />,
      color: 'green',
      title: 'Speaking',
      meta: Object.keys(s.speaking).length ? plural(Object.keys(s.speaking).length, 'sentence') + ' spoken' : 'Tricky sounds: u/ou, nasals, the r…',
    },
    {
      to: '/grammar',
      icon: <BookOpen size={22} aria-hidden />,
      color: 'violet',
      title: 'Grammar reviews',
      meta: grammarDue ? `${plural(grammarDue, 'review')} due` : 'No reviews due',
      badge: grammarDue,
    },
    {
      to: '/verbs',
      icon: <Table2 size={22} aria-hidden />,
      color: 'gray',
      title: 'Verb tables',
      meta: `${VERBS.length} verbs`,
    },
  ]

  return (
    <Container size={960} py="xl">
      <PageHeader eyebrow="S’entraîner" title="Practice" />
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'sm', sm: 'md' }}>
        {drills.map((d) => (
          <Card key={d.to} component={Link} to={d.to} c="inherit" td="none" padding="md">
            <Group align="flex-start" wrap="nowrap" gap="md" h="100%">
              <ThemeIcon variant="light" color={d.color} size={44} radius="md">
                {d.icon}
              </ThemeIcon>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }} h="100%">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text fw={650} fz="lg">
                    {d.title}
                  </Text>
                  {!!d.badge && (
                    <Badge color={d.color} className="tnum">
                      {d.badge}
                    </Badge>
                  )}
                </Group>
                <Text size="sm" fw={500}>
                  {d.meta}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  )
}
