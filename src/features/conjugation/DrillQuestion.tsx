import { useRef, useState, type ReactNode } from 'react'
import { VERB_BY_INF } from '../../data/verbs'
import { TENSE_BY_ID, conjugate, tablePronoun, type Tense } from '../../lib/conjugate'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { CheckBar } from '../../components/CheckBar'
import { AccentBar } from '../../components/AccentBar'
import { Diff } from '../../components/Diff'
import { SpeakButton } from '../../components/SpeakButton'
import { LevelBadge } from '../../components/ui'
import { useStore } from '../../lib/store'
import { frTypo } from '../../lib/words'
import type { Verdict } from '../../lib/answer'
import { praise } from '../grammar/grade'
import { fullForm, gradeDrill, promptPronoun, type DrillItem } from './drill'

export interface DrillAnswer {
  item: DrillItem
  given: string
  verdict: Verdict
  pass: boolean
  expected: string
}

/**
 * One conjugation question with its feedback. Mount with a fresh `key` per question.
 */
export function DrillQuestion({
  item,
  badge,
  onAnswered,
  onContinue,
}: {
  item: DrillItem
  badge?: ReactNode
  onAnswered: (a: DrillAnswer) => void
  onContinue: () => void
}) {
  const strict = useStore((s) => s.settings.strictAccents)
  const autoplay = useStore((s) => s.settings.autoplay)
  const [value, setValue] = useState('')
  const [result, setResult] = useState<DrillAnswer | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const check = (giveUp = false) => {
    if (result) return
    const g = giveUp ? { verdict: 'wrong' as Verdict, expected: gradeDrill(item, '').expected } : gradeDrill(item, value)
    const pass = g.verdict === 'correct' || (g.verdict === 'almost' && !strict)
    const a: DrillAnswer = { item, given: giveUp ? '' : value, verdict: g.verdict, pass, expected: g.expected }
    setResult(a)
    onAnswered(a)
  }

  const v = VERB_BY_INF[item.inf]
  const tense = TENSE_BY_ID[item.tense]
  const pronoun = promptPronoun(item)
  const answered = !!result

  return (
    <>
      <div className="q-kicker">
        <LevelBadge level={tense.level} /> {tense.label}
        <span className="subtle" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
          · {tense.en}
        </span>
        {badge}
      </div>
      <div className="drill-verb">
        <span className="fr" lang="fr">
          {v.inf}
        </span>
        <span className="muted">{v.en}</span>
      </div>

      <div className="drill-line" lang="fr">
        {pronoun && <span className="drill-pronoun">{frTypo(pronoun)}</span>}
        <input
          ref={ref}
          className={`answer-input${result ? (result.verdict === 'correct' ? ' answer-input--correct' : result.verdict === 'almost' ? ' answer-input--almost' : ' answer-input--wrong') : ''}${result && !result.pass ? ' shake' : ''}`}
          value={value}
          autoFocus
          readOnly={answered}
          placeholder={item.tense === 'imperatif' ? 'imperative form…' : 'conjugated form…'}
          aria-label={`${v.inf}, ${tense.label}, ${pronoun || 'imperative'}`}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !answered) {
              e.preventDefault()
              if (value.trim()) check()
            }
          }}
        />
      </div>
      {!answered && <AccentBar inputRef={ref} onInsert={setValue} />}

      {answered && <MiniTable inf={item.inf} tense={item.tense} person={item.person} />}

      {!result ? (
        <CheckBar onCheck={() => check()} disabled={!value.trim()} onSkip={() => check(true)} skipLabel="Show answer" />
      ) : (
        <FeedbackSheet
          verdict={result.verdict}
          title={result.verdict === 'correct' ? praise() : result.verdict === 'almost' ? 'Almost — check the accents' : result.given ? 'Not quite' : 'Here’s the answer'}
          onContinue={onContinue}
        >
          <div className="sheet__answer row" style={{ gap: 6 }}>
            <SpeakButton text={fullForm(item)} size="sm" autoPlay={autoplay} label="Listen" />
            {result.verdict !== 'correct' && result.given ? (
              <Diff given={result.given} expected={result.expected} />
            ) : (
              <strong lang="fr">{frTypo(fullForm(item))}</strong>
            )}
          </div>
          {(item.person === 2 || item.person === 5) &&
            v.aux === 'etre' &&
            ['passeCompose', 'plusQueParfait', 'conditionnelPasse'].includes(item.tense) && (
              <p className="sheet__explain">
                With être, the past participle agrees with the subject ({item.gender === 'f' ? 'feminine' : 'masculine'}
                {item.person === 5 ? ' plural' : ''}).
              </p>
            )}
        </FeedbackSheet>
      )}
    </>
  )
}

function MiniTable({ inf, tense, person }: { inf: string; tense: Tense; person: number }) {
  const v = VERB_BY_INF[inf]
  const cells = conjugate(v, tense)
  return (
    <div className="mini-table" aria-label={`${inf} in the ${TENSE_BY_ID[tense].label}`}>
      {cells.map((c) => {
        const pr = tablePronoun(tense, c.person, c.display, v.inf)
        return (
          <div key={c.person} className={`mini-table__row${c.person === person ? ' is-target' : ''}`} lang="fr">
            <span className="mini-table__pr">{frTypo(pr)}</span>
            {pr && !pr.endsWith("'") ? ' ' : ''}
            <span className="mini-table__form">{c.display}</span>
          </div>
        )
      })}
    </div>
  )
}
