import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  List,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  Languages,
  Lightbulb,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { SCENARIO_BY_ID, type Scenario } from '../../data/scenarios'
import { LESSON_BY_ID } from '../../data/grammar'
import { alreadyHave, findWord } from '../../data/vocab'
import { AccentBar } from '../../components/AccentBar'
import { ConnectAiCard } from '../../components/AiSetup'
import { Callout, Empty, Ring } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { newId, useStore } from '../../lib/store'
import { isAbort, segmentText, useAiConfig, type WritingError } from '../../lib/ai'
import { useDocumentTitle } from '../../lib/hooks'
import { noteCorrections } from '../../lib/mistakes'
import { useSpeechCapture } from '../../lib/recognition'
import { speak, stopSpeaking } from '../../lib/speech'
import { customWord, frTypo } from '../../lib/words'
import { LookupText } from '../reading/LookupText'
import { conversationFeedback, nextTurn, setupFor } from './api'
import { useStartConversation } from './start'
import type { ChatTurn, Conversation } from './types'

const pref = (k: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(`petit-a-petit-talk-${k}`)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}
const setPref = (k: string, v: boolean) => {
  try {
    localStorage.setItem(`petit-a-petit-talk-${k}`, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export default function TalkChatRoute() {
  const { id = '' } = useParams()
  const c = useStore((s) => s.conversations.find((x) => x.id === id))
  useDocumentTitle(c ? c.title : 'Conversation')
  if (!c)
    return (
      <Container size={720} py="xl">
        <PageHeader back={{ to: '/library#talk', label: 'Library' }} title="Conversation" />
        <Empty icon={<Flag size={30} />} title="This conversation isn’t here any more">
          It may have been deleted.{' '}
          <Anchor component={Link} to="/library#talk" inherit>
            Start a new one
          </Anchor>
        </Empty>
      </Container>
    )
  return <TalkChat key={c.id} c={c} />
}

function TalkChat({ c }: { c: Conversation }) {
  const navigate = useNavigate()
  const ai = useAiConfig()
  const scenario = SCENARIO_BY_ID[c.scenarioId]
  const aiName = scenario?.aiName ?? 'Camille'
  const strict = useStore((s) => s.settings.strictAccents)
  const autoplay = useStore((s) => s.settings.autoplay)
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  const saveConversation = useStore((s) => s.saveConversation)
  const logActivity = useStore((s) => s.logActivity)
  const startConversation = useStartConversation()

  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const [showEn, setShowEn] = useState(() => pref('en', false))
  const [voice, setVoice] = useState(() => pref('voice', autoplay))
  const [accents, setAccents] = useState(() => pref('accents', false))
  const [fbLoading, setFbLoading] = useState(false)
  const [fbError, setFbError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const mic = useSpeechCapture({ recordVoice: false, maxSeconds: 30 })

  const myTurns = c.turns.filter((t) => t.role === 'me').length
  const last = c.turns[c.turns.length - 1]
  const awaitingReply = last?.role === 'me'
  const lastAi = [...c.turns].reverse().find((t) => t.role === 'ai')
  const suggestions = lastAi?.suggestions ?? []
  const finished = !!c.feedback
  const allGoals = scenario && scenario.goals.every((g) => c.goalsMet.includes(g.id))

  const current = () => useStore.getState().conversations.find((x) => x.id === c.id) ?? c

  // Keep the view pinned to the newest message unless the learner scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [c.turns.length, pending, fbLoading, finished, error])

  useEffect(
    () => () => {
      abort.current?.abort()
      stopSpeaking()
    },
    [],
  )

  // Dictated text goes into the message box.
  useEffect(() => {
    if (mic.state === 'done' && mic.result?.alternatives[0]) {
      setInput((v) => (v.trim() ? `${v.trim()} ${mic.result!.alternatives[0]}` : mic.result!.alternatives[0]))
      inputRef.current?.focus()
    }
  }, [mic.state, mic.result])

  const run = async (conv: Conversation) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setPending('')
    setError('')
    stick.current = true
    try {
      const r = await nextTurn(setupFor(conv, scenario, strict), conv.turns, {
        config: ai,
        signal: ctrl.signal,
        onReply: (p) => setPending(p),
      })
      const latest = current()
      const me = latest.turns[latest.turns.length - 1]
      const turns = latest.turns.map((t) => (t.id === me.id ? { ...t, corrections: r.corrections } : t))
      const aiTurn: ChatTurn = {
        id: newId('t'),
        role: 'ai',
        text: r.reply,
        translation: r.translation,
        suggestions: r.suggestions,
        at: new Date().toISOString(),
      }
      const newlyMet = r.goalsMet.filter((g) => !latest.goalsMet.includes(g))
      const goalsMet = [...new Set([...latest.goalsMet, ...r.goalsMet])]
      saveConversation({
        ...latest,
        turns: [...turns, aiTurn],
        goalsMet,
        ended: latest.ended || r.ended,
        updatedAt: new Date().toISOString(),
      })
      if (me.role === 'me') {
        noteCorrections('talk', r.corrections, me.text, latest.id)
        logActivity(r.corrections.length === 0)
      }
      if (voice) speak(r.reply, { voiceURI, rate })
      if (scenario && newlyMet.length) {
        const done = scenario.goals.every((g) => goalsMet.includes(g.id))
        toast(done ? 'All goals done! Finish to get your feedback — or keep chatting.' : `Goal reached: ${scenario.goals.find((g) => g.id === newlyMet[0])?.text}`)
      }
      setHelp(false)
    } catch (e) {
      if (isAbort(e) && ctrl.signal.aborted) return
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      if (abort.current === ctrl) setPending(null)
    }
  }

  const send = (text = input) => {
    const t = text.trim()
    if (!t || pending !== null || finished || !ai) return
    stopSpeaking()
    const conv: Conversation = {
      ...current(),
      turns: [...current().turns, { id: newId('t'), role: 'me', text: t, at: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    }
    saveConversation(conv)
    setInput('')
    run(conv)
  }

  const finish = async () => {
    if (fbLoading || !ai) return
    abort.current?.abort()
    setPending(null)
    stopSpeaking()
    setFbLoading(true)
    setFbError('')
    stick.current = true
    try {
      const fb = await conversationFeedback(current(), scenario, aiName, { config: ai })
      saveConversation({ ...current(), feedback: fb, ended: true, updatedAt: new Date().toISOString() })
    } catch (e) {
      setFbError(e instanceof Error ? e.message : 'Couldn’t get feedback.')
    } finally {
      setFbLoading(false)
    }
  }

  const toggle = (k: 'en' | 'voice' | 'accents', v: boolean) => {
    setPref(k, v)
    if (k === 'en') setShowEn(v)
    if (k === 'voice') {
      setVoice(v)
      if (!v) stopSpeaking()
    }
    if (k === 'accents') setAccents(v)
  }

  const pressed = (on: boolean) => (on ? { variant: 'light' as const } : { variant: 'subtle' as const, color: 'gray' })

  return (
    <div className="chat">
      <Group component="header" gap={8} wrap="nowrap" px="md" py={10} bg="var(--surface)" style={{ borderBottom: '1px solid var(--border)' }}>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => navigate('/library#talk')} aria-label="Back to conversations">
          <ArrowLeft size={20} aria-hidden />
        </ActionIcon>
        <Stack gap={0} flex={1} miw={0} lh={1.25}>
          <Text fz={18} fw={600} truncate className="fr" lang="fr">
            {frTypo(c.title)}
          </Text>
          <Text size="sm" c="dimmed">
            with {aiName} · {c.level}
          </Text>
        </Stack>
        {scenario && (
          <Badge
            color={allGoals ? 'green' : 'gray'}
            leftSection={<Flag size={12} aria-hidden />}
            className="tnum"
            visibleFrom="xs"
            title="Goals reached"
          >
            {c.goalsMet.length}/{scenario.goals.length}
          </Badge>
        )}
        <ActionIcon
          {...pressed(showEn)}
          size="lg"
          aria-pressed={showEn}
          onClick={() => toggle('en', !showEn)}
          aria-label={showEn ? 'Hide translations' : 'Show translations'}
          title="Translations"
        >
          <Languages size={19} aria-hidden />
        </ActionIcon>
        <ActionIcon
          {...pressed(voice)}
          size="lg"
          aria-pressed={voice}
          onClick={() => toggle('voice', !voice)}
          aria-label={voice ? 'Stop reading replies aloud' : 'Read replies aloud'}
          title="Read replies aloud"
        >
          {voice ? <Volume2 size={19} aria-hidden /> : <VolumeX size={19} aria-hidden />}
        </ActionIcon>
        {!finished && (
          <Button
            size="xs"
            variant={allGoals || c.ended ? 'filled' : 'default'}
            onClick={finish}
            disabled={myTurns === 0 || !ai}
            loading={fbLoading}
            leftSection={<Check size={15} aria-hidden />}
          >
            Finish
          </Button>
        )}
      </Group>

      <Box
        ref={scroller}
        flex={1}
        style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        <Stack gap={14} maw={720} mx="auto" px="md" pt={20} pb={28}>
          {scenario ? (
            <ScenarioIntro
              scenario={scenario}
              met={c.goalsMet}
              onPhrase={(p) => {
                setInput((v) => (v.trim() ? `${v.trim()} ${p}` : p))
                inputRef.current?.focus()
              }}
              disabled={finished}
            />
          ) : (
            <Card padding="md">
              <Text size="sm" c="dimmed">
                Free conversation{c.topic ? ` about “${c.topic}”` : ''}. Write in French — mistakes are corrected under each message. Stuck?
                Tap <Lightbulb size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> for ideas, or write in English.
              </Text>
            </Card>
          )}

          {!ai && !finished && <ConnectAiCard title="Connect an AI to continue this conversation" />}

          {c.turns.map((t, i) =>
            t.role === 'ai' ? (
              <AiBubble key={t.id} turn={t} name={aiName} showEn={showEn} source={`talk:${c.id}`} />
            ) : (
              <MeBubble
                key={t.id}
                turn={t}
                checking={i === c.turns.length - 1 && pending !== null}
                failed={i === c.turns.length - 1 && !!error}
              />
            ),
          )}

          {pending !== null && <AiBubble turn={{ id: 'pending', role: 'ai', text: pending, at: '' }} name={aiName} showEn={false} streaming />}

          {error && <ErrorBox message={error} onRetry={awaitingReply ? () => run(current()) : undefined} />}

          {(fbLoading || fbError || c.feedback) && (
            <FeedbackPanel
              c={c}
              scenario={scenario}
              loading={fbLoading}
              error={fbError}
              onRetry={finish}
              onAgain={() => navigate(`/talk/${startConversation({ scenarioId: c.scenarioId, level: c.level, topic: c.topic })}`)}
            />
          )}
        </Stack>
      </Box>

      {!finished && (
        <Box
          component="footer"
          px="md"
          pt={10}
          pb="calc(10px + env(safe-area-inset-bottom))"
          bg="var(--surface)"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <Box maw={720} mx="auto">
            {help && (
              <Group gap={6} pb={10} aria-label="Ideas for what to say">
                {suggestions.length ? (
                  suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="default"
                      radius="xl"
                      size="sm"
                      h="auto"
                      mih={34}
                      py={5}
                      fz={15}
                      fw={400}
                      className="fr"
                      lang="fr"
                      styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}
                      onClick={() => {
                        setInput(s)
                        inputRef.current?.focus()
                      }}
                    >
                      {frTypo(s)}
                    </Button>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    {scenario ? 'Try one of the useful phrases above, or write in English and see how to say it.' : 'Say anything — or write in English and see how to say it in French.'}
                  </Text>
                )}
              </Group>
            )}
            <Group gap={6} wrap="nowrap" align="flex-end">
              <ActionIcon
                {...(help ? { variant: 'light' as const, color: 'orange' } : { variant: 'subtle' as const, color: 'gray' })}
                size={44}
                radius="xl"
                aria-pressed={help}
                onClick={() => setHelp((v) => !v)}
                aria-label="Ideas for what to say"
                title="Ideas for what to say"
              >
                <Lightbulb size={19} aria-hidden />
              </ActionIcon>
              <Textarea
                ref={inputRef}
                flex={1}
                miw={0}
                autosize
                minRows={1}
                maxRows={5}
                radius="xl"
                size="md"
                classNames={{ input: 'fr' }}
                lang="fr"
                value={mic.state === 'listening' && mic.interim ? `${input} ${mic.interim}`.trim() : input}
                onChange={(e) => setInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={mic.state === 'listening' ? 'Listening…' : `Reply to ${aiName}…`}
                aria-label="Your message"
                disabled={!ai}
                autoComplete="off"
                spellCheck={false}
                rightSectionPointerEvents="all"
                rightSection={
                  <ActionIcon
                    {...pressed(accents)}
                    radius="xl"
                    size="lg"
                    className="fr"
                    fz={18}
                    aria-pressed={accents}
                    onClick={() => toggle('accents', !accents)}
                    aria-label="Accent keys"
                    title="Accent keys"
                  >
                    é
                  </ActionIcon>
                }
              />
              {mic.mode !== 'record' && (
                <ActionIcon
                  {...(mic.state === 'listening' ? { variant: 'filled' as const, color: 'red' } : { variant: 'subtle' as const, color: 'gray' })}
                  size={44}
                  radius="xl"
                  onClick={() => (mic.state === 'listening' ? mic.stop() : mic.start())}
                  disabled={!ai || mic.state === 'starting'}
                  loading={mic.state === 'processing'}
                  aria-label={mic.state === 'listening' ? 'Stop dictation' : 'Speak your reply'}
                  title="Speak your reply"
                >
                  {mic.state === 'listening' ? <Square size={17} aria-hidden /> : <Mic size={19} aria-hidden />}
                </ActionIcon>
              )}
              <ActionIcon size={44} radius="xl" variant="filled" onClick={() => send()} disabled={!input.trim() || pending !== null || !ai} aria-label="Send">
                <Send size={17} aria-hidden />
              </ActionIcon>
            </Group>
            {accents && <AccentBar inputRef={inputRef} onInsert={setInput} />}
            {mic.state === 'error' && (
              <Text size="sm" c="red" mt={6}>
                {mic.error}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </div>
  )
}

/** A red box with an error message and an optional Retry button. */
function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" radius="lg" role="alert" p="sm">
      <Group justify="space-between" gap={10}>
        <Text size="sm" c="red">
          {message}
        </Text>
        {onRetry && (
          <Button variant="default" size="xs" onClick={onRetry} leftSection={<RotateCcw size={14} aria-hidden />}>
            Retry
          </Button>
        )}
      </Group>
    </Alert>
  )
}

/** The scenario's goals, ticked off as they're reached. */
function GoalList({ goals, met, label, srDone }: { goals: Scenario['goals']; met: string[]; label?: string; srDone?: boolean }) {
  return (
    <List spacing={6} listStyleType="none" aria-label={label} fz={14.5} styles={{ itemWrapper: { alignItems: 'flex-start' }, itemIcon: { marginTop: 2 } }}>
      {goals.map((g) => {
        const ok = met.includes(g.id)
        return (
          <List.Item
            key={g.id}
            icon={
              ok ? (
                <CheckCircle2 size={17} aria-hidden color="var(--mantine-color-green-filled)" />
              ) : (
                <Circle size={17} aria-hidden color="var(--mantine-color-dimmed)" />
              )
            }
          >
            <Text span inherit c={ok ? 'dimmed' : undefined} td={ok ? 'line-through' : undefined}>
              {g.text}
            </Text>
            {srDone && <span className="sr-only">{ok ? ' (done)' : ''}</span>}
          </List.Item>
        )
      })}
    </List>
  )
}

function ScenarioIntro({ scenario, met, onPhrase, disabled }: { scenario: Scenario; met: string[]; onPhrase: (p: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <Card component="section" padding="md">
      <Text c="dimmed" mb={10}>
        {scenario.setting}
      </Text>
      <GoalList goals={scenario.goals} met={met} label="Your goals" srDone />
      <Anchor component="button" type="button" size="sm" fw={600} mt={10} onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ alignSelf: 'flex-start' }}>
        {open ? 'Hide useful phrases' : 'Useful phrases'}
      </Anchor>
      {open && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={6} mt={10}>
          {scenario.phrases.map((p) => (
            <Card
              key={p.fr}
              component="button"
              type="button"
              padding="xs"
              radius="md"
              bg="var(--surface-2)"
              ta="left"
              onClick={() => onPhrase(p.fr)}
              disabled={disabled}
              title="Insert into your message"
              opacity={disabled ? 0.6 : undefined}
              style={{ font: 'inherit', color: 'inherit', cursor: disabled ? 'default' : 'pointer' }}
            >
              <Text fz={15.5} className="fr" lang="fr">
                {frTypo(p.fr)}
              </Text>
              <Text size="sm" c="dimmed">
                {p.en}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Card>
  )
}

function AiBubble({ turn, name, showEn, streaming, source }: { turn: ChatTurn; name: string; showEn: boolean; streaming?: boolean; source?: string }) {
  const [reveal, setReveal] = useState(false)
  const en = (showEn || reveal) && turn.translation
  return (
    <div className="msg msg--ai">
      <Avatar size={32} radius="xl" color="indigo" className="fr" aria-hidden>
        {name[0]}
      </Avatar>
      <div className="bubble bubble--ai">
        <div className="fr bubble__text" lang="fr">
          {streaming ? (
            turn.text ? (
              <>
                {frTypo(turn.text)}
                <span className="caret" aria-hidden />
              </>
            ) : (
              <span className="typing" aria-label={`${name} is typing`}>
                <span />
                <span />
                <span />
              </span>
            )
          ) : (
            <LookupText text={turn.text} source={source} />
          )}
        </div>
        {en && <div className="bubble__en">{turn.translation}</div>}
        {!streaming && (
          <Group gap={6} mt={4} mx={-6} mb={-4}>
            <SpeakButton text={turn.text} size="sm" label="Listen" />
            {turn.translation && !showEn && (
              <Anchor component="button" type="button" size="sm" fw={600} onClick={() => setReveal((v) => !v)}>
                {reveal ? 'Hide translation' : 'Translate'}
              </Anchor>
            )}
          </Group>
        )}
      </div>
    </div>
  )
}

export function correctedText(text: string, corrections: WritingError[]): string {
  const { segments } = segmentText(text, corrections)
  return segments.map((s) => (s.error === undefined ? s.text : corrections[s.error].correction)).join('')
}

/** "wrong → right" in the diff colours. */
function Change({ from, to, mt, fallback = '' }: { from?: string; to: string; mt?: number; fallback?: string }) {
  return (
    <div className="fix__change fr" lang="fr" style={{ fontSize: 16, marginTop: mt }}>
      {from !== undefined && <del>{frTypo(from)}</del>}
      {from !== undefined && <ArrowRight size={14} aria-hidden color="var(--mantine-color-dimmed)" />}
      <ins>{frTypo(to) || fallback}</ins>
    </div>
  )
}

function MeBubble({ turn, checking, failed }: { turn: ChatTurn; checking: boolean; failed: boolean }) {
  const [open, setOpen] = useState(false)
  const corr = turn.corrections
  const fixed = useMemo(() => (corr?.length ? correctedText(turn.text, corr) : ''), [turn.text, corr])
  return (
    <div className="msg msg--me">
      <div className="bubble bubble--me fr" lang="fr">
        {frTypo(turn.text)}
      </div>
      <Box fz={12.5} mih={18}>
        {corr === undefined ? (
          checking ? (
            <Group gap={4} c="dimmed" fz="inherit">
              <Loader size={10} color="gray" aria-hidden /> checking…
            </Group>
          ) : failed ? (
            <Text span inherit c="dimmed">
              not checked
            </Text>
          ) : null
        ) : corr.length === 0 ? (
          <Text span inherit c="green" fw={600}>
            <Check size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> Correct
          </Text>
        ) : (
          <Badge
            component="button"
            type="button"
            color="orange"
            variant="light"
            size="md"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            style={{ cursor: 'pointer', textTransform: 'none' }}
          >
            {corr.length} correction{corr.length > 1 ? 's' : ''}
          </Badge>
        )}
      </Box>
      {open && corr && corr.length > 0 && (
        <Paper withBorder radius="lg" px={14} py={12} maw="min(560px, 92%)">
          <Text fz={17} c="green" className="fr" lang="fr">
            {frTypo(fixed)}
          </Text>
          <Divider my={10} />
          <Stack component="ul" gap={10} m={0} p={0} style={{ listStyle: 'none' }}>
            {corr.map((e, i) => {
              const lesson = e.lesson ? LESSON_BY_ID[e.lesson] : undefined
              return (
                <li key={i}>
                  <Change from={e.original} to={e.correction} fallback="(remove)" />
                  <Text size="sm" c="dimmed" mt={2}>
                    {e.explanation}
                    {lesson && (
                      <>
                        {' '}
                        <Anchor component={Link} to={`/grammar/${lesson.id}`} target="_blank" rel="noreferrer" inherit>
                          {lesson.title}
                        </Anchor>
                      </>
                    )}
                  </Text>
                </li>
              )
            })}
          </Stack>
        </Paper>
      )}
    </div>
  )
}

function FeedbackPanel({
  c,
  scenario,
  loading,
  error,
  onRetry,
  onAgain,
}: {
  c: Conversation
  scenario?: Scenario
  loading: boolean
  error: string
  onRetry: () => void
  onAgain: () => void
}) {
  const customWords = useStore((s) => s.customWords)
  const addCustomWords = useStore((s) => s.addCustomWords)
  const introduced = useStore((s) => s.introduced)
  const fb = c.feedback
  if (loading)
    return (
      <Card mt={6} role="status">
        <Group gap={10} c="dimmed">
          <Loader size="sm" aria-hidden /> Reviewing your conversation…
        </Group>
      </Card>
    )
  if (!fb) return <ErrorBox message={error} onRetry={onRetry} />
  const vocab = fb.vocabulary.map((v) => {
    const w = customWord(v.fr, v.en)
    return { ...v, word: w, added: !!findWord(w.id, customWords) || alreadyHave(w, customWords, introduced) }
  })
  const heading = (text: string) => (
    <Title order={3} fz={15} mt={16} mb={8}>
      {text}
    </Title>
  )
  return (
    <Card component="section" mt={6} aria-labelledby="talk-fb">
      <Group gap="md" mb={12} wrap="nowrap">
        <Ring value={fb.score / 100} size={72} stroke={7} label={`Score ${fb.score} out of 100`}>
          <span className="tnum">{fb.score}</span>
        </Ring>
        <div>
          <Text size="sm" fw={600} c="dimmed">
            Feedback{fb.level ? ` · sounds like ${fb.level}` : ''}
          </Text>
          <Title order={2} id="talk-fb" fz={24} className="fr">
            {fb.score >= 85 ? 'Excellent !' : fb.score >= 65 ? 'Bien joué !' : 'Bon effort !'}
          </Title>
        </div>
      </Group>
      <Text>{fb.summary}</Text>

      {scenario && (
        <Box my={12}>
          <GoalList goals={scenario.goals} met={c.goalsMet} />
        </Box>
      )}

      {fb.strengths.length > 0 && (
        <>
          {heading('What went well')}
          <List spacing={6} listStyleType="none" icon={<Check size={16} aria-hidden color="var(--mantine-color-green-filled)" />}>
            {fb.strengths.map((s, i) => (
              <List.Item key={i}>{s}</List.Item>
            ))}
          </List>
        </>
      )}

      {fb.improvements.length > 0 && (
        <>
          {heading('To work on')}
          <Stack component="ul" gap={12} m={0} p={0} style={{ listStyle: 'none' }}>
            {fb.improvements.map((im, i) => {
              const lesson = im.lesson ? LESSON_BY_ID[im.lesson] : undefined
              return (
                <li key={i}>
                  <Text>{im.point}</Text>
                  {(im.example || im.better) && <Change from={im.example || undefined} to={im.better} mt={4} />}
                  {lesson && (
                    <Anchor component={Link} to={`/grammar/${lesson.id}`} size="sm" fw={600} mt={6} display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
                      Review: {lesson.title} <ArrowRight size={14} aria-hidden />
                    </Anchor>
                  )}
                </li>
              )
            })}
          </Stack>
        </>
      )}

      {vocab.length > 0 && (
        <>
          <Group justify="space-between" mt={16} mb={8}>
            <Title order={3} fz={15}>
              Words to keep
            </Title>
            {vocab.some((v) => !v.added) && (
              <Button
                variant="default"
                size="xs"
                leftSection={<Plus size={15} aria-hidden />}
                onClick={() => {
                  const fresh = vocab.filter((v) => !v.added).map((v) => ({ ...v.word, from: `talk:${c.id}` }))
                  addCustomWords(fresh)
                  toast(`Added ${fresh.length} word${fresh.length > 1 ? 's' : ''} to your flashcards`)
                }}
              >
                Add all
              </Button>
            )}
          </Group>
          <Stack component="ul" gap={8} m={0} p={0} style={{ listStyle: 'none' }}>
            {vocab.map((v) => (
              <Group component="li" key={v.word.id} gap={10} wrap="nowrap">
                <SpeakButton text={v.word.fr} size="sm" />
                <Box miw={0} flex={1}>
                  <Text fz={17} className="fr" lang="fr">
                    {frTypo(v.fr)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {v.en}
                  </Text>
                </Box>
                {v.added ? (
                  <Badge color="green" leftSection={<Check size={12} aria-hidden />}>
                    added
                  </Badge>
                ) : (
                  <ActionIcon
                    variant="default"
                    size="md"
                    aria-label={`Add ${v.fr} to flashcards`}
                    onClick={() => {
                      addCustomWords([{ ...v.word, from: `talk:${c.id}` }])
                      toast(`Added “${v.fr}”`)
                    }}
                  >
                    <Plus size={15} aria-hidden />
                  </ActionIcon>
                )}
              </Group>
            ))}
          </Stack>
        </>
      )}

      {fb.tip && <Callout kind="tip">{fb.tip}</Callout>}

      <Group gap={8} mt={18}>
        <Button onClick={onAgain} leftSection={<RotateCcw size={16} aria-hidden />}>
          Practice again
        </Button>
        <Button component={Link} to="/library#talk" variant="default">
          Other situations
        </Button>
      </Group>
    </Card>
  )
}
