import { ExerciseScene } from "./scene";
import { byId } from "../exerciseCatalog";

/** Shared anatomy, lighting and skeletal posture; no exercise data is stored. */
export class BodyScene extends ExerciseScene {
  constructor(container: HTMLElement, transparent = false) {
    super(container, byId("bodyweight_squat")!, { body: true, transparent });
  }
}
