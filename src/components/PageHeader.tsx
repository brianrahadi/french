import type { ReactNode } from 'react'
import { Anchor, Box, Group, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

/** A page's title block: optional back link and eyebrow, title, one-line subtitle, and actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  back,
  fr,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  /** The title is French (serif, lang="fr"). */
  fr?: boolean
  /** Extra content under the subtitle (meta badges, stats…). */
  children?: ReactNode
}) {
  return (
    <Box component="header" mb="lg">
      {back && (
        <Anchor component={Link} to={back.to} size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> {back.label}
        </Anchor>
      )}
      <Group justify="space-between" align="flex-end" gap="md">
        <Box style={{ minWidth: 0, flex: '1 1 320px' }}>
          {eyebrow && (
            <Text size="sm" fw={600} c="dimmed" mb={2}>
              {eyebrow}
            </Text>
          )}
          <Title order={1} fz={{ base: 28, sm: 34 }} className={fr ? 'fr' : undefined} lang={fr ? 'fr' : undefined}>
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" mt={4} maw={640}>
              {subtitle}
            </Text>
          )}
          {children}
        </Box>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </Box>
  )
}
