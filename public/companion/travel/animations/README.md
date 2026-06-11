# Companion Animation Sources — `travel`

This folder holds **source-material animations** for the YoPratiqo travel
companion. They are **not shipped as-is** to production.

The production renderer (`components/companion/CompanionAvatar.tsx`) still
reads only the transparent PNGs registered in `SHIPPED_ASSETS` inside
`lib/companion/companionVisuals.ts`. These MP4s exist so the design + RN
team has a stable, version-controlled reference when the asset plan's
"Future path" (Rive / Lottie, see
[`docs/COMPANION_BRIDGE_ASSET_PLAN.md`](../../../../docs/COMPANION_BRIDGE_ASSET_PLAN.md#animation-path))
is wired up.

## Files

| Source file                                       | Maps to state    | Prompt intent                                |
| ------------------------------------------------- | ---------------- | -------------------------------------------- |
| `companion-travel-badge-unlocked.source.mp4`      | `badge_unlocked` | Jump and rejoice with a medal                |
| `companion-travel-level-up.source.mp4`            | `level_up`       | Swirl and make a powerful move               |
| `companion-travel-inactive.source.mp4`            | `inactive`       | Fire extinguished, getting bored             |

Provenance: Adobe Firefly text-to-video, June 2026. Hand-curated by the
product owner; no learner data was used in generation.

## Why we DO NOT ship the raw MP4

- **No transparency** — Firefly MP4s have an opaque background, but
  `CompanionAvatar` renders inside a circular shell with a gradient
  highlight. Dropping a rectangular opaque video inside that shell would
  visually break the design system.
- **Autoplay on mobile** — autoplaying video on every page that mounts a
  companion would cost bandwidth, drain battery, and hit data caps for
  users in the Dominican Republic / LATAM target market.
- **Not React Native–portable** — the manifest contract in
  `lib/companion/companionVisuals.ts` is shared with a future React
  Native YoPratiqo app. The supported formats are `png | webp | lottie |
  rive`. MP4 is intentionally excluded.
- **Asset plan compliance** — the asset plan explicitly requires
  transparent PNG today and Rive/Lottie tomorrow. Raw MP4 satisfies
  neither.

## Conversion plan

When the Lottie/Rive path lands:

1. Re-author each animation as a vector source (Rive or After Effects →
   Lottie) using the **same character, scale, lighting, and palette** as
   the existing PNG sibling (`../companion-travel-<state>.png`).
2. Export to `public/companion/travel/companion-travel-<state>.lottie`
   (or `.riv`) with a transparent background and a square 1024 canvas.
3. Add the new filename to `SHIPPED_ASSETS` in
   `lib/companion/companionVisuals.ts` and update the `format` field for
   that state from `"png"` to `"lottie"` / `"rive"`.
4. The renderer already handles the format switch — no UI changes
   required at call sites.
5. Once the Lottie/Rive variant is shipped and verified on web + RN,
   these MP4 sources can be removed from the repo (they live in git
   history if needed for re-authoring).

## Production contract

Until then, the production-shipped companion for these three states
remains the transparent PNG sibling in `../`:

- `../companion-travel-badge-unlocked.png`
- `../companion-travel-level-up.png`
- `../companion-travel-inactive.png`

`tests/companion/companionAnimationSources.test.ts` locks this contract
so a future agent cannot accidentally promote an MP4 into
`SHIPPED_ASSETS`.
