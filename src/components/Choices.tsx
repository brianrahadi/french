import type { ReactNode } from 'react'
import { Group, Radio, SimpleGrid, Text, ThemeIcon } from '@mantine/core'

/** Multiple-choice answers as big tappable cards, numbered 1, 2, 3… (the keyboard shortcuts where a page has them). */
export function Choices({
  options,
  value,
  onChange,
  label,
  status,
  columns = 2,
  fr,
}: {
  options: ReactNode[]
  value: number | undefined
  onChange: (i: number) => void
  label: string
  /** After checking: mark options right/wrong. */
  status?: (i: number) => 'right' | 'wrong' | undefined
  columns?: number
  /** Options are French text. */
  fr?: boolean
}) {
  return (
    <Radio.Group value={value === undefined ? null : String(value)} onChange={(v) => onChange(Number(v))} aria-label={label}>
      <SimpleGrid cols={{ base: 1, sm: columns }} spacing="xs">
        {options.map((o, i) => {
          const st = status?.(i)
          const color = st === 'right' ? 'green' : st === 'wrong' ? 'red' : undefined
          return (
            <Radio.Card
              key={i}
              value={String(i)}
              p="sm"
              radius="md"
              disabled={!!status}
              style={color ? { borderColor: `var(--mantine-color-${color}-filled)`, background: `var(--mantine-color-${color}-light)` } : undefined}
            >
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon variant={value === i ? 'filled' : 'default'} color={color} size={26} radius="sm" fz="xs" fw={700} aria-hidden>
                  {i + 1}
                </ThemeIcon>
                <Text className={fr ? 'fr' : undefined} lang={fr ? 'fr' : undefined} fz={fr ? 17 : 15}>
                  {o}
                </Text>
              </Group>
            </Radio.Card>
          )
        })}
      </SimpleGrid>
    </Radio.Group>
  )
}
