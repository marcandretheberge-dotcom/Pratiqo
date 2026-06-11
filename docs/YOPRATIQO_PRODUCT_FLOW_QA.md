# YoPratiqo Product Flow — Manual QA

Companion manual checklist for the `feat/yopratiqo-product-shell-consistency`
PR. The static tests
(`tests/yo/yopratiqoProductShellConsistency.test.ts` +
`tests/yo/yopratiqoPratiqoBridgeConsistency.test.ts`) cover the
contracts; this file covers the *feel* — flow, focus, and the
cross-product bridge story that a static grep cannot assert.

Run each section once on a real mobile device (or a 390×844 emulator)
and once on a 1440px desktop.

---

## 1. Anonymous YoPratiqo flow

- [ ] Open `/yo`. YoPratiqo logo + hero card render above the fold.
- [ ] The hero **primary CTA** (“Start for free / Commencer
      gratuitement / Empezar gratis”) lands on
      `/yo/langues/espagnol/pays/republique-dominicaine`.
- [ ] The hero **login link** points at
      `/login?next=/student/yopratiqo` (right-click → Copy link
      address). NOT `/login?next=/student/progress`, NOT `/login`.
- [ ] Use the Intro deck — back-arrow returns to Course Home.
- [ ] Click any “See my companion” / “See my YoPratiqo companion”
      / sign-in CTA on /yo or the Course Home. While anonymous, it
      redirects to `/login?next=/student/yopratiqo`.
- [ ] After Google OAuth, you land on `/student/yopratiqo` — NOT
      `/dashboard`, NOT `/student/progress`. (Onboarding gate is the
      one valid exception: an unfinished `companion_chosen` profile
      detours through `/student/choose-companion` and then continues
      to `/student/yopratiqo`.)

## 2. Authenticated YoPratiqo flow

- [ ] `/student/yopratiqo` renders the YoPratiqo wordmark in the
      header card.
- [ ] The YoPratiqo companion card is visible **above the fold** on a
      390×844 viewport. On desktop it sits in the left column.
- [ ] The page exposes a clearly labeled “Continue learning /
      Continuer mon parcours / Continuar mi aprendizaje” CTA into the
      Intro deck.
- [ ] The lesson path lists five steps (Intro → Module 5). Each row
      links into the matching deck route.
- [ ] The “View my full Pratiqo progress / Voir toute ma progression
      Pratiqo / Ver todo mi progreso Pratiqo” CTA navigates to
      `/student/progress` and the AppShell header + bottom nav stay
      visible.
- [ ] The Course Home link navigates back to
      `/yo/langues/espagnol/pays/republique-dominicaine`.

## 3. Pratiqo ↔ YoPratiqo bridge

- [ ] On `/student/progress`:
    - [ ] The YoPratiqo bridge section (heading “Mon compagnon
          YoPratiqo / My YoPratiqo companion / Mi compañero
          YoPratiqo”) is mounted **above** the legacy Pratiqo
          companion card — both stay visible on the page.
    - [ ] The “Open YoPratiqo / Ouvrir YoPratiqo / Abrir YoPratiqo”
          CTA links to `/student/yopratiqo`.
    - [ ] The classic Pratiqo progression (homework, watch points,
          credits widget) still renders below.
- [ ] On `/student/yopratiqo`, the secondary “View my full Pratiqo
      progress” link bounces back to `/student/progress`. The
      AppShell student desktop tab strip + mobile bottom nav both
      include a YoPratiqo entry (gold label) — clicking either lands
      on `/student/yopratiqo`.

## 4. Teacher bridge (privacy-safe)

- [ ] Open the booking modal as a student.
    - [ ] The YoPratiqo consent surface is visible at the bottom of
          the modal.
    - [ ] The checkbox is **unchecked by default** (no surprise
          opt-in). If the student has no persisted YoPratiqo
          progress yet, the soft empty state renders instead.
    - [ ] Toggling the checkbox updates only the in-modal state;
          checkout is unaffected.
- [ ] After a booking is confirmed with consent ON, the teacher’s
      student detail / progress view shows the
      `TeacherLearningInsightCard` in its unlocked state:
    - [ ] Header says “YoPratiqo summary shared by the student /
          Résumé YoPratiqo partagé par l’élève / Resumen de
          YoPratiqo compartido por el estudiante”.
    - [ ] Footer notice clearly says detailed quiz responses are
          never shared.
    - [ ] No raw quiz answer text, no selected-option labels, no
          attempt logs — only the four sanitized lists (completed
          modules, strengths, practice, focus) and an optional
          companion teaser.
- [ ] Without consent, the teacher view shows the **locked** state
      (“No summary shared for this lesson”) and nothing else.

## 5. Headers + nav

- [ ] Public top bar on any non-student/non-teacher route renders
      the **YoPratiqo** wordmark next to the locale switcher.
- [ ] Student desktop header tab strip includes a YoPratiqo tab
      (gold weight = 500). Clicking it lands on `/student/yopratiqo`.
- [ ] Student mobile bottom nav includes a YoPratiqo entry with the
      🧭 icon and the “YoPratiqo” label.
- [ ] No surface anywhere shows just “Yo” as the brand label.

## 6. Responsive feel

- [ ] Mobile (390×844):
    - [ ] `/yo` and `/student/yopratiqo` stack as a single column.
    - [ ] Deck routes keep their no-body-scroll, 100dvh app frame.
    - [ ] The bottom YoPratiqo tab is reachable without scrolling.
- [ ] Desktop (1440×900):
    - [ ] `/student/yopratiqo` renders a two-column grid
          (companion + course on the left, lesson path + bridges on
          the right).
    - [ ] Deck routes remain centered at ~640px content width
          (lesson card does **not** stretch to the full browser
          width). The header bar + bottom nav share the same
          centered column.
    - [ ] Audio / quiz / details / completion buttons inside the
          decks remain clickable — tap-zone navigation does not
          steal the click.

## 7. Restriction guards (eyeball check)

- [ ] No new Stripe / payment / pricing / tax UI appears.
- [ ] No new AI summary surface appears.
- [ ] No legal page text is modified.
- [ ] `YoMarkModuleCompletedButton` still saves progress at the end
      of every deck.
- [ ] `YoStudentCompanionCard`, `TeacherLearningInsightCard`,
      `YoBookingTeacherBridgeConsent` and
      `/api/bookings/[id]/yopratiqo-bridge` are still present.

---

**Triage tip:** when in doubt, re-run the two static contract tests
and walk this checklist on one mobile device + one desktop browser
before merging.
