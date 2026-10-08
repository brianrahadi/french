# Roadmap: what's built, and what's next

The road-to-B2 plan (Roadmap page + the daily lesson on Today) now runs entirely
in the app. This note records what was added for it and the features still
missing for a fully rigorous DELF B2 preparation, in the order they'd pay off.

## Built

- **52-week plan** (`src/features/roadmap/plan.ts`): five phases, one grammar
  focus per week linked to an app lesson, a writing prompt, a role-play and
  (A1) a pronunciation set. Every lesson A1–B2 is taught by the end of its phase
  (checked by a test).
- **Daily lesson** on Today: the mixed session first, then the weekday's job.
  Every block opens a screen in the app; blocks tick themselves off from what
  you did that day (lesson, writing, timed writing, role-play, DELF oral,
  dictation, speaking, story, text, audio lesson, words added).
- **Exit tests measured from progress** (`exits.ts`), grouped by area:
  everything built in at the level done (lessons, stories, audio lessons,
  graded texts, writing prompts, role-plays, A1 pronunciation sets) plus the
  volume the phase's blocks add up to (writings, conversations, dictation and
  read-aloud sentences, extra texts, words, study time). A test checks the
  volume never exceeds what the phase's blocks give room for. Finished
  conversations are kept as short records (`talkLog`) so pruning old
  transcripts never undoes a passed line. Today shows each area's progress;
  the Library shelves and the Grammar, Dictation, Speaking, Vocabulary and Weak
  spots pages show their own lines (`progress.tsx`).
- **Study time** (`lib/studyTime.ts`, `lib/useStudyTimer.ts`): seconds per
  kind of page per day per device, counted while the page is visible and in
  use (input or speech in the last two minutes), merged across devices without
  double counting. Phase hours are computed from the daily blocks, so the plan,
  the exit test and the per-area time targets agree. Days before tracking are
  estimated from recorded activity.
- **New content**: 10 grammar lessons (venir/savoir/connaître, the imperative,
  demonstrative & possessive pronouns, reported speech, conjunctions with the
  subjunctive, nominalization, emphasis, registers, passé simple, nuancing),
  10 writing prompts (incl. six B2 essays), and the **DELF B2 oral exam**
  role-play (an examiner who hands you a press article and debates you).
- **Timed writing**: `/writing/new?prompt=…&timed=60` shows a countdown and
  records the time allowed and taken on the writing.
- **Generate a text from a link**: `/library?generate=B1#texts` opens “Write me
  a new story” at that level.

## Next, in priority order

1. **Reading comprehension questions (CE).** Built-in texts have no questions,
   so reading isn't scored. Add an optional `## Questions` section to reading
   texts (same `### mcq` format as stories), score it like stories, and ask the
   AI for 6–8 questions when it generates a text. Then add “every B1/B2 text
   answered at 70%+” to the exit tests.
2. **Mock exam mode.** One `/exam/:level` flow that runs the four DELF sections
   back to back with exam timing (CO ~30 min, CE 60, PE 60, PO 20 + 30 prep),
   scores each out of 25, applies the pass rule (50/100, no section under 5)
   and keeps a history. The exam block's Saturday would point at it instead of
   three separate blocks.
3. **Longer listening.** Stories are 1–2 minutes; DELF B2 audio runs up to
   ~8 minutes at natural speed. Add longer B2 stories (or AI-generated
   dialogues read by two voices) with questions, and a 1.1–1.2× speed option.
4. **Spoken monologue with feedback.** The oral exam's first part is a 5–10
   minute monologue. Record it in Speaking, transcribe it (browser recognition
   or the connected AI), and get feedback on structure, connectors and errors,
   logged to Weak spots like writing.
5. **Movable light weeks.** Travel and holiday weeks are fixed to weeks 4–5 and
   11 (built around a trip starting Oct 30 for a plan starting Oct 12). Let the
   learner mark any week as travel / holiday on the Roadmap and shift the
   schedule.
6. **More B2 stories and texts.** Four B2 stories and four B2 texts are used
   up quickly; until generation covers it, add 6–9 more of each. (B2 now has
   eight audio lessons, twelve writing prompts and ten role-plays.)
