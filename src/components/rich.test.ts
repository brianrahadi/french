import { describe, expect, it } from 'vitest'
import { parseRich } from './ui'

const flat = (n: ReturnType<typeof parseRich>): string =>
  n.children.map((c) => (typeof c === 'string' ? c : `<${c.tag ?? 'span'}>${flat(c)}</${c.tag ?? 'span'}>`)).join('')

describe('parseRich', () => {
  it('handles nesting', () => {
    expect(flat(parseRich('*J’aime **le** chocolat* ok'))).toBe('<em>J’aime <strong>le</strong> chocolat</em> ok')
    expect(flat(parseRich('*un film **intéressant***. But'))).toBe('<em>un film <strong>intéressant</strong></em>. But')
    expect(flat(parseRich('Never ~~Je suis 30 ans~~.'))).toBe('Never <s>Je suis 30 ans</s>.')
  })
})
