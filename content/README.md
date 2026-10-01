# Content

Everything learners study lives here as Markdown files: grammar lessons, vocabulary, reading texts, conversation role-plays, writing prompts and pronunciation sets. Edit a file, save it, and the running app (`npm run dev`) updates straight away. No code changes needed.

```
content/
  grammar/        a1/ a2/ b1/ b2/   lessons: explanations + exercises
  vocab/          a1/ a2/ b1/ b2/   themed word decks (one table per deck)
                  top5000/          the 5000 most frequent words, 100 per deck
  reading/        a1/ a2/ b1/ b2/   graded texts with translations
  stories/        a1/ a2/ b1/ b2/   listening stories (1–2 min) + questions
  audio/          a1/ a2/ b1/ b2/   Pimsleur-style audio lessons (one course, in file order)
  conversations/  a1/ a2/ b1/ b2/   AI role-plays
  writing/        a1/ a2/ b1/ b2/   writing prompts
  pronunciation/                    sound practice sets
```

## Rules that apply to every file

- **Front matter.** Each file starts with a block between `---` lines holding `key: value` fields (listed for each kind below).
- **`id` is permanent.** Progress, reviews and links are saved under it, so don't change it once people have studied the item. Use lowercase letters, digits and dashes: `passe-compose`.
- **Level = folder.** A lesson in `grammar/b1/` is a B1 lesson. To move it, move the file.
- **Order = file name.** Files are listed by their number prefix: `01-…`, `02-…`, `10-…`. Renumber to reorder. The name after the number is just for you.
- **Drafts.** Start a file name with `_` (e.g. `_07-subjunctive.md`) and the app ignores it.
- **Notes to yourself** go in HTML comments: `<!-- check this example with Marie -->`. They never show up in the app.
- **Inline formatting** anywhere in text: `**bold**`, `*French in italics*`, `~~a wrong form~~` (shown struck through).
- **Mistakes are caught for you.** If something's off, `npm run dev` shows an error overlay and `npm test` / `npm run build` fail, naming the exact spot, e.g. `content/grammar/a1/01-etre-avoir.md:57: The sentence needs exactly one ___ blank.`

---

## Grammar lessons — `grammar/<level>/NN-name.md`

```markdown
---
id: passe-compose
title: The passé composé
titleFr: Le passé composé
summary: Talk about finished actions in the past.
minutes: 10
---

## How it's built

The passé composé is **avoir** or **être** + a past participle.

| Infinitive | Participle |
| ---------- | ---------- |
| parler     | parlé      |
| finir      | fini       |

Table: An optional caption goes right under a table.

- A plain bullet point.
- Another one.

- J’ai mangé une pomme. | I ate an apple.
- Nous sommes partis tôt. | We left early.

> [!TIP]
> A tip, shown in a highlighted box.

> [!WARNING]
> A common mistake, e.g. never ~~J’ai allé~~.

## Exercises

### cloze
- sentence: Hier, j’___ un film.
- hint: regarder
- answer: ai regardé
- en: Yesterday I watched a film.
- explain: regarder takes avoir → j’ai regardé.
```

**Sections.** Each `## Heading` starts a section of the explanation. Inside a section you can use:

| You write | It becomes |
| --- | --- |
| a paragraph | text |
| `- item` lines | a bullet list |
| `- French \| English` lines | an examples list (every line needs the ` \| `, with a space on each side) |
| a table | a table (header row, `\|---\|` line, then rows; leave cells empty with `\|  \|`) |
| `Table: …` right after a table | the table's caption |
| `> [!TIP]` + `> text` | a tip box |
| `> [!WARNING]` + `> text` | a "watch out" box |

**Exercises.** `## Exercises` comes last. Each exercise is a `### type` heading followed by `- field: value` lines. Repeat `answer` (or `also`) for each accepted answer.

| Type | What the learner does | Fields |
| --- | --- | --- |
| `cloze` | fills the blank | `sentence` (with exactly one `___`), `answer` (one or more), `hint`, `en` (translation), `explain` (required) |
| `mcq` | picks one option | `prompt`, optional `sentence`, options as `- [ ] wrong` / `- [x] right` (exactly one `[x]`), `explain` (required) |
| `order` | puts word tiles in order | `en` (the meaning), `words` (the right order, separated by spaces), optional `also` (another correct full sentence), `extra` (distractor tiles), `punct` (final punctuation), `explain` |
| `translate` | translates into French | `en`, `answer` (one or more), `explain` |
| `transform` | rewrites a sentence | `instruction`, `source`, `answer` (one or more), `explain` |

```markdown
### mcq
- prompt: How do you say “I am 30 years old”?
- [ ] Je suis 30 ans.
- [x] J’ai 30 ans.
- explain: French uses avoir + ans for age.

### order
- en: We are at home.
- words: Nous sommes à la maison
- extra: avons
- punct: .

### translate
- en: They (all women) are French.
- answer: Elles sont françaises
- explain: elles for an all-female group.

### transform
- instruction: Make the sentence negative.
- source: Je mange de la viande.
- answer: Je ne mange pas de viande.
- explain: de la becomes de after a negative.
```

---

## Vocabulary decks — `vocab/<level>/NN-name.md`

```markdown
---
id: a1-food
title: Food & drink
titleFr: La nourriture
---

| French    | English | Type        | Example                    | Translation           | Note         |
| --------- | ------- | ----------- | -------------------------- | --------------------- | ------------ |
| pain      | bread   | m           | Je mange du pain.          | I eat bread.          |              |
| pomme     | apple   | f           | Une pomme par jour.        | An apple a day.       |              |
| délicieux | tasty   | adj:délicieuse | C’est délicieux !       | It’s delicious!       |              |
| manger    | to eat  | v           | On mange à midi.           | We eat at noon.       | regular -er  |
```

- **French** is the dictionary form, without the article (the Type gives the gender).
- **Type:** `m` or `f` for nouns, `mf` for either gender (le/la collègue), `mpl` / `fpl` for plural-only nouns (les gens); `adj` for adjectives with the same feminine, `adj:feminine-form` otherwise; or `v`, `adv`, `prep`, `conj`, `pron`, `expr`, `num`, `det`, `interj`.
- **Example / Translation** are optional but recommended. An example needs its translation. **Note** is optional (you can leave the column out).
- The columns don't need to line up; they're just easier to read when they do.

### The 5000 most frequent words — `vocab/top5000/NN-words-….md`

The same table format, but these decks aren't sorted by level folder or theme: they follow a frequency list, most common word first, 100 words per file. In the app they're a single "Top 5000 words" switch, and the files are introduced in file-name order, so keep the numbering. Because there's no level folder, the front matter says the level (used for the "New word · A2" label and for dictation):

```markdown
---
id: top5000-01
title: Words 1–100
titleFr: le, de, être, un…
level: A1
---
```

- A word that's also in a themed deck must be the **same row** (same French, English, Type and Example). It's then one word with one set of cards, shown in both decks; `npm test` checks this.
- The ranking comes from the lemma frequencies in [Lexique 3.83](http://www.lexique.org) (film subtitles + books, CC BY-SA 4.0), with function words merged (le/la/les → le) and a few artefacts and slurs removed. Glosses and examples were written for the app.

---

## Reading texts — `reading/<level>/NN-name.md`

Each French paragraph is followed by its English translation on a `>` line.

```markdown
---
id: a2-weekend-a-lyon
title: Un week-end à Lyon
titleEn: A weekend in Lyon
topic: Travel
---

Le week-end dernier, nous sommes allés à Lyon en train.

> Last weekend, we went to Lyon by train.

Nous avons visité la vieille ville et nous avons très bien mangé.

> We visited the old town and ate very well.
```

---

## Listening stories — `stories/<level>/NN-name.md`

A short story (about 120–240 words, 1–2 minutes read aloud) that learners hear without the text, then answer questions about. The story is French paragraphs each followed by a `>` translation, like a reading text; the questions are `### mcq` items (prompt, options with exactly one `[x]`, explain). At least 3 questions.

```markdown
---
id: a1-le-chat
title: Le chat de madame Martin
titleEn: Mrs Martin’s cat
topic: Neighbours
---

## Story

Madame Martin habite au troisième étage. Elle a un chat.

> Mrs Martin lives on the third floor. She has a cat.

## Questions

### mcq
- prompt: Où habite madame Martin ?
- [ ] au rez-de-chaussée
- [x] au troisième étage
- explain: « Madame Martin habite au troisième étage. »
```

Write the questions in French at every level — simple wording at A1–A2 (Où… ? Qui… ? Pourquoi… ?). Ask about the main events and a few details, in story order.

---

## Audio lessons — `audio/<level>/NN-name.md`

Hands-free lessons in the style of Pimsleur. You write the conversation and the phrases it uses; the app turns them into a ~12-minute spoken script: the dialogue first, then each phrase modelled, repeated, built up from the end, and asked for again at growing intervals ("How do you say…?" → pause to answer out loud → answer). Then the Practice prompts, a role play where the learner takes `role`'s lines, and the dialogue once more. The first lessons of the course are reviewed at the start of the next one.

Lessons form one course: number files across levels (a1/01… a1/06, a2/07…) so each builds on the earlier ones.

```markdown
---
id: audio-02-au-cafe
title: Un café, s’il vous plaît
titleEn: Ordering in a café
role: Alex
---

## Scene

You walk into a small café in Lyon. The waiter, Marc, comes over.

## Dialogue

- Marc: Bonjour ! Qu’est-ce que vous voulez ? | Hello! What would you like?
- Alex: Je voudrais un café, s’il vous plaît. | I’d like a coffee, please.

## Phrases

- Je voudrais · un café | I’d like a coffee | Optional note, read by the narrator.
- C’est combien ? | How much is it?

## Practice

- Je voudrais un croissant, s’il vous plaît. | Order a croissant, politely.
```

- **Scene**, the **notes** and the **Practice cues** are read by an English voice: keep French words out of them (it would mispronounce them).
- **Dialogue**: exactly two speakers; `role` is the one the learner plays. At least 4 lines.
- **Phrases**: at least 4, in the order they're taught. Split long phrases into chunks with ` · ` between words; the learner repeats them from the end (*s’il vous plaît* → *un café s’il vous plaît* → the whole phrase). Cover everything the learner says in the dialogue.
- **Practice**: French answer | English cue. Recombine the phrases into new sentences — that's where the learning happens.

## Conversation role-plays — `conversations/<level>/NN-name.md`

```markdown
---
id: pharmacy
title: At the pharmacy
titleFr: À la pharmacie
icon: stethoscope
aiName: Claire
lessons: questions, partitive
---

## Setting

You have a sore throat and go into a pharmacy. (Shown to the learner.)

## AI role

You play Claire, a friendly pharmacist. What she knows: prices, what's in stock, a small complication to make it interesting. Keep replies short, in simple A2 French. (Instructions for the AI.)

## Opening

Bonjour ! Qu'est-ce que je peux faire pour vous ?

> Hello! What can I do for you?

## Goals

- explain-symptoms: Explain what's wrong
- buy-medicine: Buy something for your throat

## Phrases

- J'ai mal à la gorge. | I have a sore throat.
- C'est combien ? | How much is it?
```

- **icon:** one of `coffee`, `croissant`, `map`, `hotel`, `stethoscope`, `shopping`, `phone`, `briefcase`, `home`, `train`, `party`, `package`, `utensils`, `handshake`, `newspaper`, `plane`, `user`, `ticket`.
- **lessons:** ids of the grammar lessons it practices, separated by commas.
- **Goals:** `- short-id: what to do`. Like `id`, a goal id is permanent once used.

---

## Writing prompts — `writing/<level>/NN-name.md`

```markdown
---
id: mon-week-end
title: My weekend
titleFr: Mon week-end
focus: the passé composé
lessons: passe-compose
words: 50-100
---

Tell a friend what you did last weekend: where you went, who you saw and what you liked.

## Phrases

- Samedi matin, je suis allé(e)…
- Ensuite, nous avons…
```

`words` is the suggested length range. The text before `## Phrases` is the task shown to the learner.

---

## Pronunciation sets — `pronunciation/NN-name.md`

```markdown
---
id: u-ou
title: u vs ou
sound: u · ou
---

How to make the sound: lips, tongue, a comparison with English.

## Sentences

- Tu as tout vu ? | Did you see everything?
- Où est la rue ? | Where is the street?
```

---

## What stays in code

The verb list (`src/data/verbs.ts`) and the pronunciation hints matched against misheard words (`src/data/soundTips.ts`) are rules rather than content, so they stay in TypeScript.

Checking your changes: `npm test` validates every file (unique ids, exercises well-formed, lessons referenced by role-plays and prompts exist). The parser is `src/content/parse.ts`.
