# YoPratiqo RD Module 2 Workbook Review

## Scope

Resource:
`rd-m2-arrival-kit`

Route:
`/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee`

This PR keeps the existing route and changes the resource from a light arrival kit to a full printable workbook. No PDF asset exists in the repo, so the resource remains a print-friendly route with the existing print action.

## Architecture

- Data: `lib/yo/dominicanRepublicModule2Workbook.ts`
- Renderer: `components/yo/DominicanRepublicModule2Workbook.tsx`
- Route: `app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx`
- Registry: `lib/yo/printableResources.ts`

The old generic Dominican printables renderer remains in place for other modules. Module 2 no longer imports `DominicanModulePrintables` or `module2PrintablePack` in the active print route.

## Workbook Content Table

| Page | ID | Focus | Main practice |
|---:|---|---|---|
| 1 | `cover-mission` | Workbook mission | Goal selection |
| 2 | `diagnostic-retrieval` | Starting point | Diagnostic retrieval |
| 3 | `arrival-sdq-input` | Airport arrival | Contextual reading and noticing |
| 4 | `arrival-sdq-practice` | Airport transfer | Controlled production |
| 5 | `language-detective` | Patterns | Form-function noticing |
| 6 | `controlled-forms` | Forms | Fill-in-the-blank practice |
| 7 | `vocabulary-ladder` | Vocabulary | Recognition to production |
| 8 | `build-conversation` | Conversation | Ordering and gap repair |
| 9 | `taxi-lab` | Taxi | Choice and role card |
| 10 | `hotel-checkin` | Hotel arrival | Reservation card scenario |
| 11 | `hotel-problems` | Problems | Polite problem reporting |
| 12 | `listening-lab` | Listening | Simulated listening script |
| 13 | `dominican-spanish` | Local awareness | Recognition-only Dominican forms |
| 14 | `real-world-reading` | Reading | Hotel message comprehension |
| 15 | `writing-workshop` | Writing | Reception message |
| 16 | `speaking-mission-prep` | Speaking | Teacher-ready interaction map |
| 17 | `cumulative-retrieval` | Review | Mixed retrieval |
| 18 | `performance-check` | Assessment | Complete travel sequence |
| 19 | `objective-answer-key` | Solutions | Objective answer key |
| 20 | `model-responses-self-assessment` | Reflection | Model responses and self-assessment |

## Coverage

- Logical pages: 20
- Declared meaningful learner response opportunities: 196
- Practice mechanics: diagnostic retrieval, contextual input, noticing, controlled form, retrieval ladder, conversation building, matching, choice, listening simulation, reading, writing, speaking preparation, cumulative retrieval, performance check, self-assessment, answer key.
- Required domains covered: airport, exit, taxi, hotel destination, price, hotel check-in, reservation, name, passport, room/service information, wifi, breakfast, checkout, help, key problem, hot water, repeat/slower speech, polite thanks.

## Originality Guard

The workbook data includes an explicit source note:

> Original YoPratiqo instructional content.

The workbook uses general language-teaching principles and does not copy commercial textbook text, commercial textbook exercise layouts, distinctive commercial sequencing, or the existing Module 2 digital dialogue verbatim.

Tests verify that the new workbook does not copy several existing digital-dialogue lines verbatim and does not include learner-facing development filler such as TODO, lorem, fixture, mock, or sample-text.

## Language Review

- Learner scaffolding is provided in FR / EN / ES through `YoLocalizedString`.
- Spanish target/reference text is rendered with `lang="es"` in the workbook renderer.
- Dominican-specific forms on page 13 are recognition-only and tell learners to keep using the simpler module phrases for production.

## Answer-Key Policy

Answers are isolated to pages 19 and 20.

The renderer does not use per-exercise `<details>` answer reveals. Open tasks are labelled through model responses or possible answers, not single mandatory answers.

## Print Review

The workbook uses `YoPrintPageShell` and page-level print breaks. Browser print preview should show:

- no app navigation in print view;
- white print background;
- readable page sections;
- pages 1-20 in order;
- objective answer key at the end;
- no fake PDF download.

## Manual QA Checklist

- Open the Module 2 resource card from the Module 2 page.
- Confirm the route remains `/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee`.
- Confirm the card says workbook/printable workbook, not a PDF download.
- Confirm print button opens browser print.
- Confirm page 19 and page 20 contain the answer/model response material.
- Confirm practice pages 1-18 do not show inline solutions under each exercise.
- Confirm Spanish target lines are visually distinct and readable.
- Confirm mobile layout has no horizontal overflow.

## Deferred

- No real PDF asset was generated.
- No MP3 or TTS generation was added.
- Modules 3-5 print routes remain on the existing printable-resource architecture.
- The old generic Module 2 printable pack remains in the codebase for legacy tests/data continuity, but it is no longer used by the active Module 2 print route.
