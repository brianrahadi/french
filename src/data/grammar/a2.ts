import type { Lesson } from '../types'

export const A2_LESSONS: Lesson[] = [
  {
    id: 'irregular-present',
    level: 'A2',
    title: 'Key irregular verbs',
    titleFr: 'Les verbes irréguliers essentiels',
    summary: 'aller, faire, venir, prendre, pouvoir, vouloir, devoir — the verbs you’ll use every day.',
    minutes: 10,
    sections: [
      {
        heading: 'aller, faire, venir, prendre',
        blocks: [
          {
            type: 'table',
            head: ['', 'aller', 'faire', 'venir', 'prendre'],
            rows: [
              ['je', 'vais', 'fais', 'viens', 'prends'],
              ['tu', 'vas', 'fais', 'viens', 'prends'],
              ['il / elle / on', 'va', 'fait', 'vient', 'prend'],
              ['nous', 'allons', 'faisons', 'venons', 'prenons'],
              ['vous', 'allez', 'faites', 'venez', 'prenez'],
              ['ils / elles', 'vont', 'font', 'viennent', 'prennent'],
            ],
          },
          {
            type: 'p',
            text: 'Verbs built on these follow the same pattern: **devenir, revenir, se souvenir** like venir; **comprendre, apprendre, surprendre** like prendre.',
          },
        ],
      },
      {
        heading: 'Modal verbs: pouvoir, vouloir, devoir',
        blocks: [
          {
            type: 'table',
            head: ['', 'pouvoir (can)', 'vouloir (want)', 'devoir (must)'],
            rows: [
              ['je', 'peux', 'veux', 'dois'],
              ['tu', 'peux', 'veux', 'dois'],
              ['il / elle / on', 'peut', 'veut', 'doit'],
              ['nous', 'pouvons', 'voulons', 'devons'],
              ['vous', 'pouvez', 'voulez', 'devez'],
              ['ils / elles', 'peuvent', 'veulent', 'doivent'],
            ],
          },
          { type: 'p', text: 'They are followed directly by an **infinitive**: *Je peux venir. Tu veux manger ? Nous devons partir.*' },
          { type: 'tip', text: 'For politeness, use the conditional: **je voudrais** (I’d like), **pourriez-vous** (could you)…' },
        ],
      },
      {
        heading: 'savoir vs. connaître',
        blocks: [
          {
            type: 'table',
            head: ['savoir', 'connaître'],
            rows: [
              ['facts, information: Je sais où il habite.', 'people: Je connais Marie.'],
              ['how to do something: Je sais nager.', 'places: Tu connais Lyon ?'],
              ['+ que, si, où, quand…', 'works, things you’re familiar with: Je connais ce livre.'],
            ],
          },
        ],
      },
      {
        heading: 'Expressions with faire',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'faire les courses, faire la cuisine, faire la vaisselle', en: 'to do the shopping, to cook, to do the dishes' },
              { fr: 'Il fait beau / froid / chaud.', en: 'The weather is nice / cold / hot.' },
              { fr: 'faire attention, faire la queue', en: 'to be careful, to queue' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Ils ___ au cinéma ce soir.', hint: 'aller', answers: ['vont'], en: 'They’re going to the cinema tonight.', explain: 'aller: ils vont.' },
      { type: 'cloze', sentence: 'Qu’est-ce que vous ___ ?', hint: 'faire', answers: ['faites'], en: 'What are you doing?', explain: 'faire: vous faites (not ~~faisez~~).' },
      { type: 'cloze', sentence: 'Elles ___ de Belgique.', hint: 'venir', answers: ['viennent'], en: 'They come from Belgium.', explain: 'venir: ils/elles viennent (double n).' },
      { type: 'cloze', sentence: 'Nous ___ le train.', hint: 'prendre', answers: ['prenons'], en: 'We’re taking the train.', explain: 'prendre: nous prenons (one n).' },
      { type: 'cloze', sentence: 'Tu ___ m’aider ?', hint: 'pouvoir', answers: ['peux'], en: 'Can you help me?', explain: 'pouvoir: tu peux.' },
      { type: 'cloze', sentence: 'Ils ___ partir tôt.', hint: 'vouloir', answers: ['veulent'], en: 'They want to leave early.', explain: 'vouloir: ils veulent.' },
      { type: 'cloze', sentence: 'Vous ___ remplir ce formulaire.', hint: 'devoir', answers: ['devez'], en: 'You must fill in this form.', explain: 'devoir: vous devez.' },
      {
        type: 'mcq',
        prompt: 'I know how to swim.',
        options: ['Je connais nager.', 'Je sais nager.', 'Je peux nager.'],
        answer: 1,
        explain: 'savoir + infinitive = know how to.',
      },
      {
        type: 'mcq',
        prompt: 'Do you know Marie?',
        options: ['Tu sais Marie ?', 'Tu connais Marie ?'],
        answer: 1,
        explain: 'connaître for people and places.',
      },
      { type: 'cloze', sentence: 'Aujourd’hui, il ___ très beau.', hint: 'faire', answers: ['fait'], en: 'The weather is lovely today.', explain: 'Weather: il fait…' },
      { type: 'translate', en: 'I would like a coffee, please.', answers: ['Je voudrais un café, s’il vous plaît', 'Je voudrais un café s’il vous plaît', 'Je voudrais un café, s’il te plaît'] },
    ],
  },

  {
    id: 'near-future',
    level: 'A2',
    title: 'Near future & recent past',
    titleFr: 'Le futur proche et le passé récent',
    summary: 'aller + infinitive and venir de + infinitive — the easiest way to talk about the future and the past.',
    minutes: 6,
    sections: [
      {
        heading: 'Futur proche: aller + infinitive',
        blocks: [
          { type: 'p', text: 'Conjugate **aller** in the present and add an infinitive. It’s the most common way to talk about the future in spoken French.' },
          {
            type: 'examples',
            items: [
              { fr: 'Je vais manger.', en: 'I’m going to eat.' },
              { fr: 'Il va pleuvoir.', en: 'It’s going to rain.' },
              { fr: 'Nous allons partir demain.', en: 'We’re leaving tomorrow.' },
            ],
          },
          { type: 'p', text: 'Negative: **ne … pas** goes around **aller**: *Je **ne** vais **pas** venir.*' },
        ],
      },
      {
        heading: 'Passé récent: venir de + infinitive',
        blocks: [
          { type: 'p', text: '**venir** in the present + **de** + infinitive means “to have just done”.' },
          {
            type: 'examples',
            items: [
              { fr: 'Je viens de manger.', en: 'I’ve just eaten.' },
              { fr: 'Ils viennent d’arriver.', en: 'They’ve just arrived.' },
              { fr: 'Le film vient de commencer.', en: 'The film has just started.' },
            ],
          },
          { type: 'warn', text: 'Don’t forget **de**: ~~Je viens manger~~ means “I’m coming to eat”.' },
        ],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Rewrite in the futur proche.', source: 'Je mange.', answers: ['Je vais manger'] },
      { type: 'transform', instruction: 'Rewrite in the futur proche.', source: 'Nous partons.', answers: ['Nous allons partir'] },
      { type: 'cloze', sentence: 'Attention, il ___ pleuvoir !', answers: ['va'], en: 'Careful, it’s going to rain!', explain: 'il va + infinitive.' },
      { type: 'cloze', sentence: 'Ils ___ arriver.', hint: 'just', answers: ['viennent d’', 'viennent de'], en: 'They’ve just arrived.', explain: 'venir de → d’ before a vowel.' },
      { type: 'cloze', sentence: 'Je ___ finir mon travail.', hint: 'just', answers: ['viens de'], en: 'I’ve just finished my work.', explain: 'venir de + infinitive = to have just done.' },
      {
        type: 'mcq',
        prompt: 'What does “Je viens de voir Paul” mean?',
        options: ['I’m coming to see Paul.', 'I’ve just seen Paul.', 'I’m going to see Paul.'],
        answer: 1,
        explain: 'venir de + infinitive = just did.',
      },
      { type: 'transform', instruction: 'Make it negative.', source: 'Je vais sortir ce soir.', answers: ['Je ne vais pas sortir ce soir'], explain: 'ne … pas surrounds aller.' },
      { type: 'order', en: 'We are going to visit Paris.', words: ['Nous', 'allons', 'visiter', 'Paris'], punct: '.', extra: ['venons'] },
      { type: 'order', en: 'She has just left.', words: ['Elle', 'vient', 'de', 'partir'], punct: '.', extra: ['va'] },
      { type: 'translate', en: 'What are you going to do tomorrow? (tu)', answers: ['Qu’est-ce que tu vas faire demain ?', 'Tu vas faire quoi demain ?', 'Que vas-tu faire demain ?'] },
    ],
  },

  {
    id: 'passe-compose-avoir',
    level: 'A2',
    title: 'Passé composé with avoir',
    titleFr: 'Le passé composé avec avoir',
    summary: 'The everyday past tense: avoir + past participle.',
    minutes: 10,
    sections: [
      {
        heading: 'Formation',
        blocks: [
          { type: 'p', text: 'Present of **avoir** + **past participle**. It translates “I ate”, “I have eaten” and “I did eat”.' },
          {
            type: 'table',
            head: ['', 'manger'],
            rows: [
              ['j’', 'ai mangé'],
              ['tu', 'as mangé'],
              ['il / elle / on', 'a mangé'],
              ['nous', 'avons mangé'],
              ['vous', 'avez mangé'],
              ['ils / elles', 'ont mangé'],
            ],
          },
        ],
      },
      {
        heading: 'Regular past participles',
        blocks: [
          {
            type: 'table',
            head: ['Infinitive', 'Participle', 'Example'],
            rows: [
              ['-er', '-é', 'parler → parlé'],
              ['-ir', '-i', 'finir → fini'],
              ['-re', '-u', 'vendre → vendu'],
            ],
          },
        ],
      },
      {
        heading: 'Common irregular participles',
        blocks: [
          {
            type: 'table',
            head: ['-u', '-is / -it', 'Others'],
            rows: [
              ['avoir → eu', 'prendre → pris', 'être → été'],
              ['boire → bu', 'mettre → mis', 'faire → fait'],
              ['lire → lu', 'dire → dit', 'ouvrir → ouvert'],
              ['voir → vu', 'écrire → écrit', 'naître → né'],
              ['pouvoir → pu, vouloir → voulu', 'comprendre → compris', 'mourir → mort'],
              ['savoir → su, devoir → dû', '', ''],
              ['recevoir → reçu, connaître → connu', '', ''],
            ],
          },
        ],
      },
      {
        heading: 'Negatives and questions',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je n’ai pas compris.', en: 'I didn’t understand.' },
              { fr: 'Tu as déjà vu ce film ?', en: 'Have you already seen this film?' },
              { fr: 'Avez-vous bien dormi ?', en: 'Did you sleep well?' },
            ],
          },
          { type: 'tip', text: 'Short adverbs (bien, mal, déjà, encore, beaucoup, trop) go **between** the auxiliary and the participle: *J’ai **bien** mangé.*' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Hier, j’___ un bon film.', hint: 'voir', answers: ['ai vu'], en: 'Yesterday I saw a good film.', explain: 'voir → vu.' },
      { type: 'cloze', sentence: 'Nous ___ au restaurant.', hint: 'manger', answers: ['avons mangé'], en: 'We ate at the restaurant.', explain: 'avons + mangé.' },
      { type: 'cloze', sentence: 'Tu ___ tes devoirs ?', hint: 'finir', answers: ['as fini'], en: 'Did you finish your homework?', explain: '-ir → -i.' },
      { type: 'cloze', sentence: 'Ils ___ leur maison.', hint: 'vendre', answers: ['ont vendu'], en: 'They sold their house.', explain: '-re → -u.' },
      { type: 'cloze', sentence: 'Elle ___ le bus.', hint: 'prendre', answers: ['a pris'], en: 'She took the bus.', explain: 'prendre → pris.' },
      { type: 'cloze', sentence: 'Qu’est-ce que vous ___ ce week-end ?', hint: 'faire', answers: ['avez fait'], en: 'What did you do this weekend?', explain: 'faire → fait.' },
      { type: 'cloze', sentence: 'J’___ une lettre à ma grand-mère.', hint: 'écrire', answers: ['ai écrit'], en: 'I wrote a letter to my grandmother.', explain: 'écrire → écrit.' },
      { type: 'transform', instruction: 'Make it negative.', source: 'J’ai compris.', answers: ['Je n’ai pas compris'], explain: 'ne … pas goes around the auxiliary.' },
      { type: 'mcq', prompt: 'Past participle of “boire”?', options: ['buvé', 'bu', 'boit', 'bois'], answer: 1, explain: 'boire → bu.' },
      { type: 'order', en: 'I have already read this book.', words: ['J’ai', 'déjà', 'lu', 'ce', 'livre'], punct: '.', extra: ['lire'] },
      { type: 'translate', en: 'We drank some wine.', answers: ['Nous avons bu du vin', 'On a bu du vin'] },
    ],
  },

  {
    id: 'passe-compose-etre',
    level: 'A2',
    title: 'Passé composé with être',
    titleFr: 'Le passé composé avec être',
    summary: 'About 17 verbs of movement and change — plus all reflexive verbs — use être, and agree.',
    minutes: 10,
    sections: [
      {
        heading: 'Which verbs take être?',
        blocks: [
          { type: 'p', text: 'Mostly verbs of **movement or change of state**. Remember them in pairs:' },
          {
            type: 'table',
            head: ['Verb', 'Participle', 'Opposite', 'Participle'],
            rows: [
              ['aller', 'allé', 'venir', 'venu'],
              ['arriver', 'arrivé', 'partir', 'parti'],
              ['entrer', 'entré', 'sortir', 'sorti'],
              ['monter', 'monté', 'descendre', 'descendu'],
              ['naître', 'né', 'mourir', 'mort'],
              ['rester', 'resté', 'tomber', 'tombé'],
              ['devenir', 'devenu', 'revenir', 'revenu'],
              ['rentrer', 'rentré', 'retourner', 'retourné'],
              ['passer (by)', 'passé', '', ''],
            ],
          },
          { type: 'p', text: '**All reflexive verbs** also use être: *je me suis levé*.' },
        ],
      },
      {
        heading: 'Agreement with the subject',
        blocks: [
          { type: 'p', text: 'With être, the participle agrees with the subject like an adjective: **+e** feminine, **+s** plural.' },
          {
            type: 'table',
            head: ['', 'aller'],
            rows: [
              ['je', 'suis allé(e)'],
              ['tu', 'es allé(e)'],
              ['il / elle', 'est allé / est allée'],
              ['nous', 'sommes allé(e)s'],
              ['vous', 'êtes allé(e)(s)'],
              ['ils / elles', 'sont allés / sont allées'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Marie est arrivée hier.', en: 'Marie arrived yesterday.' },
              { fr: 'Mes parents sont partis en vacances.', en: 'My parents went on holiday.' },
            ],
          },
        ],
      },
      {
        heading: 'With a direct object → avoir',
        blocks: [
          { type: 'p', text: '**monter, descendre, sortir, rentrer, passer, retourner** take **avoir** when they have a direct object:' },
          {
            type: 'examples',
            items: [
              { fr: 'Je suis sorti. / J’ai sorti la poubelle.', en: 'I went out. / I took the bin out.' },
              { fr: 'Elle est montée. / Elle a monté les valises.', en: 'She went up. / She took the suitcases up.' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Hier, je ___ au cinéma.', hint: 'aller, speaker is male', answers: ['suis allé'], en: 'Yesterday I went to the cinema.', explain: 'aller takes être.' },
      { type: 'cloze', sentence: 'Marie ___ à 8 heures.', hint: 'arriver', answers: ['est arrivée'], en: 'Marie arrived at 8.', explain: 'Feminine subject → arrivée.' },
      { type: 'cloze', sentence: 'Mes amis ___ en retard.', hint: 'venir', answers: ['sont venus'], en: 'My friends came late.', explain: 'Masculine plural → venus.' },
      { type: 'cloze', sentence: 'Elles ___ à la maison.', hint: 'rester', answers: ['sont restées'], en: 'They stayed at home.', explain: 'Feminine plural → restées.' },
      { type: 'cloze', sentence: 'Victor Hugo ___ en 1802.', hint: 'naître', answers: ['est né'], en: 'Victor Hugo was born in 1802.', explain: 'naître → né, with être.' },
      { type: 'cloze', sentence: 'Nous ___ du train à Lyon.', hint: 'descendre, men', answers: ['sommes descendus'], en: 'We got off the train in Lyon.', explain: 'descendre (no direct object) → être.' },
      { type: 'mcq', prompt: 'Which verb takes être in the passé composé?', options: ['manger', 'tomber', 'dormir', 'finir'], answer: 1, explain: 'tomber is one of the “house of être” verbs.' },
      { type: 'mcq', prompt: 'Choose the correct sentence.', options: ['Elle a sorti hier soir.', 'Elle est sortie hier soir.', 'Elle est sorti hier soir.'], answer: 1, explain: 'sortir without object → être + agreement.' },
      { type: 'mcq', prompt: 'Choose the correct sentence.', options: ['J’ai monté les valises.', 'Je suis monté les valises.'], answer: 0, explain: 'With a direct object (les valises), monter takes avoir.' },
      { type: 'order', en: 'She fell in the street.', words: ['Elle', 'est', 'tombée', 'dans', 'la', 'rue'], punct: '.', extra: ['a', 'tombé'] },
      { type: 'translate', en: 'They (m) left at noon.', answers: ['Ils sont partis à midi'] },
    ],
  },

  {
    id: 'reflexive',
    level: 'A2',
    title: 'Reflexive verbs',
    titleFr: 'Les verbes pronominaux',
    summary: 'se lever, s’appeler, se souvenir… verbs that come with their own pronoun.',
    minutes: 8,
    sections: [
      {
        heading: 'The reflexive pronoun',
        blocks: [
          { type: 'p', text: 'Reflexive verbs include a pronoun that matches the subject. It goes **before the verb**.' },
          {
            type: 'table',
            head: ['', 'se lever', 's’habiller'],
            rows: [
              ['je', 'me lève', 'm’habille'],
              ['tu', 'te lèves', 't’habilles'],
              ['il / elle / on', 'se lève', 's’habille'],
              ['nous', 'nous levons', 'nous habillons'],
              ['vous', 'vous levez', 'vous habillez'],
              ['ils / elles', 'se lèvent', 's’habillent'],
            ],
          },
        ],
      },
      {
        heading: 'Uses',
        blocks: [
          {
            type: 'list',
            items: [
              '**Reflexive** (to oneself): *se laver, se coucher, se réveiller, s’habiller*.',
              '**Reciprocal** (each other): *Ils s’aiment. On se voit demain ?*',
              '**Idiomatic** (just the way the verb works): *s’appeler, se souvenir de, se rendre compte, s’amuser, s’ennuyer, se dépêcher*.',
            ],
          },
        ],
      },
      {
        heading: 'Negative, infinitive, imperative, past',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je ne me lève pas tôt.', en: 'Negative: ne + pronoun + verb + pas' },
              { fr: 'Je vais me coucher.', en: 'Infinitive: the pronoun matches the subject' },
              { fr: 'Dépêche-toi ! / Ne te dépêche pas.', en: 'Imperative: -toi, -nous, -vous after the verb' },
              { fr: 'Elle s’est levée à 7 heures.', en: 'Passé composé: always être, with agreement' },
            ],
          },
          { type: 'warn', text: 'When a body part follows, there’s no agreement: *Elle s’est lavé **les mains***. And French uses the article, not a possessive: ~~je lave mes mains~~ → *je me lave les mains*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Je ___ à 7 heures.', hint: 'se lever', answers: ['me lève'], en: 'I get up at 7.', explain: 'je → me, and lever → lève.' },
      { type: 'cloze', sentence: 'Comment tu ___ ?', hint: 's’appeler', answers: ['t’appelles'], en: 'What’s your name?', explain: 'te → t’ before a vowel; appeler doubles the l.' },
      { type: 'cloze', sentence: 'Nous ___ bien ici.', hint: 's’amuser', answers: ['nous amusons'], en: 'We’re having fun here.', explain: 'nous + nous amusons.' },
      { type: 'cloze', sentence: 'Les enfants ___ tôt.', hint: 'se coucher', answers: ['se couchent'], en: 'The children go to bed early.', explain: 'ils → se.' },
      { type: 'transform', instruction: 'Make it negative.', source: 'Je me réveille tôt.', answers: ['Je ne me réveille pas tôt'], explain: 'ne goes before the reflexive pronoun.' },
      { type: 'cloze', sentence: 'Elle ___ à 6 heures ce matin.', hint: 'se réveiller, passé composé', answers: ['s’est réveillée'], en: 'She woke up at 6 this morning.', explain: 'Reflexive → être + agreement.' },
      { type: 'cloze', sentence: '___ ! Le train part.', hint: 'se dépêcher, tu, imperative', answers: ['Dépêche-toi'], en: 'Hurry up! The train is leaving.', explain: 'Affirmative imperative: verb-toi.' },
      { type: 'cloze', sentence: 'Demain, je vais ___ tôt.', hint: 'se lever', answers: ['me lever'], en: 'Tomorrow I’m going to get up early.', explain: 'The pronoun matches the subject: je → me lever.' },
      { type: 'mcq', prompt: 'How do you say “I brush my teeth”?', options: ['Je brosse mes dents.', 'Je me brosse les dents.', 'Je me brosse mes dents.'], answer: 1, explain: 'Body parts: reflexive verb + definite article.' },
      { type: 'order', en: 'Do you remember this song?', words: ['Tu', 'te', 'souviens', 'de', 'cette', 'chanson'], punct: '?', extra: ['se'] },
      { type: 'translate', en: 'We see each other on Mondays.', answers: ['Nous nous voyons le lundi', 'On se voit le lundi'] },
    ],
  },

  {
    id: 'object-pronouns',
    level: 'A2',
    title: 'Direct & indirect object pronouns',
    titleFr: 'Les pronoms COD et COI',
    summary: 'le, la, les, lui, leur — replace nouns and place them before the verb.',
    minutes: 10,
    sections: [
      {
        heading: 'The pronouns',
        blocks: [
          {
            type: 'table',
            head: ['Subject', 'Direct (COD)', 'Indirect (COI)'],
            rows: [
              ['je', 'me (m’)', 'me (m’)'],
              ['tu', 'te (t’)', 'te (t’)'],
              ['il / elle', 'le / la (l’)', 'lui'],
              ['nous', 'nous', 'nous'],
              ['vous', 'vous', 'vous'],
              ['ils / elles', 'les', 'leur'],
            ],
          },
          {
            type: 'p',
            text: '**Direct** objects follow the verb with no preposition (*voir **Marie*** → *la voir*). **Indirect** objects follow **à + person** (*parler **à Marie*** → *lui parler*).',
          },
        ],
      },
      {
        heading: 'Position: before the verb',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je vois Paul. → Je le vois.', en: 'I see him.' },
              { fr: 'Tu connais ces filles ? → Tu les connais ?', en: 'Do you know them?' },
              { fr: 'J’écris à ma mère. → Je lui écris.', en: 'I’m writing to her.' },
              { fr: 'Je ne les connais pas.', en: 'Negative: ne + pronoun + verb + pas.' },
              { fr: 'Je l’ai vu. / Je vais le voir.', en: 'Before the auxiliary; before the infinitive.' },
            ],
          },
          { type: 'tip', text: 'In the affirmative imperative, the pronoun goes after the verb with a hyphen, and me/te become moi/toi: *Regarde-**moi** ! Donne-**lui** le livre.*' },
        ],
      },
      {
        heading: 'Verbs that take à in French',
        blocks: [
          {
            type: 'p',
            text: 'Common indirect verbs: **parler à, téléphoner à, répondre à, demander à, donner à, dire à, écrire à, plaire à, ressembler à**. So: *Je **lui** téléphone* (I call him/her).',
          },
          { type: 'warn', text: 'Some verbs are direct in French but not in English: **écouter, regarder, chercher, attendre** — *Je **l’**attends* (I’m waiting for him).' },
        ],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Replace the object with a pronoun.', source: 'Je vois Paul.', answers: ['Je le vois'], explain: 'Paul is a direct object (masculine) → le.' },
      { type: 'transform', instruction: 'Replace the object with a pronoun.', source: 'Tu connais ces filles ?', answers: ['Tu les connais ?'], explain: 'Plural direct object → les.' },
      { type: 'transform', instruction: 'Replace the object with a pronoun.', source: 'J’écris à ma mère.', answers: ['Je lui écris'], explain: 'à + person → lui (for both genders).' },
      { type: 'transform', instruction: 'Replace the object with a pronoun.', source: 'Il téléphone à ses parents.', answers: ['Il leur téléphone'], explain: 'à + plural person → leur.' },
      { type: 'cloze', sentence: 'Tu attends Marie ? — Oui, je ___ attends.', answers: ['l’'], en: 'Are you waiting for Marie? — Yes, I’m waiting for her.', explain: 'attendre is direct → la → l’ before a vowel.' },
      { type: 'cloze', sentence: 'Tu as vu le film ? — Oui, je ___ ai vu.', answers: ['l’'], en: 'Did you see the film? — Yes, I saw it.', explain: 'le → l’ before the auxiliary avoir.' },
      { type: 'mcq', prompt: 'Je parle à Julie. →', options: ['Je la parle.', 'Je lui parle.', 'Je parle lui.'], answer: 1, explain: 'parler à → indirect → lui.' },
      { type: 'mcq', prompt: 'Je ne connais pas ces gens. →', options: ['Je ne les connais pas.', 'Je les ne connais pas.', 'Je ne connais pas les.'], answer: 0, explain: 'ne + pronoun + verb + pas.' },
      { type: 'cloze', sentence: 'Je vais ___ appeler demain.', hint: 'him', answers: ['l’'], en: 'I’m going to call him tomorrow.', explain: 'The pronoun goes before the infinitive it belongs to.' },
      { type: 'cloze', sentence: 'Regarde-___ !', hint: 'me', answers: ['moi'], en: 'Look at me!', explain: 'Affirmative imperative: me → moi.' },
      { type: 'translate', en: 'I love you.', answers: ['Je t’aime', 'Je vous aime'] },
    ],
  },

  {
    id: 'imparfait',
    level: 'A2',
    title: 'The imparfait',
    titleFr: 'L’imparfait',
    summary: 'The past tense for descriptions, habits and ongoing situations.',
    minutes: 8,
    sections: [
      {
        heading: 'Formation: nous-stem + endings',
        blocks: [
          { type: 'p', text: 'Take the **nous** form of the present, remove **-ons**, and add the endings. It works for every verb except **être** (stem **ét-**).' },
          {
            type: 'table',
            head: ['', 'Ending', 'parler (parl-)', 'faire (fais-)', 'être (ét-)'],
            rows: [
              ['je', '-ais', 'parlais', 'faisais', 'étais'],
              ['tu', '-ais', 'parlais', 'faisais', 'étais'],
              ['il / elle / on', '-ait', 'parlait', 'faisait', 'était'],
              ['nous', '-ions', 'parlions', 'faisions', 'étions'],
              ['vous', '-iez', 'parliez', 'faisiez', 'étiez'],
              ['ils / elles', '-aient', 'parlaient', 'faisaient', 'étaient'],
            ],
          },
          { type: 'tip', text: 'Spelling: *manger → je mangeais* (but *nous mangions*), *commencer → je commençais* (but *nous commencions*).' },
        ],
      },
      {
        heading: 'When to use it',
        blocks: [
          {
            type: 'list',
            items: [
              '**Descriptions** in the past (weather, feelings, appearance, age): *Il faisait beau. J’étais fatigué.*',
              '**Habits** — “used to”, “would”: *Quand j’étais petit, je jouais au foot tous les jours.*',
              '**Ongoing actions** — “was doing”: *Je lisais quand tu as appelé.*',
              '**Suggestions** after si: *Si on allait au cinéma ?* (How about going to the cinema?)',
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Quand j’étais petit, je ___ au foot.', hint: 'jouer', answers: ['jouais'], en: 'When I was little, I used to play football.', explain: 'Habit in the past → imparfait.' },
      { type: 'cloze', sentence: 'Il ___ très beau hier.', hint: 'faire', answers: ['faisait'], en: 'The weather was lovely yesterday.', explain: 'nous faisons → fais- → faisait.' },
      { type: 'cloze', sentence: 'Nous ___ en France à l’époque.', hint: 'habiter', answers: ['habitions'], en: 'We lived in France at the time.', explain: 'nous → -ions.' },
      { type: 'cloze', sentence: 'Tu ___ fatigué ?', hint: 'être', answers: ['étais'], en: 'Were you tired?', explain: 'être is the only irregular stem: ét-.' },
      { type: 'cloze', sentence: 'Ils ___ beaucoup de livres.', hint: 'lire', answers: ['lisaient'], en: 'They used to read a lot of books.', explain: 'nous lisons → lis- → lisaient.' },
      { type: 'cloze', sentence: 'Je ___ une pomme chaque matin.', hint: 'manger', answers: ['mangeais'], en: 'I used to eat an apple every morning.', explain: 'Keep the e before a: mangeais.' },
      { type: 'cloze', sentence: 'Vous ___ le français à l’école ?', hint: 'apprendre', answers: ['appreniez'], en: 'Did you learn French at school?', explain: 'nous apprenons → appren- → appreniez.' },
      { type: 'mcq', prompt: 'Which sentence describes a past habit?', options: ['J’ai mangé une pomme.', 'Je mangeais une pomme tous les jours.', 'Je vais manger une pomme.'], answer: 1, explain: 'Repeated past action → imparfait.' },
      { type: 'mcq', prompt: '“Si on allait à la plage ?” means…', options: ['If we went to the beach…', 'How about going to the beach?', 'We went to the beach.'], answer: 1, explain: 'si + imparfait as a question = a suggestion.' },
      { type: 'translate', en: 'It was cold and I was tired.', answers: ['Il faisait froid et j’étais fatigué', 'Il faisait froid et j’étais fatiguée'] },
    ],
  },

  {
    id: 'comparisons',
    level: 'A2',
    title: 'Comparatives & superlatives',
    titleFr: 'Le comparatif et le superlatif',
    summary: 'plus… que, moins… que, aussi… que — and the irregular meilleur and mieux.',
    minutes: 8,
    sections: [
      {
        heading: 'Comparing',
        blocks: [
          {
            type: 'table',
            head: ['', 'Adjective / adverb', 'Noun'],
            rows: [
              ['more … than', 'plus grand que', 'plus de temps que'],
              ['less … than', 'moins cher que', 'moins d’argent que'],
              ['as … as', 'aussi vite que', 'autant de livres que'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Paul est plus grand que moi.', en: 'Paul is taller than me.' },
              { fr: 'Ce film est aussi intéressant que le livre.', en: 'This film is as interesting as the book.' },
              { fr: 'J’ai moins de travail que toi.', en: 'I have less work than you.' },
            ],
          },
          { type: 'tip', text: 'After que, use stressed pronouns: *que **moi**, que **toi**, que **lui**, qu’**elle**, que **nous**…*' },
        ],
      },
      {
        heading: 'Superlative',
        blocks: [
          { type: 'p', text: '**le / la / les + plus / moins + adjective**. If the adjective normally follows the noun, the article is repeated:' },
          {
            type: 'examples',
            items: [
              { fr: 'C’est la plus belle ville du monde.', en: 'It’s the most beautiful city in the world.' },
              { fr: 'C’est le restaurant le plus cher de Paris.', en: 'It’s the most expensive restaurant in Paris.' },
            ],
          },
          { type: 'p', text: '“in” after a superlative is **de**: *le plus grand **du** monde*.' },
        ],
      },
      {
        heading: 'bon → meilleur, bien → mieux',
        blocks: [
          {
            type: 'table',
            head: ['', 'Comparative', 'Superlative'],
            rows: [
              ['bon (adj., good)', 'meilleur(e)(s)', 'le/la/les meilleur(e)(s)'],
              ['bien (adv., well)', 'mieux', 'le mieux'],
              ['mauvais (bad)', 'pire / plus mauvais', 'le pire'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Ce gâteau est meilleur que l’autre.', en: 'This cake is better than the other one.' },
              { fr: 'Elle chante mieux que moi.', en: 'She sings better than me.' },
            ],
          },
          { type: 'warn', text: 'Never ~~plus bon~~. Use **meilleur** (describes a noun) or **mieux** (describes a verb).' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Paris est ___ grand que Lyon.', hint: 'more', answers: ['plus'], en: 'Paris is bigger than Lyon.', explain: 'plus + adjective + que.' },
      { type: 'cloze', sentence: 'Le train est ___ rapide que l’avion.', hint: 'less', answers: ['moins'], en: 'The train is slower (less fast) than the plane.', explain: 'moins + adjective + que.' },
      { type: 'cloze', sentence: 'Marie est ___ grande que sa sœur.', hint: 'as', answers: ['aussi'], en: 'Marie is as tall as her sister.', explain: 'aussi + adjective + que.' },
      { type: 'cloze', sentence: 'J’ai ___ livres que toi.', hint: 'as many', answers: ['autant de'], en: 'I have as many books as you.', explain: 'With nouns: autant de.' },
      { type: 'mcq', prompt: 'This wine is better than that one.', options: ['Ce vin est plus bon que celui-là.', 'Ce vin est meilleur que celui-là.', 'Ce vin est mieux que celui-là.'], answer: 1, explain: 'bon → meilleur (adjective).' },
      { type: 'mcq', prompt: 'She speaks French better than me.', options: ['Elle parle français meilleur que moi.', 'Elle parle français mieux que moi.', 'Elle parle français plus bien que moi.'], answer: 1, explain: 'bien → mieux (adverb).' },
      { type: 'cloze', sentence: 'C’est la ___ pizza de la ville !', hint: 'best', answers: ['meilleure'], en: 'It’s the best pizza in town!', explain: 'pizza is feminine: la meilleure.' },
      { type: 'cloze', sentence: 'C’est le musée le plus célèbre ___ monde.', answers: ['du'], en: 'It’s the most famous museum in the world.', explain: '“in” after a superlative = de → du.' },
      { type: 'order', en: 'He is taller than me.', words: ['Il', 'est', 'plus', 'grand', 'que', 'moi'], punct: '.', extra: ['je'] },
      { type: 'translate', en: 'It is the most beautiful city in the world.', answers: ['C’est la plus belle ville du monde'] },
    ],
  },
]
