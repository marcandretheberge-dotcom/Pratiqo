# Marketplace P0 QA Checklist — Pratiqo

Last reviewed: 2026-06-14

This is the **integrated** student → teacher marketplace QA checklist for the
P0 production-readiness fixes shipped between PR #176 and PR #181. It is
focused on the marketplace journey only — for broader mobile / PWA / device
matrix coverage, also run `docs/MOBILE_QA_CHECKLIST.md`.

For each pass, record device, browser, OS version, account used, route,
result, screenshots, and any issue link.

## P0 fixes covered

| ID    | Area                                          | Shipped in            | Automated regression                                                |
|-------|-----------------------------------------------|-----------------------|---------------------------------------------------------------------|
| P0.1  | Student unread message badge parity           | PR #176               | `tests/messaging/studentUnreadBadge.test.ts`                        |
| P0.2  | Message email notifications                   | commit `c25ee19`      | `tests/messaging/messageEmailNotifications.test.ts`                 |
| P0.3  | Booking date/hour availability colors         | PR #177               | `tests/bookings/bookingSlotAvailabilityColors.test.ts`              |
| P0.4  | Teacher confirmed booking actions             | PR #179               | `tests/bookings/teacherConfirmedBookingActionVisibility.test.ts`    |
| P0.5a | Mobile teacher card name + badges layout      | PR #178, PR #180      | `tests/teacherSearch/studentSearchTeacherCardMobileLayout.test.ts`  |
| P0.5b | Message threads open at latest message        | PR #181               | `tests/messaging/messageThreadScrollToLatest.test.ts`               |
| —     | **Integrated journey smoke test**             | PR (this doc)         | `tests/marketplace/integratedMarketplaceQa.test.ts`                 |

The integrated test is wired into `npm run test:launch-critical`, so any
regression on any of the P0 areas will fail CI under a single,
P0-area-named failure inside the launch-critical suite.

## Mobile QA checklist (≤ 430px viewport)

Test on at least one iPhone (Safari) and one Android (Chrome). Installed
PWA mode preferred where possible.

- [ ] **Trouver un prof** — every teacher card shows the teacher name. Long
  names truncate cleanly with an ellipsis. Badges (verified, Membre Pro,
  trust) wrap onto a second row when needed and never crowd the name to
  zero width. (P0.5a)
- [ ] **Open teacher profile** — profile photo, badges, pricing, bio,
  trust block, and "Réserver" CTA are all reachable without horizontal
  scroll.
- [ ] **Open booking modal** — date cards: past/full dates are visibly
  grey + disabled; available dates are visibly green + clickable;
  selected date is dark green with white text. (P0.3)
- [ ] **Pick an hour slot** — same tri-state styling as date cards. The
  selected hour does not blend visually with adjacent available hours.
  (P0.3)
- [ ] **Booking submit** — submit flow works without UI confusion. Do
  NOT complete a real charge unless using a Stripe test account. The
  mocked / staging path must surface success and route back to the
  student dashboard.
- [ ] **Student opens conversation** — thread lands directly on the
  latest message; the user does NOT have to scroll down. (P0.5b)
- [ ] **Student sends a message** — optimistic message appears at the
  bottom and is auto-scrolled into view. (P0.5b)
- [ ] **Student scrolls up to read older messages** — when a new
  message arrives via realtime, the view is NOT yanked back to the
  bottom. The message is delivered but the user's reading position is
  preserved. (P0.5b)
- [ ] **Unread badge after sign-in** — student bottom-nav Messages
  tab shows the unread count when teacher has replied; clears
  immediately after the student opens the conversation. (P0.1)
- [ ] **No horizontal overflow** anywhere on the marketplace journey
  (search → profile → booking → messages) at 320 / 375 / 390 / 430 px.

## Desktop QA checklist

Test on Chrome at 1280×800 and 1920×1080. Verify the same flow works
without changing any business logic.

- [ ] Teacher search list/map layout is stable and the teacher name
  region remains protected even with a 6+ badge profile.
- [ ] Booking date/hour availability colors are equally distinct on
  desktop. Hover state on available cards is visible. (P0.3)
- [ ] Two-column messages layout (conversation list left, thread
  right) renders correctly. The thread opens at the latest message
  on desktop too. (P0.5b)
- [ ] Confirmed-paid booking on the teacher dashboard does NOT show
  any "Refuser" / "Reject" button. The cancellation entry point is
  still available where allowed. (P0.4)

## Student flow checklist

Use a real student account. Stripe should be in test mode.

- [ ] Sign in.
- [ ] Open `/trouver-un-prof` (or `/student/search` once authenticated).
  Find a teacher.
- [ ] Open the teacher's profile.
- [ ] Open the booking modal. Tri-state availability is correct. (P0.3)
- [ ] Complete a test booking (test-mode card).
- [ ] Verify the booking appears in `/student/payments` (or wherever
  the student's bookings list lives).
- [ ] Send a message to that teacher from `/messages` (or via the
  pre-filled draft from the booking flow).
- [ ] Verify the conversation thread opened at the latest message
  WITHOUT manual scrolling. (P0.5b)

## Teacher flow checklist

Use a real teacher account paired with the student account above.

- [ ] Sign in as teacher.
- [ ] On the teacher dashboard, the just-paid booking appears under
  upcoming/confirmed lessons — NOT under "incoming requests". The
  card does NOT show "Refuser" / "Reject". (P0.4)
- [ ] The proper cancellation flow is still reachable from the
  confirmed-booking view. Cancellation copy is unchanged. (P0.4)
- [ ] The teacher's Messages bottom-nav (mobile) and top-nav (desktop)
  show an unread badge for the student's message. (P0.1)
- [ ] Teacher opens the conversation. Thread lands on the latest
  message. Unread badge clears within ~1 s of opening. (P0.5b, P0.1)
- [ ] Teacher replies. Student receives an email notification (test
  mailbox; provider mocked or sandbox). The email body must NOT
  contain the private message content. (P0.2)

## Messaging checklist

Run with student and teacher accounts side-by-side.

- [ ] **Recipient-only emails**: only the receiver of a message gets
  the email; the sender does NOT email themselves. (P0.2)
- [ ] **Private content NOT in email**: the email body is a generic
  "you have a new message" with a CTA to open the conversation. The
  raw message text is never embedded. (P0.2)
- [ ] **Unread badge contract**: only messages where the current user
  is the `receiver_id` count. The sender's own outgoing messages
  never inflate their badge. (P0.1)
- [ ] **Mark-as-read** clears the badge immediately on opening the
  conversation. The `pratiqo:messages-read` event still propagates
  to the shell so the nav badge updates without a hard reload.
  (P0.1)
- [ ] **Realtime arrival while reading older messages**: peer's new
  message is delivered but the scroll position is preserved. (P0.5b)

## Booking checklist

- [ ] **Past dates**: not clickable; visually grey with `cursor-not-allowed`. (P0.3)
- [ ] **Future, fully-booked dates**: not clickable; visually grey. (P0.3)
- [ ] **Future, available dates**: clickable; visually green. (P0.3)
- [ ] **Selected date**: dark green + white text. (P0.3)
- [ ] **Hour slots**: same three states with the same color discipline. (P0.3)
- [ ] **Confirmed/paid booking on teacher side**: no reject/refuse,
  cancellation still reachable. (P0.4)

## Known limitations / not tested in this pass

- **No live Stripe charges**: this checklist deliberately excludes
  end-to-end Stripe checkout, refund, Membre Pro, or Connect tests.
  The brief for P0.6 explicitly forbids touching payment code.
  Re-confirmation must use existing payment-tier tests
  (`npm run test:payments`) and a separate Stripe-test-mode QA pass.
- **No Twilio / SMS / push notifications**: messaging notifications
  are email-only. Adding a phone-based provider is out of scope and
  guarded against in `tests/marketplace/integratedMarketplaceQa.test.ts`.
- **No live YoPratiqo paid module checkout**: scaffold is in place
  behind a feature flag (see PRs #173, #174) but the public link
  remains gated.
- **No native (iOS / Android) wrapper**: PWA mode only. Native
  submission is tracked separately in
  `docs/MOBILE_QA_CHECKLIST.md` § Store Asset Gaps.
- **No load testing or concurrency stress**: this is a regression
  pass, not a perf pass.

## What was intentionally not changed in this pass

- Stripe checkout, webhooks, Tax, Connect, refunds, commissions,
  Membre Pro pricing.
- Booking business logic (availability calculation, schedule,
  cancellation rules, refund triggers).
- Teacher search ranking, filtering, or map privacy logic.
- Messaging schema, RLS, sanitizer, or anti-circumvention rules.
- YoPratiqo learning routes (intro, modules, audio, printables).
- i18n dictionaries beyond the existing 2255 keys per locale.

## How to re-run the regression suite

```bash
# Single integrated smoke test (fast):
npx tsx tests/marketplace/integratedMarketplaceQa.test.ts

# Full launch-critical suite (covers P0.1–P0.5b deeply):
npm run test:launch-critical

# Full launch validation (auth + security + payments + i18n + build):
npm run validate:launch
```

## Next step toward public launch

Once this checklist passes on a clean release commit:

1. Run the single-tester [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md)
   on real devices against the live deployment (~20–30 min).
2. If that smoke test passes, run the **closed beta** with a tiny real
   cohort (2–3 teachers + 2–3 students) per
   [`CLOSED_BETA_READINESS.md`](./CLOSED_BETA_READINESS.md). The closed
   beta exercises the same P0 areas but with real users on real
   devices.
3. Only then proceed to the full public launch sequence in
   [`PRODUCTION_LAUNCH_RUNBOOK.md`](./PRODUCTION_LAUNCH_RUNBOOK.md).
