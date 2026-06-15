# Pratiqo — 90-Day Revenue Roadmap

Last reviewed: 2026-06-15
Owner: founder
Legal entity: **Cours Pratiqo Inc.**
Current production domain: **pratiqo.ca**

This roadmap is a **revenue-side companion** to the production-readiness
chain (`MARKETPLACE_P0_QA.md` → `PRODUCTION_SMOKE_TEST.md` →
`CLOSED_BETA_READINESS.md` → `PRODUCTION_LAUNCH_RUNBOOK.md`). It does
**not** replace the existing roadmap and does not change product
strategy. It sequences the founder's 90-day revenue plan **on top of**
the production-readiness gates so that revenue work only starts once
the marketplace is safe to expose to paying users.

If this roadmap conflicts with `docs/yopratiqo-product-strategy.md` or
`docs/product/yopratiqo-premium-module-mvp-blueprint.md`, the relevant
conflicts are flagged inline in §4 and §10 below — they are NOT silently
overridden.

## 1. Executive decision

- **Production readiness remains the immediate priority.** Revenue
  expansion does not start until the current P0 marketplace gate (§2)
  is fully green on a clean release commit AND the single-tester
  production smoke test passes on real devices.
- **The 90-day revenue plan starts only after P0 marketplace blockers
  are fixed and smoke-tested.** Day 1 of the 90-day plan is the day
  the founder signs off the `PRODUCTION_SMOKE_TEST.md` final report
  with a GO recommendation, not the calendar date the plan is read.
- **YoPratiqo is the fastest path to first revenue**, but it is scaled
  **after one validated product path**, not by producing many modules
  in parallel. The first validated path is YoPratiqo Voyage —
  Dominican Republic Spanish A1 (RD A1). Adding more modules is gated
  on RD A1 demonstrating real conversion, not on shipping more
  content.
- **Marketplace launch stays local and controlled.** Soft launch
  happens in Beauce / Québec City / Saguenay first — Montréal is
  intentionally deferred until the smaller markets have validated the
  recruitment, support, and review flows.
- **International expansion is months 6-12, not now.** Mexico /
  Uruguay open only after Québec validation; EU only after LATAM
  traction and legal readiness.

## 2. Current P0 gate before revenue push

Revenue work in §3–§7 below does **not** start until **all** of the
P0 fixes ship and are validated. Each P0 has a merged PR and an
automated regression test (see
[`MARKETPLACE_P0_QA.md`](./MARKETPLACE_P0_QA.md) for the full mapping).

| # | P0 fix | Status as of 2026-06-15 |
|---|---|---|
| P0.1  | Student unread message badge parity                 | Shipped (PR #176) |
| P0.2  | Message email notifications                         | Shipped (commit `c25ee19`) |
| P0.3  | Booking date/hour availability colors               | Shipped (PR #177) |
| P0.4  | Remove reject/refuse from confirmed paid bookings   | Shipped (PR #179) |
| P0.5a | Mobile teacher card name / badge layout             | Shipped (PRs #178, #180) |
| P0.5b | Message thread opens at latest message              | Shipped (PR #181) |
| —     | Integrated marketplace QA coverage                  | Shipped (PR #182) |
| —     | Real-device smoke test script                       | Shipped (PR #184) |
| —     | Closed beta readiness checklist                     | Shipped (PR #183) |

**Gate to start §3 (Day 1)**: founder runs
[`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) on real
devices against the live deployment, signs off a GO recommendation in
the final-report template, and confirms `npm run validate:launch` and
`npm run test:launch-critical` both pass on the release commit.

## 3. Days 1-14 — Clean terrain and instrumentation

Goal: make the production surface trustworthy and measurable before
sending any new traffic to it.

- [ ] **Resolve current git / index issues if any.** Working tree
  must be clean on `main` (the existing untracked sentinel files —
  `Untitled`, `pratiqo-legal-export-20260528-2221.zip`,
  `docs/LAUNCH_READINESS_ANALYSIS.md` — remain untracked on purpose).
- [ ] **Restore / correct corrupted route files** only if any still
  exist. Do not refactor route files that are working; only fix
  routes that 500 / 404 in production.
- [ ] **Verify Stripe Connect / production payment proof** by doing
  a controlled real-money transaction end-to-end (booking → checkout
  → webhook → booking row → refund) and reconciling Stripe dashboard
  vs Supabase rows. **Do not change Stripe code as part of this
  doc-task** — this is operator verification only, performed against
  the existing unchanged code path.
- [ ] **Sentry (free tier)** wired to `SENTRY_DSN` /
  `NEXT_PUBLIC_SENTRY_DSN` (env vars already documented in
  `PRODUCTION_LAUNCH_RUNBOOK.md` § 3). Confirm the SDK is actually
  instrumented in the Next.js runtime, not just that the env vars
  exist. Today the env vars are documented but no `@sentry/nextjs`
  import was found in the source tree — wiring the SDK is a Day 1-14
  observability task.
- [ ] **PostHog (free tier)** wired to `NEXT_PUBLIC_POSTHOG_KEY` /
  `NEXT_PUBLIC_POSTHOG_HOST`. At minimum, instrument:
  - signup, login
  - teacher search opened
  - teacher profile opened
  - booking modal opened
  - booking submit success
  - first message sent (sender role)
  - first message received (recipient role)
- [ ] **Fake public teacher cleanup plan.** Identify any seed /
  founder-owned teacher profile that is publicly visible in
  `/student/search`. Either (a) unpublish them or (b) repurpose them
  as real beta teachers under the founder's own real identity.
  Public-facing fake teachers under the founder's identity are on
  the **kill list** in §8 and must not be visible during paid
  traffic.
- [ ] **Critical tests around payments, slots, review safety** all
  green on the release commit:
  - `npm run test:payments`
  - `npm run test:launch-critical`
  - `npm run test:security`
- [ ] **Keep `pratiqo.ca` as the primary launch domain** for now.
  All marketing assets, social bios, emails, and legal copy continue
  to reference `pratiqo.ca`.
- [ ] **Optionally acquire `pratiqo.com` defensively** to prevent
  squatting. Do **NOT** pivot the brand to `.com` immediately; do
  **NOT** change any public reference to the domain in this 90-day
  window. The `.com` is a defensive hold for international expansion
  (see §7), not a launch domain.

**Exit criterion**: Sentry / PostHog ingest events; the controlled
production payment proof reconciles cleanly; no publicly visible
fake teacher remains; `npm run validate:launch` is green.

## 4. Days 15-30 — YoPratiqo first revenue test

Goal: prove the YoPratiqo paid-module funnel converts on **one**
module before producing more content. Do not blindly produce many
modules.

- [ ] **RD A1 must be validated first.** Dominican Republic Spanish
  A1 (free intro live; paid module scaffold gated by
  `lib/yo/yopratiqoPremiumCheckout.ts` and PR #173/#174) is the
  first paid funnel. The Stripe payment-link scaffold is already in
  the repo; flipping `publicLaunchEnabled` / `checkoutEnabled` for
  `"dr-spanish-a1"` in `lib/yo/yopratiqoProductConfig.ts` is the
  go-live action. Do this in a separate PR after this roadmap merges,
  not as part of this doc task.
- [ ] **Add only 1-2 high-confidence follow-up travel modules**
  before scaling. The founder's brief lists the suggested priority as:
  1. **Spanish — Mexico A1** (travel)
  2. **English — USA A1 for francophones** (travel)
- [ ] **Pricing**: keep **24,99 $ CAD** unit pricing for travel
  modules unless `lib/yo/yopratiqoProductConfig.ts` says otherwise.
  The existing scaffold uses `24.99 CAD` for RD A1 — match that for
  the follow-up modules to keep the comparison clean.
- [ ] **Test one bundle only after multiple modules exist.** Do not
  bundle RD A1 alone; bundles are a Day 30+ idea, gated on at least
  two travel modules being live and selling.
- [ ] **TikTok / Reels organic content plan.** Short-form content
  tied to each travel module (e.g. "10 phrases to survive your first
  day in Punta Cana"). Organic only — no paid ads in this window.
- [ ] **Pinterest / SEO** only for **high-quality long-tail pages**
  (e.g. "Apprendre l'espagnol pour un voyage en République
  dominicaine"), **not** thin SEO pages. Thin SEO pages are on the
  kill list in §8.

### ⚠ Conflict with existing blueprint — flagged, NOT silently overridden

`docs/product/yopratiqo-premium-module-mvp-blueprint.md` § 2
recommends **Quebec French / Francisation — Workplace and Daily-Life
Survival** as the primary first paid module, with Spanish travel
explicitly relegated to **third** candidate ("lower urgency than the
top two"). The founder's 90-day brief sequences travel modules
(RD A1 → Mexico A1 → USA A1) **first** instead, with classic language
modules (including Francisation) deferred to §5 below.

**Resolution recorded here** (this roadmap defers to the founder's
brief, but does not delete the blueprint):

- The blueprint's monetization argument for Francisation (high
  urgency, Quebec-local, professional integration) **remains valid**
  and resurfaces in §5 as the YoPratiqo classic language line.
- The founder's choice to validate the travel path first is justified
  by lower content-production cost per module (travel-survival format
  is shorter and ships faster than the 7-lesson Francisation arc) and
  by RD A1 already being live as a free intro with a paid scaffold
  ready behind a flag.
- If RD A1 / Mexico A1 / USA A1 do not validate by Day 30, the
  blueprint's Francisation-first plan is the fallback — pivot to it
  before sinking more weeks into travel content.

## 5. Days 31-60 — Languages + local marketplace soft launch

Goal: open the YoPratiqo classic language line **only after** the
travel path validates in §4, AND open the marketplace softly in
small Québec markets where support load is manageable.

- [ ] **YoPratiqo classic language line** opens only after the travel
  path validates. Sequence per `yopratiqo-product-strategy.md`:
  English, Quebec French / Francisation, Spanish, Japanese, Italian
  are the five active language pillars. Do not activate Korean,
  Portuguese, German, or Mandarin in this 90-day window —
  `yopratiqo-product-strategy.md` § "Next Language Candidates"
  explicitly keeps them as candidates only.
- [ ] **Marketplace soft launch** in **Beauce / Québec City /
  Saguenay**. These are the bootstrap markets.
- [ ] **Avoid Montréal at first.** Higher competition, higher support
  load per booking, more aggressive review/cancellation expectations.
  Montréal opens after the soft-launch cohort works smoothly in the
  smaller markets.
- [ ] **Recruit 5-15 real teachers before broad public exposure.**
  Target the lower end (5) before any marketing push; grow to 10-15
  before referencing the marketplace publicly on social.
- [ ] **Remove or hide fake / seed teachers** before public traffic
  hits. This is the production deadline for the §3 / §8 cleanup item.
- [ ] **Founding-teacher offer** *can* be considered, but it must
  **avoid legal / commission promises that have not been validated**:
  - Do NOT promise a permanent reduced commission unless the
    `lib/config/membrePro.ts` config supports it AND the legal
    review has approved the offer copy.
  - Do NOT promise a guaranteed booking volume.
  - Do NOT promise "Teacher Pro" — the canonical brand is
    **Membre Pro Pratiqo** (see `docs/legal/lawyer-export-2026-06-02/`
    and the existing `tests/payments/membreProSubscriptionManagement.test.ts`
    canonical price assertions: **29,99 $ CAD / mois + taxes
    applicables**).

## 6. Days 61-90 — B2B and first repeatable revenue

Goal: shift from one-off marketplace bookings + travel-module sales
to **repeatable** revenue via small B2B deals.

- [ ] **Bundles** only **after** YoPratiqo product traction (two or
  more travel modules selling, at least one classic language module
  live). No bundles before then.
- [ ] **Small paid ads tests** only **after** organic proof. Do not
  spend on ads in the absence of organic CTR / conversion data from
  §4 / §5.
- [ ] **B2B pipeline targets** (in priority order based on lowest
  friction first):
  1. **Private schools** (Québec) needing francisation / language
     support for newly arrived students.
  2. **Summer camps** offering language exposure modules.
  3. **Seniors residences** running cognitive-engagement language
     sessions.
  4. **Immigrant / francisation organizations** that already buy
     learning content.
  5. **Employers with immigrant employees** (HR-driven onboarding
     budget).
- [ ] **Track meetings, not vanity interest.** A "we'd love to chat"
  reply is not a meeting. The metric for §6 is **number of booked
  meetings** with a decision-maker, plus **number of paid contracts
  signed**.

## 7. International plan — months 6-12 only

This phase **starts after the 90-day window closes** and is documented
here only so domain / branding decisions in §3 do not foreclose it.

- [ ] **Do not expand internationally before traction.** "Traction"
  means: stable MRR from §4 + §5 + §6 combined, support load that
  one founder can absorb, no open Blocker bugs from
  `CLOSED_BETA_READINESS.md` § 8.
- [ ] **Mexico / Uruguay only after Québec validation.** Open
  marketplace surfaces with localized payment / tax / legal review.
- [ ] **`.com` / global domain can support future expansion**, but
  **`pratiqo.ca` remains the current trust base.** No public-facing
  pivot of the primary domain during the 90-day window or in the
  months 6-12 phase unless / until the international expansion
  decision is explicitly approved.
- [ ] **Local payments / legal / tax required before country launch.**
  Stripe support, sales-tax handling, legal terms in local language,
  and a support email reachable in the local timezone.
- [ ] **EU only after LATAM traction and legal readiness.** GDPR
  compliance work is non-trivial; defer until the LATAM market is
  generating real revenue.

## 8. Kill list — remove before scaling

Items that exist (or may still exist) in the codebase / production
surface and must be removed before any paid traffic push:

- [ ] **Publicly visible fake teachers under the founder's identity.**
  Either repurpose as real beta teachers (real availability, real
  pricing, real bookable surface) or unpublish entirely.
- [ ] **Duplicate legal routes / pages.** Single canonical URL per
  legal document per locale. Audit `app/(app)/legal/` and any
  alternate routes; consolidate.
- [ ] **Hardcoded cancellation page language** if still present
  (legacy non-i18n strings on the cancellation pages). Move to the
  existing i18n dictionary; no new keys beyond the 2255-per-locale
  baseline unless validated by `npx tsx scripts/validate_i18n.ts`.
- [ ] **`console.log` in production.** Run a targeted grep before
  each deploy of paid traffic; replace with the existing logger or
  remove entirely.
- [ ] **Legacy oversized public assets** if still present. Audit
  `public/` for images > 500 KB that load on the marketplace journey
  (search, profile, booking) and replace with optimized versions.
- [ ] **Inherited test bookings** after a backup + anonymization
  pass. Do **not** delete production booking rows without first
  taking the operator-controlled backup per
  [`PRODUCTION_BACKUPS_RUNBOOK.md`](./PRODUCTION_BACKUPS_RUNBOOK.md).

## 9. Double-down list — invest deliberately

Items that the founder should over-invest in once §3 cleanup is done:

- [ ] **YoPratiqo content production after validation.** Once RD A1
  proves conversion (§4), invest aggressively in follow-up modules
  for the validated funnel — but only the validated funnel.
- [ ] **TikTok / Reels.** Organic short-form is the lowest-cost
  acquisition channel for YoPratiqo Voyage. One creator-style account
  per language line, not many.
- [ ] **Trust badges on teacher cards.** P0.5a already protects
  teacher names on mobile (see
  [`MARKETPLACE_P0_QA.md` P0.5a](./MARKETPLACE_P0_QA.md#p0-fixes-covered)).
  Expand the verified / experienced / Membre Pro badge set as more
  teachers earn them — badges are a marketplace differentiator.
- [ ] **Long-tail SEO / GEO**, e.g.
  `/cours/espagnol/republique-dominicaine`,
  `/tuteurs-prive/quebec-city`. High-quality pages only; never thin
  pages (see §8 kill list).
- [ ] **Stripe Identity / trust as marketplace differentiator.**
  Already wired (`identity.verification_session.*` webhook events in
  [`PRODUCTION_LAUNCH_RUNBOOK.md` § 5](./PRODUCTION_LAUNCH_RUNBOOK.md#5-stripe-live-checklist)).
  Surface verification status more prominently on teacher profiles
  once the badge UX is finalized.

## 10. Go / no-go metrics

Practical, measurable criteria the founder uses to decide whether
each phase opens.

### Day 1 (start of §3)
- [ ] `npm run validate:launch` green on the release commit.
- [ ] `npm run test:launch-critical` green.
- [ ] [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) final
  report signed off with GO.

### End of §3 (Day 14)
- [ ] Sentry receiving events from production.
- [ ] PostHog receiving at least the 7 events listed in §3.
- [ ] Zero publicly visible founder-owned fake teachers in
  `/student/search`.
- [ ] Controlled production payment proof reconciled (Stripe row vs
  Supabase booking row vs webhook delivery — all three match).

### End of §4 (Day 30)
- [ ] First **real** YoPratiqo paid sale completed (not a self-test
  charge) OR a checkout-ready funnel validated end-to-end against
  real-user traffic with one of the three top-of-funnel channels
  (TikTok, Pinterest, organic SEO) — pick one metric, do not move
  goalposts.
- [ ] At least one follow-up travel module (Spanish Mexico A1 OR
  English USA A1) live with paid scaffold ready (gate still closed
  until traffic is ready).
- [ ] No blocker support issue (per
  [`CLOSED_BETA_READINESS.md` § 6](./CLOSED_BETA_READINESS.md#6-admin--founder-monitoring-checklist)
  severity rules).

### End of §5 (Day 60)
- [ ] **5 real teachers** visible in `/student/search` for the soft-
  launch markets (Beauce / Québec City / Saguenay). 10-15 is the
  stretch goal; 5 is the floor.
- [ ] **First real booking completed** end-to-end (search → profile
  → booking → Stripe Checkout success → teacher confirms session
  ran) by a non-test student.
- [ ] **First message exchange successful** between a non-test
  student and a real teacher (recipient-only email contract
  preserved per P0.2).
- [ ] **No confusing payment / booking state** surfaced. Booking
  status in app matches Stripe row matches webhook delivery.

### End of §6 (Day 90)
- [ ] At least **1 paid B2B contract signed** OR **3 booked
  decision-maker meetings** in the §6 priority list. Vanity interest
  ("we'd love to chat") does NOT count.
- [ ] MRR signal: first repeatable revenue (subscription renewal,
  recurring B2B invoice, OR returning marketplace student
  re-booking) on record.

### No-go (delay the next phase) if **any** of these are true at any gate
- [ ] P0 regression re-introduced (a `npm run test:launch-critical`
  failure on a P0 area).
- [ ] User cannot understand booking availability (P0.3 regression).
- [ ] Messages are missed or unread badge fails (P0.1 / P0.2 / P0.5b
  regression).
- [ ] Teacher sees reject / refuse on a confirmed paid booking (P0.4
  regression).
- [ ] Stripe / payment status appears inconsistent (booking marked
  paid in app but no Stripe record, or vice-versa; refund displayed
  as completed without matching Stripe refund).
- [ ] Legal / support concern surfaces (unqualified ristourne
  claim, "Teacher Pro" branding, wrong Membre Pro price, fake
  teacher visible during paid traffic).

### ⚠ Pricing reminder (canonical, do not drift in any §)

| Item                            | Canonical price | Source of truth |
|---------------------------------|-----------------|-----------------|
| YoPratiqo travel module (RD A1, follow-ups) | **24,99 $ CAD** | `lib/yo/yopratiqoPremiumCheckout.ts` |
| Membre Pro Pratiqo subscription | **29,99 $ CAD / mois + taxes applicables** | `lib/config/membrePro.ts`, asserted in `tests/membrePro/membreProPriceCopyConsistency.test.ts` |
| Marketplace lesson bookings     | Set per teacher, display-only currency | Existing booking flow, unchanged |

Any 90-day plan copy (TikTok scripts, B2B decks, landing pages,
emails) that contradicts these prices must be fixed before being
shipped to real users.

## See also

- [`MARKETPLACE_P0_QA.md`](./MARKETPLACE_P0_QA.md) — P0 regression
  matrix (Day 0 gate).
- [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) —
  single-tester pre-flight smoke test (Day 0 gate).
- [`CLOSED_BETA_READINESS.md`](./CLOSED_BETA_READINESS.md) — cohort
  validation (between Day 0 and Day 1 of §3).
- [`PRODUCTION_LAUNCH_RUNBOOK.md`](./PRODUCTION_LAUNCH_RUNBOOK.md) —
  operator runbook (Stripe live, env, rollback, monitoring).
- [`yopratiqo-product-strategy.md`](./yopratiqo-product-strategy.md) —
  product pillars, language priorities, architecture principles.
- [`product/yopratiqo-premium-module-mvp-blueprint.md`](./product/yopratiqo-premium-module-mvp-blueprint.md)
  — premium module blueprint (conflict with §4 noted inline).
- [`PRODUCTION_BACKUPS_RUNBOOK.md`](./PRODUCTION_BACKUPS_RUNBOOK.md) —
  backup gate before any §8 destructive cleanup.
