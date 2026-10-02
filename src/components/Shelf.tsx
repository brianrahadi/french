import type { ReactNode } from 'react'
import { Box, Group, Scroller, Text, Title } from '@mantine/core'

/**
 * A titled row of cards that scrolls sideways (like a library shelf), so a page
 * can show many collections without growing tall.
 */
export function Shelf({
  title,
  count,
  action,
  hint,
  children,
}: {
  title: ReactNode
  count?: number
  /** Something on the right of the title, e.g. a filter or a "see all" link. */
  action?: ReactNode
  /** One short line under the title. */
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <Box component="section" mt="xl">
      <Group justify="space-between" gap="sm" mb={hint ? 2 : 'xs'}>
        <Title order={2} size="h4">
          <Group component="span" gap={8} wrap="nowrap">
            {title}
            {count !== undefined && (
              <Text span c="dimmed" size="sm" fw={500} className="tnum">
                {count}
              </Text>
            )}
          </Group>
        </Title>
        {action && <Group gap="xs">{action}</Group>}
      </Group>
      {hint && (
        <Text size="sm" c="dimmed" mb="xs">
          {hint}
        </Text>
      )}
      <Scroller draggable={false} edgeGradientColor="var(--bg)" controlSize={36}>
        <Group gap="md" wrap="nowrap" align="stretch" py={4} px={2} style={{ whiteSpace: 'normal' }}>
          {children}
        </Group>
      </Scroller>
    </Box>
  )
}
