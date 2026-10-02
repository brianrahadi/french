import type { ReactNode } from 'react'
import { Box, Card, Text, Title } from '@mantine/core'
import { frTypo } from '../../lib/words'

const ROW_BORDER = { borderTop: '1px solid var(--mantine-color-default-border)' }

/** A titled card of rows, as on session results. */
export function ResultList({ title, children, mt = 26 }: { title: string; children: ReactNode; mt?: number }) {
  return (
    <Card padding={0} w="100%" mt={mt} ta="left">
      <Title order={2} size="h6" c="dimmed" tt="uppercase" px={18} pt={14}>
        {title}
      </Title>
      {children}
    </Card>
  )
}

/** One row of a ResultList. */
export function ResultRow({ first, children }: { first?: boolean; children: ReactNode }) {
  return (
    <Box px={18} py={14} style={first ? undefined : ROW_BORDER}>
      {children}
    </Box>
  )
}

/** "To review" list after a session: the question, what you wrote (struck) and the right answer. */
export function MistakeList({ items }: { items: { what: string; given: string; expected: string }[] }) {
  return (
    <ResultList title="To review">
      {items.map((m, i) => (
        <ResultRow key={i} first={i === 0}>
          <Text fz={13.5} c="dimmed">
            {m.what}
          </Text>
          <Text className="fr" lang="fr" fz={17} mt={3}>
            {m.given && (
              <Text span c="red" td="line-through" mr={8} inherit>
                {m.given}
              </Text>
            )}
            <strong>{frTypo(m.expected)}</strong>
          </Text>
        </ResultRow>
      ))}
    </ResultList>
  )
}
