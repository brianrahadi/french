import { Badge, Button, Card, createTheme, Modal, Paper, SegmentedControl, Title } from '@mantine/core'

/**
 * The app's design system: Mantine defaults, plus the two fonts that matter
 * for a language app (Inter for the interface, a serif for French text).
 * Use Mantine components and their props; reach for CSS only for things
 * Mantine doesn't do (the reader, flashcards, exercise widgets).
 */
export const FONT_FR = "'Source Serif 4 Variable', ui-serif, Georgia, 'Times New Roman', serif"

export const theme = createTheme({
  primaryColor: 'indigo',
  primaryShade: { light: 7, dark: 5 },
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
