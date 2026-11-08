import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import modelUrl from "../assets/athlete-optimized.glb?url";
import rigData from "../assets/athlete-rig.json";
import type { Anatomy, MuscleRegion } from "../exerciseAnatomy";
import type { PoseFrame, V3 } from "./motions";
import { MuscleTint } from "./anatomy-shader";
import { hingeRotation, jointLimits, solveHinge } from "./kinematics";

let asset: Promise<T.Group> | undefined;
const v = (a: V3 | number[]) => new T.Vector3(...(a as V3));
const yRotation = (angle: number) =>
  new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), angle);
const metadata = rigData.bones as Record<
  string,
  { head: number[]; tail: number[]; parent: string | null }
>;

export async function athleteModel() {
  if (!asset) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    asset = loader.loadAsync(modelUrl).then((gltf) => gltf.scene);
    asset.catch(() => {
      asset = undefined;
    });
  }
  return asset;
}

export class Athlete {
  readonly group = new T.Group();
  readonly bones = new Map<string, T.Bone>();
  private rest = new Map<
    string,
    { q: T.Quaternion; p: T.Vector3; world: T.Quaternion; parent: T.Quaternion }
  >();
  private materials: {
    material: T.MeshStandardMaterial;
    region: string;
    base: T.Color;
  }[] = [];
  private model: T.Object3D;
  private tint = new MuscleTint();

  constructor(template: T.Group) {
    this.model = clone(template);
    this.model.updateMatrixWorld(true);
    this.model.traverse((o) => {
      if (o instanceof T.Bone) {
        this.bones.set(o.name, o);
        this.rest.set(o.name, {
          q: o.quaternion.clone(),
          p: o.position.clone(),
          world: o.getWorldQuaternion(new T.Quaternion()),
          parent:
            o.parent?.getWorldQuaternion(new T.Quaternion()) ??
            new T.Quaternion(),
        });
      }
      if (o instanceof T.Mesh) {
        o.geometry = o.geometry.clone();
        o.frustumCulled = false;
        o.castShadow = o.receiveShadow = true;
        const cloneMaterial = (material: T.Material) => {
          const m = material.clone() as T.MeshStandardMaterial;
          const region = m.name.replace(/^skin_/, "");
          if (
            !["shorts", "hair", "eyes", "iris"].includes(region) &&
            !region.startsWith("shorts_")
          ) {
            m.color.set("#bc896f");
            m.roughness = 0.62;
          }
          this.materials.push({ material: m, region, base: m.color.clone() });
          if (region === "rest" || region === "shorts") this.tint.attach(m);
          return m;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(cloneMaterial)
          : cloneMaterial(o.material);
      }
    });
    const origin = v(metadata.root.head);
    this.model.position.sub(origin);
    this.group.add(this.model);
    this.group.position.copy(origin);
    this.group.updateMatrixWorld(true);
  }

  position(name: string) {
    return this.bones.get(name)!.getWorldPosition(new T.Vector3());
  }

  private orientBone(name: string, delta: T.Quaternion) {
    const bone = this.bones.get(name)!,
      rest = this.rest.get(name)!;
    const parentWorld = bone.parent!.getWorldQuaternion(new T.Quaternion());
    bone.quaternion.copy(
      parentWorld.invert().multiply(delta).multiply(rest.world),
    );
    this.group.updateMatrixWorld(true);
  }

  private limb(side: "L" | "R", leg: boolean, target: V3, pole: V3, twist = 0) {
    const upper = leg ? "upperleg" : "upperarm",
      lower = leg ? "lowerleg" : "lowerarm";
    const joint = leg ? "foot" : "wrist";
    const first = `${upper}01_${side}`,
      middle = `${lower}01_${side}`,
      last = `${joint}_${side}`;
    const start = this.position(first);
    const a = v(metadata[middle].head).distanceTo(v(metadata[first].head));
    const b = v(metadata[last].head).distanceTo(v(metadata[middle].head));
    const solved = solveHinge(
      start,
      v(target),
      v(pole),
      a,
      b,
      leg ? jointLimits.knee : jointLimits.elbow,
    );
    const restUpper = v(metadata[middle].head)
      .sub(v(metadata[first].head))
      .normalize();
    const restLower = v(metadata[last].head)
      .sub(v(metadata[middle].head))
      .normalize();
    const restNormal = restUpper.clone().cross(restLower).normalize();
    const upperDelta = hingeRotation(
      restUpper,
      restNormal,
      solved.upper,
      solved.normal,
    );
    const lowerDelta = hingeRotation(
      restLower,
      restNormal,
      solved.lower,
      solved.normal,
    );
    // Subdivided skin bones share ONE rigid segment transform. Previously each
    // half sought its own target, introducing extra bends and arbitrary roll.
    this.orientBone(first, upperDelta);
    this.orientBone(`${upper}02_${side}`, upperDelta);
    this.orientBone(middle, lowerDelta);
    const pronation = T.MathUtils.clamp(
      twist,
      -jointLimits.forearmTwist,
      jointLimits.forearmTwist,
    );
    const rolled = new T.Quaternion()
      .setFromAxisAngle(solved.lower, pronation)
      .multiply(lowerDelta);
    this.orientBone(`${lower}02_${side}`, rolled);
    // Wrist local rotation stays in the neutral rest pose. Grip rotation comes
    // from bounded forearm pronation, never from an independently spinning wrist.
    if (!leg) this.bones.get(last)!.quaternion.copy(this.rest.get(last)!.q);
  }

  pose(frame: PoseFrame) {
    for (const [name, bone] of this.bones) {
      const rest = this.rest.get(name)!;
      bone.quaternion.copy(rest.q);
      bone.position.copy(rest.p);
    }
    this.group.position.fromArray(frame.hip);
    this.group.quaternion.copy(yRotation(frame.lean));
    if (frame.spineBend) {
      for (const name of [
        "spine05",
        "spine04",
        "spine03",
        "spine02",
        "spine01",
      ])
        this.bones
          .get(name)!
          .quaternion.multiply(yRotation(frame.spineBend / 5));
    }
    this.group.updateMatrixWorld(true);
    if (frame.shoulderLift) {
      for (const side of ["L", "R"]) {
        const bone = this.bones.get(`shoulder01_${side}`)!;
        const lift = new T.Vector3(0, frame.shoulderLift, 0).applyQuaternion(
          bone.parent!.getWorldQuaternion(new T.Quaternion()).invert(),
        );
        bone.position.add(lift);
      }
      this.group.updateMatrixWorld(true);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? "L" : "R";
      this.limb(side, true, frame.feet[i], frame.knees[i]);
      const foot = this.bones.get(`foot_${side}`)!;
      const parent = foot.parent!.getWorldQuaternion(new T.Quaternion());
      foot.quaternion.copy(
        parent
          .invert()
          .multiply(yRotation(frame.footPitch))
          .multiply(this.rest.get(`foot_${side}`)!.world),
      );
      this.group.updateMatrixWorld(true);
    }
    const hands: [V3, V3] = frame.handsAtHead
      ? (() => {
          const head = this.position("head");
          return [
            [head.x + 0.11, head.y + 0.02, head.z + 0.07],
            [head.x - 0.11, head.y + 0.02, head.z + 0.07],
          ];
        })()
      : frame.hands;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? "L" : "R";
      const wristTarget = v(hands[i]);
      this.limb(
        side,
        false,
        hands[i],
        frame.elbows[i],
        frame.forearmTwist?.[i],
      );
      if (frame.fixedGrips)
        for (let pass = 0; pass < 3; pass++) {
          wristTarget.add(v(hands[i]).sub(this.position(`finger3-1_${side}`)));
          this.limb(
            side,
            false,
            wristTarget.toArray() as V3,
            frame.elbows[i],
            frame.forearmTwist?.[i],
          );
        }
      // Close the actual finger joints around handles; they remain part of the skin.
      const wrist = v(metadata[`wrist_${side}`].head);
      const palm = v(metadata[`finger2-1_${side}`].head)
        .sub(wrist)
        .cross(v(metadata[`finger5-1_${side}`].head).sub(wrist))
        .normalize();
      if (palm.dot(v(metadata[`finger1-1_${side}`].head).sub(wrist)) < 0)
        palm.negate();
      if (frame.openHands || frame.supportHand === side) {
        const bone = this.bones.get(`wrist_${side}`)!,
          rest = this.rest.get(`wrist_${side}`)!;
        const handDirection = v(metadata[`finger3-1_${side}`].head)
          .sub(wrist)
          .normalize();
        const desired = hingeRotation(
          handDirection,
          palm,
          new T.Vector3(0, 0, 1),
          new T.Vector3(0, -1, 0),
        ).multiply(rest.world);
        const local = bone
          .parent!.getWorldQuaternion(new T.Quaternion())
          .invert()
          .multiply(desired);
        const angle = rest.q.angleTo(local);
        bone.quaternion
          .copy(rest.q)
          .slerp(
            local,
            Math.min(
              1,
              jointLimits.wristSupportExtension / Math.max(angle, 1e-8),
            ),
          );
        this.group.updateMatrixWorld(true);
      }
      for (let finger = 1; finger <= 5; finger++)
        for (let part = 1; part <= 3; part++) {
          const name = `finger${finger}-${part}_${side}`;
          const bone = this.bones.get(name);
          if (bone) {
            const info = metadata[name],
              rest = this.rest.get(name)!;
            const direction = v(info.tail).sub(v(info.head)).normalize();
            const axis = direction
              .cross(palm)
              .normalize()
              .applyQuaternion(rest.world.clone().invert());
            const open = frame.openHands || frame.supportHand === side;
            bone.quaternion.multiply(
              new T.Quaternion().setFromAxisAngle(
                axis,
                open ? 0.05 : finger === 1 ? 0.65 : part === 2 ? 1.15 : 0.85,
              ),
            );
          }
        }
    }
    this.group.updateMatrixWorld(true);
  }

  highlight(anatomy: Anatomy, selected?: MuscleRegion) {
    this.tint.update(anatomy, selected);
  }

  dispose() {
    this.model.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
    });
    for (const item of this.materials) item.material.dispose();
  }
}
