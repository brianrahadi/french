import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Cloud, CloudCog, CloudOff, LoaderCircle, LogIn, LogOut, RefreshCw, X } from 'lucide-react'
import { signInWithGoogle, signOut, syncConfigured, syncNow, useSync, type SyncState } from '../lib/sync/engine'

/** "just now", "3 min ago", "at 14:05" */
function since(iso: string | null, now = Date.now()): string {
  if (!iso) return ''
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `at ${new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

/** Re-renders every 30 s so relative times stay fresh. */
function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

export function GoogleButton({ label = 'Continue with Google', size }: { label?: string; size?: 'sm' }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={`btn btn--primary${size === 'sm' ? ' btn--sm' : ''}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await signInWithGoogle()
        setBusy(false)
      }}
    >
      {busy ? <LoaderCircle size={16} className="spin" aria-hidden /> : <LogIn size={16} aria-hidden />} {label}
    </button>
  )
}

const LABEL: Record<SyncState, string> = {
  off: 'Sync not set up',
  starting: 'Connecting…',
  'signed-out': 'Not signed in',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline — will sync later',
  error: 'Sync paused',
}

/** Settings section: sign in with Google, sync status, sign out. */
export function SyncAccount() {
  const { state, user, lastSyncAt, error } = useSync()
  const [leaving, setLeaving] = useState(false)
  useTick()

  if (!syncConfigured)
    return (
      <div className="card sync-card">
        <div className="sync-card__head">
          <span className="sync-icon">
            <CloudCog size={20} aria-hidden />
          </span>
          <div>
            <div className="card__title">Sync across devices</div>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              This copy of the app isn’t connected to a sync server yet, so progress stays in this browser. Whoever runs it can
              connect a free Supabase project with Google sign-in — the README explains how in a few steps.
            </p>
          </div>
        </div>
      </div>
    )

  if (!user)
    return (
      <div className="card sync-card">
        <div className="sync-card__head">
          <span className="sync-icon">
            <Cloud size={20} aria-hidden />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="card__title">Keep your progress on every device</div>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              Sign in with Google and your flashcards, lessons, mistakes, texts and conversations stay in sync between your
              phone and computer. What’s already on this device is kept and merged.
            </p>
          </div>
        </div>
        {error && <p className="small text-danger">{error}</p>}
        <div className="sync-card__actions">
          {state === 'starting' ? (
            <span className="small subtle">
              <LoaderCircle size={14} className="spin" aria-hidden /> Connecting…
            </span>
          ) : (
            <GoogleButton />
          )}
          <Link to="/privacy" className="small subtle">
            What’s stored and where
          </Link>
        </div>
      </div>
    )

  return (
    <div className="card sync-card">
      <div className="sync-card__head">
        {user.avatar ? (
          <img className="sync-avatar" src={user.avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="sync-avatar sync-avatar--initial" aria-hidden>
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="card__title">{user.name}</div>
          <div className="small muted sync-card__email">{user.email}</div>
        </div>
      </div>
      <div className={`sync-line sync-line--${state}`} role="status">
        <SyncGlyph state={state} />
        <span>
          {LABEL[state]}
          {state === 'synced' && lastSyncAt ? ` · ${since(lastSyncAt)}` : ''}
        </span>
      </div>
      {error && state !== 'synced' && <p className="small text-danger">{error}</p>}
      <p className="hint" style={{ margin: 0 }}>
        Progress saves to your account when you pause or switch apps, and updates whenever you open the app. AI keys, voice and theme stay on each device.
      </p>
      <div className="sync-card__actions">
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => void syncNow()} disabled={state === 'syncing'}>
          <RefreshCw size={15} aria-hidden className={state === 'syncing' ? 'spin' : undefined} /> Sync now
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={leaving}
          onClick={async () => {
            setLeaving(true)
            await signOut()
            setLeaving(false)
          }}
        >
          <LogOut size={15} aria-hidden /> Sign out
        </button>
      </div>
    </div>
  )
}

export function SyncGlyph({ state, size = 16 }: { state: SyncState; size?: number }) {
  if (state === 'syncing' || state === 'starting') return <LoaderCircle size={size} className="spin" aria-hidden />
  if (state === 'offline') return <CloudOff size={size} aria-hidden />
  if (state === 'error') return <AlertTriangle size={size} aria-hidden />
  return <Cloud size={size} aria-hidden />
}

/** Compact status for the sidebar: synced / syncing / sign-in prompt. */
export function SyncBadge() {
  const { state, user, lastSyncAt } = useSync()
  useTick()
  if (!syncConfigured) return null
  if (!user)
    return (
      <Link to="/settings#account" className="nav-link sync-badge">
        <Cloud size={19} aria-hidden />
        Sign in to sync
      </Link>
    )
  return (
    <Link
      to="/settings#account"
      className={`nav-link sync-badge sync-badge--${state}`}
      title={state === 'synced' && lastSyncAt ? `Synced ${since(lastSyncAt)}` : LABEL[state]}
    >
      <SyncGlyph state={state} size={19} />
      {state === 'synced' ? 'Synced' : LABEL[state]}
    </Link>
  )
}

const DISMISS = 'petit-a-petit-sync-prompt'

/** A one-time nudge on Today for people who haven't signed in. */
export function SyncPrompt() {
  const { state, user, error } = useSync()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS) === '1'
    } catch {
      return false
    }
  })
  if (!syncConfigured || user || hidden || state !== 'signed-out') return null
  return (
    <section className="card sync-prompt" aria-label="Sync across devices">
      <span className="sync-icon">
        <Cloud size={20} aria-hidden />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="card__title">Study on your phone too?</div>
        <p className="small muted" style={{ margin: '2px 0 0' }}>
          Sign in with Google to keep your progress in sync on all your devices.
        </p>
        {error && <p className="small text-danger" style={{ margin: '4px 0 0' }}>{error}</p>}
      </div>
      <GoogleButton size="sm" label="Sign in" />
      <button
        type="button"
        className="icon-btn icon-btn--sm"
        aria-label="Not now"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(DISMISS, '1')
          } catch {
            /* ignore */
          }
        }}
      >
        <X size={16} aria-hidden />
      </button>
    </section>
  )
}
