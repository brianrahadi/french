import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Anchor, Box, Button, Card, Collapse, Group, Loader, Paper, SegmentedControl, Text, Textarea, TextInput, Title, Container } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { ArrowLeft, ChevronDown, Send, Sparkles } from 'lucide-react'
import { PROMPT_BY_ID } from '../../data/writing'
import { LESSONS, LESSON_BY_ID } from '../../data/grammar'
import { LEVELS, type Level } from '../../data/types'
import { AccentBar } from '../../components/AccentBar'
import { Callout, Kbd, LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { AiError, countWords, describeConfig, getWritingFeedback, useAiConfig } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { frTypo } from '../../lib/words'
import { ConnectAiCard } from '../../components/AiSetup'
import { noteCorrections } from '../../lib/mistakes'

const DRAFT_KEY = 'petit-a-petit-draft:'

function loadDraft(key: string): string {
  try {
    return localStorage.getItem(DRAFT_KEY + key) ?? ''
  } catch {
    return ''
  }
}
function saveDraft(key: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(DRAFT_KEY + key, text)
    else localStorage.removeItem(DRAFT_KEY + key)
  } catch {
    /* storage unavailable — drafts are a convenience */
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export default function WritingEditor() {
  const [params] = useSearchParams()
  const promptId = params.get('prompt') ?? 'free'
  const rewriteId = params.get('rewrite')
  const navigate = useNavigate()

  const writings = useStore((s) => s.writings)
  const startLevel = useStore((s) => s.startLevel)
  const addWriting = useStore((s) => s.addWriting)
  const logActivityBulk = useStore((s) => s.logActivityBulk)
  const ai = useAiConfig()

  const original = rewriteId ? writings.find((w) => w.id === rewriteId) : undefined
  const prompt = PROMPT_BY_ID[original?.promptId ?? promptId]
  const kind = prompt ? 'prompt' : (original?.promptId ?? promptId) === 'custom' ? 'custom' : 'free'
  useDocumentTitle(original ? 'Rewrite' : prompt ? prompt.titleFr : 'Writing')

  const draftKey = rewriteId ? `rewrite-${rewriteId}` : promptId
  const [text, setText] = useState(() => loadDraft(draftKey) || original?.text || '')
  const [customTask, setCustomTask] = useState(original && kind === 'custom' ? original.task : '')
  const [level, setLevel] = useState<Level>(prompt?.level ?? original?.level ?? startLevel ?? 'A2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [showPhrases, setShowPhrases] = useState(false)
  // Same breakpoints as the app shell: the bottom nav appears at 860px, the submit bar stacks at 480px.
  const withBottomNav = useMediaQuery('(max-width: 860px)')
  const narrow = useMediaQuery('(max-width: 480px)')

  useEffect(() => saveDraft(draftKey, text === original?.text ? '' : text), [draftKey, text, original?.text])
  useEffect(() => () => abort.current?.abort(), [])


  const words = countWords(text)
  const [min, max] = prompt?.words ?? [30, 250]
  const task =
    kind === 'prompt'
      ? prompt!.task
      : kind === 'custom'
        ? customTask.trim() || 'Write about a topic of your choice.'
        : 'Free writing — any topic the learner chooses.'
  const title = kind === 'prompt' ? `${prompt!.titleFr}` : kind === 'custom' ? customTask.trim().slice(0, 60) || 'Your own topic' : 'Free writing'
  const canSubmit = words >= 5 && !loading && !!ai && (kind !== 'custom' || customTask.trim().length > 0)

  const lessonList = useMemo(() => LESSONS.map((l) => ({ id: l.id, title: `${l.title} (${l.level})` })), [])

  const submit = async () => {
    if (!canSubmit) return
    setError('')
    setLoading(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const feedback = await getWritingFeedback({
        config: ai,
        text,
        task,
        focus: prompt?.focus,
        level,
        lessons: lessonList,
        signal: ctrl.signal,
      })
      const id = newId()
      addWriting({
        id,
        promptId: kind === 'prompt' ? prompt!.id : kind,
        title,
        task,
        level,
        text: text.trim(),
        words,
        createdAt: new Date().toISOString(),
        model: ai ? describeConfig(ai) : '',
        feedback,
        revisionOf: original?.id,
      })
      noteCorrections('writing', feedback.errors, text.trim(), id)
      // Count writing toward the daily goal: roughly one "answer" per ten words.
      const items = Math.max(1, Math.round(words / 10))
      logActivityBulk(items, Math.round((items * feedback.score) / 100), 'writing')
      saveDraft(draftKey, '')
      navigate(`/writing/${id}`, { replace: true })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(e instanceof AiError || e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const insert = (phrase: string) => {
    const el = area.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const before = text.slice(0, start)
    const sep = before && !/\s$/.test(before) ? ' ' : ''
    const piece = sep + phrase.replace(/…$/, '')
    setText(before + piece + text.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + piece.length, start + piece.length)
    })
  }

  const counterColor = words === 0 ? undefined : words < min || words > max ? 'orange' : 'green'

  return (
    <Container size={760} py="xl">
      <Anchor
        component={Link}
        to={original ? `/writing/${original.id}` : '/library#writing'}
        size="sm"
        fw={600}
        c="dimmed"
        mb="sm"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={16} aria-hidden /> {original ? 'Back to feedback' : 'Library'}
      </Anchor>

      <Card component="section" aria-labelledby="task-title">
        {original && (
          <Text size="sm" fw={600} c="indigo" mb={10}>
            Rewrite — use your corrections, but try not to copy them
          </Text>
        )}
        {kind === 'prompt' ? (
          <>
            <Group gap="xs" mb={8}>
              <LevelBadge level={prompt!.level} />
              <Text span size="sm" c="dimmed">
                {min}–{max} words
              </Text>
            </Group>
            <Title order={1} id="task-title" fz={28} fw={600} className="fr" lang="fr">
              {prompt!.titleFr}
            </Title>
            <Text fz={16} c="dimmed" mt={6}>
              {prompt!.task}
            </Text>
            <Group gap={6} mt={10}>
              <Text span size="sm" c="dimmed">
                Practices:
              </Text>
              {prompt!.lessons.map((id) => (
                <Button key={id} component={Link} to={`/grammar/${id}`} variant="default" size="compact-sm" radius="xl" fw={500}>
                  {LESSON_BY_ID[id]?.title ?? id}
                </Button>
              ))}
            </Group>
            <Button
              variant="subtle"
              size="compact-sm"
              mt={14}
              px={4}
              aria-expanded={showPhrases}
              aria-controls="writing-phrases"
              onClick={() => setShowPhrases((v) => !v)}
              rightSection={<ChevronDown size={14} aria-hidden style={{ transform: showPhrases ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />}
            >
              Useful phrases
            </Button>
            <Collapse expanded={showPhrases}>
              <Group gap={6} mt={10} id="writing-phrases">
                {prompt!.phrases.map((ph) => (
                  <Button
                    key={ph}
                    variant="default"
                    size="compact-sm"
                    radius="xl"
                    fw={400}
                    fz={14.5}
                    className="fr"
                    lang="fr"
                    onClick={() => insert(ph)}
                    title="Insert"
                  >
                    {frTypo(ph)}
                  </Button>
                ))}
              </Group>
            </Collapse>
          </>
        ) : (
          <>
            <Title order={1} id="task-title" fz={28} fw={600} className="fr" lang="fr">
              {kind === 'custom' ? 'Ton propre sujet' : 'Écriture libre'}
            </Title>
            {kind === 'custom' ? (
              <TextInput
                id="custom-task"
                mt={10}
                label="What will you write about?"
                value={customTask}
                onChange={(e) => setCustomTask(e.currentTarget.value)}
                placeholder="e.g. Describe your favourite café in Vancouver"
              />
            ) : (
              <Text fz={16} c="dimmed" mt={6}>
                Write about anything — your day, a plan, a message to a friend.
              </Text>
            )}
            <Group gap={10} mt={12}>
              <Text span size="sm" fw={500}>
                Your level
              </Text>
              <SegmentedControl size="sm" data={LEVELS} value={level} onChange={(v) => setLevel(v as Level)} aria-label="Your level" />
            </Group>
          </>
        )}
      </Card>

      {/* The writing surface is the core of the page: keeps its own frame (focus ring) and French typography. */}
      <Box className="writing-editor">
        <label htmlFor="writing-text" className="sr-only">
          Your text in French
        </label>
        <Textarea
          id="writing-text"
          ref={area}
          variant="unstyled"
          autosize
          minRows={8}
          classNames={{ input: 'writing-area' }}
          styles={{ input: { minHeight: 260, padding: '20px 22px 8px', fontSize: 19, lineHeight: 1.7 } }}
          lang="fr"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder="Écris ici…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="sentences"
          readOnly={loading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <Group justify="space-between" align="flex-end" gap={12} px={14} pb={14}>
          <AccentBar inputRef={area} onInsert={setText} disabled={loading} />
          <Text span size="sm" className="tnum" c={counterColor} aria-live="polite">
            {words} word{words === 1 ? '' : 's'}
            {kind === 'prompt' && (
              <Text span c="dimmed" inherit>
                {' '}
                · aim for {min}–{max}
              </Text>
            )}
          </Text>
        </Group>
      </Box>

      {error && <Callout kind="warn">{error}</Callout>}

      {!ai && (
        <Box mt={16}>
          <ConnectAiCard title="Connect an AI to get feedback" />
        </Box>
      )}

      <Paper
        pos="sticky"
        bottom={withBottomNav ? 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 10px)' : 12}
        mt={16}
        py={10}
        pr={10}
        pl={16}
        radius={16}
        shadow="md"
        style={{
          zIndex: 5,
          background: 'color-mix(in srgb, var(--mantine-color-body) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Group justify="space-between" gap={12} wrap="nowrap">
          {loading ? (
            <>
              <Group gap={10} role="status" fw={600} c="var(--mantine-primary-color-light-color)" wrap="nowrap">
                <Loader size={18} aria-hidden />
                {ai?.name ?? 'The AI'} is reading your text…
              </Group>
              <Button variant="subtle" color="gray" onClick={() => abort.current?.abort()}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {!narrow && (
                <Text span size="sm" c="dimmed">
                  <Sparkles size={14} aria-hidden style={{ verticalAlign: '-2px' }} /> Corrections explain every change
                </Text>
              )}
              <Button
                size="lg"
                fullWidth={narrow}
                ml="auto"
                onClick={submit}
                disabled={!canSubmit}
                leftSection={<Send size={17} aria-hidden />}
                rightSection={<Kbd>⌘↵</Kbd>}
              >
                Get feedback
              </Button>
            </>
          )}
        </Group>
      </Paper>
    </Container>
  )
}
