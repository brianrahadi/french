import type { Lesson } from '../types'

export const B2_LESSONS: Lesson[] = [
  {
    id: 'plus-que-parfait',
    level: 'B2',
    title: 'Plus-que-parfait & past conditional',
    titleFr: 'Le plus-que-parfait et le conditionnel passé',
    summary: 'Talk about the past before the past — and regrets about what could have been.',
    minutes: 10,
    sections: [
      {
        heading: 'Plus-que-parfait: had done',
        blocks: [
          { type: 'p', text: '**imparfait of avoir / être + past participle**. Same auxiliary and agreement rules as the passé composé.' },
          {
            type: 'examples',
            items: [
              { fr: 'Quand je suis arrivé, le film avait déjà commencé.', en: 'When I arrived, the film had already started.' },
              { fr: 'Elle était partie avant midi.', en: 'She had left before noon.' },
              { fr: 'Il m’a dit qu’il avait perdu ses clés.', en: 'He told me he had lost his keys.' },
            ],
          },
        ],
      },
      {
        heading: 'Conditionnel passé: would have done',
        blocks: [
          { type: 'p', text: '**conditional of avoir / être + past participle**.' },
          {
            type: 'examples',
            items: [
              { fr: 'J’aurais aimé venir.', en: 'I would have liked to come.' },
              { fr: 'Nous serions partis plus tôt.', en: 'We would have left earlier.' },
              { fr: 'Tu aurais dû me le dire !', en: 'You should have told me!' },
              { fr: 'Tu aurais pu m’appeler.', en: 'You could have called me.' },
            ],
          },
        ],
      },
      {
        heading: 'Si clauses about the past',
        blocks: [
          {
            type: 'table',
            head: ['si + …', 'Main clause', 'Example'],
            rows: [
              ['présent', 'futur', 'Si tu travailles, tu réussiras.'],
              ['imparfait', 'conditionnel présent', 'Si tu travaillais, tu réussirais.'],
              ['plus-que-parfait', 'conditionnel passé', 'Si tu avais travaillé, tu aurais réussi.'],
            ],
          },
          { type: 'p', text: 'Mixed: past condition, present result — *Si j’avais pris le parapluie, je ne serais pas trempé maintenant.*' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Quand je suis arrivé, ils ___.', hint: 'déjà + manger', answers: ['avaient déjà mangé'], en: 'When I arrived, they had already eaten.', explain: 'The earlier past → plus-que-parfait. déjà sits between the auxiliary and the participle.' },
      { type: 'cloze', sentence: 'Elle m’a dit qu’elle ___ en retard.', hint: 'arriver', answers: ['était arrivée'], en: 'She told me she had arrived late.', explain: 'arriver → être + agreement.' },
      { type: 'cloze', sentence: 'Si j’avais su, je ___.', hint: 'venir', answers: ['serais venu', 'serais venue'], en: 'If I had known, I would have come.', explain: 'si + plus-que-parfait → conditionnel passé.' },
      { type: 'cloze', sentence: 'Si tu ___ plus tôt, tu aurais eu le train.', hint: 'partir', answers: ['étais parti', 'étais partie'], en: 'If you had left earlier, you would have caught the train.', explain: 'Unreal past condition → plus-que-parfait.' },
      { type: 'cloze', sentence: 'Tu ___ me prévenir !', hint: 'devoir', answers: ['aurais dû'], en: 'You should have warned me!', explain: 'should have = conditionnel passé of devoir.' },
      { type: 'cloze', sentence: 'Nous ___ aimé voir ce film.', hint: 'avoir', answers: ['aurions'], en: 'We would have liked to see that film.', explain: 'nous aurions + participle.' },
      { type: 'mcq', prompt: 'If I had studied, I would have passed.', options: ['Si j’avais étudié, j’aurais réussi.', 'Si j’aurais étudié, j’aurais réussi.', 'Si j’étudiais, j’aurais réussi.'], answer: 0, explain: 'Never conditional after si.' },
      { type: 'mcq', prompt: '“Tu aurais pu m’appeler” expresses…', options: ['a prediction', 'a reproach', 'a habit'], answer: 1, explain: 'You could have called me → reproach.' },
      { type: 'transform', instruction: 'Move the sentence into the past (si + plus-que-parfait).', source: 'Si tu venais, on s’amuserait.', answers: ['Si tu étais venu, on se serait amusés', 'Si tu étais venue, on se serait amusés', 'Si tu étais venu, on se serait amusé', 'Si tu étais venue, on se serait amusées'] },
      { type: 'translate', en: 'I would have liked to come.', answers: ['J’aurais aimé venir', 'J’aurais voulu venir'] },
    ],
  },

  {
    id: 'subjonctif-vs-indicatif',
    level: 'B2',
    title: 'Subjunctive or indicative?',
    titleFr: 'Subjonctif ou indicatif ?',
    summary: 'Opinion, certainty, probability and conjunctions — the tricky cases.',
    minutes: 10,
    sections: [
      {
        heading: 'Opinion and certainty',
        blocks: [
          {
            type: 'table',
            head: ['Indicative (fact, belief)', 'Subjunctive (doubt, denial)'],
            rows: [
              ['Je pense qu’il vient.', 'Je ne pense pas qu’il vienne.'],
              ['Je crois que c’est vrai.', 'Crois-tu que ce soit vrai ?'],
              ['Il est sûr / certain / évident que…', 'Il n’est pas sûr que… / Je doute que…'],
              ['Il est probable que… (likely)', 'Il est possible que… (merely possible)'],
              ['Il me semble que…', 'Il semble que… (usually)'],
            ],
          },
          { type: 'tip', text: '**espérer que** takes the indicative: *J’espère que tu **vas** bien.*' },
        ],
      },
      {
        heading: 'Conjunctions',
        blocks: [
          {
            type: 'table',
            head: ['+ subjunctive', '+ indicative'],
            rows: [
              ['bien que, quoique (although)', 'parce que, puisque (because)'],
              ['pour que, afin que (so that)', 'pendant que, alors que (while)'],
              ['avant que (before)', 'après que (after) — indicative!'],
              ['jusqu’à ce que (until)', 'depuis que (since)'],
              ['à condition que, pourvu que', 'si, même si'],
              ['à moins que, de peur que, sans que', 'dès que, aussitôt que'],
            ],
          },
          { type: 'warn', text: '**après que** takes the indicative in careful French: *après qu’il **est** parti*. **avant que** takes the subjunctive: *avant qu’il **parte***.' },
        ],
      },
      {
        heading: 'Superlatives and “the only”',
        blocks: [
          { type: 'p', text: 'After a superlative or **le seul, le premier, le dernier, l’unique** + qui/que, the subjunctive expresses a subjective judgment:' },
          { type: 'examples', items: [{ fr: 'C’est le meilleur livre que j’aie jamais lu.', en: 'It’s the best book I’ve ever read.' }] },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Je ne pense pas qu’il ___ raison.', hint: 'avoir', answers: ['ait'], en: 'I don’t think he’s right.', explain: 'Negative opinion → subjunctive.' },
      { type: 'cloze', sentence: 'Je pense qu’il ___ raison.', hint: 'avoir', answers: ['a'], en: 'I think he’s right.', explain: 'Affirmative opinion → indicative.' },
      { type: 'cloze', sentence: 'J’espère que tu ___ bien.', hint: 'aller', answers: ['vas'], en: 'I hope you’re well.', explain: 'espérer que → indicative.' },
      { type: 'cloze', sentence: 'Il est possible qu’il ___ en retard.', hint: 'être', answers: ['soit'], en: 'He may be late.', explain: 'Possibility → subjunctive.' },
      { type: 'cloze', sentence: 'Il est probable qu’il ___ en retard.', hint: 'être', answers: ['est', 'sera'], en: 'He’s probably late / will probably be late.', explain: 'Probability → indicative.' },
      { type: 'cloze', sentence: 'Je t’attends jusqu’à ce que tu ___.', hint: 'revenir', answers: ['reviennes'], en: 'I’ll wait for you until you come back.', explain: 'jusqu’à ce que → subjunctive.' },
      { type: 'cloze', sentence: 'Partons avant qu’il ___.', hint: 'pleuvoir', answers: ['pleuve'], en: 'Let’s leave before it rains.', explain: 'avant que → subjunctive.' },
      { type: 'cloze', sentence: 'Il est sorti après que nous ___.', hint: 'partir', answers: ['sommes partis', 'sommes parties'], en: 'He went out after we left.', explain: 'après que → indicative.' },
      { type: 'mcq', prompt: 'Which conjunction takes the indicative?', options: ['bien que', 'pour que', 'parce que', 'à moins que'], answer: 2, explain: 'parce que states a fact → indicative.' },
      { type: 'cloze', sentence: 'C’est le plus beau film que j’___ jamais vu.', hint: 'avoir', answers: ['aie'], en: 'It’s the most beautiful film I’ve ever seen.', explain: 'Superlative + que → subjunctive (j’aie vu).' },
      { type: 'translate', en: 'Although it is raining, we are going out.', answers: ['Bien qu’il pleuve, nous sortons', 'Bien qu’il pleuve, on sort', 'Quoiqu’il pleuve, nous sortons'] },
    ],
  },

  {
    id: 'lequel',
    level: 'B2',
    title: 'Compound relative pronouns',
    titleFr: 'Lequel, auquel, duquel',
    summary: 'After prepositions: the table on which…, the reasons for which…',
    minutes: 9,
    sections: [
      {
        heading: 'The forms',
        blocks: [
          {
            type: 'table',
            head: ['', 'Masc. sg.', 'Fem. sg.', 'Masc. pl.', 'Fem. pl.'],
            rows: [
              ['(preposition +)', 'lequel', 'laquelle', 'lesquels', 'lesquelles'],
              ['à +', 'auquel', 'à laquelle', 'auxquels', 'auxquelles'],
              ['de + (after a compound preposition)', 'duquel', 'de laquelle', 'desquels', 'desquelles'],
            ],
          },
          { type: 'p', text: 'Use lequel after a **preposition** when referring to a **thing**. It agrees with the noun it replaces.' },
        ],
      },
      {
        heading: 'Examples',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'La table sur laquelle j’ai posé mes clés.', en: 'The table on which I put my keys.' },
              { fr: 'Les raisons pour lesquelles je pars.', en: 'The reasons why (for which) I’m leaving.' },
              { fr: 'Le projet auquel je travaille.', en: 'The project I’m working on (travailler à).' },
              { fr: 'Le parc près duquel j’habite.', en: 'The park near which I live (près de).' },
            ],
          },
          { type: 'tip', text: 'For **people**, prefer **qui** after a preposition: *la personne **avec qui** je travaille*, *l’ami **à qui** j’ai écrit*.' },
          { type: 'warn', text: 'With plain **de** (parler de, avoir besoin de), use **dont**, not duquel. duquel is for compound prepositions: près de, à côté de, au milieu de, en face de…' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Voici le stylo avec ___ j’écris.', answers: ['lequel'], en: 'Here is the pen I write with.', explain: 'stylo (m. sg.) after avec → lequel.' },
      { type: 'cloze', sentence: 'La raison pour ___ je suis venu est simple.', answers: ['laquelle'], en: 'The reason why I came is simple.', explain: 'raison (f. sg.) → laquelle.' },
      { type: 'cloze', sentence: 'Le concours ___ je participe est difficile.', answers: ['auquel'], en: 'The competition I’m taking part in is difficult.', explain: 'participer à + le → auquel.' },
      { type: 'cloze', sentence: 'Les questions ___ tu as répondu étaient faciles.', answers: ['auxquelles'], en: 'The questions you answered were easy.', explain: 'répondre à + questions (f. pl.) → auxquelles.' },
      { type: 'cloze', sentence: 'Le restaurant à côté ___ j’habite est excellent.', answers: ['duquel'], en: 'The restaurant next to which I live is excellent.', explain: 'à côté de + le → duquel.' },
      { type: 'cloze', sentence: 'Les amis avec ___ je voyage sont drôles.', answers: ['qui', 'lesquels'], en: 'The friends I travel with are funny.', explain: 'For people, qui is preferred (lesquels is also correct).' },
      { type: 'mcq', prompt: 'The film I’m talking about.', options: ['Le film duquel je parle.', 'Le film dont je parle.', 'Le film lequel je parle.'], answer: 1, explain: 'parler de → dont.' },
      { type: 'mcq', prompt: 'The boxes in which…', options: ['Les boîtes dans lesquels…', 'Les boîtes dans lesquelles…', 'Les boîtes dans laquelle…'], answer: 1, explain: 'boîtes: feminine plural.' },
      { type: 'transform', instruction: 'Join the sentences with a compound relative pronoun.', source: 'C’est une idée. Je n’avais jamais pensé à cette idée.', answers: ['C’est une idée à laquelle je n’avais jamais pensé'] },
      { type: 'translate', en: 'The table on which I put the book.', answers: ['La table sur laquelle j’ai posé le livre', 'La table sur laquelle j’ai mis le livre', 'La table sur laquelle je pose le livre', 'La table sur laquelle je mets le livre'] },
    ],
  },

  {
    id: 'passive',
    level: 'B2',
    title: 'The passive voice',
    titleFr: 'La voix passive',
    summary: 'être + past participle — and the more natural alternatives French often prefers.',
    minutes: 8,
    sections: [
      {
        heading: 'Formation',
        blocks: [
          { type: 'p', text: '**être** in the needed tense + **past participle** (agreeing with the subject). The agent is introduced by **par** (sometimes **de** for states/feelings).' },
          {
            type: 'examples',
            items: [
              { fr: 'Le chat mange la souris. → La souris est mangée par le chat.', en: 'Present' },
              { fr: 'Ce roman a été écrit par Camus.', en: 'Passé composé: a été + participle' },
              { fr: 'Les résultats seront publiés demain.', en: 'Future' },
              { fr: 'Elle est aimée de tous.', en: 'de with verbs of feeling' },
            ],
          },
        ],
      },
      {
        heading: 'Alternatives French prefers',
        blocks: [
          {
            type: 'list',
            items: [
              '**on + active verb**: *On a volé ma voiture.* (My car was stolen.)',
              '**se + verb** for general truths: *Le vin blanc se boit frais.* (White wine is drunk chilled.) *Ça ne se fait pas.* (That isn’t done.)',
              '**se faire + infinitive** when something happens to someone: *Il s’est fait voler son portefeuille.* (He had his wallet stolen.)',
            ],
          },
          { type: 'warn', text: 'Only verbs with a **direct object** can become passive. ~~Il a été répondu~~ is impossible; use *on lui a répondu*.' },
        ],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Rewrite in the passive voice.', source: 'Le chef prépare le repas.', answers: ['Le repas est préparé par le chef'] },
      { type: 'transform', instruction: 'Rewrite in the passive voice.', source: 'Un architecte célèbre a construit cette maison.', answers: ['Cette maison a été construite par un architecte célèbre'], explain: 'maison is feminine → construite.' },
      { type: 'cloze', sentence: 'Les lettres ___ demain.', hint: 'envoyer, futur passif', answers: ['seront envoyées'], en: 'The letters will be sent tomorrow.', explain: 'Future of être + agreement (feminine plural).' },
      { type: 'cloze', sentence: 'Ce tableau ___ par Monet.', hint: 'peindre, passé composé passif', answers: ['a été peint'], en: 'This painting was painted by Monet.', explain: 'a été + peint.' },
      { type: 'cloze', sentence: 'Ce professeur est respecté ___ ses élèves.', answers: ['de', 'par'], en: 'This teacher is respected by his students.', explain: 'de is common with verbs of feeling (par is also accepted).' },
      { type: 'transform', instruction: 'Rewrite with on.', source: 'Ma voiture a été volée.', answers: ['On a volé ma voiture'] },
      { type: 'mcq', prompt: 'White wine is served chilled.', options: ['Le vin blanc se sert frais.', 'Le vin blanc est servi par frais.', 'On est servi le vin blanc frais.'], answer: 0, explain: 'Pronominal passive for general rules.' },
      { type: 'mcq', prompt: 'She had her bag stolen.', options: ['Elle a été volée son sac.', 'Elle s’est fait voler son sac.', 'Son sac s’est volé.'], answer: 1, explain: 'se faire + infinitive.' },
      { type: 'mcq', prompt: 'Which verb cannot be made passive?', options: ['manger', 'construire', 'téléphoner (à)', 'écrire'], answer: 2, explain: 'téléphoner à has no direct object.' },
      { type: 'translate', en: 'The museum was built in 1900.', answers: ['Le musée a été construit en 1900', 'On a construit le musée en 1900', 'Le musée fut construit en 1900'] },
    ],
  },

  {
    id: 'gerondif',
    level: 'B2',
    title: 'Gérondif & present participle',
    titleFr: 'Le gérondif et le participe présent',
    summary: 'en parlant, ayant fini… how French expresses “-ing”.',
    minutes: 8,
    sections: [
      {
        heading: 'Formation',
        blocks: [
          { type: 'p', text: 'Take the **nous** form, remove **-ons**, add **-ant**: *nous parlons → parlant, nous finissons → finissant, nous faisons → faisant*.' },
          { type: 'p', text: 'Three irregulars: **être → étant, avoir → ayant, savoir → sachant**.' },
        ],
      },
      {
        heading: 'Gérondif: en + -ant',
        blocks: [
          { type: 'p', text: 'Same subject as the main verb. It expresses:' },
          {
            type: 'examples',
            items: [
              { fr: 'Il chante en cuisinant.', en: 'Simultaneity: He sings while cooking.' },
              { fr: 'C’est en forgeant qu’on devient forgeron.', en: 'Means: Practice makes perfect.' },
              { fr: 'En partant maintenant, tu arriveras à l’heure.', en: 'Condition: If you leave now…' },
              { fr: 'Tout en étant riche, il vit simplement.', en: 'Contrast (tout en): Although rich…' },
            ],
          },
        ],
      },
      {
        heading: 'Participe présent (without en)',
        blocks: [
          { type: 'p', text: 'More written, often replacing **qui + verb** or giving a cause. It does not agree.' },
          {
            type: 'examples',
            items: [
              { fr: 'On cherche un assistant parlant anglais.', en: '= qui parle anglais' },
              { fr: 'Étant malade, il n’est pas venu.', en: 'Being ill, he didn’t come.' },
              { fr: 'Ayant fini son travail, elle est partie.', en: 'Having finished her work, she left.' },
            ],
          },
          { type: 'warn', text: 'English “-ing” after prepositions becomes an **infinitive** in French: *avant de partir* (before leaving), *sans dire* (without saying). And “I like swimming” → *J’aime nager*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Il écoute de la musique ___.', hint: 'travailler, gérondif', answers: ['en travaillant'], en: 'He listens to music while working.', explain: 'en + nous-stem + -ant.' },
      { type: 'cloze', sentence: 'C’est en ___ qu’on apprend.', hint: 'lire', answers: ['lisant'], en: 'It’s by reading that you learn.', explain: 'nous lisons → lisant.' },
      { type: 'cloze', sentence: 'En ___ tôt, tu éviteras les bouchons.', hint: 'partir', answers: ['partant'], en: 'If you leave early, you’ll avoid traffic.', explain: 'Gérondif of condition.' },
      { type: 'cloze', sentence: '___ fatigué, il s’est couché tôt.', hint: 'être', answers: ['Étant'], en: 'Being tired, he went to bed early.', explain: 'être → étant (irregular).' },
      { type: 'cloze', sentence: '___ fini, elle est sortie.', hint: 'avoir', answers: ['Ayant'], en: 'Having finished, she went out.', explain: 'Compound participle: ayant + participle.' },
      { type: 'cloze', sentence: 'Il est parti sans ___ au revoir.', hint: 'dire', answers: ['dire'], en: 'He left without saying goodbye.', explain: 'sans + infinitive (not -ant).' },
      { type: 'cloze', sentence: 'Nous cherchons un vendeur ___ l’espagnol.', hint: 'connaître', answers: ['connaissant'], en: 'We’re looking for a salesperson who knows Spanish.', explain: 'Participe présent = qui connaît.' },
      { type: 'mcq', prompt: 'I like cooking.', options: ['J’aime cuisinant.', 'J’aime en cuisinant.', 'J’aime cuisiner.'], answer: 2, explain: 'After aimer: infinitive.' },
      { type: 'mcq', prompt: 'Present participle of “savoir”?', options: ['savant', 'sachant', 'saisant'], answer: 1, explain: 'savoir → sachant (irregular).' },
      { type: 'translate', en: 'She fell while running.', answers: ['Elle est tombée en courant'] },
    ],
  },

  {
    id: 'connectors',
    level: 'B2',
    title: 'Expressing cause, consequence & concession',
    titleFr: 'Cause, conséquence et concession',
    summary: 'Structure an argument like a native: grâce à, puisque, si bien que, bien que, pourtant…',
    minutes: 10,
    sections: [
      {
        heading: 'Cause',
        blocks: [
          {
            type: 'table',
            head: ['Connector', 'Nuance', 'Example'],
            rows: [
              ['parce que', 'neutral, answers “pourquoi ?”', 'Je reste parce que je suis malade.'],
              ['puisque', 'the cause is obvious / known', 'Puisque tu es là, aide-moi.'],
              ['comme', 'at the start of the sentence', 'Comme il pleuvait, on est restés.'],
              ['car', 'formal, written, never first', 'Il est absent, car il est malade.'],
              ['grâce à + noun', 'positive cause', 'Grâce à toi, j’ai réussi.'],
              ['à cause de + noun', 'negative cause', 'À cause de la grève, j’ai raté l’avion.'],
              ['étant donné que / vu que', 'given that', 'Vu qu’il est tard, rentrons.'],
            ],
          },
        ],
      },
      {
        heading: 'Consequence',
        blocks: [
          {
            type: 'table',
            head: ['Connector', 'Example'],
            rows: [
              ['donc, alors', 'Il pleut, donc je prends un parapluie.'],
              ['c’est pourquoi', 'Je suis fatigué, c’est pourquoi je reste.'],
              ['si bien que, de sorte que (+ indicative)', 'Il a trop mangé, si bien qu’il est malade.'],
              ['si / tellement … que', 'Il fait si chaud qu’on ne peut pas dormir.'],
              ['par conséquent', 'Le vol est annulé ; par conséquent, nous restons.'],
            ],
          },
        ],
      },
      {
        heading: 'Concession & opposition',
        blocks: [
          {
            type: 'table',
            head: ['Connector', 'Construction', 'Example'],
            rows: [
              ['bien que, quoique', '+ subjunctive', 'Bien qu’il soit riche, il est malheureux.'],
              ['malgré', '+ noun', 'Malgré la pluie, on est sortis.'],
              ['pourtant, cependant, néanmoins, toutefois', 'adverbs', 'Il est riche ; pourtant, il est malheureux.'],
              ['même si', '+ indicative', 'Même s’il pleut, je viendrai.'],
              ['alors que, tandis que', 'contrast, + indicative', 'Il aime le thé alors que je préfère le café.'],
              ['avoir beau + infinitive', 'no matter how much', 'J’ai beau essayer, je n’y arrive pas.'],
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'mcq', prompt: 'Thanks to your help, I succeeded.', options: ['À cause de ton aide, j’ai réussi.', 'Grâce à ton aide, j’ai réussi.', 'Parce que ton aide, j’ai réussi.'], answer: 1, explain: 'Positive cause + noun → grâce à.' },
      { type: 'cloze', sentence: '___ tu es là, tu peux m’aider.', answers: ['Puisque', 'Comme'], en: 'Since you’re here, you can help me.', explain: 'Obvious cause → puisque (comme also works at the start).' },
      { type: 'cloze', sentence: '___ la neige, le train est en retard.', answers: ['À cause de'], en: 'Because of the snow, the train is late.', explain: 'Negative cause + noun.' },
      { type: 'cloze', sentence: 'Bien qu’il ___ malade, il travaille.', hint: 'être', answers: ['soit'], en: 'Although he’s ill, he’s working.', explain: 'bien que + subjunctive.' },
      { type: 'cloze', sentence: '___ la pluie, nous sommes sortis.', answers: ['Malgré'], en: 'Despite the rain, we went out.', explain: 'malgré + noun.' },
      { type: 'cloze', sentence: 'Même s’il ___, je viendrai.', hint: 'pleuvoir', answers: ['pleut'], en: 'Even if it rains, I’ll come.', explain: 'même si + indicative (present).' },
      { type: 'cloze', sentence: 'Il fait ___ froid qu’on reste à la maison.', answers: ['si', 'tellement'], en: 'It’s so cold that we’re staying home.', explain: 'si / tellement + adjective + que.' },
      { type: 'cloze', sentence: 'J’ai ___ chercher, je ne trouve pas mes clés.', answers: ['beau'], en: 'No matter how hard I look, I can’t find my keys.', explain: 'avoir beau + infinitive.' },
      { type: 'mcq', prompt: 'Which connector can’t start a sentence?', options: ['comme', 'puisque', 'car', 'étant donné que'], answer: 2, explain: 'car always comes after the main clause.' },
      { type: 'mcq', prompt: 'He likes the city, whereas she prefers the countryside.', options: ['Il aime la ville, bien qu’elle préfère la campagne.', 'Il aime la ville, alors qu’elle préfère la campagne.', 'Il aime la ville, malgré elle préfère la campagne.'], answer: 1, explain: 'Contrast between two facts → alors que / tandis que.' },
      { type: 'translate', en: 'He is rich; however, he is unhappy.', answers: ['Il est riche ; pourtant, il est malheureux', 'Il est riche ; cependant, il est malheureux', 'Il est riche, pourtant il est malheureux', 'Il est riche mais il est malheureux', 'Il est riche ; néanmoins, il est malheureux', 'Il est riche ; toutefois, il est malheureux', 'Il est riche, cependant il est malheureux'] },
    ],
  },
]
