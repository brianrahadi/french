/**
 * LingQ-style word status for a text: every vocabulary-bank word in it is new
 * (not started), learning (cards still in learning or relearning) or known
 * (cards graduated to review — including words marked "I know this").
 */
import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import type { StoredCard } from '../../lib/srs'
import { wordStatus } from '../vocab/selectors'
import { textVocab, type TextWord } from './textVocab'

export type ReadStatus = 'new' | 'learning' | 'known'

export function readStatus(wordId: string, cards: Record<string, StoredCard>): ReadStatus {
  const s = wordStatus(wordId, cards)
  return s === 'new' ? 'new' : s === 'learning' ? 'learning' : 'known'
}

export interface StatusWord extends TextWord {
  status: ReadStatus
}

export interface TextVocabView {
  /** The text's bank words in order of appearance, without ignored ones. */
  words: StatusWord[]
  /** Ignored words left out of the list. */
  hidden: number
  /** Lower-cased form in the text → word id. */
  idFor: Map<string, string>
  status: Record<string, ReadStatus>
}

export function useTextVocab(paragraphs: string[]): TextVocabView {
  const customWords = useStore((s) => s.customWords)
  const ignored = useStore((s) => s.ignoredWords)
  const cards = useStore((s) => s.cards)
  const all = useMemo(() => textVocab(paragraphs, customWords), [paragraphs, customWords])
  return useMemo(() => {
    const words: StatusWord[] = []
    const idFor = new Map<string, string>()
    const status: Record<string, ReadStatus> = {}
    let hidden = 0
    for (const t of all) {
      if (ignored?.[t.word.id]) {
        hidden++
        continue
      }
      const st = readStatus(t.word.id, cards)
      status[t.word.id] = st
      words.push({ ...t, status: st })
      for (const f of t.forms) if (!idFor.has(f)) idFor.set(f, t.word.id)
    }
    return { words, hidden, idFor, status }
  }, [all, ignored, cards])
}

/** An on/off preference remembered on this device (on unless switched off). */
function useDeviceFlag(key: string): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(key) !== '0'
    } catch {
      return true
    }
  })
  const set = (v: boolean) => {
    setOn(v)
    try {
      localStorage.setItem(key, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }
  return [on, set]
}

/** Whether new and learning words are coloured in the text (per device). */
export const useHighlightPref = () => useDeviceFlag('petit-a-petit-reader-highlight')

/** Whether the vocabulary sidebar is shown beside texts and transcripts (per device). */
export const usePanelPref = () => useDeviceFlag('petit-a-petit-reader-panel')

/** Share of the text's words that are known, 0–100. */
export function knownPercent(view: TextVocabView): number {
  return view.words.length ? Math.round((view.words.filter((w) => w.status === 'known').length / view.words.length) * 100) : 0
}

/** What LookupText needs to colour and focus words. */
export interface TextVocabMarks {
  idFor: Map<string, string>
  status: Record<string, ReadStatus>
  highlight: boolean
  focus: string | null
  /** A word in the text was tapped. */
  onOpen?: (wordId: string) => void
}
