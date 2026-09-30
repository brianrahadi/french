import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Download, Upload, Volume2 } from 'lucide-react'
import { Dialog } from '../../components/Dialog'
import { Kbd, Switch } from '../../components/ui'
import { toast } from '../../components/Toast'
import { exportData, useStore, type Directions, type Theme } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { speak, speechSupported, useFrenchVoices } from '../../lib/speech'
import { dayKey } from '../../lib/date'
import { AiSetup } from '../../components/AiSetup'
import { SyncAccount } from '../../components/SyncAccount'
import { useSync } from '../../lib/sync/engine'

function Row({ title, desc, children, stack }: { title: string; desc?: React.ReactNode; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className={`setting-row${stack ? ' setting-row--stack' : ''}`}>
      <div className="setting-row__text">
        <div className="setting-row__title">{title}</div>
        {desc && <div className="setting-row__desc">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Stepper({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn icon-btn--outline icon-btn--sm" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Decrease ${label}`} disabled={value <= min}>
        −
      </button>
      <output className="stepper__value tnum" aria-live="polite">
        {value}
      </output>
      <button type="button" className="icon-btn icon-btn--outline icon-btn--sm" onClick={() => onChange(Math.min(max, value + step))} aria-label={`Increase ${label}`} disabled={value >= max}>
        +
      </button>
    </div>
  )
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
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Réglages</div>
          <h1 className="page-title">Settings</h1>
        </div>
      </header>

      <section className="section" aria-labelledby="set-account" id="account">
        <h2 id="set-account" className="section-title">
          Account &amp; sync
        </h2>
        <SyncAccount />
      </section>

      <section className="section" aria-labelledby="set-study">
        <h2 id="set-study" className="section-title">
          Study
        </h2>
        <div className="card card--flush">
          <Row title="New words per day" desc="How many new words to introduce each day. 5–15 is sustainable.">
            <Stepper value={settings.newPerDay} onChange={(n) => update({ newPerDay: n })} min={0} max={50} step={5} label="new words per day" />
          </Row>
          <Row title="Daily goal" desc="Answers per day (reviews, exercises and drills all count).">
            <Stepper value={settings.dailyGoal} onChange={(n) => update({ dailyGoal: n })} min={10} max={300} step={10} label="daily goal" />
          </Row>
          <Row title="Card directions" desc="Typing the French (production) builds active vocabulary; recognition is faster." stack>
            <div className="segmented" role="group" aria-label="Card directions">
              {(
                [
                  ['both', 'Both'],
                  ['recognition', 'FR → EN'],
                  ['production', 'EN → FR'],
                ] as [Directions, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={settings.directions === id} onClick={() => update({ directions: id })}>
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row title="Strict accents" desc="When off, a missing or wrong accent counts as correct (but is still shown).">
            <Switch checked={settings.strictAccents} onChange={(v) => update({ strictAccents: v })} label="Strict accents" />
          </Row>
          <Row title="Dictation in today’s session" desc="Add two short dictation sentences to the daily session (needs text-to-speech).">
            <Switch checked={settings.sessionListening} onChange={(v) => update({ sessionListening: v })} label="Dictation in today’s session" />
          </Row>
          <Row title="Speaking in today’s session" desc="Add two read-aloud sentences to the daily session (needs a microphone).">
            <Switch checked={settings.sessionSpeaking} onChange={(v) => update({ sessionSpeaking: v })} label="Speaking in today’s session" />
          </Row>
          <Row
            title="Target retention"
            desc={
              <>
                Probability of remembering a card when it’s due. Higher = more reviews. <strong className="tnum">{Math.round(settings.retention * 100)}%</strong>
              </>
            }
            stack
          >
            <input
              type="range"
              min={0.8}
              max={0.97}
              step={0.01}
              value={settings.retention}
              onChange={(e) => update({ retention: Number(e.target.value) })}
              aria-label="Target retention"
              style={{ width: 200 }}
            />
          </Row>
        </div>
      </section>

      <section className="section" aria-labelledby="set-audio">
        <h2 id="set-audio" className="section-title">
          Audio
        </h2>
        <div className="card card--flush">
          {!speechSupported && (
            <Row title="Speech isn’t available" desc="Your browser doesn’t support text-to-speech.">
              <span />
            </Row>
          )}
          <Row title="Play audio automatically" desc="Hear each new word and answer as soon as it appears.">
            <Switch checked={settings.autoplay} onChange={(v) => update({ autoplay: v })} label="Play audio automatically" />
          </Row>
          <Row
            title="French voice"
            desc={voices.length ? 'Tip: on macOS, download an “Enhanced” or “Premium” French voice in System Settings → Accessibility → Spoken Content.' : 'No French voice found on this device.'}
            stack
          >
            <div className="row">
              <select
                className="select"
                style={{ width: 230 }}
                value={settings.voiceURI ?? ''}
                onChange={(e) => update({ voiceURI: e.target.value || null })}
                aria-label="French voice"
                disabled={!voices.length}
              >
                <option value="">Best available</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn icon-btn--outline"
                onClick={() => speak('Bonjour ! On apprend le français petit à petit.', { voiceURI: settings.voiceURI, rate: settings.rate })}
                aria-label="Test voice"
                title="Test voice"
              >
                <Volume2 size={18} aria-hidden />
              </button>
            </div>
          </Row>
          <Row title="Speaking speed" desc={<span className="tnum">{settings.rate.toFixed(2)}×</span>} stack>
            <input
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={settings.rate}
              onChange={(e) => update({ rate: Number(e.target.value) })}
              aria-label="Speaking speed"
              style={{ width: 200 }}
            />
          </Row>
        </div>
      </section>

      <section className="section" aria-labelledby="set-ai" id="ai">
        <h2 id="set-ai" className="section-title">
          AI (writing, conversation, reading)
        </h2>
        <div className="card">
          <p className="muted small" style={{ marginBottom: 14 }}>
            Writing corrections, conversation practice and reading help use an AI model of your choice. Requests go straight
            from this browser to the provider with your own key — nothing passes through a server of ours.
          </p>
          <AiSetup />
        </div>
      </section>

      <section className="section" aria-labelledby="set-look">
        <h2 id="set-look" className="section-title">
          Appearance
        </h2>
        <div className="card card--flush">
          <Row title="Theme">
            <div className="segmented" role="group" aria-label="Theme">
              {(
                [
                  ['system', 'System'],
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ] as [Theme, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={settings.theme === id} onClick={() => update({ theme: id })}>
                  {label}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </section>

      <section className="section" aria-labelledby="set-keys">
        <h2 id="set-keys" className="section-title">
          Keyboard shortcuts
        </h2>
        <div className="card">
          <dl className="shortcuts">
            <dt><Kbd>↵</Kbd></dt>
            <dd>Check answer · continue</dd>
            <dt><Kbd>Space</Kbd></dt>
            <dd>Flip a flashcard</dd>
            <dt><Kbd>1</Kbd> – <Kbd>4</Kbd></dt>
            <dd>Rate a card (Again · Hard · Good · Easy) / choose an option</dd>
            <dt><Kbd>K</Kbd></dt>
            <dd>“I already know this word”</dd>
            <dt><Kbd>Esc</Kbd></dt>
            <dd>Leave a session</dd>
            <dt><Kbd>S</Kbd> / <Kbd>P</Kbd></dt>
            <dd>Start studying (Vocabulary) / practice (in a lesson)</dd>
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="set-data">
        <h2 id="set-data" className="section-title">
          Your data
        </h2>
        <div className="card card--flush">
          <Row title="Back up progress" desc={signedIn ? 'Your progress is stored in this browser and synced to your account. A backup file is a snapshot you can keep (AI keys aren’t included).' : 'Everything is stored in this browser only. Download a backup to move to another device (your AI keys aren’t included).'}>
            <button type="button" className="btn btn--secondary" onClick={download}>
              <Download size={16} aria-hidden /> Export
            </button>
          </Row>
          <Row title="Restore from backup" desc={signedIn ? 'Replaces your progress with the file’s contents — on all your signed-in devices.' : 'Replaces your current progress with the file’s contents.'}>
            <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden /> Import
            </button>
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
          </Row>
          <Row title="Reset all progress" desc={signedIn ? 'Clears reviews, lessons and stats on all your signed-in devices. Your settings are kept.' : 'Clears reviews, lessons and stats. Your settings are kept.'}>
            <button type="button" className="btn btn--ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmReset(true)}>
              Reset…
            </button>
          </Row>
        </div>
      </section>

      <p className="subtle small" style={{ marginTop: 32 }}>
        Petit à petit, l’oiseau fait son nid. — Little by little, the bird builds its nest. · <Link to="/privacy">Privacy</Link>
      </p>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all progress?"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirmReset(false)} autoFocus>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                toast('Progress reset')
              }}
            >
              Reset everything
            </button>
          </>
        }
      >
        <p className="muted">This permanently deletes your review history, lesson scores, drill stats and your own words. Consider exporting a backup first.</p>
      </Dialog>
    </div>
  )
}
