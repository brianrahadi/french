import type { NavLinkProps } from '@mantine/core'

/** Width of the collapsed sidebar (an icon rail). */
export const RAIL_W = 68

/** NavLink props for the collapsed sidebar: icon only, centred (the label goes in a tooltip and aria-label). */
export const railLink = {
  fw: 550,
  styles: { body: { display: 'none' }, section: { marginInline: 0 } },
  style: { borderRadius: 'var(--mantine-radius-md)', justifyContent: 'center' },
} satisfies Partial<NavLinkProps>

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** Collapses or expands the sidebar (mod+B). */
export const SIDEBAR_SHORTCUT = isMac ? '⌘B' : 'Ctrl+B'
