# Yoppo reference segmentation proposal

2026-11-11. Branch: `feat/yoppo-rive-pilot-20261110`.
Head remains `c9e7dd0628f2474abf8a309f31581fdd3e73e47e`.

**VISUAL REVIEW PENDING HUMAN REVIEW**

This is a human-review reference prepared from the original PNG, not an
approved segmentation, a measurement freeze or a Rive render. The previous
`RIVE/MEASUREMENT BLOCK` is still in effect. No gate has been weakened or made
green by the proposed envelopes.

## Deliverables

- `reference-segmentation-proposal.json`: 14 named review envelopes matching the
  existing component names, notes on visible ownership, and three proposed
  junctions. Coordinates were manually annotated from the canonical PNG only.
- `scripts/prepare-yoppo-reference-review.mjs`: produces a standalone offline
  review document, using the original PNG bytes in independent SVG annotation
  layers. It checks source and protected-file hashes before/after generation.
- `tests/companion/yoppoReferenceReview.test.mjs`: verifies metadata, browser
  rendering, the annotation toggle, no external page requests, and responsive
  layout. Accepts an existing Playwright module path and installed browser
  channel; no dependency installation is required.
- `.qa-guided/yoppo-pilot/reference-review/index.html`: offline review, with
  original/annotated comparison, 14 detail views and three enlarged junctions.
- Same local evidence folder: `reference-overview.png`,
  `reference-junctions.png`, `reference-parts.png`, `reference-mobile.png`,
  `canonical-original.png`, `integrity.json`, `browser-verification.json`.

The HTML includes the original PNG, not a generated replacement. Source and
embedded/copy PNG SHA-256:
`fb1335d7e170674e6e265c660b641e6f8d2b5a6b9d916d4b2ba9307a41f18070`.

Proposal SHA-256:
`ed98cbdd14a96ca6f8da4303e0239378755d1e6b761aa806d899d1d5304f6447`.

## What needs approval

1. **A: head/body.** Follow the visible lower face boundary; the cream-colored
   continuity is not proof of a separate neck or hidden head contour.
2. **B: legs/feet.** Proposed seams separate the visible foot supports from the
   lower body. They are not automatic color boundaries or measured anatomy.
3. **C: straps/backpack.** Keep visible straps as associated accessories, separate
   from the existing right-side backpack measurement. Do not silently expand
   that component to include straps elsewhere on the torso.
4. Confirm the 14 visible-part identities. Left/right means viewer-left/right.

The enlarged extracts use review-only SVG masks. Head and torso contain visible
child features (eyes, mouth, emblem). Adjacent arms, feet and straps can be
excluded in the extracts to clarify ownership. These manual envelopes are
approximate review outlines, not pixel-accurate measurement masks, new ROIs,
target centroids or a complete nonoverlapping animation-layer partition.
Small contour fringes in extracts are therefore not claimed as approved cutouts.

The original retains all pixels: nose, eyebrows, lateral points, buckles,
shadows and highlights. No hidden geometry is reconstructed or inpainted.

## Scope and integrity

Unchanged: canonical PNG, RML, rig contract, all thresholds, palette audit,
measurement/comparison scripts, workflow, source-to-artboard transform.
`git diff --name-only` is empty; new review/test files remain untracked.
No master render, freeze manifest, commit, push, PR, paid API, subscription,
deployment, production change or change to another worktree in this step.

Approving this reference would authorize further methodology work only; it
would not establish that geometry or visual acceptance gates pass. Any future
measurement integration must be explicit, tested and frozen before a first
full master render.

## Validation performed in this step

| Command/check | Result |
| --- | --- |
| `node scripts/prepare-yoppo-reference-review.mjs` | PASS: source bytes and protected files unchanged |
| `node tests/companion/yoppoReferenceReview.test.mjs <bundled-playwright-path> chrome` | PASS with existing Chrome, no downloaded browser |
| Browser annotation-toggle screenshot equality | PASS: original and hidden-annotation view are pixel-identical |
| Browser widths 320, 390, 768, 1440 px | PASS: no horizontal overflow; 14 parts available |
| Browser reduced-motion preference | PASS; document has no animation |
| External page requests / page errors | 0 / 0 |
| `node node_modules/eslint/bin/eslint.js scripts/prepare-yoppo-reference-review.mjs tests/companion/yoppoReferenceReview.test.mjs` | PASS |
| `node --import tsx tests/companion/yoppoRigContract.test.ts` | PASS |
| `node tests/companion/yoppoGeometryDiagnostics.test.mjs` | PASS: fail-closed diagnostic behavior, not a passing geometry measurement |
| `git diff --check` | PASS |

The first browser invocation found no bundled Chromium executable. It was not
downloaded; the installed Chrome browser was then used successfully with an
isolated temporary profile. No production/session browser was used.

No application build or remote CI rerun: no application or gate code changed.
The earlier exact-head CI failure remains documented in `PILOT_REVIEW_20261111.md`.
