export type Verdict = 'correct' | 'almost' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  /** The accepted answer closest to what the learner typed. */
  expected: string
}

/** Lower-case, unify apostrophes/quotes/spaces and drop sentence punctuation. */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´ʼ]/g, "'")
    .replace(/[«»“”"]/g, ' ')
    .replace(/[   ]/g, ' ')
    .replace(/[.,!?;:…()]/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

export function checkAnswer(input: string, answers: string[]): CheckResult {
  const n = normalize(input)
  if (!answers.length) return { verdict: 'wrong', expected: '' }
  for (const a of answers) if (normalize(a) === n) return { verdict: 'correct', expected: a }
  const bare = stripAccents(n)
  for (const a of answers) if (stripAccents(normalize(a)) === bare) return { verdict: 'almost', expected: a }
  let best = answers[0]
  let bestD = Infinity
  for (const a of answers) {
    const d = levenshtein(normalize(a), n)
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  // Only point at an alternative answer if the attempt was actually close to it.
  if (bestD > Math.max(3, normalize(best).length * 0.5)) best = answers[0]
  return { verdict: 'wrong', expected: best }
}

export interface DiffPart {
  text: string
  kind: 'same' | 'diff'
}

/**
 * Character diff based on the longest common subsequence.
 * Returns the learner's string and the expected string, each split into same/diff runs.
 */
export function diffStrings(given: string, expected: string): { given: DiffPart[]; expected: DiffPart[] } {
  const a = given
  const b = expected
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const inA = new Array(a.length).fill(false)
  const inB = new Array(b.length).fill(false)
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (al[i] === bl[j]) {
      inA[i] = true
      inB[j] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const runs = (s: string, mask: boolean[]): DiffPart[] => {
    const out: DiffPart[] = []
    for (let k = 0; k < s.length; k++) {
      const kind = mask[k] ? 'same' : 'diff'
      const last = out[out.length - 1]
      if (last && last.kind === kind) last.text += s[k]
      else out.push({ text: s[k], kind })
    }
    return out
  }
  return { given: runs(a, inA), expected: runs(b, inB) }
}

const PRONOUN_PREFIX = /^(que |qu')?(je |j'|tu |il |elle |on |nous |vous |ils |elles )/

/** Lets learners type "je parle" when only "parle" was asked for. */
export function stripSubjectPronoun(input: string): string {
  return normalize(input).replace(PRONOUN_PREFIX, '')
}
