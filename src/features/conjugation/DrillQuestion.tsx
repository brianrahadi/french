import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Group, Table, Text, TextInput } from '@mantine/core'
import { VERB_BY_INF } from '../../data/verbs'
import { TENSE_BY_ID, conjugate, tablePronoun, type Tense } from '../../lib/conjugate'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { CheckBar } from '../../components/CheckBar'
import { AccentBar } from '../../components/AccentBar'
import { Diff } from '../../components/Diff'
import { SpeakButton } from '../../components/SpeakButton'
import { LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { frTypo } from '../../lib/words'
import type { Verdict } from '../../lib/answer'
import { praise } from '../grammar/grade'
import { fullForm, gradeDrill, promptPronoun, type DrillItem } from './drill'

const VERDICT_INPUT: Record<Verdict, CSSProperties> = {
  correct: { borderColor: 'var(--mantine-color-green-6)', backgroundColor: 'var(--mantine-color-green-light)' },
  almost: { borderColor: 'var(--mantine-color-orange-6)', backgroundColor: 'var(--mantine-color-orange-light)' },
  wrong: { borderColor: 'var(--mantine-color-red-6)', backgroundColor: 'var(--mantine-color-red-light)' },
}

export interface DrillAnswer {
  item: DrillItem
  given: string
  verdict: Verdict
  pass: boolean
  expected: string
}

/**
 * One conjugation question with its feedback. Mount with a fresh `key` per question.
 */
export function DrillQuestion({
  item,
  badge,
  onAnswered,
  onContinue,
}: {
  item: DrillItem
  badge?: ReactNode
  onAnswered: (a: DrillAnswer) => void
  onContinue: () => void
}) {
  const strict = useStore((s) => s.settings.strictAccents)
  const autoplay = useStore((s) => s.settings.autoplay)
  const [value, setValue] = useState('')
  const [result, setResult] = useState<DrillAnswer | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const check = (giveUp = false) => {
    if (result) return
    const g = giveUp ? { verdict: 'wrong' as Verdict, expected: gradeDrill(item, '').expected } : gradeDrill(item, value)
    const pass = g.verdict === 'correct' || (g.verdict === 'almost' && !strict)
    const a: DrillAnswer = { item, given: giveUp ? '' : value, verdict: g.verdict, pass, expected: g.expected }
    setResult(a)
    onAnswered(a)
  }

  const v = VERB_BY_INF[item.inf]
  const tense = TENSE_BY_ID[item.tense]
  const pronoun = promptPronoun(item)
  const answered = !!result

  return (
    <>
      <Group gap={8} mb="sm">
        <LevelBadge level={tense.level} />
        <Text size="xs" fw={650} c="dimmed" tt="uppercase" lts="0.05em">
          {tense.label}
        </Text>
        <Text size="sm" c="dimmed">
          · {tense.en}
        </Text>
        {badge}
      </Group>
      <Group gap="4px 14px" align="baseline">
        <Text component="span" className="fr" lang="fr" fz={{ base: 32, sm: 42 }} fw={560} lh={1.2}>
          {v.inf}
        </Text>
        <Text component="span" c="dimmed">
          {v.en}
        </Text>
      </Group>

      <Group gap="sm" mt="xl" wrap="nowrap" lang="fr">
        {pronoun && (
          <Text component="span" className="fr" fz={21} c="dimmed" flex="none" style={{ whiteSpace: 'nowrap' }}>
            {frTypo(pronoun)}
          </Text>
        )}
        <TextInput
          ref={ref}
          flex={1}
          size="xl"
          className={result && !result.pass ? 'shake' : undefined}
          classNames={{ input: 'fr' }}
          styles={{ input: { fontSize: '1.3125rem', borderWidth: 2, ...(result ? VERDICT_INPUT[result.verdict] : null) } }}
          value={value}
          autoFocus
          readOnly={answered}
          placeholder={item.tense === 'imperatif' ? 'imperative form…' : 'conjugated form…'}
          aria-label={`${v.inf}, ${tense.label}, ${pronoun || 'imperative'}`}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !answered) {
              e.preventDefault()
              if (value.trim()) check()
            }
          }}
        />
      </Group>
      {!answered && <AccentBar inputRef={ref} onInsert={setValue} />}

      {answered && <MiniTable inf={item.inf} tense={item.tense} person={item.person} />}

      {!result ? (
        <CheckBar onCheck={() => check()} disabled={!value.trim()} onSkip={() => check(true)} skipLabel="Show answer" />
      ) : (
        <FeedbackSheet
          verdict={result.verdict}
          title={result.verdict === 'correct' ? praise() : result.verdict === 'almost' ? 'Almost — check the accents' : result.given ? 'Not quite' : 'Here’s the answer'}
          onContinue={onContinue}
        >
          <Group gap={6} mt={6} wrap="nowrap" className="fr" fz={18}>
            <SpeakButton text={fullForm(item)} size="sm" autoPlay={autoplay} label="Listen" />
            {result.verdict !== 'correct' && result.given ? (
              <Diff given={result.given} expected={result.expected} />
            ) : (
              <Text component="strong" fw={700} fz="inherit" lang="fr">
                {frTypo(fullForm(item))}
              </Text>
            )}
          </Group>
          {(item.person === 2 || item.person === 5) &&
            v.aux === 'etre' &&
            ['passeCompose', 'plusQueParfait', 'conditionnelPasse'].includes(item.tense) && (
              <Text size="sm" c="dimmed" mt="xs" maw="62ch">
                With être, the past participle agrees with the subject ({item.gender === 'f' ? 'feminine' : 'masculine'}
                {item.person === 5 ? ' plural' : ''}).
              </Text>
            )}
        </FeedbackSheet>
      )}
    </>
  )
}

/** The whole tense, the asked-for person highlighted: je/tu/il in the left column, nous/vous/ils in the right. */
function MiniTable({ inf, tense, person }: { inf: string; tense: Tense; person: number }) {
  const v = VERB_BY_INF[inf]
  const cells = conjugate(v, tense)
  const rows = [0, 1, 2].filter((i) => cells[i])
  const cell = (c: (typeof cells)[number] | undefined) => {
    if (!c) return <Table.Td />
    const pr = tablePronoun(tense, c.person, c.display, v.inf)
    const target = c.person === person
    return (
      <Table.Td key={c.person} lang="fr" bg={target ? 'var(--mantine-primary-color-light)' : undefined}>
        <Text span c="dimmed" fz="inherit">
          {frTypo(pr)}
        </Text>
        {pr && !pr.endsWith("'") ? ' ' : ''}
        <Text span fw={target ? 650 : undefined} fz="inherit">
          {c.display}
        </Text>
      </Table.Td>
    )
  }
  return (
    <Card mt="xl" padding="sm">
      <Table className="fr" fz={16.5} withRowBorders={false} verticalSpacing={4} aria-label={`${inf} in the ${TENSE_BY_ID[tense].label}`}>
        <Table.Tbody>
          {rows.map((i) => (
            <Table.Tr key={i}>
              {cell(cells[i])}
              {cells.length > 3 && cell(cells[i + 3])}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  )
}
