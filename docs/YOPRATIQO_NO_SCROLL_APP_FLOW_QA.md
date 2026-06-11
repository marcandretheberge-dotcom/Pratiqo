# YoPratiqo — No-Scroll App-Shell Flow QA

Branch: `feat/yopratiqo-no-scroll-app-shell-flow`

This checklist is the manual companion to the static-source test
suites added on this branch:

- `tests/yo/yopratiqoNoScrollAppShellFlow.test.ts`
- `tests/yo/yopratiqoLanguageCatalogAppShell.test.ts`
- `tests/yo/yopratiqoSpanishPathSimplification.test.ts`
- `tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts`

Use it on a real device + a real desktop browser before merging into
`main`. Every item below should pass.

---

## Product-rule reminders

- **YoPratiqo** = product / app name.
- **Yoppo** = companion / mascot name.
- **Pratiqo** = the full platform brand.
- Never ship `Yo` as a standalone product label.
- The public `/yo` landing **may** scroll.
- Everything else inside the YoPratiqo app experience must avoid
  primary body scrolling.

---

## 1. Public landing vs. app shell

- [ ] `/yo` is allowed to scroll (marketing landing). No regression.
- [ ] `/yo/langues` is **viewport-locked** (no body scroll on
      mobile or desktop, no rubber-band on iOS Safari).
- [ ] `/yo/langues/espagnol` is **viewport-locked** (no body scroll).
- [ ] `/yo/langues/espagnol/pays/republique-dominicaine` (Course
      Home) is **viewport-locked** — long-form discovery content
      lives at `/decouvrir`.
- [ ] Every language intro (`/yo/langues/<lang>/intro`) opens as a
      `YoLessonDeck` (viewport-locked).
- [ ] Modules 2 → 5 still open as decks and are viewport-locked.

## 2. Header / nav contract

- [ ] No `YoBreadcrumb` appears as primary navigation on any
      app-mode surface.
- [ ] App-mode headers expose three zones: back arrow (left),
      compact YoPratiqo logo + page title (centre), language
      selector (right).
- [ ] Header sits in the shell's fixed `shrink-0` slot. Content
      never overlaps behind it on any breakpoint.
- [ ] Back arrow always moves **one level up** (Course Home →
      Spanish hub → catalog → public landing).

## 3. Language selector

- [ ] The selector shows the three pills `FR / EN / ES`.
- [ ] The active locale is highlighted (filled pill).
- [ ] Unavailable locales (e.g. `es` on a Quebec French intro)
      render as **disabled / aria-disabled**, never as a broken
      link.
- [ ] Clicking a pill switches the URL while preserving the route
      (e.g. `/yo/langues?lang=en` → `/yo/langues?lang=fr`).
- [ ] No `View in English` / `Voir en français` one-off pill
      appears anywhere on app-mode surfaces.

## 4. `/yo/langues` (language catalog)

- [ ] Mobile: viewport-locked, one-up cards on small phones, two-up
      from `sm` upward. No card slides under the header.
- [ ] Desktop (`lg+`): renders the workspace pattern
      (`YoDesktopAppWorkspace`) with left rail (YoPratiqo promise +
      Yoppo) and centre stage (language tiles). Not a stretched
      mobile page.
- [ ] Yoppo is **named** on the rail.
- [ ] The four real language cards link honestly:
  - Spanish → `/yo/langues/espagnol`
  - Quebec French → `/yo/langues/francais-quebec/intro`
  - Italian → `/yo/langues/italien/intro`
  - Japanese → `/yo/langues/japonais/intro`
  - English → `/yo/langues/anglais/intro` if claimed active.
- [ ] "Intro gratuite" / "Free intro" promise pill is visible.
- [ ] No paid-checkout, plan, subscription, or `buy now` copy.

## 5. Spanish hub (`/yo/langues/espagnol`)

- [ ] Compact, viewport-locked **hub** (not the legacy long-scroll
      `YoLanguageLandingPage`).
- [ ] Two clear primary cards:
  1. **Intro deck** → `/yo/langues/espagnol/intro`
  2. **Dominican Republic** course →
     `/yo/langues/espagnol/pays/republique-dominicaine`
- [ ] Yoppo companion card present and named "Yoppo".
- [ ] Back arrow returns to `/yo/langues`.
- [ ] Desktop uses `YoDesktopAppWorkspace`.

## 6. Dominican Republic Course Home

- [ ] No body scroll. Primary screen shows:
  - course identity + locale-aware A1 badge
  - Yoppo
  - the Intro → Modules 2 → 5 path
  - one obvious primary CTA (Start / Continue)
  - teacher bridge explanation
- [ ] A clear **"Discover this course" / "Découvrir le cours"**
      link points at the new `/decouvrir` sub-route.
- [ ] `/decouvrir` preserves the full
      `RepubliqueDominicaineContent` long-form content and stays
      `noindex`.
- [ ] No fake paid unlocks; no `YoStickyCourseCta` re-introduced.
- [ ] Existing intro + Modules 2-5 decks still open and finish.

## 7. Language intros (FR-Quebec / IT / JA / EN / ES global / RD)

For each of `/yo/langues/<lang>/intro` and
`/yo/langues/espagnol/pays/republique-dominicaine/intro`:

- [ ] Mounts `<YoLessonDeck />` (no rebuilt deck).
- [ ] Viewport-locked, swipe + tap-zone gestures work.
- [ ] Companion appears on every screen with an audited visual state.
- [ ] Final CTA is honest (no fake "Module 2" where no module exists).
- [ ] Back arrow returns to the country Course Home (RD) or the
      language hub (others).

## 8. Yoppo naming consistency

- [ ] FR rails / hubs read `Yoppo, ton compagnon YoPratiqo`.
- [ ] EN rails / hubs read `Yoppo, your YoPratiqo companion`.
- [ ] ES rails / hubs read `Yoppo, tu compañero YoPratiqo`.
- [ ] Teacher-facing surfaces (`TeacherLearningInsightCard`,
      booking flows) remain professional and untouched.

## 9. Desktop app workspace

- [ ] Catalog, Spanish hub, and Course Home use
      `YoDesktopAppWorkspace` on `lg+`.
- [ ] Left rail width is honest (≈ 320–360px), centre stage flexes,
      no stretched-mobile feel.
- [ ] No giant empty hero on any of the app-mode surfaces.

## 10. Interactions (manual smoke)

- [ ] Mobile: tap each language card → arrives on the deck / hub
      without intermediate page reloads.
- [ ] Mobile: swipe left/right on every deck still advances /
      retreats screens, never the body.
- [ ] Mobile: tap-zone navigation still works (left third / right
      third / middle dead-zone) on Modules 2-5.
- [ ] Desktop: keyboard `←` / `→` still navigates the deck.
- [ ] Audio (browser-speech buttons) plays on every existing deck.
- [ ] Quiz buttons + flashcards remain interactive and never trigger
      swipe/tap navigation by mistake.
- [ ] `YoStudentCompanionCard` still appears where it appeared
      before this branch (rule: do not remove it).
- [ ] `TeacherLearningInsightCard` still appears where it appeared
      before this branch (rule: do not remove it).
- [ ] `BookingModal` consent UI unchanged.

## 11. Restricted-systems guard

Confirm that this branch:

- [ ] does **not** touch Stripe, payments, tax, RLS, migrations.
- [ ] does **not** touch legal pages.
- [ ] does **not** touch Membre Pro commission logic.
- [ ] does **not** touch MP3s or OpenAI scripts.
- [ ] does **not** change sitemap / indexation / Course schema
      beyond safe metadata.
- [ ] keeps `premiumModulesEnabled: false` in
      `lib/yo/yopratiqoProductConfig.ts`.
- [ ] introduces **no** raw quiz fields.
- [ ] does **not** change progress snapshot API behaviour.
- [ ] preserves the untracked sentinel files
      (`Untitled`, `docs/LAUNCH_READINESS_ANALYSIS.md`,
      `pratiqo-legal-export-20260528-2221.zip`).

## 12. Automated suite quick-run

From the repo root:

```bash
npx tsx tests/yo/yopratiqoNoScrollAppShellFlow.test.ts
npx tsx tests/yo/yopratiqoLanguageCatalogAppShell.test.ts
npx tsx tests/yo/yopratiqoSpanishPathSimplification.test.ts
npx tsx tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts
npx tsx tests/yo/yopratiqoAllLanguageIntrosConsistency.test.ts
npx tsx tests/yo/yopratiqoDeckVisualConsistency.test.ts
npx tsx tests/yo/yopratiqoFullDominicanPathDeck.test.ts
npx tsx tests/yo/yopratiqoLessonDeckNoScrollSwipe.test.ts
npx tsx tests/yo/yopratiqoIntroLessonDeck.test.ts
npx tsx tests/yo/yopratiqoModuleLessonDeck.test.ts
npx tsx tests/yo/yopratiqoModule3LessonDeck.test.ts
npx tsx tests/yo/yopratiqoModule4LessonDeck.test.ts
npx tsx tests/yo/yopratiqoModule5LessonDeck.test.ts
npx tsx tests/companion/companionVisualSystem.test.ts
```

All of the above should exit `0`.
