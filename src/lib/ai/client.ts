/**
 * One small client for every provider. Calls go straight from the browser to the
 * provider's API with the learner's own key.
 *
 * Three wire formats are supported — Anthropic Messages, OpenAI Chat Completions
 * (also used by OpenRouter, Ollama, LM Studio, Mistral, Groq, DeepSeek, xAI…) and
 * Gemini generateContent — with streaming and JSON output. Providers differ in
 * which optional features they accept, so when one rejects a parameter the call
 * is retried without it and that is remembered for the rest of the session.
 */
import { getAiConfig, type AiConfig, type ModelOption } from './providers'
import { extractJson } from './json'

export type AiErrorKind =
  | 'setup'
  | 'auth'
  | 'model'
  | 'rate'
  | 'credits'
  | 'busy'
  | 'network'
  | 'refused'
  | 'truncated'
  | 'format'
  | 'unsupported'
  | 'other'

export class AiError extends Error {
  kind: AiErrorKind
  status?: number
  constructor(message: string, kind: AiErrorKind = 'other', status?: number) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
    this.status = status
  }
}

export const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface JsonSpec {
  name: string
  schema: Record<string, unknown>
}

export interface ChatRequest {
  system: string
  messages: ChatMessage[]
  json?: JsonSpec
  maxTokens?: number
  signal?: AbortSignal
  /** Called with the full text so far as it streams in. Turns on streaming. */
  onText?: (text: string) => void
  /** Defaults to the learner's active provider. */
  config?: AiConfig | null
}

export type Finish = 'stop' | 'length' | 'refusal' | 'blocked' | 'other'

export interface ChatResult {
  text: string
  finish: Finish
}

// ───────────── runtime capability memory ─────────────

type Quirk = 'noSchema' | 'noJsonMode' | 'noReasoning' | 'noStream' | 'altMaxTokens'
const quirks = new Map<string, Set<Quirk>>()
const quirkKey = (c: AiConfig) => `${c.provider.id}|${c.baseUrl}|${c.model}`
function quirksFor(c: AiConfig): Set<Quirk> {
  let q = quirks.get(quirkKey(c))
  if (!q) quirks.set(quirkKey(c), (q = new Set()))
  return q
}
/** For tests. */
export function resetQuirks() {
  quirks.clear()
}

// ───────────── request building ─────────────

interface Built {
  url: string
  init: RequestInit
}

/** Providers want the conversation to start with the user and alternate roles. */
export function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const m of messages) {
    if (!m.content.trim()) continue
    const last = out[out.length - 1]
    if (last && last.role === m.role) last.content += `\n\n${m.content}`
    else out.push({ ...m })
  }
  if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '(Start.)' })
  return out
}

function jsonInstruction(schema: Record<string, unknown>): string {
  return `\n\nRespond with a single JSON object only — no markdown, no code fences, no commentary — that matches this JSON Schema:\n${JSON.stringify(schema)}`
}

const cleanModel = (m: string) => m.replace(/^models\//, '')

export function buildRequest(c: AiConfig, req: ChatRequest, stream: boolean, q: Set<Quirk>): Built {
  const messages = normalizeMessages(req.messages)
  const maxTokens = req.maxTokens ?? 2048
  const schemaOn = !!req.json && !q.has('noSchema')
  const system = req.json && !schemaOn ? req.system + jsonInstruction(req.json.schema) : req.system
  const base = c.baseUrl.replace(/\/+$/, '')

  if (c.provider.protocol === 'anthropic') {
    const body: Record<string, unknown> = { model: c.model, max_tokens: maxTokens, system, messages }
    if (stream) body.stream = true
    if (schemaOn) body.output_config = { format: { type: 'json_schema', schema: req.json!.schema } }
    return {
      url: `${base}/messages`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': c.key,
          'anthropic-version': '2023-06-01',
          // Required for calls made directly from a browser (CORS).
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      },
    }
  }

  if (c.provider.protocol === 'gemini') {
    const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens }
    if (req.json) {
      generationConfig.responseMimeType = 'application/json'
      if (schemaOn) generationConfig.responseJsonSchema = req.json.schema
    }
    // Gemini 3+ think by default; a low level keeps replies quick.
    if (/^gemini-([3-9]|\d\d)/.test(cleanModel(c.model)) && !q.has('noReasoning'))
      generationConfig.thinkingConfig = { thinkingLevel: 'low' }
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig,
    }
    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
    return {
      url: `${base}/models/${encodeURIComponent(cleanModel(c.model))}:${action}`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key },
        body: JSON.stringify(body),
      },
    }
  }

  // OpenAI-compatible
  const isOpenAI = c.provider.id === 'openai'
  const body: Record<string, unknown> = {
    model: c.model,
    messages: [{ role: 'system', content: system }, ...messages],
  }
  // OpenAI's reasoning models want max_completion_tokens; most other servers want max_tokens.
  const useCompletionTokens = isOpenAI !== q.has('altMaxTokens')
  body[useCompletionTokens ? 'max_completion_tokens' : 'max_tokens'] = maxTokens
  if (isOpenAI && !q.has('noReasoning')) body.reasoning_effort = 'low'
  if (stream) body.stream = true
  if (req.json) {
    if (schemaOn) body.response_format = { type: 'json_schema', json_schema: { name: req.json.name, strict: true, schema: req.json.schema } }
    else if (!q.has('noJsonMode')) body.response_format = { type: 'json_object' }
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (c.key) headers.authorization = `Bearer ${c.key}`
  if (c.provider.id === 'openrouter') {
    if (typeof location !== 'undefined') headers['HTTP-Referer'] = location.origin
    headers['X-Title'] = 'Petit à petit'
  }
  return { url: `${base}/chat/completions`, init: { method: 'POST', headers, body: JSON.stringify(body) } }
}

// ───────────── responses ─────────────

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export function parseResponse(c: AiConfig, data: Json): ChatResult {
  if (c.provider.protocol === 'anthropic') {
    const text = ((data.content ?? []) as Json[])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
    return { text, finish: anthropicFinish(data.stop_reason) }
  }
  if (c.provider.protocol === 'gemini') {
    if (data.promptFeedback?.blockReason) return { text: '', finish: 'blocked' }
    const cand = data.candidates?.[0] ?? {}
    const text = ((cand.content?.parts ?? []) as Json[])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
    return { text, finish: geminiFinish(cand.finishReason) }
  }
  const choice = data.choices?.[0] ?? {}
  const msg = choice.message ?? {}
  if (msg.refusal) return { text: '', finish: 'refusal' }
  const content = Array.isArray(msg.content)
    ? (msg.content as Json[]).map((p) => p.text ?? '').join('')
    : typeof msg.content === 'string'
      ? msg.content
      : ''
  return { text: content, finish: openaiFinish(choice.finish_reason) }
}

function anthropicFinish(r: unknown): Finish {
  if (r === 'max_tokens') return 'length'
  if (r === 'refusal') return 'refusal'
  return 'stop'
}
function geminiFinish(r: unknown): Finish {
  if (!r || r === 'STOP' || r === 'FINISH_REASON_UNSPECIFIED') return 'stop'
  if (r === 'MAX_TOKENS') return 'length'
  if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY'].includes(String(r))) return 'blocked'
  return 'other'
}
function openaiFinish(r: unknown): Finish {
  if (r === 'length') return 'length'
  if (r === 'content_filter') return 'blocked'
  return 'stop'
}

/** Splits a server-sent-events stream into `data:` payloads. */
export async function readSse(res: Response, onData: (data: string, event?: string) => void): Promise<void> {
  let event: string | undefined
  let data: string[] = []
  const dispatch = () => {
    if (data.length) onData(data.join('\n'), event)
    data = []
    event = undefined
  }
  const handleLine = (line: string) => {
    if (line === '') return dispatch()
    if (line.startsWith(':')) return
    const i = line.indexOf(':')
    const field = i < 0 ? line : line.slice(0, i)
    let value = i < 0 ? '' : line.slice(i + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'data') data.push(value)
    else if (field === 'event') event = value
  }
  if (!res.body) {
    for (const line of (await res.text()).split(/\r?\n/)) handleLine(line)
    return dispatch()
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() ?? ''
    for (const line of lines) handleLine(line)
  }
  buf += dec.decode()
  if (buf) handleLine(buf)
  dispatch()
}

async function readStream(c: AiConfig, res: Response, onText: (t: string) => void): Promise<ChatResult> {
  let text = ''
  let finish: Finish = 'stop'
  let streamError: AiError | null = null
  const push = (t: string) => {
    if (!t) return
    text += t
    onText(text)
  }
  await readSse(res, (payload) => {
    if (payload === '[DONE]' || streamError) return
    let d: Json
    try {
      d = JSON.parse(payload)
    } catch {
      return
    }
    if (d.error) {
      const m = typeof d.error === 'string' ? d.error : d.error.message
      streamError = classify(c, 0, String(m ?? 'The stream was interrupted.'))
      return
    }
    if (c.provider.protocol === 'anthropic') {
      if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') push(d.delta.text ?? '')
      else if (d.type === 'message_delta' && d.delta?.stop_reason) finish = anthropicFinish(d.delta.stop_reason)
    } else if (c.provider.protocol === 'gemini') {
      if (d.promptFeedback?.blockReason) finish = 'blocked'
      const cand = d.candidates?.[0]
      for (const p of (cand?.content?.parts ?? []) as Json[]) if (!p.thought) push(p.text ?? '')
      if (cand?.finishReason) finish = geminiFinish(cand.finishReason)
    } else {
      const ch = d.choices?.[0]
      if (ch?.delta?.refusal) finish = 'refusal'
      const content = ch?.delta?.content
      if (typeof content === 'string') push(content)
      if (ch?.finish_reason) finish = openaiFinish(ch.finish_reason)
    }
  })
  if (streamError) throw streamError
  return { text, finish }
}

// ───────────── errors ─────────────

async function errorDetail(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '')
  try {
    const j = JSON.parse(raw)
    const e = Array.isArray(j) ? j[0]?.error : j.error
    if (typeof e === 'string') return e
    return String(e?.message ?? j.message ?? j.detail ?? raw).slice(0, 400)
  } catch {
    return raw.slice(0, 400)
  }
}

export function classify(c: AiConfig, status: number, detail: string): AiError {
  const n = c.name
  const d = detail.toLowerCase()
  if (status === 401 || /api key not valid|invalid api key|incorrect api key|invalid x-api-key|authentication|unauthori[sz]ed/.test(d))
    return new AiError(`${n} rejected the API key. Check it in Settings → AI.`, 'auth', status)
  if (status === 402 || /insufficient (credit|balance|funds)|credit balance|billing|payment required/.test(d))
    return new AiError(`Your ${n} account is out of credit. Top it up on the provider’s site, or switch provider in Settings.`, 'credits', status)
  if (status === 404 || /model.{0,40}(not found|does not exist|not supported|unknown|invalid)|no endpoints found|unknown model/.test(d))
    return new AiError(`The model “${c.model}” isn’t available for this key. Pick another model in Settings → AI.`, 'model', status)
  if (status === 403) return new AiError(`${n} refused the request (permission denied). ${detail}`.trim(), 'auth', status)
  if (status === 429 || /rate.?limit|quota|resource.?exhausted|too many requests/.test(d))
    return new AiError(`${n}’s rate limit or quota was reached. Wait a minute and try again.`, 'rate', status)
  if (status >= 500 || /overloaded|unavailable|try again later/.test(d))
    return new AiError(`${n} is busy right now. Try again in a moment.`, 'busy', status)
  return new AiError(detail ? `${n}: ${detail}` : `The request to ${n} failed (${status}).`, 'other', status)
}

function networkError(c: AiConfig): AiError {
  if (c.provider.id === 'custom') {
    let local = false
    try {
      local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(c.baseUrl).hostname)
    } catch {
      /* ignore */
    }
    return new AiError(
      local
        ? `Couldn’t reach ${c.name} at ${c.baseUrl}. Is it running? It must also allow requests from this site — for Ollama, set OLLAMA_ORIGINS; in LM Studio, enable CORS.`
        : `Couldn’t reach ${c.baseUrl}. Check the address and your connection. Some providers don’t accept requests straight from a browser (CORS) — OpenRouter works as an alternative.`,
      'network',
    )
  }
  return new AiError(`Couldn’t reach ${c.name}. Check your internet connection.`, 'network')
}

/** Which optional feature a 400 error is complaining about, if any. */
export function quirkFromError(detail: string, req: ChatRequest, stream: boolean, q: Set<Quirk>, c: AiConfig): Quirk | null {
  const d = detail.toLowerCase()
  if (req.json && !q.has('noSchema') && /response_format|json_schema|structured|responsejsonschema|response_json_schema|output_config|schema/.test(d))
    return 'noSchema'
  if (req.json && q.has('noSchema') && !q.has('noJsonMode') && /response_format|json_object|json mode/.test(d)) return 'noJsonMode'
  if (!q.has('noReasoning') && /reasoning|thinking/.test(d)) return 'noReasoning'
  if (c.provider.protocol === 'openai' && !q.has('altMaxTokens') && /max_(completion_)?tokens/.test(d)) return 'altMaxTokens'
  if (stream && !q.has('noStream') && /stream/.test(d)) return 'noStream'
  return null
}

// ───────────── public API ─────────────

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal | undefined {
  const t = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(ms) : undefined
  if (!signal) return t
  if (!t) return signal
  return 'any' in AbortSignal ? AbortSignal.any([signal, t]) : signal
}

export async function chat(req: ChatRequest): Promise<ChatResult> {
  const c = req.config === undefined ? getAiConfig() : req.config
  if (!c) throw new AiError('Connect an AI provider in Settings → AI first.', 'setup')
  const q = quirksFor(c)
  for (let attempt = 0; attempt < 5; attempt++) {
    const stream = !!req.onText && !q.has('noStream')
    const { url, init } = buildRequest(c, req, stream, q)
    let res: Response
    try {
      res = await fetch(url, { ...init, signal: withTimeout(req.signal, stream ? 180_000 : 120_000) })
    } catch (e) {
      if (isAbort(e) && req.signal?.aborted) throw e
      if ((e as Error)?.name === 'TimeoutError' || isAbort(e))
        throw new AiError(`${c.name} took too long to answer. Try again.`, 'busy')
      throw networkError(c)
    }
    if (!res.ok) {
      const detail = await errorDetail(res)
      if (res.status === 400 || res.status === 422) {
        const quirk = quirkFromError(detail, req, stream, q, c)
        if (quirk) {
          q.add(quirk)
          continue
        }
      }
      throw classify(c, res.status, detail)
    }
    try {
      if (stream) return await readStream(c, res, req.onText!)
      const data = (await res.json()) as Json
      const result = parseResponse(c, data)
      req.onText?.(result.text)
      return result
    } catch (e) {
      if (e instanceof AiError || isAbort(e)) throw e
      throw new AiError(`The connection to ${c.name} was interrupted. Try again.`, 'network')
    }
  }
  throw new AiError(`${c.name} didn’t accept the request.`, 'other')
}

/**
 * Asks for JSON matching `req.json.schema` and turns it into a typed value with `coerce`.
 * `coerce` should tolerate missing fields — not every provider enforces the schema.
 */
export async function chatJson<T>(req: ChatRequest & { json: JsonSpec }, coerce: (raw: unknown) => T): Promise<T> {
  const c = req.config === undefined ? getAiConfig() : req.config
  const name = c?.name ?? 'The AI'
  const res = await chat({ ...req, config: c })
  if (res.finish === 'length') throw new AiError(`${name}’s answer was cut off. Try again with a shorter text.`, 'truncated')
  if (res.finish === 'refusal' || res.finish === 'blocked') throw new AiError(`${name} declined to answer this one.`, 'refused')
  let raw: unknown
  try {
    raw = extractJson(res.text)
  } catch {
    if (c) quirksFor(c).add('noSchema')
    throw new AiError(`Couldn’t read ${name}’s answer. Try again.`, 'format')
  }
  return coerce(raw)
}

/** A minimal request to check that the key, model and address work. */
export async function testConnection(c: AiConfig): Promise<void> {
  await chat({
    config: c,
    system: 'You are a connection test.',
    messages: [{ role: 'user', content: 'Réponds juste « OK ».' }],
    // Generous so models that think first still answer; only generated tokens are billed.
    maxTokens: 1024,
  })
}

/** Models the key can use, for the model picker. */
export async function listModels(c: AiConfig, signal?: AbortSignal): Promise<ModelOption[]> {
  const base = c.baseUrl.replace(/\/+$/, '')
  let url: string
  let headers: Record<string, string> = {}
  if (c.provider.protocol === 'anthropic') {
    url = `${base}/models?limit=100`
    headers = { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
  } else if (c.provider.protocol === 'gemini') {
    url = `${base}/models?pageSize=1000`
    headers = { 'x-goog-api-key': c.key }
  } else {
    url = `${base}/models`
    if (c.key) headers.authorization = `Bearer ${c.key}`
  }
  let res: Response
  try {
    res = await fetch(url, { headers, signal: withTimeout(signal, 30_000) })
  } catch (e) {
    if (isAbort(e) && signal?.aborted) throw e
    throw networkError(c)
  }
  if (!res.ok) throw classify(c, res.status, await errorDetail(res))
  const data = (await res.json()) as Json
  if (c.provider.protocol === 'anthropic')
    return ((data.data ?? []) as Json[]).map((m) => ({ id: m.id, label: m.display_name ?? m.id }))
  if (c.provider.protocol === 'gemini')
    return ((data.models ?? []) as Json[])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => ({ id: cleanModel(m.name), label: m.displayName ?? cleanModel(m.name) }))
      .filter((m) => !/embedding|tts|image|imagen|veo|live|aqa|robotics|computer-use/i.test(m.id))
  let list = ((data.data ?? data.models ?? []) as Json[]).map((m) => ({ id: String(m.id ?? m.name), label: String(m.name ?? m.id) }))
  if (c.provider.id === 'openai')
    list = list
      .filter((m) => /^(gpt|o\d|chatgpt)/.test(m.id) && !/audio|realtime|transcribe|tts|image|search|embedding|moderation|instruct|dall|whisper|live/.test(m.id))
      .sort((a, b) => b.id.localeCompare(a.id))
  return list
}

// ───────────── speech transcription (for browsers without speech recognition) ─────────────

export function canTranscribe(c: AiConfig | null): boolean {
  return !!c?.provider.canTranscribe
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

const OPENAI_TRANSCRIBE_MODELS = ['gpt-transcribe', 'gpt-4o-transcribe', 'whisper-1']

export async function transcribe(audio: Blob, c: AiConfig | null = getAiConfig(), signal?: AbortSignal): Promise<string> {
  if (!c) throw new AiError('Connect an AI provider in Settings → AI first.', 'setup')
  const base = c.baseUrl.replace(/\/+$/, '')
  const mime = (audio.type || 'audio/webm').split(';')[0]
  try {
    if (c.provider.id === 'openai') {
      const ext = mime.includes('mp4') || mime.includes('aac') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm'
      let last: AiError | null = null
      for (const model of OPENAI_TRANSCRIBE_MODELS) {
        const form = new FormData()
        form.append('file', audio, `speech.${ext}`)
        form.append('model', model)
        form.append('language', 'fr')
        const res = await fetch(`${base}/audio/transcriptions`, {
          method: 'POST',
          headers: { authorization: `Bearer ${c.key}` },
          body: form,
          signal: withTimeout(signal, 60_000),
        })
        if (res.ok) return String(((await res.json()) as Json).text ?? '').trim()
        last = classify({ ...c, model }, res.status, await errorDetail(res))
        if (last.kind !== 'model') throw last
      }
      throw last ?? new AiError('Transcription failed.')
    }
    if (c.provider.id === 'gemini') {
      const data = await blobToBase64(audio)
      const res = await fetch(`${base}/models/${encodeURIComponent(cleanModel(c.model))}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: mime, data } },
                { text: 'Transcribe this French speech exactly as spoken, with normal French spelling. Reply with the transcript only.' },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 400 },
        }),
        signal: withTimeout(signal, 60_000),
      })
      if (!res.ok) throw classify(c, res.status, await errorDetail(res))
      return parseResponse(c, (await res.json()) as Json).text.trim()
    }
  } catch (e) {
    if (e instanceof AiError || (isAbort(e) && signal?.aborted)) throw e
    throw networkError(c)
  }
  throw new AiError(`${c.name} can’t transcribe speech. OpenAI and Gemini can.`, 'unsupported')
}
