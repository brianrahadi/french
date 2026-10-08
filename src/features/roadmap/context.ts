import { LESSON_BY_ID } from '../../data/grammar'
import { PROMPT_BY_ID } from '../../data/writing'
import { SCENARIO_BY_ID } from '../../data/scenarios'
import { STORIES } from '../../data/stories'
import { BUILTIN_TEXTS } from '../../data/texts'
import { AUDIO_LESSONS } from '../../data/audio'
import { levelRank, type Level } from '../../data/types'
import { WRITING_PROMPTS } from '../../data/writing'
import { SCENARIOS } from '../../data/scenarios'
import { storyDone } from '../../lib/level'
import type { State } from '../../lib/store'
import type { PlanContext } from './plan'
import { finishedTalks } from './exits'

type Progress = Pick<State, 'stories' | 'read' | 'audio'> & Partial<Pick<State, 'writings' | 'conversations' | 'talkLog'>>

/** Points the day's blocks at the next story, text, audio lesson, writing prompt and role-play you haven't done yet. */
export function planContext(s: Progress, level: Level): PlanContext {
  const story = STORIES.find((x) => x.level === level && !storyDone(s, x.id))
  const text = BUILTIN_TEXTS.find((x) => x.level === level && !s.read[x.id])
  const audio = AUDIO_LESSONS.find((x) => levelRank(x.level) <= levelRank(level) && !s.audio?.[x.id]?.done)
  const written = new Set((s.writings ?? []).map((w) => w.promptId))
  const talked = new Set(finishedTalks({ conversations: s.conversations ?? [], talkLog: s.talkLog }).map((c) => c.scenarioId))
  const prompt = WRITING_PROMPTS.find((p) => p.level === level && !written.has(p.id))
  const talk = SCENARIOS.find((x) => x.level === level && x.id !== 'delf-oral' && !talked.has(x.id))
  return {
    story: story && { id: story.id, title: story.title },
    text: text && { id: text.id, title: text.title },
    audio: audio && { id: audio.id, title: audio.title },
    prompt: prompt && { id: prompt.id, title: prompt.title },
    talk: talk && { id: talk.id, title: talk.title },
    done: (kind, id) => (kind === 'prompt' ? written : talked).has(id),
    lessonTitle: (id) => LESSON_BY_ID[id]?.title,
    promptTitle: (id) => PROMPT_BY_ID[id]?.title,
    talkTitle: (id) => SCENARIO_BY_ID[id]?.title,
  }
}
