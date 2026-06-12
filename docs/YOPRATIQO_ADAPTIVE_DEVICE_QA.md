# YoPratiqo — Adaptive Mobile + Desktop Device QA

Branches / phases covered by this checklist:

- `feat/yopratiqo-adaptive-mobile-desktop-shell` — initial
  adaptive shell + swipe-only `<YoScreenPager>`.
- `feat/yopratiqo-product-shell-pratiqo-bridge` — bridged the
  Pratiqo `/student/*` surfaces back into the YoPratiqo hub.
- **`feat/yopratiqo-world-class-shell`** *(this PR)* — replaced
  the swipe-only `<YoScreenPager>` with the explicit
  `<YoStepNavigator>` (Back / Next + clickable dots), capped the
  desktop centre pane for reading comfort, fixed 13 surgical
  layout bugs, added two new runtime contract suites.

This checklist is the manual companion to the static + runtime
test suites added on these branches:

- `tests/yo/yopratiqoAdaptiveShellDeviceStrategy.test.ts`
- `tests/yo/yopratiqoMobileNoScrollContract.test.ts` *(updated:
  now refuses `<YoScreenPager>` on every audited route, requires
  `<YoStepNavigator>`)*
- `tests/yo/yopratiqoDesktopWorkspaceContract.test.ts` *(updated:
  new comma-bug regression guard parses every
  `lg:grid-cols-[…]` arbitrary value)*
- `tests/yo/yopratiqoLayoutOverflowContract.test.ts` *(new: bans
  `pb-18`-style invalid Tailwind classes, `100vh` + `100dvh`
  clashes on the same element, bare `grid-cols-N` without a
  responsive sibling, `truncate` on `h1`/`h2`)*
- `tests/yo/yopratiqoStepNavigatorContract.test.ts` *(new:
  asserts Back + Next + clickable dots + `aria-current="step"` +
  `aria-controls` wiring + ArrowLeft / ArrowRight + form-input
  guard)*
- `tests/yo/yopratiqoSpanishPathSimplification.test.ts`
- `tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts`
- `tests/yo/yopratiqoNoScrollAppShellFlow.test.ts`
- `tests/yo/yopratiqoLanguageCatalogAppShell.test.ts`
- `tests/yo/yopratiqoProductShellConsistency.test.ts`
  *(unchanged — guards the privacy / bridge contract)*
- `tests/yo/yopratiqoPratiqoBridgeConsistency.test.ts`
  *(unchanged — guards the privacy / bridge contract)*

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

## What changed in this PR (world-class shell)

1. **Phase 0** — 13 surgical layout bugs fixed:
   - `lg:grid-cols-[…,…,…]` (commas) → `lg:grid-cols-[…_…_…]`
     (underscores). The old form produced an invalid CSS
     declaration; every browser dropped it and the desktop
     workspace silently collapsed to a single column.
   - `h-[100dvh] min-h-[100vh]` clash → `h-[100dvh]` only. iOS
     Safari's bottom toolbar no longer covers the CTA.
   - `overflow-x-hidden` added to every adaptive shell wrapper.
   - `lg:pb-18` (invalid rung) → `lg:pb-20`.
   - `grid-cols-2` without mobile fallback → `grid-cols-1 sm:grid-cols-2`
     on every card with text.
   - `truncate` on `h2` titles → `break-words leading-snug`.
   - Hero image `object-cover` → `object-contain` to stop the
     portrait fallback PNG from cropping its subject.
   - `sticky top-0` dropped from `YoCourseAppHeader` (no-op
     inside an `overflow-hidden` parent + iOS Safari stacking
     bug).
   - `flex-1` removed from the lone mobile primary card on
     several routes (it was leaving large empty space).
2. **Phase 1** — new `<YoStepNavigator>` primitive:
   - Explicit `Back` / `Next` buttons with clickable step dots
     in the middle.
   - First-step `Back` becomes a `Link` to a `rootBackHref`;
     last-step `Next` either becomes a `Link` to
     `lastStepNextHref` or shows a disabled `Done`.
   - Keyboard `←` / `→` advance (and skip typing in form
     inputs).
   - Swipe gesture is a SECONDARY input only — never the sole
     advance affordance.
   - Two variants: `standalone` (owns the viewport) and
     `embedded` (renders inline inside an existing shell — used
     by `/student/yopratiqo` + `/student/progress`).
3. **Phase 2** — every learner-facing surface migrated:
   - `/yo/langues`, `/yo/langues/espagnol`, `/yo/langues/espagnol/pays/republique-dominicaine`
     (the 3 already-adaptive routes) — swapped pager → step
     navigator.
   - `/yo/langues/anglais`, `/yo/langues/italien`,
     `/yo/langues/japonais`, `/yo/langues/francais-quebec`
     (4 language landings) — refactored through the new
     `<YoLanguageLandingPage>` composer, mounted under
     `<YoAdaptiveStepShell>`.
   - `/yo/voyage/republique-dominicaine` — redirected
     permanently to the canonical Course Home; the legacy
     long-scroll route is gone.
   - `/yo/langues/espagnol/pays/republique-dominicaine/decouvrir`
     — mobile becomes a single-step shell with a persistent
     "Continue · Course Home" CTA at the bottom; desktop keeps
     its intentional long-form discovery layout.
   - `/student/yopratiqo` — embedded step navigator with 4 steps
     (Companion / Course / Path / Bridges) on mobile, two-column
     workspace grid on desktop.
   - `/student/progress` — embedded step navigator with 3 steps
     (Credits + Yoppo / Homework / Watch points) on mobile,
     single-column layout on desktop (inside the (app)
     AppShell).
4. **Phase 3** — desktop polish:
   - Centre pane capped at `max-w-2xl` by default in
     `<YoDesktopAppWorkspace>` (reading-comfort target for
     1440 / 1920 px monitors). Tile-grid routes opt into a
     wider cap via `centerMaxWidth="4xl"`.
   - New `<YoWorkspaceStepList>` primitive available for any
     left rail that wants a clickable step list with `you are
     here` highlighting (anchor-jump on click,
     IntersectionObserver-based auto-tracking).
5. **Phase 4** — locked the new contracts with runtime tests
   (see the test-suite list above).

## Why this PR exists

The previous PRs locked the document body with
`h-[100dvh] overflow-hidden` and let the stage scroll via
`overflow-y-auto`. Then they replaced the scroll with the
swipe-only `<YoScreenPager>`. Both passes left learners reading
the experience as "I have to scroll / swipe to find the next
thing" — the advance affordance was invisible. This PR replaces
the swipe with explicit `Back` / `Next` + dots so the next step
is always one tap away.

---

## Mobile 375 × 667 (iPhone SE)

- [ ] `/yo` may scroll (public landing).
- [ ] `/yo/langues` does **not** body-scroll. Tap **Next** to
      advance through the 3 steps (Welcome+Yoppo → Languages
      1 of 2 → Languages 2 of 2). The step dots underneath
      reflect the active step (one wider pill in the centre).
- [ ] `/yo/langues` header never overlaps content.
- [ ] `/yo/langues` Next button visible on every step; **Done**
      on the last step is a disabled indicator (no `lastStepNextHref`
      on the catalog).
- [ ] `/yo/langues/espagnol` does not body-scroll. Two steps
      (Primary path / Global intro); the last step's **Next**
      button is a green link labeled "Open Dominican Republic"
      (FR: "Ouvrir République dominicaine") that opens the
      Course Home directly.
- [ ] Dominican Course Home does not body-scroll. Three steps
      (Hero+Yoppo / Path / Details); the last step's **Next**
      button is the **Start the intro** link.
- [ ] Intros + Modules 2-5 still open as `<YoLessonDeck>` (deck
      contract preserved). Swipe + tap-zones still work — the
      lesson deck is unchanged.
- [ ] No horizontal overflow on any audited surface.
- [ ] Language selector visible in every header (3 pills,
      FR / EN / ES).
- [ ] Yoppo visible (companion card on the first step of every
      paged surface that surfaces it).
- [ ] **Back** button on step 0 of every route is a link, NOT a
      disabled button — taps take the learner back to the
      parent route.

## Mobile 393 × 852 (iPhone 16 Pro)

- [ ] Same as 375 × 667 — verify the bottom chrome (Back /
      dots / Next) clears the home indicator with the
      `safe-area-inset-bottom` inset.
- [ ] Tap any step dot in the centre to jump directly to that
      step — the stage updates and `aria-current="step"` moves.
- [ ] Vertical scroll inside a step that is naturally taller
      than the viewport works without triggering Back / Next.

## Mobile 412 × 915 (Pixel 7)

- [ ] Same as iPhone 16 Pro. Verify the Material status bar +
      navigation bar don't overlap the step navigator chrome.

## Tablet 768 × 1024 portrait (iPad mini portrait)

- [ ] The mobile sub-tree is still active (the `lg:`
      breakpoint activates at 1024+). The button-driven step
      navigator works on portrait tablets without horizontal
      overflow.
- [ ] On `/yo/langues` the welcome step still fits in one
      viewport without scrolling.

## Tablet 1024 × 768 landscape (iPad mini landscape) / Desktop 1440 × 900 / Desktop 1920 × 1080

- [ ] `/yo/langues` renders the **workspace pattern**:
  - left rail: YoPratiqo promise + Yoppo
  - centre: language tile grid with `sm:grid-cols-2 xl:grid-cols-3`
    *(catalog opts into `centerMaxWidth="4xl"`, so the third
    column still fits without scrolling on 1440 px)*
  - right rail: "What every intro ships" + free-intro promise
- [ ] `/yo/langues/espagnol` renders the workspace pattern.
- [ ] Dominican Course Home renders the workspace pattern.
- [ ] On 1920 × 1080 the centre column is capped at
      `max-w-2xl` (672 px) for prose-style content; the rails
      breathe naturally on either side. No "stretched mobile in
      the centre".
- [ ] No giant empty hero anywhere.
- [ ] The desktop header reads as a **product header** (logo +
      title on the left, "FR · Français" + flip pills on the
      right) — not the mobile pill bar.
- [ ] Language selector visible in the desktop header.
- [ ] Yoppo / progress / context visible in the rails.
- [ ] Keyboard `←` / `→` advance the mobile step navigator on
      desktop (when the page has rendered the mobile sub-tree —
      i.e. the desktop variants of `/student/yopratiqo` and
      `/student/progress` which use the `embedded` step
      navigator).

## Authenticated surfaces — `/student/yopratiqo` + `/student/progress`

### Mobile (`/student/yopratiqo`)

- [ ] Branded header (YoPratiqo logo + title) is always
      visible at the top.
- [ ] Below the header, an `embedded` step navigator exposes
      4 steps: Yoppo · companion / Current course / Lesson
      path / Pratiqo bridges. Tap Next to advance.
- [ ] Bottom (app) AppShell tab bar still visible underneath
      the step navigator. The navigator chrome is INLINE, not
      pinned to the viewport bottom.

### Mobile (`/student/progress`)

- [ ] Header + Credits widget visible on step 1.
- [ ] Step 1 also includes the YoPratiqo bridge section
      (heading + body + companion card + "Open YoPratiqo"
      link). Step 2 is Homework; step 3 is Watch points.
- [ ] The YoPratiqo bridge section's privacy contract is
      unchanged (`data-testid="yo-progress-bridge-section"`,
      `yo-progress-bridge-heading`, `yo-progress-bridge-cta`
      still in the DOM).

### Desktop (`/student/yopratiqo` + `/student/progress`)

- [ ] Two-column grid on `/student/yopratiqo`, single column
      on `/student/progress` — unchanged from the previous
      version. The (app) AppShell IS the workspace, so no
      nested workspace grid.
- [ ] Both pages preserve the legacy Pratiqo companion card +
      homework + watch-points sections.

## Header / nav contract

- [ ] No `<YoBreadcrumb>` on any app-mode surface.
- [ ] Back arrow on every header points exactly one level up:
      Course Home → Spanish hub → catalog → public landing.
- [ ] Language selector pills (mobile) and dropdown (desktop)
      both navigate honestly. ES is **`aria-disabled`** on
      routes that only ship FR/EN copy — never a broken link.

## Yoppo

- [ ] FR rails / hubs read **Yoppo, ton compagnon YoPratiqo**.
- [ ] EN rails / hubs read **Yoppo, your YoPratiqo companion**.
- [ ] ES rails / hubs read **Yoppo, tu compañero YoPratiqo**.
- [ ] Teacher surfaces (`TeacherLearningInsightCard`, booking
      flows) untouched.

## FR-locale pass

The 13 Phase 0 bugs were most visible on French copy because FR
strings are longer than EN. Re-walk every surface in FR
(`/yo/langues?lang=fr-FR`, `/yo/langues/espagnol?lang=fr-FR`,
…) and confirm:

- [ ] No mid-word `…` on any `h1` / `h2` title — long FR
      titles wrap onto two lines naturally.
- [ ] No card text crammed into half the card width on any
      `grid-cols-2`-style layout (because every audited card
      now declares a `sm:`-prefixed scale-up).
- [ ] The Spanish hub's primary CTA on the last step reads
      "Ouvrir République dominicaine" without clipping.
- [ ] The Dominican Course Home's primary CTA on the last
      step reads "Commencer l'intro" without clipping.
- [ ] Step labels in the step dots are long-FR-friendly (they
      live in `aria-label`, so the visual dot stays a fixed
      width — but verify the screen-reader announcement reads
      naturally).

## Interactions (manual smoke)

- [ ] Mobile: tap any language card → opens the intro / hub
      without intermediate page reloads.
- [ ] Mobile: tap **Next** at the bottom of any
      `<YoStepNavigator>` to advance the active step. The
      dots row updates and the stage scrolls itself to the
      top of the next step (respects
      `prefers-reduced-motion`).
- [ ] Mobile: tap **Back** to retreat. On step 0 of a route
      that declares `rootBackHref`, **Back** becomes a link to
      the parent route.
- [ ] Mobile: tap any step dot in the centre to jump
      directly to that step.
- [ ] Mobile: swipe `←` / `→` inside the active step still
      works as a SECONDARY input (not the only way to advance).
      Vertical-dominant swipe is ignored.
- [ ] Mobile: deck swipe + tap-zone navigation still works on
      Intro + Modules 2-5.
- [ ] Desktop: keyboard `←` / `→` navigates deck pages AND
      step-navigator pages (the step navigator's keydown
      handler is window-level so it fires on desktop too,
      even though the navigator's chrome is `lg:hidden`).
- [ ] Audio (browser-speech buttons) plays on every existing
      deck.
- [ ] Quiz buttons + flashcards remain interactive and never
      trigger pager / deck navigation by mistake.
- [ ] **Cmd / Ctrl + K** is currently NOT wired to a command
      palette — the (app) AppShell ships no command palette
      today. The keyboard-shortcut item in the plan is
      deferred to a follow-up PR; document this with the user
      so they don't expect a working `⌘K`.

## Restricted-systems guard

Confirm that this branch:

- [ ] does **not** touch Stripe, payments, tax, RLS,
      migrations.
- [ ] does **not** touch legal pages.
- [ ] does **not** touch Membre Pro commission logic.
- [ ] does **not** touch MP3s or OpenAI scripts.
- [ ] does **not** change sitemap / indexation / Course
      schema beyond safe metadata.
- [ ] keeps `premiumModulesEnabled: false` in
      `lib/yo/yopratiqoProductConfig.ts`.
- [ ] introduces **no** raw quiz fields.
- [ ] does **not** change progress snapshot API behaviour.
- [ ] preserves the booking-level teacher-bridge consent
      default + empty state + POST contract.

## Automated suite quick-run

From the repo root:

```bash
# World-class shell contracts (new + updated this PR)
npx tsx tests/yo/yopratiqoMobileNoScrollContract.test.ts
npx tsx tests/yo/yopratiqoDesktopWorkspaceContract.test.ts
npx tsx tests/yo/yopratiqoLayoutOverflowContract.test.ts
npx tsx tests/yo/yopratiqoStepNavigatorContract.test.ts

# Privacy + bridge contracts (unchanged but must stay green)
npx tsx tests/yo/yopratiqoProductShellConsistency.test.ts
npx tsx tests/yo/yopratiqoPratiqoBridgeConsistency.test.ts

# Adaptive-shell + IA / landing contracts
npx tsx tests/yo/yopratiqoAdaptiveShellDeviceStrategy.test.ts
npx tsx tests/yo/yopratiqoSpanishPathSimplification.test.ts
npx tsx tests/yo/yopratiqoAppHeaderLanguageSelector.test.ts
npx tsx tests/yo/yopratiqoNoScrollAppShellFlow.test.ts
npx tsx tests/yo/yopratiqoLanguageCatalogAppShell.test.ts
npx tsx tests/yo/yopratiqoAppLikeLanding.test.ts
npx tsx tests/yo/yopratiqoCountryCourseAppHome.test.ts
npx tsx tests/yo/yopratiqoInformationArchitecture.test.ts
npx tsx tests/yo/yopratiqoLandingPages.test.ts

# Deck + companion (untouched but should still pass)
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
> async server components and walking the returned React
> element tree with a zero-dependency recursive walker
> (`isElement` / `walk` / `findByType`). This catches the
> structural intent (no `<YoAppShellScroller>` and no
> `<YoScreenPager>` in the mobile sub-tree, distinct mobile vs
> desktop sub-trees, declared steps + rails, comma-free
> `grid-cols-[…]` track lists) that pure class-name greps
> missed.
