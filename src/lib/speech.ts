import { useEffect, useState } from 'react'

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// ───────────── choosing voices ─────────────

/**
 * Joke and robotic voices that ship with macOS/iOS (also under French names):
 * never pick them unless the learner chooses one.
 */
const NOVELTY =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|eddy|flo|grandma|grandpa|grand-mère|grand-père|reed|rocko|sandy|shelley)\b/i

/** How natural a voice sounds, roughly: neural and downloaded "premium" voices first. */
export function voiceQuality(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  if (NOVELTY.test(name)) return -100
  let s = 0
  if (/premium/.test(name)) s += 45
  else if (/enhanced|amélioré|améliorée/.test(name)) s += 32
  if (/natural|neural/.test(name)) s += 45 // Edge: "Microsoft Denise Online (Natural)"
  else if (/online/.test(name)) s += 25
  if (/google/.test(name)) s += 25
  if (/compact/.test(name)) s -= 20
  return s
}

/** A voice is "good" when it doesn't sound like a robot. */
export const GOOD_VOICE = 30

const FEMALE = new Set(
  'amélie amelie audrey aurélie aurelie brigitte céline celine chantal coralie denise eloise élise elise hortense jacqueline joséphine josephine julie marie sylvie vivienne yvette ariane charline océane oceane google'.split(' '),
)
const MALE = new Set('thomas henri rémy remy paul claude nicolas jacques daniel alain antoine fabrice gérard gerard guillaume jérôme jerome maurice yves lucien'.split(' '))

/** The gender a voice's name suggests, when it's one we know. */
export function voiceGender(v: SpeechSynthesisVoice): 'f' | 'm' | undefined {
  const words = v.name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[\s-]+/)
  for (const w of words) {
    if (FEMALE.has(w)) return 'f'
    if (MALE.has(w)) return 'm'
  }
  return undefined
}

function score(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace('_', '-')
  let s = voiceQuality(v)
  if (lang === 'fr-fr' || lang === 'fr') s += 20
  else if (lang.startsWith('fr')) s += 5 // Canadian, Belgian, Swiss French: fine, but the course is French from France
  if (/thomas|audrey|aurélie|amélie|marie|denise|henri|eloise|vivienne|rémy|remy/.test(v.name.toLowerCase())) s += 4
  if (v.default) s += 2
  if (v.localService) s += 1
  return s
}

export function getFrenchVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fr'))
    .sort((a, b) => score(b) - score(a))
}

export function useFrenchVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getFrenchVoices())
  useEffect(() => {
    if (!speechSupported) return
    const update = () => setVoices(getFrenchVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

function scoreEn(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  const lang = v.lang.toLowerCase().replace('_', '-')
  let s = voiceQuality(v)
  if (lang === 'en-us' || lang === 'en-gb') s += 20
  else if (lang.startsWith('en')) s += 10
  if (/samantha|daniel|karen|serena|ava|zoe|evan|nathan|aria|jenny|guy|libby|sonia|ryan|emma|andrew|brian/.test(name)) s += 6
  if (v.default) s += 3
  if (v.localService) s += 1
  return s
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => scoreEn(b) - scoreEn(a))
}

export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getEnglishVoices())
  useEffect(() => {
    if (!speechSupported) return
    const update = () => setVoices(getEnglishVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

/** The French voice to use: the one chosen in Settings, or the best on this device. */
export function mainFrenchVoice(voiceURI?: string | null): SpeechSynthesisVoice | undefined {
  const voices = getFrenchVoices()
  return voices.find((v) => v.voiceURI === voiceURI) ?? voices[0]
}

/**
 * A French voice for a speaker of this gender: the main voice if it fits,
 * otherwise the best fitting voice (a real second voice is much easier to follow
 * than one voice at two pitches, as long as it isn't a robotic "compact" one).
 * `pitch` is a slight shift to tell two speakers apart when there's only one voice.
 */
export function frenchVoiceFor(gender: 'f' | 'm', voiceURI?: string | null): { voice?: SpeechSynthesisVoice; pitch: number } {
  const main = mainFrenchVoice(voiceURI)
  if (!main) return { pitch: 1 }
  const mg = voiceGender(main)
  if (mg === gender) return { voice: main, pitch: 1 }
  const other = getFrenchVoices().find((v) => v !== main && voiceGender(v) === gender && voiceQuality(v) >= 0)
  if (other) return { voice: other, pitch: 1 }
  // Same voice for both speakers: a small shift only, so neither sounds artificial.
  return { voice: main, pitch: mg === undefined ? (gender === 'm' ? 0.92 : 1) : gender === 'm' ? 0.9 : 1.1 }
}

// ───────────── speaking ─────────────

/*
 * Browser speech has a few well-known bugs this works around:
 * - Chrome forgets an utterance that nothing references, and its "end" event
 *   never fires (the lesson then hangs until a watchdog). Utterances are kept alive.
 * - Speaking right after cancel() is sometimes silently dropped. After a cancel
 *   it waits a moment, and an utterance that never starts is tried once more.
 * - Chrome's online voices stop after about 15 seconds. Long text is spoken a
 *   sentence at a time.
 */
const alive = new Set<SpeechSynthesisUtterance>()
let generation = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Splits long text at sentence (then clause) boundaries into pieces of ≤ max characters. */
export function splitForSpeech(text: string, max = 180): string[] {
  const t = text.trim()
  if (t.length <= max) return t ? [t] : []
  const sentences = t.match(/[^.!?…;]+[.!?…;]+[»”"’)]*\s*|[^.!?…;]+$/g) ?? [t]
  const out: string[] = []
  let cur = ''
  const push = (s: string) => {
    if (!s.trim()) return
    if ((cur + s).length > max && cur) {
      out.push(cur.trim())
      cur = ''
    }
    if (s.length > max) {
      // A very long sentence: break at commas.
      for (const part of s.split(/(?<=,)\s+/)) {
        if ((cur + part).length > max && cur) {
          out.push(cur.trim())
          cur = ''
        }
        cur += part + ' '
      }
    } else cur += s
  }
  for (const s of sentences) push(s)
  if (cur.trim()) out.push(cur.trim())
  return out
}

interface UtterOptions {
  voice?: SpeechSynthesisVoice
  lang: string
  rate: number
  pitch?: number
  onStart?: () => void
}

/** Speaks one piece; resolves when it ends, errors, or is clearly stuck. */
function utter(text: string, o: UtterOptions, gen: number): Promise<void> {
  const synth = window.speechSynthesis
  const attempt = (retry: boolean): Promise<'ok' | 'nostart'> =>
    new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text)
      if (o.voice) u.voice = o.voice
      u.lang = o.voice?.lang ?? o.lang
      u.rate = o.rate
      u.pitch = o.pitch ?? 1
      alive.add(u)
      let started = false
      let done = false
      const finish = (r: 'ok' | 'nostart') => {
        if (done) return
        done = true
        clearTimeout(startTimer)
        clearTimeout(endTimer)
        alive.delete(u)
        resolve(r)
      }
      // Generous: a long piece at a slow rate, plus time for an online voice to answer.
      const expected = (text.length / 13 / o.rate) * 1000
      let endTimer: ReturnType<typeof setTimeout> | undefined
      const startTimer = setTimeout(() => {
        if (started || gen !== generation) return
        // Some browsers (Safari) never fire "start" but do speak: only retry if it isn't speaking.
        if (synth.speaking) {
          endTimer = setTimeout(() => finish('ok'), expected * 1.6 + 4000)
          return
        }
        synth.cancel()
        finish('nostart')
      }, 2500)
      u.onstart = () => {
        started = true
        clearTimeout(startTimer)
        endTimer = setTimeout(() => finish('ok'), expected * 1.6 + 4000)
        if (!retry) o.onStart?.()
      }
      u.onend = () => finish('ok')
      u.onerror = () => finish('ok')
      synth.speak(u)
    })
  return attempt(false).then(async (r) => {
    if (r === 'nostart' && gen === generation) {
      await sleep(120)
      if (gen === generation) await attempt(true)
    }
  })
}

/**
 * Speaks text a piece at a time. Stops whatever was being said first, waiting a
 * moment if something was (see above); otherwise it starts right away, inside the
 * tap that asked for it, which iOS requires.
 */
function speakAll(text: string, o: UtterOptions): Promise<void> {
  const gen = ++generation
  const synth = window.speechSynthesis
  const busy = synth.speaking || synth.pending
  if (busy) synth.cancel()
  const pieces = splitForSpeech(text)
  const run = async () => {
    for (let k = 0; k < pieces.length; k++) {
      if (gen !== generation) return
      await utter(pieces[k], { ...o, onStart: k === 0 ? o.onStart : undefined }, gen)
    }
  }
  return busy ? sleep(80).then(run) : run()
}

export interface SpeakOptions {
  voiceURI?: string | null
  rate?: number
  onStart?: () => void
  onEnd?: () => void
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!speechSupported || !text.trim()) {
    opts.onEnd?.()
    return
  }
  const voice = mainFrenchVoice(opts.voiceURI)
  void speakAll(text, { voice, lang: 'fr-FR', rate: opts.rate ?? 0.95, onStart: opts.onStart }).then(() => opts.onEnd?.())
}

export function stopSpeaking(): void {
  if (!speechSupported) return
  generation++
  window.speechSynthesis.cancel()
}

export interface SayOptions {
  lang: 'fr' | 'en'
  /** Preferred French voice (from settings). */
  voiceURI?: string | null
  /** Preferred English voice (from settings), for the audio lessons' narrator. */
  voiceURIEn?: string | null
  /** A dialogue speaker: a woman's or a man's voice. Default: the main French voice. */
  gender?: 'f' | 'm'
  rate?: number
}

/** Speaks and resolves when done (or cancelled). */
export function say(text: string, o: SayOptions): Promise<void> {
  if (!speechSupported || !text.trim()) return Promise.resolve()
  const rate = o.rate ?? 1
  if (o.lang === 'en') {
    const voices = getEnglishVoices()
    const voice = voices.find((v) => v.voiceURI === o.voiceURIEn) ?? voices[0]
    return speakAll(text, { voice, lang: 'en-US', rate })
  }
  const { voice, pitch } = o.gender ? frenchVoiceFor(o.gender, o.voiceURI) : { voice: mainFrenchVoice(o.voiceURI), pitch: 1 }
  return speakAll(text, { voice, lang: 'fr-FR', rate, pitch })
}

/** Where to get a better voice, on this device. */
export function voiceTip(language: 'French' | 'English'): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return `For a much more natural voice, download an “Enhanced” or “Premium” ${language} voice: Settings → Accessibility → Spoken Content → Voices.`
  if (/Macintosh/.test(ua)) return `For a much more natural voice, download an “Enhanced” or “Premium” ${language} voice: System Settings → Accessibility → Spoken Content → System voice → Manage Voices. Then reload this page.`
  if (/Android/.test(ua)) return `For a more natural voice, install Speech Services by Google and download its high-quality ${language} voice.`
  if (/Windows/.test(ua)) return `For the most natural voices, open this site in Microsoft Edge: its “Online (Natural)” voices sound almost human.`
  return `Voices differ between browsers: Microsoft Edge and Safari have the most natural ${language} voices.`
}
