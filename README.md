# Petit à petit — French study

A focused, keyboard-friendly web app for learning French **grammar**, **vocabulary**, **verb conjugation** and **writing** — built to sit alongside input-heavy tools like LingQ, Alexa and Anki, and cover what they don’t: structured grammar, active recall of word forms, and conjugation until it’s automatic.

> *Petit à petit, l’oiseau fait son nid* — little by little, the bird builds its nest.

| Today | Grammar lesson | Vocabulary (typed recall) | Conjugation drill |
| --- | --- | --- | --- |
| ![Today](docs/screenshots/today.png) | ![Lesson](docs/screenshots/lesson.png) | ![Vocabulary](docs/screenshots/vocab.png) | ![Drill](docs/screenshots/drill.png) |

## What’s inside

**Today’s session — one mixed daily session**
- Press **Start** (or `Enter`) on Today to get everything that’s due in one queue: vocabulary reviews, a few new words, spaced reviews of grammar lessons, practice from lessons you’ve studied, and a short adaptive conjugation drill.
- The kinds of practice are interleaved rather than done in blocks, which tends to improve retention. Missed grammar and verb items come back a few questions later.
- Grammar lessons that are due for review are scored inside the session, and their review schedule moves on (or resets) accordingly.
- Capped at about 25 reviews + 5 new words + 5 grammar + 5 verbs (≈10–15 min); any extra reviews stay available under Vocabulary.

**Writing — corrections from Claude**
- 20 writing prompts from A1 to B2, each aimed at specific grammar (e.g. *Mon week-end dernier* → passé composé), plus free writing and your own topic.
- Editor with accent keys, a word-count target, clickable “useful phrases”, and drafts saved automatically.
- Claude marks every mistake inline, explains the rule in English, and links it to the lesson that teaches it. You also get a minimally corrected version, a more natural version, what you did well, and words worth keeping — added to your flashcards in one click.
- “Rewrite it yourself” lets you fix the text using the feedback and compares the two scores.
- Uses **your own Anthropic API key** (Settings → Writing feedback). The key is stored only in your browser — never in progress backups — and requests go directly from the browser to Anthropic. The default model is Claude Sonnet 5.5; a correction costs roughly a cent.

**Grammar — 30 lessons, A1 → B2, 320 exercises**
- Short explanations with tables, audio examples, “watch out” boxes for classic mistakes.
- Five exercise types: fill-in-the-blank, multiple choice, sentence building, translation, transformation.
- Instant feedback with a character-level diff and an explanation on every item. Wrong answers come back once at the end of the session.
- Score 80% to master a lesson; mastered lessons return for spaced review (1 → 3 → 7 → 16 → 35 → 90 days).

**Vocabulary — 617 high-frequency words in 25 themed decks**
- Scheduled with **FSRS** (the modern algorithm Anki now uses) via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs).
- Every word is learned both ways: *recognition* (FR → EN, self-graded) and *production* (EN → FR, typed and auto-graded, then you confirm the rating).
- Nouns are always learned with their article; gender is colour-coded **and** labelled (m/f) so it doesn’t rely on colour alone.
- Every word has an example sentence and translation, with audio.
- “I already know this” (K) skips words you know from Anki/LingQ in one keystroke.
- Add your own words, or **import from Anki / LingQ / a spreadsheet** (tab, semicolon or comma separated).

**Conjugation — 103 verbs × 9 tenses**
- A rule-based engine generates every form (regular groups, spelling-change verbs like *acheter / appeler / payer / manger*, irregulars, compound tenses with *être* agreement).
- Adaptive drills: verb/tense pairs you miss come up more often. After each answer you see the whole tense with your row highlighted.
- The prompt never gives away *j’ai* vs *je suis*; *il/elle* subjects test past-participle agreement.
- Full **verb tables** with audio for every form.

**Everything else**
- Daily goal, streak and an activity heatmap.
- Keyboard-first: `Enter` check/continue (and starts today’s session) · `Space` flip · `1–4` rate / choose · `K` known · `Esc` leave · `S` study · `P` practise · `⌘↵` send writing.
- On-screen accent keys (é è ê à ç ô û ù œ …), accent-tolerant marking (configurable), French typography (narrow spaces before `? ! : ;`).
- Text-to-speech in French via the Web Speech API — pick the best voice in Settings (on macOS, download an *Enhanced* or *Premium* French voice).
- Light and dark themes, responsive down to phone size, installable as a PWA and works offline.
- All progress lives in your browser (localStorage). Export/import a JSON backup in Settings to move between devices.

## Getting started

Requires Node 22.12+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the unit tests (conjugation engine, answer checking, SRS, content integrity) |
| `npm run lint` | Lint with oxlint |

## Deploying

It’s a static site — any static host works.

- **GitHub Pages:** move `docs/deploy-github-pages.yml` to `.github/workflows/deploy.yml`, push to `main`, then in *Settings → Pages* set *Source* to **GitHub Actions**. The workflow tests, builds with the right base path and publishes to `https://<you>.github.io/<repo>/`.
- **Vercel / Netlify:** import the repo; build command `npm run build`, output `dist`. `vercel.json` handles client-side routes. For a sub-path, set `BASE_PATH=/your-path/` at build time.

## How it fits with LingQ, Anki and Alexa

- **LingQ / Alexa** give you input (reading and listening). Keep doing that — it’s where most acquisition happens.
- **This app** gives the structure input alone doesn’t: one grammar point at a time with feedback, active production of words (typing them, with gender), and conjugation drills.
- **Anki:** if you already have a French deck, either keep it for vocabulary and use this app for grammar + conjugation, or import your cards (*File → Export → Notes in Plain Text*) under *Vocabulary → Add & import*.

## Project structure

```
src/
  data/
    grammar/      30 lessons (a1.ts … b2.ts) — explanations + exercises
    vocab/        25 decks (a1.ts … b2.ts) in a compact row format
    verbs.ts      103 verbs (irregular stems, auxiliaries, participles)
    writing.ts    20 writing prompts linked to lessons
    types.ts      content types
  lib/
    conjugate.ts  conjugation engine
    answer.ts     normalisation, accent-tolerant checking, diffs
    srs.ts        FSRS wrapper (ts-fsrs)
    store.ts      persisted app state (zustand)
    speech.ts     French text-to-speech
    ai.ts         Claude writing feedback (browser → Anthropic API, structured JSON)
  features/       today, session (mixed daily session), vocab, grammar,
                  conjugation, verbs, writing, settings
  components/     shared UI (feedback sheet, accent bar, dialogs…)
  styles/         design tokens, base, components, sessions, features
```

### Adding content

- **A word:** add a row to a deck in `src/data/vocab/*.ts`:
  `['bibliothèque', 'library', 'f', 'Je travaille à la bibliothèque.', 'I work at the library.']`
  The third column is `m` / `f` / `mf` / `mpl` / `fpl` for nouns, `adj:feminine-form` for adjectives, or a part of speech (`v`, `adv`, `expr`…).
- **A lesson:** add an object to `src/data/grammar/*.ts`. Blocks support `**bold**`, `*French in italics*` and `~~wrong form~~`.
- **A verb:** add it to `src/data/verbs.ts`. Regular verbs need only the infinitive; irregular ones need the present, past participle and any irregular future/subjunctive stems.

`npm test` checks the content for you (unique ids, well-formed exercises, balanced markup, every verb conjugating in every tense).

## Tech

React 19 · TypeScript · Vite 8 · React Router 8 (data mode, route-level code splitting) · zustand · ts-fsrs · lucide icons · Inter + Source Serif 4 (self-hosted) · vite-plugin-pwa · Vitest.
# french
