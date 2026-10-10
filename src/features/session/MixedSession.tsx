import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge, Box, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { ArrowRight, BookOpen, CheckCircle2, Headphones, Layers, Mic, NotebookPen, PenLine, Target, Wrench } from 'lucide-react'
import { findWord } from '../../data/vocab'
import { LESSON_BY_ID } from '../../data/grammar'
import { FocusShell } from '../../components/FocusShell'
import { Kbd, Stat } from '../../components/ui'
import { PASS_MARK, useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { cardId, parseCardId, Rating, type Grade } from '../../lib/srs'
import { displayFr } from '../../lib/words'
import { speechSupported } from '../../lib/speech'
import { recognitionSupported } from '../../lib/recognition'
import { noteConj, noteDictation, noteGrammar, noteLapse, noteSpeaking } from '../../lib/mistakes'
import { DictationQuestion, type DictationAnswer } from '../listening/DictationQuestion'
import { sentenceById } from '../listening/sentences'
import { SpeakQuestion, type SpeakAnswer } from '../speaking/SpeakQuestion'
import { FixQuestion, type FixAnswer } from '../weak/FixQuestion'
import { ProductionCard, RecognitionCard } from '../vocab/cards'
import { dirsFor } from '../vocab/selectors'
import { GrammarQuestion, promptText } from '../grammar/GrammarQuestion'
import type { Graded } from '../grammar/grade'
import { nextUp } from '../grammar/status'
import { MistakeList, ResultList, ResultRow } from '../grammar/MistakeList'
import { DrillQuestion, type DrillAnswer } from '../conjugation/DrillQuestion'
import { fullForm } from '../conjugation/drill'
import { TENSE_BY_ID } from '../../lib/conjugate'
import { buildMixedPlan, buildWeakPlan, lessonTitle, type MixedItem, type MixedPlan } from './plan'
import { lessonGoals, bump, cardComesBack, insertAt, lessonsToRecord, pick, remaining, start, type Run, type Tally } from './run'
import { clearSession, loadSession, saveSession, settleSession } from './saved'

/** "Grammar · A1 · Articles · review" — skips the parts that don't apply. */
const tag = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ')

function Kind({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box mb={14}>
      <Badge
        variant="light"
        color="gray"
        size="lg"
        radius="xl"
        tt="none"
        fw={600}
        leftSection={icon}
        maw="100%"
        aria-label={`Section: ${label}`}
      >
        {label}
      </Badge>
    </Box>
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
  // Today's session carries on where it was left; weak-spot sessions start fresh.
  const keep = mode === 'daily'
  const [resumed] = useState(() => (keep ? loadSession(useStore.getState()) : null))
  const [plan] = useState(() => {
    if (resumed) return resumed.plan
    const opts = { tts: speechSupported, asr: recognitionSupported }
    return mode === 'weak' ? buildWeakPlan(useStore.getState(), Math.random, opts) : buildMixedPlan(useStore.getState(), Math.random, opts)
  })
  const [run, setRun] = useState<Run>(() => resumed?.run ?? start(plan))
  const [startedAt] = useState(() => Date.now() - (resumed?.elapsed ?? 0))

  const directions = useStore((s) => s.settings.directions)
  const customWords = useStore((s) => s.customWords)
  const introduceWord = useStore((s) => s.introduceWord)
  const rateCard = useStore((s) => s.rateCard)
  const recordConj = useStore((s) => s.recordConj)
  const recordLesson = useStore((s) => s.recordLesson)
  const recordGoals = useStore((s) => s.recordGoals)
  const logActivity = useStore((s) => s.logActivity)
  const recordSentence = useStore((s) => s.recordSentence)
  const resolveMistake = useStore((s) => s.resolveMistake)

  const total = run.done + remaining(run)
  const progress = run.done / Math.max(1, total)
  const count = `${run.done}/${total}`
  const cur = run.current

  // A session left unfinished on an earlier day is wrapped up first.
  useEffect(() => {
    if (keep) settleSession()
  }, [keep])

  // Saved after every answer, so leaving part-way loses nothing: Today offers to carry
  // on from there. A lesson review is scored once all of its questions are answered.
  const recorded = useRef(new Set(run.recorded))
  useEffect(() => {
    const ids = lessonsToRecord(plan, run).filter((id) => !recorded.current.has(id))
    for (const id of ids) {
      recorded.current.add(id)
      recordLesson(id, run.lessons[id].ok / run.lessons[id].n, { goals: lessonGoals(run, id) })
    }
    if (ids.length) setRun((r) => ({ ...r, recorded: [...r.recorded, ...ids] }))
    if (!keep) return
    if (!run.current) clearSession()
    else if (run.done || run.answered) saveSession(plan, { ...run, recorded: [...recorded.current] }, Date.now() - startedAt)
  }, [run, plan, keep, startedAt, recordLesson])

  const advance = () => setRun((r) => pick({ ...r, done: r.done + 1 }))

  // A new word is shown as a card straight away (front only, Anki-style) — no study screen first.
  const onKnown = (wordId: string) => {
    introduceWord(wordId, dirsFor(directions), true)
    logActivity(true, { newWord: true, skill: 'vocabulary' })
    setRun((r) => pick({ ...r, done: r.done + 1, newWords: r.newWords + 1 }))
  }

  const onRated = (id: string, grade: Grade, isNew = false) => {
    const { wordId, dir } = parseCardId(id)
    const dirs = dirsFor(directions)
    if (isNew) introduceWord(wordId, dirs)
    const next = rateCard(id, grade)
    const ok = grade !== Rating.Again
    logActivity(ok, { newWord: isNew, skill: 'vocabulary' })
    if (!ok) {
      const w = findWord(wordId, customWords)
      if (w) noteLapse(wordId, dir === 'r' ? w.fr : w.en, dir === 'r' ? w.en : displayFr(w))
    }
    // The other direction of a new word comes up a few questions later, as a new card.
    const sibling = isNew ? dirs.find((d) => d !== dir) : undefined
    setRun((r) => {
      const dueMs = new Date(next.due).getTime()
      const again = cardComesBack(grade, dueMs)
      return pick({
        ...r,
        items: sibling ? insertAt(r.items, 5, { kind: 'card', id: cardId(wordId, sibling) }) : r.items,
        learning: again ? [...r.learning, { id, due: dueMs }] : r.learning,
        done: r.done + 1,
        vocab: bump(r.vocab, ok),
        newWords: r.newWords + (isNew ? 1 : 0),
      })
    })
  }

  const onGrammar = (item: Extract<MixedItem, { kind: 'grammar' }>, g: Graded) => {
    logActivity(g.pass, { skill: 'grammar' })
    if (item.retry) {
      setRun((r) => ({ ...r, answered: true }))
      return
    }
    const ex = LESSON_BY_ID[item.lessonId].exercises[item.index]
    noteGrammar(item.lessonId, promptText(ex), g, 'explain' in ex ? ex.explain : undefined)
    // Practice outside a review still counts for the goal it tests.
    if (!item.review && ex.goal) recordGoals(item.lessonId, { [ex.goal]: { n: 1, ok: g.pass ? 1 : 0 } })
    const goalKey = `${item.lessonId} ${ex.goal}`
    setRun((r) => ({
      ...r,
      answered: true,
      grammar: bump(r.grammar, g.pass),
      lessons: item.review ? { ...r.lessons, [item.lessonId]: bump(r.lessons[item.lessonId] ?? { n: 0, ok: 0 }, g.pass) } : r.lessons,
      goals: item.review && ex.goal ? { ...r.goals, [goalKey]: bump(r.goals?.[goalKey] ?? { n: 0, ok: 0 }, g.pass) } : r.goals,
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
        goals: (() => {
          const k = `${item.lessonId} ${LESSON_BY_ID[item.lessonId].exercises[item.index].goal}`
          return item.review && r.goals?.[k] ? { ...r.goals, [k]: { ...r.goals[k], ok: r.goals[k].ok + 1 } } : r.goals
        })(),
        mistakes: r.mistakes.slice(0, -1),
        items: r.items.filter((x) => !(x.kind === 'grammar' && x.retry && x.lessonId === item.lessonId && x.index === item.index)),
      }),
    )
  }

  const onConj = (item: Extract<MixedItem, { kind: 'conj' }>, a: DrillAnswer) => {
    logActivity(a.pass, { skill: 'grammar' })
    if (item.retry) {
      setRun((r) => ({ ...r, answered: true }))
      return
    }
    recordConj(a.item.inf, a.item.tense, a.pass)
    noteConj(a.item.inf, a.item.tense, { pass: a.pass, given: a.given, expected: fullForm(a.item) })
    setRun((r) => ({
      ...r,
      answered: true,
      conj: bump(r.conj, a.pass),
      mistakes: a.pass
        ? r.mistakes
        : [...r.mistakes, { what: `${a.item.inf} · ${TENSE_BY_ID[a.item.tense].label}`, given: a.given, expected: fullForm(a.item) }],
      items: a.pass ? r.items : insertAt(r.items, 4, { ...item, retry: true }),
    }))
  }

  const onFix = (item: Extract<MixedItem, { kind: 'fix' }>, a: FixAnswer) => {
    logActivity(a.pass, { skill: 'grammar' })
    if (a.pass) resolveMistake(a.mistake.id)
    if (item.retry) {
      setRun((r) => ({ ...r, answered: true }))
      return
    }
    setRun((r) => ({
      ...r,
      answered: true,
      fix: bump(r.fix, a.pass),
      mistakes: a.pass ? r.mistakes : [...r.mistakes, { what: a.mistake.prompt ?? '', given: a.given, expected: a.mistake.expected }],
      items: a.pass ? r.items : insertAt(r.items, 4, { ...item, retry: true }),
    }))
  }

  const onListen = (a: DictationAnswer) => {
    recordSentence('listening', a.sentence.id, a.result.score)
    noteDictation(a.sentence, a.result)
    logActivity(a.result.score >= 70, { skill: 'listening' })
    setRun((r) => ({ ...r, answered: true, listen: bump(r.listen, a.result.score >= 70) }))
  }

  const onSay = (a: SpeakAnswer) => {
    if (!a.attempts) return
    recordSentence('speaking', a.sentence.id, a.score)
    if (a.match) noteSpeaking(a.sentence, a.match)
    logActivity(a.score >= 60, { skill: 'speaking' })
    setRun((r) => ({ ...r, answered: true, say: bump(r.say, a.score >= 60) }))
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
    const isNew = cur.kind === 'intro'
    const id = isNew ? cardId(cur.wordId, dirsFor(directions)[0]) : cur.id
    const w = findWord(parseCardId(id).wordId, customWords)
    if (!w) {
      setTimeout(advance)
      return null
    }
    body = (
      <>
        <Kind icon={<Layers size={15} aria-hidden />} label={tag('Vocabulary', !w.custom && w.level, plan.mode === 'weak' && 'weak spot')} />
        {parseCardId(id).dir === 'r' ? (
          <RecognitionCard key={key} word={w} id={id} onRate={(g) => onRated(id, g, isNew)} onKnown={isNew ? () => onKnown(w.id) : undefined} />
        ) : (
          <ProductionCard key={key} word={w} id={id} onRate={(g) => onRated(id, g, isNew)} onKnown={isNew ? () => onKnown(w.id) : undefined} />
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
            label={tag('Grammar', lesson.level, lesson.title, cur.retry ? 'retry' : cur.review ? 'review' : cur.weak && 'weak spot')}
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
        <Kind icon={<PenLine size={15} aria-hidden />} label={tag('Conjugation', TENSE_BY_ID[cur.item.tense].level, cur.retry && 'retry')} />
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
          context={<Kind icon={<Headphones size={15} aria-hidden />} label={tag('Listening', sentence.level)} />}
          onAnswered={onListen}
          onContinue={advance}
        />
      ) : (
        <SpeakQuestion
          key={key}
          sentence={sentence}
          context={<Kind icon={<Mic size={15} aria-hidden />} label={tag('Speaking', sentence.level)} />}
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
        <Results icon={<Target size={44} color="var(--mantine-color-green-filled)" aria-hidden />} title="No weak spots right now">
          <Text c="dimmed" maw={440}>
            Mistakes from drills, writing, conversations and dictation show up here. Keep practising and come back later.
          </Text>
          <Button component={Link} to="/" size="lg" mt={18}>
            Back to Today
          </Button>
        </Results>
      </FocusShell>
    )
  return (
    <FocusShell progress={1} exitTo="/" label="Session">
      <Results icon={<CheckCircle2 size={44} color="var(--mantine-color-green-filled)" aria-hidden />} title={<>Tout est à jour&nbsp;!</>}>
        <Text c="dimmed" maw={440}>
          No reviews are due and you’ve hit today’s new-word limit. Learn a new grammar point or write a few sentences.
        </Text>
        <Group justify="center" mt={18}>
          {up && (
            <Button component={Link} to={`/grammar/${up.id}`} size="lg">
              Learn: {up.title}
            </Button>
          )}
          <Button component={Link} to="/library#writing" size="lg" variant="default" leftSection={<NotebookPen size={17} aria-hidden />}>
            Write
          </Button>
        </Group>
      </Results>
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

  const extra = [run.fix.n, run.listen.n, run.say.n].filter(Boolean).length > 0

  return (
    <Results
      icon={<CheckCircle2 size={44} color="var(--mantine-color-green-filled)" aria-hidden />}
      title={plan.mode === 'weak' ? 'Points faibles travaillés\u00a0!' : 'Séance terminée\u00a0!'}
    >
      <Text c="dimmed">
        {total ? `${ok} of ${total} right on the first try` : 'Nice work'} · {minutes} min
      </Text>

      <SimpleGrid cols={{ base: 2, sm: extra ? 3 : 4 }} spacing="sm" w="100%" mt={18} ta="left">
        <Stat label="Words reviewed" value={run.vocab.n} unit={` ${pct(run.vocab)}`} />
        <Stat label="New words" value={run.newWords} />
        <Stat label="Grammar" value={run.grammar.ok} unit={` / ${run.grammar.n}`} />
        <Stat label="Verbs" value={run.conj.ok} unit={` / ${run.conj.n}`} />
        {run.fix.n > 0 && <Stat label="Fixed" value={run.fix.ok} unit={` / ${run.fix.n}`} />}
        {run.listen.n > 0 && <Stat label="Listening" value={run.listen.ok} unit={` / ${run.listen.n}`} />}
        {run.say.n > 0 && <Stat label="Speaking" value={run.say.ok} unit={` / ${run.say.n}`} />}
      </SimpleGrid>

      {plan.reviewLessons.length > 0 && (
        <ResultList title="Lesson reviews" mt={16}>
          {plan.reviewLessons.map((id, i) => {
            const t = run.lessons[id]
            const passed = t && t.n > 0 && t.ok / t.n >= PASS_MARK
            return (
              <ResultRow key={id} first={i === 0}>
                <Group justify="space-between" wrap="nowrap">
                  <span>{lessonTitle(id)}</span>
                  {t ? <Badge color={passed ? 'green' : 'orange'}>{passed ? 'Still solid' : 'Needs another look'}</Badge> : <Badge color="gray">Not reached</Badge>}
                </Group>
              </ResultRow>
            )
          })}
        </ResultList>
      )}

      <Group justify="center" mt={22}>
        {plan.counts.moreReviews > 0 && (
          <Button component={Link} to="/vocab/study" size="lg" variant="default">
            {plan.counts.moreReviews} more reviews
          </Button>
        )}
        {up && (
          <Button component={Link} to={`/grammar/${up.id}`} size="lg" variant="default" rightSection={<ArrowRight size={16} aria-hidden />}>
            Next lesson
          </Button>
        )}
        <Button component={Link} to="/library#writing" size="lg" variant="default" leftSection={<NotebookPen size={17} aria-hidden />}>
          Write
        </Button>
        <Button component={Link} to={home} size="lg" rightSection={<Kbd>↵</Kbd>}>
          Done
        </Button>
      </Group>

      {run.mistakes.length > 0 && <MistakeList items={run.mistakes} />}
    </Results>
  )
}

/** Centered end-of-session layout: icon, French headline, then whatever follows. */
function Results({ icon, title, children }: { icon: React.ReactNode; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Stack align="center" ta="center" gap={8} pt={32}>
      {icon}
      <Title order={1} className="fr" fz={28} fw={600}>
        {title}
      </Title>
      {children}
    </Stack>
  )
}
