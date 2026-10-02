import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { useColorScheme } from '@mantine/hooks'
import { useStore } from '../lib/store'
import { theme } from '../theme'

/** Mantine, with light/dark following the app's own setting (or the system). */
export function AppProvider({ children }: { children: ReactNode }) {
  const setting = useStore((s) => s.settings.theme)
  const system = useColorScheme()
  return (
    <MantineProvider theme={theme} forceColorScheme={setting === 'system' ? system : setting}>
      <Notifications position="bottom-center" limit={2} />
      {children}
    </MantineProvider>
  )
}
