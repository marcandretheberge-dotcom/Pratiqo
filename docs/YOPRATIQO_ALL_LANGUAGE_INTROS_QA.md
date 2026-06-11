# YoPratiqo — All Language Intros + Catalog Manual QA Checklist

Branch: `feat/yopratiqo-all-language-intros-app-shell`

This checklist is the human counterpart to the automated suites:

- `tests/yo/yopratiqoAllLanguageIntrosConsistency.test.ts` (15 assertions)
- `tests/yo/yopratiqoLanguageCatalogAppShell.test.ts` (12 assertions)
- `tests/yo/yopratiqo<Language>Intro.test.ts` (per-language regression)
- `tests/yo/yopratiqoFullDominicanPathDeck.test.ts` (RD path lock)

Run it on a real device (one mobile, one desktop) before merging. Open the
DevTools console — there should be **no** warnings about scroll-locked
viewports, missing audio assets, or hydration mismatches.

> Restricted systems must remain untouched: Stripe, payments, tax, Supabase
> RLS, migrations, legal pages, Membre Pro commission logic, OpenAI scripts,
> MP3s, sitemap/indexation/Course schema, paid YoPratiqo checkout, AI
> summaries, raw quiz answers, progress snapshot API, booking-level consent,
> YoStudentCompanionCard, TeacherLearningInsightCard, Dominican Republic
> Course Home + Intro + Modules 2–5.

---

## 1. `/yo/langues` (catalog)

### Mobile (≤ `sm`)

- [ ] App-style sticky header is present (back arrow + YoPratiqo title +
      language toggle). No breadcrumb chain at the top.
- [ ] Back arrow returns to `/yo` (preserves `?lang=en` if present).
- [ ] Title says **YoPratiqo**, never just "Yo".
- [ ] Five tiles render in a single column (Spanish, Quebec French, Italian,
      English, Japanese).
- [ ] Every tile shows a real `<YoLanguageBadge>` flag (no `?` placeholder,
      no two-letter fallback like "ES" / "JP").
- [ ] Every tile shows the **Disponible / Available** chip — none stuck on
      "À venir / Coming".
- [ ] CTA copy is honest: "Ouvrir l’intro gratuite" / "Open the free intro".
- [ ] Tap target is comfortable (≥ 44 px high) on each tile.
- [ ] No scroll lock — body scroll works normally (the page is a catalog,
      not a deck).

### Desktop (≥ `lg`)

- [ ] Layout splits into a **sticky left rail** (product promise + companion)
      and a **right tile grid** (2 columns).
- [ ] Left rail stays pinned (`lg:sticky lg:top-24`) while the tile grid
      scrolls.
- [ ] Companion avatar appears beside the rail copy (state `map`).
- [ ] Tiles never stretch full-width — the grid keeps cards readable.
- [ ] No "giant empty hero" or stretched mobile feel.

### Indexation / metadata

- [ ] Catalog metadata still resolves via `buildYoPratiqoMetadata("languageHub")`.
- [ ] No new `noindex` / `Course` schema regression vs main.

---

## 2. Spanish — global intro (`/yo/langues/espagnol/intro`)

- [ ] App-style deck header (back arrow → `/yo/langues`, YoPratiqo title,
      language toggle).
- [ ] No `YoBreadcrumb` chain at the top.
- [ ] Five+ screens render through `YoLessonDeck`:
  - welcome / map
  - flashcards (`YoFlashcardPreview`)
  - quiz (`YoQuizPreview`)
  - reading (`YoReadingPreview`)
  - destinations picker (with Dominican Republic CTA)
  - coach panel (`YoCoachPanel`) + teacher / catalog CTAs
- [ ] Audio playback via `<YoSpanishAudioButton>` works on at least one card.
- [ ] Companion stays visible on every screen (`map` → `confused` → `celebrating`).
- [ ] Swipe / tap / Back / Next navigation works (no body scroll inside the deck).
- [ ] Final CTAs:
  - "Continuer en République dominicaine" → `/yo/langues/espagnol/pays/republique-dominicaine`
  - "Trouver un prof d’espagnol" → `/trouver-un-prof?subject=espagnol`
  - "Retour aux langues" → `/yo/langues`
- [ ] No paid-unlock copy, no Stripe button, no "premium" sales pitch.

## 3. Spanish — Dominican Republic path (UNTOUCHED regression)

- [ ] `/yo/langues/espagnol/pays/republique-dominicaine` (Course Home) still
      lists Modules 1–5 with the existing premium tiles.
- [ ] `/intro` deck opens, swipes through every screen, final CTA still
      routes to Module 2.
- [ ] Modules 2 → 3 → 4 → 5 still render through `YoLessonDeck`.
- [ ] Module 4 printables copy unchanged (tests:
      `yopratiqoDominicanModule4PrintablesCopy.test.ts`).
- [ ] Module 5 premium gating unchanged.

## 4. Quebec French — intro (`/yo/langues/francais-quebec/intro`)

- [ ] App-style deck header. No breadcrumb chain.
- [ ] Locale is **English by default** for this intro (international /
      pre-arrival positioning). FR toggle still works.
- [ ] Screens (in order):
  - welcome
  - cultural / pre-arrival context
  - flashcards
  - quiz
  - Quebec-vs-France comparison table
  - upcoming module card (`YoUpcomingModuleCard`)
  - teacher CTA
- [ ] Audio plays through `<YoFrenchAudioButton>` on the relevant card.
- [ ] Swipe / tap navigation works. No body scroll inside the deck.
- [ ] Final CTAs:
  - "Find a French teacher" → `/trouver-un-prof?subject=francais`
  - "Back to languages" → `/yo/langues`
- [ ] Companion present on every screen.

## 5. Italian — intro (`/yo/langues/italien/intro`)

- [ ] App-style deck header. No breadcrumb chain.
- [ ] Screens render survival phrases, audio (`<YoItalianAudioButton>`),
      `YoFlashcardPreview`, `YoQuizPreview`, cultural / travel context, and
      a final teacher CTA.
- [ ] Companion present on every screen.
- [ ] Final CTAs:
  - "Trouver un prof d’italien" → `/trouver-un-prof?subject=italien`
  - "Retour aux langues" → `/yo/langues`

## 6. Japanese — intro (`/yo/langues/japonais/intro`)

- [ ] App-style deck header. No breadcrumb chain.
- [ ] Screens cover survival phrases, the `JapaneseAudioChipList`,
      `YoFlashcardPreview`, `YoQuizPreview`, hiragana / katakana / kanji
      context, and the final teacher CTA.
- [ ] Audio playback through `<YoJapaneseAudioButton>` works.
- [ ] Companion present on every screen.
- [ ] Final CTAs:
  - "Trouver un prof de japonais" → `/trouver-un-prof?subject=japonais`
  - "Retour aux langues" → `/yo/langues`

## 7. English — intro (`/yo/langues/anglais/intro`)

- [ ] App-style deck header. No breadcrumb chain.
- [ ] Screens render through `YoLessonDeck` with `YoEnglishAudioButton`,
      `YoFlashcardPreview`, `YoQuizPreview`, and a final teacher CTA.
- [ ] Catalog tile (`/yo/langues`) still claims `status: "available"` →
      route resolves with no 404.
- [ ] Companion present on every screen.
- [ ] Final CTAs:
  - "Trouver un prof d’anglais" → `/trouver-un-prof?subject=anglais`
  - "Retour aux langues" → `/yo/langues`

---

## 8. Cross-cutting checks

- [ ] No intro deck triggers a body scroll (only the per-screen content
      surface scrolls when overflowing).
- [ ] Swipe (mobile) AND keyboard arrow navigation (desktop) both work on
      every intro.
- [ ] Audio buttons resolve to the existing MP3 manifest — no 404 on the
      network panel.
- [ ] No new `YoQuizPreview` payload exposes a raw correct-answer flag.
- [ ] No new component imports `stripe`, `@supabase/supabase-js`, Membre Pro
      logic, or any `service_role` key.
- [ ] No new migration shipped; no legal page touched; no MP3 added or
      removed.
- [ ] `npm run validate:launch` and `npm run test:launch-critical` pass.
- [ ] `npx tsx scripts/validate_i18n.ts` reports zero missing keys.
- [ ] `npm run build` succeeds.

---

## 9. Sign-off

| Date | QA-er | Mobile device | Desktop browser | Result |
|------|-------|----------------|------------------|--------|
|      |       |                |                  |        |
