# Yoppo eye tooling spike

Purpose: prove the exact Rive CLI/RML primitives required before reconstructing full Yoppo.

This is **not** production art.

The spike must prove, through `rive --verify`, `rive inspect`, and rendered screenshots:

1. the visible `Eye White` geometry clips pupil, catchlight and lid via `ClippingShape`, with clipped contents authored before the later Eye White source to match Rive draw order;
2. pupil and catchlight can move independently;
3. matched-topology lid vertices can be keyframed directly (`StraightVertex.y`);
4. a vector `PointsPath` can be skinned to `RootBone` / `Bone`;
5. a two-bone `IKConstraint` can drive that chain;
6. the project can render frame 0 and an advanced frame headlessly.

Rive's literal `Mesh` type is image-only. Full Yoppo is intended to be reconstructed as vector geometry, so soft deformation should use `Skin` on `PointsPath`, not image Mesh, unless a later asset has a real raster/image use-case.

## Draw-order finding

The first headless attempts appeared to show a clipping failure, but the rendered frame exposed the real issue: the Eye White was painted above the pupil because the RML sibling stack draws earlier-authored eye details above the later clip-source surface. The final spike therefore authors clipped eye contents first and the visible Eye White/mask source later. CI requires the clipped pupil to be visible in frame 0 and materially changed by frame 30.
