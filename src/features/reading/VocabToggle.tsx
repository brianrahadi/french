import { Button } from '@mantine/core'
import { PanelRightOpen } from 'lucide-react'

/** Shows or hides the vocabulary sidebar; while hidden it shows how much of the text you know. */
export function VocabToggle({ open, onChange, known }: { open: boolean; onChange: (open: boolean) => void; known: number }) {
  return (
    <Button
      variant={open ? 'light' : 'default'}
      size="xs"
      onClick={() => onChange(!open)}
      aria-pressed={open}
      leftSection={<PanelRightOpen size={15} aria-hidden />}
      title={open ? 'Hide vocabulary' : 'Show vocabulary'}
    >
      Vocabulary
      {!open && <span className="vp-toggle-pct tnum">{known}%</span>}
    </Button>
  )
}
