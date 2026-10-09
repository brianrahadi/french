/**
 * Studio recordings for the audio lessons. `npm run audio` records every line
 * once with a neural voice (scripts/audio.ts) into public/audio/:
 *
 *   audio/lessons/<lesson id>.json   { clips: { [clipKey]: file } }
 *   audio/clips/<file>.mp3           one line, named by a hash of voice + text
 *
 * The player plays them through one <audio> element, so lessons keep going with
 * the screen locked and show up on the lock screen and headset controls. Lines
 * with no recording (a lesson edited since the last `npm run audio`) fall back
 * to the browser's speech.
 */
import { useEffect, useState } from 'react'

const BASE = `${import.meta.env.BASE_URL}audio/`
const SILENCE = `${BASE}silence.mp3`

export type ClipMap = Record<string, string>

const manifests = new Map<string, Promise<ClipMap | null>>()

function loadManifest(id: string): Promise<ClipMap | null> {
  let m = manifests.get(id)
  if (!m) {
    m = fetch(`${BASE}lessons/${id}.json`)
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
      .then((j: { clips?: ClipMap } | null) => (j?.clips && Object.keys(j.clips).length ? j.clips : null))
      .catch(() => null)
    manifests.set(id, m)
    // Try again next time if it failed (offline, say).
    void m.then((v) => v ?? manifests.delete(id))
  }
  return m
}

/** The lesson's recordings: undefined while loading, null if it has none. */
export function useLessonClips(id: string): ClipMap | null | undefined {
  const [clips, setClips] = useState<ClipMap | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setClips(undefined)
    void loadManifest(id).then((c) => live && setClips(c))
    return () => {
      live = false
    }
  }, [id])
  return clips
}

/**
 * Plays clips one after another through a single <audio> element. One element,
 * unlocked by the first tap, is what iOS needs to keep playing in the background;
 * between clips it plays silence so the lesson isn't suspended during pauses.
 */
export class LessonAudio {
  private el: HTMLAudioElement | null = typeof Audio === 'undefined' ? null : new Audio()
  private urls = new Map<string, Promise<string | null>>()
  private settle: (() => void) | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  /** Bumped by every play, pause or stop, so a clip that loads late doesn't cut in. */
  private turn = 0

  constructor() {
    if (this.el) this.el.preload = 'auto'
  }

  /** Call from the tap that starts playback, so later play() calls are allowed. */
  unlock(): void {
    const el = this.el
    if (!el || (el.src && !el.paused)) return
    el.loop = true
    el.src = SILENCE
    void el.play().catch(() => {})
  }

  /** Fetches a clip into memory (and the offline cache), once. */
  load(file: string): Promise<string | null> {
    let u = this.urls.get(file)
    if (!u) {
      u = fetch(`${BASE}clips/${file}.mp3`)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => (b && b.size ? URL.createObjectURL(b) : null))
        .catch(() => null)
      this.urls.set(file, u)
      void u.then((v) => v ?? this.urls.delete(file))
    }
    return u
  }

  /** Starts fetching the next few clips so there's no gap between them. */
  prefetch(files: string[]): void {
    for (const f of files) void this.load(f)
  }

  /** Plays one clip; resolves when it ends or is cut off, rejects if it can't play. */
  async play(file: string, rate = 1): Promise<void> {
    this.release()
    const turn = ++this.turn
    const url = await this.load(file)
    if (turn !== this.turn) return
    const el = this.el
    if (!el || !url) throw new Error('clip unavailable')
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: unknown) => {
        el.onended = el.onerror = null
        if (this.settle === done) this.settle = null
        if (error) reject(error)
        else resolve()
      }
      const done = () => finish()
      this.settle = done
      el.loop = false
      el.src = url
      // A new source resets the speed to the default, so set both.
      el.defaultPlaybackRate = rate
      el.playbackRate = rate
      el.preservesPitch = true
      el.onended = done
      el.onerror = () => this.settle === done && finish(new Error('clip failed'))
      el.play().catch((e: unknown) => this.settle === done && finish(e))
    })
  }

  /** A pause of `seconds`, filled with silence so the page stays awake. */
  silence(seconds: number): Promise<void> {
    this.release()
    this.turn++
    const el = this.el
    if (el && !(el.loop && !el.paused)) {
      el.loop = true
      el.src = SILENCE
      el.playbackRate = 1
      void el.play().catch(() => {})
    }
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(this.timer)
        if (this.settle === done) this.settle = null
        resolve()
      }
      this.settle = done
      this.timer = setTimeout(done, seconds * 1000)
    })
  }

  /** Lets the current clip or pause go (it's resolved), without stopping the sound. */
  release(): void {
    const s = this.settle
    this.settle = null
    s?.()
  }

  stop(): void {
    this.release()
    this.turn++
    this.el?.pause()
  }

  dispose(): void {
    this.stop()
    if (this.el) this.el.removeAttribute('src')
    for (const u of this.urls.values()) void u.then((v) => v && URL.revokeObjectURL(v))
    this.urls.clear()
  }
}
