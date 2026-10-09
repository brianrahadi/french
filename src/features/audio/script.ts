/**
 * Turns an audio lesson into a spoken script, Pimsleur style:
 * - hear the conversation first, then learn its phrases one at a time;
 * - longer phrases are built up from the end ("backward build-up");
 * - you're asked to say things before you hear the answer (anticipation),
 *   with a pause to answer out loud;
 * - each phrase comes back at growing intervals (graduated recall),
 *   and earlier lessons are reviewed at the start.
 */
import type { AudioLessonDef } from '../../data/types'

export type Step =
  /** The English narrator. */
  | { kind: 'en'; text: string; part: number }
  /** French: a dialogue speaker's voice (a woman's or a man's), or the main voice; `slow` for modelling a new phrase. */
  | { kind: 'fr'; text: string; part: number; voice?: 'f' | 'm'; slow?: boolean }
  /** The learner's turn: say `answer` out loud. `cue` is what was asked. */
  | { kind: 'turn'; answer: string; cue: string; part: number; repeat?: boolean }
  /** A short silence. */
  | { kind: 'gap'; seconds: number; part: number }

export interface Script {
  parts: string[]
  steps: Step[]
}

/** Recall intervals, counted in newly taught phrases. */
const RECALL_AFTER = [1, 3, 6]

/** Names in the dialogues, so each speaker gets a voice that fits. */
const WOMEN = new Set('alice amélie anna camille chloé claire emma hélène inès julie karine léa lucie manon margaux margot marie nadia nathalie sarah sophie zoé'.split(' '))
const MEN = new Set('antoine bertrand hugo julien karim lucas marc mathieu paul pierre thomas'.split(' '))

export function genderOf(name: string): 'f' | 'm' | undefined {
  if (/^(mme|madame|mlle)\b/i.test(name)) return 'f'
  if (/^(m\.|monsieur)(\s|$)/i.test(name)) return 'm'
  const first = name.toLowerCase().split(/\s/)[0]
  return WOMEN.has(first) ? 'f' : MEN.has(first) ? 'm' : undefined
}

/**
 * A voice for each of the two speakers: one woman's and one man's, so they're
 * easy to tell apart, matched to the names we know (Alex can be either).
 */
export function voicesFor(speakers: string[]): (who: string) => 'f' | 'm' {
  const [a, b] = speakers
  const ga = genderOf(a)
  const gb = genderOf(b ?? '')
  const va: 'f' | 'm' = ga ?? (gb === 'f' ? 'm' : 'f')
  return (who) => (who === a ? va : va === 'f' ? 'm' : 'f')
}

const ASK = [(en: string) => `How do you say “${en}”?`, (en: string) => `Say “${en}”.`, (en: string) => `Do you remember how to say “${en}”?`, (en: string) => `What’s “${en}” in French?`]
const NEW = [(en: string) => `Here’s how to say “${en}”.`, (en: string) => `Now, “${en}”.`, (en: string) => `Listen to how to say “${en}”.`, (en: string) => `Here’s a new one: “${en}”.`]

export function buildScript(lesson: AudioLessonDef, number: number, earlier: AudioLessonDef[] = []): Script {
  const parts: string[] = []
  const steps: Step[] = []
  let part = -1
  let asked = 0
  const section = (title: string) => {
    parts.push(title)
    part = parts.length - 1
  }
  const en = (text: string) => steps.push({ kind: 'en', text, part })
  const fr = (text: string, o: { voice?: 'f' | 'm'; slow?: boolean } = {}) => steps.push({ kind: 'fr', text, part, ...o })
  const gap = (seconds = 0.6) => steps.push({ kind: 'gap', seconds, part })
  const turn = (answer: string, cue: string, repeat = false) => steps.push({ kind: 'turn', answer, cue, part, repeat })
  /** Ask, pause, give the answer, and let the learner repeat it once more. */
  const recall = (p: { fr: string; en: string }, prompt?: string) => {
    const q = prompt ?? ASK[asked++ % ASK.length](p.en)
    en(q)
    turn(p.fr, q)
    fr(p.fr)
    turn(p.fr, 'Repeat', true)
  }
  const speakers = [...new Set(lesson.dialogue.map((d) => d.who))]
  const voiceOf = voicesFor(speakers)
  const conversation = () => {
    for (const d of lesson.dialogue) {
      fr(d.fr, { voice: voiceOf(d.who) })
      gap(0.5)
    }
  }

  section('Introduction')
  en(`Lesson ${number}. ${lesson.titleEn}.`)
  en(lesson.scene)
  en('Listen to the conversation. Don’t worry if you don’t understand it yet.')
  gap(0.8)
  conversation()

  const before = earlier.slice(-3)
  if (before.length) {
    section('Warm-up')
    en('Before we start, let’s see what you remember. Answer out loud each time.')
    const last = before[before.length - 1]
    // Practice items carry their own English cue; phrases are asked for.
    const cued = last.practice.slice(0, 2).map((p) => ({ p, cue: p.en }))
    const old = [...last.phrases.slice(-1), ...before.slice(0, -1).flatMap((l) => l.phrases.slice(0, 1))].map((p) => ({ p, cue: undefined }))
    for (const x of [...cued, ...old].slice(0, 5)) recall(x.p, x.cue)
  }

  // New phrases, with earlier ones coming back at growing intervals.
  const due: { at: number; p: { fr: string; en: string } }[] = []
  lesson.phrases.forEach((p, i) => {
    section(p.en)
    en(NEW[i % NEW.length](p.en))
    fr(p.fr)
    gap(0.5)
    fr(p.fr, { slow: true })
    en('Repeat.')
    turn(p.fr, 'Repeat', true)
    if (p.chunks.length > 1) {
      en('Let’s build it up from the end. Repeat each part.')
      for (let k = p.chunks.length - 1; k >= 0; k--) {
        const piece = p.chunks.slice(k).join(' ')
        fr(piece, { slow: true })
        turn(piece, 'Repeat', true)
      }
      en('Once more, the whole thing.')
      fr(p.fr)
      turn(p.fr, 'Repeat', true)
    }
    if (p.note) en(p.note)
    recall(p)
    for (const after of RECALL_AFTER) due.push({ at: i + after, p })
    // Earlier phrases due back now.
    for (const d of due.filter((d) => d.at === i)) recall(d.p)
  })
  const leftover = due.filter((d) => d.at >= lesson.phrases.length)
  const seen = new Set<string>()
  const final = leftover.filter((d) => !seen.has(d.p.fr) && seen.add(d.p.fr))

  if (lesson.practice.length || final.length) {
    section('Putting it together')
    en('Now let’s put it together. Answer out loud before you hear the answer.')
    const mixed: { p: { fr: string; en: string }; cue?: string }[] = []
    lesson.practice.forEach((p, i) => {
      mixed.push({ p, cue: p.en })
      if (final[i]) mixed.push({ p: final[i].p })
    })
    for (const f of final.slice(lesson.practice.length)) mixed.push({ p: f.p })
    for (const m of mixed) recall(m.p, m.cue)
  }

  section('Your turn in the conversation')
  en(`Now you take part in the conversation. You are ${lesson.role}. When it’s your turn, you’ll hear what to say in English. Say it in French.`)
  for (const d of lesson.dialogue) {
    if (d.who === lesson.role) {
      const cue = `Say: “${d.en}”`
      en(cue)
      turn(d.fr, cue)
      fr(d.fr, { voice: voiceOf(d.who) })
      gap(0.4)
    } else {
      fr(d.fr, { voice: voiceOf(d.who) })
      gap(0.4)
    }
  }

  section('The conversation again')
  en('Listen to the conversation one last time. You should understand all of it now.')
  conversation()
  en(`That’s the end of lesson ${number}. Come back tomorrow and go on, or repeat this lesson if it felt hard.`)
  fr('À bientôt !')
  return { parts, steps }
}

/** Seconds for the learner's turn: enough to say `answer` out loud. */
export function turnSeconds(answer: string, factor = 1, repeat = false): number {
  const syllables = answer.replace(/[^a-zàâçéèêëîïôûùüÿœæ ]/gi, '').length / 2.6
  const base = repeat ? 1 + syllables * 0.22 : 2.2 + syllables * 0.3
  return Math.round(Math.min(12, base) * factor * 10) / 10
}

/** Rough spoken length of a script, in seconds. */
export function scriptSeconds(steps: Step[], factor = 1): number {
  let s = 0
  for (const st of steps) {
    if (st.kind === 'en') s += st.text.split(/\s+/).length / 2.6 + 0.3
    else if (st.kind === 'fr') s += st.text.length / (st.slow ? 9 : 13) + 0.3
    else if (st.kind === 'turn') s += turnSeconds(st.answer, factor, st.repeat)
    else s += st.seconds
  }
  return s
}

export function minutesOf(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}
