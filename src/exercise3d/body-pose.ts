import rig from "../assets/athlete-rig.json";
import type { PoseFrame, V3 } from "./motions";

export function neutralBodyPose(): PoseFrame {
  return {
    family: "squat",
    hip: rig.bones.root.head as V3,
    lean: 0,
    spineBend: 0,
    footPitch: 0,
    hands: [
      [0.32, 0.91, 0.035],
      [-0.32, 0.91, 0.035],
    ],
    elbows: [
      [0.45, 1.2, -0.06],
      [-0.45, 1.2, -0.06],
    ],
    feet: [rig.bones.foot_L.head as V3, rig.bones.foot_R.head as V3],
    knees: [
      [0.16, 0.5, 0.3],
      [-0.16, 0.5, 0.3],
    ],
  };
}
