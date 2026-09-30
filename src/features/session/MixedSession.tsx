import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, BookOpen, CheckCircle2, Headphones, Layers, Mic, NotebookPen, PenLine, Target, Wrench } from 'lucide-react'
import { findWord } from '../../data/vocab'
import { LESSON_BY_ID } from '../../data/grammar'
import { FocusShell } from '../../components/FocusShell'
import { Kbd } from '../../components/ui'
import { PASS_MARK, useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { cardId, parseCardId, Rating, State, type Grade } from '../../lib/srs'
import { displayFr, frTypo } from '../../lib/words'
import { speechSupported } from '../../lib/speech'
import { recognitionSupported } from '../../lib/recognition'
import { noteConj, noteDictation, noteGrammar, noteLapse, noteSpeaking } from '../../lib/mistakes'
import { DictationQuestion, type DictationAnswer } from '../listening/DictationQuestion'
import { sentenceById } from '../listening/sentences'
import { SpeakQuestion, type SpeakAnswer } from '../speaking/SpeakQuestion'
import { FixQuestion, type FixAnswer } from '../weak/FixQuestion'
import { IntroCard, ProductionCard, RecognitionCard } from '../vocab/cards'
import { dirsFor } from '../vocab/selectors'
import { GrammarQuestion, promptText } from '../grammar/GrammarQuestion'
import type { Graded } from '../grammar/grade'
import { nextUp } from '../grammar/status'
import { DrillQuestion, type DrillAnswer } from '../conjugation/DrillQuestion'
import { fullForm } from '../conjugation/drill'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { buildMixedPlan, buildWeakPlan, lessonTitle, type MixedItem, type MixedPlan } from './plan'

interface Tally {
  n: number
  ok: number
}

interface Run {
  items: MixedItem[]
  learning: { id: string; due: number }[]
  current: MixedItem | null
  done: number
  vocab: Tally
  newWords: number
  grammar: Tally
  conj: Tally
  listen: Tally
  say: Tally
  fix: Tally
  /** First-try results for lessons being reviewed. */
  lessons: Record<string, Tally>
  mistakes: { what: string; given: string; expected: string }[]
}

const LEARN_AHEAD_MS = 20 * 60_000

function pick(r: Run): Run {
  const now = Date.now()
  const learning = [...r.learning].sort((a, b) => a.due - b.due)
  if (learning[0] && learning[0].due <= now) {
    const [first, ...rest] = learning
    return { ...r, learning: rest, current: { kind: 'card', id: first.id } }
  }
  if (r.items.length) {
    const [first, ...rest] = r.items
    return { ...r, items: rest, current: first, learning }
  }
  if (learning[0] && learning[0].due - now < LEARN_AHEAD_MS) {
    const [first, ...rest] = learning
    return { ...r, learning: rest, current: { kind: 'card', id: first.id } }
  }
  return { ...r, current: null, learning }
}

function insertAt<T>(arr: T[], index: number, item: T): T[] {
  const a = [...arr]
  a.splice(Math.min(index, a.length), 0, item)
  return a
}

const bump = (t: Tally, ok: boolean): Tally => ({ n: t.n + 1, ok: t.ok + (ok ? 1 : 0) })

function start(plan: MixedPlan): Run {
  return pick({
    items: plan.items,
    learning: [],
    current: null,
    done: 0,
    vocab: { n: 0, ok: 0 },
    newWords: 0,
    grammar: { n: 0, ok: 0 },
    conj: { n: 0, ok: 0 },
    listen: { n: 0, ok: 0 },
    say: { n: 0, ok: 0 },
    fix: { n: 0, ok: 0 },
    lessons: {},
    mistakes: [],
  })
}

function Kind({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mix-kind" aria-label={`Section: ${label}`}>
      {icon}
      {label}
    </div>
  )
}

export default function MixedSessionRoute() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'weak' ? 'weak' : 'daily'
  return <MixedSession key={mode} mode={mode} />
}

function MixedSession({ mode }: { mode: 'daily' | 'weak' }) {
  useDocumentTitle(mode === 'weak' ? 'Weak spots' : 'Today’s session')
  const exitTo = mode === 'weak' ? '/weak' : '/'
  const [plan] = useState(() => {
    const opts = { tts: speechSupported, asr: recognitionSupported }
    return mode === 'weak' ? buildWeakPlan(useStore.getState(), Math.random, opts) : buildMixedPlan(useStore.getState(), Math.random, opts)
  })
  const [run, setRun] = useState<Run>(() => start(plan))
  const [startedAt] = useState(() => Date.now())

  const directions = useStore((s) => s.settings.directions)
  const customWords = useStore((s) => s.customWords)
  const introduceWord = useStore((s) => s.introduceWord)
  const rateCard = useStore((s) => s.rateCard)
  const recordConj = useStore((s) => s.recordConj)
  const recordLesson = useStore((s) => s.recordLesson)
  const logActivity = useStore((s) => s.logActivity)
  const recordSentence = useStore((s) => s.recordSentence)
  const resolveMistake = useStore((s) => s.resolveMistake)

  const remaining = run.items.length + run.learning.length + (run.current ? 1 : 0)
  const progress = run.done / Math.max(1, run.done + remaining)
  const count = `${run.done}/${run.done + remaining}`
  const cur = run.current

  // Record spaced-review results once the session is over.
  const finalized = useRef(false)
  useEffect(() => {
    if (cur || finalized.current) return
    finalized.current = true
    for (const id of plan.reviewLessons) {
      const t = run.lessons[id]
      if (t && t.n > 0) recordLesson(id, t.ok / t.n)
    }
  }, [cur, plan.reviewLessons, run.lessons, recordLesson])

  const advance = () => setRun((r) => pick({ ...r, done: r.done + 1 }))

  const onIntroduced = (wordId: string, known: boolean) => {
    const dirs = dirsFor(directions)
    introduceWord(wordId, dirs, known)
    logActivity(true, { newWord: true })
    setRun((r) => {
      let items = r.items
      if (!known) {
        items = insertAt(items, 2, { kind: 'card', id: cardId(wordId, dirs[0]) })
        if (dirs[1]) items = insertAt(items, 6, { kind: 'card', id: cardId(wordId, dirs[1]) })
      }
      return pick({ ...r, items, done: r.done + 1, newWords: r.newWords + 1 })
    })
  }

  const onRated = (id: string, grade: Grade) => {
    const next = rateCard(id, grade)
    const ok = grade !== Rating.Again
    logActivity(ok)
    if (!ok) {
      const { wordId, dir } = parseCardId(id)
      const w = findWord(wordId, customWords)
      if (w) noteLapse(wordId, dir === 'r' ? w.fr : w.en, dir === 'r' ? w.en : displayFr(w))
    }
    setRun((r) => {
      const dueMs = new Date(next.due).getTime()
      const again = (next.state === State.Learning || next.state === State.Relearning) && dueMs - Date.now() < 60 * 60_000
      return pick({
        ...r,
        learning: again ? [...r.learning, { id, due: dueMs }] : r.learning,
        done: r.done + 1,
        vocab: bump(r.vocab, ok),
      })
    })
  }

  const onGrammar = (item: Extract<MixedItem, { kind: 'grammar' }>, g: Graded) => {
    logActivity(g.pass)
    if (item.retry) return
    const ex = LESSON_BY_ID[item.lessonId].exercises[item.index]
    noteGrammar(item.lessonId, promptText(ex), g, 'explain' in ex ? ex.explain : undefined)
    setRun((r) => ({
      ...r,
      grammar: bump(r.grammar, g.pass),
      lessons: item.review ? { ...r.lessons, [item.lessonId]: bump(r.lessons[item.lessonId] ?? { n: 0, ok: 0 }, g.pass) } : r.lessons,
      mistakes: g.pass ? r.mistakes : [...r.mistakes, { what: promptText(ex), given: g.given, expected: g.expected }],
      // A missed item comes back a few questions later.
      items: g.pass ? r.items : insertAt(r.items, 4, { ...item, retry: true }),
    }))
  }

  const onGrammarOverride = (item: Extract<MixedItem, { kind: 'grammar' }>) => {
    setRun((r) =>
      pick({
        ...r,
        done: r.done + 1,
        grammar: { ...r.grammar, ok: r.grammar.ok + 1 },
        lessons: item.review
          ? { ...r.lessons, [item.lessonId]: { ...r.lessons[item.lessonId], ok: (r.lessons[item.lessonId]?.ok ?? 0) + 1 } }
          : r.lessons,
        mistakes: r.mistakes.slice(0, -1),
        items: r.items.filter((x) => !(x.kind === 'grammar' && x.retry && x.lessonId === item.lessonId && x.index === item.index)),
      }),
    )
  }

  const onConj = (item: Extract<MixedItem, { kind: 'conj' }>, a: DrillAnswer) => {
    logActivity(a.pass)
    if (item.retry) return
    recordConj(a.item.inf, a.item.tense, a.pass)
    noteConj(a.item.inf, a.item.tense, { pass: a.pass, given: a.given, expected: fullForm(a.item) })
    setRun((r) => ({
      ...r,
      conj: bump(r.conj, a.pass),
      mistakes: a.pass
        ? r.mistakes
        : [...r.mistakes, { what: `${a.item.inf} · ${TENSE_BY_ID[a.item.tense].label}`, given: a.given, expected: fullForm(a.item) }],
      items: a.pass ? r.items : insertAt(r.items, 4, { ...item, retry: true }),
    }))
  }

  const onFix = (item: Extract<MixedItem, { kind: 'fix' }>, a: FixAnswer) => {
    logActivity(a.pass)
    if (a.pass) resolveMistake(a.mistake.id)
    if (item.retry) return
    setRun((r) => ({
      ...r,
      fix: bump(r.fix, a.pass),
      mistakes: a.pass ? r.mistakes : [...r.mistakes, { what: a.mistake.prompt ?? '', given: a.given, expected: a.mistake.expected }],
      items: a.pass ? r.items : insertAt(r.items, 4, { ...item, retry: true }),
    }))
  }

  const onListen = (a: DictationAnswer) => {
    recordSentence('listening', a.sentence.id, a.result.score)
    noteDictation(a.sentence, a.result)
    logActivity(a.result.score >= 70)
    setRun((r) => ({ ...r, listen: bump(r.listen, a.result.score >= 70) }))
  }

  const onSay = (a: SpeakAnswer) => {
    if (!a.attempts) return
    recordSentence('speaking', a.sentence.id, a.score)
    if (a.match) noteSpeaking(a.sentence, a.match)
    logActivity(a.score >= 60)
    setRun((r) => ({ ...r, say: bump(r.say, a.score >= 60) }))
  }

  if (!plan.items.length) return <NothingToDo mode={mode} />

  if (!cur) {
    return (
      <FocusShell progress={1} exitTo={exitTo} label="Session" count={count}>
        <Summary run={run} plan={plan} startedAt={startedAt} />
      </FocusShell>
    )
  }

  const key = `q-${run.done}`
  let body: React.ReactNode = null

  if (cur.kind === 'intro' || cur.kind === 'card') {
    const wordId = cur.kind === 'intro' ? cur.wordId : parseCardId(cur.id).wordId
    const w = findWord(wordId, customWords)
    if (!w) {
      setTimeout(advance)
      return null
    }
    body = (
      <>
        <Kind icon={<Layers size={15} aria-hidden />} label={plan.mode === 'weak' ? 'Vocabulary · weak spot' : 'Vocabulary'} />
        {cur.kind === 'intro' ? (
          <IntroCard key={key} word={w} onDone={(known) => onIntroduced(w.id, known)} />
        ) : parseCardId(cur.id).dir === 'r' ? (
          <RecognitionCard key={key} word={w} id={cur.id} onRate={(g) => onRated(cur.id, g)} />
        ) : (
          <ProductionCard key={key} word={w} id={cur.id} onRate={(g) => onRated(cur.id, g)} />
        )}
      </>
    )
  } else if (cur.kind === 'grammar') {
    const lesson = LESSON_BY_ID[cur.lessonId]
    body = (
      <GrammarQuestion
        key={key}
        ex={lesson.exercises[cur.index]}
        context={
          <Kind
            icon={<BookOpen size={15} aria-hidden />}
            label={`Grammar · ${lesson.title}${cur.retry ? ' · retry' : cur.review ? ' · review' : cur.weak ? ' · weak spot' : ''}`}
          />
        }
        onAnswered={(g) => onGrammar(cur, g)}
        onContinue={advance}
        onOverride={cur.retry ? undefined : () => onGrammarOverride(cur)}
      />
    )
  } else if (cur.kind === 'conj') {
    body = (
      <>
        <Kind icon={<PenLine size={15} aria-hidden />} label={`Conjugation${cur.retry ? ' · retry' : ''}`} />
        <DrillQuestion key={key} item={cur.item} onAnswered={(a) => onConj(cur, a)} onContinue={advance} />
      </>
    )
  } else if (cur.kind === 'fix') {
    const m = useStore.getState().mistakes.find((x) => x.id === cur.mistakeId)
    if (!m) {
      setTimeout(advance)
      return null
    }
    body = (
      <FixQuestion
        key={key}
        mistake={m}
        context={<Kind icon={<Wrench size={15} aria-hidden />} label={`Fix it${cur.retry ? ' · retry' : ''}`} />}
        onAnswered={(a) => onFix(cur, a)}
        onContinue={advance}
      />
    )
  } else {
    const sentence = sentenceById(cur.sentenceId)
    if (!sentence) {
      setTimeout(advance)
      return null
    }
    body =
      cur.kind === 'listen' ? (
        <DictationQuestion
          key={key}
          sentence={sentence}
          context={<Kind icon={<Headphones size={15} aria-hidden />} label="Listening" />}
          onAnswered={onListen}
          onContinue={advance}
        />
      ) : (
        <SpeakQuestion
          key={key}
          sentence={sentence}
          context={<Kind icon={<Mic size={15} aria-hidden />} label="Speaking" />}
          onAnswered={onSay}
          onContinue={advance}
        />
      )
  }

  return (
    <FocusShell progress={progress} exitTo={exitTo} label={mode === 'weak' ? 'Weak spots' : 'Today’s session'} count={count}>
      {body}
    </FocusShell>
  )
}

function NothingToDo({ mode }: { mode: 'daily' | 'weak' }) {
  const up = nextUp(useStore.getState().lessons)
  if (mode === 'weak')
    return (
      <FocusShell progress={1} exitTo="/weak" label="Session">
        <div className="results">
          <Target size={44} color="var(--success)" aria-hidden />
          <h1 className="results__title">No weak spots right now</h1>
          <p className="muted" style={{ maxWidth: 440 }}>
            Mistakes from drills, writing, conversations and dictation show up here. Keep practising and come back later.
          </p>
          <Link to="/" className="btn btn--primary btn--lg" style={{ marginTop: 18 }}>
            Back to Today
          </Link>
        </div>
      </FocusShell>
    )
  return (
    <FocusShell progress={1} exitTo="/" label="Session">
      <div className="results">
        <CheckCircle2 size={44} color="var(--success)" aria-hidden />
        <h1 className="results__title">Tout est à jour&nbsp;!</h1>
        <p className="muted" style={{ maxWidth: 440 }}>
          No reviews are due and you’ve hit today’s new-word limit. Learn a new grammar point or write a few sentences.
        </p>
        <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 18 }}>
          {up && (
            <Link to={`/grammar/${up.id}`} className="btn btn--primary btn--lg">
              Learn: {up.title}
            </Link>
          )}
          <Link to="/writing" className="btn btn--secondary btn--lg">
            <NotebookPen size={17} aria-hidden /> Write
          </Link>
        </div>
      </div>
    </FocusShell>
  )
}

function Summary({ run, plan, startedAt }: { run: Run; plan: MixedPlan; startedAt: number }) {
  const navigate = useNavigate()
  const lessons = useStore((s) => s.lessons)
  const up = nextUp(lessons)
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
  const total = run.vocab.n + run.grammar.n + run.conj.n + run.fix.n + run.listen.n + run.say.n
  const ok = run.vocab.ok + run.grammar.ok + run.conj.ok + run.fix.ok + run.listen.ok + run.say.ok
  const home = plan.mode === 'weak' ? '/weak' : '/'
  useHotkeys({ Enter: () => navigate(home) })

  const pct = (t: Tally) => (t.n ? `${Math.round((t.ok / t.n) * 100)}%` : '—')

  return (
    <div className="results">
      <CheckCircle2 size={44} color="var(--success)" aria-hidden />
      <h1 className="results__title">{plan.mode === 'weak' ? 'Points faibles travaillés\u00a0!' : 'Séance terminée\u00a0!'}</h1>
      <p className="muted">
        {total ? `${ok} of ${total} right on the first try` : 'Nice work'} · {minutes} min
      </p>

      <div className={`stats${[run.fix.n, run.listen.n, run.say.n].filter(Boolean).length ? ' stats--3' : ''}`} style={{ width: '100%', marginTop: 18 }}>
        <div className="stat">
          <div className="stat__label">Words reviewed</div>
          <div className="stat__value">
            {run.vocab.n}
            <small>{pct(run.vocab)}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">New words</div>
          <div className="stat__value">{run.newWords}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Grammar</div>
          <div className="stat__value">
            {run.grammar.ok}
            <small>/ {run.grammar.n}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Verbs</div>
          <div className="stat__value">
            {run.conj.ok}
            <small>/ {run.conj.n}</small>
          </div>
        </div>
        {run.fix.n > 0 && (
          <div className="stat">
            <div className="stat__label">Fixed</div>
            <div className="stat__value">
              {run.fix.ok}
              <small>/ {run.fix.n}</small>
            </div>
          </div>
        )}
        {run.listen.n > 0 && (
          <div className="stat">
            <div className="stat__label">Listening</div>
            <div className="stat__value">
              {run.listen.ok}
              <small>/ {run.listen.n}</small>
            </div>
          </div>
        )}
        {run.say.n > 0 && (
          <div className="stat">
            <div className="stat__label">Speaking</div>
            <div className="stat__value">
              {run.say.ok}
              <small>/ {run.say.n}</small>
            </div>
          </div>
        )}
      </div>

      {plan.reviewLessons.length > 0 && (
        <div className="card card--flush mistake-list" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ padding: '14px 18px 0', margin: 0 }}>
            Lesson reviews
          </div>
          {plan.reviewLessons.map((id) => {
            const t = run.lessons[id]
            const passed = t && t.n > 0 && t.ok / t.n >= PASS_MARK
            return (
              <div key={id} className="mistake row" style={{ justifyContent: 'space-between' }}>
                <span>{lessonTitle(id)}</span>
                {t ? (
                  <span className={`badge ${passed ? 'badge--success' : 'badge--warning'}`}>
                    {passed ? 'Still solid' : 'Needs another look'}
                  </span>
                ) : (
                  <span className="badge">Not reached</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="row-wrap" style={{ justifyContent: 'center', marginTop: 22 }}>
        {plan.counts.moreReviews > 0 && (
          <Link to="/vocab/study" className="btn btn--secondary btn--lg">
            {plan.counts.moreReviews} more reviews
          </Link>
        )}
        {up && (
          <Link to={`/grammar/${up.id}`} className="btn btn--secondary btn--lg">
            Next lesson <ArrowRight size={16} aria-hidden />
          </Link>
        )}
        <Link to="/writing" className="btn btn--secondary btn--lg">
          <NotebookPen size={17} aria-hidden /> Write
        </Link>
        <Link to={home} className="btn btn--primary btn--lg">
          Done <Kbd>↵</Kbd>
        </Link>
      </div>

      {run.mistakes.length > 0 && (
        <div className="card card--flush mistake-list">
          <div className="section-title" style={{ padding: '14px 18px 0', margin: 0 }}>
            To review
          </div>
          {run.mistakes.map((m, i) => (
            <div key={i} className="mistake">
              <div className="mistake__q">{m.what}</div>
              <div className="mistake__a" lang="fr">
                {m.given && <span className="mistake__yours">{m.given}</span>}
                <strong>{frTypo(m.expected)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
