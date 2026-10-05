# Pratiqo Closed Beta Readiness

Last reviewed: 2026-06-14
Owner: founder + admin

This doc is the launch checklist for the **closed beta** that runs **between
the P0 marketplace fixes (PR #176 -> PR #182) and the full public launch**
described in [`PRODUCTION_LAUNCH_RUNBOOK.md`](./PRODUCTION_LAUNCH_RUNBOOK.md).
It is intentionally narrower in scope than the full production runbook and
focuses on validating the journey with a tiny real cohort before opening
the marketplace publicly.

It deliberately does **not** re-derive the operator runbook, the Stripe live
checklist, the database backup gate, or the rollback plan — those live in
`PRODUCTION_LAUNCH_RUNBOOK.md` and apply to the full public launch.

**Pre-flight gate**: before inviting the cohort, the founder runs the
single-tester [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) on
real devices against the live deployment. If that smoke test fails, do
**not** invite the cohort.

## 1. Closed beta goal

Validate the **full Pratiqo marketplace flow** with a tiny group of real
participants before public launch. Focus areas:

- **Reliability**: real users do not hit blocking errors on the marketplace
  journey (search -> profile -> booking -> messaging).
- **Trust**: students can clearly tell available from unavailable booking
  slots; teachers see consistent booking statuses.
- **Support**: support email is monitored and bug capture works end-to-end.
- **UX clarity**: mobile teacher cards keep the teacher name visible;
  message threads open at the latest message; confirmed bookings do not
  show reject/refuse on the teacher side.

Out of scope: any cohort larger than this checklist's "Who participates"
section, public marketing, native iOS/Android wrappers, YoPratiqo paid
checkout, broad Membre Pro public campaign, international expansion.

## 2. Who participates

| Role             | Count | Notes                                                                                  |
|------------------|-------|----------------------------------------------------------------------------------------|
| Teachers         | 2-3   | Real teachers who agreed to a beta; profiles must already meet launch eligibility.    |
| Students         | 2-3   | Real students paired with the beta teachers; ideally one per teacher minimum.         |
| Founder/admin    | 1     | Monitors logs, support email, payments, and bug capture during the entire cohort.     |
| Support contact  | —     | `info@pratiqo.ca` — monitored daily during the beta window.                         |

Each participant must agree (informally) that:

- They are testing a beta and that minor issues may surface.
- Real Stripe charges may be processed if the participant proceeds with a
  paid lesson booking. The beta does **not** cover payment-flow changes —
  the same Stripe checkout / refund / webhook path the public launch will
  use is exercised.
- Bugs are reported via `info@pratiqo.ca` or directly to the founder.
- Participants do not publicly post screenshots / promotional content
  about Pratiqo until the public launch is announced.

## 3. Required pre-beta technical checks

Run these in order from a clean checkout of `main`. All must pass before
inviting the cohort.

```bash
git switch main
git pull --ff-only origin main
git status -sb                       # working tree clean (sentinels OK)

npm run validate:launch              # auth + security + payments + i18n + build
npm run test:launch-critical         # P0 regressions + integrated marketplace
npm run build                        # production build
npx tsx scripts/validate_i18n.ts     # 2255 keys per locale
git diff --check                     # no whitespace / conflict markers
```

| Check                                                       | Required state                                                                |
|-------------------------------------------------------------|-------------------------------------------------------------------------------|
| `npm run validate:launch`                                   | exits 0                                                                       |
| `npm run test:launch-critical`                              | exits 0 (includes `tests/marketplace/integratedMarketplaceQa.test.ts`)        |
| `npm run build`                                             | exits 0; static pages 266/266 OK                                              |
| `npx tsx scripts/validate_i18n.ts`                          | "i18n dictionaries are valid (2255 keys per locale)"                          |
| `git diff --check`                                          | clean                                                                         |
| Production env in Vercel                                    | All variables in [`PRODUCTION_LAUNCH_RUNBOOK.md` §3](./PRODUCTION_LAUNCH_RUNBOOK.md#3-vercel-environment-checklist) set for **Production**, not just Preview. |
| Sentry / PostHog DSNs                                       | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` set in Vercel **if** the SDKs are wired. If the SDK is NOT yet wired, skip — do not block beta on monitoring. |
| `info@pratiqo.ca`                                        | A teammate has confirmed (within 24 h before beta) that emails sent to the address are received and read.                       |
| Transactional emails                                        | Resend domain verified (`pratiqo.ca`); send a test "new booking" + "new message" email to a beta tester before invites.        |
| Restricted systems untouched                                | No PR landed since PR #182 that modified Stripe / webhooks / commissions / Membre Pro / YoPratiqo learning routes.              |
| No fake PDF / fake resource links                           | Confirm any "downloadable resource" link on the public site routes to a real asset (relevant only for YoPratiqo printables; out of marketplace beta scope but quick to spot-check). |

## 4. Student beta script

Run on at least one iPhone (Safari) and one Android (Chrome). Capture
device + browser + OS + route + screenshot for any anomaly.

1. **Sign in** at `https://www.pratiqo.ca/login`. New beta students may
   create an account; otherwise reuse a pre-created beta credential.
2. **Open "Trouver un prof"** at `/trouver-un-prof` (public) or
   `/student/search` (authenticated). Verify:
   - Teacher cards on **mobile** show the teacher name **clearly**, even
     when the teacher carries multiple compact trust badges (P0.5a).
   - No horizontal scroll at 320 / 375 / 390 / 430 px.
3. **Open a teacher profile**. Profile photo, badges, bio, pricing, trust
   block, and "Réserver" CTA must all be reachable without horizontal
   scroll.
4. **Open the booking modal** from the profile. On the date picker:
   - Past / fully-booked dates are visibly **grey + disabled** (not
     clickable). (P0.3)
   - Available dates are visibly **light teal + clickable**. (P0.3)
   - The selected date is visibly **dark teal with white text**. (P0.3)
5. **Pick an hour slot**. Same tri-state coloring applies. The selected
   hour does NOT visually blend with adjacent available hours. (P0.3)
6. **Complete the booking** (real Stripe charge — **not** test mode).
   This exercises the unchanged production payment path. After the
   redirect from Stripe Checkout success, the student dashboard must
   show the booking with the correct status.
   - **If the student or founder is uncomfortable with a real charge**:
     skip step 6 and document the booking flow as "verified up to but
     not including Stripe checkout", and capture screenshots of the
     last reachable step.
7. **Send the teacher a message** from `/messages` (or via the booking
   confirmation deep-link). The thread must:
   - Open at the **latest** message (no manual scroll required). (P0.5b)
   - Render the optimistic message at the bottom and auto-scroll. (P0.5b)
8. **Wait for the teacher reply.** When the teacher replies (see § 5),
   the student should see:
   - An **unread badge** on the Messages bottom-nav (mobile) / top-nav
     (desktop). (P0.1)
   - The thread re-opens at the new latest message. (P0.5b)
   - The badge **clears** within ~1 s of opening the conversation. (P0.1)

## 5. Teacher beta script

Run on at least one mobile and one desktop. Pair with a beta student.

1. **Sign in** as a teacher.
2. **Verify the public profile** at `/teacher/profile/[id]` and the
   teacher's own search card on `/student/search` (when impersonating /
   in incognito mode). Photo, badges, bio, pricing must render
   correctly. The teacher's name on the search card must remain visible
   even on mobile. (P0.5a)
3. **Wait for the student's booking** (§ 4 step 6) to land on the teacher
   dashboard. Verify:
   - The booking appears under upcoming/confirmed lessons (NOT under
     "incoming requests"). (P0.4)
   - The booking card does **NOT** show a "Refuser" / "Reject" button.
     (P0.4)
   - The proper **cancellation** flow is still reachable from the
     confirmed-booking view (where cancellation is allowed by the
     existing rules — those rules are unchanged). (P0.4)
4. **Open the message thread** from the booking. The thread must open at
   the latest message. (P0.5b) The teacher's Messages badge must reflect
   any unread messages from the student. (P0.1)
5. **Reply** to the student. Verify the optimistic message appears at
   the bottom and auto-scrolls. (P0.5b)
6. **Confirm the email notification**. After replying, the **student**
   (the recipient, not the sender) must receive a transactional email
   from Pratiqo with a deep-link CTA to the conversation. The email
   body must NOT include the raw private message text. (P0.2)
7. **Cancellation scenario (only if safe)**. If one of the beta bookings
   needs to be cancelled, follow the existing cancellation flow without
   modification. Verify:
   - Cancellation copy reflects the existing rules (>24 h vs. <24 h).
   - No UI claims the refund completed unless Stripe records it.
   - The booking status updates correctly.

## 6. Admin / founder monitoring checklist

During the **entire beta window** (typically 3-7 days):

- [ ] Watch Vercel function logs for the marketplace surfaces:
  `/api/messages/send`, `/api/bookings/[id]/cancel`,
  `/api/teachers/[id]/slots`, `/api/teachers/[id]/available-days`,
  `/api/stripe/checkout`, `/api/stripe/webhook`. **Do not rely on
  Stripe webhook for payment confirmation alone — cross-check with the
  booking row in Supabase.**
- [ ] Watch Sentry / PostHog dashboards if the SDKs are wired. If not
  wired, log raw Vercel errors via the Vercel logs UI.
- [ ] Monitor `info@pratiqo.ca` at least twice per day. Acknowledge
  receipt of every message within ~24 h.
- [ ] For each issue surfaced, **record before triaging**:
  - User role (student / teacher / admin).
  - Device (model + OS version).
  - Browser (name + version).
  - Exact route (`/messages`, `/student/search`, etc.).
  - Screenshot or short screen recording.
  - One-line expected behavior.
  - One-line actual behavior.
- [ ] Classify each bug as one of:
  - **Blocker** — public launch cannot proceed (e.g. booking flow
    broken, payment record inconsistency, message lost, email not
    delivered).
  - **Major** — measurable UX regression but not launch-blocking
    (e.g. the cancellation copy is unclear).
  - **Minor** — cosmetic or edge-case (e.g. truncated badge label).
  - **Polish** — feature-grade improvement, not a bug.
- [ ] Do **NOT** open the public launch (and do **NOT** broadcast
  marketing) while any **Blocker** remains open.

## 7. Known out-of-scope items

The closed beta deliberately does **not** cover:

- **Twilio / SMS / push notifications**. Messaging notifications are
  email-only. Adding a phone-based provider is guarded against in
  `tests/marketplace/integratedMarketplaceQa.test.ts`.
- **Native iOS / Android wrapper**. The PWA install path is the only
  mobile install surface today. Native submission is tracked in
  `docs/APP_READINESS_RUNBOOK.md` and `docs/app-store/`.
- **Public YoPratiqo paid checkout**. The scaffold (PR #173 / #174) is
  in place behind a feature flag; the public link gate remains `false`.
  Flipping it requires its own QA pass.
- **Broad Membre Pro public campaign**. Membre Pro is reachable via the
  authenticated `/upgrade` route; the public payment-link scaffold
  (PR #173 / #174) is gated. No public marketing about Membre Pro
  pricing changes during the beta.
- **Large SEO / content scale**. SEO surfaces (`/cours/[disciplineSlug]/[citySlug]`,
  `/tuteurs-prive/[citySlug]`) exist but are not the focus of the beta.
- **Uruguay / international expansion**. Existing market-gating rules
  apply; expanding the supported markets is out of beta scope.

## 8. Go / no-go criteria

### Go (open the public launch) only if **all** are true:

- [ ] No **Blocker** bugs remain open.
- [ ] At least 2 of 3 beta students completed the full search -> profile ->
  booking -> messaging journey end-to-end on mobile.
- [ ] At least 2 of 3 beta teachers received the booking, replied to the
  student, and confirmed they did NOT see a reject/refuse button on the
  paid booking.
- [ ] The support path is clear: support email confirmed working;
  founder/admin can reach the cohort and vice-versa.
- [ ] All transactional emails (booking confirmation, message
  notification, cancellation, Stripe receipt) reached the intended
  recipient. The recipient-only invariant (the sender does NOT email
  themselves) was verified for at least one real round trip.
- [ ] Mobile layout is acceptable on every device the cohort tested.
  Specifically: teacher names visible on search cards (P0.5a), date /
  hour availability colors distinguishable (P0.3), message thread
  opens at the latest message (P0.5b).
- [ ] No payment / support / legal confusion surfaced. The cancellation
  copy was understandable; refund expectations matched the existing
  rules (>24 h vs. <24 h); no copy claimed a refund completed when it
  hadn't.

### No-go (delay the public launch) if **any** of these are true:

- [ ] Booking flow is confusing — students cannot tell available from
  unavailable slots, or the booking submit silently fails.
- [ ] Messages are missed — the unread badge does not surface, or the
  thread does not open at the latest message, or a recipient does not
  receive the email notification.
- [ ] Teacher cannot understand booking status / actions — reject/refuse
  appears on confirmed/paid bookings, or the cancellation entry is
  hidden when it should be visible.
- [ ] Student cannot identify a teacher on the mobile search card —
  badges crowd out the name, the photo is missing, or the card does not
  open the profile.
- [ ] Stripe / payment status appears inconsistent — booking marked paid
  in app but no Stripe record (or vice-versa); refund displayed as
  completed without a matching Stripe refund.
- [ ] Support / legal concerns surface — copy that contradicts the
  existing legal documents (e.g. wrong Membre Pro price, "Teacher Pro"
  branding, or unqualified "ristourne" claims). If found, do NOT
  rewrite copy here — flag it and route to a separate fix PR.

## 9. Bug report template

Reporters can paste this template into `info@pratiqo.ca` or a shared
sheet during the beta:

```
USER ROLE       : [student | teacher | admin]
ACCOUNT EMAIL   : <email>
DEVICE          : <iPhone 15 / Pixel 7 / MacBook Pro / etc.>
OS              : <iOS 17.5 / Android 14 / macOS 14.5 / etc.>
BROWSER         : <Safari 17.5 / Chrome 126 / etc.>
DATE/TIME (UTC) : <yyyy-mm-dd hh:mm>
ROUTE           : </messages, /student/search, /teacher/profile/...>

EXPECTED        : <one or two sentences>

ACTUAL          : <one or two sentences>

REPRO STEPS     :
1.
2.
3.

SCREENSHOT/VIDEO: <attach or paste link>

SEVERITY        : [Blocker | Major | Minor | Polish]

NOTES           : <any relevant context, error messages, console output>
```

## 10. Final beta report template

Founder/admin compiles this once the beta window closes:

```
PRATIQO CLOSED BETA — FINAL REPORT
==================================
Window           : <yyyy-mm-dd> -> <yyyy-mm-dd>
Release commit   : <git sha on main at start of beta>

PARTICIPANTS
------------
Teachers         : <names or anon ids> (count)
Students         : <names or anon ids> (count)

DEVICES TESTED
--------------
- iPhone <model> / Safari <version>
- Pixel <model> / Chrome <version>
- MacBook / Chrome <version>
- (...)

SUCCESSFUL FLOWS
----------------
- [yes/no] Student "Trouver un prof" -> teacher card on mobile (P0.5a)
- [yes/no] Booking date/hour tri-state availability colors (P0.3)
- [yes/no] Booking submit + Stripe checkout success (production path)
- [yes/no] Confirmed booking on teacher dashboard, no reject/refuse (P0.4)
- [yes/no] Cancellation flow surfaced where allowed (P0.4)
- [yes/no] Student -> teacher message round trip (P0.1, P0.5b)
- [yes/no] Recipient-only email notification (P0.2)
- [yes/no] Unread badge clears on open (P0.1)

FAILED FLOWS
------------
<flow name> : <what failed, who hit it, link to bug report>

BUGS FOUND
----------
Blocker  : <count> — <one-liner each>
Major    : <count>
Minor    : <count>
Polish   : <count>

FIXES REQUIRED BEFORE PUBLIC LAUNCH
-----------------------------------
1. <bug ref> — <fix description>
2. ...

LAUNCH RECOMMENDATION
---------------------
[ ] GO   — proceed to public launch per docs/PRODUCTION_LAUNCH_RUNBOOK.md
[ ] NO-GO — delay public launch until the fixes above ship + a follow-up
            beta round confirms green go/no-go criteria

Signed-off by    : <founder/admin name>
Date             : <yyyy-mm-dd>
```

## See also

- [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) — single-tester
  pre-flight smoke test (run by the founder on real devices **before**
  inviting the closed beta cohort).
- [`PRODUCTION_LAUNCH_RUNBOOK.md`](./PRODUCTION_LAUNCH_RUNBOOK.md) — full
  public launch operator runbook (Stripe live, env, smoke test, rollback).
- [`MARKETPLACE_P0_QA.md`](./MARKETPLACE_P0_QA.md) — integrated marketplace
  QA checklist (mobile + desktop + journey + booking + messaging).
- [`MOBILE_QA_CHECKLIST.md`](./MOBILE_QA_CHECKLIST.md) — broader
  mobile/PWA device-matrix coverage.
- [`APP_READINESS_RUNBOOK.md`](./APP_READINESS_RUNBOOK.md) — PWA install
  + native wrapper plan (out of beta scope).
