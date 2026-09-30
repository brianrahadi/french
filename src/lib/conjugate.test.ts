import { describe, expect, it } from 'vitest'
import { VERB_BY_INF, VERBS, hasTense } from '../data/verbs'
import { TENSES, conjugate, joinPronoun, pronounFor, type Tense } from './conjugate'

const forms = (inf: string, tense: Tense) => conjugate(VERB_BY_INF[inf], tense).map((c) => c.display)
const accepted = (inf: string, tense: Tense, person: number, g: 'm' | 'f' = 'm') =>
  conjugate(VERB_BY_INF[inf], tense).find((c) => c.person === person)![g]

describe('present', () => {
  it('regular groups', () => {
    expect(forms('parler', 'present')).toEqual(['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'])
    expect(forms('finir', 'present')).toEqual(['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'])
    expect(forms('vendre', 'present')).toEqual(['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent'])
  })
  it('spelling-change -er verbs', () => {
    expect(forms('manger', 'present')[3]).toBe('mangeons')
    expect(forms('commencer', 'present')[3]).toBe('commençons')
    expect(forms('acheter', 'present')).toEqual(['achète', 'achètes', 'achète', 'achetons', 'achetez', 'achètent'])
    expect(forms('lever', 'present')[0]).toBe('lève')
    expect(forms('préférer', 'present')).toEqual(['préfère', 'préfères', 'préfère', 'préférons', 'préférez', 'préfèrent'])
    expect(forms('appeler', 'present')).toEqual(['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'])
    expect(forms('jeter', 'present')[5]).toBe('jettent')
    expect(forms('nettoyer', 'present')).toEqual(['nettoie', 'nettoies', 'nettoie', 'nettoyons', 'nettoyez', 'nettoient'])
    expect(forms('envoyer', 'present')[0]).toBe('envoie')
    expect(accepted('payer', 'present', 0)).toEqual(['paie', 'paye'])
    expect(forms('étudier', 'present')[3]).toBe('étudions')
  })
  it('irregulars', () => {
    expect(forms('aller', 'present')).toEqual(['vais', 'vas', 'va', 'allons', 'allez', 'vont'])
    expect(forms('devenir', 'present')[5]).toBe('deviennent')
    expect(forms('comprendre', 'present')[5]).toBe('comprennent')
  })
})

describe('imparfait', () => {
  it('derives from the nous stem', () => {
    expect(forms('parler', 'imparfait')).toEqual(['parlais', 'parlais', 'parlait', 'parlions', 'parliez', 'parlaient'])
    expect(forms('finir', 'imparfait')[0]).toBe('finissais')
    expect(forms('faire', 'imparfait')[0]).toBe('faisais')
    expect(forms('boire', 'imparfait')[0]).toBe('buvais')
    expect(forms('voir', 'imparfait')[3]).toBe('voyions')
    expect(forms('rire', 'imparfait')[3]).toBe('riions')
    expect(forms('étudier', 'imparfait')[4]).toBe('étudiiez')
  })
  it('handles être and spelling changes', () => {
    expect(forms('être', 'imparfait')).toEqual(['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'])
    expect(forms('manger', 'imparfait')).toEqual(['mangeais', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient'])
    expect(forms('commencer', 'imparfait')).toEqual([
      'commençais',
      'commençais',
      'commençait',
      'commencions',
      'commenciez',
      'commençaient',
    ])
  })
})

describe('futur & conditionnel', () => {
  it('regular stems', () => {
    expect(forms('parler', 'futurSimple')).toEqual(['parlerai', 'parleras', 'parlera', 'parlerons', 'parlerez', 'parleront'])
    expect(forms('vendre', 'futurSimple')[0]).toBe('vendrai')
    expect(forms('finir', 'conditionnel')[5]).toBe('finiraient')
    expect(forms('boire', 'futurSimple')[0]).toBe('boirai')
    expect(forms('connaître', 'futurSimple')[0]).toBe('connaîtrai')
  })
  it('irregular stems', () => {
    expect(forms('être', 'futurSimple')[0]).toBe('serai')
    expect(forms('aller', 'futurSimple')[0]).toBe('irai')
    expect(forms('faire', 'conditionnel')[0]).toBe('ferais')
    expect(forms('venir', 'futurSimple')[0]).toBe('viendrai')
    expect(forms('devenir', 'futurSimple')[0]).toBe('deviendrai')
    expect(forms('voir', 'futurSimple')[0]).toBe('verrai')
    expect(forms('envoyer', 'futurSimple')[0]).toBe('enverrai')
    expect(forms('pouvoir', 'conditionnel')[0]).toBe('pourrais')
    expect(forms('recevoir', 'futurSimple')[0]).toBe('recevrai')
  })
  it('spelling-change stems', () => {
    expect(forms('acheter', 'futurSimple')[0]).toBe('achèterai')
    expect(forms('appeler', 'futurSimple')[0]).toBe('appellerai')
    expect(forms('nettoyer', 'futurSimple')[0]).toBe('nettoierai')
    expect(accepted('payer', 'futurSimple', 0)).toEqual(['paierai', 'payerai'])
    expect(accepted('préférer', 'futurSimple', 0)).toEqual(['préférerai', 'préfèrerai'])
    expect(forms('manger', 'futurSimple')[0]).toBe('mangerai')
  })
})

describe('subjonctif', () => {
  it('derives from ils + nous stems', () => {
    expect(forms('parler', 'subjonctif')).toEqual(['parle', 'parles', 'parle', 'parlions', 'parliez', 'parlent'])
    expect(forms('finir', 'subjonctif')[0]).toBe('finisse')
    expect(forms('prendre', 'subjonctif')).toEqual(['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent'])
    expect(forms('venir', 'subjonctif')[3]).toBe('venions')
    expect(forms('boire', 'subjonctif')).toEqual(['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent'])
    expect(forms('devoir', 'subjonctif')[0]).toBe('doive')
    expect(forms('voir', 'subjonctif')[3]).toBe('voyions')
    expect(forms('acheter', 'subjonctif')[0]).toBe('achète')
    expect(forms('acheter', 'subjonctif')[3]).toBe('achetions')
    expect(forms('manger', 'subjonctif')[3]).toBe('mangions')
    expect(forms('commencer', 'subjonctif')[3]).toBe('commencions')
  })
  it('irregular subjunctives', () => {
    expect(forms('être', 'subjonctif')[0]).toBe('sois')
    expect(forms('avoir', 'subjonctif')[2]).toBe('ait')
    expect(forms('faire', 'subjonctif')[0]).toBe('fasse')
    expect(forms('aller', 'subjonctif')[3]).toBe('allions')
    expect(forms('vouloir', 'subjonctif')[3]).toBe('voulions')
    expect(forms('savoir', 'subjonctif')[0]).toBe('sache')
  })
})

describe('impératif', () => {
  it('drops the -s for -er verbs, aller and ouvrir-type verbs', () => {
    expect(forms('parler', 'imperatif')).toEqual(['parle', 'parlons', 'parlez'])
    expect(forms('aller', 'imperatif')).toEqual(['va', 'allons', 'allez'])
    expect(forms('ouvrir', 'imperatif')[0]).toBe('ouvre')
    expect(forms('finir', 'imperatif')).toEqual(['finis', 'finissons', 'finissez'])
    expect(forms('être', 'imperatif')).toEqual(['sois', 'soyons', 'soyez'])
    expect(forms('faire', 'imperatif')[2]).toBe('faites')
  })
})

describe('compound tenses', () => {
  it('uses avoir by default', () => {
    expect(forms('parler', 'passeCompose')).toEqual([
      'ai parlé',
      'as parlé',
      'a parlé',
      'avons parlé',
      'avez parlé',
      'ont parlé',
    ])
    expect(forms('prendre', 'plusQueParfait')[0]).toBe('avais pris')
    expect(forms('faire', 'conditionnelPasse')[0]).toBe('aurais fait')
    expect(forms('être', 'passeCompose')[0]).toBe('ai été')
  })
  it('agrees with the subject after être', () => {
    expect(forms('aller', 'passeCompose')[0]).toBe('suis allé(e)')
    expect(forms('aller', 'passeCompose')[3]).toBe('sommes allé(e)s')
    expect(accepted('aller', 'passeCompose', 0)).toEqual(['suis allé', 'suis allée'])
    expect(accepted('aller', 'passeCompose', 2, 'm')).toEqual(['est allé'])
    expect(accepted('aller', 'passeCompose', 2, 'f')).toEqual(['est allée'])
    expect(accepted('partir', 'passeCompose', 5, 'f')).toEqual(['sont parties'])
    expect(accepted('venir', 'plusQueParfait', 3)).toEqual(['étions venus', 'étions venues'])
    expect(accepted('naître', 'passeCompose', 2, 'f')).toEqual(['est née'])
    expect(accepted('mourir', 'conditionnelPasse', 5, 'm')).toEqual(['seraient morts'])
    expect(accepted('descendre', 'passeCompose', 4)).toContain('êtes descendu')
  })
})

describe('pronouns', () => {
  it('elides before vowels and h', () => {
    expect(pronounFor('present', 0, 'aime')).toBe("j'")
    expect(pronounFor('present', 0, 'habite')).toBe("j'")
    expect(pronounFor('present', 0, 'parle')).toBe('je')
    expect(pronounFor('passeCompose', 0, 'ai parlé')).toBe("j'")
    expect(pronounFor('subjonctif', 0, 'aie')).toBe("que j'")
    expect(pronounFor('subjonctif', 2, 'parle', 'f')).toBe("qu'elle")
    expect(pronounFor('subjonctif', 3, 'parlions')).toBe('que nous')
    expect(joinPronoun("j'", 'ai')).toBe("j'ai")
    expect(joinPronoun('tu', 'as')).toBe('tu as')
  })
})

describe('whole catalogue', () => {
  it('conjugates every verb in every tense without empty forms', () => {
    for (const v of VERBS) {
      for (const t of TENSES) {
        if (!hasTense(v, t.id)) continue
        const cells = conjugate(v, t.id)
        expect(cells.length, `${v.inf} ${t.id}`).toBe(t.persons.length)
        for (const c of cells) {
          expect(c.display, `${v.inf} ${t.id} ${c.person}`).toMatch(/^[a-zàâäçéèêëîïôöûùüœ' ()]+$/)
          expect(c.m.length).toBeGreaterThan(0)
        }
      }
    }
  })
  it('has unique infinitives', () => {
    expect(new Set(VERBS.map((v) => v.inf)).size).toBe(VERBS.length)
  })
})

import { presentParticiple } from './conjugate'
describe('present participle', () => {
  it('uses the nous stem', () => {
    expect(presentParticiple(VERB_BY_INF['manger'])).toBe('mangeant')
    expect(presentParticiple(VERB_BY_INF['commencer'])).toBe('commençant')
    expect(presentParticiple(VERB_BY_INF['faire'])).toBe('faisant')
    expect(presentParticiple(VERB_BY_INF['être'])).toBe('étant')
    expect(presentParticiple(VERB_BY_INF['savoir'])).toBe('sachant')
  })
})
