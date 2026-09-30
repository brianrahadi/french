/** Helpers for reading JSON that language models return (possibly wrapped in prose or code fences, or still streaming). */

/** Parses the first JSON object in `text`. Throws when there is none. */
export function extractJson(text: string): unknown {
  const t = text.trim()
  try {
    return JSON.parse(t)
  } catch {
    /* fall through */
  }
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      /* fall through */
    }
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const slice = t.slice(start, end + 1)
    try {
      return JSON.parse(slice)
    } catch {
      // Trailing commas are the most common slip.
      return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'))
    }
  }
  throw new SyntaxError('No JSON object found')
}

/**
 * Reads the (possibly unfinished) value of a top-level string field from a JSON
 * document that is still being streamed, e.g. `{"reply": "Bonjour, je vou` → "Bonjour, je vou".
 * Returns null while the field hasn't started.
 */
export function partialStringField(text: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"`)
  const m = re.exec(text)
  if (!m) return null
  let i = m.index + m[0].length
  let out = ''
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') return out
    if (ch === '\\') {
      const next = text[i + 1]
      if (next === undefined) return out
      if (next === 'u') {
        const hex = text.slice(i + 2, i + 6)
        if (hex.length < 4) return out
        out += String.fromCharCode(parseInt(hex, 16))
        i += 6
        continue
      }
      out += ({ n: '\n', t: '\t', r: '', b: '', f: '', '"': '"', '\\': '\\', '/': '/' } as Record<string, string>)[next] ?? next
      i += 2
      continue
    }
    out += ch
    i++
  }
  return out
}

/** Tiny coercion helpers for model output. */
export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v))
export const arr = <T>(v: unknown, map: (x: unknown) => T | null): T[] =>
  Array.isArray(v) ? v.map(map).filter((x): x is T => x !== null) : []
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
export const clamp = (n: unknown, lo: number, hi: number): number => {
  const x = Math.round(Number(n))
  return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : lo
}
