# Yoppo neutral-master pilot: pre-render measurement blocker

Review date: 2026-11-11, America/Toronto.

**RIVE/MEASUREMENT BLOCK**

**VISUAL REVIEW PENDING HUMAN REVIEW.** This is not an accepted master or a
completed pilot. The original PNG remains the production fallback.

## Branch and delivery

- Branch: `feat/yoppo-rive-pilot-20261110`.
- Isolated worktree: `yoppo-rive-pilot` under the existing Codex workspace.
- Expected and actual starting head: `f5e38c21c290ea8612a524edb56e404f5944e050`.
- Current pushed head: `c9e7dd0628f2474abf8a309f31581fdd3e73e47e`.
- Commits: `7230438d` preserves diagnostics, pins tooling and repairs the
  comparator; `bb8fb8b1` installs EGL before invoking the Linux CLI;
  `c9e7dd06` runs canonical preflight before any renderer installation.
- Freeze commit: **none**. Freeze manifest / SHA-256: **none**. A failed
  canonical measurement is not a methodology freeze.
- Full master renders: **0 / 15**. Retained / reverted render iterations: **0 / 0**.
- No RML geometry, pivots, transforms, acceptance thresholds or source PNG changes.
- No draft PR: the required canonical measurement and exact-head CI gates do not pass.
- No merge, runtime integration, production deployment command, secret access,
  paid API use, subscription, billing-setting change or production mutation.
- The other worktrees were not edited. The two existing infrastructure evidence
  files remain; the older report is explicitly marked historical.

## Infrastructure and CI evidence

The repository API now reports `PUBLIC`. The workflow uses the standard
`ubuntu-24.04` runner, not a paid larger runner. No billing budget was activated.

1. Historical run [42950575663](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42950575663)
   had no allocated runner and the billing/spending annotation. It was not retried.
2. New run [43045384284](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43045384284),
   head `7230438da3c012de76b029aa09a30189ff05ff67`, allocated runner
   `1000004094`. Checkout, Node setup and npm installation passed. The pinned
   tarball passed SHA-256 verification. Rive invocation failed because
   `libEGL.so.1` had not yet been installed. This was a workflow ordering error,
   not a payment, runner-allocation or Rive-download failure.
3. Run [43045627759](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43045627759),
   head `bb8fb8b131ce73db99af0c87d8fc70d1f8590543`, allocated runner
   `1000004097`. It failed installing Ubuntu libraries (exit 100):
   `Temporary failure resolving 'azure.archive.ubuntu.com'`. No billing block.
   TypeScript, tests, measurement and Rive were skipped. The upload step completed
   with a no-files warning: no artifact was created. This is an infrastructure
   failure, not evidence of a remote geometry test result.
4. Exact-head run [43046911220](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43046911220),
   head `c9e7dd0628f2474abf8a309f31581fdd3e73e47e`: **FAIL**, completed
   2026-11-11 15:18:43 UTC, runner `1000004116`, job `130613183800`.
   TypeScript, rig contract, diagnostic regressions, focused lint, diff integrity
   and canonical palette audit **PASS**. Canonical geometry **FAIL** (exit 1).
   All freeze/renderer steps were skipped as required. No billing annotation.
   Pre-render TypeScript/tests/lint and canonical audit now run before graphics
   installation. Every existing gate remains mandatory; this reordering avoids
   requiring renderer dependencies when the input measurement is already invalid.

The actual [canonical measurement artifact](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43046911220/artifacts/13866988515)
contains the JSON and annotated PNG (213,758-byte archive; expires 2026-11-18).
Archive SHA-256 reported by GitHub:
`4f0fbe2093b2b44427f39f615a0b8edf65df2155d2fe3565f87d3fd2f99bfa59`.
It was downloaded to `.qa-guided/yoppo-pilot/ci-43046911220/`.
Node `assert.deepEqual` confirms that all 14 region objects, failure reasons and
the transform are **identical** between Windows and Linux CI. Both are invalid;
reproducibility does not turn the measurement into a pass.

Remaining infrastructure limitation: renderer installation on Ubuntu has not
been proven after the DNS failure because the prerequisite measurement gate
correctly stops first. Actions also reports a non-blocking Node 20 deprecation
warning for action wrappers, forced by GitHub to Node 24; project commands still
use explicitly installed Node 22.23.4. No action permission was changed.

The GitHub commit-status API also reports a separate automatic `Vercel: failure`
context pointing to `upgradeToPro=build-rate-limit`. Public-repository Actions
does not remove Vercel's limits. No Vercel retry, plan change, paid operation,
promotion or deployment command was performed. This context is not counted as
a passing check or a deployed pilot.

No blind retries or workflow permission changes. `contents: read` is preserved.
Canonical JSON and the annotated PNG are uploaded even when the measurement
fails. Full rendering is additionally blocked without a freeze manifest.

## Toolchain and image policy

| Item | Evidence |
| --- | --- |
| Rive CLI | `rive 1.9.2`, official version-specific archive |
| Windows archive SHA-256 | `469aa097fc2a665b5271ffad3537e792c06bc5b635c8e89eb90205ec92ea25ca` |
| Linux archive SHA-256 | `e606530230ad8ddc4869d1ade4de10c5ffb3e74e44745339c227018e65eabb0b` |
| Separate renderer version | Not reported; no master render executed |
| Node | Local and CI pinned to `22.23.4` |
| sharp | Lockfile and installed dependency: `0.34.5` |
| Local OS | Windows x64 |
| CI OS | Ubuntu 24.04 standard GitHub runner |
| Canonical PNG SHA-256 | `fb1335d7e170674e6e265c660b641e6f8d2b5a6b9d916d4b2ba9307a41f18070` |
| Canonical source | 500 x 500 RGBA, visible bounds x=120..423, y=40..453 |
| Rive verification | PASS: 0 errors, 0 warnings, no rendering |
| Rive inspect | PASS: `problems: []`, 1024 x 1024 artboard |

The required sRGB color space and Lanczos3 reference scaling are explicit.
The source-to-artboard transform is unchanged: scale=1.86, x=47, y=78.
Component color masks now use the same alpha >=120 in canonical and render
classifiers. Global RGB MAE remains restricted to overlap with both alpha >=180.
The transparent 1024 canvas and the four global thresholds are unchanged.
The review overlay opacity fix affects a copied alpha buffer only, after metrics.
Neutral #F4F0E8 side-by-sides have not been produced because no render is allowed.

## Canonical measurement: actual failure

The original script failed at `headCream` after three expansions and discarded
all diagnostics. It now evaluates every region, writes the failure JSON and
annotated image, **and still exits 1**. Invalid data cannot enter the comparator.

Each expansion records its number, reason, touched sides and before/after ROI.
Only touched sides expand by 12 pixels, at most three times. Image-edge clamping
no longer accidentally expands an untouched opposite side. No ROI was shrunk,
repositioned or given hand-entered geometry. Initial ROIs/classifiers remain
unchanged apart from explicit color-space conversion.

| Region | Classified pixels (invalid) | Expansions | Remaining touched sides |
| --- | ---: | ---: | --- |
| headCream | 32771 | 3 | top, bottom |
| spikes | 13057 | 3 | bottom |
| earLeft | 7283 | 3 | right, top, bottom |
| earRight | 9117 | 3 | left, top, bottom |
| eyeLeft | 3500 | 3 | right, top, bottom |
| eyeRight | 6493 | 3 | left, right, top, bottom |
| torso | 42931 | 3 | right, top |
| armLeft | 19901 | 3 | right, top, bottom |
| armRight | 17134 | 3 | left, top, bottom |
| footLeft | 5745 | 3 | left, right, top |
| footRight | 5106 | 3 | top |
| backpack | 15903 | 3 | top |
| mouthInk | 3324 | 3 | left, right, top, bottom |
| chestEmblem | 3628 | 3 | left, right, bottom |

These are diagnostic pixel counts, **not valid anatomical measurements**.
For every region, rendered centroid error, width relative error and height
relative error are **NOT MEASURED**. No component gate is passing.
Global IoU, centroid difference, ground-contact delta and RGB MAE are also
**NOT MEASURED**, not zero and not passing.

### Why expanding or choosing the largest blob is insufficient

A separate read-only canonical-only connected-component probe used 8-neighbor
connectivity, the original alpha/color classifiers, and a conservative warm-cream
variant requiring r>=g>=b. No rendered master was used or observed.

- Original cream: one connected area of 40,153 pixels spans x=139..360,
  y=111..415, merging face and belly.
- Warm-cream variant: still one area of 37,504 pixels spanning x=140..360,
  y=111..415. Excluding cool highlights does not separate head from torso.
- Teal left lower-body component spans y=332..444; right spans y=343..451.
  They join visible leg/body and foot. Taking each complete blob would change
  the meaning of the required foot measurements.
- Overlapping ink/teal ROIs include adjacent features (eyes, nose, mouth, ears,
  hair and backpack); continued expansion captures more neighbors, not the
  intended boundary.

The automatic alternatives tested do not establish a valid anatomical
partition. Introducing chosen cut-lines or silently relabeling whole blobs as
individual parts would manufacture the measurement instead of demonstrating it.
The probe was not adopted as a classifier. The pilot stops before the freeze
and first full render under the supplied contamination stop condition.

## Corrections and tests

Tracked/pushed changes:

1. `.github/workflows/yoppo-rive-pilot-review.yml`: exact Node/Rive versions,
   official Rive archive hash verification, Linux EGL prerequisite ordering,
   regression test, early lint/type/canonical checks, diagnostic artifact on failure,
   no rendering without a freeze manifest. Permissions unchanged.
2. `scripts/measure-yoppo-geometry.mjs`: complete fail-closed diagnostics,
   annotated invalid regions, exact expansion history and safe edge clamping.
3. `scripts/compare-yoppo-master.ts`: reject invalid/incomplete/clipped audits
   before reading a render; explicit types; working async entry point for tsx;
   valid Sharp alpha overlay; explicit color/resampling policy; consistent alpha.
4. `tests/companion/yoppoGeometryDiagnostics.test.mjs`: preserved source hash,
   all 14 diagnostic regions, exact expansion arithmetic, exit code agreement,
   invalid/missing/clipped audit rejection before render access.

No threshold change. Existing rig tests are unchanged.

## Commands actually executed

Node commands below used the local pinned Node 22.23.4 executable; tooling and
large evidence are confined to ignored `.qa-guided/yoppo-pilot/`.

| Command | Local result |
| --- | --- |
| `git fetch origin`, branch/head/status checks | PASS, expected starting head |
| `gh repo view ... --json visibility` | PUBLIC |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS, lockfile unchanged |
| `rive --version`, `rive doctor` | 1.9.2; doctor notes absent login/adb, irrelevant to offline pilot |
| `node scripts/audit-yoppo-master.mjs` | PASS; matches canonical palette/bounds |
| Original `node scripts/measure-yoppo-geometry.mjs ...` | FAIL at headCream on Node 24.15.0 and 22.23.4 |
| Corrected `node scripts/measure-yoppo-geometry.mjs ...` | FAIL, 14 invalid regions; JSON/PNG preserved |
| `node node_modules/typescript/bin/tsc --noEmit` | Initial opacity type error; PASS after correction |
| `node --import tsx tests/companion/yoppoRigContract.test.ts` | PASS |
| `node tests/companion/yoppoGeometryDiagnostics.test.mjs` | Initially exposed tsx top-level-await bug; PASS after async wrapper |
| `node node_modules/eslint/bin/eslint.js <six pilot files>` | PASS |
| `rive rive/yoppo-master --verify` | PASS, 0 errors / 0 warnings |
| `rive inspect rive/yoppo-master --json` | PASS, no problems |
| `git diff --check`, `git diff --cached --check` | PASS |
| `gh run watch 43046911220 --repo marcandretheberge-dotcom/Pratiqo --interval 20 --exit-status` | FAIL: canonical geometry; prerequisite code checks PASS |
| `gh run download 43046911220 --repo marcandretheberge-dotcom/Pratiqo --name yoppo-canonical-measurement --dir .qa-guided/yoppo-pilot/ci-43046911220` | PASS, actual CI evidence retained |
| Node `assert.deepEqual` on local/CI regions, transform and failures | PASS: identical failure, not a passing geometry gate |
| Full master screenshot/build comparison | NOT RUN; prohibited by invalid canonical measurement |

Local successful tests do not override failed CI or authorize a PR.

## Evidence and remaining scope

Untracked local evidence, all under `.qa-guided/yoppo-pilot/`:

- `yoppo-canonical-geometry.json`
- `yoppo-canonical-geometry-annotated.png`
- `measurement.log`
- `canonical-components.json` and `analyze-canonical.mjs` (read-only probe)
- `yoppo-master-inspect.json`
- `regression-*` test evidence
- `ci-43046911220/` actual GitHub measurement JSON and annotated PNG

Large images, tools and compiled outputs are not committed.
There is no rendered master, overlay, side-by-side, freeze manifest or render
iteration log to present as success. No full-master iteration was started.

Hidden geometry remains unmeasured by definition: limb ends behind torso,
torso behind backpack, head behind spikes, ear bases behind head, eye whites
behind lids, straps behind arms. Future checks: rotation, overlap exposure and
joint seam inspection, outside this neutral-master acceptance claim.

### Recommended next human action

Supply or approve a canonical per-part segmentation/layer reference (especially
head/torso and leg/foot boundaries) so a new pre-render method can be defined
without invented cuts, moved ROIs or weakened component tolerances. Do not
approve animation, a runtime replacement or deployment from the present evidence.

## Follow-up: reference prepared for human review

On 2026-11-11, the user authorized preparing the reference segmentation from the
original PNG. See `REFERENCE_SEGMENTATION_REVIEW.md` and
`reference-segmentation-proposal.json`. The offline review contains an unchanged
original, 14 annotated part envelopes and enlarged junctions A/B/C. Source bytes,
protected files and the original-versus-hidden-annotation browser pixels were
verified unchanged. This proposal has not been approved, adopted by the gates,
frozen or rendered in Rive. The measurement blocker above remains unresolved.
