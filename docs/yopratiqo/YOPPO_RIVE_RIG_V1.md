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

## Head-turn rule

Initial head turn is pseudo-3D and capped at ±15°.

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

1. Overlay match: rebuilt rest export must preserve canonical idle proportions.
2. Palette lock: palette candidates must be extracted from the canonical PNG before final vector coloring.
3. Full hidden geometry: no cropped joints or missing overlap shapes.
4. Pivot manifest: every animated transform has a named pivot before animation work begins.
5. Static fallback: final rig rest pose exports a PNG that can replace the current fallback without visual identity drift.
6. Reduced motion: state contract includes a reduced-motion presentation path.
7. No learning state, payment state, or entitlement state may enter the Rive asset.
