import {
  Badge,
  Button,
  Card,
  createTheme,
  DEFAULT_THEME,
  type MantineColorsTuple,
  type MantinePrimaryShade,
  type MantineThemeOverride,
  Modal,
  Paper,
  SegmentedControl,
  Title,
} from '@mantine/core'

/**
 * The app's design system: Mantine defaults, plus the two fonts that matter
 * for a language app (Inter for the interface, a serif for French text), and
 * a choice of colour themes (Settings → Appearance).
 * Use Mantine components and their props; reach for CSS only for things
 * Mantine doesn't do (the reader, flashcards, exercise widgets).
 */
export const FONT_FR = "'Source Serif 4 Variable', ui-serif, Georgia, 'Times New Roman', serif"

export type PaletteId = 'clay' | 'slate' | 'classic' | 'onyx'

/**
 * A colour theme. The accent is registered as the `accent` colour and is the
 * primary, so components use `color="accent"` / `var(--mantine-color-accent-6)`
 * (or just the primary) and follow whichever theme is picked.
 */
export interface Palette {
  id: PaletteId
  name: string
  desc: string
  accent: MantineColorsTuple
  /** Dark-mode neutrals (Mantine's `dark`): 0 text, 2 dimmed, 4 borders, 6 inputs, 7 cards, 8 page, 9 sidebar. */
  dark: MantineColorsTuple
  /** Light-mode neutrals (Mantine's `gray`): 0 page, 3 borders, 6 dimmed. */
  gray: MantineColorsTuple
  /** Light-mode text colour. */
  black: string
  primaryShade: MantinePrimaryShade
  /** Always dark, whatever the Light / Dark setting says. */
  darkOnly?: boolean
  /** Text on filled accent surfaces (buttons, chat bubbles). Light accents need dark text. */
  onPrimary?: string
}

export const PALETTES: Palette[] = [
  {
    id: 'clay',
    name: 'Clay',
    desc: 'Warm charcoal, terracotta',
    accent: ['#fdf3ef', '#f9e3da', '#f2c5b3', '#eaa58a', '#e38a68', '#d97757', '#c96442', '#ae5133', '#8f4229', '#6e321f'],
    dark: ['#e5e3da', '#c2c0b6', '#9c9a92', '#75736c', '#4a4945', '#3d3d3a', '#363633', '#30302e', '#262624', '#1f1e1d'],
    gray: ['#f5f4ee', '#efede6', '#e6e3da', '#dad7cc', '#c9c5b9', '#a8a59a', '#73726c', '#55544f', '#3d3d3a', '#262624'],
    black: '#141413',
    primaryShade: { light: 7, dark: 6 },
  },
  {
    id: 'slate',
    name: 'Slate',
    desc: 'Blue-black, steel blue',
    accent: ['#ebf1fb', '#d6e1f5', '#adc3ea', '#82a3de', '#5f89d4', '#4a78cc', '#3b69c0', '#3159a8', '#284a8d', '#1e3a70'],
    dark: ['#d4d8e0', '#b0b6c2', '#878e9c', '#5f6676', '#353b48', '#2a2f3a', '#20242e', '#171b23', '#101319', '#0a0c11'],
    gray: ['#f4f5f7', '#eceef2', '#e2e5ea', '#d5d9e0', '#c2c7d0', '#a2a8b4', '#6c7380', '#4b515c', '#343944', '#20242c'],
    black: '#1a1d24',
    primaryShade: { light: 7, dark: 6 },
  },
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Neutral grey, indigo',
    accent: DEFAULT_THEME.colors.indigo,
    dark: DEFAULT_THEME.colors.dark,
    gray: DEFAULT_THEME.colors.gray,
    black: DEFAULT_THEME.black,
    primaryShade: { light: 7, dark: 5 },
  },
  {
    id: 'onyx',
    name: 'Onyx',
    desc: 'Pure black, green',
    accent: ['#e7fbef', '#c6f4d8', '#93e9b5', '#5edd91', '#36d276', '#21c05c', '#1aa34d', '#14853f', '#0f6831', '#0a4c24'],
    dark: ['#ececec', '#bdbdbd', '#919191', '#686868', '#2c2c2c', '#232323', '#1b1b1b', '#121212', '#000000', '#000000'],
    gray: DEFAULT_THEME.colors.gray,
    black: '#000000',
    // Same shade for both: autoContrast picks text colour from the light shade.
    primaryShade: { light: 5, dark: 5 },
    darkOnly: true,
    onPrimary: '#000000',
  },
]

export const DEFAULT_PALETTE: PaletteId = 'clay'
export const paletteOf = (id: string | undefined): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0]

function buildTheme(p: Palette): MantineThemeOverride {
  return createTheme({
    primaryColor: 'accent',
    primaryShade: p.primaryShade,
    colors: { accent: p.accent, dark: p.dark, gray: p.gray },
    black: p.black,
    // Light accents (Onyx's green) get black text on filled buttons and badges.
    autoContrast: !!p.onPrimary,
    luminanceThreshold: 0.3,
    fontFamily: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    headings: { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif", fontWeight: '650' },
    defaultRadius: 'md',
    cursorType: 'pointer',
    other: { fontFr: FONT_FR },
    components: {
      Button: Button.extend({ defaultProps: { radius: 'md' } }),
      Card: Card.extend({ defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } }),
      Paper: Paper.extend({ defaultProps: { withBorder: true, radius: 'lg' } }),
      Badge: Badge.extend({ defaultProps: { variant: 'light', radius: 'sm' } }),
      Modal: Modal.extend({ defaultProps: { centered: true, radius: 'lg' } }),
      SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'md' } }),
      Title: Title.extend({ defaultProps: { textWrap: 'balance' } }),
    },
  })
}

/** One Mantine theme per palette, built once. */
export const THEMES = Object.fromEntries(PALETTES.map((p) => [p.id, buildTheme(p)])) as Record<PaletteId, MantineThemeOverride>
