/**
 * The road to B2: a 52-week plan and the daily lesson it generates, done
 * entirely in the app.
 *
 * Each week has one grammar focus (an app lesson), a theme, a writing task and
 * a role-play. Each weekday has a fixed job (new grammar, listening, writing,
 * consolidation, conversation, a long session, review), so a day is about 75
 * minutes on weekdays, 2 hours on Saturday and 1 hour on Sunday. Travel,
 * holiday and deload weeks keep the habit going without new material.
 */
import { addDays, dayKey, daysBetween, parseDayKey } from '../../lib/date'
import type { Level } from '../../data/types'
import type { Area } from '../../lib/studyTime'

export type PhaseId = 'A1' | 'A2' | 'B1' | 'B2' | 'EX'

export interface Phase {
  id: PhaseId
  /** The CEFR level whose content this phase works on. */
  level: Level
  name: string
  from: number
  to: number
  /** In-app study hours the phase's daily lessons add up to (computed from the blocks below). */
  hours: number
  goal: string
  /** What the phase uses in the app. */
  uses: string[]
  /** Suggested new words per day in the app's vocabulary settings. */
  newPerDay: number
  /** Target length of the week's writing task. */
  words: number
}

export type WeekKind = 'study' | 'travel' | 'holiday' | 'deload'

export interface Week {
  kind: WeekKind
  grammar: string
  theme: string
  output: string
  /** App lessons for the week: the first on Monday, the second (if any) on Thursday. */
  lessons?: string[]
  /** App writing prompt for Wednesday's task (otherwise free writing on `output`). */
  prompt?: string
  /** App role-play scenario for Tuesday. */
  talk?: string
  /** App pronunciation set (phase 1). */
  sounds?: string
}

export const WEEKS_TOTAL = 52

export const PHASES: Phase[] = [
  {
    id: 'A1',
    level: 'A1',
    name: 'Foundations',
    from: 1,
    to: 12,
    hours: 0,
    goal: 'Hear and say French sounds correctly, handle the present tense and the passé composé, and get through simple exchanges about yourself, food, family and travel.',
    uses: ['The A1 grammar lessons, one or two a week', 'The pronunciation sets, one a week', 'A1 stories, dictation and the first audio lessons', 'A1 role-plays and short corrected writing'],
    newPerDay: 15,
    words: 60,
  },
  {
    id: 'A2',
    level: 'A2',
    name: 'Everyday life',
    from: 13,
    to: 24,
    hours: 0,
    goal: 'Tell stories in the past, choosing correctly between passé composé and imparfait, use object pronouns without thinking, and handle services, complaints and plans.',
    uses: ['The A2 grammar lessons', 'A2 stories, graded texts and generated stories at your level', 'Twice-weekly conversations: a role-play and a free conversation on the week’s theme', 'Corrected writing of 70–120 words'],
    newPerDay: 15,
    words: 120,
  },
  {
    id: 'B1',
    level: 'B1',
    name: 'Independent user',
    from: 25,
    to: 38,
    hours: 0,
    goal: 'Give and defend opinions, use the subjunctive, si-clauses and reported speech, and follow longer texts and stories. Expect a plateau here; it’s the longest phase for that reason.',
    uses: ['The B1 grammar lessons', 'B1 stories, texts and the B1 audio lessons', 'Opinion role-plays and free conversations', 'Weak spots every Sunday'],
    newPerDay: 12,
    words: 180,
  },
  {
    id: 'B2',
    level: 'B2',
    name: 'Build B2',
    from: 39,
    to: 48,
    hours: 0,
    goal: 'Argue in a structured way in writing and in speech, control register and nuance, and understand denser texts at natural speed.',
    uses: ['The B2 grammar lessons', 'The DELF B2 oral exam role-play every Friday', 'Argumentative writing of about 250 words', 'B2 stories and generated B2 texts read and listened to'],
    newPerDay: 10,
    words: 250,
  },
  {
    id: 'EX',
    level: 'B2',
    name: 'Exam block',
    from: 49,
    to: 52,
    hours: 0,
    goal: 'A full mock every Saturday under exam timing: listening, reading, a 60-minute essay and the oral. Drill your weakest section the rest of the week.',
    uses: ['Timed writing (60 minutes, with a countdown)', 'The DELF B2 oral exam role-play', 'B2 stories for listening, generated B2 texts for reading', 'Weak spots'],
    newPerDay: 8,
    words: 250,
  },
]

const light = (kind: Exclude<WeekKind, 'study'>): Week => ({ kind, grammar: '', theme: '', output: '' })

export const WEEKS: Record<number, Week> = {
  1: { kind: 'study', lessons: ['etre-avoir', 'articles'], prompt: 'presente-toi', talk: 'neighbour', sounds: 'nasals', grammar: 'Subject pronouns, être and avoir, gender and articles.', theme: 'Greetings, introducing yourself', output: 'A 6-sentence self-introduction' },
  2: { kind: 'study', lessons: ['er-verbs', 'numbers'], prompt: 'ma-journee', talk: 'cafe', sounds: 'u-ou', grammar: 'Present tense of -er verbs; numbers, dates and telling the time.', theme: 'Daily routine, numbers, telling time', output: 'Describe a typical weekday' },
  3: { kind: 'study', lessons: ['negation', 'questions'], prompt: 'j-aime-manger', talk: 'bakery', sounds: 'liaison', grammar: 'Negation with ne…pas, and asking questions.', theme: 'Food, ordering at a café', output: 'Food you like and what you order' },
  4: light('travel'),
  5: light('travel'),
  6: { kind: 'study', lessons: ['irregular-present', 'adjectives'], prompt: 'mon-ami', talk: 'directions', sounds: 'r', grammar: 'Re-entry after the trip: the key irregular verbs (aller, faire, prendre, pouvoir, vouloir), adjective agreement and position.', theme: 'Describing people and places', output: 'Describe your best friend' },
  7: { kind: 'study', lessons: ['possessives', 'partitive'], prompt: 'ma-famille', talk: 'language-exchange', sounds: 'e-accents', grammar: 'Possessive adjectives, partitive articles and quantities.', theme: 'Family, home', output: 'Describe your family' },
  8: { kind: 'study', lessons: ['places', 'venir-savoir-connaitre'], prompt: 'mon-quartier', talk: 'tourist-office', sounds: 'eu', grammar: 'Prepositions with places; venir, savoir and connaître.', theme: 'The city, giving directions', output: 'Directions from your home to a café' },
  9: { kind: 'study', lessons: ['passe-compose-avoir', 'faire-jouer'], prompt: 'mes-loisirs', talk: 'market', sounds: 'oi-ille-gn', grammar: 'Passé composé with avoir; faire and jouer for hobbies, and saying how often.', theme: 'Weekend activities', output: 'What you do in your free time' },
  10: { kind: 'study', lessons: ['passe-compose-etre', 'cest-il-est'], prompt: 'carte-postale', talk: 'train-ticket', sounds: 'tongue-twisters', grammar: 'Passé composé with être and past participle agreement; c’est vs il est, and the weather.', theme: 'Travel', output: 'A postcard from your Japan trip' },
  11: light('holiday'),
  12: { kind: 'study', lessons: ['reflexive', 'ir-re-verbs'], prompt: 'mon-logement', talk: 'pharmacy', grammar: 'Reflexive verbs; regular -ir and -re verbs (finir, attendre). A1 consolidation: check your exit test.', theme: 'Health, the body, appointments', output: 'Describe where you live' },
  13: { kind: 'study', lessons: ['imparfait'], prompt: 'enfance', talk: 'holiday', grammar: 'The imparfait: formation, and its uses for description and habits.', theme: 'Childhood', output: 'Write about your childhood' },
  14: { kind: 'study', lessons: ['pc-vs-imparfait', 'time-expressions'], prompt: 'voyage-rate', talk: 'lost-luggage', grammar: 'Passé composé vs imparfait: background vs events; depuis, il y a, pendant, dans.', theme: 'Anecdotes', output: 'A trip that went wrong, with a clear background and events' },
  15: { kind: 'study', lessons: ['object-pronouns', 'stressed-pronouns'], prompt: 'merci-cadeau', talk: 'post-office', grammar: 'Direct and indirect object pronouns, agreement in the passé composé, and stressed pronouns (moi, toi, lui).', theme: 'Shopping, clothes', output: 'A thank-you note for a present' },
  16: { kind: 'study', lessons: ['double-pronouns'], prompt: 'invitation', talk: 'dinner-invitation', grammar: 'Pronoun order (me le, le lui, y, en).', theme: 'Relationships, invitations', output: 'Invite a friend and arrange the details' },
  17: { kind: 'study', lessons: ['y-en'], prompt: 'ma-recette', talk: 'restaurant-booking', grammar: 'The pronouns y and en. Expressions of quantity.', theme: 'Food, recipes, groceries', output: 'A recipe you actually cook' },
  18: { kind: 'study', lessons: ['near-future', 'futur-simple'], prompt: 'projets-ete', talk: 'car-rental', grammar: 'The near future and the futur simple. Time markers: dans, depuis, il y a, pendant.', theme: 'Work and plans', output: 'Your plans for the coming months' },
  19: light('deload'),
  20: { kind: 'study', lessons: ['comparisons', 'indefinites'], prompt: 'deux-villes', talk: 'gym', grammar: 'Comparatives and superlatives (bien → mieux, bon → meilleur); tout, chaque, quelqu’un and co.', theme: 'Housing, comparing cities', output: 'Compare two cities you know' },
  21: { kind: 'study', lessons: ['conditionnel'], prompt: 'reclamation-hotel', talk: 'hotel', grammar: 'The conditional for politeness, wishes and advice.', theme: 'Services, complaints', output: 'A polite complaint to a hotel' },
  22: { kind: 'study', lessons: ['relative-pronouns'], prompt: 'mon-travail', talk: 'doctor', grammar: 'Relative pronouns qui, que and où.', theme: 'Describing people and things', output: 'Your job or studies' },
  23: { kind: 'study', lessons: ['imperative', 'adverbs'], prompt: 'bonnes-habitudes', talk: 'lost-card', grammar: 'The imperative with pronouns, and adverbs ending in -ment.', theme: 'Instructions, advice', output: 'Advice for a healthier life' },
  24: { kind: 'study', grammar: 'A2 consolidation: your weakest lessons and your exit test.', theme: 'Review', output: 'Rewrite your weakest A2 writing' },
  25: { kind: 'study', lessons: ['plus-que-parfait'], prompt: 'lettre-motivation', talk: 'job-interview', grammar: 'Plus-que-parfait: sequencing past events.', theme: 'Work history', output: 'A cover letter for a job you’d like' },
  26: { kind: 'study', lessons: ['subjonctif'], prompt: 'dans-dix-ans', talk: 'flat-visit', grammar: 'The present subjunctive: formation, and il faut que.', theme: 'Rules, obligations, the future', output: 'Where you’ll be in ten years, and what has to happen first' },
  27: { kind: 'study', lessons: ['subjonctif-vs-indicatif'], prompt: 'mot-au-voisin', talk: 'weekend-plans', grammar: 'Subjunctive after emotion, will and doubt, vs the indicative after certainty.', theme: 'Opinions, feelings', output: 'A polite note to a neighbour' },
  28: { kind: 'study', lessons: ['conditionnel'], prompt: 'loto', talk: 'faulty-product', grammar: 'Si-clauses: si + présent/futur, and si + imparfait/conditionnel.', theme: 'Hypotheticals', output: 'If you won the lottery' },
  29: { kind: 'study', lessons: ['relative-pronouns', 'negation-advanced'], prompt: 'livre-film', talk: 'film-night', grammar: 'dont, ce qui and ce que; advanced negation (plus jamais rien, nulle part, aucun, ni… ni).', theme: 'Culture, media', output: 'Review a book, film or series' },
  30: { kind: 'study', lessons: ['reported-speech'], prompt: 'une-conversation', talk: 'colleague-favour', grammar: 'Reported speech, with tense shifts after a past reporting verb.', theme: 'Reporting conversations', output: 'Report a real conversation you had' },
  31: { kind: 'study', lessons: ['gerondif', 'verb-prepositions'], prompt: 'pourquoi-francais', talk: 'phone-contract', grammar: 'Gérondif and the present participle; verbs + à / de + infinitive.', theme: 'Learning, habits', output: 'Why you’re learning French, honestly' },
  32: light('deload'),
  33: { kind: 'study', lessons: ['passive'], prompt: 'avis-restaurant', talk: 'landlord-leak', grammar: 'The passive voice, and on as an alternative to it.', theme: 'News, the environment', output: 'An online review of a place you visited' },
  34: { kind: 'study', lessons: ['connectors'], prompt: 'teletravail', talk: 'remote-work-debate', grammar: 'Cause and consequence: car, puisque, donc, c’est pourquoi, si bien que.', theme: 'Work and society', output: 'Remote work: for or against?' },
  35: { kind: 'study', lessons: ['connectors'], prompt: 'reseaux-sociaux', talk: 'noisy-neighbour', grammar: 'Concession and opposition: bien que + subjunctive, pourtant, alors que, même si.', theme: 'Technology', output: 'Social media: a for/against essay' },
  36: { kind: 'study', lessons: ['plus-que-parfait'], prompt: 'une-decision', talk: 'travel-agency', grammar: 'The past conditional for regrets and reproaches.', theme: 'Life choices', output: 'A decision that changed your life' },
  37: { kind: 'study', lessons: ['demonstrative-pronouns', 'lequel'], prompt: 'personne-admiree', talk: 'negotiation', grammar: 'celui, le mien and co.; compound relative pronouns (lequel, auquel, duquel).', theme: 'Consumer choices', output: 'Someone you admire' },
  38: { kind: 'study', grammar: 'B1 consolidation: your weakest lessons and your exit test.', theme: 'Review', output: 'Rewrite your weakest B1 writing' },
  39: { kind: 'study', lessons: ['nominalisation', 'connectors'], prompt: 'lettre-formelle', talk: 'train-complaint', grammar: 'Nominalization, and the shape of a DELF B2 argument.', theme: 'Consumer rights', output: 'A formal complaint letter' },
  40: { kind: 'study', lessons: ['conjunctions-subjunctive', 'prepositions-infinitive'], prompt: 'devoirs', talk: 'masters-interview', grammar: 'Purpose, time and condition with the subjunctive (pour que, avant que, à moins que); compound prepositions and the past infinitive.', theme: 'Education', output: 'Should homework be abolished?' },
  41: { kind: 'study', lessons: ['gerondif', 'nominalisation'], prompt: 'sante', talk: 'explaining-work', grammar: 'Present participle vs gérondif; the compound participle (ayant fait).', theme: 'Health systems', output: 'Public or private healthcare?' },
  42: { kind: 'study', lessons: ['conjunctions-subjunctive', 'subjonctif-vs-indicatif'], prompt: 'immigration', talk: 'residents-meeting', grammar: 'Hypothesis and condition: au cas où, à condition que, pourvu que.', theme: 'Immigration, Canada', output: 'Welcoming newcomers to your city' },
  43: { kind: 'study', lessons: ['mise-en-relief'], prompt: 'medias', talk: 'radio-interview', grammar: 'Emphasis: c’est…qui/que, ce qui…c’est, dislocation.', theme: 'Media, information', output: 'Where do you get your news?' },
  44: light('deload'),
  45: { kind: 'study', lessons: ['registers'], prompt: 'deux-registres', talk: 'smartphone-debate', grammar: 'Register: formal, neutral and spoken French; common verlan.', theme: 'Youth, slang', output: 'One story in two registers' },
  46: { kind: 'study', lessons: ['passe-simple', 'concordance-temps'], prompt: 'tourisme', talk: 'bad-news', grammar: 'The passé simple (recognize it, don’t produce it); the sequence of tenses in narration.', theme: 'Literature', output: 'Mass tourism: an argued essay' },
  47: { kind: 'study', lessons: ['nuancing', 'futur-anterieur'], prompt: 'intelligence-artificielle', talk: 'remote-work-debate', grammar: 'Nuancing (il semblerait que, dans une certaine mesure, force est de constater); the futur antérieur for predictions.', theme: 'Ethics, AI', output: 'AI at work: a nuanced essay' },
  48: { kind: 'study', talk: 'negotiation', prompt: 'lettre-au-maire', grammar: 'Weak-spot sweep before the exam block, and the B2 exit test.', theme: 'Review', output: 'Full mock #1 on Saturday' },
  49: { kind: 'study', prompt: 'teletravail', grammar: 'Drill your weakest section from mock #1.', theme: 'Exam', output: 'Full mock #2' },
  50: { kind: 'study', prompt: 'sante', grammar: 'Written production under time pressure.', theme: 'Exam', output: 'Full mock #3' },
  51: { kind: 'study', prompt: 'immigration', grammar: 'Taper: a lighter load, and rehearse the oral.', theme: 'Exam', output: 'Mock #4' },
  52: { kind: 'study', prompt: 'intelligence-artificielle', grammar: 'Exam week: sit the DELF B2, or a final full mock here.', theme: 'Exam', output: 'Final mock' },
}

export const WEEK_KIND_LABEL: Record<WeekKind, string> = {
  study: 'Study week',
  travel: 'Travel: maintenance mode',
  holiday: 'Holidays: light week',
  deload: 'Deload: review only, no new grammar',
}

/** Starting point by level: a learner who already has A2 starts on the B1 phase, and so on. */
export const START_WEEK: Record<Level, number> = { A1: 1, A2: 13, B1: 25, B2: 39 }

export const DAY_NAMES = ['New grammar', 'Listening', 'Writing', 'Consolidation', 'Conversation', 'Long session', 'Review & plan'] as const
export const DAY_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

export interface Roadmap {
  /** Monday the plan starts (dayKey), or null before it's set up. */
  start: string | null
  /** Plan week the learner starts on (1, 13, 25 or 39). */
  startWeek: number
}

export interface PlanPosition {
  /** Plan week (1–52), 0 before the start date, 53+ after the end. */
  week: number
  /** 0 = Monday … 6 = Sunday. */
  dow: number
}

/** The plan's next Monday from a date (that day itself if it's a Monday). */
export function nextMonday(d = new Date()): string {
  const dow = (d.getDay() + 6) % 7
  return dayKey(addDays(d, dow === 0 ? 0 : 7 - dow))
}

export function position(r: Roadmap, day: Date): PlanPosition {
  const dow = (day.getDay() + 6) % 7
  if (!r.start) return { week: 0, dow }
  const diff = daysBetween(parseDayKey(r.start), day)
  if (diff < 0) return { week: 0, dow }
  return { week: Math.floor(diff / 7) + r.startWeek, dow }
}

/** Monday of a plan week. */
export function weekStart(r: Roadmap, week: number): Date {
  return addDays(parseDayKey(r.start ?? nextMonday()), (week - r.startWeek) * 7)
}

export const phaseOf = (week: number): Phase | undefined => PHASES.find((p) => week >= p.from && week <= p.to)

// ───────────── The daily lesson ─────────────

/** How a block can tick itself off from what you did in the app today. */
export type AutoCheck =
  | { kind: 'session' }
  | { kind: 'lesson'; id: string }
  | { kind: 'writing'; timed?: boolean }
  | { kind: 'talk'; scenario?: string }
  | { kind: 'dictation' }
  | { kind: 'speaking' }
  | { kind: 'story' }
  | { kind: 'reading' }
  | { kind: 'audio' }
  | { kind: 'words' }

export interface PlanBlock {
  id: string
  minutes: number
  title: string
  detail: string
  /** Where to do it in the app. */
  to?: string
  /** Start a conversation: a role-play scenario id, or 'free' with a topic. */
  talk?: { scenario: string; topic?: string }
  /** Label for the link button. */
  cta?: string
  auto?: AutoCheck
  /** The part of the roadmap its time counts toward (none for planning blocks). */
  area?: Area
}

/** Things in the app the day's blocks can point at, chosen from progress. */
export interface PlanContext {
  /** Next listening story at the phase's level not yet answered well. */
  story?: { id: string; title: string }
  /** Next graded text at the phase's level not yet read. */
  text?: { id: string; title: string }
  /** Next audio lesson not finished. */
  audio?: { id: string; title: string }
  /** Next writing prompt at the phase's level not written yet. */
  prompt?: { id: string; title: string }
  /** Next role-play at the phase's level not finished yet. */
  talk?: { id: string; title: string }
  /** Whether a writing prompt or role-play is already done (then the next one is suggested instead). */
  done?: (kind: 'prompt' | 'talk', id: string) => boolean
  /** Display titles for lesson ids. */
  lessonTitle: (id: string) => string | undefined
  /** Display title for a writing prompt id. */
  promptTitle: (id: string) => string | undefined
  /** Display title for a role-play scenario id. */
  talkTitle: (id: string) => string | undefined
}

const session = (minutes = 15): PlanBlock => ({
  id: 'session',
  minutes,
  title: 'Today’s session',
  detail: 'Flashcard reviews and new words, due grammar reviews, a verb drill, dictation and your own past mistakes, mixed together. Done when you reach your daily goal.',
  to: '/session',
  cta: 'Start',
  auto: { kind: 'session' },
  area: 'review',
})

const audioBlock = (ctx: PlanContext, minutes = 15): PlanBlock => ({
  id: 'audio',
  minutes,
  title: ctx.audio ? `Audio lesson: ${ctx.audio.title}` : 'Audio lesson',
  detail: 'Hands-free: answer out loud in the pauses. Works on a walk, a bus or a plane.',
  to: ctx.audio ? `/audio/${ctx.audio.id}` : '/library#audio',
  cta: 'Listen',
  auto: { kind: 'audio' },
  area: 'listening',
})

const generateLink = (level: Level) => `/library?generate=${level}#texts`

export const MINIMUM_DAY: PlanBlock[] = [
  { ...session(15), detail: 'Just the mixed session. On a rough day, this is the part that keeps your reviews from piling up.' },
  { id: 'min-audio', minutes: 10, title: 'One audio lesson or story', detail: 'Ten minutes of listening, any level.', to: '/library#audio', cta: 'Listen', auto: { kind: 'audio' }, area: 'listening' },
]

export const SETUP_DAY: PlanBlock[] = [
  { id: 'w0-level', minutes: 20, title: 'Check your level', detail: 'Try the exercises of “Subject pronouns, être & avoir” and “Passé composé with avoir”. If you pass both easily, start the plan at A2 on the Roadmap.', to: '/grammar', cta: 'Grammar', auto: { kind: 'lesson', id: 'etre-avoir' } },
  { id: 'w0-ai', minutes: 5, title: 'Connect an AI model', detail: 'Writing corrections and conversations need one. Settings → AI: paste a key and press Save & test.', to: '/settings', cta: 'Settings' },
  { id: 'w0-settings', minutes: 5, title: 'Set your daily load', detail: 'In Settings, set new words per day to 15, and keep dictation on in the daily session.', to: '/settings', cta: 'Settings' },
  { id: 'w0-decks', minutes: 5, title: 'Turn on the Top 5000 words', detail: 'Vocabulary → turn on Top 5000, so new words come in frequency order alongside the themed decks.', to: '/vocab', cta: 'Vocabulary' },
  { id: 'w0-baseline', minutes: 10, title: 'Record a baseline', detail: 'Have a short free conversation introducing yourself and press Finish. Its score is your starting point; you’ll redo it at the end of every phase.', talk: { scenario: 'free', topic: 'te présenter' }, cta: 'Talk', auto: { kind: 'talk' } },
  { id: 'w0-first', minutes: 20, title: 'Read the first lesson', detail: 'Get a head start on week 1 with subject pronouns, être and avoir.', to: '/grammar/etre-avoir', cta: 'Open', auto: { kind: 'lesson', id: 'etre-avoir' } },
]

function lightDay(kind: Exclude<WeekKind, 'study'>, dow: number, ctx: PlanContext): PlanBlock[] {
  if (kind === 'deload')
    return [
      session(20),
      { id: 'weak', minutes: 25, title: 'Weak spots', detail: 'Practise the mistakes from the last five weeks instead of anything new.', to: '/weak', cta: 'Practise', area: 'review' },
      dow % 2 === 0 ? audioBlock(ctx, 20) : { id: 'story', minutes: 20, title: 'A story for pleasure', detail: 'Any level you like, with no pressure on the score.', to: '/library#stories', cta: 'Stories', auto: { kind: 'story' }, area: 'listening' },
    ]
  if (kind === 'travel') return dow === 6 ? [session(15)] : [session(15), audioBlock(ctx)]
  return [session(15), dow % 2 === 0 ? audioBlock(ctx) : { id: 'story', minutes: 10, title: 'One short story', detail: 'Listen without the text, then answer the questions.', to: '/library#stories', cta: 'Stories', auto: { kind: 'story' }, area: 'listening' }]
}

function lessonBlock(id: string, ctx: PlanContext, part: 'study' | 'practice', minutes: number): PlanBlock {
  const title = ctx.lessonTitle(id) ?? id
  return part === 'study'
    ? { id: `lesson-${id}`, minutes, title: `Lesson: ${title}`, detail: 'Read the whole lesson with the audio, then do its exercises. Aim for 80% so it joins your reviews.', to: `/grammar/${id}`, cta: 'Open lesson', auto: { kind: 'lesson', id }, area: 'grammar' }
    : { id: `practice-${id}`, minutes, title: `Practice: ${title}`, detail: 'A second round of exercises without re-reading the explanation first. Wrong answers come back at the end.', to: `/grammar/${id}/practice`, cta: 'Practise', auto: { kind: 'lesson', id }, area: 'grammar' }
}

const reviewBlock = (minutes: number, id = 'review'): PlanBlock => ({
  id,
  minutes,
  title: 'Grammar review: your weakest lessons',
  detail: 'A targeted session from the lessons and verb forms you get wrong most. Then check the exit test on the Roadmap.',
  to: '/weak',
  cta: 'Practise',
  area: 'review',
})

/** The week's prompt, or the next one not written yet at this level when the week's is done (or the week has none). */
function pickPrompt(w: Week, ctx: PlanContext): string | undefined {
  if (w.prompt && !ctx.done?.('prompt', w.prompt)) return w.prompt
  return ctx.prompt?.id ?? w.prompt
}

function writingBlock(w: Week, phase: Phase, ctx: PlanContext, timed = 0): PlanBlock {
  const prompt = pickPrompt(w, ctx)
  const promptTitle = prompt ? ctx.promptTitle(prompt) : undefined
  const q = timed ? `&timed=${timed}` : ''
  return {
    id: timed ? 'writing-timed' : 'writing',
    minutes: timed || 30,
    title: timed ? `Timed writing (${timed} min)` : `Writing (~${phase.words} words)`,
    detail: `${promptTitle ?? w.output}. ${timed ? 'A countdown runs while you write; no dictionary.' : 'Every mistake is explained and logged to Weak spots.'}`,
    to: prompt && promptTitle ? `/writing/new?prompt=${prompt}${q}` : `/writing/new?prompt=free${q}`,
    cta: 'Write',
    auto: { kind: 'writing', timed: !!timed },
    area: 'writing',
  }
}

function roleplayBlock(w: Week, ctx: PlanContext, minutes: number, id = 'talk'): PlanBlock {
  // The week's role-play, or the next one not done yet at this level once it is.
  const scenario = w.talk && !ctx.done?.('talk', w.talk) ? w.talk : (ctx.talk?.id ?? w.talk)
  const title = scenario ? ctx.talkTitle(scenario) : undefined
  return {
    id,
    minutes,
    title: title ? `Role-play: ${title}` : 'Role-play',
    detail: 'Reach every goal, use this week’s grammar on purpose, then press Finish for a score and feedback.',
    ...(title ? { talk: { scenario: scenario! } } : { to: '/library#talk' }),
    cta: 'Talk',
    auto: { kind: 'talk' },
    area: 'speaking',
  }
}

const freeTalk = (w: Week, minutes: number, id = 'free-talk'): PlanBlock => ({
  id,
  minutes,
  title: 'Free conversation',
  detail: `Talk about this week’s theme (${w.theme}) for as long as you can. Use the microphone to answer out loud, and press Finish for feedback.`,
  talk: { scenario: 'free', topic: w.theme.toLowerCase() },
  cta: 'Talk',
  auto: { kind: 'talk' },
  area: 'speaking',
})

const examOral = (minutes: number, id = 'oral'): PlanBlock => ({
  id,
  minutes,
  title: 'DELF B2 oral exam',
  detail: 'The examiner gives you a press article: present the problem, defend a position, then debate. Answer out loud with the microphone, and press Finish for a score.',
  talk: { scenario: 'delf-oral' },
  cta: 'Start the exam',
  auto: { kind: 'talk', scenario: 'delf-oral' },
  area: 'speaking',
})

function storyBlock(ctx: PlanContext, phase: Phase, minutes: number, id = 'story'): PlanBlock {
  return ctx.story
    ? { id, minutes, title: `Story: ${ctx.story.title}`, detail: 'Listen without the text first, answer the questions, then read the transcript.', to: `/listening/story/${ctx.story.id}`, cta: 'Listen', auto: { kind: 'story' }, area: 'listening' }
    : { id, minutes, title: `Listen to a new ${phase.level} story`, detail: 'Have the app write a story at your level, then press Listen and follow it without the translation.', to: generateLink(phase.level), cta: 'New story', auto: { kind: 'reading' }, area: 'listening' }
}

function readingBlock(ctx: PlanContext, phase: Phase, minutes: number, id = 'reading'): PlanBlock {
  return ctx.text
    ? { id, minutes, title: `Read: ${ctx.text.title}`, detail: 'Tap words you don’t know; afterwards, check off the words you recognised.', to: `/reading/${ctx.text.id}`, cta: 'Read', auto: { kind: 'reading' }, area: 'reading' }
    : { id, minutes, title: `Read a new ${phase.level} text`, detail: 'Have the app write a text at your level on a topic you choose. Read it without the translation, and send new words to your flashcards.', to: generateLink(phase.level), cta: 'New text', auto: { kind: 'reading' }, area: 'reading' }
}

function examDay(dow: number, w: Week, ctx: PlanContext, phase: Phase): PlanBlock[] {
  const s = session(15)
  const days: PlanBlock[][] = [
    [s, storyBlock(ctx, phase, 30, 'co'), { id: 'dict', minutes: 20, title: 'Dictation', detail: 'Train the sounds you didn’t catch in the story.', to: '/dictation', cta: 'Dictation', auto: { kind: 'dictation' }, area: 'listening' }],
    [s, readingBlock(ctx, phase, 45, 'ce'), reviewBlock(15)],
    [s, writingBlock(w, phase, ctx, 60)],
    [s, examOral(40), { id: 'oral-review', minutes: 15, title: 'Review the oral feedback', detail: 'Read the “what to work on” list and add the better phrasings to your words.', to: '/vocab', cta: 'Vocabulary', auto: { kind: 'words' }, area: 'review' }],
    [s, examOral(30, 'oral-2'), { id: 'speak', minutes: 20, title: 'Read aloud', detail: 'Read-aloud practice at B2 to keep your pronunciation clean under pressure.', to: '/speaking', cta: 'Speak', auto: { kind: 'speaking' }, area: 'speaking' }],
    [s, storyBlock(ctx, phase, 30, 'mock-co'), readingBlock(ctx, phase, 45, 'mock-ce'), { ...writingBlock(w, phase, ctx, 60), id: 'mock-pe' }],
    [s, reviewBlock(30), { id: 'exit', minutes: 10, title: 'Check the exit test', detail: 'Look at your scores on the Roadmap and pick next week’s weakest section.', to: '/roadmap', cta: 'Roadmap' }],
  ]
  return days[dow]
}

/** The blocks for one day of the plan. */
export function blocksFor(pos: PlanPosition, ctx: PlanContext): PlanBlock[] {
  const { week, dow } = pos
  if (week <= 0) return SETUP_DAY
  if (week > WEEKS_TOTAL)
    return [session(15), { ...examOral(30), id: 'keep', title: 'Keep talking', detail: 'One B2 conversation a week keeps your level. Pick any topic.' }]
  const w = WEEKS[week]
  const phase = phaseOf(week)!
  if (w.kind !== 'study') return lightDay(w.kind, dow, ctx)
  if (phase.id === 'EX') return examDay(dow, w, ctx, phase)

  const [first, second] = w.lessons ?? []
  const b2 = phase.id === 'B2'
  const monGrammar = first ? lessonBlock(first, ctx, 'study', 30) : reviewBlock(30)
  const thuGrammar = second ? lessonBlock(second, ctx, 'study', 25) : first ? lessonBlock(first, ctx, 'practice', 25) : reviewBlock(25, 'review-2')

  const days: PlanBlock[][] = [
    // Monday: new grammar
    [
      session(),
      monGrammar,
      storyBlock(ctx, phase, 15),
      { id: 'sentences', minutes: 15, title: 'Write 8 sentences', detail: `Use today’s grammar in 8 sentences about your own life (free writing). Theme: ${w.theme}.`, to: '/writing/new?prompt=free', cta: 'Write', auto: { kind: 'writing' }, area: 'writing' },
    ],
    // Tuesday: listening
    [
      session(),
      { id: 'dictation', minutes: 15, title: 'Dictation', detail: 'Type what you hear. The mismatches show you which sounds you aren’t hearing yet.', to: '/dictation', cta: 'Dictation', auto: { kind: 'dictation' }, area: 'listening' },
      { id: 'sounds', minutes: 15, title: w.sounds ? 'Pronunciation set' : 'Listen & repeat', detail: w.sounds ? 'This week’s sound set: read aloud, compare your recording with the model, and repeat the words that didn’t come through.' : 'Hear each sentence, say it back, and compare your recording with the model.', to: '/speaking', cta: 'Speak', auto: { kind: 'speaking' }, area: 'speaking' },
      roleplayBlock(w, ctx, 30),
    ],
    // Wednesday: writing
    [
      session(),
      first ? lessonBlock(first, ctx, 'practice', 15) : reviewBlock(15, 'drill'),
      writingBlock(w, phase, ctx, b2 ? 45 : 0),
      { id: 'fix', minutes: 15, title: 'Fix your mistakes', detail: 'Open today’s correction and use “Rewrite it yourself”, or practise the corrections in Weak spots.', to: '/weak', cta: 'Weak spots', area: 'writing' },
    ],
    // Thursday: consolidation
    [session(), thuGrammar, readingBlock(ctx, phase, 20), ctx.audio ? audioBlock(ctx) : { id: 'dictation-2', minutes: 15, title: 'Dictation', detail: 'A second dictation round on this week’s words.', to: '/dictation', cta: 'Dictation', auto: { kind: 'dictation' }, area: 'listening' }],
    // Friday: conversation
    [
      session(),
      // Odd weeks, a second role-play while the level still has some to do; otherwise free talk.
      b2 ? examOral(30) : week % 2 === 1 && ctx.talk ? roleplayBlock({ ...w, talk: undefined }, ctx, 30, 'talk-2') : freeTalk(w, 30),
      { id: 'read-aloud', minutes: 20, title: 'Read aloud', detail: 'Read sentences aloud at your level; repeat the ones the microphone didn’t catch.', to: '/speaking', cta: 'Speak', auto: { kind: 'speaking' }, area: 'speaking' },
      { id: 'words', minutes: 10, title: 'Keep what you learned', detail: 'Add this week’s corrections and better phrasings to your words, from the feedback screens or Vocabulary → Add.', to: '/vocab', cta: 'Vocabulary', auto: { kind: 'words' }, area: 'review' },
    ],
    // Saturday: long session
    [
      session(20),
      readingBlock({ ...ctx, text: undefined }, phase, 40, 'read-long'),
      ctx.audio ? audioBlock(ctx, 40) : storyBlock({ ...ctx, story: undefined }, phase, 40, 'listen-long'),
      week % 2 === 0 ? { ...writingBlock(w, phase, ctx, 30), id: 'exam-pe', title: 'Exam task: timed writing (30 min)' } : { ...storyBlock(ctx, phase, 20, 'exam-co'), title: ctx.story ? `Exam task: ${ctx.story.title}` : 'Exam task: listening' },
    ],
    // Sunday: review & plan
    [
      session(15),
      reviewBlock(30, 'checkpoint'),
      { id: 'plan', minutes: 10, title: 'Plan next week', detail: 'Glance at next week and your exit test on the Roadmap.', to: '/roadmap', cta: 'Roadmap' },
    ],
  ]
  return days[dow]
}

export const blockMinutes = (bs: PlanBlock[]): number => bs.reduce((n, b) => n + b.minutes, 0)

/** A context where every kind of material is still available, to count what the plan asks for. */
export const FULL_CONTEXT: PlanContext = {
  story: { id: 'story', title: 'Story' },
  text: { id: 'text', title: 'Text' },
  audio: { id: 'audio', title: 'Audio' },
  prompt: { id: 'prompt', title: 'Prompt' },
  talk: { id: 'talk', title: 'Role-play' },
  lessonTitle: (id) => id,
  promptTitle: (id) => id,
  talkTitle: (id) => id,
}

const NO_AREA = { review: 0, grammar: 0, listening: 0, reading: 0, writing: 0, speaking: 0 } as const

/** Minutes the plan asks for in each area over a range of weeks, block by block. */
export function plannedMinutes(fromWeek: number, toWeek: number, ctx: PlanContext = FULL_CONTEXT): Record<Area, number> {
  const out: Record<Area, number> = { ...NO_AREA }
  for (let week = fromWeek; week <= toWeek; week++)
    for (let dow = 0; dow < 7; dow++) for (const b of blocksFor({ week, dow }, ctx)) if (b.area) out[b.area] += b.minutes
  return out
}

/** How many blocks of each kind (by block id) the plan has over a range of weeks. */
export function plannedBlocks(fromWeek: number, toWeek: number, ctx: PlanContext = FULL_CONTEXT): Record<string, number> {
  const out: Record<string, number> = {}
  for (let week = fromWeek; week <= toWeek; week++)
    for (let dow = 0; dow < 7; dow++) for (const b of blocksFor({ week, dow }, ctx)) out[b.id.replace(/^(lesson|practice)-.*/, '$1')] = (out[b.id.replace(/^(lesson|practice)-.*/, '$1')] ?? 0) + 1
  return out
}

// Each phase's hours are what its daily lessons add up to, so the plan and its exit test agree.
for (const p of PHASES) p.hours = Math.round(Object.values(plannedMinutes(p.from, p.to)).reduce((a, b) => a + b, 0) / 60)
