import { notifications } from '@mantine/notifications'

/** A short message at the bottom of the screen. */
export const toast = (message: string) => notifications.show({ message, autoClose: 2600, withCloseButton: false })
