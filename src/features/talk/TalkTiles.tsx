import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Chip, Group, NativeSelect, Stack, Text, TextInput, ThemeIcon } from '@mantine/core'
import { Check, MessagesSquare } from 'lucide-react'
import { SCENARIO_BY_ID } from '../../data/scenarios'
import type { Scenario } from '../../data/types'
import { LEVELS, type Level } from '../../data/types'
import { ConnectAiCard } from '../../components/AiSetup'
import { Dialog } from '../../components/Dialog'
import { LevelBadge } from '../../components/ui'
import { Tile } from '../../components/Tile'
import { useAiConfig } from '../../lib/ai'
import { ago } from '../../lib/date'
import { frTypo } from '../../lib/words'
import { FREE_TOPICS, SCENARIO_ICONS, useStartConversation } from './start'
import type { Conversation } from './types'

/** A role-play situation: starts a new conversation when opened. */
export function ScenarioTile({ s, done }: { s: Scenario; done?: boolean }) {
  const navigate = useNavigate()
  const ai = useAiConfig()
  const start = useStartConversation()
  const Icon = SCENARIO_ICONS[s.icon] ?? MessagesSquare
  return (
    <Tile
      onClick={() => (ai ? navigate(`/talk/${start({ scenarioId: s.id, level: s.level })}`) : navigate('/settings#ai'))}
      top={
        <>
          <ThemeIcon size={26} radius="sm" variant="light">
            <Icon size={15} />
          </ThemeIcon>
          <LevelBadge level={s.level} />
        </>
      }
      corner={
        done && (
          <Badge color="green" size="sm" leftSection={<Check size={12} aria-hidden />}>
            done
          </Badge>
        )
      }
      title={frTypo(s.titleFr)}
      fr
      sub={s.title}
      foot={ai ? `${s.goals.length} goals · with ${s.aiName}` : 'Connect an AI to start'}
    />
  )
}

/** A conversation you had (or started). */
export function ConversationTile({ c }: { c: Conversation }) {
  const mine = c.turns.filter((t) => t.role === 'me').length
  const sc = SCENARIO_BY_ID[c.scenarioId]
  const score = c.feedback?.score
  return (
    <Tile
      to={`/talk/${c.id}`}
      done={!!c.feedback}
      top={
        <>
          <ThemeIcon size={26} radius="sm" variant="light">
            <MessagesSquare size={15} />
          </ThemeIcon>
          <LevelBadge level={c.level} />
        </>
      }
      corner={score !== undefined && <Badge color={score >= 85 ? 'green' : score >= 60 ? 'orange' : 'red'} className="tnum">{score}</Badge>}
      title={frTypo(c.title)}
      fr
      sub={`${mine} message${mine === 1 ? '' : 's'}${sc ? ` · ${c.goalsMet.length}/${sc.goals.length} goals` : ''}`}
      foot={ago(c.updatedAt)}
    />
  )
}

/** Free conversation with Camille, on any topic. */
export function FreeTalkDialog({ open, onClose, defaultLevel }: { open: boolean; onClose: () => void; defaultLevel: Level }) {
  const navigate = useNavigate()
  const ai = useAiConfig()
  const start = useStartConversation()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<Level>(defaultLevel)
  const go = () => {
    onClose()
    navigate(`/talk/${start({ scenarioId: 'free', level, topic })}`)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Free conversation"
      actions={
        ai && (
          <>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={go}>Start</Button>
          </>
        )
      }
    >
      {!ai ? (
        <ConnectAiCard title="Connect an AI to start talking" />
      ) : (
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            Chat about anything with Camille, a friendly French speaker. Your messages get quietly corrected as you go.
          </Text>
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <TextInput
              flex={1}
              label="Topic"
              description="Optional"
              value={topic}
              onChange={(e) => setTopic(e.currentTarget.value)}
              placeholder="e.g. les vacances"
              onKeyDown={(e) => e.key === 'Enter' && go()}
              data-autofocus
            />
            <NativeSelect w={84} label="Level" value={level} onChange={(e) => setLevel(e.currentTarget.value as Level)} data={[...LEVELS]} />
          </Group>
          <Group gap={6}>
            {FREE_TOPICS.map((t) => (
              <Chip key={t} size="xs" checked={topic === t} onChange={() => setTopic(t)}>
                {t}
              </Chip>
            ))}
          </Group>
        </Stack>
      )}
    </Dialog>
  )
}
