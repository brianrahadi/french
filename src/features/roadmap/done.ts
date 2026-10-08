import type { State } from '../../lib/store'
import { dayKey } from '../../lib/date'
import type { AutoCheck, PlanBlock } from './plan'

type Progress = Pick<State, 'activity' | 'settings' | 'lessons' | 'writings' | 'conversations' | 'listening' | 'speaking' | 'stories' | 'read' | 'texts' | 'audio' | 'customWords' | 'planDays'>

const onDay = (iso: string | undefined, day: string) => !!iso && dayKey(new Date(iso)) === day

/** Whether something you did in the app on `day` covers this check. */
export function autoDone(check: AutoCheck, s: Progress, day: string): boolean {
  switch (check.kind) {
    case 'session':
      return (s.activity[day]?.items ?? 0) >= s.settings.dailyGoal
    case 'lesson':
      return onDay(s.lessons[check.id]?.lastAt, day)
    case 'writing':
      return s.writings.some((w) => onDay(w.createdAt, day) && (!check.timed || !!w.timed))
    case 'talk':
      return s.conversations.some(
        (c) => (!check.scenario || c.scenarioId === check.scenario) && c.turns.some((t) => t.role === 'me' && onDay(t.at, day)),
      )
    case 'dictation':
      return Object.values(s.listening).some((x) => onDay(x.at, day))
    case 'speaking':
      return Object.values(s.speaking).some((x) => onDay(x.at, day))
    case 'story':
      return Object.values(s.stories ?? {}).some((x) => onDay(x.at, day))
    case 'reading':
      return Object.values(s.read).some((d) => d === day) || s.texts.some((t) => onDay(t.finishedAt, day) || onDay(t.openedAt, day))
    case 'audio':
      return Object.values(s.audio ?? {}).some((x) => onDay(x.at, day))
    case 'words':
      return s.customWords.some((w) => onDay(w.added, day))
  }
}

/** A block is done if you ticked it, or if the app saw you do it that day. */
export function blockDone(b: PlanBlock, s: Progress, day: string): boolean {
  const ticked = s.planDays[day]?.done.includes(b.id) ?? false
  return ticked || (!!b.auto && autoDone(b.auto, s, day))
}
