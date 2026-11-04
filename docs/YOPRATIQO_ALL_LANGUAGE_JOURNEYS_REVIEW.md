# Yoppo journeys across the remaining languages

Branch: `feat/yopratiqo-all-language-journeys`

Base: `600c7479a937ed4fc352d77a4434da4609d48f7c` (PR #427).
Isolated worktree: `yo-journey-all`. Other worktrees are unchanged.

## Scope and evidence

| Language | Existing course engine | Change |
| --- | --- | --- |
| Italian, German, Brazilian Portuguese | Independent unit checkpoints; 80% catalog threshold | Same behavior and storage, shared navigation calculation extracted without changing thresholds. |
| Japanese | Eight modules; checked exercises and roleplay; independent/help flags; separate final | Yoppo map, sequential unlocking, protected direct entry, next-step feedback and final gating using existing results. |
| Mandarin | Eight units; checked exercises with assistance/audio validation; separate final | Same journey presentation using Mandarin's own results, drafts and bookmarks. Existing photos, games and audio retained. |
| English, Quebec French, Spanish introductions | Server-composed lesson decks, reveal-only/ungraded quizzes | Compact Yoppo map, current step, revisiting and local resume. Exploration is explicitly NOT assessed mastery. |
| French premium / Dominican Spanish modules | Separate access/completion mechanisms | Unchanged. The shared deck opts into bookmarks only on the three free introductions. No new lock on purchased access. |

No new curriculum, assessments, audio generation or translation claims. This is not a claim that the short introductions now equal an eight-module assessed course.

## Learning rules

- Japanese/Mandarin: all checked task IDs in the module must have both a successful result and independent success to open the following module. Japanese includes roleplay turns.
- Assistance, reading a screen, drawing, confidence checkboxes, culture/trivia games and self-assessment never count as independent success.
- Final mission opens only after the module checks, except when existing local progress proves it was already started. Its results remain separate.
- Legacy started modules remain reachable without falsely crediting previous modules. Old storage formats/keys are not rewritten.
- Direct URLs wait for hydration before checking access; a locked visit cannot write a resume bookmark and unlock itself.
- Newcomers can go straight to the exercises inside an open module. Replays remain possible, without a timer, energy system or penalties.
- Navigation gates are local learning guidance, not authorization, credentials or evidence of long-term retention.
- Introduction bookmarks contain only version, current screen ID and visited IDs. No answers, personal data, scores, API calls or completion writes. Storage failure leaves navigation usable and reports that resume is unavailable.
- Final-session resume and switching introduction IDs without contaminating another language's bookmark are regression-tested.

## Files

- `lib/yo/learningJourney.ts`: shared navigation/current-step calculation.
- `lib/yo/courseJourney.ts`: unchanged Italian-family scoring delegates to that calculation.
- `lib/yo/foundationJourney.ts`: adapters for Japanese/Mandarin evidence and localized honest guidance.
- `lib/yo/foundationJourneyCatalogs.ts`: server-side catalog projection to serializable summaries.
- `components/yo/journey/CourseJourney.tsx`: reusable map presentation; existing Italian-family API retained.
- `components/yo/journey/FoundationJourneyAdvance.tsx`: conditional next-step feedback.
- `components/yo/journey/ExplorationJourneyMap.tsx`, `useExplorationJourney.ts`: introduction navigation and local bookmark.
- Japanese/Mandarin home/player components and route composers: wire summaries, gates, independent progression and final resume.
- Three free introduction pages and `YoLessonDeck.tsx`: explicitly opt into exploration bookmarks; other decks preserve existing behavior.
- Journey/player tests and `package.json`: extend meaningful regressions.
- `tests/helpers/italianLearningScope.ts`, the two legal scope tests: exact reviewed journey paths use the existing AST/import/privileged-behavior assertions. Negative tests still reject payment/auth/network/server-action dependencies and unreviewed paths. No disabled assertions or wildcard exceptions.

## Validation log

- `npm ci --ignore-scripts --no-audit --no-fund`: passed; lockfile unchanged.
- `npm run test:yo-journey`: passed, 14 original + 17 new checks. The Yoppo reaction assertion inspects the document (the coach renders through a portal), not only the player's container.
- `npx tsx tests/yo/yopratiqoJapaneseCoursePlayer.test.ts`: passed, 14/14.
- `npm run test:yo-mandarin`: passed (content/audio assets, player, Realtime contract).
- `npx tsc --noEmit`: passed.
- `npm run lint -- --quiet`: passed; pre-existing stale Browserslist notice.
- Targeted ESLint across changed components, models and tests: passed.
- `npx tsx scripts/validate_i18n.ts`: passed, 3562 keys per locale.
- `git diff --check`: passed.
- Initial launch-critical attempts: failed the two historical legal file-scope guards. Exact journey paths are now reviewed with the same protections; both targeted legal suites pass.
- Initial production build: compiled and typechecked, then failed sitemap prerender because the sandboxed local gateway was unreachable. No production fallback or data-error suppression was used. Local Auth and the gateway now return 200; the real local public-teacher read also returns 200.
- `npm run test:launch-critical`: full rerun passed, including the existing Japanese interaction, progress, player and recorded-audio suites.
- Final production build: `node ../yo-journey-all-preview/app.cjs build` passed, including TypeScript and all 353 generated pages. This runs the normal installed `next build` with the isolated local environment, not a mocked build. Existing Turbopack notice about ignored `experimental.forceSwcTransforms` remains; it is not a build failure.
- Final `npm run lint -- --quiet`, i18n and whitespace checks passed. No lockfile changes.

## Production-runtime browser QA (local only)

`next start` runs at `http://127.0.0.1:55670`, behind the loopback gateway. Anonymous HTTP checks returned 200 for all seven sampled changed routes: Japanese home/module-1, Mandarin home/u01, English intro, Quebec French intro and Spanish intro.

- Japanese: first step open, seven steps locked; real answer checked successfully; stage and 1/11 checked result survived reload. A direct module-2 URL remained locked. Yoppo and review/resource navigation remain available.
- Mandarin: first step open; real listening exercise allowed validation after playback, showed correct feedback and resumed at the same stage after reload. New-learner final URL remained locked. Photos and credits loaded.
- Three introductions: actual Next/map navigation, current Yoppo marker, revisiting and reload resume verified. English restored `numbers`, Quebec French `comparison`, Spanish `origin`. The map closes after selection. No completed-module claim is made.
- Responsive: Japanese at 320/390/1280 px, Mandarin at 320/390/1280 px, introduction map at 320/390/1280 px. No document horizontal overflow in sampled layouts. Mobile menu stays within viewport (320 px: left 16, right 304); desktop menu also stays within viewport.
- Smoke: existing Italian (12 steps), German (8), Brazilian Portuguese (8) maps still render at 390 px. No broken loaded images in the sampled pages. No console errors captured during the checked local flows; server stderr remained empty.
- FR/EN/ES journey labels verified. Existing Spanish introduction lesson text falls back to French with `lang=es`; confirmed on the base source, not introduced by this change. The new navigation labels are translated. Full translation of those existing lessons remains a separate content task.

Evidence outside Git: `yo-journey-all-preview/japanese-desktop.png`, `mandarin-desktop.png`, `mandarin-mobile.png`, `english-intro-mobile.png`, and `responsive-qa.json`. QA used synthetic/local data and browser-local progress only. Physical Safari, exhaustive completion of every lesson in a browser, and Japanese audio playback against the local recording bucket were not tested; Japanese recorded-audio behavior and manifests passed their automated suite.

## Local environment and rollback

The preview harness lives outside Git in `yo-journey-all-preview`. It binds to loopback only (55670 gateway / 55671 Next), uses the existing synthetic Supabase stack at 55421, refuses environment files, and obtains local-only configuration from the existing sandbox helper. No production credentials, deployment, payment, email, notification, schema migration or account creation is required.

Rollback is application-only: revert this batch while preserving all existing Japanese/Mandarin/Italian-family progress keys. The new introduction bookmark keys can remain dormant; no user data deletion is required.

Physical Safari and longitudinal retention/transfer have not been validated. No claim of certified ability or durable mastery is made. At the end of local preparation, this batch was uncommitted and undeployed. The subsequent user-authorized release uses the repository's PR/checks/squash workflow and a fresh Vercel production build, never the local preview artifact. No migration is required.

## Verdict

READY FOR REVIEW for the journey/navigation scope. Existing access, payments and stored progress remain intact. This does not make the three short introductions equivalent to the assessed Japanese/Mandarin courses, nor does it complete missing historical lesson translations.
