import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ActionIcon, Badge, Box, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title, type MantineColor } from '@mantine/core'
import { ArrowRight, BookOpen, Headphones, Mic, PenLine, Play, SlidersHorizontal, Table2, Target, Volume2 } from 'lucide-react'
import { VERBS, hasTense } from '../../data/verbs'
import { LESSONS } from '../../data/grammar'
import { TENSE_BY_ID, conjugate, pronounFor, tablePronoun, type Tense } from '../../lib/conjugate'
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
 * Quick play: one card per drill showing what it trains, a sample of what
 * you'll get, the settings it will use, and a Play button that starts it straight away.
 * Sized so all six fit on a laptop screen; the drill's own page (Options) has the full set-up.
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
  const lesson = due[0] ?? up
  const mastered = LESSONS.filter((l) => ['mastered', 'due'].includes(lessonStatus(s.lessons[l.id]))).length

  // ── Verb tables: a glimpse of one table ──
  const [table] = useState(() => {
    const v = pick(VERBS.filter((x) => x.essential)) ?? VERBS[0]
    return { inf: v.inf, en: v.en, cells: conjugate(v, 'present').map((c) => ({ pr: tablePronoun('present', c.person, c.display, v.inf), form: c.display })) }
  })

  const go = {
    weak: () => weakPlan.items.length && navigate('/session?mode=weak'),
    conj: () => canConj && navigate(`/conjugation/drill?seed=${Date.now()}`),
    grammar: () => (due.length ? navigate(`/grammar/${due[0].id}/practice`) : up && navigate(`/grammar/${up.id}`)),
    dict: () => speechSupported && navigate(`/listening/session?src=${encodeURIComponent(src)}&n=${DICTATION_N}`),
    say: (mode: 'read' | 'repeat' = 'read') => micSupported && navigate(`/speaking/session?src=${encodeURIComponent(src)}&mode=${mode}&n=${SPEAKING_N}`),
    verbs: () => navigate('/verbs'),
  }
  useHotkeys({ '1': go.weak, '2': go.conj, '3': go.grammar, '4': go.dict, '5': () => go.say(), '6': go.verbs })

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
      <PageHeader eyebrow="S’entraîner" title="Practice" />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <QuickCard
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

        <QuickCard
          hotkey="2"
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

        <QuickCard
          hotkey="3"
          icon={<BookOpen size={20} aria-hidden />}
          color="violet"
          title="Grammar"
          fr="Grammaire"
          trains={due.length ? 'Spaced reviews of rules you’ve passed, so they don’t fade.' : 'No reviews due — learn the next rule in the course.'}
          preview={
            lesson ? (
              <>
                <Group gap={8} mb={2}>
                  <LevelBadge level={lesson.level} />
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.4}>
                    {due.length ? 'Review due' : s.lessons[lesson.id] ? 'Continue' : 'Up next'}
                  </Text>
                </Group>
                <Text fw={600} lineClamp={2} lh={1.3}>
                  {lesson.title}
                </Text>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                Every lesson is mastered and nothing is due. Bravo !
              </Text>
            )
          }
          chips={due.length ? [plural(due.length, 'review') + ' due'] : up ? [`${up.minutes} min`, plural(up.goals.length, 'goal')] : []}
          stat={`${mastered}/${LESSONS.length} mastered`}
          play={{ label: due.length ? 'Play review' : up ? 'Open lesson' : 'All done', onClick: go.grammar, disabled: !lesson }}
          options={{ to: '/grammar', label: 'All lessons' }}
        />

        <QuickCard
          hotkey="4"
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
          hotkey="5"
          icon={<Mic size={20} aria-hidden />}
          color="green"
          title="Speaking"
          fr="Expression orale"
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

        <QuickCard
          hotkey="6"
          icon={<Table2 size={20} aria-hidden />}
          color="gray"
          title="Verb tables"
          fr="Tableaux de conjugaison"
          trains="Look up any verb in every tense when a form won’t come."
          preview={
            <div className="qp-table fr" lang="fr">
              {table.cells.map((c) => (
                <Text key={c.pr} size="sm" truncate>
                  <Text span c="dimmed" inherit>
                    {c.pr}{' '}
                  </Text>
                  {c.form}
                </Text>
              ))}
            </div>
          }
          chips={[`${table.inf} · présent`]}
          stat={plural(VERBS.length, 'verb')}
          play={{ label: 'Open tables', onClick: go.verbs, icon: <ArrowRight size={16} aria-hidden />, iconRight: true }}
        />
      </SimpleGrid>
    </Container>
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
  return (
    <Card component="section" aria-labelledby={id} padding="md" className="qp-card">
      <Stack gap={8} h="100%">
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon variant="light" color={color} size={38} radius="md">
            {icon}
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Title order={2} id={id} fz="lg" fw={650} lh={1.2}>
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

        <Text size="sm" lh={1.4} lineClamp={2}>
          {trains}
        </Text>

        <div className="qp-preview">{preview}</div>

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
      </Stack>
    </Card>
  )
}
