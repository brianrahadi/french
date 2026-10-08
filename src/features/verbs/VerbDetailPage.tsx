import { useNavigate, useParams } from 'react-router'
import { Badge, Button, Card, Container, Group, SimpleGrid, Table, Text, Title, UnstyledButton } from '@mantine/core'
import { Play } from 'lucide-react'
import { VERB_BY_INF, hasTense } from '../../data/verbs'
import { TENSES, conjugate, pastParticiple, presentParticiple, tablePronoun } from '../../lib/conjugate'
import { LevelBadge } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { SpeakButton, useSpeak } from '../../components/SpeakButton'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'

export default function VerbDetailPage() {
  const { inf = '' } = useParams()
  const v = VERB_BY_INF[decodeURIComponent(inf)]
  const navigate = useNavigate()
  const say = useSpeak()
  useDocumentTitle(v ? v.inf : 'Verb')

  if (!v) {
    return (
      <Container size={960} py="xl">
        <PageHeader back={{ to: '/verbs', label: 'Verb tables' }} title="Verb not found" />
      </Container>
    )
  }

  const tenses = TENSES.filter((t) => hasTense(v, t.id))

  return (
    <Container size={960} py="xl">
      <PageHeader
        back={{ to: '/verbs', label: 'Verb tables' }}
        title={v.inf}
        fr
        subtitle={v.en}
        actions={
          <Button
            leftSection={<Play size={17} aria-hidden />}
            onClick={() => navigate(`/conjugation/drill?verbs=${encodeURIComponent(v.inf)}&tenses=${tenses.filter((t) => t.level !== 'B2').map((t) => t.id).join(',')}&n=15`)}
          >
            Drill this verb
          </Button>
        }
      >
        <Group gap="xs" mt="sm">
          <SpeakButton text={v.inf} />
          {v.group === 'irr' ? <Badge color="orange">irregular</Badge> : <Badge color="gray">regular -{v.group}</Badge>}
          <Badge color={v.aux === 'etre' ? 'blue' : 'gray'}>auxiliary: {v.aux === 'etre' ? 'être' : 'avoir'}</Badge>
          <Badge color="gray" tt="none">
            past participle:{' '}
            <span lang="fr">{pastParticiple(v)}</span>
          </Badge>
          <Badge color="gray" tt="none">
            present participle:{' '}
            <span lang="fr">{presentParticiple(v)}</span>
          </Badge>
        </Group>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {tenses.map((t) => {
          const cells = conjugate(v, t.id)
          return (
            <Card key={t.id} component="section" padding="md" aria-labelledby={`t-${t.id}`}>
              <Group justify="space-between" gap={8} mb="xs">
                <Title order={2} id={`t-${t.id}`} fz={15} fw={680}>
                  {t.label}
                </Title>
                <LevelBadge level={t.level} />
              </Group>
              <Table highlightOnHover withRowBorders={false} horizontalSpacing={0} verticalSpacing={0}>
                <Table.Tbody>
                  {cells.map((c) => {
                    const pr = tablePronoun(t.id, c.person, c.display, v.inf)
                    const spoken = t.id === 'imperatif' ? c.display : `${pr.split('/')[0].replace(/^\(|\)$/g, '')}${pr.endsWith("'") ? '' : ' '}${c.display.replace(/\(.*?\)/g, '')}`
                    return (
                      <Table.Tr key={c.person}>
                        <Table.Td>
                          <UnstyledButton w="100%" px={8} py={4} className="fr" fz={17} lang="fr" title="Listen" onClick={() => say(spoken)}>
                            <Text span c="dimmed" fz="inherit">
                              {frTypo(pr)}
                            </Text>
                            {pr && !pr.endsWith("'") ? ' ' : ''}
                            {c.display}
                          </UnstyledButton>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          )
        })}
      </SimpleGrid>
    </Container>
  )
}
