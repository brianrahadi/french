import { describe, expect, it } from 'vitest'
import { LESSONS } from './index'
import { checkAnswer } from '../../lib/answer'
import { pickCheck, pickReview } from '../../features/grammar/goals'

describe('grammar lessons', () => {
  it('have unique ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })
  it('have enough well-formed exercises', () => {
    for (const l of LESSONS) {
      expect(l.exercises.length, l.id).toBeGreaterThanOrEqual(9)
      expect(l.sections.length, l.id).toBeGreaterThan(0)
      l.exercises.forEach((e, i) => {
        const where = `${l.id} #${i + 1}`
        switch (e.type) {
          case 'cloze':
            expect(e.sentence.split('___').length - 1, where).toBe(1)
            expect(e.answers.length, where).toBeGreaterThan(0)
            break
          case 'mcq':
            expect(e.answer, where).toBeLessThan(e.options.length)
            expect(new Set(e.options).size, where).toBe(e.options.length)
            break
          case 'order':
            expect(e.words.length, where).toBeGreaterThan(1)
            for (const x of e.extra ?? []) expect(e.words.includes(x), `${where} distractor ${x} is also a real tile`).toBe(false)
            break
          case 'translate':
          case 'transform':
            expect(e.answers.length, where).toBeGreaterThan(0)
            for (const a of e.answers) expect(checkAnswer(a, e.answers).verdict, where).toBe('correct')
            break
        }
      })
    }
  })
  it('reports size', () => {
    console.log(`${LESSONS.length} lessons, ${LESSONS.reduce((n, l) => n + l.exercises.length, 0)} exercises`)
  })
})

describe('lesson goals', () => {
  it('cover every exercise, with at least two exercises per goal', () => {
    for (const l of LESSONS) {
      expect(l.goals.length, l.id).toBeGreaterThanOrEqual(3)
      expect(l.goals.length, l.id).toBeLessThanOrEqual(8)
      l.exercises.forEach((e, i) => expect(e.goal, `${l.id} #${i + 1}`).toBeDefined())
      for (const g of l.goals) {
        expect(l.exercises.filter((e) => e.goal === g.id).length, `${l.id}: ${g.id}`).toBeGreaterThanOrEqual(2)
        expect(g.section, `${l.id}: ${g.id} links to its section`).toBeDefined()
      }
    }
  })
  it('give every lesson a check that tests each goal once or more', () => {
    for (const l of LESSONS) {
      const picks = pickCheck(l)
      expect(new Set(picks).size, l.id).toBe(picks.length)
      expect(new Set(picks.map((i) => l.exercises[i].goal)).size, l.id).toBe(l.goals.length)
    }
  })
  it('give every lesson a review that touches each goal', () => {
    for (const l of LESSONS) {
      const picks = pickReview(l, undefined)
      expect(new Set(picks).size, l.id).toBe(picks.length)
      expect(new Set(picks.map((i) => l.exercises[i].goal)).size, l.id).toBe(l.goals.length)
    }
  })
})

describe('lesson markup', () => {
  it('has balanced **bold**, *italic* and ~~strike~~ markers', () => {
    const texts: string[] = []
    for (const l of LESSONS) {
      for (const s of l.sections)
        for (const b of s.blocks) {
          if (b.type === 'p' || b.type === 'tip' || b.type === 'warn') texts.push(b.text)
          if (b.type === 'list') texts.push(...b.items)
        }
      for (const e of l.exercises) {
        if ('explain' in e && e.explain) texts.push(e.explain)
        if (e.type === 'mcq') texts.push(e.prompt)
        if (e.type === 'transform') texts.push(e.instruction)
      }
    }
    for (const t of texts) {
      const strike = (t.match(/~~/g) ?? []).length
      const bold = (t.replace(/~~/g, '').match(/\*\*/g) ?? []).length
      const ital = (t.replace(/~~/g, '').replace(/\*\*/g, '').match(/\*/g) ?? []).length
      expect(strike % 2, t).toBe(0)
      expect(bold % 2, t).toBe(0)
      expect(ital % 2, t).toBe(0)
    }
  })
})
