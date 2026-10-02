import { Box, Stack } from '@mantine/core'
import { diffStrings } from '../lib/answer'
import { frTypo } from '../lib/words'

/** Shows the learner's answer (differences struck through) and the expected answer (differences highlighted). */
export function Diff({ given, expected }: { given: string; expected: string }) {
  const d = diffStrings(frTypo(given.trim()), frTypo(expected))
  return (
    <Stack className="diff" gap={4}>
      <Box fw={600}>
        <span className="diff__label">Answer</span>
        <span lang="fr">{d.expected.map((p, i) => (p.kind === 'same' ? <span key={i}>{p.text}</span> : <ins key={i}>{p.text}</ins>))}</span>
      </Box>
      {given.trim() && (
        <div className="diff__given">
          <span className="diff__label">You wrote</span>
          <span lang="fr">{d.given.map((p, i) => (p.kind === 'same' ? <span key={i}>{p.text}</span> : <del key={i}>{p.text}</del>))}</span>
        </div>
      )}
    </Stack>
  )
}
