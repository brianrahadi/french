import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Container,
  DataList,
  Divider,
  Group,
  Input,
  NativeSelect,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { Download, Upload, Volume2 } from 'lucide-react'
import { Dialog } from '../../components/Dialog'
import { PageHeader } from '../../components/PageHeader'
import { Kbd } from '../../components/ui'
import { toast } from '../../components/Toast'
import { exportData, useStore, type Directions, type Theme } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { speak, speechSupported, useFrenchVoices } from '../../lib/speech'
import { dayKey } from '../../lib/date'
import { AiSetup } from '../../components/AiSetup'
import { SyncAccount } from '../../components/SyncAccount'
import { useSync } from '../../lib/sync/engine'

/** A titled settings group: an h2 and the controls in a Card (or bare, for cards that bring their own). */
function Section({ id, anchor, title, bare, children }: { id: string; anchor?: string; title: ReactNode; bare?: boolean; children: ReactNode }) {
  return (
    <Box component="section" aria-labelledby={id} id={anchor} mt="xl">
      <Title order={2} size="h4" id={id} mb="sm">
        {title}
      </Title>
      {bare ? (
        children
      ) : (
        <Card>
          <Stack gap="md">{children}</Stack>
        </Card>
      )}
    </Box>
  )
}

/** A text block on the left and an action (button) on the right. */
function ActionRow({ title, desc, children }: { title: string; desc: ReactNode; children: ReactNode }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Box miw={0} style={{ flex: '1 1 260px' }}>
        <Text size="sm" fw={500}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {desc}
        </Text>
      </Box>
      {children}
    </Group>
  )
}

/** Labelled SegmentedControl (Mantine's doesn't take a label itself). */
function Segmented<T extends string>({ label, desc, value, onChange, data }: { label: string; desc?: ReactNode; value: T; onChange: (v: T) => void; data: [T, string][] }) {
  return (
    <Input.Wrapper label={label} description={desc} labelElement="div">
      <SegmentedControl
        mt={desc ? 6 : 2}
        value={value}
        onChange={(v) => onChange(v as T)}
        data={data.map(([v, l]) => ({ value: v, label: l }))}
        aria-label={label}
      />
    </Input.Wrapper>
  )
}

const numberChange = (fn: (n: number) => void) => (v: number | string) => {
  if (typeof v === 'number') fn(v)
}

export default function SettingsPage() {
  useDocumentTitle('Settings')
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [hash])
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const signedIn = !!useSync((s) => s.user)
  const voices = useFrenchVoices()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `petit-a-petit-backup-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded')
  }

  const upload = async (f: File) => {
    try {
      importData(JSON.parse(await f.text()))
      toast('Progress restored')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file')
    }
  }

  return (
    <Container size={760} py="xl">
      <PageHeader eyebrow="Réglages" title="Settings" />

      <Section id="set-account" anchor="account" title={<>Account &amp; sync</>} bare>
        <SyncAccount />
      </Section>

      <Section id="set-study" title="Study">
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg">
          <NumberInput
            label="New words per day"
            description="How many new words to introduce each day. 5–15 is sustainable."
            value={settings.newPerDay}
            onChange={numberChange((n) => update({ newPerDay: n }))}
            min={0}
            max={50}
            step={5}
            clampBehavior="strict"
            allowDecimal={false}
          />
          <NumberInput
            label="Daily goal"
            description="Answers per day (reviews, exercises and drills all count)."
            value={settings.dailyGoal}
            onChange={numberChange((n) => update({ dailyGoal: n }))}
            min={10}
            max={300}
            step={10}
            clampBehavior="strict"
            allowDecimal={false}
          />
        </SimpleGrid>
        <Divider />
        <Segmented<Directions>
          label="Card directions"
          desc="Typing the French (production) builds active vocabulary; recognition is faster."
          value={settings.directions}
          onChange={(d) => update({ directions: d })}
          data={[
            ['both', 'Both'],
            ['recognition', 'FR → EN'],
            ['production', 'EN → FR'],
          ]}
        />
        <Divider />
        <Switch
          checked={settings.strictAccents}
          onChange={(e) => update({ strictAccents: e.currentTarget.checked })}
          label="Strict accents"
          description="When off, a missing or wrong accent counts as correct (but is still shown)."
        />
        <Switch
          checked={settings.sessionListening}
          onChange={(e) => update({ sessionListening: e.currentTarget.checked })}
          label="Dictation in today’s session"
          description="Add two short dictation sentences to the daily session (needs text-to-speech)."
        />
        <Switch
          checked={settings.sessionSpeaking}
          onChange={(e) => update({ sessionSpeaking: e.currentTarget.checked })}
          label="Speaking in today’s session"
          description="Add two read-aloud sentences to the daily session (needs a microphone)."
        />
        <Divider />
        <Input.Wrapper
          label={
            <>
              Target retention{' '}
              <Text span c="dimmed" className="tnum" inherit>
                {Math.round(settings.retention * 100)}%
              </Text>
            </>
          }
          description="Probability of remembering a card when it’s due. Higher = more reviews."
          labelElement="div"
        >
          <Slider
            mt="sm"
            maw={320}
            min={0.8}
            max={0.97}
            step={0.01}
            value={settings.retention}
            onChange={(v) => update({ retention: v })}
            label={(v) => `${Math.round(v * 100)}%`}
            thumbLabel="Target retention"
          />
        </Input.Wrapper>
      </Section>

      <Section id="set-audio" title="Audio">
        {!speechSupported && (
          <Alert variant="light" color="orange" title="Speech isn’t available">
            Your browser doesn’t support text-to-speech.
          </Alert>
        )}
        <Switch
          checked={settings.autoplay}
          onChange={(e) => update({ autoplay: e.currentTarget.checked })}
          label="Play audio automatically"
          description="Hear each new word and answer as soon as it appears."
        />
        <Divider />
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <NativeSelect
            label="French voice"
            description={voices.length ? 'Tip: on macOS, download an “Enhanced” or “Premium” French voice in System Settings → Accessibility → Spoken Content.' : 'No French voice found on this device.'}
            value={settings.voiceURI ?? ''}
            onChange={(e) => update({ voiceURI: e.currentTarget.value || null })}
            disabled={!voices.length}
            data={[{ value: '', label: 'Best available' }, ...voices.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }))]}
            style={{ flex: 1 }}
            maw={420}
          />
          <Tooltip label="Test voice">
            <ActionIcon
              variant="default"
              size="input-sm"
              onClick={() => speak('Bonjour ! On apprend le français petit à petit.', { voiceURI: settings.voiceURI, rate: settings.rate })}
              aria-label="Test voice"
            >
              <Volume2 size={18} aria-hidden />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Input.Wrapper
          label={
            <>
              Speaking speed{' '}
              <Text span c="dimmed" className="tnum" inherit>
                {settings.rate.toFixed(2)}×
              </Text>
            </>
          }
          labelElement="div"
        >
          <Slider
            mt="sm"
            maw={320}
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.rate}
            onChange={(v) => update({ rate: v })}
            label={(v) => `${v.toFixed(2)}×`}
            thumbLabel="Speaking speed"
          />
        </Input.Wrapper>
      </Section>

      <Section id="set-ai" anchor="ai" title="AI (writing, conversation, reading)">
        <Text size="sm" c="dimmed">
          Your key is sent only to the provider you choose.
        </Text>
        <AiSetup />
      </Section>

      <Section id="set-look" title="Appearance">
        <Segmented<Theme>
          label="Theme"
          value={settings.theme}
          onChange={(t) => update({ theme: t })}
          data={[
            ['system', 'System'],
            ['light', 'Light'],
            ['dark', 'Dark'],
          ]}
        />
      </Section>

      <Section id="set-keys" title="Keyboard shortcuts">
        <DataList labelWidth={110} gap="xs">
          <Shortcut keys={<Kbd>↵</Kbd>}>Check answer · continue</Shortcut>
          <Shortcut keys={<Kbd>Space</Kbd>}>Flip a flashcard</Shortcut>
          <Shortcut keys={<><Kbd>1</Kbd> – <Kbd>4</Kbd></>}>Rate a card (Again · Hard · Good · Easy) / choose an option</Shortcut>
          <Shortcut keys={<Kbd>K</Kbd>}>“I already know this word”</Shortcut>
          <Shortcut keys={<Kbd>Esc</Kbd>}>Leave a session</Shortcut>
          <Shortcut keys={<><Kbd>S</Kbd> / <Kbd>P</Kbd></>}>Start studying (Vocabulary) / practice (in a lesson)</Shortcut>
        </DataList>
      </Section>

      <Section id="set-data" title="Your data">
        <ActionRow
          title="Back up progress"
          desc={signedIn ? 'Your progress is stored in this browser and synced to your account. A backup file is a snapshot you can keep (AI keys aren’t included).' : 'Everything is stored in this browser only. Download a backup to move to another device (your AI keys aren’t included).'}
        >
          <Button variant="default" leftSection={<Download size={16} aria-hidden />} onClick={download}>
            Export
          </Button>
        </ActionRow>
        <Divider />
        <ActionRow title="Restore from backup" desc={signedIn ? 'Replaces your progress with the file’s contents — on all your signed-in devices.' : 'Replaces your current progress with the file’s contents.'}>
          <Button variant="default" leftSection={<Upload size={16} aria-hidden />} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
              e.target.value = ''
            }}
          />
        </ActionRow>
        <Divider />
        <ActionRow title="Reset all progress" desc={signedIn ? 'Clears reviews, lessons and stats on all your signed-in devices. Your settings are kept.' : 'Clears reviews, lessons and stats. Your settings are kept.'}>
          <Button variant="subtle" color="red" onClick={() => setConfirmReset(true)}>
            Reset…
          </Button>
        </ActionRow>
      </Section>

      <Text size="sm" c="dimmed" mt={32}>
        Petit à petit, l’oiseau fait son nid. — Little by little, the bird builds its nest. ·{' '}
        <Anchor component={Link} to="/privacy" inherit>
          Privacy
        </Anchor>
      </Text>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all progress?"
        actions={
          <>
            <Button variant="subtle" color="gray" onClick={() => setConfirmReset(false)} data-autofocus>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                toast('Progress reset')
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <Text c="dimmed">This permanently deletes your review history, lesson scores, drill stats and your own words. Consider exporting a backup first.</Text>
      </Dialog>
    </Container>
  )
}

function Shortcut({ keys, children }: { keys: ReactNode; children: ReactNode }) {
  return (
    <DataList.Item>
      <DataList.ItemLabel>{keys}</DataList.ItemLabel>
      <DataList.ItemValue>{children}</DataList.ItemValue>
    </DataList.Item>
  )
}
