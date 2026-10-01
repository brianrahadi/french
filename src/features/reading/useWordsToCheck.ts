import { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { cardId } from '../../lib/srs'
import { dayKey, endOfDay } from '../../lib/date'
import { textVocab, type TextWord } from './textVocab'

/**
 * Words from the text worth asking about: ones not started yet, and ones whose
 * recognition card is due today (and wasn't already reviewed today). Words the
 * learner chose to hide are left out.
 */
export function useWordsToCheck(paragraphs: string[]): TextWord[] {
  const customWords = useStore((s) => s.customWords)
  const ignored = useStore((s) => s.ignoredWords)
  const cards = useStore((s) => s.cards)
  return useMemo(() => {
    const now = new Date()
    const end = endOfDay(now).toISOString()
    const today = dayKey(now)
    return textVocab(paragraphs, customWords).filter((t) => {
      if (ignored?.[t.word.id]) return false
      const c = cards[cardId(t.word.id, 'r')]
      if (!c) return true
      return c.due <= end && !(c.last_review && dayKey(new Date(c.last_review)) === today)
    })
  }, [paragraphs, customWords, ignored, cards])
}
