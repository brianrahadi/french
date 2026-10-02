import { useMemo, useState } from 'react'
import {
  Anchor,
  Badge,
  Button,
  Card,
  Chip,
  Group,
  NativeSelect,
  PasswordInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { CheckCircle2, KeyRound, RefreshCw, Server } from 'lucide-react'
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
    <Stack gap={14}>
      {compact ? (
        <NativeSelect
          id="ai-provider"
          label="Provider"
          value={provider.id}
          onChange={(e) => ai.setProvider(e.currentTarget.value as ProviderId)}
          data={PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={8} role="radiogroup" aria-label="AI provider">
          {PROVIDERS.map((p) => {
            const on = p.id === provider.id
            const ok = !!resolveConfig(ai, p.id)
            return (
              <Radio.Card
                key={p.id}
                checked={on}
                onClick={() => ai.setProvider(p.id)}
                radius="md"
                px={14}
                py={12}
                bg={on ? 'var(--mantine-primary-color-light)' : undefined}
              >
                <Group justify="space-between" gap={8} wrap="nowrap">
                  <Text fw={650} fz={14.5}>
                    {p.name}
                  </Text>
                  {ok && (
                    <Badge size="sm" color={on ? 'green' : 'gray'}>
                      {on ? 'In use' : 'Key saved'}
                    </Badge>
                  )}
                </Group>
                <Text fz={12.5} c="dimmed" lh={1.4} mt={4}>
                  {p.blurb}
                </Text>
              </Radio.Card>
            )
          })}
        </SimpleGrid>
      )}
      <ProviderPanel key={provider.id} providerId={provider.id} compact={compact} onReady={onReady} />
    </Stack>
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
        <Stack gap={10}>
          <Group gap={6}>
            <Text size="sm" c="dimmed" mr={2}>
              Presets:
            </Text>
            {CUSTOM_PRESETS.map((p) => (
              <Chip
                key={p.name}
                size="xs"
                checked={baseUrl === p.baseUrl}
                onChange={() => {
                  setBaseUrl(p.baseUrl)
                  ai.setCustom({ baseUrl: p.baseUrl, name: p.name })
                  if (p.model) ai.setModel('custom', p.model)
                  setStatus('idle')
                  setMessage(p.local ? `${p.name} runs on your computer. Start it, then load its models below.` : '')
                }}
              >
                {p.name}
              </Chip>
            ))}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={10}>
            <TextInput
              id="ai-base"
              label="Server address"
              leftSection={<Server size={17} aria-hidden />}
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.currentTarget.value)
                setStatus('idle')
              }}
              onBlur={() => ai.setCustom({ baseUrl })}
              placeholder="https://…/v1"
              spellCheck={false}
              autoComplete="off"
            />
            <TextInput
              id="ai-name"
              label={
                <>
                  Name{' '}
                  <Text span c="dimmed" inherit>
                    (optional)
                  </Text>
                </>
              }
              value={ai.customName}
              onChange={(e) => ai.setCustom({ name: e.currentTarget.value })}
              placeholder="e.g. Mistral"
            />
          </SimpleGrid>
        </Stack>
      )}

      <Group
        component="form"
        gap={8}
        align="center"
        onSubmit={(e) => {
          e.preventDefault()
          saveAndTest()
        }}
      >
        <PasswordInput
          flex="1 1 260px"
          miw={0}
          leftSection={<KeyRound size={17} aria-hidden />}
          visible={show}
          onVisibilityChange={setShow}
          visibilityToggleButtonProps={{ 'aria-label': show ? 'Hide key' : 'Show key' }}
          value={draft}
          onChange={(e) => {
            setDraft(e.currentTarget.value)
            setStatus('idle')
            setMessage('')
          }}
          placeholder={provider.keyPlaceholder}
          aria-label={provider.keyLabel}
          autoComplete="off"
          spellCheck={false}
          styles={{ innerInput: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14 } }}
        />
        <Button type="submit" disabled={provider.needsKey && !draft.trim()} loading={status === 'testing'}>
          {!dirty && (savedKey || isCustom) ? 'Test' : 'Save & test'}
        </Button>
        {savedKey && (
          <Button variant="subtle" color="gray" onClick={remove}>
            Remove
          </Button>
        )}
      </Group>

      {looksWrong && status === 'idle' && (
        <Text size="xs" c="dimmed">
          {provider.short} keys usually start with “{provider.keyPrefix}”.
        </Text>
      )}
      {message && (
        <Group gap={8}>
          <Text size="sm" c={status === 'ok' ? 'green' : status === 'error' ? 'red' : 'dimmed'} role="status">
            {status === 'ok' && <CheckCircle2 size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 4 }} />}
            {message}
          </Text>
          {canForce && status === 'error' && (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => {
                save()
                setStatus('idle')
                setMessage('Saved without a successful test.')
                setCanForce(false)
              }}
            >
              Save anyway
            </Button>
          )}
        </Group>
      )}
      {connected && status === 'idle' && !dirty && !compact && (
        <Text size="sm" c="green">
          <CheckCircle2 size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 4 }} />
          Connected.
        </Text>
      )}

      {(!compact || isCustom) && <ModelPicker providerId={provider.id} draftKey={draft} baseUrl={baseUrl} />}

      <Text size="xs" c="dimmed">
        {provider.keyUrl ? (
          <>
            Get a key at{' '}
            <Anchor href={provider.keyUrl} target="_blank" rel="noreferrer" inherit>
              {new URL(provider.keyUrl).hostname}
            </Anchor>
            .{' '}
          </>
        ) : null}
        Your key is stored only in this browser (never in backups) and sent only to{' '}
        {isCustom ? 'the server above' : provider.short}.{' '}
        {compact || isCustom ? '' : 'Typical cost: about a cent per correction or conversation.'}
      </Text>
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
    <div>
      <Group gap={8} align="flex-end" wrap="nowrap">
        {showInput ? (
          <TextInput
            id="ai-model"
            label="Model"
            flex={1}
            miw={0}
            value={ai.models[providerId] ?? ''}
            placeholder={provider.defaultModel || 'model name, e.g. llama3.3'}
            onChange={(e) => ai.setModel(providerId, e.currentTarget.value)}
            spellCheck={false}
            autoComplete="off"
          />
        ) : (
          <NativeSelect
            id="ai-model"
            label="Model"
            flex={1}
            miw={0}
            value={current}
            onChange={(e) => {
              if (e.currentTarget.value === '__other') setTyping(true)
              else ai.setModel(providerId, e.currentTarget.value)
            }}
            data={[
              ...options.map((m) => ({
                value: m.id,
                label: `${m.label}${m.note ? ` · ${m.note}` : m.label !== m.id ? ` (${m.id})` : ''}`,
              })),
              { value: '__other', label: 'Other model…' },
            ]}
          />
        )}
        <Button
          variant="default"
          onClick={load}
          loading={loading}
          title="Load the models your key can use"
          aria-label="Load models"
          leftSection={<RefreshCw size={16} aria-hidden />}
        >
          <Text span inherit visibleFrom="sm">
            Load models
          </Text>
        </Button>
      </Group>
      {error && (
        <Text size="sm" c="red" mt={6}>
          {error}
        </Text>
      )}
      {fetched && !error && (
        <Text size="xs" c="dimmed" mt={4}>
          {fetched.length} models available.
        </Text>
      )}
    </div>
  )
}

/** Card shown inside a feature when no AI provider is connected yet. */
export function ConnectAiCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card component="section" aria-label={title}>
      <Stack gap="sm">
        <Title order={2} fz={17} fw={650}>
          {title}
        </Title>
        <Text size="sm" c="dimmed">
          {children ??
            'Use your own key from Claude, OpenAI, Gemini, OpenRouter — or a local model with Ollama. It’s stored only in this browser.'}
        </Text>
        <AiSetup compact />
      </Stack>
    </Card>
  )
}
