import type { MouseEvent, ReactNode } from 'react'
import { Card, Group, Progress, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { Link, useNavigate } from 'react-router'

const WIDTH = { base: '72vw', xs: 232 }

/**
 * A card in a Shelf: a text, story or lesson. The whole card opens `to`;
 * buttons inside it (e.g. delete) keep working on their own.
 */
export function Tile({
  to,
  fluid,
  onClick,
  disabled,
  small,
  top,
  corner,
  title,
  fr,
  sub,
  foot,
  progress,
  done,
  highlight,
}: {
  to?: string
  /** Fill the grid cell instead of the fixed shelf width. */
  fluid?: boolean
  /** Instead of `to`: the whole card is a button. */
  onClick?: () => void
  disabled?: boolean
  /** Smaller title, up to 3 lines (for sentences). */
  small?: boolean
  top?: ReactNode
  corner?: ReactNode
  title: ReactNode
  /** The title is French: shown in the serif and marked lang="fr". */
  fr?: boolean
  sub?: ReactNode
  foot?: ReactNode
  /** 0..1, shows a thin bar at the bottom. */
  progress?: number
  done?: boolean
  highlight?: boolean
}) {
  const navigate = useNavigate()
  const open = (e: MouseEvent) => {
    if (disabled || (e.target as HTMLElement).closest('a, button:not([data-tile])')) return
    if (onClick) onClick()
    else if (to) void navigate(to)
  }
  const button = onClick ? { component: 'button' as const, type: 'button' as const, disabled, 'data-tile': true, ta: 'left' as const } : {}
  return (
    <Card
      w={fluid ? undefined : WIDTH}
      padding="md"
      onClick={open}
      {...button}
      bg={done ? 'var(--surface-2)' : undefined}
      opacity={disabled ? 0.55 : undefined}
      style={{ cursor: (to || onClick) && !disabled ? 'pointer' : undefined, flexShrink: 0, font: 'inherit', color: 'inherit', ...(highlight ? { borderColor: 'var(--mantine-primary-color-filled)', borderWidth: 2 } : {}) }}
    >
      <Stack gap={6} h="100%">
        {(top || corner) && (
          <Group gap={6} wrap="nowrap" justify="space-between">
            <Group gap={6} wrap="nowrap">
              {top}
            </Group>
            {corner}
          </Group>
        )}
        <Text
          fw={650}
          fz={small ? 15 : 17}
          lh={1.3}
          lineClamp={small ? 3 : 2}
          className={fr ? 'fr' : undefined}
          lang={fr ? 'fr' : undefined}
        >
          {to ? (
            <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }}>
              {title}
            </Link>
          ) : (
            title
          )}
        </Text>
        {sub && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {sub}
          </Text>
        )}
        {foot && (
          <Group gap={5} mt="auto" pt={6} c="dimmed" fz="xs" wrap="nowrap">
            {foot}
          </Group>
        )}
        {progress !== undefined && <Progress value={progress * 100} size="xs" radius="xl" />}
      </Stack>
    </Card>
  )
}

/** A dashed "do something" card at the end of a Shelf (e.g. "write a new story"). */
export function ActionTile({ icon, title, sub, onClick, to }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; onClick?: () => void; to?: string }) {
  const body = (
    <Stack gap={6} justify="center" h="100%">
      <ThemeIcon variant="light" size="lg" radius="md">
        {icon}
      </ThemeIcon>
      <Text fw={650}>{title}</Text>
      {sub && (
        <Text size="sm" c="dimmed">
          {sub}
        </Text>
      )}
    </Stack>
  )
  return (
    <Card w={WIDTH} padding="md" style={{ borderStyle: 'dashed', flexShrink: 0 }} bg="transparent">
      {to ? (
        <UnstyledButton component={Link} to={to} h="100%">
          {body}
        </UnstyledButton>
      ) : onClick ? (
        <UnstyledButton onClick={onClick} h="100%">
          {body}
        </UnstyledButton>
      ) : (
        body
      )}
    </Card>
  )
}
