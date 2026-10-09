import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ActionIcon, Badge, Box, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import { ArrowRight, BookOpen, Headphones, Mic, PenLine, Play, SlidersHorizontal, Table2, Target, Volume2 } from 'lucide-react'
import { VERBS, hasTense } from '../../data/verbs'
import { LESSONS } from '../../data/grammar'
import { TENSE_BY_ID, conjugate, pronounFor, type Tense } from '../../lib/conjugate'
import { PageHeader } from '../../components/PageHeader'
import { SpeakButton } from '../../components/SpeakButton'
import { Kbd, LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { useCurrentLevel } from '../../lib/level'
import { speechSupported } from '../../lib/speech'
import { micSupported, recognitionSupported } from '../../lib/recognition'
import { displayFr, frTypo } from '../../lib/words'
import { dueLessons, lessonStatus, nextUp } from '../grammar/status'
import { buildWeakPlan } from '../session/plan'
import { computeWeakSpots } from '../weak/weak'
import { poolFor as verbPool } from '../conjugation/drill'
import { pickSentences, poolFor as sentencePool, type SentenceSource } from '../listening/sentences'

const DICTATION_N = 10
const SPEAKING_N = 8
const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)]
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * Quick play: one big card per drill showing what it trains, a sample of what
 * you'll get, the settings it will use, and a Play button that starts it straight away.
 * The drill's own page (Options) is still there for changing the set-up.
 */
export default function PracticeHub() {
  useDocumentTitle('Practice')
  const navigate = useNavigate()
  const s = useStore()
  const level = useCurrentLevel()

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
    return { inf: v.inf, en: v.en, tense: t, pronoun: pronounFor(t, cell.person, cell.m[0], 'm', v.inf), answer: cell.m[0] }
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

  const go = {
    weak: () => weakPlan.items.length && navigate('/session?mode=weak'),
    conj: () => canConj && navigate(`/conjugation/drill?seed=${Date.now()}`),
    grammar: () => (due.length ? navigate(`/grammar/${due[0].id}/practice`) : up && navigate(`/grammar/${up.id}`)),
    dict: () => speechSupported && navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${DICTATION_N}`),
    say: (mode: 'read' | 'repeat' = 'read') => micSupported && navigate(`/speaking/session?src=${encodeURIComponent(src)}&mode=${mode}&n=${SPEAKING_N}`),
  }
  useHotkeys({ '1': go.weak, '2': go.conj, '3': go.grammar, '4': go.dict, '5': () => go.say() })

  const weakRows = [
    ...weak.lessons.slice(0, 3).map((l) => {
      const ex = l.examples.find((m) => m.given || m.expected)
      return {
        key: `l:${l.lessonId}`,
        kind: 'Grammar',
        title: l.title,
        body: ex ? (
          <span className="weak-example fr qp-fix" lang="fr">
            {ex.given && <del>{frTypo(ex.given)}</del>}
            {ex.given && <ArrowRight size={13} aria-hidden />}
            <ins>{frTypo(ex.expected)}</ins>
          </span>
        ) : (
          plural(l.count, 'mistake')
        ),
      }
    }),
    ...weak.verbs.slice(0, 2).map((v) => ({
      key: `v:${v.inf}|${v.tense}`,
      kind: 'Verb',
      title: (
        <span className="fr" lang="fr">
          {v.inf}
        </span>
      ),
      body: `${v.label} · ${pct(v.accuracy)} right`,
    })),
    ...weak.words.slice(0, 2).map((w) => ({
      key: `w:${w.word.id}`,
      kind: 'Word',
      title: (
        <span className="fr" lang="fr">
          {displayFr(w.word)}
        </span>
      ),
      body: `${w.word.en} · forgotten ${w.lapses}×`,
    })),
  ].slice(0, 3)

  return (
    <Container size="var(--page-w)" py="xl">
      <PageHeader eyebrow="S’entraîner" title="Practice" subtitle="Pick a drill and press Play to start straight away." />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <QuickCard
          wide
          hotkey="1"
          icon={<Target size={24} aria-hidden />}
          color="pink"
          title="Weak spots"
          fr="Points faibles"
          trains="A mixed set built from your recent mistakes in every drill — the rules, verbs and words you keep getting wrong."
          preview={
            weakRows.length ? (
              <SimpleGrid cols={{ base: 1, sm: weakRows.length }} spacing="sm">
                {weakRows.map((r) => (
                  <div key={r.key} className="qp-weak">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.4}>
                      {r.kind}
                    </Text>
                    <Text fw={650} lineClamp={1}>
                      {r.title}
                    </Text>
                    <Text size="sm" c="dimmed" component="div">
                      {r.body}
                    </Text>
                  </div>
                ))}
              </SimpleGrid>
            ) : (
              <Text c="dimmed">Nothing stands out right now. Mistakes from every exercise gather here, grouped by the rule behind them.</Text>
            )
          }
          chips={
            weakPlan.items.length
              ? [
                  weakPlan.counts.grammar > 0 && `${weakPlan.counts.grammar} grammar`,
                  weakPlan.counts.conj > 0 && `${weakPlan.counts.conj} verbs`,
                  weakPlan.counts.reviews > 0 && `${weakPlan.counts.reviews} words`,
                  weakPlan.counts.fix > 0 && `${weakPlan.counts.fix} corrections`,
                  weakPlan.counts.listen > 0 && `${weakPlan.counts.listen} dictation`,
                ]
              : []
          }
          play={{ label: weakPlan.items.length ? `Play ${weakPlan.items.length} questions` : 'Nothing to fix', onClick: go.weak, disabled: !weakPlan.items.length }}
          stat={weakPlan.items.length ? `about ${weakPlan.minutes} min` : undefined}
          options={{ to: '/weak', label: 'All weak spots' }}
        />

        <QuickCard
          hotkey="2"
          icon={<PenLine size={24} aria-hidden />}
          title="Conjugation"
          fr="Conjugaison"
          trains="Type the right verb form, fast — endings, irregular stems and agreement until they’re automatic."
          preview={
            conjSample ? (
              <Stack gap={6}>
                <Text className="fr qp-big" lang="fr">
                  {conjSample.pronoun && <span>{conjSample.pronoun} </span>}
                  <span className="qp-gap" aria-label="blank" />
                </Text>
                <Text size="sm" c="dimmed">
                  <span className="fr" lang="fr">
                    {conjSample.inf}
                  </span>{' '}
                  ({conjSample.en}) · {TENSE_BY_ID[conjSample.tense].label}
                </Text>
              </Stack>
            ) : (
              <Text c="dimmed">Pick at least one tense in Options.</Text>
            )
          }
          chips={[
            ...conf.tenses.slice(0, 3).map((t: Tense) => TENSE_BY_ID[t]?.label),
            conf.tenses.length > 3 && `+${plural(conf.tenses.length - 3, 'tense')}`,
            plural(verbs.length, 'verb'),
          ]}
          play={{ label: `Play ${conf.length} questions`, onClick: go.conj, disabled: !canConj }}
          stat={conjAcc === null ? 'Not started yet' : `${pct(conjAcc)} recent accuracy`}
          options={{ to: '/conjugation' }}
        />

        <QuickCard
          hotkey="3"
          icon={<BookOpen size={24} aria-hidden />}
          color="violet"
          title="Grammar"
          fr="Grammaire"
          trains={
            due.length
              ? 'Spaced reviews of rules you’ve already passed, so they stick instead of fading.'
              : 'No reviews due — learn the next rule in the course instead.'
          }
          preview={
            due.length || up ? (
              <Stack gap={6}>
                <Group gap={8}>
                  <LevelBadge level={(due[0] ?? up)!.level} />
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.4}>
                    {due.length ? 'Review due' : progressLabel(!!s.lessons[up!.id])}
                  </Text>
                </Group>
                <Text className="qp-big" fw={600}>
                  {(due[0] ?? up)!.title}
                </Text>
                {due.length > 1 && (
                  <Text size="sm" c="dimmed">
                    then {due.slice(1, 3).map((l) => l.title).join(', ')}
                    {due.length > 3 && ` and ${due.length - 3} more`}
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed">Every lesson is mastered and nothing is due. Bravo !</Text>
            )
          }
          chips={due.length ? [plural(due.length, 'review') + ' due'] : up ? [`${up.minutes} min`, plural(up.goals.length, 'goal')] : []}
          play={{
            label: due.length ? 'Play review' : up ? 'Open lesson' : 'All done',
            onClick: go.grammar,
            disabled: !due.length && !up,
          }}
          stat={`${mastered}/${LESSONS.length} lessons mastered`}
          options={{ to: '/grammar', label: 'All lessons' }}
        />

        <QuickCard
          hotkey="4"
          icon={<Headphones size={24} aria-hidden />}
          color="cyan"
          title="Dictation"
          fr="Dictée"
          trains="Hear a sentence, type what you heard — liaisons, silent endings and where one word stops and the next begins."
          preview={
            dictSample ? (
              <Group gap="sm" wrap="nowrap" align="center">
                {speechSupported ? <SpeakButton text={dictSample.fr} /> : <Volume2 size={22} aria-hidden />}
                <div className="qp-blanks" aria-label="A hidden sentence">
                  {dictSample.fr.split(/\s+/).map((w, i) => (
                    <span key={i} className="qp-blank" style={{ width: `${Math.max(1.2, w.replace(/[.,!?;:»«]/g, '').length * 0.55)}em` }} />
                  ))}
                </div>
              </Group>
            ) : (
              <Text c="dimmed">No sentences for this level yet.</Text>
            )
          }
          chips={[srcLabel, plural(DICTATION_N, 'sentence')]}
          play={{ label: `Play ${DICTATION_N} sentences`, onClick: go.dict, disabled: !speechSupported || !dictSample }}
          stat={
            !speechSupported
              ? 'This browser can’t read aloud'
              : listened.length
                ? `${plural(listened.length, 'sentence')} written · avg ${avg(listened.map((x) => x.last))}%`
                : 'Not started yet'
          }
          options={{ to: '/dictation' }}
        />

        <QuickCard
          hotkey="5"
          icon={<Mic size={24} aria-hidden />}
          color="green"
          title="Speaking"
          fr="Expression orale"
          trains="Say sentences out loud and see which words came across — u/ou, nasal vowels, the French r and the rhythm."
          preview={
            saySample ? (
              <Stack gap={4}>
                <Text className="fr qp-big" lang="fr" lineClamp={2}>
                  {frTypo(saySample.fr)}
                </Text>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {saySample.en}
                </Text>
              </Stack>
            ) : (
              <Text c="dimmed">No sentences for this level yet.</Text>
            )
          }
          chips={[srcLabel, plural(SPEAKING_N, 'sentence')]}
          play={{ label: 'Read aloud', onClick: () => go.say('read'), disabled: !micSupported || !saySample }}
          alt={{ label: 'Listen & repeat', onClick: () => go.say('repeat'), disabled: !micSupported || !saySample || !speechSupported }}
          stat={
            !micSupported
              ? 'No microphone access here'
              : spoken.length
                ? `${plural(spoken.length, 'sentence')} spoken · avg ${avg(spoken.map((x) => x.best))}%`
                : 'Not started yet'
          }
          options={{ to: '/speaking', label: 'Tricky sounds & options' }}
        />
      </SimpleGrid>

      <Card component={Link} to="/verbs" mt="lg" padding="md" c="inherit" td="none" className="qp-ref">
        <Group wrap="nowrap" gap="md">
          <ThemeIcon variant="light" color="gray" size={40} radius="md">
            <Table2 size={20} aria-hidden />
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={650}>Verb tables</Text>
            <Text size="sm" c="dimmed">
              Look up any of {VERBS.length} verbs in every tense
            </Text>
          </Box>
          <ArrowRight size={18} aria-hidden color="var(--mantine-color-dimmed)" />
        </Group>
      </Card>
    </Container>
  )
}

const progressLabel = (started: boolean) => (started ? 'Continue' : 'Up next')

interface Action {
  label: string
  onClick: () => unknown
  disabled?: boolean
}

function QuickCard({
  hotkey,
  icon,
  color,
  title,
  fr,
  trains,
  preview,
  chips,
  play,
  alt,
  stat,
  options,
  wide,
}: {
  hotkey: string
  icon: ReactNode
  color?: MantineColor
  title: string
  fr: string
  trains: ReactNode
  preview: ReactNode
  chips: (string | false | undefined)[]
  play: Action
  alt?: Action
  stat?: ReactNode
  options: { to: string; label?: string }
  wide?: boolean
}) {
  const shown = chips.filter((c): c is string => !!c)
  const id = `qp-${hotkey}`
  return (
    <Card component="section" aria-labelledby={id} padding="lg" className="qp-card" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <Stack gap="md" h="100%">
        <Group wrap="nowrap" gap="md" align="flex-start">
          <ThemeIcon variant="light" color={color} size={48} radius="md">
            {icon}
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Title order={2} id={id} fz="xl" fw={650} lh={1.2}>
              {title}
            </Title>
            <Text size="sm" c="dimmed" className="fr" lang="fr">
              {fr}
            </Text>
          </Box>
          <Button
            component={Link}
            to={options.to}
            variant="subtle"
            color="gray"
            size="compact-sm"
            visibleFrom="sm"
            leftSection={<SlidersHorizontal size={15} aria-hidden />}
          >
            {options.label ?? 'Options'}
          </Button>
          <ActionIcon component={Link} to={options.to} variant="subtle" color="gray" hiddenFrom="sm" aria-label={options.label ?? `${title} options`}>
            <SlidersHorizontal size={18} aria-hidden />
          </ActionIcon>
        </Group>

        <Text size="sm">{trains}</Text>

        <div className="qp-preview">{preview}</div>

        {shown.length > 0 && (
          <Group gap={6}>
            {shown.map((c) => (
              <Badge key={c} variant="default" tt="none" fw={500} size="md">
                {c}
              </Badge>
            ))}
          </Group>
        )}

        <Group gap="sm" mt="auto" justify="space-between" wrap="wrap">
          <Group gap="xs">
            <Button
              color={color}
              size="md"
              onClick={play.onClick}
              disabled={play.disabled}
              leftSection={<Play size={17} aria-hidden />}
              rightSection={!play.disabled && (
                <Box component="span" visibleFrom="sm" display="inline-flex">
                  <Kbd>{hotkey}</Kbd>
                </Box>
              )}
            >
              {play.label}
            </Button>
            {alt && (
              <Button variant="default" size="md" onClick={alt.onClick} disabled={alt.disabled}>
                {alt.label}
              </Button>
            )}
          </Group>
          {stat && (
            <Text size="sm" c="dimmed" className="tnum">
              {stat}
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  )
}
