import type { Lesson } from '../types'

export const B1_LESSONS: Lesson[] = [
  {
    id: 'pc-vs-imparfait',
    level: 'B1',
    title: 'Passé composé vs. imparfait',
    titleFr: 'Passé composé ou imparfait ?',
    summary: 'The key to telling stories: events move the plot forward, the imparfait sets the scene.',
    minutes: 10,
    sections: [
      {
        heading: 'The core idea',
        blocks: [
          {
            type: 'table',
            head: ['Passé composé — the events', 'Imparfait — the background'],
            rows: [
              ['Completed actions, with a clear start or end', 'Descriptions, feelings, weather, age, time'],
              ['What happened next (a sequence)', 'What was going on (an ongoing action)'],
              ['A specific number of times: trois fois', 'Habits: tous les jours, souvent, d’habitude'],
              ['Sudden changes: tout à coup, soudain', 'States of mind: je pensais, je savais, je voulais'],
            ],
          },
          { type: 'tip', text: 'Think of a film: the **imparfait** is the scenery and the camera rolling; the **passé composé** is what the characters do.' },
        ],
      },
      {
        heading: 'Together in one sentence',
        blocks: [
          { type: 'p', text: 'An ongoing action (imparfait) is interrupted by an event (passé composé):' },
          {
            type: 'examples',
            items: [
              { fr: 'Je dormais quand le téléphone a sonné.', en: 'I was sleeping when the phone rang.' },
              { fr: 'Il pleuvait, alors nous sommes restés à la maison.', en: 'It was raining, so we stayed home.' },
              { fr: 'Quand j’avais dix ans, je suis allé en Espagne.', en: 'When I was ten, I went to Spain.' },
            ],
          },
        ],
      },
      {
        heading: 'Meaning changes',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je savais. / J’ai su.', en: 'I knew. / I found out.' },
              { fr: 'Je connaissais Paul. / J’ai connu Paul en 2010.', en: 'I knew Paul. / I met Paul in 2010.' },
              { fr: 'Il devait partir. / Il a dû partir.', en: 'He was supposed to leave. / He had to leave (and did).' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Je ___ quand le téléphone a sonné.', hint: 'dormir', answers: ['dormais'], en: 'I was sleeping when the phone rang.', explain: 'Ongoing background action → imparfait.' },
      { type: 'cloze', sentence: 'Il pleuvait, alors nous ___ à la maison.', hint: 'rester', answers: ['sommes restés', 'sommes restées'], en: 'It was raining, so we stayed home.', explain: 'A completed event → passé composé.' },
      { type: 'cloze', sentence: 'Quand j’___ petit, j’habitais à Nice.', hint: 'être', answers: ['étais'], en: 'When I was little, I lived in Nice.', explain: 'Age/description → imparfait.' },
      { type: 'cloze', sentence: 'Hier, j’___ trois fois.', hint: 'appeler, you called', answers: ['ai appelé'], en: 'Yesterday I called three times.', explain: 'A specific number of times → passé composé.' },
      { type: 'cloze', sentence: 'D’habitude, nous ___ le bus.', hint: 'prendre', answers: ['prenions'], en: 'We usually took the bus.', explain: 'Habit → imparfait.' },
      { type: 'cloze', sentence: 'Tout à coup, la lumière ___.', hint: 's’éteindre', answers: ['s’est éteinte'], en: 'Suddenly, the light went out.', explain: 'Sudden event → passé composé (reflexive → être, agreement).' },
      {
        type: 'mcq',
        prompt: 'Choose the natural sentence.',
        options: ['Il a fait beau et les oiseaux chantaient.', 'Il faisait beau et les oiseaux chantaient.', 'Il faisait beau et les oiseaux ont chanté.'],
        answer: 1,
        explain: 'Pure scene-setting → both verbs in the imparfait.',
      },
      {
        type: 'mcq',
        prompt: '“J’ai su la vérité hier” means…',
        options: ['I knew the truth yesterday.', 'I found out the truth yesterday.'],
        answer: 1,
        explain: 'savoir in the passé composé = to find out.',
      },
      {
        type: 'mcq',
        prompt: 'When I arrived, everyone was dancing.',
        options: ['Quand je suis arrivé, tout le monde dansait.', 'Quand j’arrivais, tout le monde a dansé.', 'Quand je suis arrivé, tout le monde a dansé.'],
        answer: 0,
        explain: 'Event (arrival) interrupts an ongoing action (dancing).',
      },
      { type: 'cloze', sentence: 'Elle ___ un livre quand je suis entré.', hint: 'lire', answers: ['lisait'], en: 'She was reading a book when I came in.', explain: 'Ongoing action interrupted → imparfait.' },
      { type: 'translate', en: 'It was cold, so I put on a sweater.', answers: ['Il faisait froid, alors j’ai mis un pull', 'Il faisait froid donc j’ai mis un pull', 'Il faisait froid, donc j’ai mis un pull', 'Il faisait froid alors j’ai mis un pull'] },
    ],
  },

  {
    id: 'y-en',
    level: 'B1',
    title: 'The pronouns y and en',
    titleFr: 'Les pronoms y et en',
    summary: 'Two tiny pronouns that replace places, things after à, and quantities after de.',
    minutes: 9,
    sections: [
      {
        heading: 'y — there, about it',
        blocks: [
          { type: 'p', text: '**y** replaces a place (à, en, dans, chez, sur…) or **à + thing**:' },
          {
            type: 'examples',
            items: [
              { fr: 'Tu vas à Paris ? — Oui, j’y vais.', en: 'Yes, I’m going there.' },
              { fr: 'Elle habite en Suisse ? — Oui, elle y habite.', en: 'Yes, she lives there.' },
              { fr: 'Tu penses à ton examen ? — Oui, j’y pense.', en: 'Yes, I’m thinking about it.' },
              { fr: 'On y va !', en: 'Let’s go!' },
            ],
          },
          { type: 'warn', text: 'For **à + person**, use lui/leur, not y: *Je pense **à elle*** (stressed pronoun after penser à).' },
        ],
      },
      {
        heading: 'en — some, of it, from there',
        blocks: [
          { type: 'p', text: '**en** replaces **de + noun**: partitives, quantities, and verbs with de.' },
          {
            type: 'examples',
            items: [
              { fr: 'Tu veux du café ? — Oui, j’en veux.', en: 'Yes, I want some.' },
              { fr: 'Tu as des frères ? — J’en ai deux.', en: 'I have two (of them).' },
              { fr: 'Il a beaucoup d’amis ? — Il en a beaucoup.', en: 'He has lots.' },
              { fr: 'Tu parles de ton voyage ? — Oui, j’en parle.', en: 'Yes, I’m talking about it.' },
              { fr: 'Tu viens de la gare ? — Oui, j’en viens.', en: 'Yes, I’ve come from there.' },
            ],
          },
          { type: 'tip', text: 'Keep the number or quantity at the end: *J’en ai **deux**. J’en veux **un peu**.*' },
        ],
      },
      {
        heading: 'Position',
        blocks: [
          { type: 'p', text: 'Like other object pronouns: before the conjugated verb, before the auxiliary, before an infinitive, after an affirmative imperative.' },
          {
            type: 'examples',
            items: [
              { fr: 'Je n’y vais pas. / Je n’en veux pas.', en: 'Negatives' },
              { fr: 'J’y suis allé. / J’en ai mangé.', en: 'Passé composé' },
              { fr: 'Vas-y ! / Prends-en !', en: 'Imperative (note: va → vas-y, prends → prends-en)' },
              { fr: 'Il y a du pain ? — Oui, il y en a.', en: 'y and en together: always y before en' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Replace the place with y.', source: 'Je vais à la plage.', answers: ['J’y vais'] },
      { type: 'transform', instruction: 'Replace the object with en.', source: 'Je veux du café.', answers: ['J’en veux'] },
      { type: 'transform', instruction: 'Replace the object with en.', source: 'J’ai trois enfants.', answers: ['J’en ai trois'], explain: 'Keep the number at the end.' },
      { type: 'transform', instruction: 'Answer in the negative with y.', source: 'Tu habites à Lyon ?', answers: ['Non, je n’y habite pas', 'Je n’y habite pas'] },
      { type: 'cloze', sentence: 'Tu penses à tes vacances ? — Oui, j’___ pense souvent.', answers: ['y'], en: 'Are you thinking about your holidays? — Yes, I often think about them.', explain: 'penser à + thing → y.' },
      { type: 'cloze', sentence: 'Tu as besoin de ton ordinateur ? — Oui, j’___ ai besoin.', answers: ['en'], en: 'Do you need your computer? — Yes, I need it.', explain: 'avoir besoin de → en.' },
      { type: 'cloze', sentence: 'Il reste du gâteau ? — Oui, il ___ reste un peu.', answers: ['en'], en: 'Is there any cake left? — Yes, there’s a little.', explain: 'Quantity (un peu) → en.' },
      { type: 'cloze', sentence: 'Tu es déjà allé au Japon ? — Oui, j’___ suis allé l’an dernier.', answers: ['y'], en: 'Have you been to Japan? — Yes, I went there last year.', explain: 'Place → y, before the auxiliary.' },
      { type: 'mcq', prompt: 'Il y a des croissants ? — Oui, …', options: ['il en y a.', 'il y en a.', 'il y a en.'], answer: 1, explain: 'y always comes before en: il y en a.' },
      { type: 'mcq', prompt: 'Go on! (tu)', options: ['Va-y !', 'Vas-y !', 'Y va !'], answer: 1, explain: 'The s comes back before y for pronunciation: vas-y.' },
      { type: 'translate', en: 'I have two (of them).', answers: ['J’en ai deux'] },
    ],
  },

  {
    id: 'futur-simple',
    level: 'B1',
    title: 'The futur simple',
    titleFr: 'Le futur simple',
    summary: 'Infinitive + endings — plus a dozen irregular stems to memorise.',
    minutes: 8,
    sections: [
      {
        heading: 'Formation',
        blocks: [
          { type: 'p', text: 'Add the endings to the **infinitive** (drop the final -e of -re verbs). The endings look like **avoir** in the present.' },
          {
            type: 'table',
            head: ['', 'Ending', 'parler', 'finir', 'prendre'],
            rows: [
              ['je', '-ai', 'parlerai', 'finirai', 'prendrai'],
              ['tu', '-as', 'parleras', 'finiras', 'prendras'],
              ['il / elle / on', '-a', 'parlera', 'finira', 'prendra'],
              ['nous', '-ons', 'parlerons', 'finirons', 'prendrons'],
              ['vous', '-ez', 'parlerez', 'finirez', 'prendrez'],
              ['ils / elles', '-ont', 'parleront', 'finiront', 'prendront'],
            ],
          },
        ],
      },
      {
        heading: 'Irregular stems',
        blocks: [
          {
            type: 'table',
            head: ['Verb', 'Stem', 'Verb', 'Stem'],
            rows: [
              ['être', 'ser-', 'avoir', 'aur-'],
              ['aller', 'ir-', 'faire', 'fer-'],
              ['venir', 'viendr-', 'tenir', 'tiendr-'],
              ['pouvoir', 'pourr-', 'voir', 'verr-'],
              ['vouloir', 'voudr-', 'envoyer', 'enverr-'],
              ['savoir', 'saur-', 'devoir', 'devr-'],
              ['falloir', 'faudr- (il faudra)', 'recevoir', 'recevr-'],
              ['courir', 'courr-', 'mourir', 'mourr-'],
            ],
          },
          { type: 'tip', text: 'Spelling-change verbs keep their change everywhere: *j’achèterai, j’appellerai, je paierai*.' },
        ],
      },
      {
        heading: 'Uses',
        blocks: [
          {
            type: 'list',
            items: [
              'Predictions and plans, especially further away or more formal than aller + infinitive: *Il fera beau demain.*',
              'After **quand, lorsque, dès que, aussitôt que** when the action is future — unlike English: *Quand **j’aurai** le temps, je t’appellerai* (When I have time…).',
              'Main clause after **si + présent**: *Si tu viens, on ira au cinéma.*',
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Demain, je ___ à Marie.', hint: 'parler', answers: ['parlerai'], en: 'Tomorrow I’ll talk to Marie.', explain: 'Infinitive + -ai.' },
      { type: 'cloze', sentence: 'Nous ___ le train de 8 heures.', hint: 'prendre', answers: ['prendrons'], en: 'We’ll take the 8 o’clock train.', explain: '-re verbs drop the e: prendr- + ons.' },
      { type: 'cloze', sentence: 'Tu ___ content.', hint: 'être', answers: ['seras'], en: 'You’ll be happy.', explain: 'être → ser-.' },
      { type: 'cloze', sentence: 'Ils ___ en Italie cet été.', hint: 'aller', answers: ['iront'], en: 'They’ll go to Italy this summer.', explain: 'aller → ir-.' },
      { type: 'cloze', sentence: 'Il ___ beau ce week-end.', hint: 'faire', answers: ['fera'], en: 'It’ll be nice this weekend.', explain: 'faire → fer-.' },
      { type: 'cloze', sentence: 'Vous ___ venir ?', hint: 'pouvoir', answers: ['pourrez'], en: 'Will you be able to come?', explain: 'pouvoir → pourr-.' },
      { type: 'cloze', sentence: 'On ___ bien.', hint: 'voir', answers: ['verra'], en: 'We’ll see.', explain: 'voir → verr-.' },
      { type: 'cloze', sentence: 'Quand tu ___ à Paris, appelle-moi.', hint: 'arriver', answers: ['arriveras'], en: 'When you get to Paris, call me.', explain: 'After quand with a future meaning, French uses the future.' },
      { type: 'mcq', prompt: 'I’ll call you when I have time.', options: ['Je t’appellerai quand j’ai le temps.', 'Je t’appellerai quand j’aurai le temps.', 'Je t’appelle quand j’aurai le temps.'], answer: 1, explain: 'quand + future when the action is in the future.' },
      { type: 'cloze', sentence: 'Si tu viens, nous ___ au cinéma.', hint: 'aller', answers: ['irons'], en: 'If you come, we’ll go to the cinema.', explain: 'si + présent → futur in the main clause.' },
      { type: 'translate', en: 'They will have a lot of work.', answers: ['Ils auront beaucoup de travail', 'Elles auront beaucoup de travail'] },
    ],
  },

  {
    id: 'conditionnel',
    level: 'B1',
    title: 'The conditional & si clauses',
    titleFr: 'Le conditionnel et les phrases avec si',
    summary: 'would, could, should — and the golden rule of si clauses.',
    minutes: 10,
    sections: [
      {
        heading: 'Formation: future stem + imparfait endings',
        blocks: [
          {
            type: 'table',
            head: ['', 'aimer', 'être (ser-)', 'pouvoir (pourr-)'],
            rows: [
              ['je', 'aimerais', 'serais', 'pourrais'],
              ['tu', 'aimerais', 'serais', 'pourrais'],
              ['il / elle / on', 'aimerait', 'serait', 'pourrait'],
              ['nous', 'aimerions', 'serions', 'pourrions'],
              ['vous', 'aimeriez', 'seriez', 'pourriez'],
              ['ils / elles', 'aimeraient', 'seraient', 'pourraient'],
            ],
          },
          { type: 'tip', text: 'Every irregular future stem works here too: *j’irais, je ferais, je viendrais, je voudrais, je devrais…*' },
        ],
      },
      {
        heading: 'Uses',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je voudrais un café.', en: 'Politeness: I would like a coffee.' },
              { fr: 'Pourriez-vous m’aider ?', en: 'Polite request: Could you help me?' },
              { fr: 'Tu devrais te reposer.', en: 'Advice: You should rest.' },
              { fr: 'J’aimerais voyager au Japon.', en: 'Wish: I’d love to travel to Japan.' },
              { fr: 'Selon la presse, le ministre démissionnerait.', en: 'Unconfirmed news: The minister is reportedly resigning.' },
            ],
          },
        ],
      },
      {
        heading: 'Si clauses',
        blocks: [
          {
            type: 'table',
            head: ['Type', 'si + …', 'Main clause', 'Example'],
            rows: [
              ['Real / likely', 'présent', 'présent, futur, impératif', 'Si tu veux, on ira à la plage.'],
              ['Hypothetical', 'imparfait', 'conditionnel', 'Si j’avais de l’argent, j’achèterais une maison.'],
            ],
          },
          { type: 'warn', text: 'Never put the conditional (or the future) right after **si** meaning “if”: ~~Si j’aurais le temps~~ → *Si j’**avais** le temps*.' },
          { type: 'p', text: 'The order can be reversed: *J’achèterais une maison si j’avais de l’argent.*' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Je ___ un thé, s’il vous plaît.', hint: 'vouloir', answers: ['voudrais'], en: 'I would like a tea, please.', explain: 'Polite conditional: je voudrais.' },
      { type: 'cloze', sentence: '___-vous m’aider ?', hint: 'pouvoir', answers: ['Pourriez'], en: 'Could you help me?', explain: 'vous + pourr- + iez.' },
      { type: 'cloze', sentence: 'Tu ___ dormir plus.', hint: 'devoir', answers: ['devrais'], en: 'You should sleep more.', explain: 'Advice: devoir in the conditional.' },
      { type: 'cloze', sentence: 'Si j’avais le temps, je ___ plus.', hint: 'lire', answers: ['lirais'], en: 'If I had time, I would read more.', explain: 'si + imparfait → conditionnel.' },
      { type: 'cloze', sentence: 'Si nous ___ riches, nous voyagerions.', hint: 'être', answers: ['étions'], en: 'If we were rich, we would travel.', explain: 'After si: imparfait.' },
      { type: 'cloze', sentence: 'Si tu viens, on ___ au restaurant.', hint: 'aller', answers: ['ira'], en: 'If you come, we’ll go to the restaurant.', explain: 'si + présent → futur.' },
      { type: 'cloze', sentence: 'Ils ___ venir s’ils avaient une voiture.', hint: 'pouvoir', answers: ['pourraient'], en: 'They could come if they had a car.', explain: 'Hypothetical → conditionnel.' },
      { type: 'mcq', prompt: 'If I were you, I would call her.', options: ['Si j’étais toi, je l’appellerais.', 'Si je serais toi, je l’appellerais.', 'Si j’étais toi, je l’appellerai.'], answer: 0, explain: 'si + imparfait, conditionnel in the main clause.' },
      { type: 'mcq', prompt: '“Le président serait malade” (in a news report) means…', options: ['The president would be sick.', 'The president is reportedly sick.', 'The president will be sick.'], answer: 1, explain: 'The journalistic conditional marks unconfirmed information.' },
      { type: 'transform', instruction: 'Make it hypothetical (si + imparfait, conditionnel).', source: 'Si j’ai faim, je mange.', answers: ['Si j’avais faim, je mangerais'] },
      { type: 'translate', en: 'I would like to live in Paris.', answers: ['J’aimerais vivre à Paris', 'J’aimerais habiter à Paris', 'Je voudrais vivre à Paris', 'Je voudrais habiter à Paris', 'J’aimerais habiter Paris'] },
    ],
  },

  {
    id: 'relative-pronouns',
    level: 'B1',
    title: 'Relative pronouns: qui, que, où, dont',
    titleFr: 'Les pronoms relatifs simples',
    summary: 'Join two sentences into one — the choice depends on the pronoun’s role.',
    minutes: 10,
    sections: [
      {
        heading: 'Choosing the pronoun',
        blocks: [
          {
            type: 'table',
            head: ['Pronoun', 'Replaces', 'Example'],
            rows: [
              ['qui', 'the subject (followed by a verb)', 'L’homme qui parle est mon oncle.'],
              ['que (qu’)', 'the direct object (followed by a subject)', 'Le livre que je lis est génial.'],
              ['où', 'a place or a time', 'La ville où j’habite. Le jour où je suis né.'],
              ['dont', 'de + noun', 'Le film dont je parle. La fille dont le père est médecin.'],
            ],
          },
          { type: 'tip', text: 'Quick test: if a **verb** comes right after, it’s usually **qui**; if a **subject** (je, tu, Marie…) comes after, it’s **que**.' },
        ],
      },
      {
        heading: 'dont',
        blocks: [
          { type: 'p', text: 'Use **dont** with verbs and expressions built with **de**: *parler de, avoir besoin de, avoir peur de, se souvenir de, être fier de* — and for possession (whose).' },
          {
            type: 'examples',
            items: [
              { fr: 'C’est l’outil dont j’ai besoin.', en: 'It’s the tool (that) I need.' },
              { fr: 'Voici l’ami dont je t’ai parlé.', en: 'Here’s the friend I told you about.' },
              { fr: 'Une femme dont le fils est acteur.', en: 'A woman whose son is an actor.' },
            ],
          },
        ],
      },
      {
        heading: 'Agreement with que',
        blocks: [
          { type: 'p', text: 'que is never dropped in French (English often drops “that”). In compound tenses, the past participle agrees with the noun que replaces: *Les photos **que** j’ai pris**es***.' },
          { type: 'p', text: '**ce qui / ce que / ce dont** = what (the thing that): *Dis-moi **ce que** tu veux. **Ce qui** m’intéresse, c’est l’histoire.*' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'La femme ___ chante est ma sœur.', answers: ['qui'], en: 'The woman who is singing is my sister.', explain: 'Subject of chante → qui.' },
      { type: 'cloze', sentence: 'Le film ___ nous avons vu était nul.', answers: ['que'], en: 'The film (that) we saw was terrible.', explain: 'Direct object of avons vu, followed by a subject → que.' },
      { type: 'cloze', sentence: 'La ville ___ je suis né est petite.', answers: ['où'], en: 'The town where I was born is small.', explain: 'Place → où.' },
      { type: 'cloze', sentence: 'C’est le livre ___ je t’ai parlé.', answers: ['dont'], en: 'It’s the book I told you about.', explain: 'parler de → dont.' },
      { type: 'cloze', sentence: 'Je me souviens du jour ___ on s’est rencontrés.', answers: ['où'], en: 'I remember the day we met.', explain: 'où also works for time.' },
      { type: 'cloze', sentence: 'Voici l’ordinateur ___ j’ai besoin.', answers: ['dont'], en: 'Here’s the computer I need.', explain: 'avoir besoin de → dont.' },
      { type: 'cloze', sentence: 'Le garçon ___ tu regardes est mon cousin.', answers: ['que'], en: 'The boy you’re looking at is my cousin.', explain: 'Direct object of regardes → que.' },
      { type: 'cloze', sentence: 'Dis-moi ___ tu penses.', answers: ['ce que'], en: 'Tell me what you think.', explain: 'what = the thing that → ce que.' },
      { type: 'mcq', prompt: 'A man whose car is red.', options: ['Un homme que la voiture est rouge.', 'Un homme dont la voiture est rouge.', 'Un homme qui la voiture est rouge.'], answer: 1, explain: 'Possession (whose) → dont.' },
      { type: 'transform', instruction: 'Join the sentences with a relative pronoun.', source: 'J’ai un ami. Il habite à Rome.', answers: ['J’ai un ami qui habite à Rome'] },
      { type: 'transform', instruction: 'Join the sentences with a relative pronoun.', source: 'Voici la robe. J’ai acheté la robe hier.', answers: ['Voici la robe que j’ai achetée hier'], explain: 'que + agreement of the participle (robe is feminine).' },
    ],
  },

  {
    id: 'subjonctif',
    level: 'B1',
    title: 'The subjunctive',
    titleFr: 'Le subjonctif présent',
    summary: 'Formation and the main triggers: necessity, wishes, emotions, doubt.',
    minutes: 12,
    sections: [
      {
        heading: 'Formation',
        blocks: [
          { type: 'p', text: 'Take the **ils** form of the present, remove **-ent**, and add **-e, -es, -e, -ent**. For **nous** and **vous**, use the imparfait forms.' },
          {
            type: 'table',
            head: ['', 'parler (ils parlent)', 'finir (ils finissent)', 'prendre (ils prennent)'],
            rows: [
              ['que je', 'parle', 'finisse', 'prenne'],
              ['que tu', 'parles', 'finisses', 'prennes'],
              ['qu’il / elle', 'parle', 'finisse', 'prenne'],
              ['que nous', 'parlions', 'finissions', 'prenions'],
              ['que vous', 'parliez', 'finissiez', 'preniez'],
              ['qu’ils / elles', 'parlent', 'finissent', 'prennent'],
            ],
          },
        ],
      },
      {
        heading: 'Irregular subjunctives',
        blocks: [
          {
            type: 'table',
            head: ['Verb', 'que je…', 'que nous…'],
            rows: [
              ['être', 'sois', 'soyons'],
              ['avoir', 'aie', 'ayons'],
              ['aller', 'aille', 'allions'],
              ['faire', 'fasse', 'fassions'],
              ['pouvoir', 'puisse', 'puissions'],
              ['savoir', 'sache', 'sachions'],
              ['vouloir', 'veuille', 'voulions'],
              ['falloir', 'qu’il faille', '—'],
            ],
          },
        ],
      },
      {
        heading: 'When to use it',
        blocks: [
          { type: 'p', text: 'The subjunctive appears after **que** when the main clause expresses something **subjective** — not a plain fact:' },
          {
            type: 'table',
            head: ['Trigger', 'Examples'],
            rows: [
              ['Necessity', 'il faut que, il est important que'],
              ['Wish, will', 'vouloir que, souhaiter que, préférer que'],
              ['Emotion', 'être content / triste / surpris que, avoir peur que'],
              ['Doubt', 'douter que, ne pas penser que'],
              ['Some conjunctions', 'pour que, bien que, avant que, à condition que, sans que'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Il faut que tu viennes.', en: 'You have to come.' },
              { fr: 'Je veux que vous soyez heureux.', en: 'I want you to be happy.' },
              { fr: 'Je suis content que tu sois là.', en: 'I’m glad you’re here.' },
            ],
          },
          { type: 'warn', text: 'Same subject in both clauses → use an infinitive: ~~Je veux que je parte~~ → *Je veux partir*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Il faut que tu ___ tes devoirs.', hint: 'finir', answers: ['finisses'], en: 'You have to finish your homework.', explain: 'ils finissent → finiss- + es.' },
      { type: 'cloze', sentence: 'Je veux que vous ___ heureux.', hint: 'être', answers: ['soyez'], en: 'I want you to be happy.', explain: 'être: que vous soyez.' },
      { type: 'cloze', sentence: 'Il faut que nous ___ ensemble.', hint: 'parler', answers: ['parlions'], en: 'We need to talk.', explain: 'nous → same as imparfait: parlions.' },
      { type: 'cloze', sentence: 'Je suis content que tu ___ là.', hint: 'être', answers: ['sois'], en: 'I’m glad you’re here.', explain: 'Emotion → subjunctive.' },
      { type: 'cloze', sentence: 'Il est important qu’elle ___ la vérité.', hint: 'savoir', answers: ['sache'], en: 'It’s important that she knows the truth.', explain: 'savoir → sache.' },
      { type: 'cloze', sentence: 'Je voudrais que tu ___ le ménage.', hint: 'faire', answers: ['fasses'], en: 'I’d like you to do the cleaning.', explain: 'faire → fass-.' },
      { type: 'cloze', sentence: 'Il faut qu’ils ___ le bus de 8 h.', hint: 'prendre', answers: ['prennent'], en: 'They have to take the 8 o’clock bus.', explain: 'prendre → prenn-.' },
      { type: 'cloze', sentence: 'Bien qu’il ___ tard, je continue.', hint: 'être', answers: ['soit'], en: 'Although it’s late, I’m carrying on.', explain: 'bien que always takes the subjunctive.' },
      { type: 'mcq', prompt: 'I want to leave.', options: ['Je veux que je parte.', 'Je veux partir.', 'Je veux que je pars.'], answer: 1, explain: 'Same subject → infinitive.' },
      { type: 'mcq', prompt: 'Which one needs the subjunctive?', options: ['Je pense que…', 'Je sais que…', 'Je doute que…', 'Il est sûr que…'], answer: 2, explain: 'Doubt triggers the subjunctive; certainty does not.' },
      { type: 'translate', en: 'You have to come. (tu)', answers: ['Il faut que tu viennes'] },
    ],
  },

  {
    id: 'double-pronouns',
    level: 'B1',
    title: 'Pronoun order',
    titleFr: 'L’ordre des doubles pronoms',
    summary: 'When two object pronouns meet: “Je te le donne”, “Il le lui a dit”.',
    minutes: 8,
    sections: [
      {
        heading: 'Before the verb',
        blocks: [
          {
            type: 'table',
            head: ['1', '2', '3', '4', '5'],
            rows: [
              ['me, te, se, nous, vous', 'le, la, les', 'lui, leur', 'y', 'en'],
            ],
            caption: 'Pronouns always appear in this order.',
          },
          {
            type: 'examples',
            items: [
              { fr: 'Il me donne le livre. → Il me le donne.', en: 'He gives it to me.' },
              { fr: 'Je donne la lettre à Paul. → Je la lui donne.', en: 'I give it to him.' },
              { fr: 'Elle nous a envoyé les photos. → Elle nous les a envoyées.', en: 'She sent them to us.' },
              { fr: 'Il y a du pain. → Il y en a.', en: 'There is some.' },
              { fr: 'Tu me prêtes de l’argent ? → Tu m’en prêtes ?', en: 'Will you lend me some?' },
            ],
          },
          { type: 'tip', text: 'Handy rule: when le/la/les meets lui/leur, the **le/la/les** comes first. When it meets me/te/nous/vous, the **me/te/nous/vous** comes first.' },
        ],
      },
      {
        heading: 'Affirmative imperative',
        blocks: [
          { type: 'p', text: 'After the verb, direct before indirect, with hyphens; **me/te** become **moi/toi** (but m’/t’ before en):' },
          {
            type: 'examples',
            items: [
              { fr: 'Donne-le-moi !', en: 'Give it to me!' },
              { fr: 'Envoyez-les-leur.', en: 'Send them to them.' },
              { fr: 'Donne-m’en.', en: 'Give me some.' },
            ],
          },
          { type: 'p', text: 'Negative imperatives use the normal order: *Ne me le donne pas.*' },
        ],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Replace both objects with pronouns.', source: 'Il me donne le livre.', answers: ['Il me le donne'] },
      { type: 'transform', instruction: 'Replace both objects with pronouns.', source: 'Je donne la lettre à Paul.', answers: ['Je la lui donne'] },
      { type: 'transform', instruction: 'Replace both objects with pronouns.', source: 'Elle raconte l’histoire aux enfants.', answers: ['Elle la leur raconte'] },
      { type: 'transform', instruction: 'Replace both objects with pronouns.', source: 'Tu nous montres tes photos ?', answers: ['Tu nous les montres ?'] },
      { type: 'mcq', prompt: 'Je vais offrir ce cadeau à ma mère. →', options: ['Je vais le lui offrir.', 'Je vais lui le offrir.', 'Je le vais lui offrir.'], answer: 0, explain: 'le before lui, both before the infinitive.' },
      { type: 'mcq', prompt: 'Il m’a donné des conseils. →', options: ['Il me les a donnés.', 'Il m’en a donné.', 'Il en m’a donné.'], answer: 1, explain: 'des conseils → en; me → m’ before a vowel.' },
      { type: 'mcq', prompt: 'Give it to me! (the key, tu)', options: ['Donne-moi-la !', 'Donne-la-moi !', 'Me la donne !'], answer: 1, explain: 'Imperative: direct (la) before indirect (moi).' },
      { type: 'cloze', sentence: 'Tu as dit la vérité à tes parents ? — Oui, je ___ ai dit.', answers: ['la leur'], en: 'Did you tell your parents the truth? — Yes, I told them.', explain: 'la (the truth) + leur (to the parents).' },
      { type: 'cloze', sentence: 'Vous avez des questions ? — Oui, j’___ ai deux.', answers: ['en'], en: 'Do you have questions? — Yes, I have two.', explain: 'Quantity → en.' },
      { type: 'order', en: 'She sends it to them.', words: ['Elle', 'le', 'leur', 'envoie'], punct: '.', extra: ['lui'] },
      { type: 'translate', en: 'Don’t give it to him! (tu, the book)', answers: ['Ne le lui donne pas !', 'Ne le lui donne pas'] },
    ],
  },
]
