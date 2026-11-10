import assert from "node:assert/strict";
import {
  YOPPO_HEAD_TURN_LIMIT_DEG,
  YOPPO_IDENTITY_MASTER,
  YOPPO_REFERENCE_POLICY,
  YOPPO_RIG_LAYERS,
  YOPPO_RIVE_BEHAVIORS,
  YOPPO_SOURCE_AUDIT,
} from "@/lib/companion/yoppoRigContract";

assert.equal(YOPPO_IDENTITY_MASTER, "/companion/travel/companion-travel-idle.png");
assert.equal(YOPPO_HEAD_TURN_LIMIT_DEG, 15);
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
