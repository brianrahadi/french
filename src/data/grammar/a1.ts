import type { Lesson } from '../types'

export const A1_LESSONS: Lesson[] = [
  {
    id: 'etre-avoir',
    level: 'A1',
    title: 'Subject pronouns, être & avoir',
    titleFr: 'Les pronoms, être et avoir',
    summary: 'The two most important verbs in French — and the pronouns that go with them.',
    minutes: 8,
    sections: [
      {
        heading: 'Subject pronouns',
        blocks: [
          {
            type: 'table',
            head: ['Singular', '', 'Plural', ''],
            rows: [
              ['je (j’)', 'I', 'nous', 'we'],
              ['tu', 'you (informal)', 'vous', 'you (plural / formal)'],
              ['il / elle', 'he, it / she, it', 'ils / elles', 'they (m. or mixed / f.)'],
              ['on', 'we (spoken), one, people', '', ''],
            ],
          },
          {
            type: 'list',
            items: [
              '**tu** is for friends, family, children and pets. **vous** is for strangers, colleagues you don’t know well, and anyone older or senior — and for any group.',
              '**on** is used constantly in speech to mean “we”: *On va au cinéma ?* It always takes the il/elle form of the verb.',
              '**ils** covers any group with at least one masculine noun or person. **elles** is only for all-feminine groups.',
            ],
          },
        ],
      },
      {
        heading: 'Être — to be',
        blocks: [
          {
            type: 'table',
            head: ['', 'être'],
            rows: [
              ['je', 'suis'],
              ['tu', 'es'],
              ['il / elle / on', 'est'],
              ['nous', 'sommes'],
              ['vous', 'êtes'],
              ['ils / elles', 'sont'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Je suis canadien.', en: 'I am Canadian.' },
              { fr: 'Vous êtes prêts ?', en: 'Are you ready?' },
              { fr: 'Elles sont au bureau.', en: 'They are at the office.' },
            ],
          },
        ],
      },
      {
        heading: 'Avoir — to have',
        blocks: [
          {
            type: 'table',
            head: ['', 'avoir'],
            rows: [
              ['j’', 'ai'],
              ['tu', 'as'],
              ['il / elle / on', 'a'],
              ['nous', 'avons'],
              ['vous', 'avez'],
              ['ils / elles', 'ont'],
            ],
          },
          {
            type: 'p',
            text: '**je** becomes **j’** before a vowel or a silent h: *j’ai, j’habite*. Note the liaison in *nous‿avons, vous‿avez, ils‿ont* (a z sound) — it distinguishes **ils ont** (they have) from **ils sont** (they are).',
          },
        ],
      },
      {
        heading: 'Where English says “be” but French says “have”',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'J’ai 30 ans.', en: 'I am 30 (years old).' },
              { fr: 'Tu as faim ? Tu as soif ?', en: 'Are you hungry? Are you thirsty?' },
              { fr: 'J’ai froid. / J’ai chaud.', en: 'I’m cold. / I’m hot.' },
              { fr: 'Il a peur des chiens.', en: 'He is afraid of dogs.' },
              { fr: 'Vous avez raison.', en: 'You are right.' },
            ],
          },
          { type: 'warn', text: 'Never say ~~Je suis 30 ans~~ or ~~Je suis froid~~ (which means “I am a cold person”). Use **avoir**.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Nous ___ étudiants.', hint: 'être', answers: ['sommes'], en: 'We are students.', explain: 'nous → sommes.' },
      { type: 'cloze', sentence: 'Tu ___ un chien ?', hint: 'avoir', answers: ['as'], en: 'Do you have a dog?', explain: 'tu → as (the s is silent).' },
      { type: 'cloze', sentence: 'Ils ___ en retard.', hint: 'être', answers: ['sont'], en: 'They are late.', explain: 'ils → sont. Don’t confuse with ils ont (they have).' },
      { type: 'cloze', sentence: 'Elle ___ vingt ans.', hint: 'avoir', answers: ['a'], en: 'She is twenty.', explain: 'Age uses avoir: elle a vingt ans.' },
      {
        type: 'mcq',
        prompt: 'How do you say “I am 30 years old”?',
        options: ['Je suis 30 ans.', 'J’ai 30 ans.', 'J’ai 30 années.', 'Je suis 30 années.'],
        answer: 1,
        explain: 'French uses avoir + ans for age.',
      },
      {
        type: 'mcq',
        prompt: 'You’re meeting your new manager for the first time. Which pronoun do you use?',
        options: ['tu', 'vous'],
        answer: 1,
        explain: 'vous is the polite form for people you don’t know well or who are senior to you.',
      },
      { type: 'cloze', sentence: 'Vous ___ fatigués ?', hint: 'être', answers: ['êtes'], en: 'Are you tired?', explain: 'vous → êtes (with a circumflex).' },
      { type: 'cloze', sentence: 'On ___ faim !', hint: 'avoir', answers: ['a'], en: 'We’re hungry!', explain: 'on takes the il/elle form: on a.' },
      {
        type: 'mcq',
        prompt: 'Which sentence means “I’m cold”?',
        options: ['Je suis froid.', 'J’ai froid.', 'Je fais froid.'],
        answer: 1,
        explain: 'Physical sensations use avoir: j’ai froid, j’ai chaud, j’ai faim.',
      },
      { type: 'order', en: 'We are at home.', words: ['Nous', 'sommes', 'à', 'la', 'maison'], punct: '.', extra: ['avons'] },
      { type: 'translate', en: 'They (all women) are French.', answers: ['Elles sont françaises'], explain: 'elles for an all-female group; françaises agrees (feminine plural).' },
    ],
  },

  {
    id: 'articles',
    level: 'A1',
    title: 'Gender & articles',
    titleFr: 'Le genre et les articles',
    summary: 'Every noun is masculine or feminine. Learn the articles that show it.',
    minutes: 9,
    sections: [
      {
        heading: 'Every noun has a gender',
        blocks: [
          {
            type: 'p',
            text: 'French nouns are either **masculine** or **feminine** — even objects and ideas. The gender changes the article, the adjectives and the pronouns, so always learn a noun **with its article**: not *maison* but *la maison*.',
          },
        ],
      },
      {
        heading: 'Definite articles — the',
        blocks: [
          {
            type: 'table',
            head: ['', 'Singular', 'Plural'],
            rows: [
              ['Masculine', 'le livre', 'les livres'],
              ['Feminine', 'la table', 'les tables'],
              ['Before a vowel / silent h', 'l’ami, l’école, l’hôtel', 'les‿amis'],
            ],
          },
          {
            type: 'p',
            text: 'Use the definite article for specific things (*le livre de Paul*) **and** for things in general, especially after verbs of liking: *J’aime **le** chocolat* (I like chocolate), *Le sport est bon pour la santé*.',
          },
        ],
      },
      {
        heading: 'Indefinite articles — a, some',
        blocks: [
          {
            type: 'table',
            head: ['', 'Singular', 'Plural'],
            rows: [
              ['Masculine', 'un livre', 'des livres'],
              ['Feminine', 'une table', 'des tables'],
            ],
          },
          { type: 'tip', text: '**des** is often needed where English uses nothing: *J’ai **des** amis à Paris* — I have friends in Paris.' },
        ],
      },
      {
        heading: 'Clues to guess the gender',
        blocks: [
          {
            type: 'table',
            head: ['Usually feminine', 'Usually masculine'],
            rows: [
              ['-tion, -sion (la nation)', '-ment (le moment)'],
              ['-té (la liberté)', '-age (le fromage)'],
              ['-ure (la voiture)', '-eau (le bateau)'],
              ['-ette (la baguette)', '-isme (le tourisme)'],
              ['-ence, -ance (la chance)', '-oir (le miroir)'],
            ],
          },
          { type: 'warn', text: 'There are exceptions: **la** plage, **la** page, **l’eau** (f), **la** peau — and **le** problème, **le** système (Greek words in -ème are masculine).' },
        ],
      },
      {
        heading: 'Plurals',
        blocks: [
          {
            type: 'list',
            items: [
              'Most nouns add a silent **-s**: *un chat → des chats*.',
              '**-eau / -eu → -x**: *un gâteau → des gâteaux*, *un jeu → des jeux*.',
              '**-al → -aux**: *un journal → des journaux*, *un animal → des animaux*.',
              'Nouns ending in -s, -x, -z don’t change: *un pays → des pays*.',
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'mcq', prompt: 'Choose the article.', sentence: '___ maison', options: ['le', 'la', 'l’'], answer: 1, explain: 'maison is feminine: la maison.' },
      { type: 'mcq', prompt: 'Choose the article.', sentence: '___ problème', options: ['le', 'la'], answer: 0, explain: 'Words in -ème from Greek are masculine: le problème, le système.' },
      { type: 'cloze', sentence: 'J’aime ___ chocolat.', answers: ['le'], en: 'I like chocolate.', explain: 'Likes and dislikes take the definite article (general sense).' },
      { type: 'cloze', sentence: 'Il y a ___ pharmacie près d’ici ?', answers: ['une'], en: 'Is there a pharmacy near here?', explain: 'a/an + feminine noun → une.' },
      { type: 'cloze', sentence: '___ enfants jouent dans le parc.', answers: ['les'], en: 'The children are playing in the park.', explain: 'Plural definite article: les (with liaison: les‿enfants).' },
      { type: 'mcq', prompt: 'Which noun is feminine?', options: ['fromage', 'nation', 'bateau', 'moment'], answer: 1, explain: 'Nouns ending in -tion are feminine: la nation.' },
      { type: 'mcq', prompt: 'Choose the article.', sentence: '___ hôtel', options: ['le', 'la', 'l’'], answer: 2, explain: 'Before a vowel or silent h, le/la become l’.' },
      { type: 'transform', instruction: 'Make it plural.', source: 'le château', answers: ['les châteaux'], explain: '-eau → -eaux.' },
      { type: 'transform', instruction: 'Make it plural.', source: 'un journal', answers: ['des journaux'], explain: '-al → -aux, and un → des.' },
      { type: 'cloze', sentence: 'J’ai ___ amis à Paris.', answers: ['des'], en: 'I have friends in Paris.', explain: 'French needs an article where English has none: des amis.' },
      { type: 'translate', en: 'The apples are on the table.', answers: ['Les pommes sont sur la table'] },
    ],
  },

  {
    id: 'er-verbs',
    level: 'A1',
    title: 'Present tense of -er verbs',
    titleFr: 'Le présent des verbes en -er',
    summary: 'About 90% of French verbs end in -er and follow one simple pattern.',
    minutes: 9,
    sections: [
      {
        heading: 'Stem + ending',
        blocks: [
          { type: 'p', text: 'Remove **-er** from the infinitive to get the stem (*parler → parl-*), then add the endings:' },
          {
            type: 'table',
            head: ['', 'Ending', 'parler', 'aimer'],
            rows: [
              ['je (j’)', '-e', 'parle', 'aime'],
              ['tu', '-es', 'parles', 'aimes'],
              ['il / elle / on', '-e', 'parle', 'aime'],
              ['nous', '-ons', 'parlons', 'aimons'],
              ['vous', '-ez', 'parlez', 'aimez'],
              ['ils / elles', '-ent', 'parlent', 'aiment'],
            ],
          },
          { type: 'tip', text: '**parle, parles, parle, parlent** all sound the same — the -es and -ent endings are silent. Only the nous and vous forms sound different.' },
        ],
      },
      {
        heading: 'One tense, three English meanings',
        blocks: [
          {
            type: 'p',
            text: 'French has no separate continuous tense. *Je parle* means **I speak**, **I’m speaking** and **I do speak**. To stress “right now”, you can say *je suis en train de parler*.',
          },
          {
            type: 'examples',
            items: [
              { fr: 'Nous habitons à Lyon.', en: 'We live in Lyon.' },
              { fr: 'Qu’est-ce que tu regardes ?', en: 'What are you watching?' },
              { fr: 'Ils travaillent le samedi.', en: 'They work on Saturdays.' },
            ],
          },
        ],
      },
      {
        heading: 'Spelling changes to keep the sound',
        blocks: [
          {
            type: 'table',
            head: ['Verb type', 'Change', 'Example'],
            rows: [
              ['-ger', 'nous + e', 'manger → nous mangeons'],
              ['-cer', 'nous: c → ç', 'commencer → nous commençons'],
              ['e + consonant + er', 'e → è (not nous/vous)', 'acheter → j’achète'],
              ['é + consonant + er', 'é → è (not nous/vous)', 'préférer → je préfère'],
              ['-eler / -eter (most)', 'double consonant', 'appeler → j’appelle'],
              ['-oyer / -uyer', 'y → i', 'nettoyer → je nettoie'],
            ],
          },
          { type: 'p', text: 'These changes happen only when the ending is silent (je, tu, il, ils). The nous and vous forms keep the infinitive’s spelling: *nous achetons, vous préférez*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Nous ___ français.', hint: 'parler', answers: ['parlons'], en: 'We speak French.', explain: 'nous → -ons.' },
      { type: 'cloze', sentence: 'Ils ___ à Paris.', hint: 'habiter', answers: ['habitent'], en: 'They live in Paris.', explain: 'ils → -ent (silent).' },
      { type: 'cloze', sentence: 'Tu ___ la télé ?', hint: 'regarder', answers: ['regardes'], en: 'Are you watching TV?', explain: 'tu → -es.' },
      { type: 'cloze', sentence: 'Vous ___ le jazz ?', hint: 'aimer', answers: ['aimez'], en: 'Do you like jazz?', explain: 'vous → -ez.' },
      { type: 'cloze', sentence: 'Nous ___ à midi.', hint: 'manger', answers: ['mangeons'], en: 'We eat at noon.', explain: '-ger verbs keep an e before -ons to keep the soft g sound: mangeons.' },
      { type: 'cloze', sentence: 'Nous ___ le cours.', hint: 'commencer', answers: ['commençons'], en: 'We are starting the class.', explain: '-cer verbs take ç before o: commençons.' },
      { type: 'cloze', sentence: 'Elle ___ des pommes.', hint: 'acheter', answers: ['achète'], en: 'She is buying apples.', explain: 'acheter: e → è when the ending is silent.' },
      { type: 'cloze', sentence: 'Je m’___ Sophie.', hint: 'appeler', answers: ['appelle'], en: 'My name is Sophie.', explain: 'appeler doubles the l when the ending is silent: j’appelle.' },
      {
        type: 'mcq',
        prompt: '“Je travaille” can mean…',
        options: ['I work', 'I am working', 'Both'],
        answer: 2,
        explain: 'The French present covers both the simple and the continuous present.',
      },
      { type: 'order', en: 'They are listening to music.', words: ['Ils', 'écoutent', 'de', 'la', 'musique'], punct: '.', extra: ['écoutons'] },
      { type: 'translate', en: 'We are eating.', answers: ['Nous mangeons', 'On mange', 'Nous sommes en train de manger', 'On est en train de manger'] },
    ],
  },

  {
    id: 'negation',
    level: 'A1',
    title: 'Negation',
    titleFr: 'La négation',
    summary: 'ne… pas and friends: never, no longer, nothing, nobody.',
    minutes: 7,
    sections: [
      {
        heading: 'ne … pas',
        blocks: [
          { type: 'p', text: 'Put **ne** before the conjugated verb and **pas** after it. **ne** becomes **n’** before a vowel.' },
          {
            type: 'examples',
            items: [
              { fr: 'Je ne parle pas anglais.', en: 'I don’t speak English.' },
              { fr: 'Il n’aime pas le café.', en: 'He doesn’t like coffee.' },
              { fr: 'Je n’ai pas mangé.', en: 'I haven’t eaten.' },
            ],
          },
          { type: 'tip', text: 'In compound tenses, ne … pas goes around the auxiliary: *je **n’**ai **pas** mangé*.' },
        ],
      },
      {
        heading: 'Other negatives',
        blocks: [
          {
            type: 'table',
            head: ['French', 'Meaning', 'Example'],
            rows: [
              ['ne … jamais', 'never', 'Je ne bois jamais de café.'],
              ['ne … plus', 'no longer, not any more', 'Il n’habite plus ici.'],
              ['ne … rien', 'nothing', 'Je ne vois rien.'],
              ['ne … personne', 'nobody', 'Je ne connais personne.'],
              ['ne … que', 'only', 'Je n’ai que dix euros.'],
            ],
          },
        ],
      },
      {
        heading: 'un, une, des, du, de la → de',
        blocks: [
          { type: 'p', text: 'After a negative, indefinite and partitive articles become **de** (d’ before a vowel):' },
          {
            type: 'examples',
            items: [
              { fr: 'J’ai une voiture. → Je n’ai pas de voiture.', en: 'I don’t have a car.' },
              { fr: 'Il boit du lait. → Il ne boit pas de lait.', en: 'He doesn’t drink milk.' },
              { fr: 'Nous avons des enfants. → Nous n’avons pas d’enfants.', en: 'We don’t have children.' },
            ],
          },
          { type: 'warn', text: 'This does **not** apply after être: *Ce n’est pas **un** problème.* And le/la/les never change: *Je n’aime pas **le** café.*' },
        ],
      },
      {
        heading: 'In everyday speech',
        blocks: [{ type: 'p', text: 'Spoken French often drops the **ne**: *Je sais pas*, *C’est pas grave*. Recognise it, but keep **ne** in writing.' }],
      },
    ],
    exercises: [
      { type: 'transform', instruction: 'Make the sentence negative.', source: 'Je parle anglais.', answers: ['Je ne parle pas anglais'] },
      { type: 'transform', instruction: 'Make the sentence negative.', source: 'Il aime le café.', answers: ['Il n’aime pas le café'], explain: 'ne → n’ before a vowel. le stays le.' },
      { type: 'transform', instruction: 'Make the sentence negative.', source: 'J’ai une voiture.', answers: ['Je n’ai pas de voiture'], explain: 'une → de after a negative.' },
      { type: 'cloze', sentence: 'Je ne mange ___ de viande.', hint: 'never', answers: ['jamais'], en: 'I never eat meat.', explain: 'ne … jamais = never.' },
      { type: 'cloze', sentence: 'Il n’habite ___ ici.', hint: 'no longer', answers: ['plus'], en: 'He doesn’t live here any more.', explain: 'ne … plus = no longer.' },
      {
        type: 'mcq',
        prompt: 'Complete: “I don’t see anybody.”',
        sentence: 'Je ne vois ___.',
        options: ['rien', 'personne', 'jamais', 'plus'],
        answer: 1,
        explain: 'ne … personne = nobody.',
      },
      {
        type: 'mcq',
        prompt: 'Which is the correct negative of “C’est un problème”?',
        options: ['Ce n’est pas de problème.', 'Ce n’est pas un problème.', 'Ce n’est un pas problème.'],
        answer: 1,
        explain: 'After être, un/une don’t change to de.',
      },
      { type: 'transform', instruction: 'Make the sentence negative.', source: 'Nous avons des enfants.', answers: ['Nous n’avons pas d’enfants'], explain: 'des → de, and de → d’ before a vowel.' },
      { type: 'cloze', sentence: 'Je n’ai ___ dix euros.', hint: 'only', answers: ['que'], en: 'I only have ten euros.', explain: 'ne … que = only (a restriction, not a true negative).' },
      { type: 'order', en: 'I never eat in the morning.', words: ['Je', 'ne', 'mange', 'jamais', 'le', 'matin'], punct: '.', extra: ['pas'] },
      { type: 'translate', en: 'I have nothing.', answers: ['Je n’ai rien'] },
    ],
  },

  {
    id: 'questions',
    level: 'A1',
    title: 'Asking questions',
    titleFr: 'Poser des questions',
    summary: 'Three ways to ask yes/no questions, plus the question words.',
    minutes: 8,
    sections: [
      {
        heading: 'Yes/no questions: three registers',
        blocks: [
          {
            type: 'table',
            head: ['Style', 'Example', 'When'],
            rows: [
              ['Rising intonation', 'Tu viens ?', 'Everyday speech'],
              ['est-ce que', 'Est-ce que tu viens ?', 'Neutral — speech and writing'],
              ['Inversion', 'Viens-tu ?', 'Formal, writing'],
            ],
          },
          {
            type: 'p',
            text: 'With inversion, the pronoun goes after the verb with a hyphen. If the verb ends in a vowel before **il / elle / on**, add **-t-**: *Parle-**t**-il français ? A-**t**-elle faim ?*',
          },
        ],
      },
      {
        heading: 'Question words',
        blocks: [
          {
            type: 'table',
            head: ['French', 'English', 'Example'],
            rows: [
              ['qui', 'who', 'Qui est-ce ?'],
              ['que / qu’est-ce que', 'what', 'Qu’est-ce que tu fais ?'],
              ['quoi', 'what (after verb/prep.)', 'Tu fais quoi ? De quoi tu parles ?'],
              ['où', 'where', 'Où est la gare ?'],
              ['quand', 'when', 'Quand est-ce que tu pars ?'],
              ['comment', 'how', 'Comment tu t’appelles ?'],
              ['pourquoi', 'why', 'Pourquoi tu ris ?'],
              ['combien (de)', 'how much / many', 'Combien ça coûte ?'],
              ['quel / quelle / quels / quelles', 'which, what', 'Quelle heure est-il ?'],
            ],
          },
          { type: 'tip', text: '**quel** agrees with the noun it goes with: *quel film, quelle heure, quels livres, quelles chaussures* — they all sound the same.' },
        ],
      },
      {
        heading: 'Same question, four ways',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Tu habites où ?', en: 'casual' },
              { fr: 'Où tu habites ?', en: 'casual' },
              { fr: 'Où est-ce que tu habites ?', en: 'neutral' },
              { fr: 'Où habites-tu ?', en: 'formal' },
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        type: 'mcq',
        prompt: 'Which question is the most formal?',
        options: ['Vous parlez anglais ?', 'Est-ce que vous parlez anglais ?', 'Parlez-vous anglais ?'],
        answer: 2,
        explain: 'Inversion (verb-pronoun) is the formal register.',
      },
      { type: 'cloze', sentence: '___ est-ce que tu habites ? — À Lyon.', answers: ['Où'], en: 'Where do you live? — In Lyon.', explain: 'où = where.' },
      { type: 'cloze', sentence: '___ tu t’appelles ?', answers: ['Comment'], en: 'What’s your name?', explain: 'Literally “How do you call yourself?”' },
      { type: 'cloze', sentence: '___ coûte ce livre ? — 15 euros.', answers: ['Combien'], en: 'How much is this book?', explain: 'combien = how much.' },
      { type: 'cloze', sentence: '___ heure est-il ?', answers: ['Quelle'], en: 'What time is it?', explain: 'heure is feminine: quelle.' },
      { type: 'cloze', sentence: '___ est ton film préféré ?', answers: ['Quel'], en: 'What is your favourite film?', explain: 'film is masculine: quel.' },
      { type: 'transform', instruction: 'Turn it into a question with est-ce que.', source: 'Tu aimes le jazz.', answers: ['Est-ce que tu aimes le jazz ?'] },
      { type: 'transform', instruction: 'Turn it into a question with inversion.', source: 'Il parle français.', answers: ['Parle-t-il français ?'], explain: 'Add -t- between a vowel and il/elle/on.' },
      {
        type: 'mcq',
        prompt: 'What does “Qu’est-ce que tu fais ?” mean?',
        options: ['What are you doing?', 'Where are you going?', 'Who are you?'],
        answer: 0,
        explain: 'qu’est-ce que = what (object).',
      },
      { type: 'order', en: 'Why are you late?', words: ['Pourquoi', 'es-tu', 'en', 'retard'], punct: '?', extra: ['où'] },
      {
        type: 'translate',
        en: 'Where do you live? (informal)',
        answers: ['Où habites-tu ?', 'Où est-ce que tu habites ?', 'Tu habites où ?', 'Où tu habites ?'],
      },
    ],
  },

  {
    id: 'adjectives',
    level: 'A1',
    title: 'Adjectives: agreement & position',
    titleFr: 'Les adjectifs',
    summary: 'Adjectives agree with their noun and usually come after it — with a few famous exceptions.',
    minutes: 9,
    sections: [
      {
        heading: 'Agreement',
        blocks: [
          { type: 'p', text: 'Adjectives take the gender and number of the noun: **+e** for feminine, **+s** for plural.' },
          {
            type: 'table',
            head: ['', 'Masculine', 'Feminine'],
            rows: [
              ['Singular', 'un ami content', 'une amie contente'],
              ['Plural', 'des amis contents', 'des amies contentes'],
            ],
          },
          { type: 'p', text: 'Adjectives already ending in **-e** don’t change in the feminine: *un homme jeune, une femme jeune*. A mixed group takes the masculine plural.' },
        ],
      },
      {
        heading: 'Irregular feminines',
        blocks: [
          {
            type: 'table',
            head: ['Pattern', 'Example'],
            rows: [
              ['-eux → -euse', 'heureux → heureuse'],
              ['-if → -ive', 'sportif → sportive'],
              ['-er → -ère', 'cher → chère'],
              ['-on / -en → -onne / -enne', 'bon → bonne, canadien → canadienne'],
              ['-el → -elle', 'naturel → naturelle'],
              ['Fully irregular', 'blanc → blanche, long → longue, gentil → gentille'],
            ],
          },
        ],
      },
      {
        heading: 'Position: usually after the noun',
        blocks: [
          { type: 'p', text: 'Most adjectives follow the noun: *une voiture **rouge**, un film **intéressant***. But short, common adjectives of **B**eauty, **A**ge, **G**oodness and **S**ize (BAGS) go before:' },
          {
            type: 'examples',
            items: [
              { fr: 'une belle maison, un joli jardin', en: 'Beauty' },
              { fr: 'un jeune homme, un vieux château, une nouvelle voiture', en: 'Age' },
              { fr: 'un bon restaurant, une mauvaise idée', en: 'Goodness' },
              { fr: 'un grand appartement, une petite ville', en: 'Size' },
            ],
          },
          { type: 'warn', text: 'Before a masculine noun starting with a vowel, **beau, nouveau, vieux** become **bel, nouvel, vieil**: *un bel homme, un nouvel ami, un vieil arbre*.' },
        ],
      },
      {
        heading: 'Position can change meaning',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'un grand homme / un homme grand', en: 'a great man / a tall man' },
              { fr: 'mon ancien travail / un château ancien', en: 'my former job / an ancient castle' },
              { fr: 'ma propre chambre / une chambre propre', en: 'my own room / a clean room' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Une robe ___.', hint: 'vert', answers: ['verte'], en: 'A green dress.', explain: 'robe is feminine: vert → verte.' },
      { type: 'cloze', sentence: 'Des filles ___.', hint: 'heureux', answers: ['heureuses'], en: 'Happy girls.', explain: '-eux → -euse, plus -s for plural.' },
      { type: 'cloze', sentence: 'Une ___ maison.', hint: 'beau', answers: ['belle'], en: 'A beautiful house.', explain: 'beau → belle (feminine), placed before the noun (BAGS).' },
      { type: 'cloze', sentence: 'Un ___ ami.', hint: 'nouveau', answers: ['nouvel'], en: 'A new friend.', explain: 'nouveau → nouvel before a masculine noun starting with a vowel.' },
      {
        type: 'mcq',
        prompt: 'How do you say “a small car”?',
        options: ['une voiture petite', 'une petite voiture', 'un petit voiture'],
        answer: 1,
        explain: 'petit is a “size” adjective: it goes before the noun, and agrees (voiture is feminine).',
      },
      {
        type: 'mcq',
        prompt: 'How do you say “an interesting book”?',
        options: ['un intéressant livre', 'un livre intéressant', 'un livre intéressante'],
        answer: 1,
        explain: 'Most adjectives go after the noun. livre is masculine.',
      },
      { type: 'cloze', sentence: 'Mes parents sont très ___.', hint: 'gentil', answers: ['gentils'], en: 'My parents are very kind.', explain: 'Masculine plural: gentils.' },
      { type: 'cloze', sentence: 'Une ___ histoire.', hint: 'long', answers: ['longue'], en: 'A long story.', explain: 'long → longue (irregular), before the noun.' },
      { type: 'order', en: 'a beautiful old house', words: ['une', 'belle', 'vieille', 'maison'], extra: ['vieux'] },
      {
        type: 'mcq',
        prompt: 'Paul et Marie sont ___.',
        options: ['content', 'contente', 'contents', 'contentes'],
        answer: 2,
        explain: 'A mixed group takes the masculine plural.',
      },
      { type: 'translate', en: 'She is tall and blond.', answers: ['Elle est grande et blonde'] },
    ],
  },

  {
    id: 'possessives',
    level: 'A1',
    title: 'Possessive adjectives',
    titleFr: 'Les adjectifs possessifs',
    summary: 'my, your, his, her… — they agree with the thing owned, not the owner.',
    minutes: 6,
    sections: [
      {
        heading: 'The forms',
        blocks: [
          {
            type: 'table',
            head: ['', 'Masc. singular', 'Fem. singular', 'Plural'],
            rows: [
              ['my', 'mon', 'ma', 'mes'],
              ['your (tu)', 'ton', 'ta', 'tes'],
              ['his / her / its', 'son', 'sa', 'ses'],
              ['our', 'notre', 'notre', 'nos'],
              ['your (vous)', 'votre', 'votre', 'vos'],
              ['their', 'leur', 'leur', 'leurs'],
            ],
          },
        ],
      },
      {
        heading: 'Agreement with the object',
        blocks: [
          { type: 'p', text: 'The possessive agrees with the **noun that follows**, not with the owner. So **sa mère** can mean *his mother* or *her mother*; **son père** can mean *his father* or *her father*.' },
          {
            type: 'examples',
            items: [
              { fr: 'Julie aime son frère.', en: 'Julie loves her brother.' },
              { fr: 'Marc adore sa voiture.', en: 'Marc loves his car.' },
            ],
          },
          { type: 'tip', text: 'To make it clear, add **à lui / à elle**: *C’est sa voiture à elle.*' },
        ],
      },
      {
        heading: 'ma, ta, sa before a vowel',
        blocks: [
          { type: 'p', text: 'Before a feminine noun starting with a vowel or silent h, use **mon, ton, son** to avoid two vowels clashing: *mon amie, ton école, son histoire*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'C’est ___ frère.', hint: 'my', answers: ['mon'], en: 'This is my brother.', explain: 'frère is masculine: mon.' },
      { type: 'cloze', sentence: '___ sœur s’appelle Léa.', hint: 'my', answers: ['Ma'], en: 'My sister is called Léa.', explain: 'sœur is feminine: ma.' },
      { type: 'cloze', sentence: 'Je te présente ___ amie Julie.', hint: 'my', answers: ['mon'], en: 'Let me introduce my friend Julie.', explain: 'Feminine noun starting with a vowel → mon.' },
      { type: 'cloze', sentence: 'Paul adore ___ voiture.', hint: 'his', answers: ['sa'], en: 'Paul loves his car.', explain: 'voiture is feminine → sa, even though Paul is a man.' },
      { type: 'cloze', sentence: 'Marie parle avec ___ père.', hint: 'her', answers: ['son'], en: 'Marie is talking to her father.', explain: 'père is masculine → son.' },
      { type: 'cloze', sentence: 'Les enfants jouent avec ___ chien.', hint: 'their', answers: ['leur'], en: 'The children are playing with their dog.', explain: 'One dog → leur.' },
      { type: 'cloze', sentence: 'Ils adorent ___ enfants.', hint: 'their', answers: ['leurs'], en: 'They adore their children.', explain: 'Several children → leurs.' },
      { type: 'cloze', sentence: 'Vous avez ___ billets ?', hint: 'your, formal', answers: ['vos'], en: 'Do you have your tickets?', explain: 'vous + plural noun → vos.' },
      { type: 'mcq', prompt: '“sa maison” can mean…', options: ['his house', 'her house', 'his or her house'], answer: 2, explain: 'The possessive agrees with maison (f), not the owner.' },
      { type: 'translate', en: 'Our parents are here.', answers: ['Nos parents sont ici', 'Nos parents sont là'] },
    ],
  },

  {
    id: 'places',
    level: 'A1',
    title: 'Prepositions with places',
    titleFr: 'À, en, au : les lieux',
    summary: 'Saying where you live, where you go and where you’re from.',
    minutes: 7,
    sections: [
      {
        heading: 'Cities: à / de',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'J’habite à Paris.', en: 'I live in Paris.' },
              { fr: 'Je vais à Montréal.', en: 'I’m going to Montreal.' },
              { fr: 'Je viens de Lyon. / Elle vient d’Ottawa.', en: 'I’m from Lyon. / She’s from Ottawa.' },
            ],
          },
        ],
      },
      {
        heading: 'Countries depend on gender',
        blocks: [
          {
            type: 'table',
            head: ['Country', 'in / to', 'from', 'Examples'],
            rows: [
              ['Feminine (most ending in -e)', 'en', 'de / d’', 'en France, en Italie, de Chine'],
              ['Masculine', 'au', 'du', 'au Canada, au Japon, du Brésil'],
              ['Plural', 'aux', 'des', 'aux États-Unis, des Pays-Bas'],
              ['Masculine starting with a vowel', 'en', 'd’', 'en Iran, d’Israël'],
            ],
          },
          { type: 'warn', text: 'A few countries end in -e but are masculine: **le Mexique, le Cambodge, le Mozambique** → *au Mexique*.' },
        ],
      },
      {
        heading: 'à and de contract with le and les',
        blocks: [
          {
            type: 'table',
            head: ['', 'à', 'de'],
            rows: [
              ['+ le', 'au cinéma', 'du cinéma'],
              ['+ la', 'à la plage', 'de la plage'],
              ['+ l’', 'à l’école', 'de l’école'],
              ['+ les', 'aux toilettes', 'des toilettes'],
            ],
          },
          { type: 'p', text: 'For people’s homes and businesses, use **chez**: *chez moi* (at my place), *chez le médecin*, *chez le coiffeur*.' },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'J’habite ___ Montréal.', answers: ['à'], en: 'I live in Montreal.', explain: 'Cities take à.' },
      { type: 'cloze', sentence: 'Elle travaille ___ Canada.', answers: ['au'], en: 'She works in Canada.', explain: 'le Canada is masculine: au.' },
      { type: 'cloze', sentence: 'Nous partons ___ Italie.', answers: ['en'], en: 'We’re leaving for Italy.', explain: 'l’Italie is feminine: en.' },
      { type: 'cloze', sentence: 'Ils vivent ___ États-Unis.', answers: ['aux'], en: 'They live in the United States.', explain: 'Plural country: aux.' },
      { type: 'cloze', sentence: 'Je vais ___ cinéma.', answers: ['au'], en: 'I’m going to the cinema.', explain: 'à + le = au.' },
      { type: 'cloze', sentence: 'Tu vas ___ plage ?', answers: ['à la'], en: 'Are you going to the beach?', explain: 'à + la doesn’t contract.' },
      { type: 'cloze', sentence: 'Je vais ___ médecin.', answers: ['chez le'], en: 'I’m going to the doctor’s.', explain: 'Going to a person → chez.' },
      { type: 'cloze', sentence: 'Il vient ___ Japon.', answers: ['du'], en: 'He comes from Japan.', explain: 'le Japon (m) → de + le = du.' },
      { type: 'mcq', prompt: 'How do you say “I’m going to Mexico”?', options: ['Je vais en Mexique.', 'Je vais au Mexique.', 'Je vais à Mexique.'], answer: 1, explain: 'le Mexique is masculine despite the -e.' },
      { type: 'translate', en: 'I come from France.', answers: ['Je viens de France', 'Je suis de France'] },
    ],
  },

  {
    id: 'partitive',
    level: 'A1',
    title: 'Partitive articles & quantities',
    titleFr: 'Du, de la, des',
    summary: 'How to say “some”, and why quantities just take de.',
    minutes: 7,
    sections: [
      {
        heading: 'Some (of something)',
        blocks: [
          { type: 'p', text: 'For an unspecified amount of something you can’t count, French uses the **partitive article** — often where English uses no article at all.' },
          {
            type: 'table',
            head: ['', 'Article', 'Example'],
            rows: [
              ['Masculine', 'du', 'du pain, du fromage'],
              ['Feminine', 'de la', 'de la confiture, de la musique'],
              ['Before a vowel', 'de l’', 'de l’eau, de l’argent'],
              ['Plural', 'des', 'des pâtes, des fraises'],
            ],
          },
          {
            type: 'examples',
            items: [
              { fr: 'Je mange du pain.', en: 'I eat (some) bread.' },
              { fr: 'Tu veux de l’eau ?', en: 'Do you want (some) water?' },
            ],
          },
        ],
      },
      {
        heading: 'Partitive vs. definite',
        blocks: [
          { type: 'p', text: 'Talking about a thing **in general** (likes, dislikes, facts) → **le / la / les**. Talking about **some** of it → **du / de la / des**.' },
          {
            type: 'examples',
            items: [
              { fr: 'J’aime le fromage.', en: 'I like cheese (in general).' },
              { fr: 'J’achète du fromage.', en: 'I’m buying (some) cheese.' },
            ],
          },
        ],
      },
      {
        heading: 'Negatives and quantities → de',
        blocks: [
          {
            type: 'examples',
            items: [
              { fr: 'Je ne bois pas de café.', en: 'I don’t drink coffee.' },
              { fr: 'beaucoup de monde, un peu de sucre', en: 'a lot of people, a little sugar' },
              { fr: 'un kilo de pommes, une bouteille d’eau', en: 'a kilo of apples, a bottle of water' },
              { fr: 'assez d’argent, trop de travail', en: 'enough money, too much work' },
            ],
          },
        ],
      },
      {
        heading: 'Activities',
        blocks: [
          { type: 'p', text: '**faire de** + activity, **jouer de** + instrument, **jouer à** + game or sport:' },
          {
            type: 'examples',
            items: [
              { fr: 'Je fais du yoga et de la natation.', en: 'I do yoga and swimming.' },
              { fr: 'Elle joue du piano. / Il joue au tennis.', en: 'She plays the piano. / He plays tennis.' },
            ],
          },
        ],
      },
    ],
    exercises: [
      { type: 'cloze', sentence: 'Je voudrais ___ pain.', answers: ['du'], en: 'I’d like some bread.', explain: 'pain is masculine: du.' },
      { type: 'cloze', sentence: 'Tu veux ___ eau ?', answers: ['de l’'], en: 'Do you want some water?', explain: 'Before a vowel: de l’.' },
      { type: 'cloze', sentence: 'Elle mange ___ salade.', answers: ['de la'], en: 'She’s eating (some) salad.', explain: 'salade is feminine: de la.' },
      { type: 'cloze', sentence: 'Je ne mange pas ___ viande.', answers: ['de'], en: 'I don’t eat meat.', explain: 'After a negative: de.' },
      { type: 'cloze', sentence: 'J’aime ___ fromage.', answers: ['le'], en: 'I like cheese.', explain: 'General likes → definite article.' },
      { type: 'cloze', sentence: 'Il y a beaucoup ___ monde.', answers: ['de'], en: 'There are a lot of people.', explain: 'Quantities take de.' },
      { type: 'cloze', sentence: 'Une bouteille ___ vin, s’il vous plaît.', answers: ['de'], en: 'A bottle of wine, please.', explain: 'Containers/quantities + de.' },
      { type: 'mcq', prompt: 'How do you say “I play the guitar”?', options: ['Je joue à la guitare.', 'Je joue de la guitare.', 'Je joue la guitare.'], answer: 1, explain: 'jouer de + instrument.' },
      { type: 'mcq', prompt: 'How do you say “We’re buying apples”?', options: ['Nous achetons les pommes.', 'Nous achetons des pommes.', 'Nous achetons de pommes.'], answer: 1, explain: 'Some (unspecified) apples → des.' },
      { type: 'translate', en: 'I drink coffee every morning.', answers: ['Je bois du café tous les matins', 'Je bois du café chaque matin'] },
    ],
  },
]
