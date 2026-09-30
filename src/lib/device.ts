/** A random id for this browser, so activity from several devices can be added up when syncing. */
const KEY = 'petit-a-petit-device'

function load(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'd-local'
  }
}

export const DEVICE_ID = typeof window === 'undefined' ? 'd-test' : load()
