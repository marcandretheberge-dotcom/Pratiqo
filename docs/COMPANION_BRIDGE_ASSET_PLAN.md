# Companion Bridge Asset Plan

## Purpose

This document defines the launch-safe asset plan for the YoPratiqo companion as it becomes part of the consent-based bridge between YoPratiqo learning and Pratiqo teacher lessons.

It is the single source of truth for design, engineering, and (later) the React Native team. The visual manifest in `lib/companion/companionVisuals.ts` and the renderer in `components/companion/CompanionAvatar.tsx` follow it exactly.

## Official Style Reference

The official style reference is the **YoPratiqo travel companion** as shown in the current YoPratiqo marketing image — a cute explorer / travel buddy with teal spikes, a backpack, and a friendly 2.5D feel.

It informs tone, proportions, palette, warmth, and brand fit.

**Hard rule — do not crop the production companion asset from a poster, ad, or flattened mockup.** The production app needs clean per-state exports created from the companion artwork itself, not slices of the marketing flat. Cropped exports keep poster lighting, background bleed, and inconsistent scale across states and are not acceptable for production.

## Required Asset States

Eight production states must be exported, in this exact order, because the visual manifest and the React Native asset bundle index them by name:

- `idle`
- `map`
- `confused`
- `celebrating`
- `teacher_ready`
- `level_up`
- `inactive`
- `badge_unlocked`

Each state is a different pose / mood of the same companion identity. Same character, same scale, same lighting, same lens. The visual identity id used everywhere is `travel`.

## File Naming

Stable, React Native-compatible filenames. Underscores in state ids become dashes in filenames so they play well with bundlers:

- `companion-travel-idle.png`
- `companion-travel-map.png`
- `companion-travel-confused.png`
- `companion-travel-celebrating.png`
- `companion-travel-teacher-ready.png`
- `companion-travel-level-up.png`
- `companion-travel-inactive.png`
- `companion-travel-badge-unlocked.png`

When future companion identities ship, replace `travel` with the new canonical id from `lib/companion/companionVisuals.ts`. Never change the state suffix — that is the contract with the renderer and with React Native.

Final web path: `public/companion/<visualId>/<filename>`.

## Export Requirements

Each PNG must be exported with all of the following characteristics:

- **One character per image** — no duo, no group, no shadow of a second pose.
- **Transparent background** — no scene, no halo, no gradient backdrop.
- **Square canvas** — target is 1024 × 1024 (future-proofs Rive/Lottie source, React Native @3x screens, marketing reuse). The current launch baseline is 500 × 500, which is the maximum size remove.bg's free tier returns when the source PNG was generated in ChatGPT and post-processed for transparency. The renderer always downscales to the actual avatar display size (40–128 px), so the launch baseline is visually indistinguishable from the future 1024 target. Re-exports at 1024 should drop in without code changes.
- **No text baked into the bitmap** — no captions, no speech bubbles.
- **No logo, no badge, no UI chrome baked in** — UI chrome is composed by the renderer.
- **Same scale, lighting, and style across all eight states** — the avatar must feel like the same character changing pose, not eight different sketches.
- **No private student information** in the artwork or in the filename.

## Launch Baseline (shipped)

The first production set lives at `public/companion/travel/companion-travel-<state>.png`. All eight states are registered in the `SHIPPED_ASSETS` allow-list inside `lib/companion/companionVisuals.ts`.

| State | Status | Notes |
| --- | --- | --- |
| `idle` | shipped | 500 × 500 RGBA |
| `map` | shipped | 500 × 500 RGBA |
| `confused` | shipped | 500 × 500 RGBA |
| `celebrating` | shipped | 500 × 500 RGBA |
| `teacher_ready` | shipped | 500 × 500 RGBA, default in `CompanionBridgeCard` |
| `level_up` | shipped | 500 × 500 RGBA |
| `inactive` | shipped | 500 × 500 RGBA, slightly different render style — flag for future consistency pass |
| `badge_unlocked` | shipped | 500 × 500 RGBA |

When a re-export at the 1024 target lands, swap the PNG in place (same filename) and bump `LAUNCH_ASSET_DIMENSION` in the manifest. No other code change is required.

## Accessibility

Every rendered companion image needs alt text from UI code, not baked into the image. `CompanionAvatar` already composes a localized alt per state in FR / EN / ES via the `companionVisualAltKey` table.

Recommended alt-text pattern (for reference; the renderer handles this):

- FR: `Compagnon YoPratiqo, état : prêt pour le professeur`
- EN: `YoPratiqo companion, state: teacher ready`
- ES: `Compañero YoPratiqo, estado: listo para el profesor`

Decorative repeats inside the same card may use empty alt text only when the same information is already available nearby in text.

## Animation Path

Launch path (this PR):

- transparent PNGs only
- CSS / React transitions for hover and state change
- no runtime dependency on heavy animation libraries
- if a PNG has not been exported yet, the renderer falls back to a universal emoji + `lucide-react` icon so production never ships a broken image

Future path:

- Rive or Lottie for subtle state transitions (idle breathing loop, map zoom, celebrating bounce)
- keep the PNG fallback for low-power mobile devices and React Native compatibility
- animation files must reuse the exact state ids from the asset plan so the renderer and the manifest can swap formats without UI changes

### Animation source material (not shipped)

Reference source material for three states (`badge_unlocked`, `level_up`, `inactive`) is checked in under `public/companion/travel/animations/`. These MP4s are **not registered in `SHIPPED_ASSETS`** and the renderer never reads them — they exist only so the design + React Native team has a stable, version-controlled reference when authoring the future Lottie / Rive variants. See `public/companion/travel/animations/README.md` for the per-file mapping, the conversion plan, and the "do not ship raw MP4" rationale. The contract is locked by `tests/companion/companionAnimationSources.test.ts`.

## React Native Compatibility

Assets must work in a future standalone React Native YoPratiqo app:

- portable filenames (lowercase, ASCII, dashes only)
- transparent background
- predictable square canvas (1024 × 1024)
- no web-only CSS assumptions
- no text embedded in images
- state ids aligned with the shared companion domain model in `lib/companion/companionVisuals.ts`
- the manifest is pure data (no DOM, no browser globals) so it can be imported directly from a React Native bundle and consumed by an RN renderer that mirrors `CompanionAvatar`

## Visual Manifest Contract

`lib/companion/companionVisuals.ts` exposes:

- `CompanionVisualId` (currently `"travel"`)
- `CompanionVisualState` (the eight states above)
- `CompanionVisualAsset` (per-state metadata: `id`, `state`, `src`, `alt`, `width`, `height`, `format`, `transparentBackground`, `reactNativeReady`, `fallbackEmoji`, `fallbackIcon`)
- `CompanionVisualManifest` (one entry per state)
- `getCompanionVisualAsset(visualId, state)` (always returns a usable record; `src` is `null` when no production export has shipped)
- `hasProductionCompanionAsset(visualId, state)` (true only when the file is registered in the shipped allow-list)

An asset is only considered shippable when it is added to the explicit `SHIPPED_ASSETS` allow-list in `companionVisuals.ts`. This is what makes the difference between "planned" and "live in production".

## Bridge Usage

The `teacher_ready` state is reserved for moments where the learner chooses to connect YoPratiqo progress to a real teacher.

It must never imply automatic sharing. The UI copy around the asset (see `CompanionBridgeCard`) makes consent explicit in FR / EN / ES:

- FR: « Ton compagnon apprend avec toi. Il aide à résumer tes progrès pour préparer un meilleur cours, seulement si tu consens au partage. »
- EN: "Your companion learns with you. It helps summarize your progress for a better lesson, only when you agree to share it."
- ES: «Tu compañero aprende contigo. Ayuda a resumir tu progreso para preparar una mejor clase, solo si aceptas compartirlo.»

The card must not imply AI tutoring, real-time guidance, or that the teacher sees raw quiz answers. It is a cosmetic + consent-context surface only.
