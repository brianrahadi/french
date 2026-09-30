/** Pronunciation tips, matched against words the speech recogniser didn't catch. */
export interface SoundTip {
  id: string
  label: string
  /** Tested against the lower-case word, accents included. */
  test: RegExp
  tip: string
}

export const SOUND_TIPS: SoundTip[] = [
  {
    id: 'u',
    label: 'u',
    test: /(^|[^oaeq])u(?![nm](?![aeiouy])|i)/,
    tip: 'u (tu, vu, rue): say “ee” and round your lips tightly as if to whistle — it isn’t “oo”.',
  },
  { id: 'ou', label: 'ou', test: /ou/, tip: 'ou (vous, tout, roue): like the “oo” in “food”, lips pushed forward.' },
  {
    id: 'an',
    label: 'an / en',
    test: /(an|am|en|em)(?![aeiouyéèên])/,
    tip: 'an / en (grand, temps): an open nasal “ah” through the nose — don’t pronounce the n.',
  },
  { id: 'on', label: 'on', test: /(on|om)(?![aeiouyéèên])/, tip: 'on (bon, nom): a rounded nasal “oh”, lips forward — no n at the end.' },
  {
    id: 'in',
    label: 'in / un',
    test: /(in|im|ain|aim|ein|un|um)(?![aeiouyéèên])/,
    tip: 'in / ain / un (vin, pain, un): a nasal “a” as in “bank” without the k — mouth wide, no n.',
  },
  { id: 'eu', label: 'eu', test: /(eu|œu|œ)/, tip: 'eu / œu (deux, sœur): say “e” (as in “bed”) with your lips rounded.' },
  { id: 'oi', label: 'oi', test: /oi/, tip: 'oi (moi, voiture) sounds like “wa”.' },
  { id: 'gn', label: 'gn', test: /gn/, tip: 'gn (montagne) is like the “ny” in “canyon”.' },
  { id: 'ille', label: 'ille', test: /ill(?!e?$)|ille/, tip: '-ille (fille, famille) is usually “ee-y” — the l’s are silent (except in ville, mille).' },
  { id: 'e-accent', label: 'é', test: /(é|er$|ez$)/, tip: 'é, -er, -ez: a short, tense “ay” without the glide of English “day”.' },
  { id: 'e-open', label: 'è / ê', test: /(è|ê|ai|ei)/, tip: 'è, ê, ai: an open “eh” as in “bed”.' },
  {
    id: 'r',
    label: 'r',
    test: /r/,
    tip: 'The French r is made at the back of the throat, like a soft gargle — the tip of the tongue stays behind the bottom teeth.',
  },
  { id: 'h', label: 'h', test: /^h/, tip: 'h is always silent in French.' },
  { id: 'th', label: 'th', test: /th/, tip: 'th sounds just like t (thé = “tay”).' },
  { id: 'qu', label: 'qu', test: /qu/, tip: 'qu sounds like k — no “kw”.' },
  {
    id: 'final',
    label: 'silent ending',
    test: /(s|t|d|x|z|p|ent)$/,
    tip: 'Final consonants are usually silent (petit, grand, vous, ils parlent) — but c, r, f and l often are pronounced.',
  },
  { id: 'j', label: 'j / g', test: /(j|g[eiy])/, tip: 'j and soft g (je, rouge) sound like the “s” in “measure”.' },
]

/** Up to `max` distinct tips for the words that weren't heard. */
export function tipsFor(words: string[], max = 2): SoundTip[] {
  const out: SoundTip[] = []
  for (const w of words) {
    const lw = w.toLowerCase().replace(/^[a-z]+['’]/, '')
    const tip = SOUND_TIPS.find((t) => t.test.test(lw) && !out.includes(t))
    if (tip) out.push(tip)
    if (out.length >= max) break
  }
  return out
}
