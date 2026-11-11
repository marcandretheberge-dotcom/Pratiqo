# Approved reference integration, before the first master render

The user's A/B/C approval is recorded separately from the immutable proposal.
It approves the reference ownership domains, not a rendered reconstruction.
The canonical PNG and the fourteen tolerances are unchanged.

## Measurement

- Canonical pixels must satisfy both the original color/alpha classifier and
  the approved part mask. Child eyes/mouth remain part of the head; the emblem
  remains part of the torso where the original classifier includes it.
- The original ROI rules remain unchanged: expand only touched sides by 12 px,
  at most three times. No manual geometry measurements are entered.
- Rendered parts are identified by a separate Rive color-ID render generated
  from the named shapes. XML geometry, ordering and clipping are unchanged.
- Original rendered color/alpha pixels are classified across the entire canvas
  using those ownership IDs. No reference bounding box or mask clips the render.
  Displaced or oversized components therefore cannot disappear from measurement.
- Ambiguous anti-aliased ownership pixels are counted in the diagnostics.
- Hidden geometry remains unmeasured; future seam/rotation tests are required.

## Reproducibility and budget

Freeze all measurement dependencies before any full master rendering. Record
their committed byte hashes, Node 22.23.4, Rive 1.9.2 and sharp's exact versions.
The approved proposal retains its original CRLF bytes; code uses pinned LF.

Conservatively count BOTH the ordinary master and the diagnostic full-canvas
render toward the user's 15-capture ceiling. A failed capture also counts.
Reserve two captures for exact-head CI. Never reset the counter on retry.
One category per geometry iteration; retain only under the original strict
keep/revert rules, tested independently before the freeze.

No production runtime integration, paid API, deployment or merge is part of
this work. The production PNG remains untouched.

All rendered evidence: **VISUAL REVIEW PENDING HUMAN REVIEW**.

## Capture correction, cycle 2

Cycle 1 was explicitly invalidated: Rive 1.9.2 on Windows emits an opaque
capture background, which is not the required transparent canvas. See
`CYCLE_1_INVALIDATED.md`. No geometry changes or threshold adjustments were
made from those invalid metrics. A new 64 x 64 transparency preflight stops
both local and CI master rendering before consuming further full-canvas
captures. The comparator also rejects opaque/empty captures independently.
The preflight must pass using actual Rive output, not an edited PNG. The
original two full-canvas captures remain counted toward the total budget.

## Diagnostic palette correction, cycle 3

Cycle 2 produced no new master capture. A mathematical color-ID collision
from cycle 1 was reproduced and removed before further rendering. The new
diagnostic palette passes 53,340 pairwise edge mixtures (encoded sRGB and
linear-light), plus a separating-plane check against arbitrary combinations
of other IDs in encoded space. The decoding tolerance remains 2 per channel.
No real Yoppo color changed. The CI runner now uses the primary signed Ubuntu
repository instead of its repeatedly unreachable Azure mirror; permission
settings, package signature verification and comparison thresholds are intact.
