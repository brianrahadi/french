/**
 * AI providers the app can talk to, and the learner's choice of provider, key and model.
 *
 * Keys live only in this browser (localStorage, separate from progress backups) and are
 * sent only to the provider they belong to — there is no server in between.
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'custom'
/** Wire format a provider speaks. Most third-party services speak OpenAI's. */
export type Protocol = 'anthropic' | 'openai' | 'gemini'

export interface ModelOption {
  id: string
  label: string
  note?: string
}

export interface ProviderInfo {
  id: ProviderId
  /** Full name, e.g. "Claude (Anthropic)". */
  name: string
  /** Short name used in sentences: "Claude is reading your text…". */
  short: string
  protocol: Protocol
  baseUrl: string
  keyUrl?: string
  keyLabel: string
  keyPlaceholder: string
  /** Typical key prefix, used for a gentle "this doesn't look right" hint. */
  keyPrefix?: string
  needsKey: boolean
  models: ModelOption[]
  defaultModel: string
  blurb: string
  /** Can transcribe recorded speech (used when the browser has no speech recognition). */
  canTranscribe?: boolean
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    short: 'Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyLabel: 'Anthropic API key',
    keyPlaceholder: 'sk-ant-…',
    keyPrefix: 'sk-ant-',
    needsKey: true,
    models: [
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'recommended, fast and precise' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'most thorough, slower' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', note: 'fastest, cheapest' },
    ],
    defaultModel: 'claude-sonnet-5-5',
    blurb: 'Excellent, careful corrections and natural conversation.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    short: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyLabel: 'OpenAI API key',
    keyPlaceholder: 'sk-…',
    keyPrefix: 'sk-',
    needsKey: true,
    models: [
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', note: 'recommended, strong and affordable' },
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', note: 'fastest, cheapest' },
      { id: 'gpt-6-astra', label: 'GPT-6 Astra', note: 'most capable, expensive' },
    ],
    defaultModel: 'gpt-6.1-sol',
    blurb: 'GPT models. Can also transcribe your speech if your browser can’t.',
    canTranscribe: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    short: 'Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyLabel: 'Gemini API key',
    keyPlaceholder: 'AIza…',
    keyPrefix: 'AIza',
    needsKey: true,
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', note: 'recommended, fast' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', note: 'cheapest' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)', note: 'most capable' },
    ],
    defaultModel: 'gemini-3.8-flash',
    blurb: 'Has a free tier in Google AI Studio. Can also transcribe your speech.',
    canTranscribe: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    short: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    keyLabel: 'OpenRouter API key',
    keyPlaceholder: 'sk-or-…',
    keyPrefix: 'sk-or-',
    needsKey: true,
    models: [
      { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5' },
      { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna' },
      { id: 'deepseek/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash' },
    ],
    defaultModel: 'anthropic/claude-sonnet-5.5',
    blurb: 'One key for hundreds of models (Claude, GPT, Gemini, Mistral, DeepSeek, Llama…).',
  },
  {
    id: 'custom',
    name: 'Other (OpenAI-compatible)',
    short: 'Your AI',
    protocol: 'openai',
    baseUrl: '',
    keyLabel: 'API key (if required)',
    keyPlaceholder: 'Optional',
    needsKey: false,
    models: [],
    defaultModel: '',
    blurb: 'Ollama, LM Studio, Mistral, Groq, DeepSeek, xAI or any server with an OpenAI-style API.',
  },
]

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderInfo>

/** Starting points for the "Other" provider. */
export const CUSTOM_PRESETS: { name: string; baseUrl: string; model: string; note?: string; local?: boolean }[] = [
  { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: '', note: 'Runs on your computer, free.', local: true },
  { name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', model: '', note: 'Runs on your computer, free.', local: true },
  { name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-medium-latest' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: '' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'xAI', baseUrl: 'https://api.x.ai/v1', model: '' },
]

// ───────────── settings store ─────────────

export interface AiSettingsState {
  provider: ProviderId
  keys: Partial<Record<ProviderId, string>>
  models: Partial<Record<ProviderId, string>>
  customBaseUrl: string
  customName: string
  /** Provider ids whose connection test has passed with the current key. */
  verified: Partial<Record<ProviderId, boolean>>
}

interface AiSettingsActions {
  setProvider: (p: ProviderId) => void
  setKey: (p: ProviderId, key: string) => void
  setModel: (p: ProviderId, model: string) => void
  setCustom: (patch: { baseUrl?: string; name?: string }) => void
  setVerified: (p: ProviderId, ok: boolean) => void
}

const initial: AiSettingsState = {
  provider: 'anthropic',
  keys: {},
  models: {},
  customBaseUrl: '',
  customName: '',
  verified: {},
}

export const useAi = create<AiSettingsState & AiSettingsActions>()(
  persist(
    (set) => ({
      ...initial,
      setProvider: (provider) => set({ provider }),
      setKey: (p, key) =>
        set((s) => ({ keys: { ...s.keys, [p]: key.trim() }, verified: { ...s.verified, [p]: false } })),
      setModel: (p, model) => set((s) => ({ models: { ...s.models, [p]: model.trim() } })),
      setCustom: ({ baseUrl, name }) =>
        set((s) => ({
          customBaseUrl: baseUrl !== undefined ? baseUrl.trim().replace(/\/+$/, '') : s.customBaseUrl,
          customName: name !== undefined ? name : s.customName,
          verified: baseUrl !== undefined ? { ...s.verified, custom: false } : s.verified,
        })),
      setVerified: (p, ok) => set((s) => ({ verified: { ...s.verified, [p]: ok } })),
    }),
    {
      name: 'petit-a-petit-ai',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        provider: s.provider,
        keys: s.keys,
        models: s.models,
        customBaseUrl: s.customBaseUrl,
        customName: s.customName,
        verified: s.verified,
      }),
      migrate: (persisted, version) => migrateAiSettings(persisted, version) as AiSettingsState & AiSettingsActions,
    },
  ),
)

/** v1 stored a single Claude key: { apiKey, model }. */
export function migrateAiSettings(persisted: unknown, version: number): AiSettingsState {
  const p = (persisted ?? {}) as Record<string, unknown>
  if (version < 2) {
    const apiKey = typeof p.apiKey === 'string' ? p.apiKey : ''
    const model = typeof p.model === 'string' ? p.model : ''
    return {
      ...initial,
      provider: 'anthropic',
      keys: apiKey ? { anthropic: apiKey } : {},
      models: model ? { anthropic: model } : {},
      verified: apiKey ? { anthropic: true } : {},
    }
  }
  return { ...initial, ...(p as Partial<AiSettingsState>) }
}

// ───────────── resolved configuration ─────────────

export interface AiConfig {
  provider: ProviderInfo
  key: string
  model: string
  baseUrl: string
  /** Display name, e.g. "Claude" or "Ollama". */
  name: string
}

/** The active configuration, or null when something required is missing. */
export function resolveConfig(s: AiSettingsState, id: ProviderId = s.provider): AiConfig | null {
  const provider = PROVIDER_BY_ID[id] ?? PROVIDER_BY_ID.anthropic
  const key = s.keys[provider.id]?.trim() ?? ''
  const model = s.models[provider.id]?.trim() || provider.defaultModel
  const baseUrl = provider.id === 'custom' ? s.customBaseUrl : provider.baseUrl
  if (provider.needsKey && !key) return null
  if (!model || !baseUrl) return null
  const name = provider.id === 'custom' ? s.customName.trim() || hostName(baseUrl) || provider.short : provider.short
  return { provider, key, model, baseUrl, name }
}

function hostName(url: string): string {
  try {
    const h = new URL(url).hostname
    if (h === 'localhost' || h === '127.0.0.1') return 'your local AI'
    return h.replace(/^api\./, '')
  } catch {
    return ''
  }
}

export function getAiConfig(): AiConfig | null {
  return resolveConfig(useAi.getState())
}

/** Hook: the active configuration (null when not set up yet). Stable between renders. */
export function useAiConfig(): AiConfig | null {
  const provider = useAi((s) => s.provider)
  const keys = useAi((s) => s.keys)
  const models = useAi((s) => s.models)
  const customBaseUrl = useAi((s) => s.customBaseUrl)
  const customName = useAi((s) => s.customName)
  return useMemo(
    () => resolveConfig({ provider, keys, models, customBaseUrl, customName, verified: {} }),
    [provider, keys, models, customBaseUrl, customName],
  )
}

/** Label for history entries, e.g. "Claude · claude-sonnet-5-5". */
export function describeConfig(c: AiConfig): string {
  return `${c.name} · ${c.model}`
}
