import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Athlete } from "./rig";
import { jointLimits, solveHinge } from "./kinematics";
import { motionFor } from "./motions";
import { catalog } from "../exerciseCatalog";

describe("rigid limbs and anatomically bounded hinges", () => {
  it("projects unreachable and over-flexed targets without stretching either bone", () => {
    for (const target of [
      new Vector3(0, 10, 0),
      new Vector3(0, 0.001, 0),
      new Vector3(0, 0.3, 0.1),
    ]) {
      const start = new Vector3(),
        result = solveHinge(start, target, new Vector3(1, 0, 0), 0.27, 0.25);
      expect(result.middle.distanceTo(start)).toBeCloseTo(0.27, 8);
      expect(result.end.distanceTo(result.middle)).toBeCloseTo(0.25, 8);
      expect(result.flexion).toBeGreaterThanOrEqual(
        jointLimits.elbow.min - 1e-8,
      );
      expect(result.flexion).toBeLessThanOrEqual(jointLimits.elbow.max + 1e-8);
      expect(result.normal.length()).toBeCloseTo(1, 8);
    }
  });

  it("keeps the actual skinned rig rigid, its grips neutral, support wrists bounded and every catalogue motion continuous", async () => {
    const bytes = await readFile(
      new URL("../assets/athlete-optimized.glb", import.meta.url),
    );
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      );
    const athlete = new Athlete(gltf.scene);
    const names = [
      "upperarm01_L",
      "upperarm01_R",
      "lowerarm01_L",
      "lowerarm01_R",
      "wrist_L",
      "wrist_R",
    ];
    const restWrists = ["L", "R"].map((s) =>
      athlete.bones.get(`wrist_${s}`)!.quaternion.clone(),
    );
    const lengths = ["L", "R"].map((s) => [
      athlete
        .position(`upperarm01_${s}`)
        .distanceTo(athlete.position(`lowerarm01_${s}`)),
      athlete
        .position(`lowerarm01_${s}`)
        .distanceTo(athlete.position(`wrist_${s}`)),
    ]);
    const discontinuities: Record<string, number> = {};
    for (const candidate of catalog) {
      let previous: Quaternion[] | undefined;
      for (let i = 0; i <= 200; i++) {
        const frame = motionFor(
          candidate,
          (1 - Math.cos((i / 200) * Math.PI * 2)) / 2,
        );
        if (!frame) continue;
        athlete.pose(frame);
        for (const [index, side] of ["L", "R"].entries()) {
          const shoulder = athlete.position(`upperarm01_${side}`),
            elbow = athlete.position(`lowerarm01_${side}`),
            wrist = athlete.position(`wrist_${side}`);
          expect(shoulder.distanceTo(elbow), candidate.id).toBeCloseTo(
            lengths[index][0],
            4,
          );
          expect(elbow.distanceTo(wrist), candidate.id).toBeCloseTo(
            lengths[index][1],
            4,
          );
          const flexion = elbow
            .clone()
            .sub(shoulder)
            .angleTo(wrist.clone().sub(elbow));
          expect(flexion, candidate.id).toBeGreaterThanOrEqual(
            jointLimits.elbow.min - 0.001,
          );
          expect(flexion, candidate.id).toBeLessThanOrEqual(
            jointLimits.elbow.max + 0.001,
          );
          expect(
            athlete.bones
              .get(`wrist_${side}`)!
              .quaternion.angleTo(restWrists[index]),
            candidate.id,
          ).toBeLessThan(
            frame.openHands || frame.supportHand === side
              ? jointLimits.wristSupportExtension + 1e-6
              : 1e-6,
          );
        }
        const current = names.map((name) =>
          athlete.bones.get(name)!.getWorldQuaternion(new Quaternion()),
        );
        if (previous)
          for (const [index, q] of current.entries()) {
            const delta = q.angleTo(previous[index]);
            if (delta >= 0.25)
              discontinuities[`${candidate.id} ${names[index]}`] = Math.max(
                discontinuities[`${candidate.id} ${names[index]}`] ?? 0,
                delta,
              );
          }
        previous = current;
      }
    }
    athlete.dispose();
    expect(discontinuities).toEqual({});
  }, 30000);
});
