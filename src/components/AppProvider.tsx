import { useEffect, type ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { useColorScheme } from '@mantine/hooks'
import { useStore } from '../lib/store'
import { paletteOf, THEMES } from '../theme'

/** Mantine, with the chosen colour theme and light/dark following the app's own setting (or the system). */
export function AppProvider({ children }: { children: ReactNode }) {
  const setting = useStore((s) => s.settings.theme)
  const palette = paletteOf(useStore((s) => s.settings.palette))
  const size = useStore((s) => s.settings.size)
  const system = useColorScheme()
  const scheme = palette.darkOnly ? 'dark' : setting === 'system' ? system : setting

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-palette', palette.id)
    root.style.setProperty('--on-primary', palette.onPrimary ?? '#ffffff')
    // Browser / PWA chrome follows the page background.
    for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      m.content = palette.darkOnly || m.media.includes('dark') ? palette.dark[8] : palette.gray[0]
    }
  }, [palette])

  // Interface size: the root font size, which every rem (all of Mantine) follows.
  useEffect(() => {
    document.documentElement.setAttribute('data-size', size ?? 'big')
  }, [size])

  return (
    <MantineProvider theme={THEMES[palette.id]} forceColorScheme={scheme}>
      <Notifications position="bottom-center" limit={2} />
      {children}
    </MantineProvider>
  )
}
