import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { CLAUDE_MODELS, testApiKey, useAi } from '../../lib/ai'

/** Paste, test and remove the Claude API key. Used in Settings and inline in the writing editor. */
export function ApiKeySetup({ compact = false }: { compact?: boolean }) {
  const apiKey = useAi((s) => s.apiKey)
  const model = useAi((s) => s.model)
  const setApiKey = useAi((s) => s.setApiKey)
  const setModel = useAi((s) => s.setModel)
  const [draft, setDraft] = useState(apiKey)
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const saveAndTest = async () => {
    const key = draft.trim()
    if (!key) return
    setStatus('testing')
    setMessage('')
    try {
      await testApiKey(key, model)
      setApiKey(key)
      setStatus('ok')
      setMessage('Connected — writing feedback is ready.')
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  const remove = () => {
    setApiKey('')
    setDraft('')
    setStatus('idle')
    setMessage('')
  }

  const looksWrong = draft.trim() && !draft.trim().startsWith('sk-ant-')

  return (
    <div className="stack" style={{ gap: 10 }}>
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
            }}
            placeholder="sk-ant-…"
            aria-label="Claude API key"
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
        <button type="submit" className="btn btn--primary" disabled={!draft.trim() || status === 'testing'}>
          {status === 'testing' ? <LoaderCircle size={16} className="spin" aria-hidden /> : null}
          {apiKey && draft.trim() === apiKey ? 'Test' : 'Save & test'}
        </button>
        {apiKey && (
          <button type="button" className="btn btn--ghost" onClick={remove}>
            Remove
          </button>
        )}
      </form>

      {looksWrong && status === 'idle' && <p className="hint">Claude API keys usually start with “sk-ant-”.</p>}
      {message && (
        <p className={`small ${status === 'ok' ? 'text-success' : 'text-danger'}`} role="status">
          {status === 'ok' && <CheckCircle2 size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 4 }} />}
          {message}
        </p>
      )}

      {!compact && (
        <div className="field" style={{ maxWidth: 360 }}>
          <label className="label" htmlFor="ai-model">
            Model
          </label>
          <select id="ai-model" className="select" value={model} onChange={(e) => setModel(e.target.value)}>
            {CLAUDE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="hint">
        Get a key at{' '}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
        . It’s stored only in this browser (never in your backups) and sent only to Anthropic. A correction typically costs
        about a cent.
      </p>
    </div>
  )
}
