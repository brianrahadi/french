/**
 * Is the learner actually studying right now? The study timer only counts time
 * while the page is visible and something happened recently: an input event,
 * or the app speaking (an audio lesson or story plays hands-free).
 */
let lastInput = Date.now()
let lastSound = 0
let listening = false

/** How long without input or sound before the time stops counting. */
export const IDLE_MS = 120_000

/** Called whenever the app starts speaking or playing audio. */
export function noteSound(): void {
  lastSound = Date.now()
}

function onInput() {
  lastInput = Date.now()
}

/** Starts listening for input once (keys, pointer, scroll, touch). */
export function watchInput(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'input'] as const) window.addEventListener(ev, onInput, { passive: true, capture: true })
  window.addEventListener('scroll', onInput, { passive: true, capture: true })
}

const speaking = () => typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking

/**
 * Whether this moment counts as study. Hidden pages don't count, except a
 * hands-free audio lesson that is still talking.
 */
export function isAttentive(handsFree = false, now = Date.now()): boolean {
  const heard = speaking() || now - lastSound < 30_000
  const visible = typeof document === 'undefined' || document.visibilityState === 'visible'
  if (visible) return now - lastInput < IDLE_MS || now - lastSound < IDLE_MS || heard
  return handsFree && heard
}
