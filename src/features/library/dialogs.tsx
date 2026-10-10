import { useState } from 'react'
import { LEVELS, type Level } from '../../data/types'
import { DeleteTextDialog, GenerateDialog, PasteDialog } from '../reading/texts'
import { FreeTalkDialog } from '../talk/TalkTiles'

/** The Library's dialogs (paste, generate, free talk, delete), shared by the Library and its section pages. */
export function useLibraryDialogs(level: Level, initialGenerate?: string | null) {
  const [paste, setPaste] = useState(false)
  const [generate, setGenerate] = useState<Level | null>(initialGenerate && LEVELS.includes(initialGenerate as Level) ? (initialGenerate as Level) : null)
  const [freeTalk, setFreeTalk] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const dialogs = (
    <>
      <PasteDialog open={paste} onClose={() => setPaste(false)} />
      <GenerateDialog key={generate ?? 'generate-closed'} open={!!generate} onClose={() => setGenerate(null)} defaultLevel={generate ?? level} />
      <FreeTalkDialog key={freeTalk ? 'talk-open' : 'talk-closed'} open={freeTalk} onClose={() => setFreeTalk(false)} defaultLevel={level} />
      <DeleteTextDialog id={deleting} onClose={() => setDeleting(null)} />
    </>
  )
  return {
    openPaste: () => setPaste(true),
    openGenerate: (l: Level) => setGenerate(l),
    openFreeTalk: () => setFreeTalk(true),
    askDelete: (id: string) => setDeleting(id),
    dialogs,
  }
}
