import { describe, expect, it } from 'vitest'
import { LESSON_BY_ID, LESSONS } from '../../data/grammar'
import { PROMPT_BY_ID, WRITING_PROMPTS } from '../../data/writing'
import { AUDIO_LESSONS } from '../../data/audio'
import { BUILTIN_TEXTS } from '../../data/texts'
import { sentenceId } from '../../lib/french'
import { SCENARIO_BY_ID, SCENARIOS } from '../../data/scenarios'
import { SOUND_SETS } from '../../data/sounds'
import { STORIES } from '../../data/stories'
import { parseDayKey } from '../../lib/date'
import { initialState, type State } from '../../lib/store'
import { blockMinutes, blocksFor, MINIMUM_DAY, nextMonday, PHASES, phaseOf, plannedBlocks, plannedMinutes, position, SETUP_DAY, WEEKS, WEEKS_TOTAL } from './plan'
import { planContext } from './context'
import { blockDone } from './done'
import { activePhase, EXIT_AREAS, exitChecks, exitPassed, finishedTalks, hoursThrough, TARGETS } from './exits'

const ctx = planContext(initialState, 'A1')
const plan = { start: '2026-10-12', startWeek: 1 }
const allDays = () => {
  const out: { week: number; dow: number }[] = []
  for (let week = 1; week <= WEEKS_TOTAL; week++) for (let dow = 0; dow < 7; dow++) out.push({ week, dow })
  return out
}

describe('roadmap', () => {
  it('covers every week exactly once, in order', () => {
    expect(PHASES[0].from).toBe(1)
    expect(PHASES.at(-1)!.to).toBe(WEEKS_TOTAL)
    for (let i = 1; i < PHASES.length; i++) expect(PHASES[i].from).toBe(PHASES[i - 1].to + 1)
    for (let w = 1; w <= WEEKS_TOTAL; w++) expect(WEEKS[w], `week ${w}`).toBeDefined()
  })

  it('only points at content that exists', () => {
    for (const [n, w] of Object.entries(WEEKS)) {
      for (const id of w.lessons ?? []) expect(LESSON_BY_ID[id], `week ${n} lesson ${id}`).toBeDefined()
      if (w.prompt) expect(PROMPT_BY_ID[w.prompt], `week ${n} prompt`).toBeDefined()
      if (w.talk) expect(SCENARIO_BY_ID[w.talk], `week ${n} talk`).toBeDefined()
      if (w.sounds) expect(SOUND_SETS.some((s) => s.id === w.sounds), `week ${n} sounds`).toBe(true)
    }
    expect(SCENARIO_BY_ID['delf-oral']).toBeDefined()
  })

  it('teaches every lesson of a level by the end of its phase', () => {
    for (const p of PHASES.filter((x) => x.id !== 'EX')) {
      const taught = new Set<string>()
      for (let w = 1; w <= p.to; w++) for (const id of WEEKS[w].lessons ?? []) taught.add(id)
      for (const l of LESSONS.filter((x) => x.level === p.level)) expect(taught.has(l.id), `${p.id} never teaches ${l.id}`).toBe(true)
    }
  })

  it('happens entirely in the app', () => {
    for (const pos of [...allDays(), { week: 0, dow: 0 }])
      for (const b of blocksFor(pos, ctx)) expect(!!b.to || !!b.talk, `week ${pos.week} day ${pos.dow}: ${b.title}`).toBe(true)
    for (const b of MINIMUM_DAY) expect(b.to).toBeTruthy()
  })

  it('places days in plan weeks', () => {
    expect(position(plan, parseDayKey('2026-10-06'))).toEqual({ week: 0, dow: 1 })
    expect(position(plan, parseDayKey('2026-10-12'))).toEqual({ week: 1, dow: 0 })
    expect(position(plan, parseDayKey('2026-10-25'))).toEqual({ week: 2, dow: 6 })
    expect(position({ start: '2026-10-12', startWeek: 25 }, parseDayKey('2026-10-19')).week).toBe(26)
    expect(position({ start: null, startWeek: 1 }, parseDayKey('2026-10-19')).week).toBe(0)
    expect(nextMonday(parseDayKey('2026-10-06'))).toBe('2026-10-12')
    expect(nextMonday(parseDayKey('2026-10-12'))).toBe('2026-10-12')
  })

  it('gives every day a session first and a realistic length', () => {
    for (const { week, dow } of allDays()) {
      const bs = blocksFor({ week, dow }, ctx)
      expect(bs[0].id, `week ${week} day ${dow}`).toBe('session')
      expect(new Set(bs.map((b) => b.id)).size, `week ${week} day ${dow}`).toBe(bs.length)
      const study = WEEKS[week].kind === 'study' && phaseOf(week)!.id !== 'EX'
      if (study) expect(blockMinutes(bs), `week ${week} day ${dow}`).toBeGreaterThanOrEqual(dow === 6 ? 50 : 70)
      expect(blockMinutes(bs)).toBeLessThanOrEqual(170)
    }
    expect(blocksFor({ week: 0, dow: 2 }, ctx)).toBe(SETUP_DAY)
    expect(blockMinutes(MINIMUM_DAY)).toBe(25)
  })

  it('uses the week’s lesson on Monday and the DELF oral from B2', () => {
    expect(blocksFor({ week: 1, dow: 0 }, ctx).some((b) => b.to === '/grammar/etre-avoir')).toBe(true)
    expect(blocksFor({ week: 8, dow: 4 }, ctx).some((b) => b.talk?.scenario === 'free')).toBe(true)
    // Odd weeks: a second role-play while the level still has some to do.
    expect(blocksFor({ week: 7, dow: 4 }, ctx).some((b) => b.id === 'talk-2' && !!b.talk && b.talk.scenario !== 'free')).toBe(true)
    expect(blocksFor({ week: 40, dow: 4 }, ctx).some((b) => b.talk?.scenario === 'delf-oral')).toBe(true)
    expect(blocksFor({ week: 50, dow: 2 }, ctx).some((b) => b.to?.includes('timed=60'))).toBe(true)
  })

  it('suggests the next writing prompt and role-play once the week’s are done', () => {
    const at = new Date().toISOString()
    const fb = { summary: '', score: 80, level: 'A1', errors: [], corrected: '', improved: '', strengths: [], vocabulary: [] }
    const writings = [{ id: 'w', promptId: 'presente-toi', title: '', task: '', level: 'A1' as const, text: '', words: 60, createdAt: at, model: '', feedback: fb }]
    const talkLog = { c: { scenarioId: 'neighbour', level: 'A1' as const, score: 80, at } }
    const after = planContext({ ...initialState, writings, talkLog }, 'A1')
    const wed = blocksFor({ week: 1, dow: 2 }, after).find((b) => b.id === 'writing')!
    expect(wed.to).not.toContain('presente-toi')
    expect(wed.to).toContain(`prompt=${after.prompt!.id}`)
    const tue = blocksFor({ week: 1, dow: 1 }, after).find((b) => b.id === 'talk')!
    expect(tue.talk?.scenario).toBe(after.talk!.id)
    expect(after.talk!.id).not.toBe('neighbour')
    expect(blocksFor({ week: 1, dow: 2 }, ctx).find((b) => b.id === 'writing')!.to).toContain('presente-toi')
  })

  it('ticks blocks off from what was done in the app', () => {
    const day = '2026-10-12'
    const s = { ...initialState, activity: { [day]: { items: 40, correct: 30, newWords: 5 } }, lessons: { 'etre-avoir': { attempts: 1, best: 0.9, last: 0.9, lastAt: new Date(2026, 9, 12, 19).toISOString(), step: 0 } } }
    const [sessionBlock, lesson] = blocksFor({ week: 1, dow: 0 }, ctx)
    expect(blockDone(sessionBlock, s, day)).toBe(true)
    expect(blockDone(lesson, s, day)).toBe(true)
    expect(blockDone(lesson, s, '2026-10-13')).toBe(false)
    const ticked = { ...initialState, planDays: { [day]: { done: ['sentences'], at: '' } } }
    expect(blockDone({ id: 'sentences', minutes: 15, title: '', detail: '' }, ticked, day)).toBe(true)
  })
})

describe('exit tests', () => {
  const at = new Date().toISOString()
  const feedback = (score: number) => ({ summary: '', score, level: 'A1', errors: [], corrected: '', improved: '', strengths: [], vocabulary: [] })
  const talkFeedback = (score: number) => ({ summary: '', score, level: 'A1', strengths: [], improvements: [], vocabulary: [], tip: '' })

  /** Everything the A1 exit test asks for, done. */
  function a1Done(): State {
    const lessons = Object.fromEntries(LESSONS.filter((l) => l.level === 'A1').map((l) => [l.id, { attempts: 1, best: 0.9, last: 0.9, lastAt: at, step: 0 }]))
    const stories = Object.fromEntries(STORIES.filter((x) => x.level === 'A1').map((x) => [x.id, { n: 1, best: 80, last: 80, at }]))
    const audio = Object.fromEntries(AUDIO_LESSONS.filter((x) => x.level === 'A1').map((x) => [x.id, { pos: 0, total: 10, done: at, at }]))
    const read = Object.fromEntries(BUILTIN_TEXTS.filter((x) => x.level === 'A1').map((x) => [x.id, '2026-10-12']))
    const texts = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, title: '', level: 'A1' as const, content: '', source: 'ai' as const, createdAt: at }))
    for (const t of texts) read[t.id] = '2026-10-12'
    const prompts = WRITING_PROMPTS.filter((p) => p.level === 'A1').map((p) => p.id)
    const writings = Array.from({ length: Math.max(20, prompts.length) }, (_, i) => ({
      id: `w${i}`, promptId: prompts[i] ?? 'free', title: '', task: '', level: 'A1' as const, text: '', words: 60, createdAt: at, model: '', feedback: feedback(80),
    }))
    const scenarios = SCENARIOS.filter((x) => x.level === 'A1').map((x) => x.id)
    const conversations = Array.from({ length: Math.max(15, scenarios.length) }, (_, i) => ({
      id: `c${i}`, scenarioId: scenarios[i] ?? 'free', title: '', level: 'A1' as const, turns: [], goalsMet: [], startedAt: at, updatedAt: at, model: '', feedback: talkFeedback(75),
    }))
    const speaking = Object.fromEntries(SOUND_SETS.flatMap((set) => set.sentences.map((x) => [sentenceId(x.fr), { n: 1, best: 90, last: 90, at }])))
    speaking.extra = { n: 150, best: 90, last: 90, at }
    const listening = { x: { n: 200, best: 90, last: 90, at } }
    const cards = Object.fromEntries(Array.from({ length: 800 }, (_, i) => [`w${i}|r`, {} as never]))
    const studyTime = { d1: { '2026-10-12': { grammar: PHASES[0].hours * 3600 } } }
    return { ...initialState, lessons, stories, audio, read, texts, writings, conversations, speaking, listening, cards, studyTime } as State
  }

  it('start empty and pass once the work is done', () => {
    expect(exitPassed('A1', initialState)).toBe(false)
    const s = a1Done()
    expect(exitChecks('A1', s).filter((c) => !c.done).map((c) => c.id)).toEqual([])
    expect(exitPassed('A1', { ...s, writings: s.writings.slice(0, 5) })).toBe(false)
    expect(exitPassed('A1', { ...s, studyTime: {} })).toBe(false)
    expect(exitPassed('A1', { ...s, audio: {} })).toBe(false)
  })

  it('keeps counting conversations after their transcripts are pruned', () => {
    const s = a1Done()
    const talkLog = Object.fromEntries(s.conversations.map((c) => [c.id, { scenarioId: c.scenarioId, level: c.level, score: c.feedback!.score, at }]))
    expect(exitPassed('A1', { ...s, conversations: [], talkLog })).toBe(true)
    expect(finishedTalks({ conversations: s.conversations.slice(0, 2), talkLog: { c0: talkLog.c0 } })).toHaveLength(2)
  })

  it('groups every check under an area', () => {
    for (const p of PHASES) for (const c of exitChecks(p.id, initialState)) expect(EXIT_AREAS, `${p.id} ${c.id}`).toContain(c.area)
  })

  it('asks for no more than the phase’s daily lessons give room for', () => {
    for (const p of PHASES) {
      const t = TARGETS[p.id]
      const b = plannedBlocks(p.from, p.to)
      const writingSlots = (b.sentences ?? 0) + (b.writing ?? 0) + (b['writing-timed'] ?? 0) + (b['exam-pe'] ?? 0) + (b['mock-pe'] ?? 0)
      expect(t.writings.n, `${p.id} writings`).toBeLessThanOrEqual(writingSlots)
      const talkSlots = t.talks.scenario ? (b.oral ?? 0) + (b['oral-2'] ?? 0) : (b.talk ?? 0) + (b['talk-2'] ?? 0) + (b['free-talk'] ?? 0)
      expect(t.talks.n, `${p.id} conversations`).toBeLessThanOrEqual(talkSlots)
      const readingSlots = (b.reading ?? 0) + (b['read-long'] ?? 0) + (b.ce ?? 0) + (b['mock-ce'] ?? 0)
      const builtin = p.id === 'EX' ? 0 : BUILTIN_TEXTS.filter((x) => x.level === p.level).length
      expect(t.texts + builtin, `${p.id} texts`).toBeLessThanOrEqual(readingSlots + (p.id === 'EX' ? TARGETS.B2.texts : 0))
      const audioSlots = (b.audio ?? 0) + (b['min-audio'] ?? 0)
      if (t.audio) expect(AUDIO_LESSONS.filter((x) => x.level === p.level).length, `${p.id} audio lessons`).toBeLessThanOrEqual(audioSlots)
    }
  })

  it('sets each phase’s hours from its daily lessons', () => {
    for (const p of PHASES) {
      const min = Object.values(plannedMinutes(p.from, p.to)).reduce((a, b) => a + b, 0)
      expect(p.hours).toBe(Math.round(min / 60))
      expect(p.hours).toBeGreaterThan(20)
    }
    expect(hoursThrough('A2', 1)).toBe(PHASES[0].hours + PHASES[1].hours)
    expect(hoursThrough('A2', 13)).toBe(PHASES[1].hours)
  })

  it('works toward the first phase not passed yet', () => {
    const plan = { start: '2026-10-12', startWeek: 1 }
    expect(activePhase({ ...initialState, roadmap: plan }, 15)?.id).toBe('A1')
    expect(activePhase({ ...a1Done(), roadmap: plan }, 15)?.id).toBe('A2')
    expect(activePhase({ ...a1Done(), roadmap: plan }, 5)?.id).toBe('A1')
  })
})
