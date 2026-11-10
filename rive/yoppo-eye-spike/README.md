# Yoppo eye tooling spike

Purpose: prove the exact Rive CLI/RML primitives required before reconstructing full Yoppo.

This is **not** production art.

The spike must prove, through `rive --verify`, `rive inspect`, and rendered screenshots:

1. `ClippingShape` is preserved by RML build/inspect against the visible `Eye White` geometry; mask pixels require a Rive Editor visual gate because current CLI 1.9.x headless captures drop the clipped child in this minimal repro;
2. pupil and catchlight can move independently;
3. matched-topology lid vertices can be keyframed directly (`StraightVertex.y`);
4. a vector `PointsPath` can be skinned to `RootBone` / `Bone`;
5. a two-bone `IKConstraint` can drive that chain;
6. the project can render frame 0 and an advanced frame headlessly.

Rive's literal `Mesh` type is image-only. Full Yoppo is intended to be reconstructed as vector geometry, so soft deformation should use `Skin` on `PointsPath`, not image Mesh, unless a later asset has a real raster/image use-case.


## Headless clipping note

The CLI verifier/importer accepts the clipping graph with zero problems, but repeated Linux headless
captures on Rive CLI 1.9.x rendered clipped children as empty. The spike therefore treats clipping as
a **structural verify/inspect capability** and uses an unclipped duplicate to prove pupil movement and
matched-topology lid animation in CI. Before the full Yoppo eye is approved for production, open the
same Rive project in the Rive Editor and visually confirm the eye mask. This limitation does not block
bones, IK, skinned vector paths, transforms or keyframed path morphing.
