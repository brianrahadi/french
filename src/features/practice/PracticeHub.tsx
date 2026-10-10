import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { AudioLines, BookOpen, Headphones, MessagesSquare, Mic, NotebookPen, PenLine, Play, SlidersHorizontal, Table2, Target, Volume2 } from 'lucide-react'
import { hasTense } from '../../data/verbs'
import { LESSONS } from '../../data/grammar'
import { SCENARIOS } from '../../data/scenarios'
import { TENSE_BY_ID, conjugate, pronounFor, type Tense } from '../../lib/conjugate'
import { PageHeader } from '../../components/PageHeader'
import { Shelf } from '../../components/Shelf'
import { SpeakButton } from '../../components/SpeakButton'
import { Kbd, LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { useCurrentLevel, withinLevel } from '../../lib/level'
import { useAiConfig } from '../../lib/ai'
import { speechSupported } from '../../lib/speech'
import { micSupported, recognitionSupported } from '../../lib/recognition'
import { displayFr, frTypo } from '../../lib/words'
import { dueLessons, lessonStatus, nextUp } from '../grammar/status'
import { buildWeakPlan } from '../session/plan'
import { computeWeakSpots } from '../weak/weak'
import { poolFor as verbPool } from '../conjugation/drill'
import { pickSentences, poolFor as sentencePool, type SentenceSource } from '../listening/sentences'
import { useStartConversation } from '../talk/start'
import { suggestPrompt } from '../writing/tiles'
import { useLibraryDialogs } from '../library/dialogs'
import { practiceEntries } from '../library/entries'
import { isSection } from '../library/LibrarySectionPage'

const DICTATION_N = 10
const SPEAKING_N = 8
const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)]
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * Everything you produce, grouped by skill: speak (conversations,
 * pronunciation), write (writing, conjugation), listen and review (dictation,
 * grammar reviews), with Weak spots across the top. Each card shows what it
 * trains, a sample of what you'll get and a Play button that starts it straight
 * away; its own page (Options / See all) has the full set-up or list.
 * Things to read, hear and study live in the Library.
 */
export default function PracticeHub() {
  useDocumentTitle('Practice')
  const navigate = useNavigate()
  const s = useStore()
  const level = useCurrentLevel()
  const ai = useAiConfig()
  const startTalk = useStartConversation()
  const d = useLibraryDialogs(level)
  const { hash } = useLocation()
  const phone = useMediaQuery('(max-width: 48em)')

  // /practice#talk etc. scrolls to that card; on a phone a section with its own page opens that page.
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    if (phone && isSection(id)) navigate(`/practice/${id}`, { replace: true })
    else document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [hash, phone, navigate])

  // ── Weak spots ──
  const weak = useMemo(() => computeWeakSpots(s), [s])
  const weakPlan = useMemo(
    () => buildWeakPlan(useStore.getState(), Math.random, { tts: speechSupported, asr: recognitionSupported }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weak],
  )

  // ── Conjugation (uses the set-up saved on the Conjugation page) ──
  const conf = s.conjConfig
  const verbs = verbPool(conf)
  const canConj = conf.tenses.length > 0 && verbs.length > 0
  const [conjSample] = useState(() => {
    const v = pick(verbs)
    const t = pick(conf.tenses.filter((x) => v && hasTense(v, x)))
    if (!v || !t) return null
    const cell = pick(conjugate(v, t))
    if (!cell) return null
    return { inf: v.inf, en: v.en, tense: t, pronoun: pronounFor(t, cell.person, cell.m[0], 'm', v.inf) }
  })
  const conjRecent = Object.values(s.conj).flatMap((x) => x.recent)
  const conjAcc = conjRecent.length ? conjRecent.reduce((a, b) => a + b, 0) / conjRecent.length : null

  // ── Dictation & speaking: your words once you know a few, otherwise your level ──
  const src: SentenceSource = Object.keys(s.introduced).length >= 8 ? 'mine' : level
  const srcLabel = src === 'mine' ? 'My words' : `${src} sentences`
  const [dictSample] = useState(() => pickSentences(sentencePool(src, s), s.listening, 1)[0])
  const [saySample] = useState(() => pick(sentencePool(src, s)))
  const listened = Object.values(s.listening)
  const spoken = Object.values(s.speaking)
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

  // ── Grammar ──
  const due = dueLessons(s.lessons)
  const up = nextUp(s.lessons)
  const mastered = LESSONS.filter((l) => ['mastered', 'due'].includes(lessonStatus(s.lessons[l.id]))).length

  // ── Conversations: pick up an unfinished one, or a situation you haven't done at your level ──
  const talked = new Set(s.conversations.filter((c) => c.feedback).map((c) => c.scenarioId))
  for (const r of Object.values(s.talkLog ?? {})) talked.add(r.scenarioId)
  const ongoing = s.conversations
    .filter((c) => !c.feedback && !c.ended && c.turns.some((t) => t.role === 'me'))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const [scenario] = useState(() => {
    const fresh = SCENARIOS.filter((x) => !talked.has(x.id))
    return pick(fresh.filter((x) => x.level === level)) ?? pick(fresh.filter((x) => withinLevel(x.level, level))) ?? fresh[0]
  })
  const finishedTalks = s.conversations.filter((c) => c.feedback).length

  // ── Writing: the prompt that fits what you've just learned ──
  const written = new Set(s.writings.map((w) => w.promptId))
  const prompt = suggestPrompt(s.lessons, written, level)

  // ── Your history: conversations and corrected writing ──
  const history = practiceEntries(s)

  const go = {
    weak: () => weakPlan.items.length && navigate('/session?mode=weak'),
    talk: () => {
      if (!ai) return navigate('/settings#ai')
      if (ongoing) return navigate(`/talk/${ongoing.id}`)
      if (scenario) navigate(`/talk/${startTalk({ scenarioId: scenario.id, level: scenario.level })}`)
    },
    say: (mode: 'read' | 'repeat' = 'read') => micSupported && navigate(`/speaking/session?src=${encodeURIComponent(src)}&mode=${mode}&n=${SPEAKING_N}`),
    write: () => navigate(`/writing/new?prompt=${prompt ? prompt.id : 'free'}`),
    conj: () => canConj && navigate(`/conjugation/drill?seed=${Date.now()}`),
    dict: () => speechSupported && navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${DICTATION_N}`),
    grammar: () => due.length && navigate(`/grammar/${due[0].id}/practice`),
  }
  useHotkeys({ '1': go.weak, '2': go.talk, '3': () => go.say(), '4': go.write, '5': go.conj, '6': go.dict, '7': go.grammar })

  const weakRows = [
    ...weak.lessons.map((l) => {
      const ex = l.examples.find((m) => m.given || m.expected)
      return {
        key: `l:${l.lessonId}`,
        title: l.title,
        body: ex ? (
          <span className="qp-fix fr" lang="fr">
            {ex.given && <del>{frTypo(ex.given)}</del>}
            {ex.given && ' → '}
            <ins>{frTypo(ex.expected)}</ins>
          </span>
        ) : (
          plural(l.count, 'mistake')
        ),
      }
    }),
    ...weak.verbs.map((v) => ({
      key: `v:${v.inf}|${v.tense}`,
      title: (
        <span className="fr" lang="fr">
          {v.inf}
        </span>
      ),
      body: `${v.label} · ${pct(v.accuracy)} right`,
    })),
    ...weak.words.map((w) => ({
      key: `w:${w.word.id}`,
      title: (
        <span className="fr" lang="fr">
          {displayFr(w.word)}
        </span>
      ),
      body: `${w.word.en} · forgotten ${w.lapses}×`,
    })),
  ].slice(0, 2)

  const blank = <span className="qp-gap" aria-label="blank" />

  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader
        eyebrow="S’entraîner"
        title="Practice"
        actions={
          <>
            <Button component={Link} to="/verbs" variant="default" leftSection={<Table2 size={16} aria-hidden />}>
              Verb tables
            </Button>
            <Button component={Link} to="/speaking#sounds" variant="default" leftSection={<AudioLines size={16} aria-hidden />}>
              Tricky sounds
            </Button>
          </>
        }
      />

        <QuickCard
          wide
          anchor="weak"
          hotkey="1"
          icon={<Target size={20} aria-hidden />}
          color="pink"
          title="Weak spots"
          fr="Points faibles"
          trains="A mix of the rules, verbs and words you keep getting wrong."
          preview={
            weakRows.length ? (
              <Stack gap={6}>
                {weakRows.map((r) => (
                  <div key={r.key} className="qp-row">
                    <Text size="sm" fw={650} truncate>
                      {r.title}
                    </Text>
                    <Text size="sm" c="dimmed" truncate component="div">
                      {r.body}
                    </Text>
                  </div>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Nothing stands out right now. Mistakes from every drill gather here.
              </Text>
            )
          }
          chips={[
            weakPlan.counts.grammar > 0 && `${weakPlan.counts.grammar} grammar`,
            weakPlan.counts.conj > 0 && `${weakPlan.counts.conj} verbs`,
            weakPlan.counts.reviews > 0 && `${weakPlan.counts.reviews} words`,
            weakPlan.counts.fix > 0 && `${weakPlan.counts.fix} fixes`,
            weakPlan.counts.listen > 0 && `${weakPlan.counts.listen} dictation`,
          ]}
          stat={weakPlan.items.length ? `~${weakPlan.minutes} min` : undefined}
          play={{ label: weakPlan.items.length ? `Play ${weakPlan.items.length} questions` : 'Nothing to fix', onClick: go.weak, disabled: !weakPlan.items.length }}
          options={{ to: '/weak', label: 'All weak spots' }}
        />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mt="lg">
        <SkillGroup title="Speak" fr="Parler">
          <QuickCard
            anchor="talk"
            hotkey="2"
            icon={<MessagesSquare size={20} aria-hidden />}
            color="orange"
            title="Conversations"
            fr="Jeux de rôle"
            trains="Role-play a real situation with an AI partner, then get corrections."
            preview={
              ongoing ? (
                <>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.4} mb={2}>
                    Continue
                  </Text>
                  <Text className="fr qp-big" lang="fr" lineClamp={1}>
                    {frTypo(ongoing.title)}
                  </Text>
                </>
              ) : scenario ? (
                <>
                  <Text className="fr qp-big" lang="fr" lineClamp={1}>
                    {frTypo(scenario.titleFr)}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    {scenario.title} · with {scenario.aiName}
                  </Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  You’ve done every situation. Chat freely, or redo one from the list.
                </Text>
              )
            }
            chips={ongoing ? [ongoing.level, 'In progress'] : scenario ? [scenario.level, plural(scenario.goals.length, 'goal')] : []}
            stat={finishedTalks ? `${finishedTalks} finished` : undefined}
            play={{ label: !ai ? 'Connect an AI' : ongoing ? 'Continue' : 'Start', onClick: go.talk, disabled: !!ai && !ongoing && !scenario }}
            alt={{ label: 'Free chat', onClick: d.openFreeTalk }}
            options={{ to: '/practice/talk', label: 'All conversations' }}
          />
          <QuickCard
            anchor="speaking"
            hotkey="3"
            icon={<Mic size={20} aria-hidden />}
            color="green"
            title="Pronunciation"
            fr="Prononciation"
            trains="Say it out loud and see what came across — u/ou, nasals, the r."
            preview={
              saySample ? (
                <>
                  <Text className="fr qp-big" lang="fr" lineClamp={1}>
                    {frTypo(saySample.fr)}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    {saySample.en}
                  </Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  No sentences for this level yet.
                </Text>
              )
            }
            chips={[srcLabel, plural(SPEAKING_N, 'sentence')]}
            stat={!micSupported ? 'No microphone' : spoken.length ? `avg ${avg(spoken.map((x) => x.best))}%` : undefined}
            play={{ label: 'Read aloud', onClick: () => go.say('read'), disabled: !micSupported || !saySample }}
            alt={{ label: 'Listen & repeat', onClick: () => go.say('repeat'), disabled: !micSupported || !saySample || !speechSupported }}
            options={{ to: '/speaking' }}
          />
        </SkillGroup>
        <SkillGroup title="Write" fr="Écrire">
          <QuickCard
            anchor="writing"
            hotkey="4"
            icon={<NotebookPen size={20} aria-hidden />}
            color="indigo"
            title="Writing"
            fr="Écriture"
            trains="Write a short text and get every mistake corrected and explained."
            preview={
              prompt ? (
                <>
                  <Text className="fr qp-big" lang="fr" lineClamp={1}>
                    {frTypo(prompt.titleFr)}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    {prompt.focus}
                  </Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  You’ve written every prompt. Write freely, or set your own topic.
                </Text>
              )
            }
            chips={prompt ? [prompt.level, `${prompt.words[0]}–${prompt.words[1]} words`] : []}
            stat={s.writings.length ? `${s.writings.length} corrected` : undefined}
            play={{ label: prompt ? 'Write' : 'Free writing', onClick: go.write }}
            alt={prompt ? { label: 'Free writing', onClick: () => navigate('/writing/new?prompt=free') } : undefined}
            options={{ to: '/practice/writing', label: 'All writing prompts' }}
          />
          <QuickCard
            anchor="conjugation"
            hotkey="5"
            icon={<PenLine size={20} aria-hidden />}
            title="Conjugation"
            fr="Conjugaison"
            trains="Type the right verb form until endings and irregular stems are automatic."
            preview={
              conjSample ? (
                <>
                  <Text className="fr qp-big" lang="fr">
                    {conjSample.pronoun && <span>{conjSample.pronoun} </span>}
                    {blank}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    <span className="fr" lang="fr">
                      {conjSample.inf}
                    </span>{' '}
                    ({conjSample.en}) · {TENSE_BY_ID[conjSample.tense].label}
                  </Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  Pick at least one tense in Options.
                </Text>
              )
            }
            chips={[
              conf.tenses.length > 0 && TENSE_BY_ID[conf.tenses[0] as Tense]?.label + (conf.tenses.length > 1 ? ` +${conf.tenses.length - 1}` : ''),
              plural(verbs.length, 'verb'),
            ]}
            stat={conjAcc === null ? undefined : `${pct(conjAcc)} right`}
            play={{ label: `Play ${conf.length} questions`, onClick: go.conj, disabled: !canConj }}
            options={{ to: '/conjugation' }}
          />
        </SkillGroup>
        <SkillGroup title="Listen and review" fr="Écouter, réviser">
          <QuickCard
            anchor="dictation"
            hotkey="6"
            icon={<Headphones size={20} aria-hidden />}
            color="cyan"
            title="Dictation"
            fr="Dictée"
            trains="Hear a sentence, type it — liaisons, silent endings, word boundaries."
            preview={
              dictSample ? (
                <Group gap="sm" wrap="nowrap" align="center">
                  {speechSupported ? <SpeakButton text={dictSample.fr} size="sm" /> : <Volume2 size={20} aria-hidden />}
                  <div className="qp-blanks" aria-label="A hidden sentence">
                    {dictSample.fr.split(/\s+/).map((w, i) => (
                      <span key={i} className="qp-blank" style={{ width: `${Math.max(1.2, w.replace(/[.,!?;:»«]/g, '').length * 0.5)}em` }} />
                    ))}
                  </div>
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  No sentences for this level yet.
                </Text>
              )
            }
            chips={[srcLabel, plural(DICTATION_N, 'sentence')]}
            stat={!speechSupported ? 'No voice here' : listened.length ? `avg ${avg(listened.map((x) => x.last))}%` : undefined}
            play={{ label: `Play ${DICTATION_N} sentences`, onClick: go.dict, disabled: !speechSupported || !dictSample }}
            options={{ to: '/dictation' }}
          />
          <QuickCard
            anchor="grammar"
            hotkey="7"
            icon={<BookOpen size={20} aria-hidden />}
            color="violet"
            title="Grammar reviews"
            fr="Révisions"
            trains="Spaced reviews of rules you’ve passed, so they don’t fade."
            preview={
              due.length ? (
                <>
                  <Group gap={8} mb={2}>
                    <LevelBadge level={due[0].level} />
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.4}>
                      Review due
                    </Text>
                  </Group>
                  <Text fw={600} lineClamp={2} lh={1.3}>
                    {due[0].title}
                  </Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  Nothing due.{' '}
                  {up ? (
                    <>
                      Next in the course:{' '}
                      <Anchor component={Link} to={`/grammar/${up.id}`} inherit>
                        {up.title}
                      </Anchor>
                    </>
                  ) : (
                    'Every lesson is mastered. Bravo !'
                  )}
                </Text>
              )
            }
            chips={due.length ? [plural(due.length, 'review') + ' due'] : []}
            stat={`${mastered}/${LESSONS.length} mastered`}
            play={{ label: due.length ? 'Play review' : 'Nothing due', onClick: go.grammar, disabled: !due.length }}
            options={{ to: '/grammar', label: 'Grammar course' }}
          />
        </SkillGroup>
      </SimpleGrid>

      {history.length > 0 && (
        <Shelf id="history" kind="history" title="Your history" count={history.length} hint="Your conversations and corrected writing, newest first." to="/practice/history">
          {history.slice(0, 12).map((e) => e.node)}
        </Shelf>
      )}

      {d.dialogs}
    </Container>
  )
}

/** A column of cards for one skill, with its name on top. */
function SkillGroup({ title, fr, children }: { title: string; fr: string; children: ReactNode }) {
  return (
    <Stack gap="sm" component="section" aria-label={title}>
      <Group gap={8} align="baseline">
        <Title order={2} fz="md" fw={650}>
          {title}
        </Title>
        <Text size="sm" c="dimmed" className="fr" lang="fr">
          {fr}
        </Text>
      </Group>
      {children}
    </Stack>
  )
}

interface Action {
  label: string
  onClick: () => unknown
  disabled?: boolean
  icon?: ReactNode
  iconRight?: boolean
}

function QuickCard({
  anchor,
  wide,
  hotkey,
  icon,
  color,
  title,
  fr,
  trains,
  preview,
  chips,
  stat,
  play,
  alt,
  options,
}: {
  /** Id for links like /practice#talk. */
  anchor?: string
  /** Full width: laid out in a row on wider screens (Weak spots). */
  wide?: boolean
  hotkey: string
  icon: ReactNode
  color?: MantineColor
  title: string
  fr: string
  trains: ReactNode
  preview: ReactNode
  chips: (string | false | undefined)[]
  stat?: ReactNode
  play: Action
  alt?: Action
  options?: { to: string; label?: string }
}) {
  const shown = chips.filter((c): c is string => !!c)
  const id = `qp-${hotkey}`
  // With two buttons there's no room for the key hint (the number key still works).
  const key = !play.disabled && !alt && (
    <Box component="span" visibleFrom="sm" display="inline-flex">
      <Kbd>{hotkey}</Kbd>
    </Box>
  )
  const parts = {
    head: (
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon variant="light" color={color} size={38} radius="md">
          {icon}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Title order={wide ? 2 : 3} id={id} fz="lg" fw={650} lh={1.2}>
            {title}
          </Title>
          <Text size="xs" c="dimmed" className="fr" lang="fr" truncate>
            {fr}
          </Text>
        </Box>
        {options && (
          <ActionIcon
            component={Link}
            to={options.to}
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={options.label ?? `${title} options`}
            title={options.label ?? 'Options'}
          >
            <SlidersHorizontal size={18} aria-hidden />
          </ActionIcon>
        )}
      </Group>
    ),
    trains: (
      <Text size="sm" lh={1.4} lineClamp={2}>
        {trains}
      </Text>
    ),
    preview: <div className="qp-preview">{preview}</div>,
    chips: (
      <Group gap={6} justify="space-between" wrap="nowrap">
        <Group gap={4} wrap="nowrap" style={{ minWidth: 0, overflow: 'hidden' }}>
          {shown.map((c) => (
            <Badge key={c} variant="default" tt="none" fw={500} size="sm" style={{ flexShrink: 0 }}>
              {c}
            </Badge>
          ))}
        </Group>
        {stat && (
          <Text size="xs" c="dimmed" className="tnum" style={{ flexShrink: 0 }}>
            {stat}
          </Text>
        )}
      </Group>
    ),
    buttons: (
      <Group gap="xs" mt="auto">
        <Button
          color={color}
          px={alt ? 12 : undefined}
          variant={color === 'gray' ? 'default' : 'filled'}
          onClick={play.onClick}
          disabled={play.disabled}
          leftSection={play.iconRight ? undefined : (play.icon ?? <Play size={16} aria-hidden />)}
          rightSection={
            play.iconRight ? (
              <Group gap={6} wrap="nowrap">
                {play.icon}
                {key}
              </Group>
            ) : (
              key
            )
          }
        >
          {play.label}
        </Button>
        {alt && (
          <Button variant="default" px={12} onClick={alt.onClick} disabled={alt.disabled}>
            {alt.label}
          </Button>
        )}
      </Group>
    ),
  }
  if (wide)
    return (
      <Card component="section" aria-labelledby={id} id={anchor} padding="md" className="qp-card" style={{ scrollMarginTop: 16 }}>
        <Group gap="lg" align="stretch" wrap="wrap">
          <Stack gap={8} style={{ flex: '1 1 280px', minWidth: 0 }}>
            {parts.head}
            {parts.trains}
            {parts.chips}
          </Stack>
          <Stack gap={8} justify="space-between" style={{ flex: '1 1 280px', minWidth: 0 }}>
            {parts.preview}
            {parts.buttons}
          </Stack>
        </Group>
      </Card>
    )
  return (
    <Card component="section" aria-labelledby={id} id={anchor} padding="md" className="qp-card" style={{ scrollMarginTop: 16 }}>
      <Stack gap={8} h="100%">
        {parts.head}
        {parts.trains}
        {parts.preview}
        {parts.chips}
        {parts.buttons}
      </Stack>
    </Card>
  )
}
