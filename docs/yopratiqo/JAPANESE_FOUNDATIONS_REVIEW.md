# Japanese foundations: course and review notes

## Purpose and entry points

Japanese previously stopped at a ten-screen introduction. This change adds a complete beginner foundation pathway with eight modules, a separate cumulative review, and an interactive Yoppo companion. The historical introduction remains available.

- Course: `/yo/langues/japonais/parcours`
- Modules: `/yo/langues/japonais/parcours/module-1` through `module-8`
- Cumulative review: `/yo/langues/japonais/parcours/bilan`
- Printable notebook: `/yo/langues/japonais/parcours/carnet`
- Explanation locales: French (default), English (`?lang=en`), Spanish (`?lang=es`).

The Japanese landing page and language catalog lead to the new pathway. Existing course completion uses the established completion component with a distinct Japanese course ID. This change does not introduce a paid course, authentication flow, database schema, or new audio service.

## Curriculum

| Module | Situation | Kanji |
| --- | --- | --- |
| 1 | First meetings | 人 名 日 本 語 |
| 2 | Campus and time | 一 二 三 四 五 |
| 3 | Finding your way | 上 下 中 右 左 |
| 4 | Café and market | 食 飲 米 茶 円 |
| 5 | Organizing the week | 月 火 水 木 金 |
| 6 | Friends, study and home | 家 友 学 生 先 |
| 7 | Asking for help | 出 入 口 電 車 |
| 8 | Recounting and completing a mission | 読 書 行 来 見 |

Each module contains learning goals, a contextual dialogue, eight vocabulary items, kana practice, five kanji, two grammar points, eight checked activities, three guided roleplay turns, a cultural reflection, a writing workshop and a review. The final review contains eight additional activities.

The total is **96 checked challenges** (64 module activities + 24 roleplay turns + 8 final activities), 64 vocabulary items, 16 grammar points, 92 basic kana, 40 kanji, eight writing workshops and eight cultural workshops. Activities include listening comprehension, sentence building, typed kana answers, real pair matching and contextual cultural decisions. Every choice has specific feedback. Kana drills, vocabulary self-ratings, handwriting and free writing are additional practice, not counted as scored course challenges.

The structure draws on communicative Can-do goals and a university-style sequence of preparation, practice, production and reflection. The scope is beginner foundations in the situations presented. It does not establish university credit, a JLPT equivalence or independently assessed speaking/writing proficiency. Module durations are suggested practice estimates, not acquisition guarantees.

## Interaction and layout

Yoppo floats above the course as a nonmodal companion. Learners can move it on either axis, use keyboard movement or reset controls, minimize it, hide it and reopen it. Position and hidden preference are remembered locally. Contextual actions reveal hints, explanations and examples; feedback changes after a checked response; retry and review actions return learners to useful practice. Animations respect reduced-motion preferences. No runtime generative AI is required.

Desktop uses a course workspace with stage navigation and, at wider widths, a goal panel. Compact screens use one active stage, a stage selector and persistent previous/next controls. Content scrolls inside the lesson pane instead of extending the whole document. Study panels retain session state when hidden, including drawings and writing drafts, and are removed from keyboard/accessibility navigation while inactive.

## Assessment and persistence

- Only explicitly checked activities affect exercise results. The check is idempotent until a learner retries.
- Visible hints, examples, listening transcripts and choice rōmaji before checking make that attempt assisted. Help opened after checking does not relabel the recorded attempt.
- A later unassisted success can clear an exercise from review. Previously earned successful/independent counts do not inflate when an item is repeated.
- Per-module completion requires that module's eight activities and three roleplay turns. The separate final-review completion concerns its eight activities; it does not certify completion of the preceding modules.
- Self-assessment boxes and a declaration that a kanji was practised do not unlock graded completion or imply mastery.
- Local storage contains bounded aggregate results, review flags, kanji practice declarations and resume positions. It excludes free text, raw answers and drawing strokes. Free-writing and drawing state lasts for the mounted module session.
- If local storage is unavailable, the learner can keep practising and sees a saving notice.

## Audio

Practice audio is user initiated and uses a Japanese voice supplied by the learner's browser/device when available. Playback can be stopped or slowed and stops when the lesson changes or becomes hidden. Listening activities offer a transcript; opening it counts as assistance. A missing Japanese voice is reported without substituting an unrelated language.

This change does not create Japanese recordings or claim that device speech has been reviewed by a native speaker. The existing introduction recordings and manifest are preserved. Actual voice availability and sound quality depend on the target device.

## Kanji provenance

The studio offers draw/undo/clear, optional model, genuine stroke-order replay, manual stepping, and an observe–recall–compare keyboard alternative. It does not recognize, grade or upload handwriting.

Forty original KanjiVG SVGs are pinned to revision `70a0b7ae0c18ceb5cb358274b029cce0234a43bc`. Their 237 ordered stroke paths are rendered as trusted SVG path data. Original files, per-file Git hashes, attribution and the full CC BY-SA 3.0 license are retained in `public/kanjivg/70a0b7ae/`. The extracted geometry remains under that license. Course mnemonics are learning prompts, not claims about historical etymology.

## References

- [Japan Foundation: Irodori](https://www.irodori.jpf.go.jp/en/about.html), practical communication and concrete life situations.
- [Irodori Starter](https://www.irodori.jpf.go.jp/en/starter/pdf.html), beginner-scope reference. Course scenes, prompts, feedback and writing tasks are original.
- [JF Standard](https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do), Can-do framing.
- [MIT Global Languages subject catalog](https://catalog.mit.edu/subjects/21g/), a structural reference for coordinated oral, listening, reading and writing practice; no affiliation or equivalence.
- [KanjiVG](https://kanjivg.tagaini.net/) and the [pinned source revision](https://github.com/KanjiVG/kanjivg/tree/70a0b7ae0c18ceb5cb358274b029cce0234a43bc), stroke geometry and attribution.

Cultural cases describe particular fictional settings and local instructions. They are not universal rules about Japanese people or institutions.

## Validation

Run `npm run test:yo-japanese-foundations` for curriculum integrity, real stroke data, rendered coach interactions, practice controls, progression/storage and player integration. The script is also included in `test:yo-japanese` and `test:launch-critical`. Rendered tests use React and jsdom and mock native speech only at its browser API boundary.

Legacy Japanese introduction/audio and shared catalog, landing, product, schema and SEO regressions are checked separately. Targeted strict TypeScript covers the new course components and data. The full application build is verified by the preview deployment rather than inferred from a selective local checkout.

Preview review should include the course entry, at least one full activity cycle, later modules and the final review, Yoppo movement/hide/reopen, kanji drawing, language switching, resume and print. Native-device audio listening and long-term teaching effectiveness remain distinct from automated UI checks.
