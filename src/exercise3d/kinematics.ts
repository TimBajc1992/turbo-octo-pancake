import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";

export const jointLimits = {
  elbow: { min: MathUtils.degToRad(6), max: MathUtils.degToRad(145) },
  knee: { min: MathUtils.degToRad(2), max: MathUtils.degToRad(150) },
  forearmTwist: MathUtils.degToRad(85),
  wristSupportExtension: MathUtils.degToRad(75),
} as const;

/** Two rigid segments, one hinge. Flexion is measured from a straight limb.
 * The pole defines the positive bend side, including at full extension.
 * Unreachable targets are projected onto the joint's permitted reach shell.
 */
export function solveHinge(
  start: Vector3,
  target: Vector3,
  pole: Vector3,
  a: number,
  b: number,
  limits = jointLimits.elbow as { min: number; max: number },
) {
  const direction = target.clone().sub(start);
  if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
  const requested = direction.length();
  direction.normalize();
  const reach = (angle: number) =>
    Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(angle));
  const distance = MathUtils.clamp(
    requested,
    reach(limits.max),
    reach(limits.min),
  );
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const bend = pole
    .clone()
    .sub(start)
    .addScaledVector(direction, -pole.clone().sub(start).dot(direction));
  if (bend.lengthSq() < 1e-8) {
    // Deterministic perpendicular fallback. Never reuse an unconstrained Euler rotation.
    bend.set(
      Math.abs(direction.x) < 0.8 ? 1 : 0,
      Math.abs(direction.x) < 0.8 ? 0 : 1,
      0,
    );
    bend.addScaledVector(direction, -bend.dot(direction));
  }
  bend.normalize();
  const middle = start
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
  const end = start.clone().addScaledVector(direction, distance);
  const upper = middle.clone().sub(start).normalize();
  const lower = end.clone().sub(middle).normalize();
  const normal = upper.clone().cross(lower).normalize();
  return {
    middle,
    end,
    upper,
    lower,
    normal,
    flexion: Math.acos(MathUtils.clamp(upper.dot(lower), -1, 1)),
  };
}

function basis(direction: Vector3, normal: Vector3) {
  const y = direction.clone().normalize();
  const z = normal.clone().addScaledVector(y, -normal.dot(y)).normalize();
  const x = y.clone().cross(z).normalize();
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(x, y, z),
  );
}

/** Align both the bone and its hinge axis; a direction alone leaves twist undefined. */
export function hingeRotation(
  restDirection: Vector3,
  restNormal: Vector3,
  direction: Vector3,
  normal: Vector3,
) {
  return basis(direction, normal).multiply(
    basis(restDirection, restNormal).invert(),
  );
}
