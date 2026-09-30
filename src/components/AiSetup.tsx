import { useMemo, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, RefreshCw, Server } from 'lucide-react'
import {
  CUSTOM_PRESETS,
  PROVIDER_BY_ID,
  PROVIDERS,
  listModels,
  resolveConfig,
  testConnection,
  useAi,
  type ModelOption,
  type ProviderId,
} from '../lib/ai'

type Status = 'idle' | 'testing' | 'ok' | 'error'

/**
 * Choose an AI provider, paste its key, pick a model and test the connection.
 * `compact` is the inline version shown inside features before anything is set up.
 */
export function AiSetup({ compact = false, onReady }: { compact?: boolean; onReady?: () => void }) {
  const ai = useAi()
  const provider = PROVIDER_BY_ID[ai.provider]
  return (
    <div className="ai-setup stack" style={{ gap: 14 }}>
      {compact ? (
        <div className="field" style={{ margin: 0 }}>
          <label className="label" htmlFor="ai-provider">
            Provider
          </label>
          <select id="ai-provider" className="select" value={provider.id} onChange={(e) => ai.setProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="provider-grid" role="radiogroup" aria-label="AI provider">
          {PROVIDERS.map((p) => {
            const on = p.id === provider.id
            const ok = !!resolveConfig(ai, p.id)
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`provider-card${on ? ' provider-card--on' : ''}`}
                onClick={() => ai.setProvider(p.id)}
              >
                <span className="provider-card__head">
                  <span className="provider-card__name">{p.name}</span>
                  {ok && <span className={`badge ${on ? 'badge--success' : ''}`}>{on ? 'In use' : 'Key saved'}</span>}
                </span>
                <span className="provider-card__blurb">{p.blurb}</span>
              </button>
            )
          })}
        </div>
      )}
      <ProviderPanel key={provider.id} providerId={provider.id} compact={compact} onReady={onReady} />
    </div>
  )
}

/** Key, address and model for one provider. Remounted when the provider changes. */
function ProviderPanel({ providerId, compact, onReady }: { providerId: ProviderId; compact: boolean; onReady?: () => void }) {
  const ai = useAi()
  const provider = PROVIDER_BY_ID[providerId]
  const savedKey = ai.keys[provider.id] ?? ''
  const [draft, setDraft] = useState(savedKey)
  const [baseUrl, setBaseUrl] = useState(ai.customBaseUrl)
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [canForce, setCanForce] = useState(false)

  const isCustom = provider.id === 'custom'
  const connected = !!resolveConfig(ai) && (ai.verified[provider.id] ?? false)
  const dirty = draft.trim() !== savedKey || (isCustom && baseUrl.trim().replace(/\/+$/, '') !== ai.customBaseUrl)

  const save = () => {
    ai.setKey(provider.id, draft)
    if (isCustom) ai.setCustom({ baseUrl })
  }

  const saveAndTest = async () => {
    const key = draft.trim()
    if (provider.needsKey && !key) return
    if (isCustom && !baseUrl.trim()) {
      setStatus('error')
      setMessage('Enter the server address first.')
      return
    }
    if (isCustom && !(ai.models.custom ?? '').trim()) {
      setStatus('error')
      setMessage('Enter the model name first (see “Load models”).')
      return
    }
    const next = { ...useAi.getState(), keys: { ...ai.keys, [provider.id]: key } }
    if (isCustom) next.customBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    const cfg = resolveConfig(next, provider.id)
    if (!cfg) return
    setStatus('testing')
    setMessage('')
    setCanForce(false)
    try {
      await testConnection(cfg)
      save()
      ai.setVerified(provider.id, true)
      setStatus('ok')
      setMessage(`Connected to ${cfg.name} — AI features are ready.`)
      onReady?.()
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
      setCanForce(true)
    }
  }

  const remove = () => {
    ai.setKey(provider.id, '')
    setDraft('')
    setStatus('idle')
    setMessage('')
  }

  const looksWrong = !!provider.keyPrefix && draft.trim() && !draft.trim().startsWith(provider.keyPrefix)

  return (
    <>
      {isCustom && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row-wrap" style={{ gap: 6 }}>
            <span className="small muted" style={{ marginRight: 2 }}>
              Presets:
            </span>
            {CUSTOM_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="chip chip--sm"
                aria-pressed={baseUrl === p.baseUrl}
                onClick={() => {
                  setBaseUrl(p.baseUrl)
                  ai.setCustom({ baseUrl: p.baseUrl, name: p.name })
                  if (p.model) ai.setModel('custom', p.model)
                  setStatus('idle')
                  setMessage(p.local ? `${p.name} runs on your computer. Start it, then load its models below.` : '')
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid-2" style={{ gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="ai-base">
                Server address
              </label>
              <div className="search">
                <Server size={17} aria-hidden />
                <input
                  id="ai-base"
                  className="input"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value)
                    setStatus('idle')
                  }}
                  onBlur={() => ai.setCustom({ baseUrl })}
                  placeholder="https://…/v1"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="ai-name">
                Name <span className="subtle">(optional)</span>
              </label>
              <input
                id="ai-name"
                className="input"
                value={ai.customName}
                onChange={(e) => ai.setCustom({ name: e.target.value })}
                placeholder="e.g. Mistral"
              />
            </div>
          </div>
        </div>
      )}

      <form
        className="api-key-row"
        onSubmit={(e) => {
          e.preventDefault()
          saveAndTest()
        }}
      >
        <div className="search" style={{ flex: 1, minWidth: 0 }}>
          <KeyRound size={17} aria-hidden />
          <input
            className="input"
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setStatus('idle')
              setMessage('')
            }}
            placeholder={provider.keyPlaceholder}
            aria-label={provider.keyLabel}
            autoComplete="off"
            spellCheck={false}
            style={{ paddingRight: 44, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14 }}
          />
          <button
            type="button"
            className="icon-btn icon-btn--sm api-key-row__eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={(provider.needsKey && !draft.trim()) || status === 'testing'}
        >
          {status === 'testing' && <LoaderCircle size={16} className="spin" aria-hidden />}
          {!dirty && (savedKey || isCustom) ? 'Test' : 'Save & test'}
        </button>
        {savedKey && (
          <button type="button" className="btn btn--ghost" onClick={remove}>
            Remove
          </button>
        )}
      </form>

      {looksWrong && status === 'idle' && (
        <p className="hint">
          {provider.short} keys usually start with “{provider.keyPrefix}”.
        </p>
      )}
      {message && (
        <div className="row-wrap" style={{ gap: 8 }}>
          <p className={`small ${status === 'ok' ? 'text-success' : status === 'error' ? 'text-danger' : 'muted'}`} role="status">
            {status === 'ok' && <CheckCircle2 size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 4 }} />}
            {message}
          </p>
          {canForce && status === 'error' && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                save()
                setStatus('idle')
                setMessage('Saved without a successful test.')
                setCanForce(false)
              }}
            >
              Save anyway
            </button>
          )}
        </div>
      )}
      {connected && status === 'idle' && !dirty && !compact && (
        <p className="small text-success">
          <CheckCircle2 size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 4 }} />
          Connected.
        </p>
      )}

      {(!compact || isCustom) && <ModelPicker providerId={provider.id} draftKey={draft} baseUrl={baseUrl} />}

      <p className="hint">
        {provider.keyUrl ? (
          <>
            Get a key at{' '}
            <a href={provider.keyUrl} target="_blank" rel="noreferrer">
              {new URL(provider.keyUrl).hostname}
            </a>
            .{' '}
          </>
        ) : null}
        Your key is stored only in this browser (never in backups) and sent only to{' '}
        {isCustom ? 'the server above' : provider.short}.{' '}
        {compact || isCustom ? '' : 'Typical cost: about a cent per correction or conversation.'}
      </p>
    </>
  )
}

function ModelPicker({ providerId, draftKey, baseUrl }: { providerId: ProviderId; draftKey: string; baseUrl: string }) {
  const ai = useAi()
  const provider = PROVIDER_BY_ID[providerId]
  const current = ai.models[providerId] || provider.defaultModel
  const [fetched, setFetched] = useState<ModelOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [typing, setTyping] = useState(false)

  const options = useMemo(() => {
    const map = new Map<string, ModelOption>()
    for (const m of provider.models) map.set(m.id, m)
    for (const m of fetched ?? []) if (!map.has(m.id)) map.set(m.id, m)
    if (current && !map.has(current)) map.set(current, { id: current, label: current })
    return [...map.values()]
  }, [provider.models, fetched, current])

  const load = async () => {
    const state = useAi.getState()
    const next = { ...state, keys: { ...state.keys, [providerId]: draftKey.trim() || state.keys[providerId] || '' } }
    if (providerId === 'custom') next.customBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    // Listing models doesn't need a model to be chosen yet.
    const cfg = resolveConfig({ ...next, models: { ...next.models, [providerId]: current || 'placeholder' } }, providerId)
    if (!cfg) {
      setError(providerId === 'custom' ? 'Enter the server address first.' : 'Enter your API key first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const list = await listModels(cfg)
      setFetched(list)
      if (!list.length) setError('No models found.')
      else if (providerId === 'custom' && !ai.models.custom) ai.setModel('custom', list[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load models.')
    } finally {
      setLoading(false)
    }
  }

  const showInput = typing || (providerId === 'custom' && !options.length)

  return (
    <div className="field" style={{ margin: 0 }}>
      <label className="label" htmlFor="ai-model">
        Model
      </label>
      <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
        {showInput ? (
          <input
            id="ai-model"
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            value={ai.models[providerId] ?? ''}
            placeholder={provider.defaultModel || 'model name, e.g. llama3.3'}
            onChange={(e) => ai.setModel(providerId, e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        ) : (
          <select
            id="ai-model"
            className="select"
            style={{ flex: 1, minWidth: 0 }}
            value={current}
            onChange={(e) => {
              if (e.target.value === '__other') setTyping(true)
              else ai.setModel(providerId, e.target.value)
            }}
          >
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.note ? ` · ${m.note}` : m.label !== m.id ? ` (${m.id})` : ''}
              </option>
            ))}
            <option value="__other">Other model…</option>
          </select>
        )}
        <button type="button" className="btn btn--secondary" onClick={load} disabled={loading} title="Load the models your key can use">
          {loading ? <LoaderCircle size={16} className="spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
          <span className="hide-sm">Load models</span>
        </button>
      </div>
      {error && <p className="small text-danger" style={{ marginTop: 6 }}>{error}</p>}
      {fetched && !error && <p className="hint">{fetched.length} models available.</p>}
    </div>
  )
}

/** Card shown inside a feature when no AI provider is connected yet. */
export function ConnectAiCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="card stack connect-ai" aria-label={title}>
      <h2 className="card__title">{title}</h2>
      <p className="muted small">
        {children ??
          'Use your own key from Claude, OpenAI, Gemini, OpenRouter — or a local model with Ollama. It’s stored only in this browser.'}
      </p>
      <AiSetup compact />
    </section>
  )
}
