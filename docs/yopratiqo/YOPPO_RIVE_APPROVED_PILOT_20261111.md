# Yoppo approved reference: pilot resumption

Date: 2026-11-11. Isolated worktree: `yoppo-rive-pilot`.

**Current status: RIVE/MEASUREMENT BLOCK.**
**VISUAL REVIEW PENDING HUMAN REVIEW.** No draft PR is eligible yet.

The user's A/B/C approval resolves the previous reference-segmentation blocker.
It does not approve a vector reconstruction or permit a runtime replacement.
The reports dated November 10 and the earlier November 11 report in
`rive/yoppo-master/evidence/` describe historical, pre-approval states.

## Delivery and freeze

- Authorized branch: `feat/yoppo-rive-pilot-20261110` only.
- Original starting head: `f5e38c21c290ea8612a524edb56e404f5944e050`.
- Head on resumption: `c9e7dd0628f2474abf8a309f31581fdd3e73e47e`.
- Code/evidence head submitted to final CI: `20ca639be2c5f3a84d5148cd714b6d2bfda2ef79`.
- Current freeze commit: `2719e4ffdf44ac1659beb468cbd4d7cd588f27b9`.
- Current manifest SHA-256: `b73900bf495877b829a5229655aa31031d602d4801cc49ac0b232f8751b73a1b`.
- Freeze integrity passes locally. From freeze to candidate, only the manifest changed.
- Original PNG SHA-256: `fb1335d7e170674e6e265c660b641e6f8d2b5a6b9d916d4b2ba9307a41f18070`.
- Master RML SHA-256: `850881e042e428bda6eb9cce68410d80bd910ec1db92b16492f5f7bc2d51952c`.
- Both PNG and RML match their original starting-commit blobs exactly.

## Integrated reference

The immutable proposal is bound to the user's separate approval record by
SHA-256. Approved ownership masks constrain canonical PNG classification only.
Actual Rive measurements scan the whole canvas using independent named-shape
ownership labels, never a canonical bounding box that could hide displacement.

Canonical result: **14/14 mechanically valid regions, no unresolved ROI edge**.
The downloaded Linux CI artifact has exactly the same fourteen region objects
and ownership-mask hashes as the local Windows measurement (deep equality).
Two deterministic expansions: head left/bottom by 12 px once; chest emblem
left by 12 px once. The three-attempt limit, minimum pixels, original color
classifiers, transform and all fourteen tolerances are unchanged.

Reference evidence:

- `.qa-guided/yoppo-pilot/approved-reference/geometry.json`
- `.qa-guided/yoppo-pilot/approved-reference/annotated.png`
- `.qa-guided/yoppo-pilot/reference-review/index.html`
- `rive/yoppo-master/evidence/reference-segmentation-approval.json`

The approved domains are not a claim that hidden anatomy was measured.

## Real-render blocker and invalidation

The first actual master capture on Windows, Rive CLI **1.9.2**, is opaque:
every pixel has alpha 255; the corner is RGBA `(29,29,29,255)`. The entire
1024 x 1024 canvas is therefore included by the silhouette test. This violates
the pre-existing transparent-canvas requirement. Removing a background color
or reconstructing alpha afterward would not be a genuine transparent capture.

A separate 64 x 64 project with an explicit zero-alpha artboard fill and
`artboard.background: "#00000000"` reproduces the same opaque capture. Rive's
local help and documentation expose no working transparent capture option.
This is a demonstrated limitation of the tested Windows path, not a claim
that every possible Rive renderer lacks transparency.

Cycle 1 was explicitly invalidated. No geometry was adjusted from its metrics.
The two captures (master plus diagnostic ownership pass) remain in the
15-capture budget. Cycle 2 was superseded before any new master capture.
Cycle 3 adds a real transparency preflight before further full captures and
an independent rejection inside the comparator. An empty image also fails.

A second defect was found in the diagnostic color IDs: an anti-aliased blend
of the old head/ear colors could impersonate the left-eye label. This was
reproduced mathematically, not corrected by cropping away the offending area.
The replacement diagnostic palette passes 53,340 pairwise blends and an
encoded-space separating-plane check. Real Yoppo colors and decoding tolerance
remain unchanged. Both defects and their freeze history are retained.

## Invalid first-render numbers: diagnosis only

These are **NOT accepted measurements or engineering passes**. They are kept
only to explain the rejected cycle. Raw data is in `iterations.jsonl`.

Global outputs: IoU 0.2981; centroid 55.90 px; ground 101 px; RGB MAE 56.58.
All four are invalidated by the opaque-capture defect, including the numerical
MAE that fell below its threshold. The fixed limits remain .80 / 24 / 12 / 65.

| Component | Centroid px | Width error | Height error | Cycle-1 outcome |
| --- | ---: | ---: | ---: | --- |
| Head cream | 16.86 | .0704 | .0598 | INVALID, numerical FAIL |
| Spikes | 88.42 | .0333 | .0000 | INVALID, numerical FAIL |
| Left ear | 41.68 | .2366 | .1585 | INVALID, numerical FAIL |
| Right ear | 57.87 | .0091 | .1303 | INVALID, numerical FAIL |
| Left eye | 23.98 | .4475 | .6815 | INVALID, numerical FAIL |
| Right eye | 34.27 | .0003 | .1897 | INVALID, numerical FAIL |
| Torso | 31.66 | .0503 | .3142 | INVALID, numerical FAIL |
| Left arm | 24.99 | .1408 | .1513 | INVALID, numerical FAIL |
| Right arm | 16.35 | .0655 | .1673 | INVALID, numerical FAIL |
| Left foot | 32.49 | .0753 | .0829 | INVALID, numerical FAIL |
| Right foot | 35.25 | .3573 | .0521 | INVALID, numerical FAIL |
| Backpack | 14.06 | .0143 | .0015 | INVALID, numerical FAIL |
| Mouth | 17.43 | .5567 | .5864 | INVALID, numerical FAIL |
| Chest emblem | 53.46 | .2063 | .3196 | INVALID, numerical FAIL |

No retained or reverted geometry iteration: one unchanged baseline only.
Local diagnostic evidence is preserved, not promoted:
`.qa-guided/yoppo-pilot/renders/local-01/` contains actual PNGs, labels,
overlay, 100/50/25-percent side-by-side images, canonical annotation,
inspect JSON, source snapshot, command log, provenance and metrics.

## Toolchain and local commands

Node **22.23.4**; sharp **0.34.5**; Windows; Rive CLI **1.9.2**. The CLI does
not report a separate renderer version. Full sharp dependency versions are in
the manifest. No latest-version substitution, paid API or external generation.

Image policy remains sRGB, straight alpha, Lanczos3, source scale 1.86 and
translation (47,78). RGB MAE uses only both-alpha >=180 pixels; no background
compositing before metrics. Visual comparisons alone use the same `#F4F0E8`.

Commands use the pinned local Node/Rive executables under
`.qa-guided/yoppo-pilot/tools/`; `node` below abbreviates that exact Node.

| Command | Actual local result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node node_modules/eslint/bin/eslint.js lib/companion/yoppoRigContract.ts 'scripts/*yoppo*.mjs' 'scripts/*yoppo*.ts' 'tests/companion/yoppo*.mjs' 'tests/companion/yoppo*.ts'` | PASS |
| `node --import tsx tests/companion/yoppoRigContract.test.ts` | PASS |
| `node tests/companion/yoppoGeometryDiagnostics.test.mjs` | PASS |
| `node --import tsx tests/companion/yoppoApprovedReference.test.ts` | PASS |
| `node tests/companion/yoppoIterationPolicy.test.mjs` | PASS |
| `node --import tsx tests/companion/yoppoCaptureAlpha.test.ts` | PASS |
| `node tests/companion/yoppoLabelPalette.test.mjs` | PASS, 53,340 pairwise blends |
| `node scripts/audit-yoppo-master.mjs` | PASS |
| `node scripts/measure-yoppo-geometry.mjs .qa-guided/yoppo-pilot/approved-reference/geometry.json .qa-guided/yoppo-pilot/approved-reference/annotated.png` | PASS, 14/14 |
| `rive rive/yoppo-master --verify` | PASS, zero errors/warnings |
| `node scripts/render-yoppo-pilot.mjs local-01 baseline` | FAIL; entire cycle subsequently invalidated |
| `node scripts/render-yoppo-pilot.mjs cycle3-local-01 baseline` | FAIL at actual transparency preflight, before any full-master capture; counter remains 2 |
| `node --import tsx scripts/check-yoppo-capture.ts .qa-guided/yoppo-pilot/transparency-probe/explicit-alpha.png .qa-guided/yoppo-pilot/transparency-probe/alpha-report.json` | FAIL, actual opaque Rive capture |
| `node scripts/check-yoppo-freeze.mjs` | PASS for current freeze |
| `git diff --check` | PASS |

The Python XML conversion verified preservation of all 50 shapes' geometry,
clipping and order. The original one-eye tooling capture succeeded locally;
it is not counted or presented as a complete neutral-master validation.

## GitHub Actions

1. [43057083061](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43057083061),
   code head `f8c1c063ee79935ece1f62c9714b004a0e7465b4`: runner allocated,
   TypeScript, all then-existing pilot tests, lint, source audit, 14-region
   measurement and freeze check passed. The graphics-library installation
   stalled with `Temporary failure resolving 'azure.archive.ubuntu.com'`.
   Stopped deliberately after roughly seven minutes; conclusion CANCELLED.
   No billing/no-runner block. No Linux master capture occurred.
2. [43058618935](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43058618935),
   exact code head `20ca639be2c5f3a84d5148cd714b6d2bfda2ef79`: final corrected
   workflow actually executed, **FAILURE**. TypeScript, all six pilot test
   steps, lint, diff integrity, PNG audit, canonical measurement and freeze
   integrity passed. The graphics-library installation then failed with
   `Temporary failure resolving 'archive.ubuntu.com'`, stopped by the 120-second
   deadline (exit 124). Job `130654756642` used runner `1000004127`; this was not an
   unallocated-runner or billing failure. Rive installation, the Linux
   transparency probe and full-master render were **not executed**.

No new master renders were consumed in either CI run. The missing eye-artifact
error is a consequence of skipping rendering, not a separate geometry failure.
No repeated retry follows this final infrastructure failure.

Actual final-run artifacts (seven-day retention):

- [Canonical measurement](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43058618935/artifacts/13871952944),
  214,407 bytes; JSON and annotated PNG, also downloaded into
  `.qa-guided/yoppo-pilot/ci-43058618935/canonical/`.
- [Freeze and historical counters](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43058618935/artifacts/13871614839),
  5,883 bytes. Despite its workflow name `yoppo-neutral-master-v1`, this contains
  manifests/logs, **not a successful CI render**.

The correction uses Ubuntu's primary signed mirror rather than the broken
runner mirror list, with explicit time bounds. No workflow permission,
repository secret, package-signature requirement or visual gate was weakened.
No full-master capture is allowed until the actual transparency probe passes.

## Hidden geometry and scope

Unmeasured: limb ends behind torso, torso behind backpack, head behind spikes,
ear bases behind head, eye whites behind lids, straps behind arms. Future
validation needs rotation, overlap-exposure and joint-seam checks.

Changed files are limited to pilot scripts/tests, rig measurement metadata,
pilot workflow and line-ending rules, reference/freeze/report evidence and the
tiny transparency probe. No application integration or animation work. Existing
PNG remains runtime fallback. Other worktrees, main, payments, learning,
progress, Supabase and production remain untouched.

No draft PR is opened because genuine transparent rendering and the exact-head
CI gate have not passed. No spending, subscription, merge or production deployment.

This report may be committed after the tested code head as a documentation-only
commit. That does not turn the failed CI into a passing exact-head result.

Recommended next decision: do not approve the reconstruction or begin animation
work. Resolve a genuinely transparent capture with the pinned toolchain first;
any alternative renderer/version must be reviewed and re-frozen explicitly,
without loosening thresholds or erasing the existing capture budget.
