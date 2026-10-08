/**
 * Phase exit tests, measured from your progress in the app: you move on when
 * the numbers say so, not when the calendar does.
 *
 * Each phase asks for two things in every area: everything the app has at
 * that level done (every lesson, story, audio lesson, text, writing prompt and
 * role-play), and the volume the plan's daily lessons add up to (writings,
 * conversations, dictation, extra texts, study time). The volume targets are
 * a little below what the phase's blocks ask for, so a few missed days don't
 * hold you back, but skipping whole kinds of work does.
 */
import { LESSONS } from '../../data/grammar'
import { STORIES } from '../../data/stories'
import { AUDIO_LESSONS } from '../../data/audio'
import { BUILTIN_TEXTS } from '../../data/texts'
import { WRITING_PROMPTS } from '../../data/writing'
import { SCENARIOS } from '../../data/scenarios'
import { SOUND_SETS } from '../../data/sounds'
import type { Level } from '../../data/types'
import { sentenceId } from '../../lib/french'
import { PASS_MARK, type State, type TalkRecord } from '../../lib/store'
import { AREAS, timeTotals, type Area } from '../../lib/studyTime'
import { vocabCounts } from '../vocab/selectors'
import { countWeakSpots } from '../weak/count'
import { PHASES, plannedMinutes, type Phase, type PhaseId } from './plan'

/** Where a check belongs: one of the study areas, or the overall study time. */
export type ExitArea = Area | 'time'
export const EXIT_AREAS: ExitArea[] = ['grammar', 'listening', 'reading', 'writing', 'speaking', 'review', 'time']

export interface ExitCheck {
  id: string
  area: ExitArea
  label: string
  value: number
  target: number
  /** Shown after the numbers, e.g. "h". */
  unit?: string
  /** For checks where fewer is better (open weak spots). */
  atMost?: boolean
  done: boolean
  to: string
}

export type Progress = Pick<
  State,
  | 'lessons'
  | 'stories'
  | 'writings'
  | 'conversations'
  | 'cards'
  | 'introduced'
  | 'customWords'
  | 'mistakes'
  | 'skills'
  | 'conj'
  | 'audio'
  | 'read'
  | 'texts'
  | 'listening'
  | 'speaking'
  | 'activity'
  | 'roadmap'
> & { studyTime?: State['studyTime']; talkLog?: State['talkLog'] }

interface Targets {
  level: Level
  /** Every grammar lesson of the level mastered. */
  lessons: boolean
  /** Score every story of the level must reach (%). */
  story: number
  /** Every audio lesson of the level finished. */
  audio: boolean
  /** Dictation sentences answered during this phase (added up from the phase you started in). */
  dictation: number
  /** Texts read at this level beyond the built-in ones (generated or pasted). */
  texts: number
  /** Score every writing prompt of the level must reach. */
  prompts?: number
  /** Writings at this level, each scoring and as long as given (rewrites don't count). */
  writings: { n: number; score: number; words: number; timed?: number }
  /** Score every role-play of the level must reach. */
  roleplays?: number
  /** Finished conversations at this level (any scenario, free talk included), or of one scenario. */
  talks: { n: number; score: number; scenario?: string }
  /** Every pronunciation set read aloud in full. */
  sounds?: boolean
  /** Sentences read aloud during this phase (added up from the phase you started in). */
  readAloud: number
  words?: number
  weak?: number
}

export const TARGETS: Record<PhaseId, Targets> = {
  A1: {
    level: 'A1',
    lessons: true,
    story: 70,
    audio: true,
    dictation: 200,
    texts: 8,
    prompts: 70,
    writings: { n: 20, score: 75, words: 40 },
    roleplays: 70,
    talks: { n: 15, score: 70 },
    sounds: true,
    readAloud: 150,
    words: 800,
  },
  A2: {
    level: 'A2',
    lessons: true,
    story: 70,
    audio: true,
    dictation: 250,
    texts: 12,
    prompts: 70,
    writings: { n: 22, score: 75, words: 70 },
    roleplays: 70,
    talks: { n: 18, score: 70 },
    readAloud: 150,
    words: 1800,
  },
  B1: {
    level: 'B1',
    lessons: true,
    story: 70,
    audio: true,
    dictation: 300,
    texts: 12,
    prompts: 70,
    writings: { n: 25, score: 70, words: 100 },
    roleplays: 70,
    talks: { n: 22, score: 70 },
    readAloud: 200,
    words: 3000,
  },
  B2: {
    level: 'B2',
    lessons: true,
    story: 70,
    audio: true,
    dictation: 250,
    texts: 10,
    prompts: 70,
    writings: { n: 15, score: 70, words: 150 },
    roleplays: 65,
    talks: { n: 5, score: 65, scenario: 'delf-oral' },
    readAloud: 150,
    words: 4000,
  },
  EX: {
    level: 'B2',
    lessons: false,
    story: 80,
    audio: false,
    dictation: 100,
    texts: 16,
    writings: { n: 6, score: 75, words: 220, timed: 60 },
    talks: { n: 6, score: 70, scenario: 'delf-oral' },
    readAloud: 50,
    weak: 10,
  },
}

/** Every finished conversation: the short records, plus any transcript not in them yet. */
export function finishedTalks(s: Pick<State, 'conversations'> & { talkLog?: Record<string, TalkRecord> }): TalkRecord[] {
  const out = new Map<string, TalkRecord>(Object.entries(s.talkLog ?? {}))
  for (const c of s.conversations)
    if (c.feedback && !out.has(c.id)) out.set(c.id, { scenarioId: c.scenarioId, level: c.level, score: c.feedback.score, at: c.updatedAt })
  return [...out.values()]
}

/** Phases from the one the plan started in up to `phase`. */
function phasesThrough(phase: PhaseId, startWeek: number): Phase[] {
  const end = PHASES.findIndex((p) => p.id === phase)
  return PHASES.slice(0, end + 1).filter((p) => p.to >= startWeek)
}

/** Study hours the plan has asked for from the phase you started in to the end of `phase`. */
export function hoursThrough(phase: PhaseId, startWeek = 1): number {
  return phasesThrough(phase, startWeek).reduce((n, p) => n + p.hours, 0)
}

/** Minutes per area the plan has asked for from the phase you started in to the end of `phase`. */
export function areaPlanThrough(phase: PhaseId, startWeek = 1): Record<Area, number> {
  const out = Object.fromEntries(AREAS.map((a) => [a, 0])) as Record<Area, number>
  for (const p of phasesThrough(phase, startWeek)) {
    const m = plannedMinutes(Math.max(p.from, startWeek), p.to)
    for (const a of AREAS) out[a] += m[a]
  }
  return out
}

const cumulative = (phase: PhaseId, startWeek: number, pick: (t: Targets) => number) =>
  phasesThrough(phase, startWeek).reduce((n, p) => n + pick(TARGETS[p.id]), 0)

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

const check = (c: Omit<ExitCheck, 'done'>): ExitCheck => ({ ...c, done: c.atMost ? c.value <= c.target : c.value >= c.target })

export function exitChecks(phase: PhaseId, s: Progress): ExitCheck[] {
  const t = TARGETS[phase]
  const lv = t.level
  const startWeek = s.roadmap?.startWeek ?? 1
  const at = <T extends { level: Level }>(xs: T[]) => xs.filter((x) => x.level === lv)
  const out: ExitCheck[] = []

  // ── Grammar
  if (t.lessons) {
    const lessons = at(LESSONS)
    out.push(
      check({
        id: 'lessons',
        area: 'grammar',
        label: `Every ${lv} grammar lesson mastered (80%+)`,
        value: lessons.filter((l) => (s.lessons[l.id]?.best ?? 0) >= PASS_MARK).length,
        target: lessons.length,
        to: '/grammar',
      }),
    )
  }

  // ── Listening
  const stories = at(STORIES)
  out.push(
    check({
      id: 'stories',
      area: 'listening',
      label: `Every ${lv} story answered at ${t.story}%+`,
      value: stories.filter((x) => (s.stories?.[x.id]?.best ?? 0) >= t.story).length,
      target: stories.length,
      to: '/library#stories',
    }),
  )
  const audio = at(AUDIO_LESSONS)
  if (t.audio && audio.length)
    out.push(
      check({
        id: 'audio',
        area: 'listening',
        label: `Every ${lv} audio lesson finished`,
        value: audio.filter((l) => !!s.audio?.[l.id]?.done).length,
        target: audio.length,
        to: '/library#audio',
      }),
    )
  const dictated = Object.values(s.listening ?? {}).reduce((n, x) => n + x.n, 0)
  out.push(
    check({
      id: 'dictation',
      area: 'listening',
      label: 'Dictation sentences, in total',
      value: dictated,
      target: cumulative(phase, startWeek, (x) => x.dictation),
      to: '/dictation',
    }),
  )

  // ── Reading
  const builtin = at(BUILTIN_TEXTS)
  if (phase !== 'EX')
    out.push(
      check({
        id: 'texts',
        area: 'reading',
        label: `Every ${lv} graded text read`,
        value: builtin.filter((x) => !!s.read[x.id]).length,
        target: builtin.length,
        to: '/library#texts',
      }),
    )
  out.push(
    check({
      id: 'more-texts',
      area: 'reading',
      label: `${t.texts} more ${lv} texts read (generated or pasted)`,
      value: s.texts.filter((x) => x.level === lv && !!s.read[x.id]).length,
      target: t.texts,
      to: `/library?generate=${lv}#texts`,
    }),
  )

  // ── Writing
  if (t.prompts !== undefined) {
    const prompts = at(WRITING_PROMPTS)
    out.push(
      check({
        id: 'prompts',
        area: 'writing',
        label: `Every ${lv} writing prompt done, scoring ${t.prompts}+`,
        value: prompts.filter((p) => s.writings.some((w) => w.promptId === p.id && w.feedback.score >= t.prompts!)).length,
        target: prompts.length,
        to: '/library#writing',
      }),
    )
  }
  const w = t.writings
  out.push(
    check({
      id: 'writings',
      area: 'writing',
      label: `${w.n} ${w.timed ? `timed (${w.timed} min) ` : ''}${lv} writings of ${w.words}+ words scoring ${w.score}+`,
      value: s.writings.filter((x) => x.level === lv && !x.revisionOf && x.words >= w.words && x.feedback.score >= w.score && (!w.timed || (x.timed ?? 0) >= w.timed)).length,
      target: w.n,
      to: w.timed ? '/writing/new?prompt=free&timed=60' : '/library#writing',
    }),
  )

  // ── Speaking
  const talks = finishedTalks(s)
  if (t.roleplays !== undefined) {
    const scenarios = at(SCENARIOS).filter((x) => x.id !== 'delf-oral')
    out.push(
      check({
        id: 'roleplays',
        area: 'speaking',
        label: `Every ${lv} role-play finished, scoring ${t.roleplays}+`,
        value: scenarios.filter((x) => talks.some((c) => c.scenarioId === x.id && c.score >= t.roleplays!)).length,
        target: scenarios.length,
        to: '/library#talk',
      }),
    )
  }
  const c = t.talks
  out.push(
    check({
      id: 'talks',
      area: 'speaking',
      label: c.scenario
        ? `${c.n} DELF B2 oral ${plural(c.n, 'exam')} scoring ${c.score}+`
        : `${c.n} finished ${lv} ${plural(c.n, 'conversation')} scoring ${c.score}+ (role-plays or free talk)`,
      value: talks.filter((x) => (c.scenario ? x.scenarioId === c.scenario : x.level === lv) && x.score >= c.score).length,
      target: c.n,
      to: '/library#talk',
    }),
  )
  if (t.sounds) {
    const said = (fr: string) => !!s.speaking?.[sentenceId(fr)]
    out.push(
      check({
        id: 'sounds',
        area: 'speaking',
        label: 'Every pronunciation set read aloud in full',
        value: SOUND_SETS.filter((set) => set.sentences.every((x) => said(x.fr))).length,
        target: SOUND_SETS.length,
        to: '/speaking',
      }),
    )
  }
  out.push(
    check({
      id: 'read-aloud',
      area: 'speaking',
      label: 'Sentences read aloud, in total',
      value: Object.values(s.speaking ?? {}).reduce((n, x) => n + x.n, 0),
      target: cumulative(phase, startWeek, (x) => x.readAloud),
      to: '/speaking',
    }),
  )

  // ── Review & vocabulary
  if (t.words)
    out.push(check({ id: 'words', area: 'review', label: `${t.words.toLocaleString()} words started`, value: vocabCounts(s as State).learned, target: t.words, to: '/vocab' }))
  if (t.weak !== undefined)
    out.push(
      check({
        id: 'weak',
        area: 'review',
        label: `No more than ${t.weak} open weak spots`,
        value: countWeakSpots({ mistakes: s.mistakes, skills: s.skills, conj: s.conj, cards: s.cards }),
        target: t.weak,
        atMost: true,
        to: '/weak',
      }),
    )

  // ── Time
  const hours = timeTotals(s).total / 3600
  out.push(
    check({
      id: 'time',
      area: 'time',
      label: 'Study time in the app',
      value: Math.floor(hours * 10) / 10,
      target: hoursThrough(phase, startWeek),
      unit: 'h',
      to: '/profile#time',
    }),
  )
  return out
}

export const exitPassed = (phase: PhaseId, s: Progress): boolean => exitChecks(phase, s).every((c) => c.done)

/** The checks of one area. */
export const checksIn = (checks: ExitCheck[], area: ExitArea): ExitCheck[] => checks.filter((c) => c.area === area)

/** The phase to work toward: the first one (from where you started) whose exit test isn't passed yet, up to the current one. */
export function activePhase(s: Progress, currentWeek: number): Phase | undefined {
  const startWeek = s.roadmap?.startWeek ?? 1
  const upTo = PHASES.filter((p) => p.to >= startWeek && p.from <= Math.max(currentWeek, startWeek))
  return upTo.find((p) => !exitPassed(p.id, s)) ?? upTo.at(-1)
}
