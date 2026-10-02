import { useMemo } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Container, Group, SimpleGrid, Text, ThemeIcon, type MantineColor } from '@mantine/core'
import { ArrowRight, AudioLines, BookOpenText, Headphones, MessagesSquare, Mic, NotebookPen, Sparkles, Target } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { PageHeader } from '../../components/PageHeader'
import { computeWeakSpots } from '../weak/weak'

const TONE_COLOR: Record<NonNullable<Skill['tone']>, MantineColor> = { green: 'green', pink: 'pink', amber: 'orange' }

interface Skill {
  to: string
  title: string
  fr: string
  icon: React.ReactNode
  tone?: 'green' | 'pink' | 'amber'
  text: string
  meta: string
  ai?: boolean
}

export default function PracticeHub() {
  useDocumentTitle('Practice')
  const ai = useAiConfig()
  const s = useStore()
  const weak = useMemo(() => computeWeakSpots(s), [s])
  const listened = Object.keys(s.listening).length
  const spoken = Object.keys(s.speaking).length
  const read = Object.keys(s.read).length
  const audioDone = Object.values(s.audio ?? {}).filter((a) => a.done).length

  const skills: Skill[] = [
    {
      to: '/weak',
      title: 'Weak spots',
      fr: 'Points faibles',
      icon: <Target size={22} aria-hidden />,
      tone: 'pink',
      text: 'Everything you got wrong, grouped by the rule behind it — with a session that targets it.',
      meta: weak.total ? `${weak.total} weak spot${weak.total > 1 ? 's' : ''} to work on` : 'Nothing stands out right now',
    },
    {
      to: '/audio',
      title: 'Audio lessons',
      fr: 'Cours audio',
      icon: <AudioLines size={22} aria-hidden />,
      text: 'Hands-free lessons like Pimsleur: answer out loud in the pauses; phrases come back until they stick.',
      meta: audioDone ? `${audioDone} lesson${audioDone > 1 ? 's' : ''} done` : 'Start with lesson 1 — about 15 minutes',
    },
    {
      to: '/listening',
      title: 'Listening',
      fr: 'Dictée',
      icon: <Headphones size={22} aria-hidden />,
      text: 'Hear a sentence, write it down, see exactly which sounds you missed.',
      meta: listened ? `${listened} sentence${listened > 1 ? 's' : ''} written` : 'Start with sentences using your words',
    },
    {
      to: '/speaking',
      title: 'Speaking',
      fr: 'Prononciation',
      icon: <Mic size={22} aria-hidden />,
      tone: 'green',
      text: 'Read aloud or repeat after a native voice; see which words came across and compare recordings.',
      meta: spoken ? `${spoken} sentence${spoken > 1 ? 's' : ''} spoken` : 'Tricky sounds: u/ou, nasals, the r…',
    },
    {
      to: '/reading',
      title: 'Reading',
      fr: 'Lecture',
      icon: <BookOpenText size={22} aria-hidden />,
      tone: 'amber',
      text: 'Graded texts or anything you paste. Tap a word for its meaning in context and save it.',
      meta: read ? `${read} text${read > 1 ? 's' : ''} read` : '10 graded texts, A1 to B2',
    },
    {
      to: '/writing',
      title: 'Writing',
      fr: 'Expression écrite',
      icon: <NotebookPen size={22} aria-hidden />,
      tone: 'amber',
      text: 'Write short texts; get every mistake explained and a more natural version.',
      meta: s.writings.length ? `${s.writings.length} text${s.writings.length > 1 ? 's' : ''} corrected` : '20 prompts from A1 to B2',
      ai: true,
    },
    {
      to: '/talk',
      title: 'Conversation',
      fr: 'Conversation',
      icon: <MessagesSquare size={22} aria-hidden />,
      tone: 'green',
      text: 'Role-play real situations with an AI partner; your messages are corrected as you go.',
      meta: s.conversations.length ? `${s.conversations.length} conversation${s.conversations.length > 1 ? 's' : ''}` : '16 situations + free chat',
      ai: true,
    },
  ]

  return (
    <Container size={960} py="xl">
      <PageHeader
        eyebrow="S’entraîner"
        title="Practice"
        subtitle="Use what you’ve learned: listen, speak, read, write and talk — and fix what keeps going wrong."
      />
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {skills.map((k) => (
          <Card key={k.to} component={Link} to={k.to} display="flex" style={{ flexDirection: 'column', gap: 10, color: 'inherit', textDecoration: 'none' }}>
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="light" size={44} radius="md" color={k.tone ? TONE_COLOR[k.tone] : undefined}>
                {k.icon}
              </ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Text fw={650}>{k.title}</Text>
                <Text size="sm" c="dimmed" className="fr" lang="fr">
                  {k.fr}
                </Text>
              </div>
            </Group>
            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
              {k.text}
            </Text>
            <Card.Section withBorder inheritPadding py="sm">
              <Group gap="xs" justify="space-between" wrap="nowrap">
                <Text size="sm">{k.meta}</Text>
                {k.ai && !ai ? (
                  <Badge color="gray" size="sm" title="Needs an AI provider" leftSection={<Sparkles size={12} aria-hidden />}>
                    AI
                  </Badge>
                ) : (
                  <Text c="dimmed" span display="inline-flex">
                    <ArrowRight size={16} aria-hidden />
                  </Text>
                )}
              </Group>
            </Card.Section>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  )
}
