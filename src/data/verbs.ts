import { AVOIR, ETRE, type Six, type VerbDef } from '../lib/conjugate'

/** Builds a family of verbs that conjugate like a base verb with a prefix (venir → devenir). */
function family(base: VerbDef, prefix: string, en: string, extra: Partial<VerbDef> = {}): VerbDef {
  const add = (f: string) => prefix + f
  return {
    ...base,
    inf: prefix + base.inf,
    en,
    essential: false,
    pp: base.pp ? add(base.pp) : undefined,
    present: base.present ? (base.present.map(add) as Six) : undefined,
    futStem: base.futStem ? add(base.futStem) : undefined,
    subj: base.subj ? (base.subj.map(add) as Six) : undefined,
    imp: base.imp ? (base.imp.map(add) as [string, string, string]) : undefined,
    ...extra,
  }
}

const venir: VerbDef = {
  inf: 'venir',
  en: 'to come',
  group: 'irr',
  aux: 'etre',
  pp: 'venu',
  present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
  futStem: 'viendr',
  essential: true,
}

const tenir: VerbDef = {
  inf: 'tenir',
  en: 'to hold',
  group: 'irr',
  pp: 'tenu',
  present: ['tiens', 'tiens', 'tient', 'tenons', 'tenez', 'tiennent'],
  futStem: 'tiendr',
}

const prendre: VerbDef = {
  inf: 'prendre',
  en: 'to take',
  group: 'irr',
  pp: 'pris',
  present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
  essential: true,
}

const mettre: VerbDef = {
  inf: 'mettre',
  en: 'to put, to put on',
  group: 'irr',
  pp: 'mis',
  present: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'],
  essential: true,
}

const partir: VerbDef = {
  inf: 'partir',
  en: 'to leave',
  group: 'irr',
  aux: 'etre',
  pp: 'parti',
  present: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'],
  essential: true,
}

const connaitre: VerbDef = {
  inf: 'connaître',
  en: 'to know (people, places)',
  group: 'irr',
  pp: 'connu',
  present: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'],
  essential: true,
}

const ouvrir: VerbDef = {
  inf: 'ouvrir',
  en: 'to open',
  group: 'irr',
  pp: 'ouvert',
  present: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'],
}

const ecrire: VerbDef = {
  inf: 'écrire',
  en: 'to write',
  group: 'irr',
  pp: 'écrit',
  present: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'],
}

const conduire: VerbDef = {
  inf: 'conduire',
  en: 'to drive',
  group: 'irr',
  pp: 'conduit',
  present: ['conduis', 'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent'],
}

export const VERBS: VerbDef[] = [
  // ── the big irregulars ──
  { ...ETRE, essential: true },
  { ...AVOIR, essential: true },
  {
    inf: 'aller',
    en: 'to go',
    group: 'irr',
    aux: 'etre',
    pp: 'allé',
    present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    futStem: 'ir',
    subj: ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'],
    imp: ['va', 'allons', 'allez'],
    essential: true,
  },
  {
    inf: 'faire',
    en: 'to do, to make',
    group: 'irr',
    pp: 'fait',
    present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    futStem: 'fer',
    subj: ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent'],
    essential: true,
  },
  {
    inf: 'dire',
    en: 'to say, to tell',
    group: 'irr',
    pp: 'dit',
    present: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    essential: true,
  },
  {
    inf: 'pouvoir',
    en: 'can, to be able to',
    group: 'irr',
    pp: 'pu',
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    futStem: 'pourr',
    subj: ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent'],
    imp: ['—', '—', '—'],
    essential: true,
  },
  {
    inf: 'vouloir',
    en: 'to want',
    group: 'irr',
    pp: 'voulu',
    present: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    futStem: 'voudr',
    subj: ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'],
    imp: ['veuille', 'veuillons', 'veuillez'],
    essential: true,
  },
  {
    inf: 'savoir',
    en: 'to know (facts, how to)',
    group: 'irr',
    pp: 'su',
    present: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'],
    futStem: 'saur',
    subj: ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent'],
    imp: ['sache', 'sachons', 'sachez'],
    essential: true,
  },
  {
    inf: 'devoir',
    en: 'must, to have to, to owe',
    group: 'irr',
    pp: 'dû',
    present: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'],
    futStem: 'devr',
    imp: ['—', '—', '—'],
    essential: true,
  },
  {
    inf: 'voir',
    en: 'to see',
    group: 'irr',
    pp: 'vu',
    present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    futStem: 'verr',
    essential: true,
  },
  venir,
  family(venir, 'de', 'to become'),
  family(venir, 're', 'to come back'),
  tenir,
  family(tenir, 'ob', 'to obtain'),
  family(tenir, 'appar', 'to belong'),
  family(tenir, 'sou', 'to support'),
  prendre,
  family(prendre, 'com', 'to understand'),
  family(prendre, 'ap', 'to learn'),
  family(prendre, 'sur', 'to surprise'),
  mettre,
  family(mettre, 'per', 'to allow'),
  family(mettre, 'pro', 'to promise'),
  partir,
  {
    inf: 'sortir',
    en: 'to go out',
    group: 'irr',
    aux: 'etre',
    pp: 'sorti',
    present: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'],
  },
  {
    inf: 'dormir',
    en: 'to sleep',
    group: 'irr',
    pp: 'dormi',
    present: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'],
  },
  {
    inf: 'sentir',
    en: 'to feel, to smell',
    group: 'irr',
    pp: 'senti',
    present: ['sens', 'sens', 'sent', 'sentons', 'sentez', 'sentent'],
  },
  {
    inf: 'servir',
    en: 'to serve',
    group: 'irr',
    pp: 'servi',
    present: ['sers', 'sers', 'sert', 'servons', 'servez', 'servent'],
  },
  connaitre,
  family(connaitre, 're', 'to recognize'),
  {
    inf: 'paraître',
    en: 'to seem, to appear',
    group: 'irr',
    pp: 'paru',
    present: ['parais', 'parais', 'paraît', 'paraissons', 'paraissez', 'paraissent'],
  },
  {
    inf: 'naître',
    en: 'to be born',
    group: 'irr',
    aux: 'etre',
    pp: 'né',
    present: ['nais', 'nais', 'naît', 'naissons', 'naissez', 'naissent'],
  },
  {
    inf: 'mourir',
    en: 'to die',
    group: 'irr',
    aux: 'etre',
    pp: 'mort',
    present: ['meurs', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent'],
    futStem: 'mourr',
  },
  {
    inf: 'croire',
    en: 'to believe',
    group: 'irr',
    pp: 'cru',
    present: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'],
  },
  {
    inf: 'boire',
    en: 'to drink',
    group: 'irr',
    pp: 'bu',
    present: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'],
  },
  {
    inf: 'recevoir',
    en: 'to receive',
    group: 'irr',
    pp: 'reçu',
    present: ['reçois', 'reçois', 'reçoit', 'recevons', 'recevez', 'reçoivent'],
    futStem: 'recevr',
  },
  ecrire,
  family(ecrire, 'd', 'to describe'),
  {
    inf: 'lire',
    en: 'to read',
    group: 'irr',
    pp: 'lu',
    present: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'],
  },
  {
    inf: 'vivre',
    en: 'to live',
    group: 'irr',
    pp: 'vécu',
    present: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'],
  },
  {
    inf: 'suivre',
    en: 'to follow',
    group: 'irr',
    pp: 'suivi',
    present: ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'],
  },
  {
    inf: 'courir',
    en: 'to run',
    group: 'irr',
    pp: 'couru',
    present: ['cours', 'cours', 'court', 'courons', 'courez', 'courent'],
    futStem: 'courr',
  },
  ouvrir,
  family(ouvrir, 'déc', 'to discover', { pp: 'découvert' }),
  {
    inf: 'offrir',
    en: 'to offer, to give (a gift)',
    group: 'irr',
    pp: 'offert',
    present: ['offre', 'offres', 'offre', 'offrons', 'offrez', 'offrent'],
  },
  conduire,
  family(conduire, '', 'to produce', { inf: 'produire', pp: 'produit', present: ['produis', 'produis', 'produit', 'produisons', 'produisez', 'produisent'] }),
  family(conduire, '', 'to translate', { inf: 'traduire', pp: 'traduit', present: ['traduis', 'traduis', 'traduit', 'traduisons', 'traduisez', 'traduisent'] }),
  {
    inf: 'rire',
    en: 'to laugh',
    group: 'irr',
    pp: 'ri',
    present: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'],
  },
  {
    inf: 'craindre',
    en: 'to fear',
    group: 'irr',
    pp: 'craint',
    present: ['crains', 'crains', 'craint', 'craignons', 'craignez', 'craignent'],
  },
  {
    inf: 'éteindre',
    en: 'to switch off',
    group: 'irr',
    pp: 'éteint',
    present: ['éteins', 'éteins', 'éteint', 'éteignons', 'éteignez', 'éteignent'],
  },
  {
    inf: 'plaire',
    en: 'to please',
    group: 'irr',
    pp: 'plu',
    present: ['plais', 'plais', 'plaît', 'plaisons', 'plaisez', 'plaisent'],
  },
  {
    inf: 'envoyer',
    en: 'to send',
    group: 'er',
    futStem: 'enverr',
  },

  // ── regular -er (incl. spelling-change verbs) ──
  { inf: 'parler', en: 'to speak, to talk', group: 'er', essential: true },
  { inf: 'aimer', en: 'to like, to love', group: 'er', essential: true },
  { inf: 'trouver', en: 'to find', group: 'er', essential: true },
  { inf: 'donner', en: 'to give', group: 'er', essential: true },
  { inf: 'penser', en: 'to think', group: 'er', essential: true },
  { inf: 'passer', en: 'to pass, to spend (time)', group: 'er' },
  { inf: 'demander', en: 'to ask', group: 'er' },
  { inf: 'regarder', en: 'to watch, to look at', group: 'er' },
  { inf: 'travailler', en: 'to work', group: 'er' },
  { inf: 'habiter', en: 'to live (reside)', group: 'er' },
  { inf: 'écouter', en: 'to listen', group: 'er' },
  { inf: 'jouer', en: 'to play', group: 'er' },
  { inf: 'chercher', en: 'to look for', group: 'er' },
  { inf: 'rester', en: 'to stay', group: 'er', aux: 'etre' },
  { inf: 'arriver', en: 'to arrive, to happen', group: 'er', aux: 'etre' },
  { inf: 'entrer', en: 'to enter', group: 'er', aux: 'etre' },
  { inf: 'rentrer', en: 'to go home, to return', group: 'er', aux: 'etre' },
  { inf: 'tomber', en: 'to fall', group: 'er', aux: 'etre' },
  { inf: 'monter', en: 'to go up', group: 'er', aux: 'etre' },
  { inf: 'retourner', en: 'to return, to go back', group: 'er', aux: 'etre' },
  { inf: 'oublier', en: 'to forget', group: 'er' },
  { inf: 'étudier', en: 'to study', group: 'er' },
  { inf: 'manger', en: 'to eat', group: 'er', essential: true },
  { inf: 'voyager', en: 'to travel', group: 'er' },
  { inf: 'commencer', en: 'to begin, to start', group: 'er' },
  { inf: 'acheter', en: 'to buy', group: 'er' },
  { inf: 'lever', en: 'to raise, to lift', group: 'er' },
  { inf: 'amener', en: 'to bring (someone)', group: 'er' },
  { inf: 'préférer', en: 'to prefer', group: 'er' },
  { inf: 'espérer', en: 'to hope', group: 'er' },
  { inf: 'répéter', en: 'to repeat', group: 'er' },
  { inf: 'appeler', en: 'to call', group: 'er' },
  { inf: 'jeter', en: 'to throw (away)', group: 'er' },
  { inf: 'payer', en: 'to pay', group: 'er' },
  { inf: 'essayer', en: 'to try', group: 'er' },
  { inf: 'nettoyer', en: 'to clean', group: 'er' },

  // ── regular -ir ──
  { inf: 'finir', en: 'to finish', group: 'ir' },
  { inf: 'choisir', en: 'to choose', group: 'ir' },
  { inf: 'réussir', en: 'to succeed, to pass', group: 'ir' },
  { inf: 'réfléchir', en: 'to think, to reflect', group: 'ir' },
  { inf: 'grandir', en: 'to grow up', group: 'ir' },
  { inf: 'remplir', en: 'to fill (in)', group: 'ir' },

  // ── regular -re ──
  { inf: 'attendre', en: 'to wait (for)', group: 're' },
  { inf: 'entendre', en: 'to hear', group: 're' },
  { inf: 'répondre', en: 'to answer', group: 're' },
  { inf: 'vendre', en: 'to sell', group: 're' },
  { inf: 'perdre', en: 'to lose', group: 're' },
  { inf: 'rendre', en: 'to give back', group: 're' },
  { inf: 'descendre', en: 'to go down', group: 're', aux: 'etre' },
]

export const VERB_BY_INF: Record<string, VerbDef> = Object.fromEntries(VERBS.map((v) => [v.inf, v]))

export type VerbSet = 'essential' | 'irregular' | 'regular' | 'all'

export const VERB_SETS: { id: VerbSet; label: string; description: string }[] = [
  { id: 'essential', label: 'Essential', description: 'The most common verbs, used every day' },
  { id: 'irregular', label: 'Irregular', description: 'All irregular verbs' },
  { id: 'regular', label: 'Regular', description: '-er, -ir and -re patterns, incl. spelling changes' },
  { id: 'all', label: 'All verbs', description: `Every verb in the app (${VERBS.length})` },
]

export function verbsInSet(set: VerbSet): VerbDef[] {
  switch (set) {
    case 'essential':
      return VERBS.filter((v) => v.essential)
    case 'irregular':
      return VERBS.filter((v) => v.group === 'irr')
    case 'regular':
      return VERBS.filter((v) => v.group !== 'irr')
    default:
      return VERBS
  }
}

/** Verbs where some tenses don't exist (pouvoir/devoir have no usable imperative). */
export function hasTense(v: VerbDef, tense: string): boolean {
  if (tense === 'imperatif' && v.imp?.[0] === '—') return false
  return true
}
