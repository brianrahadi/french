import type { ReactNode } from 'react'
import { Group, Modal } from '@mantine/core'

/** A modal with a title, content and a row of actions (Mantine Modal). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
}) {
  return (
    <Modal opened={open} onClose={onClose} title={title} size={wide ? 680 : 'md'} styles={{ title: { fontWeight: 650, fontSize: 18 } }}>
      {children}
      {actions && (
        <Group justify="flex-end" gap="sm" mt="lg">
          {actions}
        </Group>
      )}
    </Modal>
  )
}
