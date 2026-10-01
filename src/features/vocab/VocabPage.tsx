import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Layers, Play, Search, Trash2, RotateCcw, Upload, Plus } from 'lucide-react'
import { DECKS, CUSTOM_DECK_ID, FREQUENCY_DECKS, FREQUENCY_DECK_IDS, FREQUENCY_ID, FREQUENCY_WORDS, THEMED_DECKS, BUILTIN_WORDS, allWords, alreadyHave, deckWords } from '../../data/vocab'
import { LEVELS, type Word } from '../../data/types'
import { Empty, GenderTag, Kbd, LevelBadge, ProgressBar, Stat, Switch } from '../../components/ui'
import { SpeakButton } from '../../components/SpeakButton'
import { toast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useDocumentTitle, useHotkeys } from '../../lib/hooks'
import { customWord, definite, findSameWord, frTypo, matchesSearch, parseImport, speakText } from '../../lib/words'
import { relativeDay } from '../../lib/date'
import { useNavigate } from 'react-router'
import { dueCounts, forecast, newAvailableToday, newWordQueue, vocabCounts, wordStatus, wordStats } from './selectors'

type Tab = 'decks' | 'browse' | 'add'

export default function VocabPage() {
  useDocumentTitle('Vocabulary')
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'decks'
  const setTab = (t: Tab) => setParams(t === 'decks' ? {} : { tab: t }, { replace: true })
  const state = useStore()
  const navigate = useNavigate()

  const { learning, review, total: due } = useMemo(() => dueCounts(state.cards, state.customWords), [state.cards, state.customWords])
  const fresh = newAvailableToday(state)
  const { learned, mature } = useMemo(() => vocabCounts(state), [state])
  const fc = useMemo(() => forecast(state.cards, 7), [state.cards])
  const canStudy = due + fresh > 0
  useHotkeys({ s: () => canStudy && navigate('/vocab/study') })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Vocabulaire</div>
          <h1 className="page-title">Vocabulary</h1>
          <p className="page-subtitle">
            Spaced repetition (FSRS) brings each word back right before you’d forget it — first French → English, then
            typing it in French.
          </p>
        </div>
      </header>

      <div className="card study-card">
        <div className="study-card__main">
          <div className="study-card__counts">
            <div>
              <div className="study-card__num tnum" style={{ color: 'var(--primary)' }}>{fresh}</div>
              <div className="subtle small">new</div>
            </div>
            <div>
              <div className="study-card__num tnum" style={{ color: 'var(--warning)' }}>{learning}</div>
              <div className="subtle small">learn</div>
            </div>
            <div>
              <div className="study-card__num tnum" style={{ color: 'var(--success)' }}>{review}</div>
              <div className="subtle small">review</div>
            </div>
          </div>
          {canStudy ? (
            <Link to="/vocab/study" className="btn btn--primary btn--lg">
              <Play size={18} aria-hidden /> Study now <Kbd>S</Kbd>
            </Link>
          ) : (
            <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
              <span className="muted small">All caught up for today</span>
              {newWordQueue(state).length > 0 && (
                <Link to="/vocab/study?extra=5" className="btn btn--secondary">
                  Learn 5 extra words
                </Link>
              )}
            </div>
          )}
        </div>
        {fc.some(Boolean) && (
        <div className="forecast" aria-label="Reviews due over the next 7 days">
          {fc.map((n, i) => {
            const max = Math.max(...fc, 1)
            const d = new Date()
            d.setDate(d.getDate() + i)
            return (
              <div key={i} className="forecast__col" title={`${n} due ${i === 0 ? 'today' : relativeDay(d)}`}>
                <span className="forecast__n tnum">{n || ''}</span>
                <span className="forecast__bar" style={{ height: `${(n / max) * 100}%` }} />
                <span className="forecast__day">{i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'narrow' })}</span>
              </div>
            )
          })}
        </div>
        )}
      </div>

      <div className="stats" style={{ marginTop: 16 }}>
        <Stat label="Words started" value={learned} />
        <Stat label="Well known (21d+)" value={mature} />
        <Stat label="Still to discover" value={newWordQueue({ ...state, activeDecks: [...DECKS.map((d) => d.id), CUSTOM_DECK_ID] }).length} />
      </div>

      <div className="tabs" role="tablist" style={{ marginTop: 32 }}>
        {(
          [
            ['decks', 'Decks'],
            ['browse', 'Browse words'],
            ['add', 'Add & import'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'decks' && <DecksTab onView={(deckId) => setParams({ tab: 'browse', deck: deckId })} />}
      {tab === 'browse' && <BrowseTab />}
      {tab === 'add' && <AddTab onDone={() => setParams({ tab: 'browse' })} />}
    </div>
  )
}

function DecksTab({ onView }: { onView: (id: string) => void }) {
  const activeDecks = useStore((s) => s.activeDecks)
  const introduced = useStore((s) => s.introduced)
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const toggleDeck = useStore((s) => s.toggleDeck)
  const setDecksActive = useStore((s) => s.setDecksActive)

  const allDecksIds = useMemo(() => [...DECKS.map((d) => d.id), CUSTOM_DECK_ID], [])
  const allActive = allDecksIds.every((id) => activeDecks.includes(id))

  const deckRow = (id: string, title: string, titleFr: string, words: Word[]) => {
    const started = words.filter((w) => introduced[w.id]).length
    const known = words.filter((w) => wordStatus(w.id, cards) === 'mature').length
    const active = activeDecks.includes(id)
    return (
      <div key={id} className={`deck${active ? ' deck--active' : ''}`}>
        <div className="deck__text" onClick={() => onView(id)} style={{ cursor: 'pointer' }} title="View words">
          <div className="deck__title">{title}</div>
          <div className="deck__fr fr" lang="fr">
            {titleFr}
          </div>
          <div className="deck__progress">
            <ProgressBar value={words.length ? started / words.length : 0} label={`${title}: ${started} of ${words.length} words started`} thin />
            <span className="subtle small tnum">
              {started}/{words.length}
              {known > 0 && ` · ${known} known`}
            </span>
          </div>
        </div>
        <Switch checked={active} onChange={() => toggleDeck(id)} label={`Include “${title}” in new words`} />
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <div className="row-wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="muted small" style={{ margin: 0, maxWidth: 600 }}>
          Switch on the decks you want new words from. Words are introduced in order, a few each day (change the number in
          Settings).
        </p>
        <button className="btn btn--secondary btn--sm" onClick={() => setDecksActive(allDecksIds, !allActive)}>
          {allActive ? 'Turn all off' : 'Turn all on'}
        </button>
      </div>
      {LEVELS.map((level) => {
        const levelDecks = THEMED_DECKS.filter((d) => d.level === level)

        return (
          <section key={level}>
            <div className="level-head row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
              <LevelBadge level={level} />
            </div>
            <div className="deck-grid">
              {levelDecks.map((d) => deckRow(d.id, d.title, d.titleFr, d.words))}
            </div>
          </section>
        )
      })}
      {FREQUENCY_DECKS.length > 0 && <FrequencySection onView={() => onView(FREQUENCY_ID)} />}
      <section>
        <div className="level-head row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
          <span className="badge">Yours</span>
        </div>
        <div className="deck-grid">
          {customWords.length ? (
            deckRow(CUSTOM_DECK_ID, 'My words', 'Mes mots', customWords)
          ) : (
            <div className="deck">
              <div className="deck__text">
                <div className="deck__title">My words</div>
                <div className="muted small">Add words from LingQ, Anki or your reading in the “Add & import” tab.</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

/**
 * The "5000 most frequent words": one switch for all of them. They're stored as
 * 100-word decks, which are switched on and off together and introduced in order,
 * most frequent first.
 */
function FrequencySection({ onView }: { onView: () => void }) {
  const activeDecks = useStore((s) => s.activeDecks)
  const introduced = useStore((s) => s.introduced)
  const cards = useStore((s) => s.cards)
  const setDecksActive = useStore((s) => s.setDecksActive)
  const active = FREQUENCY_DECK_IDS.every((id) => activeDecks.includes(id))
  const total = FREQUENCY_WORDS.length
  const started = FREQUENCY_WORDS.filter((w) => introduced[w.id]).length
  const known = FREQUENCY_WORDS.filter((w) => wordStatus(w.id, cards) === 'mature').length
  const title = `Top ${total.toLocaleString('en')} words`
  return (
    <section>
      <div className="level-head row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <span className="badge">Most frequent</span>
      </div>
      <div className="deck-grid">
        <div className={`deck${active ? ' deck--active' : ''}`}>
          <div className="deck__text" onClick={onView} style={{ cursor: 'pointer' }} title="View words">
            <div className="deck__title">{title}</div>
            <div className="deck__fr fr" lang="fr">
              Les mots les plus fréquents
            </div>
            <div className="muted small" style={{ marginTop: 4 }}>
              Most common first. Words already in a themed deck are shared, so you learn each one once.
            </div>
            <div className="deck__progress">
              <ProgressBar value={total ? started / total : 0} label={`${title}: ${started} of ${total} words started`} thin />
              <span className="subtle small tnum">
                {started}/{total}
                {known > 0 && ` · ${known} known`}
              </span>
            </div>
          </div>
          <Switch checked={active} onChange={() => setDecksActive(FREQUENCY_DECK_IDS, !active)} label={`Include “${title}” in new words`} />
        </div>
      </div>
    </section>
  )
}

const STATUS_BADGE = {
  new: <span className="badge">New</span>,
  learning: <span className="badge badge--warning">Learning</span>,
  young: <span className="badge badge--primary">Reviewing</span>,
  mature: <span className="badge badge--success">Known</span>,
}

function BrowseTab() {
  const [params, setParams] = useSearchParams()
  const cards = useStore((s) => s.cards)
  const customWords = useStore((s) => s.customWords)
  const resetWord = useStore((s) => s.resetWord)
  const removeCustomWord = useStore((s) => s.removeCustomWord)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'learning' | 'young' | 'mature' | 'custom'>('all')
  const [sortBy, setSortBy] = useState<'due-asc' | 'due-desc' | 'strength-asc' | 'strength-desc' | 'default'>('default')
  const [limit, setLimit] = useState(60)

  const deckFilter = params.get('deck') || 'all'

  const words = useMemo(() => {
    // A deck's words in its own order (frequency order for the top 5000).
    const base = deckFilter === 'all' ? allWords(customWords) : deckWords(deckFilter, customWords)
    const list = base.filter((w) => matchesSearch(w, q))
    const filtered = list.filter((w) => {
      if (filter === 'all') return true
      if (filter === 'custom') return w.custom
      return wordStatus(w.id, cards) === filter
    })

    if (sortBy === 'default') return filtered

    return filtered.sort((a, b) => {
      const statsA = wordStats(a.id, cards)
      const statsB = wordStats(b.id, cards)
      
      if (sortBy.startsWith('due')) {
        const timeA = statsA.nextDue ? statsA.nextDue.getTime() : Infinity
        const timeB = statsB.nextDue ? statsB.nextDue.getTime() : Infinity
        return sortBy === 'due-asc' ? timeA - timeB : timeB - timeA
      } else {
        const strA = statsA.interval || 0
        const strB = statsB.interval || 0
        return sortBy === 'strength-asc' ? strA - strB : strB - strA
      }
    })
  }, [customWords, q, filter, cards, deckFilter, sortBy])

  return (
    <div className="stack">
      <div className="row-wrap">
        <div className="search" style={{ flex: '1 1 260px' }}>
          <Search size={17} aria-hidden />
          <input
            className="input"
            type="search"
            placeholder="Search French or English…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(60)
            }}
            aria-label="Search words"
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={deckFilter}
          onChange={(e) => {
            const next = new URLSearchParams(params)
            if (e.target.value === 'all') next.delete('deck')
            else next.set('deck', e.target.value)
            setParams(next)
          }}
          aria-label="Filter by deck"
        >
          <option value="all">All decks</option>
          <optgroup label="Themed">
            {THEMED_DECKS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </optgroup>
          {FREQUENCY_DECKS.length > 0 && <option value={FREQUENCY_ID}>Top {FREQUENCY_WORDS.length.toLocaleString('en')} words</option>}
          <option value={CUSTOM_DECK_ID}>My words</option>
        </select>
        <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter by status">
          <option value="all">All status</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="young">Reviewing</option>
          <option value="mature">Known</option>
          <option value="custom">My words</option>
        </select>
        <select className="select" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} aria-label="Sort by">
          <option value="default">Default order</option>
          <option value="due-asc">Next review (Earliest)</option>
          <option value="due-desc">Next review (Latest)</option>
          <option value="strength-desc">Strength (Highest)</option>
          <option value="strength-asc">Strength (Lowest)</option>
        </select>
      </div>
      <div className="subtle small">{words.length} words</div>
      {words.length === 0 ? (
        <Empty icon={<Layers size={32} />} title="No words match">
          Try another search or filter.
        </Empty>
      ) : (
        <div className="card card--flush">
          <ul className="list word-list">
            {words.slice(0, limit).map((w) => {
              const st = wordStatus(w.id, cards)
              const { nextDue, interval } = wordStats(w.id, cards)
              return (
                <li key={w.id} className="list-row word-row">
                  <SpeakButton text={speakText(w)} size="sm" />
                  <div className="word-row__fr fr" lang="fr">
                    {w.pos === 'n' && w.g && !w.custom && <span className={w.both ? '' : w.g === 'f' ? 'art-f' : 'art-m'}>{frTypo(definite(w))}</span>}
                    {frTypo(w.fr)}
                    {w.pos === 'adj' && w.fem && w.fem !== w.fr && <span className="subtle"> · {w.fem}</span>}{' '}
                    {w.pos === 'n' && !w.both && (w.pl || /^l'/.test(definite(w))) && <GenderTag g={w.g} />}
                  </div>
                  <div className="word-row__en muted">{w.en}</div>
                  <div className="word-row__meta" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div>
                      {STATUS_BADGE[st]}
                    </div>
                    {st !== 'new' && (
                      <div className="subtle small" style={{ display: 'flex', gap: 6 }}>
                        {interval > 0 && <span title="Current interval">Str: {interval}d</span>}
                        {nextDue && <span title="Next review date">Due: {relativeDay(nextDue)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="word-row__actions">
                    {st !== 'new' && (
                      <button className="icon-btn icon-btn--sm" title="Forget progress for this word" aria-label={`Reset ${w.fr}`} onClick={() => resetWord(w.id)}>
                        <RotateCcw size={15} aria-hidden />
                      </button>
                    )}
                    {w.custom && (
                      <button className="icon-btn icon-btn--sm" title="Delete word" aria-label={`Delete ${w.fr}`} onClick={() => removeCustomWord(w.id)}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {words.length > limit && (
        <button className="btn btn--secondary" onClick={() => setLimit((l) => l + 100)} style={{ alignSelf: 'center' }}>
          Show more
        </button>
      )}
    </div>
  )
}

function AddTab({ onDone }: { onDone: () => void }) {
  const addCustomWords = useStore((s) => s.addCustomWords)
  const customWords = useStore((s) => s.customWords)
  const introduced = useStore((s) => s.introduced)
  const [fr, setFr] = useState('')
  const [en, setEn] = useState('')
  const [ex, setEx] = useState('')
  const [bulk, setBulk] = useState('')
  const parsed = useMemo(() => parseImport(bulk), [bulk])

  const addOne = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fr.trim() || !en.trim()) return
    const g = /^(le|un) /i.test(fr) ? 'm' : /^(la|une) /i.test(fr) ? 'f' : undefined
    const w = customWord(fr, en, ex, g)
    if (alreadyHave(w, customWords, introduced)) toast(`“${fr.trim()}” is already in your words`)
    else {
      addCustomWords([w])
      toast(findSameWord(w, BUILTIN_WORDS) ? `“${fr.trim()}” is in the decks — added it from there` : `Added “${fr.trim()}”`)
    }
    setFr('')
    setEn('')
    setEx('')
  }

  const importAll = () => {
    if (!parsed.length) return
    const words = parsed.map((p) => customWord(p.fr, p.en, p.ex, p.g))
    const have = words.filter((w) => alreadyHave(w, customWords, introduced)).length
    addCustomWords(words)
    toast(have ? `Imported ${words.length - have} words · ${have} you already had were skipped` : `Imported ${words.length} words`)
    setBulk('')
    onDone()
  }

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <form className="card stack" onSubmit={addOne}>
        <h2 className="card__title">Add a word</h2>
        <p className="muted small">Found a word on LingQ or in a podcast? Add it here. For nouns, type the article (le, la, un, une) so you learn its gender.</p>
        <div className="field">
          <label className="label" htmlFor="add-fr">
            French
          </label>
          <input id="add-fr" className="input fr" lang="fr" value={fr} onChange={(e) => setFr(e.target.value)} placeholder="la bibliothèque" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="add-en">
            English
          </label>
          <input id="add-en" className="input" value={en} onChange={(e) => setEn(e.target.value)} placeholder="library" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="add-ex">
            Example sentence <span className="hint">(optional)</span>
          </label>
          <input id="add-ex" className="input fr" lang="fr" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="Je travaille à la bibliothèque." />
        </div>
        <button className="btn btn--primary" type="submit" disabled={!fr.trim() || !en.trim()}>
          <Plus size={17} aria-hidden /> Add word
        </button>
      </form>

      <div className="card stack">
        <h2 className="card__title">Import from Anki, LingQ or a spreadsheet</h2>
        <p className="muted small">
          Paste one word per line: <code>french⇥english</code> (tab, semicolon or comma separated, optional third column for an
          example). In Anki use <em>File → Export → Notes in Plain Text</em>; in LingQ, export your LingQs as CSV.
        </p>
        <textarea
          className="textarea fr"
          lang="fr"
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={'la bibliothèque\tlibrary\nse débrouiller\tto manage, get by'}
          aria-label="Words to import"
        />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
            <Upload size={15} aria-hidden /> Choose file
            <input
              type="file"
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setBulk(await f.text())
              }}
            />
          </label>
          <button className="btn btn--primary" onClick={importAll} disabled={!parsed.length}>
            Import {parsed.length || ''} word{parsed.length === 1 ? '' : 's'}
          </button>
        </div>
        {parsed.length > 0 && (
          <div className="import-preview" aria-label="Preview">
            {parsed.slice(0, 5).map((p, i) => (
              <div key={i} className="row small" style={{ gap: 8 }}>
                <span className="fr" lang="fr">
                  {p.fr}
                </span>
                <span className="subtle">→</span>
                <span className="muted">{p.en}</span>
              </div>
            ))}
            {parsed.length > 5 && <div className="subtle small">…and {parsed.length - 5} more</div>}
          </div>
        )}
      </div>
    </div>
  )
}
