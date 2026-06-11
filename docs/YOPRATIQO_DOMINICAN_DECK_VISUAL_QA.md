# YoPratiqo Dominican deck — visual QA checklist

Manual QA checklist for the YoPratiqo Dominican Republic deck
experience (Intro + Modules 2 / 3 / 4 / 5). Use this whenever
you touch the shared deck shell
(`components/yo/YoLessonDeck*`,
`components/yo/YoLessonCompanionCoach.tsx`,
`lib/yo/lessonDeckVisualContract.ts`) or any of the five deck
content composers
(`components/yo/DominicanRepublic{Intro,Module2,Module3,Module4,Module5}Content.tsx`).

The automated static contract test
`tests/yo/yopratiqoDeckVisualConsistency.test.ts` covers the
hard invariants (shared visual contract, deck mount,
companion-state whitelist, module-label rhythm, back-arrow
target, no breadcrumb, no Stripe, no raw quiz fields, etc.).
The checklist below covers the things only a human can verify:
layout feel, gesture safety, copy tightness.

---

## Routes to walk

Each pass should walk the full app-like path in order:

1. `/yo/langues/espagnol/pays/republique-dominicaine` — Course Home
2. `/yo/langues/espagnol/pays/republique-dominicaine/intro` — Intro deck (8 screens)
3. `/yo/langues/espagnol/pays/republique-dominicaine/module-2` — Module 2 deck (11 screens)
4. `/yo/langues/espagnol/pays/republique-dominicaine/module-3` — Module 3 deck (12 screens)
5. `/yo/langues/espagnol/pays/republique-dominicaine/module-4` — Module 4 deck (12 screens)
6. `/yo/langues/espagnol/pays/republique-dominicaine/module-5` — Module 5 deck (12 screens)

Test the FR locale by default, then sanity-check at least one
deck in EN (`?lang=en`) and one in ES (`?lang=es`).

---

## Devices / viewports

- [ ] Mobile portrait, 390 × 844 (iPhone 14 baseline).
- [ ] Mobile portrait, 360 × 800 (small Android baseline).
- [ ] Mobile landscape on a phone (Intro + Module 5 only — these
      are the most likely to be opened sideways).
- [ ] iPhone with a home-indicator bar (test the bottom nav
      sits above the indicator, not behind it).
- [ ] iPhone with a notch (test the deck header sits below the
      notch, not behind it).
- [ ] Desktop, 1280 × 800 (deck should center as a single
      640 px column, with cream gradient around it).

---

## Deck shell consistency

- [ ] Header is the same height + background on all five decks.
- [ ] Header back-arrow always returns to the country Course Home
      (NOT `/yo`, NOT the language landing, NOT a five-level
      breadcrumb root).
- [ ] Module label in the header matches the canonical rhythm:
      `Intro · RD A1`, `Module 2 · RD A1`, `Module 3 · RD A1`,
      `Module 4 · RD A1`, `Module 5 · RD A2` (FR + ES use
      `RD`, EN uses `DR`, ES uses `Módulo`).
- [ ] Progress strip dot count matches the number of screens
      in each deck (Intro = 8, Module 2 = 11, Module 3 = 12,
      Module 4 = 12, Module 5 = 12).
- [ ] Bottom nav `Back` / `Next` (or `Finish` on the last
      screen) renders identically on all five decks; both
      buttons sit at the same vertical position.
- [ ] Inner content column (header / progress strip / stage /
      nav) all line up at the same `640 px` width — no
      column drift, no "narrow nav under wide content" feel.

---

## No primary scroll

- [ ] Each deck route fills the viewport exactly — the page
      itself never scrolls (try a vertical drag starting on
      the stage card — only the card content should scroll,
      not the document).
- [ ] On a tall screen (e.g. Module 5's "Final mission" screen
      or Intro's "Culture snapshot"), the per-card scroll
      fallback kicks in inside the screen card only, never on
      the document body.
- [ ] Pinch-zoom: zooming in on a card does not produce a
      document-level scrollbar.

---

## Swipe + tap gestures

- [ ] Right-to-left swipe on the stage advances to the next
      screen (≥ 56 px horizontal movement required).
- [ ] Left-to-right swipe goes back.
- [ ] Vertical drags inside the stage scroll the per-card
      content; they never trigger Back / Next.
- [ ] Tap on the left ~30 % of the stage goes back.
- [ ] Tap on the right ~30 % of the stage goes forward.
- [ ] Tap on the middle ~40 % of the stage does nothing
      (dead-center zone).
- [ ] Tap / swipe started on an audio button (`<YoSpeechButton>`)
      never advances the deck.
- [ ] Tap / swipe started on a flashcard carousel arrow never
      advances the deck.
- [ ] Tap / swipe started on a `<details>` quiz reveal never
      advances the deck.
- [ ] Tap / swipe started on the `<YoMarkModuleCompletedButton>`
      never advances the deck.
- [ ] ArrowLeft / ArrowRight on a desktop keyboard navigate
      Back / Next; typing in a future input box doesn't.

---

## Companion presence

- [ ] Companion avatar visible on every screen (small `sm`
      size, right-of-title on desktop, stacked below the
      title with the helper bubble on mobile).
- [ ] Helper text bubble is short — one sentence, never
      multi-paragraph.
- [ ] Companion state matches the screen kind:
  - `map` — exploration / culture / dictionary / introduction.
  - `confused` — practice / quiz / mini-mission.
  - `celebrating` — Intro final screen.
  - `teacher_ready` — Module 5 final-mission capstone (real
    teacher-bridge surface).
  - `badge_unlocked` — Module 5 completion screen.
- [ ] No "fake AI tutor" / "fake personalized feedback" /
      "fake teacher report" copy ever appears.

---

## Final-screen feel

- [ ] Intro final screen (`ready`) feels rewarding:
      celebrating companion, warm-yellow stamp card, primary
      CTA to Module 2, secondary CTA back to the Course Home.
- [ ] Module 2 / 3 / 4 final screens feel like the end of a
      stage: warm-yellow completion stamp + audited
      `<YoMarkModuleCompletedButton>` + clear primary CTA
      to the next module.
- [ ] Module 5 completion screen feels like the **end of the
      path**: badge-unlocked companion, "Final mission
      complete" copy, primary CTA to the teacher-search
      bridge, secondary CTA back to the Course Home.

---

## Audio + interactive widgets

- [ ] Browser-speech audio plays inline on every flashcard
      carousel (Intro + Modules 2 / 3 / 4 / 5). No MP3
      pre-recording is loaded — the audio button
      pronounces via `speechSynthesis`.
- [ ] Quiz `<details>` reveals open / close correctly without
      hijacking deck navigation.
- [ ] Capstone game in Module 5 (`<DominicanRepublicCapstoneGame>`)
      plays correctly; the deck doesn't intercept its
      internal pointer events.
- [ ] Self-assessment checkboxes in Module 5 toggle correctly.
- [ ] Printables button in Modules 3 / 4 / 5 opens the
      printables sheet without interfering with the deck nav.
- [ ] `<YoMarkModuleCompletedButton>` is clickable, saves
      progress (when logged in), and never advances the deck.

---

## Internationalization

- [ ] FR is the default and reads naturally on every screen.
- [ ] EN sanity-check on Intro + Module 5 — labels translate,
      module label says `DR` not `RD`.
- [ ] ES sanity-check on Intro + Module 2 — labels translate,
      module label says `Módulo X · RD AY`.
- [ ] No EN / ES gloss leaks into the FR view, no FR copy
      leaks into the EN / ES view.

---

## Accessibility

- [ ] Each screen card is reachable by `Tab` keyboard nav.
- [ ] Bottom nav buttons have visible focus rings.
- [ ] `aria-live="polite"` progress announcement reads "Step
      N of M" / "Étape N sur M" / "Paso N de M" on each
      navigation (verify in screen-reader mode).
- [ ] Companion avatar has `alt=""` (decorative — the helper
      bubble carries the readable text).
- [ ] `prefers-reduced-motion`: each navigation reset uses
      `scrollTo({ behavior: "auto" })` instead of `"smooth"`
      when the user has reduced motion enabled.

---

## Restrictions guard (manual smoke)

- [ ] Course Home `roadmap step 01` opens `/intro` — NOT the
      `#yo-intro-experience` in-page anchor.
- [ ] No deck route shows the legacy 5-level breadcrumb
      (`YoPratiqo › Langues › Espagnol › R.D. › Module N`).
- [ ] No paid checkout / Stripe / price-id is visible
      anywhere across the path.
- [ ] No "AI summary" / "auto-generated feedback" copy
      appears on any deck screen.

---

When all of the above passes, the deck consistency pass is
considered shipped from a visual perspective. The automated
tests below back this up:

- `tests/yo/yopratiqoDeckVisualConsistency.test.ts`
- `tests/yo/yopratiqoLessonDeckNoScrollSwipe.test.ts`
- `tests/yo/yopratiqoModuleLessonDeck.test.ts`
- `tests/yo/yopratiqoIntroLessonDeck.test.ts`
- `tests/yo/yopratiqoModule3LessonDeck.test.ts`
- `tests/yo/yopratiqoModule4LessonDeck.test.ts`
- `tests/yo/yopratiqoModule5LessonDeck.test.ts`
- `tests/yo/yopratiqoFullDominicanPathDeck.test.ts`
- `tests/yo/yopratiqoRdModuleProgressCompletion.test.ts`
- `tests/yo/yopratiqoProgressSnapshots.test.ts`
- `tests/companion/companionVisualSystem.test.ts`
