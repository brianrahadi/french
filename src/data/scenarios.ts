import type { Scenario } from './types'
import { inOrder } from '../content/load'

export type { Scenario, ScenarioIcon } from './types'

/** Conversation role-plays from content/conversations/<level>/*.md (files starting with _ are drafts). */
export const SCENARIOS: Scenario[] = inOrder(
  import.meta.glob<Scenario>(['/content/conversations/**/*.md', '!**/_*.md'], { eager: true, import: 'default' }),
)
export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]))
