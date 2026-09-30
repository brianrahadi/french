import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AiError,
  buildRequest,
  chat,
  chatJson,
  classify,
  coerceFeedback,
  countWords,
  extractJson,
  getWritingFeedback,
  migrateAiSettings,
  normalizeMessages,
  parseResponse,
  partialStringField,
  PROVIDER_BY_ID,
  resetQuirks,
  resolveConfig,
  segmentText,
  type AiConfig,
  type ProviderId,
  type WritingError,
} from './ai'

const lessons = [
  { id: 'passe-compose-etre', title: 'Passé composé with être' },
  { id: 'articles', title: 'Gender & articles' },
]

const err = (original: string, correction: string, lesson: string | null = null): WritingError => ({
  original,
  correction,
  category: 'grammar',
  explanation: 'x',
  lesson,
})

function cfg(id: ProviderId, over: Partial<AiConfig> = {}): AiConfig {
  const p = PROVIDER_BY_ID[id]
  return { provider: p, key: 'k-test', model: p.defaultModel || 'llama3.3', baseUrl: p.baseUrl || 'http://localhost:11434/v1', name: p.short, ...over }
}

const schema = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false }
const baseReq = { system: 'SYS', messages: [{ role: 'user' as const, content: 'Bonjour' }] }

const sse = (events: string[]) =>
  new Response(
    new ReadableStream({
      start(ctrl) {
        const enc = new TextEncoder()
        // Split mid-line to exercise buffering.
        const all = events.map((e) => `data: ${e}\n\n`).join('')
        ctrl.enqueue(enc.encode(all.slice(0, 17)))
        ctrl.enqueue(enc.encode(all.slice(17)))
        ctrl.close()
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  )

beforeEach(() => resetQuirks())
afterEach(() => vi.unstubAllGlobals())

describe('settings', () => {
  it('migrates the old single Claude key', () => {
    const s = migrateAiSettings({ apiKey: 'sk-ant-1', model: 'claude-opus-5-5' }, 1)
    expect(s.provider).toBe('anthropic')
    expect(s.keys.anthropic).toBe('sk-ant-1')
    expect(s.models.anthropic).toBe('claude-opus-5-5')
  })
  it('resolves only complete configurations', () => {
    const base = { provider: 'openai' as const, keys: {}, models: {}, customBaseUrl: '', customName: '', verified: {} }
    expect(resolveConfig(base)).toBeNull()
    expect(resolveConfig({ ...base, keys: { openai: 'sk-1' } })?.model).toBe('gpt-6.1-sol')
    // Custom servers need an address and a model, but not a key.
    expect(resolveConfig({ ...base, provider: 'custom', customBaseUrl: 'http://localhost:11434/v1' })).toBeNull()
    const local = resolveConfig({ ...base, provider: 'custom', customBaseUrl: 'http://localhost:11434/v1', models: { custom: 'llama3.3' } })
    expect(local?.name).toBe('your local AI')
  })
})

describe('request building', () => {
  it('Anthropic: browser headers and structured output', () => {
    const { url, init } = buildRequest(cfg('anthropic'), { ...baseReq, json: { name: 'x', schema } }, false, new Set())
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const h = init.headers as Record<string, string>
    expect(h['x-api-key']).toBe('k-test')
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true')
    const body = JSON.parse(init.body as string)
    expect(body.output_config.format).toEqual({ type: 'json_schema', schema })
    expect(body.system).toBe('SYS')
  })
  it('OpenAI: strict json_schema, max_completion_tokens and low reasoning effort', () => {
    const { url, init } = buildRequest(cfg('openai'), { ...baseReq, json: { name: 'x', schema }, maxTokens: 500 }, true, new Set())
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    const body = JSON.parse(init.body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' })
    expect(body.response_format.json_schema.strict).toBe(true)
    expect(body.max_completion_tokens).toBe(500)
    expect(body.reasoning_effort).toBe('low')
    expect(body.stream).toBe(true)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k-test')
  })
  it('OpenRouter and custom servers use max_tokens; custom works without a key', () => {
    const or = JSON.parse(buildRequest(cfg('openrouter'), baseReq, false, new Set()).init.body as string)
    expect(or.max_tokens).toBe(2048)
    expect(or.reasoning_effort).toBeUndefined()
    const local = buildRequest(cfg('custom', { key: '' }), baseReq, false, new Set())
    expect(local.url).toBe('http://localhost:11434/v1/chat/completions')
    expect((local.init.headers as Record<string, string>).authorization).toBeUndefined()
  })
  it('Gemini: model URL, system instruction, JSON schema and thinking level', () => {
    const { url, init } = buildRequest(cfg('gemini'), { ...baseReq, json: { name: 'x', schema } }, true, new Set())
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k-test')
    const body = JSON.parse(init.body as string)
    expect(body.systemInstruction.parts[0].text).toBe('SYS')
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Bonjour' }] })
    expect(body.generationConfig.responseJsonSchema).toEqual(schema)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' })
  })
  it('falls back to a prompt instruction when schemas are unsupported', () => {
    const { init } = buildRequest(cfg('openrouter'), { ...baseReq, json: { name: 'x', schema } }, false, new Set(['noSchema']))
    const body = JSON.parse(init.body as string)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.messages[0].content).toContain('JSON Schema')
  })
  it('starts conversations with the user and merges repeated roles', () => {
    expect(
      normalizeMessages([
        { role: 'assistant', content: 'Bonjour !' },
        { role: 'user', content: 'Salut' },
        { role: 'user', content: 'ça va ?' },
      ]),
    ).toEqual([
      { role: 'user', content: '(Start.)' },
      { role: 'assistant', content: 'Bonjour !' },
      { role: 'user', content: 'Salut\n\nça va ?' },
    ])
  })
})

describe('responses', () => {
  it('reads text and finish reasons from each format', () => {
    expect(parseResponse(cfg('anthropic'), { content: [{ type: 'thinking' }, { type: 'text', text: 'a' }], stop_reason: 'max_tokens' })).toEqual({ text: 'a', finish: 'length' })
    expect(parseResponse(cfg('openai'), { choices: [{ message: { content: 'b' }, finish_reason: 'stop' }] })).toEqual({ text: 'b', finish: 'stop' })
    expect(parseResponse(cfg('openai'), { choices: [{ message: { content: null, refusal: 'no' } }] }).finish).toBe('refusal')
    expect(
      parseResponse(cfg('gemini'), { candidates: [{ content: { parts: [{ text: 'hmm', thought: true }, { text: 'c' }] }, finishReason: 'STOP' }] }),
    ).toEqual({ text: 'c', finish: 'stop' })
    expect(parseResponse(cfg('gemini'), { promptFeedback: { blockReason: 'SAFETY' } }).finish).toBe('blocked')
  })

  it('streams Anthropic, OpenAI and Gemini deltas', async () => {
    const cases: [ProviderId, string[]][] = [
      [
        'anthropic',
        [
          '{"type":"message_start"}',
          '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Bon"}}',
          '{"type":"content_block_delta","delta":{"type":"text_delta","text":"jour"}}',
          '{"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
        ],
      ],
      ['openai', ['{"choices":[{"delta":{"content":"Bon"}}]}', '{"choices":[{"delta":{"content":"jour"},"finish_reason":"stop"}]}', '[DONE]']],
      ['gemini', ['{"candidates":[{"content":{"parts":[{"text":"Bon"}]}}]}', '{"candidates":[{"content":{"parts":[{"text":"jour"}]},"finishReason":"STOP"}]}']],
    ]
    for (const [id, events] of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => sse(events)))
      const seen: string[] = []
      const r = await chat({ ...baseReq, config: cfg(id), onText: (t) => seen.push(t) })
      expect(r).toEqual({ text: 'Bonjour', finish: 'stop' })
      expect(seen).toEqual(['Bon', 'Bonjour'])
    }
  })

  it('retries without the schema when a provider rejects it, and remembers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid parameter: 'response_format' of type 'json_schema' is not supported" } }), { status: 400 }))
      .mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"a":"ok"}\n```' } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const c = cfg('custom', { model: 'small-model' })
    const out = await chatJson({ ...baseReq, config: c, json: { name: 'x', schema } }, (r) => r as { a: string })
    expect(out.a).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const second = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    expect(second.response_format).toEqual({ type: 'json_object' })
    await chatJson({ ...baseReq, config: c, json: { name: 'x', schema } }, (r) => r)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('drops the reasoning parameter for models that refuse it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort' is not supported with this model." } }), { status: 400 }))
      .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await chat({ ...baseReq, config: cfg('openai', { model: 'gpt-4.1' }) })
    const second = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    expect(second.reasoning_effort).toBeUndefined()
  })

  it('turns HTTP errors into friendly messages', () => {
    const c = cfg('gemini')
    expect(classify(c, 400, 'API key not valid. Please pass a valid API key.').kind).toBe('auth')
    expect(classify(c, 429, 'Resource has been exhausted').kind).toBe('rate')
    expect(classify(c, 404, 'models/x is not found').kind).toBe('model')
    expect(classify(cfg('openrouter'), 402, 'Insufficient credits').kind).toBe('credits')
    expect(classify(c, 503, '').message).toMatch(/busy/)
  })

  it('explains network failures, with CORS hints for custom servers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(chat({ ...baseReq, config: cfg('custom') })).rejects.toThrow(/OLLAMA_ORIGINS/)
    await expect(chat({ ...baseReq, config: cfg('openai') })).rejects.toThrow(/internet connection/)
  })

  it('refuses without a configuration', async () => {
    await expect(chat({ ...baseReq, config: null })).rejects.toBeInstanceOf(AiError)
  })
})

describe('json helpers', () => {
  it('extracts JSON wrapped in prose or fences', () => {
    expect(extractJson('Sure! {"a":1,}')).toEqual({ a: 1 })
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 })
    expect(() => extractJson('nothing here')).toThrow()
  })
  it('reads a string field from unfinished JSON', () => {
    expect(partialStringField('{"reply": "Bonjour, je vou', 'reply')).toBe('Bonjour, je vou')
    expect(partialStringField('{"reply":"Il a dit \\"oui\\"\\nOK", "x"', 'reply')).toBe('Il a dit "oui"\nOK')
    expect(partialStringField('{"translation":"x"', 'reply')).toBeNull()
    expect(partialStringField('{"reply":"caf\\u00e9', 'reply')).toBe('café')
  })
})

describe('writing feedback', () => {
  it('normalises the model output', () => {
    const fb = coerceFeedback(
      {
        summary: 'Bien !',
        score: 112,
        level: 'a2',
        errors: [{ ...err('ai allé', 'suis allé'), lesson: 'passe-compose-etre' }, { ...err('le', 'la'), lesson: 'none' }, { ...err('x', 'y'), lesson: 'made-up' }, 'junk'],
        corrected: 'Je suis allé',
        improved: 'Je suis allé',
        strengths: ['ok', 3],
        vocabulary: [{ fr: 'la plage', en: 'beach' }, { fr: '' }],
      },
      new Set(lessons.map((l) => l.id)),
    )
    expect(fb.score).toBe(100)
    expect(fb.level).toBe('A2')
    expect(fb.errors.map((e) => e.lesson)).toEqual(['passe-compose-etre', null, null])
    expect(fb.strengths).toEqual(['ok'])
    expect(fb.vocabulary).toHaveLength(1)
  })

  it('sends the text with the lesson list and a schema limited to real lessons', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify({ summary: '', score: 90, level: 'A2', errors: [], corrected: 'a', improved: 'a', strengths: [], vocabulary: [] }) }],
          stop_reason: 'end_turn',
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const fb = await getWritingFeedback({ config: cfg('anthropic'), text: ' Je suis allé. ', task: 'Weekend', level: 'A2', lessons })
    expect(fb.score).toBe(90)
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string)
    expect(body.messages[0].content).toContain('Je suis allé.')
    expect(body.system).toContain('passe-compose-etre — Passé composé with être')
    expect(body.output_config.format.schema.properties.errors.items.properties.lesson.enum).toEqual(['passe-compose-etre', 'articles', 'none'])
  })

  it('reports truncated answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ content: [], stop_reason: 'max_tokens' }), { status: 200 })))
    await expect(getWritingFeedback({ config: cfg('anthropic'), text: 'x', task: 't', level: 'A1', lessons })).rejects.toThrow(/cut off/)
  })
})

describe('segmentText', () => {
  it('finds errors in order without overlaps', () => {
    const text = "Hier, j'ai allé à la plage avec le amie. J'ai mangé un glace."
    const { segments, located } = segmentText(text, [err("j'ai allé", 'je suis allé'), err('le amie', "l'amie"), err('un glace', 'une glace'), err('introuvable', 'x')])
    expect(located).toEqual(new Set([0, 1, 2]))
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments.filter((s) => s.error !== undefined).map((s) => s.text)).toEqual(["j'ai allé", 'le amie', 'un glace'])
  })
  it('matches curly apostrophes and different case', () => {
    const { located } = segmentText('J’ai allé au cinéma.', [err("j'ai allé", 'je suis allé')])
    expect(located.has(0)).toBe(true)
  })
  it('skips overlapping spans', () => {
    const { located } = segmentText('le petit chat', [err('le petit', 'la petite'), err('petit chat', 'petite chatte')])
    expect([...located]).toEqual([0])
  })
})

describe('countWords', () => {
  it('counts elided and hyphenated words once', () => {
    expect(countWords("J'ai vu l'arc-en-ciel aujourd'hui !")).toBe(4)
    expect(countWords('   ')).toBe(0)
  })
})
