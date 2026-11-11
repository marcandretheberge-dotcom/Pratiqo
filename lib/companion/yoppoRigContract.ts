export type YoppoRigMode = "transform" | "bone" | "mask" | "swap" | "mesh" | "morph" | "fx";

export type YoppoRigLayer = {
  id: string;
  parent: string | null;
  mode: YoppoRigMode;
  pivot: string;
  completeHiddenGeometry?: boolean;
};

export const YOPPO_RIG_VERSION = "yoppo-rive-v1" as const;
export const YOPPO_IDENTITY_MASTER = "/companion/travel/companion-travel-idle.png" as const;
export const YOPPO_CONSTRUCTION_CANVAS = 1024 as const;
export const YOPPO_HEAD_TURN_LIMIT_DEG = 15 as const;
export const YOPPO_HEAD_TURN_INPUT = {
  min: -1,
  max: 1,
  mapsToDegrees: 15,
  easing: "ease-out-near-extremes",
} as const;

export const YOPPO_ARTBOARD_CONTRACT = {
  width: 1024,
  height: 1024,
  anchorPolicy: "body-ground-contact-not-visible-bounds",
  bodyAnchorX: 512,
  groundY: 920,
  referenceSourceBodyCenterX: 250,
  referenceSourceGroundY: 453,
  reconstructionScale: 1.86,
  referenceOverlayX: 47,
  referenceOverlayY: 78,
  estimatedVisibleBounds: { minX: 270, minY: 152, maxX: 834, maxY: 920 },
  topMargin: 152,
  bottomMargin: 104,
  maxBodyRisePx: 72,
  fxOverflowPolicy: "stay-inside-artboard",
} as const;

export const YOPPO_GEOMETRY_MEASUREMENT_POLICY = {
  source: "canonical-idle-png",
  method: "fixed-roi-alpha-color-segmentation",
  geometryChangesRequireMeasuredDelta: true,
  rejectEdgeClippedMeasurements: true,
  sourceToArtboard: { scale: 1.86, translateX: 47, translateY: 78 },
} as const;

export const YOPPO_MASTER_GEOMETRY_STATUS = {
  status: "provisional-until-canonical-measurement",
  mayAdvanceToAnimation: false,
  rule: "current RML proportions are not accepted until pixel geometry + overlay gates pass",
} as const;

export const YOPPO_OVERLAY_ACCEPTANCE = {
  silhouetteIoUMin: 0.80,
  centroidDistanceMaxPx: 24,
  groundContactDeltaMaxPx: 12,
  overlapRgbMaeMax: 65,
} as const;

export const YOPPO_LIMB_DEPTH_POLICY = {
  method: "explicit-draw-order-switch",
  states: ["neutral", "walk-screen-left", "walk-screen-right"],
  rule: "near/far arm and leg depth must switch through draw order, never by changing anatomy",
  walkingImplementationDeferred: true,
} as const;

export type YoppoTopologyMode = "matched-morph" | "swap-only" | "transform-only";

export type YoppoTopologyRule = {
  group: string;
  mode: YoppoTopologyMode;
  members: readonly string[];
  invariant?: string;
  startPoint?: string;
  winding?: "clockwise" | "counter-clockwise";
};

export const YOPPO_MORPH_TOPOLOGY: readonly YoppoTopologyRule[] = [
  {
    group: "mouth-expression",
    mode: "matched-morph",
    members: ["neutral", "smile", "open", "concerned"],
    invariant: "same vertex count, same vertex order, same semantic corners/curves",
    startPoint: "viewer-left mouth corner",
    winding: "clockwise",
  },
  {
    group: "lid-left-upper",
    mode: "matched-morph",
    members: ["open", "blink", "squint", "thinking"],
    invariant: "same vertex count/order/start point; preserve eye-mask contact",
    startPoint: "outer eye corner",
    winding: "clockwise",
  },
  {
    group: "lid-left-lower",
    mode: "matched-morph",
    members: ["open", "smile", "squint"],
    invariant: "same vertex count/order/start point; preserve eye-mask contact",
    startPoint: "outer eye corner",
    winding: "clockwise",
  },
  {
    group: "lid-right-upper",
    mode: "matched-morph",
    members: ["open", "blink", "squint", "thinking"],
    invariant: "same vertex count/order/start point; preserve eye-mask contact",
    startPoint: "outer eye corner",
    winding: "counter-clockwise",
  },
  {
    group: "lid-right-lower",
    mode: "matched-morph",
    members: ["open", "smile", "squint"],
    invariant: "same vertex count/order/start point; preserve eye-mask contact",
    startPoint: "outer eye corner",
    winding: "counter-clockwise",
  },
  {
    group: "brow-left",
    mode: "matched-morph",
    members: ["neutral", "thinking", "concerned", "happy"],
    invariant: "same vertex count/order/start point",
    startPoint: "inner brow end",
    winding: "clockwise",
  },
  {
    group: "brow-right",
    mode: "matched-morph",
    members: ["neutral", "thinking", "concerned", "happy"],
    invariant: "same vertex count/order/start point",
    startPoint: "inner brow end",
    winding: "counter-clockwise",
  },
  {
    group: "hand-left",
    mode: "swap-only",
    members: ["relaxed", "open", "point", "fist", "hold"],
  },
  {
    group: "hand-right",
    mode: "swap-only",
    members: ["relaxed", "open", "point", "fist", "hold"],
  },
] as const;

export const YOPPO_SOURCE_AUDIT = {
  sourceWidth: 500,
  sourceHeight: 500,
  visibleBounds: { minX: 120, minY: 40, maxX: 423, maxY: 453 },
  visibleWidth: 304,
  visibleHeight: 414,
  scaleToConstructionCanvas: 2.048,
  dominantRasterCandidates: [
    "#FDF7EC", "#E7D9C8", "#04ABA4", "#03958A", "#784426",
    "#4A2914", "#04C5BA", "#047B74", "#031619", "#D8C3AB",
    "#38D5CA", "#67E5D9", "#965A37", "#045A55",
  ],
} as const;

export const YOPPO_CONSTRUCTION_REST = {
  weight: "centered",
  feet: "flat",
  shoulders: "level",
  arms: "open-from-torso",
  face: "true-neutral",
  lids: "open-neutral",
  backpack: "viewer-right-visible",
  idleSmile: "named-expression-not-base",
} as const;

/**
 * Versioned numeric delta from the neutral construction rest to the familiar
 * shipped idle. These seed values are refined only by numeric overlay review;
 * pivots/artboard coordinates never move to compensate.
 */
export const YOPPO_IDLE_POSE_DELTA_V1 = {
  bodyOffset: { x: 0, y: 0, rotationDeg: 0 },
  head: { x: 0, y: -4, rotationDeg: 0.5 },
  armL: { x: 2, y: 2, rotationDeg: -4 },
  armR: { x: -2, y: 2, rotationDeg: 4 },
  handL: { x: 0, y: 2, rotationDeg: -2 },
  handR: { x: 0, y: 2, rotationDeg: 2 },
  legL: { x: -2, y: 0, rotationDeg: -1 },
  legR: { x: 2, y: 0, rotationDeg: 1 },
  backpack: { x: 0, y: 0, rotationDeg: 1.5 },
  faceFeatures: { x: 0, y: 0 },
  pupilLook: { x: 0, y: 0 },
  mouth: "smile",
  lids: "open",
} as const;

export const YOPPO_REFERENCE_POLICY = {
  canonical: ["idle"],
  poseReference: ["map", "teacher_ready", "confused", "celebrating", "level_up"],
  actingOnly: ["inactive", "badge_unlocked"],
} as const;

export const YOPPO_RIG_LAYERS: readonly YoppoRigLayer[] = [
  { id: "YOPPO_ROOT", parent: null, mode: "transform", pivot: "ground-center" },
  { id: "Shadow", parent: "YOPPO_ROOT", mode: "transform", pivot: "ground-center" },
  { id: "World_Offset", parent: "YOPPO_ROOT", mode: "transform", pivot: "ground-center" },
  { id: "Body_Offset", parent: "World_Offset", mode: "transform", pivot: "hip-center" },

  { id: "Backpack", parent: "Body_Offset", mode: "transform", pivot: "pack-top" },
  { id: "Backpack.Contact_Shadow", parent: "Backpack", mode: "transform", pivot: "pack-center" },
  { id: "Backpack.Pack_Base", parent: "Backpack", mode: "transform", pivot: "pack-top", completeHiddenGeometry: true },
  { id: "Backpack.Pack_Flap", parent: "Backpack", mode: "transform", pivot: "flap-top" },
  { id: "Backpack.Side_Pocket", parent: "Backpack", mode: "transform", pivot: "pocket-top" },
  { id: "Backpack.Buckles", parent: "Backpack", mode: "transform", pivot: "pack-center" },
  { id: "Backpack.Strap_L", parent: "Body_Offset", mode: "mesh", pivot: "shoulder-l", completeHiddenGeometry: true },
  { id: "Backpack.Strap_R", parent: "Body_Offset", mode: "mesh", pivot: "shoulder-r", completeHiddenGeometry: true },

  { id: "Hips", parent: "Body_Offset", mode: "transform", pivot: "hip-center" },
  { id: "Leg_L.Thigh", parent: "Hips", mode: "bone", pivot: "hip-l", completeHiddenGeometry: true },
  { id: "Leg_L.Shin", parent: "Leg_L.Thigh", mode: "bone", pivot: "knee-l", completeHiddenGeometry: true },
  { id: "Leg_L.Foot", parent: "Leg_L.Shin", mode: "transform", pivot: "ankle-l", completeHiddenGeometry: true },
  { id: "Leg_R.Thigh", parent: "Hips", mode: "bone", pivot: "hip-r", completeHiddenGeometry: true },
  { id: "Leg_R.Shin", parent: "Leg_R.Thigh", mode: "bone", pivot: "knee-r", completeHiddenGeometry: true },
  { id: "Leg_R.Foot", parent: "Leg_R.Shin", mode: "transform", pivot: "ankle-r", completeHiddenGeometry: true },

  { id: "Torso", parent: "Hips", mode: "mesh", pivot: "hip-center", completeHiddenGeometry: true },
  { id: "Torso.Belly", parent: "Torso", mode: "transform", pivot: "chest-center" },
  { id: "Torso.Chest_Emblem", parent: "Torso", mode: "transform", pivot: "chest-center" },
  { id: "Shoulder_Overlap_L", parent: "Torso", mode: "transform", pivot: "shoulder-l" },
  { id: "Shoulder_Overlap_R", parent: "Torso", mode: "transform", pivot: "shoulder-r" },
  { id: "Arm_L.UpperArm", parent: "Torso", mode: "bone", pivot: "shoulder-l", completeHiddenGeometry: true },
  { id: "Arm_L.Forearm", parent: "Arm_L.UpperArm", mode: "bone", pivot: "elbow-l", completeHiddenGeometry: true },
  { id: "Arm_L.Hand", parent: "Arm_L.Forearm", mode: "swap", pivot: "wrist-l" },
  { id: "Arm_R.UpperArm", parent: "Torso", mode: "bone", pivot: "shoulder-r", completeHiddenGeometry: true },
  { id: "Arm_R.Forearm", parent: "Arm_R.UpperArm", mode: "bone", pivot: "elbow-r", completeHiddenGeometry: true },
  { id: "Arm_R.Hand", parent: "Arm_R.Forearm", mode: "swap", pivot: "wrist-r" },

  { id: "Neck_Overlap", parent: "Torso", mode: "transform", pivot: "neck-center", completeHiddenGeometry: true },
  { id: "Head", parent: "Neck_Overlap", mode: "mesh", pivot: "neck-center", completeHiddenGeometry: true },
  { id: "Spikes_Back", parent: "Head", mode: "transform", pivot: "head-rear" },
  { id: "Spikes_Middle", parent: "Head", mode: "transform", pivot: "head-top" },
  { id: "Spikes_Front", parent: "Head", mode: "transform", pivot: "head-front" },
  { id: "Ear_L.Outer", parent: "Head", mode: "transform", pivot: "ear-l-base", completeHiddenGeometry: true },
  { id: "Ear_L.Inner", parent: "Ear_L.Outer", mode: "transform", pivot: "ear-l-base" },
  { id: "Ear_R.Outer", parent: "Head", mode: "transform", pivot: "ear-r-base", completeHiddenGeometry: true },
  { id: "Ear_R.Inner", parent: "Ear_R.Outer", mode: "transform", pivot: "ear-r-base" },
  { id: "Far_Side_Contour", parent: "Head", mode: "mesh", pivot: "face-center" },
  { id: "Face_Base", parent: "Head", mode: "mesh", pivot: "face-center" },
  { id: "Cheek_L", parent: "Head", mode: "transform", pivot: "cheek-l" },
  { id: "Cheek_R", parent: "Head", mode: "transform", pivot: "cheek-r" },
  { id: "FaceFeatures", parent: "Head", mode: "transform", pivot: "face-center" },

  { id: "Eye_L.White", parent: "FaceFeatures", mode: "transform", pivot: "eye-l-center", completeHiddenGeometry: true },
  { id: "Eye_L.Mask", parent: "Eye_L.White", mode: "mask", pivot: "eye-l-center" },
  { id: "Eye_L.Pupil", parent: "Eye_L.Mask", mode: "transform", pivot: "eye-l-center" },
  { id: "Eye_L.Highlight", parent: "Eye_L.Pupil", mode: "transform", pivot: "eye-l-center" },
  { id: "Eye_L.Lid_Upper", parent: "Eye_L.Mask", mode: "morph", pivot: "eye-l-top" },
  { id: "Eye_L.Lid_Lower", parent: "Eye_L.Mask", mode: "morph", pivot: "eye-l-bottom" },
  { id: "Eye_R.White", parent: "FaceFeatures", mode: "transform", pivot: "eye-r-center", completeHiddenGeometry: true },
  { id: "Eye_R.Mask", parent: "Eye_R.White", mode: "mask", pivot: "eye-r-center" },
  { id: "Eye_R.Pupil", parent: "Eye_R.Mask", mode: "transform", pivot: "eye-r-center" },
  { id: "Eye_R.Highlight", parent: "Eye_R.Pupil", mode: "transform", pivot: "eye-r-center" },
  { id: "Eye_R.Lid_Upper", parent: "Eye_R.Mask", mode: "morph", pivot: "eye-r-top" },
  { id: "Eye_R.Lid_Lower", parent: "Eye_R.Mask", mode: "morph", pivot: "eye-r-bottom" },
  { id: "Brow_L", parent: "FaceFeatures", mode: "transform", pivot: "brow-l-inner" },
  { id: "Brow_R", parent: "FaceFeatures", mode: "transform", pivot: "brow-r-inner" },
  { id: "Nose", parent: "FaceFeatures", mode: "transform", pivot: "nose-center" },
  { id: "Mouth.Interior", parent: "FaceFeatures", mode: "transform", pivot: "mouth-center" },
  { id: "Mouth.Teeth", parent: "Mouth.Interior", mode: "transform", pivot: "mouth-center" },
  { id: "Mouth.Tongue", parent: "Mouth.Interior", mode: "transform", pivot: "mouth-center" },
  { id: "Mouth.Expression", parent: "FaceFeatures", mode: "morph", pivot: "mouth-center" },

  { id: "Props.Map", parent: "YOPPO_ROOT", mode: "swap", pivot: "prop-center" },
  { id: "Props.Notebook", parent: "YOPPO_ROOT", mode: "swap", pivot: "prop-center" },
  { id: "Props.Pencil", parent: "YOPPO_ROOT", mode: "swap", pivot: "prop-center" },
  { id: "Props.Medal", parent: "YOPPO_ROOT", mode: "swap", pivot: "prop-center" },
  { id: "Props.Star", parent: "YOPPO_ROOT", mode: "swap", pivot: "prop-center" },
  { id: "FX.Sparkles", parent: "YOPPO_ROOT", mode: "fx", pivot: "character-center" },
  { id: "FX.Confetti", parent: "YOPPO_ROOT", mode: "fx", pivot: "character-center" },
] as const;

export const YOPPO_RIVE_BEHAVIORS = [
  "idle", "blink", "thinking", "studying", "correct",
  "incorrect", "happy", "victory", "walking",
] as const;

export type YoppoRiveBehavior = (typeof YOPPO_RIVE_BEHAVIORS)[number];
