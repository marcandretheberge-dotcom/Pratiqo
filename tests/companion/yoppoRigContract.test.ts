import assert from "node:assert/strict";
import {
  YOPPO_ARTBOARD_CONTRACT,
  YOPPO_GEOMETRY_MEASUREMENT_POLICY,\n  YOPPO_HEAD_TURN_INPUT,
  YOPPO_HEAD_TURN_LIMIT_DEG,
  YOPPO_IDLE_POSE_DELTA_V1,
  YOPPO_IDENTITY_MASTER,
  YOPPO_MORPH_TOPOLOGY,
  YOPPO_OVERLAY_ACCEPTANCE,
  YOPPO_LIMB_DEPTH_POLICY,
  YOPPO_REFERENCE_POLICY,
  YOPPO_RIG_LAYERS,
  YOPPO_RIVE_BEHAVIORS,
  YOPPO_SOURCE_AUDIT,
} from "@/lib/companion/yoppoRigContract";

assert.equal(YOPPO_IDENTITY_MASTER, "/companion/travel/companion-travel-idle.png");
assert.equal(YOPPO_HEAD_TURN_LIMIT_DEG, 15);\nassert.equal(YOPPO_GEOMETRY_MEASUREMENT_POLICY.geometryChangesRequireMeasuredDelta, true);\nassert.equal(YOPPO_GEOMETRY_MEASUREMENT_POLICY.rejectEdgeClippedMeasurements, true);
assert.equal(YOPPO_IDLE_POSE_DELTA_V1.mouth, "smile");
assert.equal(YOPPO_IDLE_POSE_DELTA_V1.lids, "open");
assert.ok(Math.abs(YOPPO_IDLE_POSE_DELTA_V1.backpack.rotationDeg) <= 3);
assert.deepEqual([YOPPO_HEAD_TURN_INPUT.min, YOPPO_HEAD_TURN_INPUT.max], [-1, 1]);
assert.equal(YOPPO_HEAD_TURN_INPUT.mapsToDegrees, 15);
assert.equal(YOPPO_ARTBOARD_CONTRACT.width, 1024);
assert.equal(YOPPO_ARTBOARD_CONTRACT.height, 1024);
assert.equal(YOPPO_ARTBOARD_CONTRACT.bodyAnchorX, 512);
assert.equal(YOPPO_ARTBOARD_CONTRACT.groundY, 920);
assert.equal(YOPPO_ARTBOARD_CONTRACT.reconstructionScale, 1.86);
assert.equal(YOPPO_ARTBOARD_CONTRACT.referenceOverlayX, 47);
assert.equal(YOPPO_ARTBOARD_CONTRACT.referenceOverlayY, 78);
assert.ok(YOPPO_OVERLAY_ACCEPTANCE.silhouetteIoUMin >= 0.8);
assert.ok(YOPPO_OVERLAY_ACCEPTANCE.centroidDistanceMaxPx <= 24);
assert.ok(YOPPO_OVERLAY_ACCEPTANCE.groundContactDeltaMaxPx <= 12);
assert.ok(YOPPO_OVERLAY_ACCEPTANCE.overlapRgbMaeMax <= 65);
assert.equal(YOPPO_LIMB_DEPTH_POLICY.method, "explicit-draw-order-switch");
assert.equal(YOPPO_LIMB_DEPTH_POLICY.walkingImplementationDeferred, true);
assert.ok(YOPPO_ARTBOARD_CONTRACT.topMargin >= 140);
assert.ok(YOPPO_ARTBOARD_CONTRACT.maxBodyRisePx <= YOPPO_ARTBOARD_CONTRACT.topMargin - 60);
for (const group of YOPPO_MORPH_TOPOLOGY) {
  assert.ok(group.members.length >= 2);
  if (group.mode === "matched-morph") {
    assert.ok(group.invariant?.includes("same vertex count"));
    assert.ok(group.startPoint);
    assert.ok(group.winding);
  }
}
assert.equal(YOPPO_MORPH_TOPOLOGY.find(group => group.group === "hand-left")?.mode, "swap-only");
assert.equal(YOPPO_MORPH_TOPOLOGY.find(group => group.group === "hand-right")?.mode, "swap-only");
assert.deepEqual(YOPPO_REFERENCE_POLICY.canonical, ["idle"]);
assert.ok(YOPPO_RIVE_BEHAVIORS.includes("walking"));
assert.equal(YOPPO_SOURCE_AUDIT.sourceWidth, 500);
assert.equal(YOPPO_SOURCE_AUDIT.sourceHeight, 500);

const ids = new Set(YOPPO_RIG_LAYERS.map(layer => layer.id));
assert.equal(ids.size, YOPPO_RIG_LAYERS.length, "rig layer ids must be unique");

for (const layer of YOPPO_RIG_LAYERS) {
  if (layer.parent !== null) {
    assert.ok(ids.has(layer.parent), `${layer.id} parent ${layer.parent} must exist`);
  }
  assert.ok(layer.pivot.length > 0, `${layer.id} must declare its pivot intent`);
}

for (const id of [
  "Leg_L.Thigh", "Leg_L.Shin", "Leg_L.Foot",
  "Leg_R.Thigh", "Leg_R.Shin", "Leg_R.Foot",
  "Arm_L.UpperArm", "Arm_L.Forearm",
  "Arm_R.UpperArm", "Arm_R.Forearm",
  "Head", "Torso",
]) {
  const layer = YOPPO_RIG_LAYERS.find(item => item.id === id);
  assert.equal(layer?.completeHiddenGeometry, true, `${id} must be reconstructed behind overlaps`);
}

const backpack = YOPPO_RIG_LAYERS.find(layer => layer.id === "Backpack");
assert.equal(backpack?.pivot, "pack-top");
assert.equal(YOPPO_RIG_LAYERS.find(layer => layer.id === "Backpack.Strap_L")?.parent, "Body_Offset");
assert.equal(YOPPO_RIG_LAYERS.find(layer => layer.id === "Backpack.Strap_R")?.parent, "Body_Offset");

console.log("Yoppo Rive rig contract: canonical master, parents, pivots, hidden geometry and behavior ids: PASS");
