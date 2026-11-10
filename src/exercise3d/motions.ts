import type { Candidate } from "../exerciseCatalog";
import rig from "../assets/athlete-rig.json";

export type V3 = [number, number, number];
type BaseExerciseFamily =
  | "bench"
  | "chest-press"
  | "pec-deck"
  | "push-up"
  | "row"
  | "seated-row"
  | "pulldown"
  | "pull-up"
  | "shoulder-press"
  | "lateral-raise"
  | "reverse-fly"
  | "curl"
  | "pushdown"
  | "overhead-extension"
  | "leg-press"
  | "hack-squat"
  | "squat"
  | "split-squat"
  | "hinge"
  | "deadlift"
  | "leg-extension"
  | "seated-curl"
  | "lying-curl"
  | "hip-thrust"
  | "abduction"
  | "kickback"
  | "back-extension"
  | "calf"
  | "pallof"
  | "crunch"
  | "knee-raise";
export type AdditionalFamily =
  | "bench-fly"
  | "cable-fly"
  | "dip"
  | "face-pull"
  | "straight-arm-pull"
  | "pullover"
  | "front-raise"
  | "upright-row"
  | "shrug"
  | "lying-extension"
  | "triceps-kickback"
  | "step-up"
  | "reverse-crunch"
  | "plank";
export type ExerciseFamily = BaseExerciseFamily | AdditionalFamily;

export const singleArm = (c: Candidate) =>
  [
    "dumbbell_row",
    "single_arm_pulldown",
    "single_arm_cable_row",
    "cable_single_lateral_raise",
    "leaning_dumbbell_lateral_raise",
    "preacher_dumbbell_curl",
    "concentration_curl",
    "single_arm_pushdown",
    "dumbbell_triceps_kickback",
  ].includes(c.id);
export const seatedCalf = (c: Candidate) =>
  ["seated_calf", "seated_dumbbell_calf"].includes(c.id);
export const singleWeight = (c: Candidate) =>
  [
    "goblet_squat",
    "dumbbell_overhead_extension",
    "dumbbell_pullover",
    "dumbbell_hip_thrust",
  ].includes(c.id);

export function exerciseFamily(
  c: Candidate,
): ExerciseFamily | AdditionalFamily | undefined {
  if (c.id === "trunk_machine") return;
  if (c.pattern === "chest-fly" && c.mode === "dumbbell") return "bench-fly";
  if (["cable_chest_fly", "low_cable_fly", "high_cable_fly"].includes(c.id))
    return "cable-fly";
  if (c.id === "smith_bench_press" || c.id === "smith_incline_press")
    return "bench";
  if (c.id === "single_leg_press") return "leg-press";
  if (c.id === "single_leg_curl") return "seated-curl";
  if (c.id === "push_up") return "push-up";
  if (c.id === "leg_press") return "leg-press";
  if (c.id === "hack_squat") return "hack-squat";
  if (c.id === "leg_curl") return "lying-curl";
  if (c.id === "seated_leg_curl") return "seated-curl";
  if (c.id === "cable_glute_kickback") return "kickback";
  if (c.id === "back_extension") return "back-extension";
  if (["oh_extension", "dumbbell_overhead_extension"].includes(c.id))
    return "overhead-extension";
  if (c.pattern === "horizontal-push")
    return c.mode === "barbell" || c.mode === "dumbbell"
      ? "bench"
      : "chest-press";
  if (c.pattern === "horizontal-pull")
    return c.mode === "barbell" || c.mode === "dumbbell" ? "row" : "seated-row";
  if (c.pattern === "vertical-pull")
    return c.mode === "bodyweight" || c.mode === "assisted"
      ? "pull-up"
      : "pulldown";
  const map: Record<string, ExerciseFamily | AdditionalFamily> = {
    "high-row": "seated-row",
    "hip-adduction": "abduction",
    "knee-flexion": "seated-curl",
    dip: "dip",
    "face-pull": "face-pull",
    "straight-arm-pull": "straight-arm-pull",
    pullover: "pullover",
    "front-raise": "front-raise",
    "upright-row": "upright-row",
    shrug: "shrug",
    "lying-extension": "lying-extension",
    "triceps-kickback": "triceps-kickback",
    "step-up": "step-up",
    "reverse-crunch": "reverse-crunch",
    plank: "plank",
    "vertical-push": "shoulder-press",
    "lateral-raise": "lateral-raise",
    "rear-delt": "reverse-fly",
    "chest-fly": "pec-deck",
    "elbow-flexion": "curl",
    "elbow-extension": "pushdown",
    "leg-push": "squat",
    "split-squat": "split-squat",
    "hip-hinge": "hinge",
    deadlift: "deadlift",
    "knee-extension": "leg-extension",
    "hip-extension": "hip-thrust",
    "hip-abduction": "abduction",
    calf: "calf",
    trunk: "pallof",
    "trunk-flexion": "crunch",
    "knee-raise": "knee-raise",
  };
  return map[c.pattern];
}

export type PoseFrame = {
  family: ExerciseFamily | AdditionalFamily;
  hip: V3;
  lean: number;
  hands: [V3, V3];
  elbows: [V3, V3];
  feet: [V3, V3];
  knees: [V3, V3];
  footPitch: number;
  spineBend: number;
  handsAtHead?: boolean;
  openHands?: boolean;
  supportHand?: "L" | "R";
  /** Pronation/supination in radians; the rig clamps this independently of the wrist. */
  forearmTwist?: [number, number];
  shoulderLift?: number;
  fixedGrips?: boolean;
};
const pair = (x: number, y: number, z: number): [V3, V3] => [
  [x, y, z],
  [-x, y, z],
];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bodyVector = (p: V3, lean: number): V3 => [
  p[0],
  p[1] * Math.cos(lean) - p[2] * Math.sin(lean),
  p[1] * Math.sin(lean) + p[2] * Math.cos(lean),
];
const plus = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function shoulder(frame: PoseFrame, side: "L" | "R"): V3 {
  const p = rig.bones[`upperarm01_${side}`].head,
    root = rig.bones.root.head;
  return plus(
    frame.hip,
    bodyVector([p[0] - root[0], p[1] - root[1], p[2] - root[2]], frame.lean),
  );
}
/** A raise/fly follows an arc around the shoulder, not a straight chord that
 * collapses the elbow halfway through the repetition. */
function flyArc(frame: PoseFrame, angle: number, elevation = -0.06) {
  for (const [i, side] of (["L", "R"] as const).entries()) {
    const sign = side === "L" ? 1 : -1,
      base = shoulder(frame, side);
    const arm: V3 = [
      sign * 0.5 * Math.cos(elevation) * Math.sin(angle),
      0.5 * Math.sin(elevation),
      0.5 * Math.cos(elevation) * Math.cos(angle),
    ];
    frame.hands[i] = plus(base, bodyVector(arm, frame.lean));
    frame.elbows[i] = plus(
      base,
      bodyVector([arm[0] * 0.5, arm[1] * 0.5 - 0.25, arm[2] * 0.5], frame.lean),
    );
  }
}

/** Geometric animation only. It never supplies loads, repetitions or workout results. */
export function motionFor(
  c: Candidate,
  progress: number,
): PoseFrame | undefined {
  const family = exerciseFamily(c);
  if (!family) return;
  const t = Math.max(0, Math.min(1, progress));
  const frame: PoseFrame = {
    family,
    hip: [0, 0.924, -0.05],
    lean: 0,
    hands: pair(0.24, 0.98, 0.12),
    elbows: pair(0.28, 1.15, -0.18),
    feet: pair(0.18, 0.072, 0.02),
    knees: pair(0.18, 0.5, 0.55),
    footPitch: 0,
    spineBend: 0,
  };
  const seated = () => {
    frame.hip = [0, 0.55, -0.03];
    frame.feet = pair(0.19, 0.072, 0.4);
    frame.knees = pair(0.2, 0.55, 0.65);
  };
  switch (family) {
    case "bench": {
      const incline = c.id.includes("incline"),
        floor = c.id.includes("floor"),
        decline = c.id.includes("decline");
      frame.hip = [0, 0.56, 0.05];
      if (floor) frame.hip[1] = 0.12;
      frame.lean = incline ? -1.05 : decline ? -1.75 : -Math.PI / 2;
      frame.feet = pair(0.26, 0.072, 0.42);
      frame.hands = pair(
        lerp(c.id.includes("close_grip") ? 0.19 : 0.32, 0.25, t),
        lerp(0.74, 1.11, t) - (floor ? 0.44 : 0),
        incline ? -0.21 : -0.34,
      );
      frame.elbows = pair(0.58, floor ? 0.14 : 0.51, -0.24);
      if (c.id.includes("neutral")) frame.forearmTwist = [-1.45, 1.45];
      break;
    }
    case "chest-press":
      seated();
      frame.lean = -0.07;
      frame.forearmTwist = [-1.45, 1.45];
      frame.hands = pair(lerp(0.33, 0.22, t), 1.04, lerp(0.12, 0.52, t));
      frame.elbows = pair(0.56, 0.92, -0.12);
      break;
    case "pec-deck":
      seated();
      frame.forearmTwist = [-1.45, 1.45];
      flyArc(frame, lerp(1.45, -0.28, t));
      break;
    case "push-up":
      frame.openHands = true;
      frame.hip = [0, lerp(0.28, 0.43, t), lerp(0.04, -0.015, t)];
      frame.lean = lerp(1.38, 1.2, t);
      frame.hands = pair(0.29, 0.07, 0.61);
      frame.elbows = pair(0.58, 0.18, 0.44);
      frame.feet = pair(0.12, 0.072, -0.81);
      frame.knees = pair(0.12, 0.3, -0.42);
      frame.footPitch = 1.05;
      break;
    case "row":
      frame.hip = [0, 0.85, -0.18];
      frame.lean = 0.9;
      frame.hands = pair(0.29, lerp(0.59, 0.98, t), lerp(0.49, 0.22, t));
      frame.elbows = pair(0.51, 1.07, -0.14);
      if (c.id === "dumbbell_row") {
        frame.supportHand = "R";
        frame.hands[1] = [-0.26, 0.68, 0.43];
        frame.feet[1] = [-0.25, 0.48, -0.5];
      }
      if (c.id === "incline_dumbbell_row") {
        frame.hip[1] = 0.76;
        frame.lean = 0.95;
      }
      if (c.id === "underhand_barbell_row") frame.forearmTwist = [-1.45, 1.45];
      break;
    case "seated-row":
      seated();
      frame.lean = 0.05;
      frame.feet = pair(0.19, 0.16, 0.71);
      frame.hands = pair(0.18, 1.0, lerp(0.54, 0.16, t));
      frame.elbows = pair(0.42, 1.01, -0.24);
      break;
    case "pulldown":
      seated();
      frame.lean = -0.08;
      frame.hands = pair(
        c.id === "close_grip_pulldown"
          ? 0.11
          : c.id === "underhand_pulldown"
            ? 0.24
            : 0.4,
        lerp(1.62, 1.03, t),
        0.11,
      );
      if (c.id === "underhand_pulldown") frame.forearmTwist = [-1.45, 1.45];
      frame.elbows = pair(0.64, 1.03, 0.04);
      break;
    case "pull-up":
      frame.fixedGrips = true;
      frame.hip = [0, lerp(1.11, 1.44, t), -0.06];
      frame.hands = pair(
        c.id === "wide_pull_up" ? 0.47 : c.id === "chin_up" ? 0.23 : 0.36,
        2.12,
        0.05,
      );
      frame.elbows = pair(0.65, 1.6, -0.1);
      if (c.id === "chin_up") frame.forearmTwist = [-1.45, 1.45];
      if (c.id === "neutral_grip_pull_up") frame.forearmTwist = [-0.72, 0.72];
      frame.feet = pair(0.13, lerp(0.22, 0.55, t), -0.14);
      frame.footPitch = 0.6;
      break;
    case "shoulder-press": {
      const sitting = !["overhead_press", "standing_dumbbell_press"].includes(
        c.id,
      );
      if (sitting) seated();
      const offset = sitting ? -0.37 : 0;
      const shoulderHeightGrip = [
        "dumbbell_shoulder_press",
        "neutral_dumbbell_shoulder_press",
        "standing_dumbbell_press",
      ].includes(c.id);
      frame.hands = pair(
        lerp(shoulderHeightGrip ? 0.38 : 0.33, 0.22, t),
        lerp(
          shoulderHeightGrip ? 1.66 : 1.4,
          shoulderHeightGrip ? 1.99 : 1.94,
          t,
        ) + offset,
        0.1,
      );
      frame.elbows = pair(
        0.6,
        (shoulderHeightGrip ? 1.4 : 1.15) + offset,
        -0.12,
      );
      if (c.id === "arnold_press") {
        frame.hands = pair(
          lerp(0.15, 0.22, t),
          lerp(1.0, 1.57, t),
          lerp(0.24, 0.1, t),
        );
        frame.forearmTwist = [-1.45 * (1 - t), 1.45 * (1 - t)];
      }
      if (c.id.includes("neutral")) frame.forearmTwist = [-1.45, 1.45];
      break;
    }
    case "lateral-raise":
      for (const [i, side] of (["L", "R"] as const).entries()) {
        const base = shoulder(frame, side),
          sign = side === "L" ? 1 : -1,
          angle = lerp(0.08, 1.5, t);
        frame.hands[i] = plus(base, [
          sign * 0.5 * Math.sin(angle),
          -0.5 * Math.cos(angle),
          0.04,
        ]);
        frame.elbows[i] = plus(base, [
          sign * 0.25 * Math.sin(angle),
          -0.25 * Math.cos(angle),
          0.3,
        ]);
      }
      break;
    case "reverse-fly":
      if (c.id === "reverse_fly") seated();
      else if (c.id === "dumbbell_reverse_fly") {
        frame.hip[1] = 0.81;
        frame.lean = 0.98;
      }
      flyArc(frame, lerp(0.1, 1.5, t));
      break;
    case "curl":
      frame.forearmTwist =
        c.id.includes("hammer") || c.id === "cable_rope_curl"
          ? [0, 0]
          : c.id === "reverse_barbell_curl"
            ? [1.45, -1.45]
            : [-1.45, 1.45];
      if (
        [
          "biceps_machine",
          "incline_dumbbell_curl",
          "preacher_ez_curl",
          "preacher_dumbbell_curl",
          "concentration_curl",
        ].includes(c.id)
      )
        seated();
      frame.lean = c.id === "incline_dumbbell_curl" ? -0.18 : 0;
      frame.hands = pair(
        0.24,
        lerp(0.96, 1.34, t) + (frame.hip[1] < 0.6 ? -0.37 : 0),
        lerp(0.18, 0.3, t),
      );
      frame.elbows = pair(0.23, frame.hip[1] + 0.28, -0.02);
      if (c.id.includes("preacher")) {
        frame.hands = pair(0.22, lerp(0.66, 0.97, t), lerp(0.56, 0.37, t));
        frame.elbows = pair(0.23, 0.86, 0.24);
      }
      if (c.id === "concentration_curl") {
        frame.lean = 0.35;
        frame.hands[0] = [0.1, lerp(0.34, 0.67, t), lerp(0.4, 0.46, t)];
        frame.elbows[0] = [0.2, 0.64, 0.24];
      }
      if (c.id === "spider_curl") {
        frame.hip[1] = 0.76;
        frame.lean = 0.95;
        frame.hands = pair(0.24, lerp(0.39, 0.76, t), lerp(0.56, 0.72, t));
        frame.elbows = pair(0.26, 0.81, 0.36);
      }
      break;
    case "pushdown":
      frame.forearmTwist = c.id.includes("rope") ? [0, 0] : [1.45, -1.45];
      frame.lean = 0.1;
      frame.hands = pair(0.105, lerp(1.24, 0.94, t), lerp(0.29, 0.15, t));
      frame.elbows = pair(0.21, 1.14, -0.1);
      break;
    case "overhead-extension":
      frame.lean = 0.1;
      frame.feet = [
        [0.18, 0.072, 0.19],
        [-0.18, 0.072, -0.19],
      ];
      frame.hands = pair(0.09, lerp(1.64, 1.96, t), lerp(-0.2, 0.18, t));
      frame.elbows = pair(0.2, 1.84, 0.06);
      break;
    case "squat":
    case "hack-squat":
      frame.hip = [0, lerp(0.57, 0.924, t), lerp(-0.25, -0.05, t)];
      frame.lean = family === "hack-squat" ? -0.13 : lerp(0.29, 0.04, t);
      frame.feet = pair(0.23, 0.072, 0.11);
      frame.hands =
        c.id === "goblet_squat"
          ? pair(0.1, frame.hip[1] + 0.43, 0.23)
          : pair(0.4, frame.hip[1] + 0.48, -0.08);
      frame.elbows = pair(0.46, frame.hip[1] + 0.2, -0.21);
      if (["front_squat", "dumbbell_front_squat"].includes(c.id)) {
        frame.hands = pair(0.25, frame.hip[1] + 0.49, 0.2);
        frame.elbows = pair(0.26, frame.hip[1] + 0.4, 0.65);
        frame.forearmTwist = [-0.7, 0.7];
      }
      if (c.id === "bodyweight_squat") {
        frame.hands = pair(0.23, frame.hip[1] + 0.4, 0.5);
        frame.elbows = pair(0.35, frame.hip[1] + 0.25, 0.7);
        frame.openHands = true;
      }
      break;
    case "split-squat":
      frame.hip = [0, lerp(0.64, 0.94, t), -0.02];
      frame.lean = 0.07;
      frame.feet = [
        [0.17, 0.072, 0.36],
        [-0.16, c.id === "bulgarian_split_squat" ? 0.39 : 0.072, -0.55],
      ];
      frame.knees = [
        [0.16, 0.43, 0.75],
        [-0.16, 0.35, -0.1],
      ];
      frame.hands = pair(0.25, frame.hip[1] + 0.05, 0.01);
      break;
    case "hinge":
    case "deadlift":
      frame.hip = [
        0,
        lerp(family === "deadlift" ? 0.57 : 0.81, 0.924, t),
        lerp(-0.22, -0.05, t),
      ];
      frame.lean = lerp(family === "deadlift" ? 0.65 : 0.99, 0.02, t);
      frame.hands = pair(
        0.26,
        lerp(family === "deadlift" ? 0.25 : 0.44, 0.91, t),
        0.16,
      );
      frame.elbows = pair(0.29, 0.8, 0.35);
      frame.feet = pair(c.id === "sumo_deadlift" ? 0.37 : 0.2, 0.072, 0.04);
      if (c.id === "single_leg_romanian_deadlift") {
        frame.feet[1] = [-0.17, lerp(0.62, 0.072, t), lerp(-0.64, -0.04, t)];
        frame.knees[1] = [-0.17, 0.5, -0.5];
      }
      if (c.id === "rack_pull") {
        frame.hip[1] = lerp(0.81, 0.924, t);
        frame.lean = lerp(0.6, 0.02, t);
        frame.hands = pair(0.26, lerp(0.55, 0.91, t), 0.16);
      }
      break;
    case "leg-press":
      frame.hip = [0, 0.39, -0.22];
      frame.lean = -0.57;
      frame.feet = pair(0.2, lerp(0.72, 0.88, t), lerp(0.29, 0.64, t));
      frame.knees = pair(0.22, 0.99, 0.35);
      frame.footPitch = -2.1;
      frame.hands = pair(0.26, 0.4, -0.1);
      frame.elbows = pair(0.46, 0.53, -0.2);
      break;
    case "leg-extension":
    case "seated-curl": {
      seated();
      const p = family === "leg-extension" ? t : 1 - t;
      frame.feet = pair(0.16, lerp(0.11, 0.56, p), lerp(0.34, 0.75, p));
      frame.hands = pair(0.3, 0.57, -0.02);
      frame.elbows = pair(0.43, 0.85, -0.12);
      break;
    }
    case "lying-curl":
      frame.hip = [0, 0.64, -0.03];
      frame.lean = Math.PI / 2;
      frame.feet = pair(0.15, lerp(0.62, 1.03, t), lerp(-0.81, -0.34, t));
      frame.knees = pair(0.15, 0.6, -0.45);
      frame.footPitch = 0.3;
      frame.hands = pair(0.26, 0.45, 0.7);
      frame.elbows = pair(0.4, 0.52, 0.5);
      break;
    case "hip-thrust": {
      frame.hip = [0, lerp(0.34, 0.61, t), 0.03];
      frame.lean = Math.atan2(-0.46, 0.55 - frame.hip[1]);
      frame.feet = pair(0.22, 0.072, 0.46);
      frame.knees = pair(0.23, 0.58, 0.57);
      if (c.id === "glute_bridge") {
        frame.hip[1] = lerp(0.14, 0.37, t);
        frame.lean = Math.atan2(-0.46, 0.13 - frame.hip[1]);
      }
      frame.hands = pair(
        c.id === "dumbbell_hip_thrust" ? 0.1 : 0.28,
        frame.hip[1] + 0.04,
        0.11,
      );
      frame.elbows = pair(0.39, 0.43, 0.22);
      break;
    }
    case "abduction":
      seated();
      frame.feet = pair(
        lerp(0.13, 0.43, c.pattern === "hip-adduction" ? 1 - t : t),
        0.1,
        0.4,
      );
      frame.knees = pair(
        lerp(0.17, 0.48, c.pattern === "hip-adduction" ? 1 - t : t),
        0.55,
        0.6,
      );
      frame.hands = pair(0.3, 0.58, -0.01);
      break;
    case "kickback":
      frame.lean = 0.18;
      frame.hands = pair(0.27, 1.12, 0.56);
      frame.feet = [
        [0.16, 0.072, 0.08],
        [-0.17, lerp(0.1, 0.32, t), lerp(-0.09, -0.56, t)],
      ];
      break;
    case "back-extension":
      frame.hip = [0, 0.86, -0.04];
      frame.lean = lerp(1.05, 0.1, t);
      frame.feet = pair(0.17, 0.16, -0.4);
      frame.knees = pair(0.17, 0.48, -0.1);
      frame.handsAtHead = true;
      break;
    case "calf":
      if (seatedCalf(c)) seated();
      else frame.hip[1] += 0.055 * t;
      frame.feet = pair(0.17, 0.072 + 0.055 * t, seatedCalf(c) ? 0.43 : 0.03);
      frame.footPitch = 0.45 * t;
      frame.hands = seatedCalf(c)
        ? pair(0.23, 0.63, 0.28)
        : c.mode === "dumbbell"
          ? pair(0.25, 0.96 + 0.055 * t, 0.06)
          : pair(0.29, 1.39 + 0.055 * t, 0.11);
      break;
    case "pallof":
      frame.hands = pair(0.075, 1.27, lerp(0.13, 0.5, t));
      frame.elbows = pair(0.38, 1.15, -0.08);
      break;
    case "crunch":
      frame.hip = [0, 0.51, 0.0];
      frame.lean = 0.13;
      frame.spineBend = 0.65 * t;
      frame.feet = pair(0.18, 0.1, -0.41);
      frame.knees = pair(0.18, 0.08, 0.12);
      frame.handsAtHead = true;
      break;
    case "knee-raise":
      frame.fixedGrips = true;
      frame.hip = [0, 1.17, -0.05];
      frame.hands = pair(0.35, 2.12, 0.05);
      frame.elbows = pair(0.55, 1.8, 0.11);
      frame.feet = pair(0.14, lerp(0.31, 0.92, t), lerp(0.01, 0.43, t));
      frame.knees = pair(0.15, 1.3, 0.65);
      frame.footPitch = 0.8;
      break;
    case "bench-fly":
      frame.hip = [0, 0.56, 0.05];
      frame.lean = c.id.includes("incline") ? -1.05 : -Math.PI / 2;
      flyArc(frame, lerp(1.45, -0.28, t));
      break;
    case "cable-fly": {
      const low = c.id === "low_cable_fly",
        high = c.id === "high_cable_fly";
      frame.feet = [
        [0.18, 0.072, 0.19],
        [-0.18, 0.072, -0.19],
      ];
      flyArc(
        frame,
        lerp(1.35, -0.28, t),
        low ? lerp(-0.5, 0.12, t) : high ? lerp(0.15, -0.55, t) : -0.06,
      );
      break;
    }
    case "dip":
      frame.hip = [0, lerp(0.9, 1.14, t), -0.01];
      frame.lean = 0.15;
      frame.hands = pair(0.32, 1.1, 0.07);
      frame.elbows = pair(0.49, 1.28, -0.34);
      frame.feet = pair(0.14, lerp(0.17, 0.41, t), -0.17);
      frame.footPitch = 0.4;
      break;
    case "face-pull":
      frame.hands = pair(
        lerp(0.15, 0.31, t),
        lerp(1.36, 1.49, t),
        lerp(0.54, 0.06, t),
      );
      frame.elbows = pair(0.6, 1.43, -0.17);
      break;
    case "straight-arm-pull": {
      const angle = lerp(0.9, 2.82, t);
      frame.lean = 0.1;
      frame.hands = pair(
        0.23,
        1.4 + 0.48 * Math.cos(angle),
        0.05 + 0.48 * Math.sin(angle),
      );
      frame.elbows = pair(0.47, 1.25, 0.64);
      break;
    }
    case "pullover": {
      const angle = lerp(-1.4, 0, t);
      frame.hip = [0, 0.56, 0.05];
      frame.lean = -Math.PI / 2;
      frame.hands = pair(
        0.065,
        0.56 + 0.51 * Math.cos(angle),
        -0.43 + 0.51 * Math.sin(angle),
      );
      frame.elbows = pair(0.34, 0.68, -0.78);
      break;
    }
    case "front-raise":
      frame.hands = pair(
        0.23,
        1.4 - 0.48 * Math.cos((t * Math.PI) / 2),
        0.04 + 0.48 * Math.sin((t * Math.PI) / 2),
      );
      frame.elbows = pair(0.43, 1.08, 0.55);
      break;
    case "upright-row":
      frame.hands = pair(0.22, lerp(0.95, 1.34, t), 0.17);
      frame.elbows = pair(0.62, 1.43, -0.05);
      frame.forearmTwist = [1.4, -1.4];
      break;
    case "shrug":
      frame.shoulderLift = 0.045 * t;
      frame.hands = pair(0.25, 0.94 + 0.045 * t, 0.12);
      frame.elbows = pair(0.42, 1.15, 0.35);
      break;
    case "lying-extension":
      frame.hip = [0, 0.56, 0.05];
      frame.lean = -Math.PI / 2;
      frame.hands = pair(0.18, lerp(0.68, 1.11, t), lerp(-0.79, -0.38, t));
      frame.elbows = pair(0.25, 1.1, -0.52);
      break;
    case "triceps-kickback":
      frame.hip = [0, 0.85, -0.18];
      frame.lean = 0.9;
      frame.supportHand = "R";
      frame.hands = [
        [0.25, lerp(0.65, 0.98, t), lerp(0.02, -0.24, t)],
        [-0.26, 0.68, 0.43],
      ];
      frame.elbows = [
        [0.27, 1.08, -0.18],
        [-0.42, 0.85, 0.29],
      ];
      frame.feet[1] = [-0.25, 0.48, -0.5];
      break;
    case "step-up":
      frame.hip = [0, lerp(0.79, 1.18, t), 0.0];
      frame.lean = 0.08;
      frame.feet = [
        [0.17, 0.32, 0.34],
        [-0.17, lerp(0.072, 0.32, t), lerp(-0.27, 0.14, t)],
      ];
      frame.knees = [
        [0.17, 0.73, 0.62],
        [-0.17, 0.66, 0.2],
      ];
      frame.hands = pair(0.25, frame.hip[1] + 0.04, 0.04);
      break;
    case "reverse-crunch":
      frame.hip = [0, 0.14 + 0.04 * t, 0];
      frame.lean = -Math.PI / 2;
      frame.feet = pair(0.14, lerp(0.19, 0.58, t), lerp(0.58, 0.11, t));
      frame.knees = pair(0.16, 0.66, 0.28);
      frame.hands = pair(0.3, 0.1, 0.06);
      frame.elbows = pair(0.42, 0.18, -0.24);
      frame.openHands = true;
      break;
    case "plank":
      frame.hip = [0, 0.43, -0.015];
      frame.lean = 1.2;
      frame.openHands = true;
      frame.hands = pair(0.29, 0.07, 0.61);
      frame.elbows = pair(0.58, 0.18, 0.44);
      frame.feet = pair(0.12, 0.072, -0.81);
      frame.knees = pair(0.12, 0.3, -0.42);
      frame.footPitch = 1.05;
      break;
  }
  if (
    singleArm(c) &&
    !["dumbbell_row", "triceps-kickback"].includes(c.id) &&
    family !== "triceps-kickback"
  ) {
    frame.hands[1] = [-0.27, frame.hip[1] + 0.06, 0.12];
    frame.elbows[1] = [-0.42, frame.hip[1] + 0.23, -0.06];
  }
  if (c.id === "single_leg_press") {
    frame.feet[1] = [-0.27, 0.19, -0.03];
    frame.knees[1] = [-0.35, 0.62, 0.25];
  }
  if (["single_leg_extension", "single_leg_curl"].includes(c.id))
    frame.feet[1] = [-0.19, 0.072, 0.4];
  if (c.id === "hanging_leg_raise") {
    const angle = (t * Math.PI) / 2;
    frame.feet = pair(
      0.14,
      1.167 - 0.87 * Math.cos(angle),
      -0.001 + 0.87 * Math.sin(angle),
    );
    frame.knees = pair(
      0.15,
      1.167 - 0.4 * Math.cos(angle) + 0.2 * Math.sin(angle),
      -0.001 + 0.4 * Math.sin(angle) + 0.2 * Math.cos(angle),
    );
  }
  if (c.id === "wide_cable_row")
    frame.hands = pair(0.36, 1.04, lerp(0.54, 0.16, t));
  if (c.id === "machine_high_row") {
    frame.hands = pair(0.34, lerp(1.4, 1.02, t), lerp(0.47, 0.14, t));
    frame.elbows = pair(0.5, 1.03, -0.2);
  }
  if (c.id === "barbell_reverse_lunge") {
    frame.hands = pair(0.4, frame.hip[1] + 0.48, -0.08);
    frame.elbows = pair(0.46, frame.hip[1] + 0.2, -0.21);
  }
  if (c.id === "trap_bar_deadlift")
    frame.hands = pair(0.36, frame.hands[0][1], 0.0);
  if (c.id === "leaning_dumbbell_lateral_raise") {
    frame.supportHand = "R";
    frame.hands[1] = [-0.36, 1.35, 0.07];
  }
  return frame;
}
