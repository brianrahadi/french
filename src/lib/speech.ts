import { useEffect, useState } from 'react'

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
  u.onend = () => opts.onEnd?.()
  u.onerror = () => opts.onEnd?.()
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel()
}
