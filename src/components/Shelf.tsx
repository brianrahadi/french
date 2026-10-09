import { Children, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Box, Button, Group, Scroller, Stack, Text, Title } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { ArrowRight } from 'lucide-react'
import { FluidTiles } from './Tile'

/** How many cards a shelf shows on a phone before "See all". */
const PHONE_PREVIEW = 2

/**
 * A titled row of cards. On wider screens it scrolls sideways (like a library
 * shelf), so a page can show many collections without growing tall. On phones,
 * where sideways swiping is fiddly, it stacks the first few cards and links to
 * the full list (`to`).
 */
export function Shelf({
  id,
  title,
  count,
  action,
  hint,
  above,
  to,
  children,
}: {
  /** Anchor for links like /library#stories. */
  id?: string
  title: ReactNode
  count?: number
  /** Something on the right of the title, e.g. a filter. */
  action?: ReactNode
  /** One short line under the title. */
  hint?: ReactNode
  /** A block between the title and the row. */
  above?: ReactNode
  /** The page with everything in this shelf. */
  to?: string
  children: ReactNode
}) {
  const phone = useMediaQuery('(max-width: 48em)') ?? false
  const items = Children.toArray(children)
  const [open, setOpen] = useState(false)
  // Without a page to link to, the stack opens in place.
  const cut = !open && items.length > PHONE_PREVIEW + 1
  return (
    <Box component="section" mt="xl" id={id} style={{ scrollMarginTop: 16 }}>
      <Group justify="space-between" gap="sm" mb={hint ? 2 : 'xs'} wrap="nowrap">
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
        <Group gap="xs" wrap="nowrap">
          {action}
          {to && (
            <Button component={Link} to={to} variant="subtle" size="compact-sm" rightSection={<ArrowRight size={14} aria-hidden />}>
              See all
            </Button>
          )}
        </Group>
      </Group>
      {hint && (
        <Text size="sm" c="dimmed" mb="xs">
          {hint}
        </Text>
      )}
      {above}
      {phone ? (
        <FluidTiles value>
          <Stack gap="sm">
            {to || cut ? items.slice(0, PHONE_PREVIEW) : items}
            {!to && cut && (
              <Button variant="default" onClick={() => setOpen(true)}>
                Show all {items.length}
              </Button>
            )}
          </Stack>
        </FluidTiles>
      ) : (
        <Scroller draggable={false} edgeGradientColor="var(--bg)" controlSize={36}>
          <Group gap="md" wrap="nowrap" align="stretch" py={4} px={2} style={{ whiteSpace: 'normal' }}>
            {children}
          </Group>
        </Scroller>
      )}
    </Box>
  )
}
