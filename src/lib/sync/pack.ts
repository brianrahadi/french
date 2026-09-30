/**
 * Synced documents are stored gzip-compressed ({ gz: base64 }), which makes
 * them about ten times smaller to upload and download. Uncompressed documents
 * (older saves, or browsers without CompressionStream) are read as they are.
 */

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function pack(doc: unknown): Promise<unknown> {
  if (typeof CompressionStream === 'undefined') return doc
  const stream = new Blob([JSON.stringify(doc)]).stream().pipeThrough(new CompressionStream('gzip'))
  return { gz: toBase64(new Uint8Array(await new Response(stream).arrayBuffer())) }
}

export async function unpack(raw: unknown): Promise<unknown> {
  const gz = (raw as { gz?: unknown } | null)?.gz
  if (typeof gz !== 'string') return raw
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to read synced progress. Please update it.')
  const stream = new Blob([fromBase64(gz)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return JSON.parse(await new Response(stream).text())
}
