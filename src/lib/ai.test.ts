import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRequestBody, countWords, getWritingFeedback, parseFeedback, segmentText, type WritingError } from './ai'

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

describe('request', () => {
  it('asks for structured JSON and constrains lesson ids', () => {
    const body = buildRequestBody({ model: 'claude-sonnet-5-5', text: ' Je suis allé. ', task: 'Weekend', level: 'A2', lessons })
    expect(body.model).toBe('claude-sonnet-5-5')
    expect(body.messages[0].content).toContain('Je suis allé.')
    expect(body.output_config.format.type).toBe('json_schema')
    const schema = body.output_config.format.schema as { properties: { errors: { items: { properties: { lesson: { enum: string[] } } } } } }
    expect(schema.properties.errors.items.properties.lesson.enum).toEqual(['passe-compose-etre', 'articles', 'none'])
    expect(body.system).toContain('passe-compose-etre — Passé composé with être')
  })
})

describe('parseFeedback', () => {
  it('normalises the model output', () => {
    const fb = parseFeedback({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'Bien !',
            score: 112,
            level: 'a2',
            errors: [{ ...err('ai allé', 'suis allé'), lesson: 'passe-compose-etre' }, { ...err('le', 'la'), lesson: 'none' }],
            corrected: 'Je suis allé',
            improved: 'Je suis allé',
            strengths: ['ok'],
            vocabulary: [{ fr: 'la plage', en: 'beach' }],
          }),
        },
      ],
    })
    expect(fb.score).toBe(100)
    expect(fb.level).toBe('A2')
    expect(fb.errors[0].lesson).toBe('passe-compose-etre')
    expect(fb.errors[1].lesson).toBeNull()
  })
  it('reports truncated or empty responses', () => {
    expect(() => parseFeedback({ stop_reason: 'max_tokens', content: [] })).toThrow(/cut off/)
    expect(() => parseFeedback({ content: [] })).toThrow(/empty/)
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

describe('getWritingFeedback', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('calls the Messages API from the browser with the right headers', async () => {
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
    const fb = await getWritingFeedback({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5-5', text: 'Bonjour', task: 't', level: 'A1', lessons })
    expect(fb.score).toBe(90)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const h = init.headers as Record<string, string>
    expect(h['x-api-key']).toBe('sk-ant-test')
    expect(h['anthropic-version']).toBe('2023-06-01')
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it('turns HTTP errors into friendly messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 })))
    await expect(getWritingFeedback({ apiKey: 'bad', model: 'm', text: 'x', task: 't', level: 'A1', lessons })).rejects.toThrow(/rejected/)
  })

  it('refuses without a key', async () => {
    await expect(getWritingFeedback({ apiKey: '', model: 'm', text: 'x', task: 't', level: 'A1', lessons })).rejects.toThrow(/API key/)
  })
})
