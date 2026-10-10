/**
 * AI translations of original chapters, kept on this device so a chapter is
 * only translated once. (Retold books ship with their English.)
 */
const PREFIX = 'petit-a-petit-book-en:'

export function cachedTranslation(key: string): string[] | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    const t = raw ? (JSON.parse(raw) as unknown) : undefined
    return Array.isArray(t) && t.every((x) => typeof x === 'string') ? t : undefined
  } catch {
    return undefined
  }
}

export function saveTranslation(key: string, t: string[]) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(t))
  } catch {
    /* storage full or blocked: it's only a cache */
  }
}
