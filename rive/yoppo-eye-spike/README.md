# Yoppo eye tooling spike

Purpose: prove the exact Rive CLI/RML primitives required before reconstructing full Yoppo.

This is **not** production art.

The spike must prove, through `rive --verify`, `rive inspect`, and rendered screenshots:

1. an unpainted visible `Eye Mask` can clip the pupil, catchlight and lid via `ClippingShape`;
2. pupil and catchlight can move independently;
3. matched-topology lid vertices can be keyframed directly (`StraightVertex.y`);
4. a vector `PointsPath` can be skinned to `RootBone` / `Bone`;
5. a two-bone `IKConstraint` can drive that chain;
6. the project can render frame 0 and an advanced frame headlessly.

Rive's literal `Mesh` type is image-only. Full Yoppo is intended to be reconstructed as vector geometry, so soft deformation should use `Skin` on `PointsPath`, not image Mesh, unless a later asset has a real raster/image use-case.
