# Pratiqo Production Smoke Test

Last reviewed: 2026-06-14
Owner: founder / admin

This is the **fast, single-tester smoke test** the founder runs **on real
devices** against the live production deployment **before inviting the
closed beta cohort**. It takes roughly **20–30 minutes** and is designed
to be executed by a non-developer.

If anything in this checklist fails, **stop**, file a bug, and do **not**
invite the closed beta cohort. The closed beta gate is in
[`CLOSED_BETA_READINESS.md`](./CLOSED_BETA_READINESS.md); the deeper
regression matrix lives in [`MARKETPLACE_P0_QA.md`](./MARKETPLACE_P0_QA.md).

## 1. Purpose

Verify that the **real marketplace flow** works on production-like
devices before the closed beta cohort is invited. Specifically:

- The student can find a teacher and start a booking on a real phone.
- The teacher sees the booking with the correct status and actions.
- Messages flow both ways with unread badges and email notifications.
- The recent P0 fixes (PR #176–#182) are still working in production.
- No layout / hydration / payment-status surprise is visible.

This is **not** a load test, **not** a Stripe end-to-end test in test
mode, and **not** the closed-beta itself. Treat it as the **last
single-operator pre-flight check**.

## 2. Required devices

Run the test on as many of these as available. The first two are
mandatory; the rest are strongly recommended.

| Device                | Required | Notes                                                       |
|-----------------------|----------|-------------------------------------------------------------|
| iPhone — Safari       | Yes      | iOS 17+ preferred. Test in standard Safari, not Chrome.     |
| Desktop — Chrome      | Yes      | 1280×800 minimum.                                           |
| Android — Chrome      | Strongly recommended | Test on a Pixel / Samsung at 360–430 px width. |
| iPad — Safari         | Optional | Useful if a beta teacher is iPad-only.                      |
| Desktop — Firefox     | Optional | Catches the occasional Webkit-only divergence.              |

For each device, capture: **device model**, **OS version**, **browser
version**, **route**, **timestamp**, plus a screenshot for any anomaly.

## 3. Required accounts

Use **dedicated test accounts**, not real customer data.

| Account            | Required                | Notes                                                                              |
|--------------------|-------------------------|------------------------------------------------------------------------------------|
| Student test acct  | Yes                     | Uses a mailbox the founder controls (e.g. `+test1@…` alias of `support@pratiqo.ca`). |
| Teacher test acct  | Yes                     | A test teacher whose profile is **searchable** and has **availability** for today / this week. |
| Founder / admin    | If applicable           | Used to monitor Vercel logs, Supabase rows, Stripe dashboard, support inbox.       |

**Do not** sign in as an unrelated real customer to "borrow" a profile
for the smoke test. **Do not** post test bookings to a real teacher's
calendar. **Do not** test against a profile you do not control.

## 4. Pre-test checklist

Run before opening any browser. All boxes must be checked.

- [ ] Production deployment is current — `main` matches what is live in
  Vercel; no in-flight rollbacks; the latest `main` SHA is deployed.
- [ ] No known blocker PR is pending merge that would change a route
  the smoke test touches.
- [ ] Launch validation passed locally on the release commit:

  ```bash
  npm run validate:launch
  npm run test:launch-critical
  npm run build
  npx tsx scripts/validate_i18n.ts
  git diff --check
  ```

- [ ] `support@pratiqo.ca` is monitored — a teammate has confirmed
  within the last 24 h that messages sent to this address are received
  and read.
- [ ] Transactional email inbox is checked — Resend domain
  (`pratiqo.ca`) is verified; no recent bounce / suppression on the
  smoke-test mailbox.
- [ ] The test teacher profile is **visible** at `/student/search`
  (incognito window).
- [ ] The test teacher has **availability** for at least one date in
  the booking window. Without this, step 5.7 cannot pass.
- [ ] The test booking / payment approach is decided **before** running:
  either (a) **stop before the Stripe Checkout redirect** (recommended
  unless the founder is willing to refund a real charge), or (b)
  proceed with a real charge and refund through the existing flow
  afterward. **Stripe test-mode is not used in production.**
- [ ] Sentry / Vercel logs / Supabase logs are open in adjacent tabs
  if those are wired (Sentry SDK is currently optional — see
  [`PRODUCTION_LAUNCH_RUNBOOK.md` § 3](./PRODUCTION_LAUNCH_RUNBOOK.md#3-vercel-environment-checklist)).

## 5. Student smoke test

Run on **iPhone Safari** end-to-end first. Repeat on Android Chrome and
Desktop Chrome to spot regressions.

1. Open the production site at `https://www.pratiqo.ca/`.
2. **Sign in as the student** test account.
3. Navigate to **Trouver un prof** at `/trouver-un-prof` (public) or
   `/student/search` (authenticated).
4. **No horizontal overflow**: scroll the page top-to-bottom — the page
   must never show a horizontal scrollbar at 320 / 375 / 390 / 430 px.
5. **Teacher card**: locate the test teacher card. The card must show:
   - Teacher **name** (visible, not truncated to zero width). (P0.5a)
   - Profile **photo**.
   - **Discipline / subject**.
   - **Price** (display-only currency is fine).
   - **Trust badges** (verified, Membre Pro, etc.) wrap onto a second
     row when needed and never crowd out the name. (P0.5a)
6. **Open the teacher profile** by tapping the card. Profile loads
   without a horizontal scroll; "Réserver" CTA is reachable.
7. **Start a booking** by tapping "Réserver".
   - **Unavailable** dates / hours are visibly **grey + disabled**
     (`cursor-not-allowed`). (P0.3)
   - **Available** dates / hours are visibly **light teal + clickable**.
     (P0.3)
   - Tap an available date and an available hour — the **selected**
     state is **dark teal with white text**, clearly distinguishable
     from adjacent available slots. (P0.3)
8. **Proceed through the booking** as far as is safe for the
   environment:
   - If the founder pre-decided **(a)** in § 4: stop at the Stripe
     Checkout redirect; verify the redirect URL is `checkout.stripe.com`
     with the expected currency / amount before navigating away.
   - If **(b)** in § 4: complete the real charge; verify the booking
     appears in the student dashboard with the correct status; plan
     the manual refund.
9. **Send a message to the teacher** from `/messages` (or via the
   booking-confirmation deep link if available). Type one short
   message and tap send.
   - The message appears at the bottom of the thread.
   - The thread **scrolls to the latest message** automatically.
     (P0.5b)
10. **Sign out**.

Record any deviation as a bug per § 12.

## 6. Teacher smoke test

Run **on a different device or in an incognito window**. Use the
**teacher test account**.

1. **Sign in as the teacher**.
2. **Verify the booking appears** if one was created in § 5.8 step
   (b). It must appear under upcoming / confirmed lessons, **not**
   under "incoming requests". (P0.4)
3. **Confirmed / paid booking does NOT show "Refuser" / "Reject"**.
   The card must not display a reject action. (P0.4)
4. **Cancellation entry point** is still reachable from the
   confirmed-booking view where the existing rules allow it. The copy
   is unchanged. (P0.4) Do **not** actually cancel the booking unless
   the founder pre-decided to test cancellation.
5. **Open Messages**.
   - The Messages **bottom-nav (mobile)** / **top-nav (desktop)** badge
     shows the unread count from the student's message in § 5.9.
     (P0.1)
6. **Open the conversation**.
   - The thread **opens at the latest message** without manual
     scrolling. (P0.5b)
   - The unread badge **clears within ~1 s**. (P0.1)
7. **Reply to the student** with a short message.
   - The reply appears at the bottom and the view auto-scrolls.
     (P0.5b)
   - The thread stays at the latest message; sending a message does
     not jump the scroll position to the top.
8. **Sign out**.

## 7. Student reply check

Run on the same device as § 5 (or a fresh device — easier to catch
the unread badge edge cases on a fresh session). Use the **student
test account**.

1. **Sign back in as the student**.
2. **Unread badge appears** for the teacher's reply. (P0.1)
3. **Open the conversation**.
   - The thread **opens at the latest message**, which is the
     teacher's reply from § 6.7. (P0.5b)
4. **Unread badge clears** after opening / reading the conversation,
   within ~1 s, without a hard reload. (P0.1)
5. Sign out.

## 8. Email notification check

Pratiqo sends email notifications for new messages via Resend. Verify
the recipient-only contract.

- [ ] The **recipient** (teacher in § 5.9, student in § 6.7) received
  a "new message" email in the test mailbox. (P0.2)
- [ ] The **sender** did **NOT** receive their own message email.
  (P0.2)
- [ ] The email body contains the **sender's name** and a **link
  back to the conversation**. (P0.2)
- [ ] The email body does **NOT** expose the raw private message text
  unless an explicit product policy already allows it. (P0.2) The
  current policy is: generic "you have a new message" with a CTA — no
  private content embedded.
- [ ] If multiple messages were sent in quick succession, the recipient
  did not receive a flood of duplicate emails (debounce / batching
  behavior is the existing helper's responsibility — note any
  regression).

## 9. Mobile layout checks

Run a quick visual sweep on iPhone Safari and Android Chrome.

- [ ] **No horizontal scroll** anywhere on the marketplace journey
  (search → profile → booking → messages) at 320 / 375 / 390 / 430 px.
- [ ] **Bottom nav** does not cover important buttons. The "Réserver"
  CTA, "Envoyer" message button, and any sticky CTA are all tappable
  with the bottom nav present.
- [ ] **Booking buttons** (date cards, hour slots, "Confirmer") are
  large enough to tap (≥ 44 px tall per
  [`APP_READINESS_RUNBOOK.md` § 2](./APP_READINESS_RUNBOOK.md#2-mobile-qa-checklist)).
- [ ] **Message composer** is visible at the bottom of the thread on
  iOS Safari with the keyboard open. The keyboard does not push the
  composer off-screen.
- [ ] **Last message** is not hidden behind the composer or the iOS
  bottom safe area.
- [ ] **Teacher name** remains visible alongside trust badges on the
  search card. (P0.5a)

## 10. Desktop layout checks

Run on Chrome at 1280×800 and (if possible) 1920×1080.

- [ ] **Search results** are readable: list/map layout is stable; the
  teacher name region remains protected even with a 6+ badge profile.
- [ ] **Booking modal / card** is readable; date and hour grids are
  not cut off; tri-state colors are equally distinct on desktop. (P0.3)
- [ ] **Message thread** opens at the latest message in the
  two-column layout (conversation list left, thread right). (P0.5b)
- [ ] **No awkward oversized mobile-only layout on desktop** — text is
  not enormous, padding is not iPhone-only, sidebars do not collapse
  unexpectedly.

## 11. Pass / fail criteria

### Pass — proceed with closed beta invitation only if **all** are true:

- [ ] Student can find a teacher on production from a real phone.
- [ ] Teacher name is visible on the mobile search card with badges.
  (P0.5a)
- [ ] Booking UI is clear: tri-state availability colors are
  unambiguous on date and hour pickers. (P0.3)
- [ ] Messages work both directions: student → teacher → student.
- [ ] Unread badges work both directions and clear on open. (P0.1)
- [ ] Message email notification reaches the recipient (and only the
  recipient). (P0.2)
- [ ] Message thread opens at the latest message every time. (P0.5b)
- [ ] Teacher confirmed-booking actions are not confusing — no
  reject / refuse on a paid booking; cancellation entry point still
  visible where allowed. (P0.4)

### Fail — stop and file blocker bugs if **any** are true:

- [ ] User cannot understand availability (slot states are ambiguous,
  blend together, or look uniformly disabled).
- [ ] Messages are easy to miss (no unread badge, badge does not
  clear, recipient never gets the email, or thread opens above the
  latest message).
- [ ] Unread badges fail (sender's own messages inflate the badge,
  badge persists after read, or badge does not appear at all).
- [ ] Teacher sees reject / refuse on a confirmed paid booking.
- [ ] Mobile layout hides identity (teacher name) or action buttons
  (booking CTA, send button, cancellation entry).
- [ ] Payment / booking status appears inconsistent — booking marked
  paid in app but no Stripe record (or vice-versa); refund displayed
  as completed without a matching Stripe refund.

If a Fail condition is met, **do not invite the closed beta cohort**.
File a blocker bug per § 12, fix on a dedicated branch, re-run this
checklist on the new release commit before the cohort is invited.

## 12. Bug report template

Use this verbatim when filing a bug. Paste into `support@pratiqo.ca`,
the bug-tracking sheet, or directly into a Cursor / GitHub issue.

```
PRATIQO PRODUCTION SMOKE TEST — BUG REPORT
==========================================
Test date / time (UTC) : <yyyy-mm-dd hh:mm>
Tester                 : <name>
Role                   : [student | teacher | admin]
Device                 : <iPhone 15 / Pixel 7 / MacBook Pro / etc.>
OS                     : <iOS 17.5 / Android 14 / macOS 14.5 / etc.>
Browser                : <Safari 17.5 / Chrome 126 / etc.>
Route                  : </student/search, /messages, /teacher/profile/...>
Account used           : <student-test | teacher-test | admin>

EXPECTED               : <one or two sentences>

ACTUAL                 : <one or two sentences>

REPRO STEPS            :
1.
2.
3.

SCREENSHOT / VIDEO     : <attach file or paste link>

SEVERITY               : [Blocker | Major | Minor | Polish]

NOTES                  : <error messages, console output, network log refs, etc.>
```

Severity guidance (must match `CLOSED_BETA_READINESS.md` § 6):

- **Blocker** — public launch / closed beta cannot proceed.
- **Major** — measurable UX regression but not launch-blocking.
- **Minor** — cosmetic or edge-case.
- **Polish** — feature-grade improvement, not a bug.

## 13. Final smoke test report template

Founder / admin compiles this at the end of the smoke test. File it
alongside the closed beta final report.

```
PRATIQO PRODUCTION SMOKE TEST — FINAL REPORT
============================================
Deployment tested      : <git sha currently live in Vercel>
Test date              : <yyyy-mm-dd>
Tester                 : <name>

DEVICES TESTED
--------------
- iPhone <model> / iOS <version> / Safari <version>
- Pixel <model> / Android <version> / Chrome <version>
- MacBook / macOS <version> / Chrome <version>
- (optional) iPad <model> / iOS <version> / Safari <version>

ACCOUNTS USED
-------------
- Student : <email or alias>
- Teacher : <email or alias>
- Admin   : <email or n/a>

FLOWS PASSED
------------
- [yes/no] Student smoke test (§ 5)
- [yes/no] Teacher smoke test (§ 6)
- [yes/no] Student reply check (§ 7)
- [yes/no] Email notification check (§ 8)
- [yes/no] Mobile layout checks (§ 9)
- [yes/no] Desktop layout checks (§ 10)

FLOWS FAILED
------------
- <flow + section>: <one-line reason, link to bug report>
- ...

BUGS CREATED
------------
Blocker  : <count>  — <bug refs>
Major    : <count>
Minor    : <count>
Polish   : <count>

GO / NO-GO RECOMMENDATION
-------------------------
[ ] GO    — invite closed beta cohort per docs/CLOSED_BETA_READINESS.md
[ ] NO-GO — fix the blockers above, redeploy, re-run this smoke test

Signed-off by          : <founder / admin name>
Date                   : <yyyy-mm-dd>
```

## See also

- [`CLOSED_BETA_READINESS.md`](./CLOSED_BETA_READINESS.md) — closed
  beta cohort checklist (the next phase after this smoke test passes).
- [`MARKETPLACE_P0_QA.md`](./MARKETPLACE_P0_QA.md) — deeper P0
  regression matrix referenced by this smoke test.
- [`MOBILE_QA_CHECKLIST.md`](./MOBILE_QA_CHECKLIST.md) — broader
  mobile / PWA device-matrix coverage.
- [`PRODUCTION_LAUNCH_RUNBOOK.md`](./PRODUCTION_LAUNCH_RUNBOOK.md) —
  full operator runbook for the public launch (Stripe live, env,
  rollback, incident response).
- [`APP_READINESS_RUNBOOK.md`](./APP_READINESS_RUNBOOK.md) — PWA
  install + native wrapper plan (out of scope for this smoke test).
