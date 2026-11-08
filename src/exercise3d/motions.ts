import type { Candidate } from "../exerciseCatalog";

export type V3 = [number, number, number];
export type ExerciseFamily =
  | "bench" | "chest-press" | "pec-deck" | "push-up"
  | "row" | "seated-row" | "pulldown" | "pull-up" | "shoulder-press"
  | "lateral-raise" | "reverse-fly" | "curl" | "pushdown" | "overhead-extension"
  | "leg-press" | "hack-squat" | "squat" | "split-squat" | "hinge" | "deadlift"
  | "leg-extension" | "seated-curl" | "lying-curl" | "hip-thrust" | "abduction"
  | "kickback" | "back-extension" | "calf" | "pallof" | "crunch" | "knee-raise";

export function exerciseFamily(c: Candidate): ExerciseFamily | undefined {
  if (c.id === "trunk_machine") return;
  if (c.id === "push_up") return "push-up";
  if (c.id === "leg_press") return "leg-press";
  if (c.id === "hack_squat") return "hack-squat";
  if (c.id === "leg_curl") return "lying-curl";
  if (c.id === "seated_leg_curl") return "seated-curl";
  if (c.id === "cable_glute_kickback") return "kickback";
  if (c.id === "back_extension") return "back-extension";
  if (["oh_extension", "dumbbell_overhead_extension"].includes(c.id)) return "overhead-extension";
  if (c.pattern === "horizontal-push") return c.mode === "barbell" || c.mode === "dumbbell" ? "bench" : "chest-press";
  if (c.pattern === "horizontal-pull") return c.mode === "barbell" || c.mode === "dumbbell" ? "row" : "seated-row";
  if (c.pattern === "vertical-pull") return c.mode === "bodyweight" || c.mode === "assisted" ? "pull-up" : "pulldown";
  const map: Record<string, ExerciseFamily> = {
    "vertical-push": "shoulder-press", "lateral-raise": "lateral-raise",
    "rear-delt": "reverse-fly", "chest-fly": "pec-deck", "elbow-flexion": "curl",
    "elbow-extension": "pushdown", "leg-push": "squat", "split-squat": "split-squat",
    "hip-hinge": "hinge", deadlift: "deadlift", "knee-extension": "leg-extension",
    "hip-extension": "hip-thrust", "hip-abduction": "abduction", calf: "calf",
    trunk: "pallof", "trunk-flexion": "crunch", "knee-raise": "knee-raise",
  };
  return map[c.pattern];
}

export type PoseFrame = {
  family: ExerciseFamily;
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
};
const pair = (x: number, y: number, z: number): [V3, V3] => [[x, y, z], [-x, y, z]];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Geometric animation only. It never supplies loads, repetitions or workout results. */
export function motionFor(c: Candidate, progress: number): PoseFrame | undefined {
  const family = exerciseFamily(c);
  if (!family) return;
  const t = Math.max(0, Math.min(1, progress));
  const frame: PoseFrame = {
    family, hip: [0, .924, -.05], lean: 0,
    hands: pair(.24, .98, .12), elbows: pair(.28, 1.15, -.18),
    feet: pair(.18, .072, .02), knees: pair(.18, .5, .55), footPitch: 0, spineBend: 0,
  };
  const seated = () => {
    frame.hip = [0, .55, -.03];
    frame.feet = pair(.19, .072, .4);
    frame.knees = pair(.2, .55, .65);
  };
  switch (family) {
    case "bench": {
      const incline = c.id.includes("incline");
      frame.hip = [0, .56, .05];
      frame.lean = incline ? -1.05 : -Math.PI / 2;
      frame.feet = pair(.26, .072, .42);
      frame.hands = pair(lerp(.32, .25, t), lerp(.74, 1.11, t), incline ? -.21 : -.34);
      frame.elbows = pair(.58, .51, -.24);
      break;
    }
    case "chest-press":
      seated(); frame.lean = -.07;
      frame.hands = pair(lerp(.33, .22, t), 1.04, lerp(.12, .52, t));
      frame.elbows = pair(.56, .92, -.12); break;
    case "pec-deck":
      seated();
      frame.hands = pair(lerp(.64, .065, t), 1.03, lerp(.10, .50, t));
      frame.elbows = pair(.56, 1.03, .24); break;
    case "push-up":
      frame.openHands = true;
      frame.hip = [0, lerp(.28, .47, t), -.02]; frame.lean = 1.37;
      frame.hands = pair(.29, .07, .61); frame.elbows = pair(.58, .18, .44);
      frame.feet = pair(.12, .072, -.66); frame.knees = pair(.12, .20, -.38);
      frame.footPitch = 1.05; break;
    case "row":
      frame.hip = [0, .85, -.18]; frame.lean = .90;
      frame.hands = pair(.29, lerp(.59, .98, t), lerp(.49, .22, t));
      frame.elbows = pair(.51, 1.07, -.14);
      if (c.id === "dumbbell_row") {
        frame.supportHand = "R";
        frame.hands[1] = [-.26, .68, .43];
        frame.feet[1] = [-.25, .48, -.50];
      }
      break;
    case "seated-row":
      seated(); frame.lean = .05;
      frame.feet = pair(.19, .16, .71);
      frame.hands = pair(.18, 1.00, lerp(.54, .16, t));
      frame.elbows = pair(.42, 1.01, -.24); break;
    case "pulldown":
      seated(); frame.lean = -.08;
      frame.hands = pair(.40, lerp(1.62, 1.03, t), .11);
      frame.elbows = pair(.64, 1.03, .04); break;
    case "pull-up":
      frame.hip = [0, lerp(1.11, 1.44, t), -.06];
      frame.hands = pair(.36, 2.12, .05); frame.elbows = pair(.65, 1.60, .05);
      frame.feet = pair(.13, lerp(.22, .55, t), -.14);
      frame.footPitch = .6; break;
    case "shoulder-press": {
      const sitting = c.id !== "overhead_press";
      if (sitting) seated();
      const offset = sitting ? -.37 : 0;
      frame.hands = pair(lerp(.33, .22, t), lerp(1.40, 1.94, t) + offset, .10);
      frame.elbows = pair(.60, 1.15 + offset, .02); break;
    }
    case "lateral-raise":
      frame.hands = pair(lerp(.23, .72, t), lerp(.97, 1.39, t), .09);
      frame.elbows = pair(.5, 1.13, .18); break;
    case "reverse-fly":
      if (c.id === "reverse_fly") seated();
      else if (c.id === "dumbbell_reverse_fly") { frame.hip[1] = .81; frame.lean = .98; }
      frame.hands = pair(lerp(.10, .67, t), c.id === "reverse_fly" ? 1.03 : c.id === "dumbbell_reverse_fly" ? .82 : 1.39, lerp(.50, -.03, t));
      frame.elbows = pair(.5, frame.hands[0][1] - .04, .18); break;
    case "curl":
      if (["biceps_machine", "incline_dumbbell_curl"].includes(c.id)) seated();
      frame.lean = c.id === "incline_dumbbell_curl" ? -.18 : 0;
      frame.hands = pair(.24, lerp(.96, 1.34, t) + (frame.hip[1] < .6 ? -.37 : 0), lerp(.18, .30, t));
      frame.elbows = pair(.23, frame.hip[1] + .28, -.02); break;
    case "pushdown":
      frame.lean = .10;
      frame.hands = pair(.105, lerp(1.24, .94, t), lerp(.29, .15, t));
      frame.elbows = pair(.21, 1.14, -.10); break;
    case "overhead-extension":
      frame.lean = .10;
      frame.feet = [[.18, .072, .19], [-.18, .072, -.19]];
      frame.hands = pair(.09, lerp(1.64, 1.96, t), lerp(-.20, .18, t));
      frame.elbows = pair(.20, 1.84, .06); break;
    case "squat":
    case "hack-squat":
      frame.hip = [0, lerp(.57, .924, t), lerp(-.25, -.05, t)];
      frame.lean = family === "hack-squat" ? -.13 : lerp(.29, .04, t);
      frame.feet = pair(.23, .072, .11);
      frame.hands = c.id === "goblet_squat" ? pair(.10, frame.hip[1] + .43, .23) : pair(.40, frame.hip[1] + .48, -.08);
      frame.elbows = pair(.46, frame.hip[1] + .20, -.21); break;
    case "split-squat":
      frame.hip = [0, lerp(.64, .94, t), -.02]; frame.lean = .07;
      frame.feet = [[.17, .072, .36], [-.16, c.id === "bulgarian_split_squat" ? .39 : .072, -.55]];
      frame.knees = [[.16, .43, .75], [-.16, .35, -.10]];
      frame.hands = pair(.25, frame.hip[1] + .05, .01); break;
    case "hinge":
    case "deadlift":
      frame.hip = [0, lerp(family === "deadlift" ? .57 : .81, .924, t), lerp(-.22, -.05, t)];
      frame.lean = lerp(family === "deadlift" ? .65 : .99, .02, t);
      frame.hands = pair(.26, lerp(family === "deadlift" ? .25 : .44, .91, t), .16);
      frame.elbows = pair(.29, .8, .35); frame.feet = pair(.20, .072, .04); break;
    case "leg-press":
      frame.hip = [0, .39, -.22]; frame.lean = -.57;
      frame.feet = pair(.20, lerp(.72, .88, t), lerp(.29, .64, t));
      frame.knees = pair(.22, .99, .35); frame.footPitch = -2.1;
      frame.hands = pair(.26, .40, -.10); frame.elbows = pair(.46, .53, -.20); break;
    case "leg-extension":
    case "seated-curl": {
      seated(); const p = family === "leg-extension" ? t : 1 - t;
      frame.feet = pair(.16, lerp(.11, .56, p), lerp(.34, .75, p));
      frame.hands = pair(.30, .57, -.02); frame.elbows = pair(.43, .85, -.12); break;
    }
    case "lying-curl":
      frame.hip = [0, .64, -.03]; frame.lean = Math.PI / 2;
      frame.feet = pair(.15, lerp(.62, 1.03, t), lerp(-.81, -.34, t));
      frame.knees = pair(.15, .60, -.45); frame.footPitch = .3;
      frame.hands = pair(.26, .45, .70); frame.elbows = pair(.40, .52, .50); break;
    case "hip-thrust": {
      frame.hip = [0, lerp(.34, .61, t), .03];
      frame.lean = Math.atan2(-.46, .55 - frame.hip[1]);
      frame.feet = pair(.22, .072, .46); frame.knees = pair(.23, .58, .57);
      frame.hands = pair(.28, frame.hip[1] + .04, .11); frame.elbows = pair(.39, .43, .22); break;
    }
    case "abduction":
      seated(); frame.feet = pair(lerp(.13, .43, t), .10, .40);
      frame.knees = pair(lerp(.17, .48, t), .55, .60);
      frame.hands = pair(.30, .58, -.01); break;
    case "kickback":
      frame.lean = .18; frame.hands = pair(.27, 1.12, .56);
      frame.feet = [[.16, .072, .08], [-.17, lerp(.10, .32, t), lerp(-.09, -.56, t)]]; break;
    case "back-extension":
      frame.hip = [0, .86, -.04]; frame.lean = lerp(1.05, .10, t);
      frame.feet = pair(.17, .16, -.40); frame.knees = pair(.17, .48, -.10);
      frame.handsAtHead = true; break;
    case "calf":
      if (c.id === "seated_calf") seated();
      else frame.hip[1] += .055 * t;
      frame.feet = pair(.17, .072 + .055 * t, c.id === "seated_calf" ? .43 : .03);
      frame.footPitch = .45 * t;
      frame.hands = c.id === "seated_calf" ? pair(.23, .63, .28) : pair(.29, 1.39 + .055 * t, .11); break;
    case "pallof":
      frame.hands = pair(.075, 1.27, lerp(.13, .50, t));
      frame.elbows = pair(.38, 1.15, -.08); break;
    case "crunch":
      frame.hip = [0, .51, .0]; frame.lean = .13; frame.spineBend = .65 * t;
      frame.feet = pair(.18, .10, -.41); frame.knees = pair(.18, .08, .12);
      frame.handsAtHead = true; break;
    case "knee-raise":
      frame.hip = [0, 1.17, -.05]; frame.hands = pair(.35, 2.12, .05);
      frame.elbows = pair(.55, 1.80, .11);
      frame.feet = pair(.14, lerp(.31, .92, t), lerp(.01, .43, t));
      frame.knees = pair(.15, 1.3, .65); frame.footPitch = .8; break;
  }
  return frame;
}
