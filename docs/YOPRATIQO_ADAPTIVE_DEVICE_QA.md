# YoPratiqo — Adaptive Mobile + Desktop Device QA

Branch: `feat/yopratiqo-adaptive-mobile-desktop-shell`

This checklist is the manual companion to the static + runtime
test suites added on this branch:

- `tests/yo/yopratiqoAdaptiveShellDeviceStrategy.test.ts`
- `tests/yo/yopratiqoMobileNoScrollContract.test.ts` *(runtime: walks the React element tree)*
- `tests/yo/yopratiqoDesktopWorkspaceContract.test.ts` *(runtime: walks the React element tree)*
- `tests/yo/yopratiqoSpanishPathSimplification.test.ts` *(updated)*
- `tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts` *(updated)*
- `tests/yo/yopratiqoNoScrollAppShellFlow.test.ts` *(updated for adaptive composition)*
- `tests/yo/yopratiqoLanguageCatalogAppShell.test.ts` *(updated)*

Use it on a real device + a real desktop browser before merging
into `main`. Every item below should pass.

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

## Why this PR exists

The previous PR locked the document body with
`h-[100dvh] overflow-hidden` and let the stage scroll via
`overflow-y-auto`. Static tests grepped class names and passed.
**The actual phone experience still scrolled** — just inside the
stage. The catalog had `rail + 5 language tiles + promise + Yoppo`
= 6+ blocks → guaranteed to overflow a 390×844 phone.

This PR fixes the real device behaviour by:

1. Splitting **mobile** content into N viewport-sized screens using
   `<YoScreenPager>` (CSS scroll-snap horizontal paging, NOT
   vertical overflow scrolling).
2. Replacing the previous "single shell + same children, different
   className wrappers" pattern with `<YoAdaptiveShell>` that mounts
   **two distinct sub-trees**: `<YoMobileAppShell>` (paged) and
   `<YoDesktopLearningWorkspace>` (three-pane workspace).
3. Refusing the legacy `<YoAppShellScroller>` (the old
   `overflow-y-auto` central pane) in any new mobile sub-tree.
4. Giving the desktop a real product-software header
   (`<YoAppHeader appearance="desktop">` + `<YoLanguageSelector
   variant="desktop-dropdown">`).

## Mobile 390 × 844

- [ ] `/yo` may scroll (public landing).
- [ ] `/yo/langues` does **not** body-scroll. Swipe left/right between
      the 3 paged screens (Yoppo welcome → Languages 1 of 2 →
      Languages 2 of 2). The dots row underneath the pager updates.
- [ ] `/yo/langues` header never overlaps content (it lives in the
      shell's `shrink-0` slot).
- [ ] `/yo/langues/espagnol` does not body-scroll. Two paged
      screens: DR primary CTA (with Yoppo) → Global intro
      (secondary).
- [ ] The Spanish hub's **bottom bar** shows the DR Course Home as
      the single obvious primary CTA, always visible above the
      home indicator.
- [ ] Dominican Course Home does not body-scroll. Three paged
      screens: Hero + Yoppo → Path (Intro → Modules 2-5) →
      Details (discovery + teacher bridge).
- [ ] Course Home's bottom bar shows **Start the intro** as the
      single primary CTA, always visible.
- [ ] Intros + Modules 2-5 still open as `<YoLessonDeck>` (deck
      contract preserved). Swipe + tap-zones still work.
- [ ] No horizontal overflow on any audited surface.
- [ ] Language selector visible in every header (3 pills,
      FR / EN / ES).
- [ ] Yoppo visible (companion card on screen 1 of every paged
      surface).

## Mobile small (360 × 740)

- [ ] Same as 390 × 844 but verify no card overflows horizontally
      and the dots row stays visible above the home indicator.
- [ ] Swipe gesture lands cleanly thanks to
      `snap-mandatory snap-start`.

## Tablet 768 × 1024 portrait

- [ ] The mobile sub-tree is still active (the `lg:` breakpoint
      activates at 1024+). The paged pager works on portrait
      tablets without horizontal overflow.

## Tablet 1024 × 768 / Desktop 1440 × 900 / Desktop 1920 × 1080

- [ ] `/yo/langues` renders the **workspace pattern**:
  - left rail: YoPratiqo promise + Yoppo
  - centre: language tile grid with `sm:grid-cols-2 xl:grid-cols-3`
  - right rail: "What every intro ships" + free-intro promise
- [ ] `/yo/langues/espagnol` renders the workspace pattern:
  - left rail: Yoppo + promise
  - centre: two primary cards (DR course + global intro) +
    coming-soon
  - right rail: "What's next" context + coming-soon countries
- [ ] Dominican Course Home renders the workspace pattern:
  - left rail: Yoppo companion + discover link
  - centre: hero + path
  - right rail: teacher bridge summary
- [ ] No giant empty hero anywhere.
- [ ] The desktop header reads as a **product header** (logo +
      title on the left, "FR · Français" + flip pills on the
      right) — not the mobile pill bar.
- [ ] Language selector visible in the desktop header.
- [ ] Yoppo / progress / context visible in the rails.

## Header / nav contract

- [ ] No `<YoBreadcrumb>` on any app-mode surface.
- [ ] Back arrow on every header points exactly one level up:
      Course Home → Spanish hub → catalog → public landing.
- [ ] Language selector pills (mobile) and dropdown (desktop) both
      navigate honestly. ES is **`aria-disabled`** on routes that
      only ship FR/EN copy — never a broken link.

## Yoppo

- [ ] FR rails / hubs read **Yoppo, ton compagnon YoPratiqo**.
- [ ] EN rails / hubs read **Yoppo, your YoPratiqo companion**.
- [ ] ES rails / hubs read **Yoppo, tu compañero YoPratiqo**.
- [ ] Teacher surfaces (`TeacherLearningInsightCard`, booking
      flows) untouched.

## Interactions (manual smoke)

- [ ] Mobile: tap any language card → opens the intro / hub
      without intermediate page reloads.
- [ ] Mobile: swipe ↔ between paged screens uses native momentum
      and snap-stops cleanly.
- [ ] Mobile: vertical swipe inside the active pager screen does
      not navigate to the next screen (vertical-dominant gesture
      is ignored — same guard as in `<YoLessonDeck>`).
- [ ] Mobile: deck swipe + tap-zone navigation still works on
      Modules 2-5.
- [ ] Desktop: keyboard `←` / `→` navigates deck pages.
- [ ] Audio (browser-speech buttons) plays on every existing deck.
- [ ] Quiz buttons + flashcards remain interactive and never trigger
      pager / deck navigation by mistake.

## Restricted-systems guard

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

## Automated suite quick-run

From the repo root:

```bash
npx tsx tests/yo/yopratiqoAdaptiveShellDeviceStrategy.test.ts
npx tsx tests/yo/yopratiqoMobileNoScrollContract.test.ts
npx tsx tests/yo/yopratiqoDesktopWorkspaceContract.test.ts
npx tsx tests/yo/yopratiqoSpanishPathSimplification.test.ts
npx tsx tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts
npx tsx tests/yo/yopratiqoNoScrollAppShellFlow.test.ts
npx tsx tests/yo/yopratiqoLanguageCatalogAppShell.test.ts
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

> **Note** — Playwright/jsdom were intentionally not added. The
> "runtime viewport" assertions are achieved by importing the
> async server components and walking the returned React element
> tree with a zero-dependency recursive walker
> (`isElement` / `walk` / `findByType`). This catches the
> structural intent (no `<YoAppShellScroller>` in the mobile
> sub-tree, distinct mobile vs desktop sub-trees, declared
> screens / rails) that the previous static suite missed.
