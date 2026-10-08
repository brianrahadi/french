import { useEffect, useState } from 'react'
import { noteSound } from './attention'

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function score(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  let s = 0
  if (v.lang.toLowerCase().startsWith('fr-fr') || v.lang.toLowerCase() === 'fr') s += 50
  else if (v.lang.toLowerCase().startsWith('fr')) s += 30
  if (/premium/.test(name)) s += 30
  if (/enhanced|amélioré/.test(name)) s += 25
  if (/natural|neural|online/.test(name)) s += 22
  if (/google/.test(name)) s += 18
  if (/thomas|audrey|aurélie|amélie|marie|denise|henri|eloise|vivienne|rémi|remy/.test(name)) s += 6
  if (v.localService) s += 2
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
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = getFrenchVoices()
  const voice = voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices[0]
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'fr-FR'
  u.rate = opts.rate ?? 0.95
  u.onstart = () => opts.onStart?.()
  u.onend = () => {
    noteSound()
    opts.onEnd?.()
  }
  u.onerror = () => opts.onEnd?.()
  noteSound()
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel()
}

function scoreEn(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  const lang = v.lang.toLowerCase().replace('_', '-')
  let s = 0
  if (lang === 'en-us' || lang === 'en-gb') s += 40
  else if (lang.startsWith('en')) s += 25
  if (/premium/.test(name)) s += 30
  if (/enhanced/.test(name)) s += 25
  if (/natural|neural|online/.test(name)) s += 22
  if (/google/.test(name)) s += 18
  if (/samantha|daniel|karen|serena|ava|zoe|evan|nathan/.test(name)) s += 6
  if (v.localService) s += 2
  return s
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => scoreEn(b) - scoreEn(a))
}

export interface SayOptions {
  lang: 'fr' | 'en'
  /** Preferred French voice (from settings). */
  voiceURI?: string | null
  /** 0 = the main French voice, 1 = a second one (another voice, or a different pitch). */
  speaker?: 0 | 1
  rate?: number
}

/**
 * Speaks and resolves when done (or cancelled). A watchdog resolves anyway if
 * the browser never fires "end", which some do after cancel() or on long lines.
 */
export function say(text: string, o: SayOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!speechSupported || !text.trim()) return resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const rate = o.rate ?? 1
    if (o.lang === 'en') {
      const v = getEnglishVoices()[0]
      if (v) u.voice = v
      u.lang = v?.lang ?? 'en-US'
    } else {
      const voices = getFrenchVoices()
      const main = voices.find((v) => v.voiceURI === o.voiceURI) ?? voices[0]
      const second = voices.find((v) => v !== main && v.lang.toLowerCase().startsWith('fr') && !/compact/i.test(v.name))
      const v = o.speaker === 1 ? (second ?? main) : main
      if (v) u.voice = v
      u.lang = v?.lang ?? 'fr-FR'
      if (o.speaker === 1 && !second) u.pitch = 1.25
    }
    u.rate = rate
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(finish, (text.length / 10 / rate) * 1000 + 5000)
    u.onend = () => {
      noteSound()
      finish()
    }
    u.onerror = finish
    noteSound()
    synth.speak(u)
  })
}
