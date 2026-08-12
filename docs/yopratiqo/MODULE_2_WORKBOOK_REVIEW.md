# YoPratiqo RD Module 2 Workbook Review

## Scope

Resource:
`rd-m2-arrival-kit`

Route:
`/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee`

The resource is a print-friendly route, not a PDF asset. No PDF, MP3, or TTS asset was added.

## Architecture

- Data: `lib/yo/dominicanRepublicModule2Workbook.ts`
- Renderer: `components/yo/DominicanRepublicModule2Workbook.tsx`
- Route: `app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx`
- Registry: `lib/yo/printableResources.ts`

The old generic Dominican printables renderer remains in place for other modules. Module 2 no longer imports `DominicanModulePrintables` or `module2PrintablePack` in the active print route.

## V1.1 — what the pedagogical red team changed

V1 shipped with three structural defects that its own tests could not see. V1.1 fixes each of them architecturally rather than page by page, so a regression is a test failure rather than a content review miss.

### 1. Choices are now a discriminated union

```ts
type RdM2WorkbookChoice = string | YoLocalizedString;
```

- A **plain string** choice is a Spanish target alternative. It renders `lang="es"` and is never translated.
- A **`YoLocalizedString`** choice is learner-interface scaffolding (a meaning, a function label). It renders in the learner's own locale.

In V1, pages 5, 7, and 13 shipped French-only option strings (`lieu`, `clé`, `mot de passe`, `très vite`, `par là`) to English and Spanish learners. Both the renderer and the tests now resolve choices through `resolveRdM2WorkbookChoice`, so an untranslated gloss cannot reach an EN or ES learner without failing a test.

Spanish-locale glosses are written as short Spanish definitions rather than Spanish-to-Spanish echoes: `contraseña → la clave para conectarte`, not `contraseña → contraseña`.

### 2. Pages 19 and 20 are derived from the exercises

V1 authored `answerRef` labels by hand and authored the answer key separately. 77 of 101 references resolved to nothing — a learner looking up `D1` or `O7` found no answer.

V1.1 stores the answer on the item that asks the question, generates `answerRef` labels of the form `page.index`, and builds pages 19 and 20 by walking the practice pages. Dangling and duplicate references are structurally impossible, not merely tested for.

Each item declares how it is corrected:

| `answerKind` | Where the learner checks | Count |
|---|---|---:|
| `objective` | Page 19, exact answer | 108 |
| `model` | Page 20, one possible response | 50 |
| `self` | Activity-level guidance, no fixed answer | 30 |

`validateRdM2Workbook()` returns a list of integrity problems and is asserted empty in tests.

### 3. Response counts are derived, never declared

V1 declared 196 responses against 115 real items. V1.1 removed `responseCount` from the page shape; `countRdM2WorkbookPageResponses()` counts items that reserve writing space. Reading a Can-Do outcome or ticking a self-check uses `responseLines: 0` and counts as zero.

Derived total: **188 real learner actions**.

## Workbook Content Table

| Page | ID | Focus | Support | Responses |
|---:|---|---|---|---:|
| 1 | `cover-mission` | Eight Can-Do outcomes + personal priority | guided | 2 |
| 2 | `diagnostic-retrieval` | Cold production + 0–3 capability baseline | guided | 14 |
| 3 | `arrival-sdq-input` | Airport arrival, noticing | guided | 5 |
| 4 | `arrival-sdq-practice` | Reduced-support rebuild + transfer | reduced | 6 |
| 5 | `language-detective` | Form-to-function, determinate manipulation | guided | 6 |
| 6 | `controlled-forms` | `Tengo` + service questions, Spanish word bank | guided | 8 |
| 7 | `vocabulary-ladder` | Recognition → production → personalize | reduced | 12 |
| 8 | `build-conversation` | Ordering + gap repair | reduced | 9 |
| 9 | `taxi-lab` | Spanish alternatives + role card | reduced | 7 |
| 10 | `hotel-checkin` | Information transfer from a reservation card | reduced | 5 |
| 11 | `hotel-problems` | Register: polite vs abrupt | reduced | 5 |
| 12 | `listening-lab` | Digital audio bridge, gist → detail → dictation → shadowing | reduced | 13 |
| 13 | `dominican-spanish` | A general / B may hear / C safe to say | reduced | 10 |
| 14 | `real-world-reading` | Original arrival message, seven mechanics | reduced | 13 |
| 15 | `writing-workshop` | Scaffold → manipulate → independent + checklist | independent | 9 |
| 16 | `speaking-mission-prep` | Transfer: dying battery, driver cannot find you | independent | 9 |
| 17 | `cumulative-retrieval` | 23 items across ten mechanics | independent | 23 |
| 18 | `performance-check` | COMPRENDO / RECUERDO / PRODUZCO / RESUELVO | independent | 23 |
| 19 | `objective-answer-key` | Derived objective key, grouped by page | solutions | 0 |
| 20 | `model-responses-self-assessment` | Derived model key + 0–3 after-scale | solutions | 9 |

## Page-level rebuilds

**Page 1** now states all eight Module 2 outcomes before asking for a priority. Reading them is not counted as a response.

**Pages 2 and 20** share one capability scale with concrete descriptors (`0 = no idea`, `1 = I recognize it`, `2 = I can produce it with my notes`, `3 = I can produce it without help`), rating the same eight outcomes so the before/after gap is the learner's real result. The unexplained 1–5 confidence score is gone.

**Page 12** no longer depends on another person. It prints the Module 2 path, gives four navigation steps to the airport and hotel audio screens, then runs gist → detail → dictation → shadowing. Partner reading survives only as a labelled fallback note. The dictation answers are transcriptions of our own Module 2 audio; the originality test permits that on the listening page and nowhere else.

**Page 13** is split into three sections. Section A is the general Spanish the learner produces. Section B is six recognition-only items with a practical reason to exist: `pa'` reduction, final-`s` weakening, and `guagua` / `colmado` / `motoconcho` / `ahorita` — all already supported by course material. Two notes state that these are for understanding rather than imitation, and that nobody speaks "Dominican" uniformly. Section C gives four situations where the learner picks the safest beginner utterance. A test asserts that no regional word is ever a required production answer. The V1 items `muy rápido → très vite` and `por ahí → par là`, which were neither Dominican nor useful, are gone.

**Page 14** replaces the four-line hotel notice with an original seven-line arrival message from a fictional accommodation, then progresses through gist, specific information, sequencing, phrase location, vocabulary inference, detail manipulation, and a written reply.

**Page 15** is three stages plus a checklist: complete a structured message, change room / problem / requested action one at a time, then write an independent message with the model withheld until page 20.

**Page 16** is a genuine transfer task. Your phone battery is nearly dead and the hotel driver cannot find you at the airport exit. The brief lists seven communicative moves and supplies no script; planning fields are capped at one line each so they cannot become one. The learner performs without reading and self-rates 1–3.

**Page 17** is 23 items across recall, meaning, error correction, question formation, register choice, clarification, micro-reading, dialogue completion, situational response, and one Dominican recognition item. A test asserts translation is under half the page.

**Page 18** is four separated domains with unseen input for COMPRENDO, no word bank for RECUERDO, three independent productions for PRODUZCO, and one airport → transport → hotel → problem sequence for RESUELVO. The rubric scores only the twelve closed items and states explicitly that it issues no official level certification.

## Difficulty curve

Guided orientation on pages 1–3, plus 5–6 where new form focus is introduced. Reduced support across 4 and 7–14. Independent work on 15–18. Solutions on 19–20. A test asserts that no page between 15 and 18 falls back to guided support.

## Originality Guard

The workbook data carries an explicit source note and all V1.1 text was independently authored from the Module 2 communicative targets. No commercial textbook text, exercise layout, dialogue, or sequencing is reproduced, and no commercial book was searched for phrases or exercises during implementation.

The originality test additionally asserts that the existing Module 2 digital dialogue is not passed off as new workbook content, with the page 12 dictation as the single declared exception. Multiple-choice items store their correct answer twice by design (as the answer and as the option circled); the repeat detector counts that as one authored phrase.

## Duplication policy

Repetition is audited on cognitive demand, not text frequency. A Spanish phrase may recur up to six times provided the uses span at least three different activity kinds, so `Voy a este hotel.` moving from cold production to selection to role card to recall to assessment is reinforcement, while five pages of copying the same line would fail.

## Answer-Key Policy

Answers are isolated to pages 19 and 20. The renderer uses no per-exercise `<details>` reveal. Page 19 lists objective answers grouped by the page that asked them, with `page.index` references. Page 20 gives possible responses for open production and states that meaning, politeness, and length matter rather than exact words.

## Print Review

The workbook uses `YoPrintPageShell` and page-level print breaks. Answer-key rows print as reference lines without writing space; only practice items reserve dashed lines. Checklist and Can-Do rows print an empty square instead of a numbered circle.

## Manual QA Checklist

- Open the Module 2 resource card from the Module 2 page.
- Confirm the route remains `/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee`.
- Confirm the card says workbook / printable workbook, not a PDF download.
- Load the route with `?lang=en` and `?lang=es` and confirm the pages 5, 7, and 13 options are in the interface language, while pages 9, 11, and 13-C options stay Spanish.
- Pick five answer references at random from pages 2 to 18 and confirm each resolves on page 19 or 20.
- Confirm pages 1–18 show no inline solutions.
- Follow page 12 end to end with the digital module open on a phone.
- Confirm mobile layout has no horizontal overflow.

## Deferred

- No real PDF asset was generated.
- No MP3 or TTS generation was added; page 12 reuses the existing browser-speech buttons in the digital module.
- Modules 3–5 print routes remain on the existing printable-resource architecture. The V1.1 architecture has not been generalized to them.
- The old generic Module 2 printable pack remains in the codebase for legacy tests/data continuity, but it is no longer used by the active Module 2 print route.
