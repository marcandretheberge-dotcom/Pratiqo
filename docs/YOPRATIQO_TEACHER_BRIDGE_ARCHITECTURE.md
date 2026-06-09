# YoPratiqo Teacher Bridge Architecture

## Purpose

YoPratiqo is the self-paced learning product inside Pratiqo. The teacher bridge lets a learner bring a safe, consent-based learning summary to a real Pratiqo teacher so the next lesson can be more personal.

This is a foundation document. It does not enable paid checkout, teacher data exposure, new Supabase tables, or a React Native app.

## Existing Repo State

Current findings from the launch codebase:

- YoPratiqo modules are mostly static TypeScript data and client components.
- `lib/yo/types.ts` already defines future progress concepts such as lesson progress states, flashcard review shape, and quiz attempt shape.
- There is no live YoPratiqo progress persistence table wired into the product UI today.
- `student_progress` exists for broader student dashboard watch points and achievements, not as a YoPratiqo event ledger.
- Companion state is stored on `profiles` with `companion_type` and `companion_chosen`.
- Companion growth is currently driven by completed Pratiqo bookings through `lib/companion/rewards.ts`, `lib/companion/evolution.ts`, and `lib/companion/progress.ts`.
- Teacher/student relationships already exist through `bookings`, and teachers can see booking-linked learner context from `learner_profiles`.
- Existing YoPratiqo teacher CTAs point to `/trouver-un-prof`; they do not share learning data.

## Domain Model

The shared bridge domain starts in `lib/yopratiqo/teacherBridge.ts`.

It defines:

- `LearningSkillTag`
- `LearningDifficultyTag`
- `YoPratiqoProgressSummary`
- `CompanionBridgeSummary`
- `TeacherLearningInsight`
- `LearningShareConsentState`

The summary includes only teacher-useful aggregate information:

- product: `YoPratiqo`
- discipline
- course/module title
- completed modules
- current level
- strengths
- difficulty tags
- suggested teacher focus
- last activity date
- companion name/id/stage
- consent state

It intentionally excludes raw quiz responses and raw event logs.

## Event-Ledger Architecture

Future progress should be captured as a private event ledger, for example:

- lesson opened
- section completed
- flashcard reviewed
- quiz completed
- difficulty self-reported
- teacher-practice intent selected

Raw events stay private to the learner and the platform service layer. Teachers receive a summarized insight only after explicit learner consent.

## Consent-Based Sharing

Default state: no sharing.

The learner must explicitly choose to share a YoPratiqo summary with a teacher. The launch copy is:

- FR: `Partager mes progrès YoPratiqo avec ce professeur afin qu'il puisse personnaliser mon cours.`
- EN: `Share my YoPratiqo progress with this teacher so they can personalize my lesson.`
- ES: `Compartir mi progreso de YoPratiqo con este profesor para que pueda personalizar mi clase.`

Consent should be scoped and auditable:

- teacher id
- booking id when applicable
- summary-only scope
- granted timestamp
- revoked timestamp if revoked

Do not expose student learning data to teachers without consent.

## Teacher-Facing Summary

Teachers should see:

- completed modules
- strengths
- needs practice
- suggested lesson focus
- companion status
- clear consent status

Teachers should not see:

- raw quiz answers
- raw flashcard history
- keystrokes
- private notes not explicitly shared
- unaggregated event logs

The reusable UI foundation is `components/yo/TeacherLearningInsightCard.tsx`.

## Shared API Contract

Future APIs should expose a portable contract that both the web app and a future React Native YoPratiqo app can use:

- `GET /api/yopratiqo/progress/summary`
- `POST /api/yopratiqo/share-consent`
- `DELETE /api/yopratiqo/share-consent`
- `GET /api/teacher/learning-insights?booking_id=...`

These names are architectural placeholders, not implemented routes.

Any API must resolve the authenticated user server-side. It must not accept arbitrary `studentId` from the client as authority.

## React Native Future-Proofing

The bridge must not be coupled to web-only components.

Future React Native compatibility requires:

- shared TypeScript domain types where possible
- JSON-safe event schema
- portable companion asset ids
- no browser-only APIs in domain helpers
- no CSS-dependent state model
- API-first data flow
- consent handled in the backend contract, not just in UI state

The future React Native app should use the same APIs and event schema as the web product.

## Privacy Boundary

Raw learning events are private. Teacher summaries are generated views, not database dumps.

If a teacher relationship ends, the learner must be able to revoke future sharing. Past summaries may need retention rules and audit handling, subject to lawyer review and privacy policy alignment.

## Launch-Safe Foundation

This PR intentionally does not:

- create migrations
- modify RLS
- add paid YoPratiqo checkout
- change teacher booking logic
- create a teacher dashboard integration
- expose raw student data
- call OpenAI
- generate audio
- build React Native

The foundation is types, conservative UI copy, reusable summary rendering, and implementation documentation.
