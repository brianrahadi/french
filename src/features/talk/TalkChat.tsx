import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  Languages,
  Lightbulb,
  LoaderCircle,
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
import { Empty, Ring } from '../../components/ui'
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
import { useStartConversation } from './TalkHome'
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
      <div className="page">
        <Link to="/talk" className="back-link">
          <ArrowLeft size={16} aria-hidden /> Talk
        </Link>
        <Empty icon={<Flag size={30} />} title="This conversation isn’t here any more">
          It may have been deleted. <Link to="/talk">Start a new one</Link>
        </Empty>
      </div>
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

  // Grow the textarea.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(160, el.scrollHeight + 2)}px`
  }, [input])

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

  return (
    <div className="chat">
      <header className="chat-top">
        <button type="button" className="icon-btn" onClick={() => navigate('/talk')} aria-label="Back to conversations">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="chat-top__title">
          <span className="fr" lang="fr">
            {frTypo(c.title)}
          </span>
          <span className="small subtle">
            with {aiName} · {c.level}
          </span>
        </div>
        {scenario && (
          <span className={`badge ${allGoals ? 'badge--success' : ''} tnum hide-xs`} title="Goals reached">
            <Flag size={12} aria-hidden /> {c.goalsMet.length}/{scenario.goals.length}
          </span>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-pressed={showEn}
          onClick={() => toggle('en', !showEn)}
          aria-label={showEn ? 'Hide translations' : 'Show translations'}
          title="Translations"
        >
          <Languages size={19} aria-hidden />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={voice}
          onClick={() => toggle('voice', !voice)}
          aria-label={voice ? 'Stop reading replies aloud' : 'Read replies aloud'}
          title="Read replies aloud"
        >
          {voice ? <Volume2 size={19} aria-hidden /> : <VolumeX size={19} aria-hidden />}
        </button>
        {!finished && (
          <button
            type="button"
            className={`btn btn--sm ${allGoals || c.ended ? 'btn--primary' : 'btn--secondary'}`}
            onClick={finish}
            disabled={myTurns === 0 || fbLoading || !ai}
          >
            {fbLoading ? <LoaderCircle size={15} className="spin" aria-hidden /> : <Check size={15} aria-hidden />} Finish
          </button>
        )}
      </header>

      <div
        className="chat-scroll"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        <div className="chat-inner">
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
            <div className="chat-intro card">
              <p className="small muted" style={{ margin: 0 }}>
                Free conversation{c.topic ? ` about “${c.topic}”` : ''}. Write in French — mistakes are corrected under each message. Stuck?
                Tap <Lightbulb size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> for ideas, or write in English.
              </p>
            </div>
          )}

          {!ai && !finished && (
            <ConnectAiCard title="Connect an AI to continue this conversation" />
          )}

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

          {error && (
            <div className="chat-error" role="alert">
              <span>{error}</span>
              {awaitingReply && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => run(current())}>
                  <RotateCcw size={14} aria-hidden /> Retry
                </button>
              )}
            </div>
          )}

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
        </div>
      </div>

      {!finished && (
        <footer className="chat-composer">
          {help && (
            <div className="chat-suggest" aria-label="Ideas for what to say">
              {suggestions.length ? (
                suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip fr"
                    lang="fr"
                    onClick={() => {
                      setInput(s)
                      inputRef.current?.focus()
                    }}
                  >
                    {frTypo(s)}
                  </button>
                ))
              ) : (
                <span className="small muted">
                  {scenario ? 'Try one of the useful phrases above, or write in English and see how to say it.' : 'Say anything — or write in English and see how to say it in French.'}
                </span>
              )}
            </div>
          )}
          <div className="chat-input-row">
            <button
              type="button"
              className="icon-btn"
              aria-pressed={help}
              onClick={() => setHelp((v) => !v)}
              aria-label="Ideas for what to say"
              title="Ideas for what to say"
            >
              <Lightbulb size={19} aria-hidden />
            </button>
            <div className="chat-input">
              <textarea
                ref={inputRef}
                rows={1}
                className="fr"
                lang="fr"
                value={mic.state === 'listening' && mic.interim ? `${input} ${mic.interim}`.trim() : input}
                onChange={(e) => setInput(e.target.value)}
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
              />
              <button
                type="button"
                className="chat-input__acc"
                aria-pressed={accents}
                onClick={() => toggle('accents', !accents)}
                aria-label="Accent keys"
                title="Accent keys"
              >
                é
              </button>
            </div>
            {mic.mode !== 'record' && (
              <button
                type="button"
                className={`icon-btn${mic.state === 'listening' ? ' icon-btn--rec' : ''}`}
                onClick={() => (mic.state === 'listening' ? mic.stop() : mic.start())}
                disabled={!ai || mic.state === 'starting' || mic.state === 'processing'}
                aria-label={mic.state === 'listening' ? 'Stop dictation' : 'Speak your reply'}
                title="Speak your reply"
              >
                {mic.state === 'listening' ? <Square size={17} aria-hidden /> : mic.state === 'processing' ? <LoaderCircle size={18} className="spin" aria-hidden /> : <Mic size={19} aria-hidden />}
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary chat-send"
              onClick={() => send()}
              disabled={!input.trim() || pending !== null || !ai}
              aria-label="Send"
            >
              <Send size={17} aria-hidden />
            </button>
          </div>
          {accents && <AccentBar inputRef={inputRef} onInsert={setInput} />}
          {mic.state === 'error' && <p className="small text-danger chat-mic-error">{mic.error}</p>}
        </footer>
      )}
    </div>
  )
}

function ScenarioIntro({ scenario, met, onPhrase, disabled }: { scenario: Scenario; met: string[]; onPhrase: (p: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="chat-intro card">
      <p className="chat-intro__setting">{scenario.setting}</p>
      <ul className="goal-list" aria-label="Your goals">
        {scenario.goals.map((g) => {
          const ok = met.includes(g.id)
          return (
            <li key={g.id} className={ok ? 'is-done' : ''}>
              {ok ? <CheckCircle2 size={17} aria-hidden /> : <Circle size={17} aria-hidden />}
              <span>{g.text}</span>
              <span className="sr-only">{ok ? ' (done)' : ''}</span>
            </li>
          )
        })}
      </ul>
      <button type="button" className="link-btn small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide useful phrases' : 'Useful phrases'}
      </button>
      {open && (
        <div className="phrase-list">
          {scenario.phrases.map((p) => (
            <button key={p.fr} type="button" className="phrase" onClick={() => onPhrase(p.fr)} disabled={disabled} title="Insert into your message">
              <span className="fr" lang="fr">
                {frTypo(p.fr)}
              </span>
              <span className="small subtle">{p.en}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function AiBubble({ turn, name, showEn, streaming, source }: { turn: ChatTurn; name: string; showEn: boolean; streaming?: boolean; source?: string }) {
  const [reveal, setReveal] = useState(false)
  const en = (showEn || reveal) && turn.translation
  return (
    <div className="msg msg--ai">
      <span className="msg__avatar" aria-hidden>
        {name[0]}
      </span>
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
          <div className="bubble__tools">
            <SpeakButton text={turn.text} size="sm" label="Listen" />
            {turn.translation && !showEn && (
              <button type="button" className="link-btn small" onClick={() => setReveal((v) => !v)}>
                {reveal ? 'Hide translation' : 'Translate'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function correctedText(text: string, corrections: WritingError[]): string {
  const { segments } = segmentText(text, corrections)
  return segments.map((s) => (s.error === undefined ? s.text : corrections[s.error].correction)).join('')
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
      <div className="msg__meta">
        {corr === undefined ? (
          checking ? (
            <span className="subtle">
              <LoaderCircle size={12} className="spin" aria-hidden /> checking…
            </span>
          ) : failed ? (
            <span className="subtle">not checked</span>
          ) : null
        ) : corr.length === 0 ? (
          <span className="msg__ok">
            <Check size={13} aria-hidden /> Correct
          </span>
        ) : (
          <button type="button" className="corr-chip" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {corr.length} correction{corr.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
      {open && corr && corr.length > 0 && (
        <div className="corr-panel">
          <p className="corr-panel__fixed fr" lang="fr">
            {frTypo(fixed)}
          </p>
          <ul className="stack" style={{ gap: 10 }}>
            {corr.map((e, i) => {
              const lesson = e.lesson ? LESSON_BY_ID[e.lesson] : undefined
              return (
                <li key={i}>
                  <div className="fix__change fr" lang="fr">
                    <del>{frTypo(e.original)}</del>
                    <ArrowRight size={14} aria-hidden className="subtle" />
                    <ins>{frTypo(e.correction) || '(remove)'}</ins>
                  </div>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    {e.explanation}
                    {lesson && (
                      <>
                        {' '}
                        <Link to={`/grammar/${lesson.id}`} target="_blank" rel="noreferrer">
                          {lesson.title}
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
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
      <div className="card talk-feedback talk-feedback--loading" role="status">
        <LoaderCircle size={18} className="spin" aria-hidden /> Reviewing your conversation…
      </div>
    )
  if (!fb)
    return (
      <div className="chat-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden /> Retry
        </button>
      </div>
    )
  const vocab = fb.vocabulary.map((v) => {
    const w = customWord(v.fr, v.en)
    return { ...v, word: w, added: !!findWord(w.id, customWords) || alreadyHave(w, customWords, introduced) }
  })
  return (
    <section className="card talk-feedback" aria-labelledby="talk-fb">
      <header className="result-head" style={{ marginBottom: 12 }}>
        <Ring value={fb.score / 100} size={72} stroke={7} label={`Score ${fb.score} out of 100`}>
          <span className="tnum">{fb.score}</span>
        </Ring>
        <div>
          <div className="page-eyebrow" style={{ margin: 0 }}>
            Feedback{fb.level ? ` · sounds like ${fb.level}` : ''}
          </div>
          <h2 id="talk-fb" className="talk-feedback__title">
            {fb.score >= 85 ? 'Excellent !' : fb.score >= 65 ? 'Bien joué !' : 'Bon effort !'}
          </h2>
        </div>
      </header>
      <p>{fb.summary}</p>

      {scenario && (
        <ul className="goal-list" style={{ margin: '12px 0' }}>
          {scenario.goals.map((g) => {
            const ok = c.goalsMet.includes(g.id)
            return (
              <li key={g.id} className={ok ? 'is-done' : ''}>
                {ok ? <CheckCircle2 size={17} aria-hidden /> : <Circle size={17} aria-hidden />}
                <span>{g.text}</span>
              </li>
            )
          })}
        </ul>
      )}

      {fb.strengths.length > 0 && (
        <>
          <h3 className="talk-feedback__h">What went well</h3>
          <ul className="strengths">
            {fb.strengths.map((s, i) => (
              <li key={i}>
                <Check size={16} aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {fb.improvements.length > 0 && (
        <>
          <h3 className="talk-feedback__h">To work on</h3>
          <ul className="stack" style={{ gap: 12 }}>
            {fb.improvements.map((im, i) => {
              const lesson = im.lesson ? LESSON_BY_ID[im.lesson] : undefined
              return (
                <li key={i} className="improvement">
                  <p style={{ margin: 0 }}>{im.point}</p>
                  {(im.example || im.better) && (
                    <div className="fix__change fr" lang="fr" style={{ marginTop: 4 }}>
                      {im.example && <del>{frTypo(im.example)}</del>}
                      {im.example && <ArrowRight size={14} aria-hidden className="subtle" />}
                      <ins>{frTypo(im.better)}</ins>
                    </div>
                  )}
                  {lesson && (
                    <Link to={`/grammar/${lesson.id}`} className="fix__lesson">
                      Review: {lesson.title} <ArrowRight size={14} aria-hidden />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {vocab.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <h3 className="talk-feedback__h" style={{ margin: 0 }}>
              Words to keep
            </h3>
            {vocab.some((v) => !v.added) && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  const fresh = vocab.filter((v) => !v.added).map((v) => ({ ...v.word, from: `talk:${c.id}` }))
                  addCustomWords(fresh)
                  toast(`Added ${fresh.length} word${fresh.length > 1 ? 's' : ''} to your flashcards`)
                }}
              >
                <Plus size={15} aria-hidden /> Add all
              </button>
            )}
          </div>
          <ul className="keep-list">
            {vocab.map((v) => (
              <li key={v.word.id}>
                <SpeakButton text={v.word.fr} size="sm" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="fr" lang="fr">
                    {frTypo(v.fr)}
                  </div>
                  <div className="muted small">{v.en}</div>
                </div>
                {v.added ? (
                  <span className="badge badge--success">
                    <Check size={12} aria-hidden /> added
                  </span>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--outline"
                    aria-label={`Add ${v.fr} to flashcards`}
                    onClick={() => {
                      addCustomWords([{ ...v.word, from: `talk:${c.id}` }])
                      toast(`Added “${v.fr}”`)
                    }}
                  >
                    <Plus size={15} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {fb.tip && (
        <div className="callout callout--tip" style={{ marginTop: 16 }}>
          <Lightbulb size={18} aria-hidden />
          <div>{fb.tip}</div>
        </div>
      )}

      <div className="row-wrap" style={{ gap: 8, marginTop: 18 }}>
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          <RotateCcw size={16} aria-hidden /> Practice again
        </button>
        <Link to="/talk" className="btn btn--secondary">
          Other situations
        </Link>
      </div>
    </section>
  )
}
