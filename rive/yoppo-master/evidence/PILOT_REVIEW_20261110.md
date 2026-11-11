# Yoppo neutral-master pilot: infrastructure stop

Historical report only. The repository became public and the pilot resumed on
2026-11-11. See `PILOT_REVIEW_20261111.md` for the current verdict; do not use the
billing stop below as the current engineering status.

Review date: 2026-11-10, America/Toronto.
Observation: 2026-11-11T03:46:43Z.

**INFRASTRUCTURE BLOCK**

Specific cause: **INFRASTRUCTURE BLOCK - BILLING/SPENDING LIMIT**.
This is not a transient runner failure, a geometry failure, or a failed visual comparison.
VISUAL REVIEW PENDING HUMAN REVIEW. No visual approval is claimed.

## Branch and preservation

- Expected, starting and final HEAD:
  `f5e38c21c290ea8612a524edb56e404f5944e050`.
- Branch: `feat/yoppo-rive-pilot-20261110`.
- Isolated worktree: `yoppo-rive-pilot` beside the existing worktrees.
- Origin was fetched; the authorized remote branch exactly matched the expected HEAD.
- No main checkout, application change, threshold change, geometry change,
  runtime integration, secret access, production mutation, commit, push,
  PR creation, merge or deployment was performed.
- Only this report and its companion small JSON evidence file were added locally.
  They remain uncommitted so reporting does not trigger another blocked CI run.
- The current production PNG remains the runtime fallback.

## Authoritative CI evidence

[Exact-head workflow run](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42950575663)

| Item | Observed value |
| --- | --- |
| Workflow | Yoppo Rive pilot review |
| Run | 42950575663 |
| Head | f5e38c21c290ea8612a524edb56e404f5944e050 |
| Conclusion | failure |
| Job | rig-contract, 130293643886 |
| runner_id | 0 |
| runner_name | empty |
| Steps | empty array |
| Actual engineering execution | None: job never started |
| Retries/new runs in this session | 0 / 0 |

The API annotation says:

> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings

The annotation does not distinguish a failed account payment from a spending
limit. Only the account owner can resolve that ambiguity in Billing & plans.
No account billing setting, payment or spending authorization was requested or changed.
The task explicitly requires stopping immediately on this annotation; the
three-retry allowance for a runner allocation failure does not apply.

## Execution ledger

Executed successfully:

1. Read the supplied brief, CLAUDE.md, AGENTS.md, rig contract/tests, measurement
   scripts, comparator, eye-spike/master documentation and workflow.
2. `git fetch origin`.
3. `git worktree add <isolated-path> -b feat/yoppo-rive-pilot-20261110 origin/feat/yoppo-rive-pilot-20261110`.
4. `git status -sb` and `git rev-parse HEAD`.
5. `gh run list --repo marcandretheberge-dotcom/Pratiqo --branch feat/yoppo-rive-pilot-20261110 --workflow yoppo-rive-pilot-review.yml --limit 6 --json databaseId,headSha,status,conclusion,url,createdAt`.
6. `gh api repos/marcandretheberge-dotcom/Pratiqo/actions/runs/42950575663/jobs`.
7. `gh run view 42950575663 --repo marcandretheberge-dotcom/Pratiqo`.
8. `gh api repos/marcandretheberge-dotcom/Pratiqo/check-runs/130293643886/annotations`.
9. Local Node version and sharp package/lockfile version inspection.

The first sandboxed GitHub read could not connect. The authorized network read
succeeded; this was not a workflow retry. GitHub's billing annotation is the
actual blocker, not that initial local network restriction.

## Measurement and reproducibility status

| Required evidence | Result |
| --- | --- |
| Freeze commit / manifest SHA-256 | Not created |
| Palette audit / canonical geometry | Not run after mandatory infrastructure stop |
| Canonical JSON / annotated PNG | Not generated in this session |
| ROI expansion history | None; not evaluated |
| Same-color contamination / ROI-edge validity | Not evaluated |
| Rive CLI 1.9.2 | Required; not installed or executed in this session |
| Rive renderer | Not reported; no execution |
| Node | v24.15.0 on Windows |
| sharp | Existing dependency tree and branch lockfile both 0.34.5 |
| Build / verify / inspect / render commands | Not executed |
| Full master renders | 0 of 15 maximum |
| Retained / reverted iterations | None / none |
| Render, overlay and side-by-side evidence | Not generated |
| Freeze integrity | Not applicable; no freeze cycle started |
| Draft PR | None; exact-head CI and measurement gates have not passed |

Required comparison policy, not yet executed: sRGB, straight-alpha source files,
transparent 1024 x 1024 canvas, explicit Lanczos3 canonical scaling, RGB MAE on
the intersection where both alpha values are at least 180, and identical
#F4F0E8 backgrounds only for human-review composites.

All global metrics are **NOT MEASURED**, not passing or failing:
silhouette IoU (minimum 0.80), centroid error (maximum 24 px),
ground-contact delta (maximum 12 px), overlapping RGB MAE (maximum 65).

All component centroid/width/height errors are **NOT MEASURED**:

| Component | Centroid max px | Width relative max | Height relative max | Result |
| --- | ---: | ---: | ---: | --- |
| headCream | 10 | 0.08 | 0.08 | NOT RUN |
| spikes | 12 | 0.12 | 0.12 | NOT RUN |
| earLeft | 10 | 0.12 | 0.12 | NOT RUN |
| earRight | 10 | 0.12 | 0.12 | NOT RUN |
| eyeLeft | 8 | 0.08 | 0.08 | NOT RUN |
| eyeRight | 8 | 0.08 | 0.08 | NOT RUN |
| torso | 12 | 0.10 | 0.10 | NOT RUN |
| armLeft | 12 | 0.14 | 0.12 | NOT RUN |
| armRight | 12 | 0.14 | 0.12 | NOT RUN |
| footLeft | 10 | 0.10 | 0.10 | NOT RUN |
| footRight | 10 | 0.10 | 0.10 | NOT RUN |
| backpack | 12 | 0.10 | 0.10 | NOT RUN |
| mouthInk | 8 | 0.15 | 0.15 | NOT RUN |
| chestEmblem | 10 | 0.16 | 0.16 | NOT RUN |

## Resume prerequisites

The current workflow installs the current CLI with the unversioned installer.
Before the first full master render, that must become a reproducible 1.9.2
installation and be included in the methodology freeze, without changing
workflow permissions. The canonical measurement/comparison implementation still
needs its prescribed pre-render audit, explicit color/resampling configuration,
complete evidence outputs and freeze manifest. No acceptance claim can be
inferred from the existing scripts merely being present.

Hidden geometry remains unmeasured by definition:
limb ends behind torso; torso behind backpack; head behind spikes; ear bases
behind head; eye whites behind lids; straps behind arms. Its future validation
requires rotation, overlap-exposure and joint-seam checks, outside this pilot.

## One next human action

Resolve the repository owner's **GitHub Actions Billing & plans** restriction,
then request resumption of this same branch. No permission change, repository
secret or alternative runner is needed or authorized as a bypass.
