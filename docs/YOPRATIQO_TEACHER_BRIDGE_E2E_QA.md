# YoPratiqo → Teacher Bridge — End-to-End QA Runbook

> **Audience**: QA engineer or product owner verifying the YoPratiqo
> learning experience and the consent-gated teacher bridge before each
> release.
>
> **Scope**: covers the complete product path from a student opening
> a YoPratiqo Dominican Republic module, through saving progress,
> opening a booking, granting per-booking consent, and finally the
> teacher seeing (or correctly *not* seeing) the shared summary.
>
> **Out of scope**: payments, Stripe, tax, legal pages, Membre Pro
> commission logic, MP3 generation, OpenAI scripts, SEO / sitemap,
> Course schema, React Native, AI-generated summaries. Those are
> explicitly frozen for this QA pass.

---

## Section A — Preconditions

Before running any of the flows below, confirm the environment is
ready.

### A.1 — Accounts

- [ ] A **student** account exists in the target environment
      (`profiles.role = 'student'`).
- [ ] The student is **logged in** in a fresh browser window — verify
      `supabase.auth.getSession()` returns a non-null `access_token`
      (DevTools → Application → Local Storage → `sb-…-auth-token`).
- [ ] A **teacher** account exists (`profiles.role = 'teacher'`) and
      has at least one row in `public.teachers` linked via `user_id`.
- [ ] At least one **booking** between this student and this teacher
      will be created during the flow (Section C does this).

### A.2 — Database migrations applied

- [ ] `supabase/migrations/077_booking_yopratiqo_learning_summaries.sql`
      is present on the database (one row per `(booking_id, student_id,
      teacher_id)`, RLS enforces student-write / participant-read).
- [ ] `supabase/migrations/078_yopratiqo_progress_snapshots.sql` is
      present (one row per `(user_id, course_id, module_id)`, no
      `summary jsonb`, no free-form metadata column).
- [ ] Quick check (psql / Supabase SQL Editor):
      ```sql
      select count(*) from public.yopratiqo_progress_snapshots;
      select count(*) from public.booking_yopratiqo_learning_summaries;
      ```
      Both should return without error.

### A.3 — Static assets

- [ ] The 8 travel-companion PNGs exist in `public/companion/travel/`:
      `companion-travel-{idle,map,confused,celebrating,teacher-ready,level-up,inactive,badge-unlocked}.png`.
- [ ] All 8 filenames are present in the `SHIPPED_ASSETS` allow-list
      inside `lib/companion/companionVisuals.ts`.

### A.4 — Feature flags & paid checkout stay off

- [ ] `lib/yo/yopratiqoProductConfig.ts` still has
      `premiumModulesEnabled: false` and
      `supportedProductTypes: ["free_intro"]`.
- [ ] No Stripe price ID for YoPratiqo exists in the environment.

---

## Section B — Student progress flow

Verifies that `YoMarkModuleCompletedButton` correctly POSTs sanitized
snapshots and that the student-facing surfaces (the new
`YoStudentCompanionCard` in particular) react to those snapshots.

### B.1 — Open Module 2 and save progress

1. As the logged-in student, navigate to
   `/yo/langues/espagnol/pays/republique-dominicaine/module-2`.
2. Scroll to the bottom of the module page. The
   `YoMarkModuleCompletedButton` should be visible.
3. Click **"J'ai terminé ce module"** (or the EN/ES equivalent).
4. **Expected**:
   - The button transitions to a success state ("Module enregistré"
     / "Module saved" / "Módulo guardado").
   - A `POST /api/yo/progress` is sent with `Authorization: Bearer
     <access_token>`.
   - The request body contains **only** allow-listed fields
     (`course_id`, `module_id`, `module_title`, `discipline`,
     `level_label`, `progress_state`, `skill_tags`,
     `difficulty_tags`, `score_band`, `companion_stage`).
   - The response is `200` and contains a `snapshot` object with the
     saved `progress_state: "completed"`.

### B.2 — Repeat for Modules 3, 4, and 5

Repeat B.1 for the remaining RD modules:

- [ ] `/yo/langues/espagnol/pays/republique-dominicaine/module-3`
- [ ] `/yo/langues/espagnol/pays/republique-dominicaine/module-4`
- [ ] `/yo/langues/espagnol/pays/republique-dominicaine/module-5`

The module-5 page is the **capstone**; saving it triggers the
"badge_unlocked" visual state in the next section.

### B.3 — Open the student progress page

1. Navigate to `/student/progress`.
2. **Expected**:
   - The legacy "Companion — compact" section still renders the
     existing `CompanionCard` (forest / phoenix / dragon / star).
     **This card MUST be untouched** — same emoji, same lesson
     counter, same evolution behavior.
   - Immediately below it, the new **YoPratiqo Companion** card
     (`YoStudentCompanionCard`) renders.

### B.4 — Verify YoPratiqo Companion card state changes

| Student state | Expected visual state | Card body |
|---|---|---|
| No snapshots yet | `idle` | Empty-state copy + CTA "Commencer YoPratiqo" |
| Only `started` snapshots | `map` | Stats grid (0 completed) |
| ≥1 completed within last 7 days | `celebrating` | Stats grid + CTA "Continuer YoPratiqo" |
| ≥1 completed older than 7 days | `teacher_ready` | Stats grid + CTA "Continuer YoPratiqo" |
| Module-5 capstone completed | `badge_unlocked` | Stats grid shows the A2 level |
| No activity for ≥30 days | `inactive` | Stats grid (most recent activity shown) |

For each state row, manually back-date the relevant snapshot's
`last_activity_at` / `completed_at` in the database (or wait the
required time on a staging clock) and refresh `/student/progress`.

- [ ] Card `data-yo-student-companion-state` attribute matches the
      table above when inspecting the DOM.
- [ ] Companion PNG image renders (no broken-image icon). The path
      should be `/companion/travel/companion-travel-<state>.png`.

---

## Section C — Booking consent flow

Verifies the **booking-time** consent surface and the bridge API
that persists it.

### C.1 — Open the booking modal

1. As the logged-in student, find a teacher and click **"Réserver
   un cours"** (or the EN/ES equivalent) to open the
   `BookingModal`.
2. Pick a date / time / mode (in-person / online) as usual.
3. Scroll to the bottom of the modal — the
   `YoBookingTeacherBridgeConsent` section must be visible just
   above the confirm button.

### C.2 — Default consent state

- [ ] The "Partager mon résumé YoPratiqo avec ce professeur"
      checkbox is **unchecked by default** (the underlying React
      state initializes with `useState(false)`).
- [ ] The empty-state body ("Commence YoPratiqo to bring your
      progress to future lessons") only renders when the student
      has no YoPratiqo progress yet; with snapshots from Section B,
      the card should instead show the "real summary will be
      shared" headline.
- [ ] Confirming the booking with the checkbox **unchecked** is
      allowed — the consent surface never blocks confirm.

### C.3 — Grant consent and confirm

1. Check the consent checkbox.
2. **Expected**:
   - The "What your teacher will see" recap appears under the
     checkbox in the current locale.
   - The recap explicitly mentions: pedagogical summary only,
     **no raw quiz answers**, **no private notes**, **no payment
     data**.
3. Confirm the booking.
4. **Expected**:
   - The booking is created (existing payment / pricing path is
     unchanged).
   - A `POST /api/bookings/{booking_id}/yopratiqo-bridge` is sent
     with `{ consent_granted: true }`.
   - Response is `200` and the row in
     `booking_yopratiqo_learning_summaries` has
     `consent_granted = true` and a non-null `consent_granted_at`.

### C.4 — Negative case — confirm without consent

Repeat C.1 → C.3 with the checkbox **left unchecked**.

- [ ] The booking is created successfully.
- [ ] The bridge route is still called with
      `{ consent_granted: false }`.
- [ ] The row in `booking_yopratiqo_learning_summaries` has
      `consent_granted = false`, `consent_granted_at = null`, and
      `summary = null`.

---

## Section D — Teacher insight flow

Verifies that the teacher sees the shared summary if and only if
the student has granted per-booking consent for THAT booking.

### D.1 — Teacher opens progress page

1. Log out the student.
2. Log in as the teacher whose booking was created in Section C.
3. Navigate to `/teacher/progress`.
4. **Expected**: a list / search of the teacher's own students is
   shown.

### D.2 — Expand the consenting student

1. Click / expand the student from Section C.3 (consent granted).
2. **Expected**:
   - The `TeacherLearningInsightCard` renders in its **unlocked**
     state.
   - The card shows: course title, completed modules, current
     level, strengths, suggested teacher focus, last activity
     date.
   - The compact `CompanionBridgeCard` renders inside the unlocked
     footer (companion visual + short bridge explanation).
   - The card explicitly states the consent scope ("summary only").

### D.3 — Expand the non-consenting student

1. Expand the student from Section C.4 (consent NOT granted).
2. **Expected**:
   - The `TeacherLearningInsightCard` renders in its **locked**
     state — no summary fields visible.
   - No `CompanionBridgeCard` appears (the companion is only
     surfaced inside the unlocked footer).
   - A clear "the student has not shared YoPratiqo progress for
     this booking" message is shown.

### D.4 — Teacher never reads progress snapshots directly

- [ ] Confirm in DevTools → Network that no request from the
      teacher progress page touches the `yopratiqo_progress_snapshots`
      table directly. The only relevant Supabase REST request must
      target `booking_yopratiqo_learning_summaries`.
- [ ] Confirm in `app/(app)/teacher/progress/page.tsx` source that
      the only `.from("yopratiqo_progress_snapshots")` reference is
      **absent** — the page uses `.from("booking_yopratiqo_learning_summaries")`.

---

## Section E — Privacy checks (do these before signing off)

Run these checks while a teacher account is opened on the consenting
student.

### E.1 — Raw quiz answers

- [ ] **NOT shown** anywhere in the teacher UI.
- [ ] Inspect the network response for the bridge row — `summary`
      must not contain any of: `rawQuiz`, `quiz_answers`,
      `selectedOption`, `picked_option`, `correctOptionId`,
      `correct_option_id`, `answerLog`, `answer_log`,
      `incorrectAnswers`, `keystrokeHistory`, `audio_attempts`.

### E.2 — Selected options

- [ ] **NOT shown**. The teacher card only ever shows opaque
      `score_band` values (`needs_practice` / `developing` /
      `solid` / `confident`) — never the actual choices.

### E.3 — Correct answers

- [ ] **NOT shown**. The summary projector
      (`lib/yopratiqo/teacherBridgeBookingPersistence.ts`) never
      exposes the correct option ID.

### E.4 — Attempt logs

- [ ] **NOT shown**. The progress snapshot row has no `summary
      jsonb` and no metadata column, so attempt logs cannot be
      smuggled through the snapshot table.

### E.5 — Teacher never queries `yopratiqo_progress_snapshots`

- [ ] The only teacher-visible Supabase query is
      `select … from booking_yopratiqo_learning_summaries where
      teacher_id = <self> and student_id = <expanded_student>`.
- [ ] No code path in `app/(app)/teacher/**/page.tsx` references
      `yopratiqo_progress_snapshots`.

---

## Section F — Mobile checks (≤ 414 px viewport)

Use Chrome DevTools device mode (iPhone 14 / Pixel 7) for each step.

### F.1 — Student progress page (`/student/progress`)

- [ ] Header, credits widget, legacy Companion card, **YoPratiqo
      Companion card**, homework section, and watch-points section
      all stack vertically without horizontal scroll.
- [ ] The YoPratiqo companion PNG renders crisply at the avatar
      size (the asset is 500×500 — should look sharp).

### F.2 — Booking modal

- [ ] The `YoBookingTeacherBridgeConsent` checkbox is full-width
      and tappable (≥44 px tap target).
- [ ] The "what the teacher will see" recap wraps cleanly with no
      overflow.
- [ ] The confirm button is reachable without obstructing the
      consent surface.

### F.3 — Teacher progress page (`/teacher/progress`)

- [ ] Expanded `TeacherLearningInsightCard` renders cleanly; tag
      chips wrap rather than overflowing horizontally.
- [ ] The compact `CompanionBridgeCard` inside the unlocked footer
      stacks above its caption on narrow widths.

### F.4 — No broken companion images

- [ ] No `next/image` 404s in DevTools → Network for any
      `companion-travel-*.png` asset.
- [ ] When a state has no shipped PNG (none today, but defensive),
      the fallback emoji + Lucide icon renders instead of a broken
      image.

---

## Section G — Failure cases

Each row below documents the expected **graceful degradation**.

### G.1 — Unauthenticated progress save

- **Setup**: log the student out, then re-open a module page.
- **Action**: click "I finished this module".
- **Expected**: the button shows a soft sign-in prompt rather than
  faking persistence. No request reaches `/api/yo/progress`.

### G.2 — Progress API failure (5xx)

- **Setup**: in DevTools → Network, throttle / fail
  `POST /api/yo/progress` (use a request blocker).
- **Action**: click "I finished this module".
- **Expected**: the button shows the localized error string. The
  lesson content remains usable; the page does NOT crash.

### G.3 — Booking created but bridge POST fails

- **Setup**: in DevTools → Network, fail
  `POST /api/bookings/{id}/yopratiqo-bridge` with a 500.
- **Action**: confirm a booking with the consent checkbox
  **checked**.
- **Expected**: the booking is created (the existing payment /
  scheduling flow is untouched); the modal closes; no consent row
  is created. The next booking attempt may retry. **No money is
  refunded, no scheduling is reversed** — the bridge surface is
  best-effort by design.

### G.4 — No YoPratiqo progress

- **Setup**: brand-new student with zero snapshots.
- **Action**: open the booking modal.
- **Expected**:
  - `YoBookingTeacherBridgeConsent` renders the empty-state body
    ("Start YoPratiqo to bring your progress to future lessons").
  - Checking the checkbox still works; the recap explains that
    **no summary will be shared for now**.

### G.5 — Consent true but `summary` null

- **Setup**: a consent row exists with `consent_granted = true`
  but `summary = null` (this is the production default until the
  next iteration ships the per-booking summary writer).
- **Expected**: the teacher card stays **locked**
  (`sharedByStudentConsent` is computed as
  `consent_granted && summary != null`). The teacher does not see
  a partial / empty summary.

### G.6 — Teacher not owner of booking

- **Setup**: log in as a teacher who is NOT the participant on the
  booking, and try to fetch the consent row directly:
  ```bash
  curl https://<env>/rest/v1/booking_yopratiqo_learning_summaries\
?student_id=eq.<student_uuid> \
    -H "Authorization: Bearer <other_teacher_token>" \
    -H "apikey: <anon_key>"
  ```
- **Expected**: RLS returns an empty array. No row leaks.
- [ ] Repeat for `yopratiqo_progress_snapshots` — RLS must return
      an empty array for any user who is not the snapshot's
      `user_id`.

---

## Sign-off

| Reviewer | Date | Pass / Fail | Notes |
|---|---|---|---|
| QA | | | |
| Product | | | |
| Engineering | | | |

A release is **blocked** if any item in Sections A, C, D, E, or G
fails. Section F items are blocking only when the affected surface
is unusable on a typical mobile viewport (≤ 414 px).
