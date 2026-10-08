import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { currentLevel } from '../../lib/level'
import { timeTotals, type Area, type TimeTotals } from '../../lib/studyTime'
import { PHASES, position, type Phase } from './plan'
import { activePhase, areaPlanThrough, exitChecks, type ExitCheck } from './exits'

export interface RoadmapStatus {
  phase: Phase
  /** The plan has a start date. */
  started: boolean
  checks: ExitCheck[]
  time: TimeTotals
  /** Minutes the plan asks for per area, from where you started to the end of this phase. */
  plan: Record<Area, number>
}

/** The phase you're working toward and how far along each of its checks is. */
export function useRoadmapStatus(): RoadmapStatus {
  const s = useStore()
  const [today] = useState(() => new Date())
  return useMemo(() => {
    const started = !!s.roadmap.start
    const week = position(s.roadmap, today).week
    const phase = (started ? activePhase(s, week) : PHASES.find((p) => p.id === currentLevel(s))) ?? PHASES[0]
    return { phase, started, checks: exitChecks(phase.id, s), time: timeTotals(s), plan: areaPlanThrough(phase.id, s.roadmap.startWeek) }
  }, [s, today])
}

export const checkShare = (c: ExitCheck) => (c.atMost ? (c.done ? 1 : 0) : Math.min(1, c.value / Math.max(1, c.target)))

/** 0..1: how far along an area's checks are on average. */
export const areaShare = (checks: ExitCheck[]): number => (checks.length ? checks.reduce((n, c) => n + checkShare(c), 0) / checks.length : 1)

export const fmtCheck = (c: ExitCheck) =>
  c.atMost ? `${c.value.toLocaleString()} (max ${c.target})` : `${c.value.toLocaleString()} / ${c.target.toLocaleString()}${c.unit ? ` ${c.unit}` : ''}`

