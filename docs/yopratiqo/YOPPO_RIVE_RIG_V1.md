# Yoppo Rive rig v1 — canonical master contract

Status: Step 2A — construction contract. No runtime integration.

## Canonical identity

- Identity master: `public/companion/travel/companion-travel-idle.png`
- Canvas target: 1024 × 1024
- Existing launch PNG: 500 × 500 transparent RGBA
- The idle asset defines Yoppo's proportions, teal/cream distribution, face, spikes, feet, chest emblem and explorer backpack.
- `map`, `teacher_ready`, `confused`, `celebrating`, and `level_up` are acting/pose references only.
- `inactive` and `badge_unlocked` are acting references only; their anatomy must not override the idle master.
- Source MP4s are timing references only.

## Canonical raster audit

Automated audit of the shipped idle source:

- source: 500 × 500 RGBA;
- visible bounds: x 120–423, y 40–453;
- visible footprint: about 304 × 414 px;
- scale factor to the 1024 construction canvas: 2.048;
- dominant raster candidates: `#FDF7EC`, `#E7D9C8`, `#04ABA4`, `#03958A`, `#784426`, `#4A2914`, `#04C5BA`, `#047B74`, `#031619`, `#D8C3AB`, `#38D5CA`, `#67E5D9`, `#965A37`, `#045A55`.

These are sampled raster/shading colors, not yet the final simplified semantic palette. The audit script also extracts semantic cream/teal/brown/blush/ink candidates on every CI run.

## Artboard and anchor contract

The 1024 × 1024 runtime artboard is frozen.

- Do **not** center the visible bounding box. The backpack makes that box asymmetric.
- Anchor the character to body/ground contact: x = 512, ground y = 920.
- Reference source body center: x = 250 in the 500px master.
- Reference source ground contact: y = 453.
- Reconstruction scale: 1.86×, not the naive 2.048× full-canvas scale.
- Estimated reconstructed visible bounds: x 270–834, y 152–920.
- Reserved top margin: about 152px.
- Reserved bottom margin: about 104px.
- Victory/body rise budget: max 72px before dedicated FX/pose redesign.
- FX must remain inside the square artboard in v1.
- All pivots are defined relative to this fixed artboard and must not be rebased later.

This intentionally preserves the square cross-platform asset while leaving enough room for a restrained victory rise, spike lag and shadow separation.

## Morph topology contract

Before alternate shapes are drawn, topology is frozen by group.

- Mouth neutral/smile/open/concerned: identical vertex count, vertex order, semantic point mapping and start point; clockwise from viewer-left mouth corner.
- Upper/lower lids: identical topology within each side/lid group. Open, blink, squint and thinking variants are path morphs, not unrelated redraws.
- Brows: neutral/thinking/concerned/happy variants use matched topology per side.
- Left/right hand poses are **swap-only** in v1: relaxed, open, point, fist, hold. They are not required to share morph topology.
- Any future shape that is swap-only must be declared in the typed topology manifest before art is added.

If a matched-morph group cannot preserve topology, the drawing is rejected rather than silently falling back to cross-fading.

## Construction rest pose

The construction rest pose is deliberately more neutral than the shipped idle PNG.

- center of mass centered over both feet;
- both feet flat;
- shoulders level;
- arms slightly separated from torso so complete upper-arm/forearm geometry can be drawn;
- relaxed hands;
- head centered;
- neutral open lids;
- true neutral mouth;
- blush/cheeks retained as identity, not expression;
- backpack remains visible on viewer-right, but body anatomy is completed behind it;
- current soft idle smile becomes an animation/expression variant, not the irreversible base face.

The rig should reproduce the current idle pose as a named state from this neutral construction pose.

The conversion is not visual guesswork: `YOPPO_IDLE_POSE_DELTA_V1` stores the numeric
rest→idle translations/rotations plus mouth/lid state. Those values may be refined by
overlay measurements, but artboard anchors and pivots remain frozen.

## Head-turn rule

Initial head turn is pseudo-3D and capped at ±15°. Application/Rive input is normalized from -1 to 1 and maps to that limit in one place, easing toward the extremes.

- `FaceFeatures` moves as a group.
- eyes move less than nose/mouth;
- cheeks move between eye and nose/mouth amounts;
- far eye narrows slightly;
- far ear moves toward contour;
- near ear grows slightly;
- spike clusters lag subtly;
- beyond ±15°, use a future dedicated 3/4 pose instead of stretching the system.

## Layer tree

```text
YOPPO_ROOT
├── Shadow
└── World_Offset
    └── Body_Offset
        ├── Backpack
        │   ├── Contact_Shadow
        │   ├── Pack_Base
        │   ├── Pack_Flap
        │   ├── Side_Pocket
        │   ├── Buckles
        │   ├── Strap_L
        │   └── Strap_R
        ├── Hips
        │   ├── Leg_L
        │   │   ├── Thigh
        │   │   ├── Shin
        │   │   └── Foot
        │   └── Leg_R
        │       ├── Thigh
        │       ├── Shin
        │       └── Foot
        └── Torso
            ├── Body_Base
            ├── Belly
            ├── Chest_Emblem
            ├── Shoulder_Overlap_L
            ├── Shoulder_Overlap_R
            ├── Arm_L
            │   ├── UpperArm
            │   ├── Forearm
            │   └── Hand
            ├── Arm_R
            │   ├── UpperArm
            │   ├── Forearm
            │   └── Hand
            └── Neck_Overlap
                └── Head
                    ├── Spikes_Back
                    ├── Spikes_Middle
                    ├── Spikes_Front
                    ├── Ear_L
                    │   ├── Outer
                    │   └── Inner
                    ├── Ear_R
                    │   ├── Outer
                    │   └── Inner
                    ├── Far_Side_Contour
                    ├── Face_Base
                    ├── Cheek_L
                    ├── Cheek_R
                    └── FaceFeatures
                        ├── Eye_L
                        │   ├── White
                        │   ├── Mask
                        │   ├── Pupil
                        │   ├── Highlight
                        │   ├── Lid_Upper
                        │   └── Lid_Lower
                        ├── Eye_R
                        │   └── same
                        ├── Brow_L
                        ├── Brow_R
                        ├── Nose
                        └── Mouth
                            ├── Interior
                            ├── Teeth
                            ├── Tongue
                            ├── Neutral
                            ├── Smile
                            ├── Open
                            └── Concerned

Props
├── Map
├── Notebook
├── Pencil
├── Medal
└── Star

FX
├── Sparkles
└── Confetti
```

## Hidden-shape rule

Every occluded piece must be reconstructed in full before animation:

- limb ends behind torso;
- torso behind backpack;
- strap sections behind arms;
- head silhouette behind spikes;
- ear bases behind head;
- eye whites behind lids;
- full feet under body overlap;
- full backpack contact area behind torso.

No animation may depend on a cut-off raster silhouette.

## Rigging method

- Root / World_Offset / Body_Offset: independent transforms.
- Head: independent transform around neck pivot.
- Eyes/pupils/highlights: independent transforms clipped to eye masks.
- Lids: path/shape animation, not bones.
- Brows: independent transforms.
- Mouth: shape/state swaps; interior remains shared.
- Torso: transform + minimal mesh deformation only for breathing/turn softness.
- Arms: short 2-bone/FK chains; IK only if required by prop holding.
- Legs: 2-bone chains, separate feet.
- Backpack: parented to torso with top pivot and 1–3° lag/follow-through.
- Straps: two-anchor deformable pieces attached to shoulder/torso, not rigid pack children.
- Spikes: 3 grouped clusters for delayed follow-through.
- Shadow: independent, driven by body height.
- Mesh deformation: sparing; never the default for rigid limb pieces.

## Initial Rive behavior contract

The first pilot must support:

- idle
- blink
- thinking
- studying
- correct
- incorrect
- happy
- victory
- walking

Existing app state names remain backward-compatible through an adapter:

- `idle`
- `map`
- `confused`
- `celebrating`
- `teacher_ready`
- `level_up`
- `inactive`
- `badge_unlocked`

## Quality gates

1. **Global overlay gate:** rebuilt idle-pose export must achieve silhouette IoU ≥ 0.80, centroid drift ≤ 24 px, ground-contact drift ≤ 12 px and overlap RGB MAE ≤ 65. These values were frozen before the full-master render and must not be changed after seeing results.
2. **Per-component geometry gate:** measured head, spikes, ears, eyes, torso, arms, feet, backpack, mouth and chest emblem must pass their pre-frozen centroid and bounding-box tolerances in `YOPPO_COMPONENT_TOLERANCES`.
3. **Measurement evidence:** the canonical geometry audit must output an annotated PNG showing each final ROI, classified feature bounds and centroid. That image is visually reviewed once for same-color neighbor contamination before measurements may drive art.
4. **ROI discipline:** an edge-touching measurement expands by exactly 12 px on each touched side, up to three times, with the reason recorded. ROIs are never shrunk or repositioned to improve a result.
5. **Hidden geometry:** occluded limb ends, torso/head sections and straps are explicitly unmeasured by definition and are validated by rotation/overlap-exposure tests, not by pretending the source PNG contains those pixels.
6. **Palette lock:** palette candidates must be extracted from the canonical PNG before final vector coloring.
7. **Full hidden geometry:** no cropped joints or missing overlap shapes.
8. **Pivot manifest:** every animated transform has a named pivot before animation work begins.
9. **Static fallback:** final rig rest pose exports a PNG that can replace the current fallback without visual identity drift.
10. **Reduced motion:** state contract includes a reduced-motion presentation path.
11. No learning state, payment state, or entitlement state may enter the Rive asset.
