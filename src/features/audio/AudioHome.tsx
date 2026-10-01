import { useMemo } from 'react'
import { Link } from 'react-router'
import { AudioLines, Check, Headphones, Mic, Play, Repeat } from 'lucide-react'
import { AUDIO_LESSONS } from '../../data/audio'
import type { AudioLessonDef } from '../../data/types'
import { Callout, LevelBadge } from '../../components/ui'
import { Shelf } from '../../components/Shelf'
import { useStore, type AudioProgress } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { speechSupported } from '../../lib/speech'
import { frTypo } from '../../lib/words'
import { buildScript, minutesOf, scriptSeconds } from './script'

export default function AudioHome() {
  useDocumentTitle('Audio lessons')
  const audio = useStore((s) => s.audio) ?? {}
  const minutes = useMemo(
    () => Object.fromEntries(AUDIO_LESSONS.map((l, i) => [l.id, minutesOf(scriptSeconds(buildScript(l, i + 1, AUDIO_LESSONS.slice(0, i)).steps))])),
    [],
  )
  const numbered = AUDIO_LESSONS.map((l, i) => ({ l, n: i + 1 }))
  const todo = numbered.filter(({ l }) => !audio[l.id]?.done)
  const done = numbered.filter(({ l }) => audio[l.id]?.done).sort((a, b) => audio[b.l.id].done!.localeCompare(audio[a.l.id].done!))
  const next = todo[0]

  return (
    <div className="page">
      <header className="page-header page-header--compact">
        <div>
          <div className="page-eyebrow">Cours audio</div>
          <h1 className="page-title">Audio lessons</h1>
          <p className="page-subtitle">Hands-free, like Pimsleur: listen, answer out loud, and every phrase comes back until it sticks.</p>
        </div>
        {next && (
          <div className="page-header__actions">
            <Link to={`/audio/${next.l.id}`} className="btn btn--primary">
              <Play size={16} aria-hidden /> {audio[next.l.id]?.pos ? 'Continue' : 'Start'} lesson {next.n}
            </Link>
          </div>
        )}
      </header>

      {!speechSupported && <Callout kind="warn">This browser can’t read text aloud, so audio lessons don’t work here. Try Chrome, Edge or Safari.</Callout>}

      <div className="audio-how">
        <span>
          <Headphones size={16} aria-hidden /> Listen to a short conversation
        </span>
        <span>
          <Mic size={16} aria-hidden /> Answer out loud in the pause
        </span>
        <span>
          <Repeat size={16} aria-hidden /> Phrases return at growing intervals
        </span>
      </div>

      {todo.length > 0 && (
        <Shelf title="Up next" count={todo.length} hint="One lesson a day, in order — each builds on the ones before.">
          {todo.map(({ l, n }) => (
            <AudioTile key={l.id} l={l} n={n} min={minutes[l.id]} p={audio[l.id]} next={l === next?.l} />
          ))}
        </Shelf>
      )}

      {done.length > 0 && (
        <Shelf title="Completed" count={done.length} hint="Repeat a lesson any time you felt unsure.">
          {done.map(({ l, n }) => (
            <AudioTile key={l.id} l={l} n={n} min={minutes[l.id]} p={audio[l.id]} />
          ))}
        </Shelf>
      )}
    </div>
  )
}

function AudioTile({ l, n, min, p, next }: { l: AudioLessonDef; n: number; min: number; p?: AudioProgress; next?: boolean }) {
  const started = p && !p.done && p.pos > 0
  return (
    <div className={`stile${p?.done ? ' stile--done' : ''}${next ? ' stile--next' : ''}`}>
      <div className="stile__top">
        <LevelBadge level={l.level} />
        <span className="small subtle">Lesson {n}</span>
        {p?.done && (
          <span className="badge badge--success stile__corner">
            <Check size={12} aria-hidden /> done
          </span>
        )}
        {next && !p?.done && <span className="badge stile__corner">next</span>}
      </div>
      <Link to={`/audio/${l.id}`} className="stile__title stile__stretch fr" lang="fr">
        {frTypo(l.title)}
      </Link>
      <div className="stile__sub">{l.titleEn}</div>
      <div className="stile__foot">
        <AudioLines size={13} aria-hidden /> {min} min · {l.phrases.length} phrases
      </div>
      {started && (
        <div className="stile__progress">
          <span style={{ width: `${Math.round((p.pos / p.total) * 100)}%` }} />
        </div>
      )}
    </div>
  )
}
