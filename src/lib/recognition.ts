/**
 * Microphone capture for speaking practice: browser speech recognition when
 * available (Chrome, Edge, Safari), otherwise a recording that an AI provider
 * transcribes (OpenAI, Gemini), otherwise just a recording to compare by ear.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { canTranscribe, getAiConfig, transcribe } from './ai'

/* eslint-disable @typescript-eslint/no-explicit-any */
type RecognitionCtor = new () => any
const Ctor: RecognitionCtor | undefined =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined
/* eslint-enable @typescript-eslint/no-explicit-any */

export const recognitionSupported = !!Ctor
export const micSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
export const recorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window

export type CaptureMode = 'browser' | 'ai' | 'record'

export function captureMode(): CaptureMode {
  if (recognitionSupported) return 'browser'
  if (canTranscribe(getAiConfig()) && recorderSupported) return 'ai'
  return 'record'
}

export type CaptureState = 'idle' | 'starting' | 'listening' | 'processing' | 'done' | 'error'

export interface CaptureResult {
  /** Candidate transcripts, best first (empty in record-only mode). */
  alternatives: string[]
  audioUrl: string | null
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site in your browser’s settings, then try again.',
  'service-not-allowed': 'Speech recognition is turned off in this browser. Try Chrome, Edge or Safari.',
  'no-speech': 'I didn’t hear anything. Check your microphone and try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition couldn’t reach its service. It needs an internet connection — and some browsers (like Brave) don’t provide it.',
  'language-not-supported': 'French speech recognition isn’t available in this browser.',
}

function pickMime(): string | undefined {
  if (!recorderSupported) return undefined
  for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'])
    if (MediaRecorder.isTypeSupported?.(m)) return m
  return undefined
}

/**
 * One capture at a time: start() → listening → (auto or manual) stop() → done with a result.
 * `meterRef` gets a `--level` CSS variable (0–1) while listening.
 */
export function useSpeechCapture({ recordVoice = true, maxSeconds = 20 }: { recordVoice?: boolean; maxSeconds?: number } = {}) {
  const [mode] = useState<CaptureMode>(captureMode)
  const [state, setState] = useState<CaptureState>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<CaptureResult | null>(null)
  const meterRef = useRef<HTMLElement | null>(null)

  const rec = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const audio = useRef<AudioContext | null>(null)
  const raf = useRef(0)
  const timers = useRef<number[]>([])
  const segments = useRef<string[][]>([])
  const urls = useRef<string[]>([])
  const finished = useRef(false)

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  const stopMeter = () => {
    cancelAnimationFrame(raf.current)
    meterRef.current?.style.setProperty('--level', '0')
    audio.current?.close().catch(() => {})
    audio.current = null
  }

  const releaseMic = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  const startMeter = (s: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const src = ctx.createMediaStreamSource(s)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      audio.current = ctx
      const data = new Uint8Array(an.fftSize)
      let smooth = 0
      const tick = () => {
        an.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += ((v - 128) / 128) ** 2
        const rms = Math.sqrt(sum / data.length)
        smooth = smooth * 0.7 + Math.min(1, rms * 4) * 0.3
        meterRef.current?.style.setProperty('--level', smooth.toFixed(3))
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      /* the meter is decoration */
    }
  }

  /** Stops the recorder and resolves with the recording (or null). */
  const stopRecorder = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const r = recorder.current
      recorder.current = null
      if (!r || r.state === 'inactive') return resolve(chunks.current.length ? new Blob(chunks.current, { type: chunks.current[0].type }) : null)
      r.onstop = () => resolve(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || chunks.current[0].type }) : null)
      r.stop()
    })

  const alternatives = (): string[] => {
    const segs = segments.current.filter((s) => s.length)
    if (!segs.length) return []
    const out = new Set<string>()
    for (let k = 0; k < 5; k++) out.add(segs.map((alts) => alts[k] ?? alts[0]).join(' ').replace(/\s+/g, ' ').trim())
    return [...out].filter(Boolean)
  }

  const finish = useCallback(async (errorCode?: string) => {
    if (finished.current) return
    finished.current = true
    clearTimers()
    stopMeter()
    const blob = await stopRecorder()
    releaseMic()
    let audioUrl: string | null = null
    if (blob && blob.size > 0) {
      audioUrl = URL.createObjectURL(blob)
      urls.current.push(audioUrl)
    }
    if (errorCode && errorCode !== 'aborted' && !(errorCode === 'no-speech' && audioUrl && mode !== 'browser')) {
      setError(ERRORS[errorCode] ?? `Speech recognition stopped (${errorCode}).`)
      setState('error')
      return
    }
    if (mode === 'browser') {
      const alts = alternatives()
      if (!alts.length) {
        setError(ERRORS['no-speech'])
        setState('error')
        return
      }
      setResult({ alternatives: alts, audioUrl })
      setState('done')
      return
    }
    if (mode === 'ai' && blob) {
      setState('processing')
      try {
        const text = await transcribe(blob)
        if (!text.trim()) throw new Error(ERRORS['no-speech'])
        setResult({ alternatives: [text], audioUrl })
        setState('done')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Transcription failed.')
        setState('error')
      }
      return
    }
    setResult({ alternatives: [], audioUrl })
    setState(audioUrl ? 'done' : 'error')
    if (!audioUrl) setError('Nothing was recorded.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const start = useCallback(async () => {
    finished.current = false
    segments.current = []
    chunks.current = []
    setInterim('')
    setError('')
    setResult(null)
    setState('starting')
    const needStream = recordVoice || mode !== 'browser'
    if (needStream) {
      if (!micSupported) {
        setError('This browser can’t use the microphone here. The page must be served over https.')
        setState('error')
        return
      }
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      } catch (e) {
        const name = (e as Error).name
        setError(name === 'NotAllowedError' ? ERRORS['not-allowed'] : name === 'NotFoundError' ? ERRORS['audio-capture'] : 'Couldn’t start the microphone.')
        setState('error')
        return
      }
      startMeter(stream.current)
      const mime = pickMime()
      if (recorderSupported) {
        try {
          const r = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
          r.ondataavailable = (ev) => ev.data.size && chunks.current.push(ev.data)
          r.start()
          recorder.current = r
        } catch {
          recorder.current = null
        }
      }
    }
    if (mode === 'browser' && Ctor) {
      const r = new Ctor()
      r.lang = 'fr-FR'
      r.interimResults = true
      r.continuous = true
      r.maxAlternatives = 5
      let silence = 0
      const armSilence = (ms: number) => {
        clearTimeout(silence)
        silence = window.setTimeout(() => r.stop(), ms)
        timers.current.push(silence)
      }
      r.onstart = () => {
        setState('listening')
        armSilence(8000) // give up if nothing is said at all
      }
      r.onresult = (ev: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
        let live = ''
        for (let i = 0; i < ev.results.length; i++) {
          const res = ev.results[i]
          const alts = Array.from({ length: res.length }, (_, k) => res[k].transcript.trim())
          if (res.isFinal) segments.current[i] = alts
          else live += ` ${alts[0]}`
        }
        const done = segments.current.filter(Boolean).map((a) => a[0])
        setInterim(`${done.join(' ')}${live}`.replace(/\s+/g, ' ').trim())
        armSilence(1600) // stop after a short pause once speech has started
      }
      r.onerror = (ev: { error: string }) => finish(ev.error)
      r.onend = () => finish()
      rec.current = r
      try {
        r.start()
      } catch {
        finish('aborted')
        setError('Couldn’t start speech recognition. Try again.')
        setState('error')
        return
      }
    } else {
      setState('listening')
    }
    timers.current.push(window.setTimeout(() => stop(), maxSeconds * 1000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recordVoice, maxSeconds, finish])

  const stop = useCallback(() => {
    if (finished.current) return
    if (mode === 'browser' && rec.current) {
      try {
        rec.current.stop()
      } catch {
        finish()
      }
    } else finish()
  }, [mode, finish])

  const reset = useCallback(() => {
    try {
      rec.current?.abort()
    } catch {
      /* ignore */
    }
    finished.current = true
    clearTimers()
    stopMeter()
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
    recorder.current = null
    releaseMic()
    setState('idle')
    setInterim('')
    setError('')
    setResult(null)
  }, [])

  useEffect(
    () => () => {
      try {
        rec.current?.abort()
      } catch {
        /* ignore */
      }
      finished.current = true
      clearTimers()
      stopMeter()
      releaseMic()
      urls.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  return { mode, state, interim, error, result, start, stop, reset, meterRef }
}

/** Plays a recorded clip. */
export function playUrl(url: string | null, onEnd?: () => void) {
  if (!url) return
  const a = new Audio(url)
  a.onended = () => onEnd?.()
  a.play().catch(() => onEnd?.())
}
