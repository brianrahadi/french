/**
 * Records the audio lessons with studio-quality neural voices.
 *
 *   npm run audio                  record every line that isn't recorded yet
 *   npm run audio -- --dry-run     just count what's missing
 *   npm run audio -- --only 02     only lessons whose id contains "02"
 *   npm run audio -- --prune       also delete recordings nothing uses any more
 *   npm run audio -- --provider openai --concurrency 4
 *
 * Each line of each lesson script (see src/features/audio/script.ts) becomes one
 * mp3 in public/audio/clips/, named by a hash of its voice and text, so a line
 * shared by many lessons ("Repeat.") is recorded once, and editing a lesson
 * only re-records the lines that changed. public/audio/lessons/<id>.json maps
 * each lesson's lines to their files; the player falls back to the browser's
 * voice for anything missing. It's safe to stop and run again: it carries on.
 *
 * Keys go in .env.local (never committed; not exposed to the app):
 *
 *   Azure AI Speech (default; the free tier covers the whole course)
 *     AZURE_SPEECH_KEY=...         AZURE_SPEECH_REGION=eastus
 *     optional voices: AZURE_VOICE_EN, AZURE_VOICE_FR_F, AZURE_VOICE_FR_M
 *
 *   OpenAI
 *     OPENAI_API_KEY=...           optional: OPENAI_TTS_MODEL, OPENAI_VOICE_EN, OPENAI_VOICE_FR_F, OPENAI_VOICE_FR_M
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseContent } from '../src/content/parse.ts'
import { buildScript, clipKey, type Step } from '../src/features/audio/script.ts'
import type { AudioLessonDef } from '../src/data/types.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'audio')
const CLIPS = path.join(OUT, 'clips')
const LESSONS = path.join(OUT, 'lessons')

// ───────────── options ─────────────

const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(`--${name}`)
const option = (name: string) => {
  const k = argv.indexOf(`--${name}`)
  return k >= 0 ? argv[k + 1] : undefined
}
const dryRun = flag('dry-run')
const prune = flag('prune')
const only = option('only')
const providerName = option('provider') ?? process.env.AUDIO_PROVIDER ?? 'azure'
const concurrency = Number(option('concurrency') ?? (providerName === 'azure' ? 3 : 4))

// ───────────── what to record ─────────────

type Spoken = Extract<Step, { kind: 'en' | 'fr' }>
type Line = { lang: 'en' | 'fr'; voice: 0 | 1; slow: boolean; text: string }

function lineOf(st: Spoken): Line {
  return st.kind === 'en' ? { lang: 'en', voice: 0, slow: false, text: st.text } : { lang: 'fr', voice: st.voice ?? 0, slow: !!st.slow, text: st.text }
}

function loadLessons(): AudioLessonDef[] {
  const files = fs
    .globSync('content/audio/**/*.md', { cwd: ROOT })
    .filter((f) => !path.basename(f).startsWith('_'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  return files.map((f) => parseContent(fs.readFileSync(path.join(ROOT, f), 'utf8'), `/${f.split(path.sep).join('/')}`) as AudioLessonDef)
}

// ───────────── providers ─────────────

interface Provider {
  name: string
  /** Changes whenever a different voice would come out, so the file name changes too. */
  voiceId(line: Line): string
  synthesize(line: Line): Promise<Buffer>
  /** Already mono speech-sized mp3, or worth re-encoding with ffmpeg if it's around. */
  compact: boolean
}

function need(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`\nMissing ${name}. Add it to .env.local (see the top of scripts/audio.ts).\n`)
    process.exit(1)
  }
  return v
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function azure(): Provider {
  const voices = {
    en: process.env.AZURE_VOICE_EN ?? 'en-US-AvaNeural',
    f: process.env.AZURE_VOICE_FR_F ?? 'fr-FR-DeniseNeural',
    m: process.env.AZURE_VOICE_FR_M ?? 'fr-FR-HenriNeural',
  }
  const voiceOf = (l: Line) => (l.lang === 'en' ? voices.en : l.voice === 0 ? voices.f : voices.m)
  return {
    name: 'azure',
    compact: true,
    voiceId: (l) => `azure|${voiceOf(l)}|${l.slow ? 'slow' : 'normal'}`,
    async synthesize(l) {
      const key = need('AZURE_SPEECH_KEY')
      const region = need('AZURE_SPEECH_REGION')
      const lang = l.lang === 'en' ? 'en-US' : 'fr-FR'
      // Slow lines are the teacher modelling a phrase: slower, but still natural.
      const body = l.slow ? `<prosody rate="-22%">${xml(l.text)}</prosody>` : xml(l.text)
      // Multilingual voices guess the language from the text, which can go wrong for
      // short lines ("Repeat.", "voilà"), so they're told. (Other voices refuse <lang>.)
      const inner = /multilingual/i.test(voiceOf(l)) ? `<lang xml:lang="${lang}">${body}</lang>` : body
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voiceOf(l)}">${inner}</voice></speak>`
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'petit-a-petit',
        },
        body: ssml,
      })
      return check(res)
    },
  }
}

function openai(): Provider {
  const model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts'
  const voices = {
    en: process.env.OPENAI_VOICE_EN ?? 'sage',
    f: process.env.OPENAI_VOICE_FR_F ?? 'coral',
    m: process.env.OPENAI_VOICE_FR_M ?? 'ash',
  }
  const voiceOf = (l: Line) => (l.lang === 'en' ? voices.en : l.voice === 0 ? voices.f : voices.m)
  const instructions = (l: Line) =>
    l.lang === 'en'
      ? 'A calm, friendly language teacher narrating an audio lesson. Clear, warm, unhurried.'
      : `A native speaker from Paris with a standard French accent. Natural and warm. Speak only French, with French pronunciation.${l.slow ? ' Speak slowly and clearly, as a teacher modelling the phrase for a learner, without exaggerating.' : ''}`
  return {
    name: 'openai',
    compact: false,
    voiceId: (l) => `openai|${model}|${voiceOf(l)}|${l.slow ? 'slow' : 'normal'}`,
    async synthesize(l) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${need('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          voice: voiceOf(l),
          input: l.text,
          response_format: 'mp3',
          ...(model.startsWith('tts-1') ? { speed: l.slow ? 0.8 : 1 } : { instructions: instructions(l) }),
        }),
      })
      return check(res)
    },
  }
}

class HttpError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

async function check(res: Response): Promise<Buffer> {
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300)
    const ra = Number(res.headers.get('retry-after'))
    throw new HttpError(res.status, `HTTP ${res.status} ${res.statusText} ${text}`.trim(), Number.isFinite(ra) && ra > 0 ? ra : undefined)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 200) throw new Error(`suspiciously short audio (${buf.length} bytes)`)
  return buf
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 0
      const fatal = status === 400 || status === 401 || status === 403 || status === 404
      if (fatal || attempt >= 8) throw e
      const wait = e instanceof HttpError && e.retryAfter ? e.retryAfter * 1000 : Math.min(60_000, 1000 * 2 ** attempt)
      await sleep(wait + Math.random() * 500)
    }
  }
}

// ffmpeg, if installed, makes other providers' mp3s mono 48 kbps like Azure's: about a third of the size.
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
function compact(buf: Buffer): Buffer {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { input: buf, maxBuffer: 64 << 20 })
  return r.status === 0 && r.stdout.length > 200 ? r.stdout : buf
}

// ───────────── main ─────────────

async function main() {
  const provider = providerName === 'openai' ? openai() : providerName === 'azure' ? azure() : null
  if (!provider) {
    console.error(`Unknown provider "${providerName}". Use azure or openai.`)
    process.exit(1)
  }

  const lessons = loadLessons()
  const fileOf = (l: Line) => createHash('sha256').update(`${provider.voiceId(l)}\n${l.text}`).digest('hex').slice(0, 20)

  // Every lesson's lines → files.
  const perLesson = new Map<string, Map<string, string>>()
  const lines = new Map<string, Line>() // file → line
  lessons.forEach((lesson, i) => {
    if (only && !lesson.id.includes(only)) return
    const { steps } = buildScript(lesson, i + 1, lessons.slice(0, i))
    const map = new Map<string, string>()
    for (const st of steps) {
      if (st.kind !== 'en' && st.kind !== 'fr') continue
      const line = lineOf(st)
      const file = fileOf(line)
      map.set(clipKey(st), file)
      lines.set(file, line)
    }
    perLesson.set(lesson.id, map)
  })

  const exists = (file: string) => fs.existsSync(path.join(CLIPS, `${file}.mp3`))
  const todo = [...lines].filter(([file]) => !exists(file))
  const chars = todo.reduce((n, [, l]) => n + l.text.length, 0)

  console.log(`${perLesson.size} lessons · ${lines.size} lines · ${todo.length} to record (${chars.toLocaleString('en')} characters) · ${provider.name}`)
  if (dryRun) return
  fs.mkdirSync(CLIPS, { recursive: true })
  fs.mkdirSync(LESSONS, { recursive: true })

  let done = 0
  let failed = 0
  const started = Date.now()
  const queue = [...todo]
  const progress = () => {
    const secs = (Date.now() - started) / 1000
    const eta = done ? Math.round(((todo.length - done - failed) * secs) / done / 60) : '?'
    process.stdout.write(`\r  recorded ${done}/${todo.length}${failed ? `, ${failed} failed` : ''} · about ${eta} min left   `)
  }
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [file, line] = next
      try {
        let buf = await withRetries(() => provider.synthesize(line))
        if (!provider.compact && hasFfmpeg) buf = compact(buf)
        const dest = path.join(CLIPS, `${file}.mp3`)
        fs.writeFileSync(`${dest}.tmp`, buf)
        fs.renameSync(`${dest}.tmp`, dest)
        done++
      } catch (e) {
        failed++
        const status = e instanceof HttpError ? e.status : 0
        console.error(`\n  ✗ ${line.lang} “${line.text.slice(0, 60)}”: ${(e as Error).message}`)
        if (status === 401 || status === 403) {
          console.error('\nThe key was refused. Check it (and the region, for Azure) in .env.local.')
          queue.length = 0
        }
      }
      progress()
    }
  }
  if (todo.length) {
    progress()
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))
    process.stdout.write('\n')
  }

  // Lesson maps list only lines that are recorded, so a partial run still helps.
  let complete = 0
  for (const [id, map] of perLesson) {
    const clips: Record<string, string> = {}
    for (const [key, file] of map) if (exists(file)) clips[key] = file
    const all = Object.keys(clips).length === map.size
    if (all) complete++
    fs.writeFileSync(path.join(LESSONS, `${id}.json`), JSON.stringify({ provider: provider.name, clips }) + '\n')
  }
  console.log(`${complete}/${perLesson.size} lessons fully recorded.${failed ? ` ${failed} lines failed; run again to retry them.` : ''}`)

  if (prune && !only) {
    const used = new Set(lines.keys())
    let removed = 0
    for (const f of fs.readdirSync(CLIPS)) {
      if (f.endsWith('.mp3') && !used.has(f.slice(0, -4))) {
        fs.unlinkSync(path.join(CLIPS, f))
        removed++
      }
    }
    for (const f of fs.readdirSync(LESSONS)) if (f.endsWith('.json') && !perLesson.has(f.slice(0, -5))) fs.unlinkSync(path.join(LESSONS, f))
    console.log(`Pruned ${removed} recordings no lesson uses.`)
  }
  if (failed) process.exitCode = 1
}

await main()
