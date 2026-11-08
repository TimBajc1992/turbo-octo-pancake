import * as T from "three";
import type { Candidate } from "../exerciseCatalog";
import type { Athlete } from "./rig";
import type { ExerciseFamily, PoseFrame, V3 } from "./motions";
import { seatedCalf, singleArm, singleWeight } from "./motions";

const up = new T.Vector3(0, 1, 0);
const vector = (p: V3) => new T.Vector3(...p);
const midpoint = (a: T.Vector3, b: T.Vector3) =>
  a.clone().add(b).multiplyScalar(0.5);

/** Original gym equipment. Moving handles/cables attach to the actual skinned hands. */
export class Equipment {
  readonly group = new T.Group();
  private animate: (() => void)[] = [];
  private progress = 0;
  private frame!: PoseFrame;
  private metal = new T.MeshStandardMaterial({
    color: "#969ba3",
    metalness: 0.27,
    roughness: 0.45,
  });
  private dark = new T.MeshStandardMaterial({
    color: "#242a32",
    metalness: 0.45,
    roughness: 0.54,
  });
  private rubber = new T.MeshStandardMaterial({
    color: "#161a20",
    roughness: 0.88,
  });
  private padMaterial = new T.MeshStandardMaterial({
    color: "#25303c",
    roughness: 0.79,
  });
  private bolt = new T.MeshStandardMaterial({
    color: "#a9adb3",
    metalness: 0.83,
    roughness: 0.25,
  });
  private cableMaterial = new T.LineBasicMaterial({ color: "#9aa3ae" });
  private cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  private box = new T.BoxGeometry(1, 1, 1);

  constructor(
    readonly candidate: Candidate,
    readonly family: ExerciseFamily,
    private athlete: Athlete,
  ) {
    this.build();
  }
  private mesh(geometry: T.BufferGeometry, material: T.Material) {
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  private block(position: V3, size: V3, material = this.metal, angle = 0) {
    const m = this.mesh(this.box, material);
    m.position.fromArray(position);
    m.scale.fromArray(size);
    m.rotation.x = angle;
    return m;
  }
  private rod(a: V3, b: V3, radius = 0.022, material = this.metal) {
    const m = this.mesh(this.cylinder, material);
    this.setRod(m, vector(a), vector(b), radius);
    return m;
  }
  private setRod(m: T.Mesh, a: T.Vector3, b: T.Vector3, radius: number) {
    const delta = b.clone().sub(a);
    m.position.copy(midpoint(a, b));
    m.quaternion.setFromUnitVectors(up, delta.clone().normalize());
    m.scale.set(radius, Math.max(0.001, delta.length()), radius);
  }
  private link(
    a: () => T.Vector3,
    b: () => T.Vector3,
    radius = 0.018,
    material = this.metal,
  ) {
    const m = this.rod([0, 0, 0], [0, 1, 0], radius, material);
    this.animate.push(() => this.setRod(m, a(), b(), radius));
    return m;
  }
  private cable(a: () => T.Vector3, b: () => T.Vector3) {
    const geometry = new T.BufferGeometry().setFromPoints([
      new T.Vector3(),
      new T.Vector3(),
    ]);
    const line = new T.Line(geometry, this.cableMaterial);
    this.group.add(line);
    this.animate.push(() => {
      const points = geometry.getAttribute("position");
      const x = a(),
        y = b();
      points.setXYZ(0, x.x, x.y, x.z);
      points.setXYZ(1, y.x, y.y, y.z);
      points.needsUpdate = true;
      geometry.computeBoundingSphere();
    });
  }
  private hand(side: "L" | "R") {
    return this.athlete.position(`finger3-1_${side}`);
  }
  private hands() {
    return midpoint(this.hand("L"), this.hand("R"));
  }
  private gripAxis(side: "L" | "R") {
    return this.athlete
      .position(`finger2-1_${side}`)
      .sub(this.athlete.position(`finger5-1_${side}`))
      .normalize();
  }
  private movingHandle(side: "L" | "R", radius = 0.014) {
    this.link(
      () => this.hand(side).addScaledVector(this.gripAxis(side), -0.09),
      () => this.hand(side).addScaledVector(this.gripAxis(side), 0.09),
      radius,
      this.rubber,
    );
  }
  private pulley(position: V3) {
    const wheel = this.mesh(
      new T.TorusGeometry(0.055, 0.011, 8, 20),
      this.dark,
    );
    wheel.position.fromArray(position);
    wheel.rotation.y = Math.PI / 2;
    this.rod(
      [position[0] - 0.06, position[1], position[2]],
      [position[0] + 0.06, position[1], position[2]],
      0.012,
      this.bolt,
    );
  }
  private foot(position: V3) {
    this.block(position, [0.1, 0.04, 0.18], this.rubber);
  }
  private base(width = 1.1, depth = 1.1, z = 0.1) {
    for (const x of [-width / 2, width / 2]) {
      this.block([x, 0.06, z], [0.07, 0.08, depth], this.dark);
      for (const edge of [-depth / 2, depth / 2])
        this.foot([x, 0.035, z + edge]);
    }
    this.block([0, 0.07, z + depth / 2 - 0.1], [width, 0.07, 0.07]);
  }
  private stack(x: number, z: number, height = 1.9) {
    for (const offset of [-0.105, 0.105])
      this.rod(
        [x + offset, 0.12, z],
        [x + offset, height, z],
        0.011,
        this.bolt,
      );
    for (let i = 0; i < 12; i++)
      this.block([x, 0.13 + i * 0.027, z], [0.27, 0.022, 0.17], this.dark);
    const top = this.block([x, 0.48, z], [0.28, 0.09, 0.18], this.dark);
    this.animate.push(() => {
      top.position.y = 0.48 + this.progress * 0.18;
    });
    this.rod([x, 0.53, z], [x, height, z], 0.004, this.dark);
  }
  private seat(z = -0.02, back = true) {
    this.block([0, 0.455, z], [0.38, 0.085, 0.43], this.padMaterial);
    this.block([0, 0.25, z], [0.07, 0.4, 0.07]);
    this.block([0, 0.07, z], [0.78, 0.08, 0.68], this.dark);
    if (back) {
      this.block(
        [0, 0.91, z - 0.18],
        [0.29, 0.78, 0.075],
        this.padMaterial,
        -0.07,
      );
      this.rod([0, 0.15, z - 0.24], [0, 1.3, z - 0.24], 0.026);
    }
  }
  private bench(incline = false, z = -0.25, height = 0.5) {
    this.block(
      [0, height, z],
      [0.32, 0.085, 0.98],
      this.padMaterial,
      incline ? -0.48 : 0,
    );
    for (const edge of [-0.55, 0.12]) {
      this.block([0, height / 2, z + edge], [0.07, height, 0.07]);
      this.block([0, 0.06, z + edge], [0.66, 0.07, 0.09], this.dark);
    }
  }
  private tower(
    z = 0.78,
    sideCable = false,
    pulley: V3 = [0, 2.1, z],
    endpoint: (() => T.Vector3) | null = () => this.hands(),
    handle = true,
  ) {
    const width = sideCable ? 1.8 : 0.94;
    this.base(width + 0.15, 0.75, z);
    for (const x of [-width / 2, width / 2]) {
      this.block([x, 1.1, z], [0.065, 2.12, 0.08]);
      this.block([x, 1.1, z + 0.06], [0.018, 1.92, 0.02], this.bolt);
      for (let i = 0; i < 14; i++)
        this.block(
          [x, 0.3 + i * 0.105, z + 0.078],
          [0.022, 0.013, 0.006],
          this.dark,
        );
    }
    this.block([0, 2.15, z], [width + 0.12, 0.08, 0.12]);
    this.stack(-width / 2 + 0.22, z - 0.09);
    this.pulley(pulley);
    if (endpoint) this.cable(() => vector(pulley), endpoint);
    if (handle)
      this.link(
        () => this.hand("L"),
        () => this.hand("R"),
        0.013,
        this.rubber,
      );
  }

  private plate(position: V3, radius = 0.17) {
    const shape = new T.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0, 0, 0.027, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
      curveSegments: 20,
    });
    const m = this.mesh(geometry, this.dark);
    m.position.fromArray(position);
    m.rotation.y = Math.PI / 2;
    return m;
  }
  private weights(barbell: boolean, atShoulders = false) {
    if (barbell) {
      if (this.candidate.id === "t_bar_row") {
        const start = new T.Vector3(0, 0.1, -0.85);
        const tip = () => this.hands().add(new T.Vector3(0, 0, 0.12));
        this.link(() => start, tip, 0.016, this.bolt);
        this.link(
          () => this.hand("L"),
          () => this.hand("R"),
          0.014,
          this.rubber,
        );
        const plates = [0, 0.04].map(() => this.plate([0, 0, 0], 0.19));
        this.animate.push(() => {
          const axis = tip().sub(start).normalize();
          plates.forEach((p, i) => {
            p.position.copy(tip()).addScaledVector(axis, -0.16 - i * 0.04);
            p.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), axis);
          });
        });
        this.block([0, 0.05, -0.85], [0.4, 0.08, 0.3], this.dark);
        return;
      }
      if (this.candidate.id === "trap_bar_deadlift") {
        const corners = [
          [-0.4, 0, -0.25],
          [0.4, 0, -0.25],
          [0.48, 0, 0],
          [0.4, 0, 0.25],
          [-0.4, 0, 0.25],
          [-0.48, 0, 0],
        ] as V3[];
        for (let i = 0; i < corners.length; i++)
          this.link(
            () => this.hands().add(vector(corners[i])),
            () => this.hands().add(vector(corners[(i + 1) % corners.length])),
            0.018,
            this.bolt,
          );
        for (const side of ["L", "R"] as const)
          this.link(
            () => this.hand(side).add(new T.Vector3(0, 0, -0.12)),
            () => this.hand(side).add(new T.Vector3(0, 0, 0.12)),
            0.015,
            this.rubber,
          );
        const plates = [-0.62, 0.62].map(() => this.plate([0, 0, 0], 0.2));
        this.link(
          () => this.hands().add(new T.Vector3(-0.7, 0, 0)),
          () => this.hands().add(new T.Vector3(0.7, 0, 0)),
          0.016,
          this.bolt,
        );
        this.animate.push(() =>
          plates.forEach((p, i) =>
            p.position
              .copy(this.hands())
              .add(new T.Vector3(i ? 0.62 : -0.62, 0, 0)),
          ),
        );
        return;
      }
      const bar = this.rod([-0.67, 1, 0], [0.67, 1, 0], 0.013, this.bolt);
      const plates = [-0.64, -0.59, 0.59, 0.64].map((x) =>
        this.plate([x, 1, 0], 0.19),
      );
      this.animate.push(() => {
        const center = atShoulders
          ? midpoint(
              this.athlete.position("upperarm01_L"),
              this.athlete.position("upperarm01_R"),
            ).add(
              new T.Vector3(
                0,
                0.04,
                this.candidate.id === "front_squat" ? 0.1 : -0.065,
              ).applyAxisAngle(new T.Vector3(1, 0, 0), this.frame.lean),
            )
          : this.hands();
        this.setRod(
          bar,
          center.clone().add(new T.Vector3(-0.76, 0, 0)),
          center.clone().add(new T.Vector3(0.76, 0, 0)),
          0.013,
        );
        plates.forEach((plate, i) =>
          plate.position
            .copy(center)
            .add(new T.Vector3([-0.64, -0.59, 0.59, 0.64][i], 0, 0)),
        );
      });
    } else {
      const single = singleWeight(this.candidate);
      const sides =
        single || singleArm(this.candidate)
          ? (["L"] as const)
          : (["L", "R"] as const);
      for (const side of sides) {
        const handle = this.rod([0, 0, 0], [0.2, 0, 0], 0.014, this.bolt);
        const ends = [-1, 1].map(() =>
          this.mesh(new T.CylinderGeometry(0.065, 0.065, 0.055, 8), this.dark),
        );
        this.animate.push(() => {
          const p = single ? this.hands() : this.hand(side);
          const axis = single ? new T.Vector3(0, 1, 0) : this.gripAxis(side);
          this.setRod(
            handle,
            p.clone().addScaledVector(axis, -0.1),
            p.clone().addScaledVector(axis, 0.1),
            0.014,
          );
          ends.forEach((end, i) => {
            end.position.copy(p).addScaledVector(axis, i ? 0.095 : -0.095);
            end.quaternion.setFromUnitVectors(up, axis);
          });
        });
      }
    }
  }

  private build() {
    const f = this.family,
      c = this.candidate;
    const vec = (p: V3) => () => vector(p);
    if (
      [
        "pushdown",
        "overhead-extension",
        "pulldown",
        "pallof",
        "crunch",
        "kickback",
        "straight-arm-pull",
        "face-pull",
      ].includes(f) &&
      c.mode !== "dumbbell"
    ) {
      const z =
        f === "overhead-extension" ? -0.75 : f === "pallof" ? 0.25 : 0.78;
      const anchor: V3 =
        f === "pallof"
          ? [-0.9, 1.27, z]
          : [0, f === "kickback" ? 0.12 : f === "face-pull" ? 1.48 : 2.1, z];
      this.tower(
        z,
        f === "pallof",
        anchor,
        f === "kickback"
          ? () => this.athlete.position("foot_R")
          : singleArm(c)
            ? () => this.hand("L")
            : () => this.hands(),
        f !== "kickback" && !singleArm(c),
      );
      if (singleArm(c)) this.movingHandle("L");
      if (f === "pulldown") {
        this.seat(0, false);
        this.block([0, 0.66, 0.2], [0.63, 0.09, 0.14], this.padMaterial);
      }
    }
    if (f === "cable-fly") {
      this.tower(-0.3, true, [0, 1.3, -0.3], null, false);
      for (const side of ["L", "R"] as const) {
        const anchor: V3 = [
          side === "L" ? 0.9 : -0.9,
          c.id === "low_cable_fly"
            ? 0.13
            : c.id === "high_cable_fly"
              ? 1.9
              : 1.3,
          -0.3,
        ];
        this.pulley(anchor);
        this.cable(vec(anchor), () => this.hand(side));
        this.movingHandle(side);
      }
    }
    if (
      [
        "chest-press",
        "pec-deck",
        "seated-row",
        "abduction",
        "leg-extension",
        "seated-curl",
      ].includes(f)
    ) {
      this.base(1.05, 1.4, 0.16);
      this.seat(0, f !== "seated-row");
      this.stack(0.52, -0.27);
      this.rod([0.52, 0.14, -0.27], [0.52, 1.85, -0.27], 0.026);
      this.block([0.52, 1.1, -0.42], [0.36, 1.45, 0.05], this.dark);
    }
    if (["chest-press", "pec-deck"].includes(f)) {
      for (const side of ["L", "R"] as const) {
        const x = side === "L" ? 0.46 : -0.46;
        const pivot: V3 = [x, 1.65, -0.12];
        this.rod([x, 0.12, -0.25], pivot, 0.033);
        this.link(
          vec(pivot),
          () =>
            this.hand(side)
              .clone()
              .add(new T.Vector3(0, 0.15, 0)),
          0.027,
        );
        this.movingHandle(side, 0.017);
        this.pulley(pivot);
      }
      this.block([0, 1.67, -0.16], [1.06, 0.07, 0.12]);
    }
    if (f === "seated-row") {
      for (const x of [-0.23, 0.23])
        this.block([x, 0.18, 0.77], [0.18, 0.26, 0.05], this.dark, -0.3);
      this.cable(vec([0, c.id === "machine_high_row" ? 1.6 : 0.62, 0.9]), () =>
        singleArm(c) ? this.hand("L") : this.hands(),
      );
      if (singleArm(c)) this.movingHandle("L");
      else
        this.link(
          () => this.hand("L"),
          () => this.hand("R"),
          0.014,
          this.rubber,
        );
      if (["chest_supported_row", "machine_high_row"].includes(c.id))
        this.block([0, 0.99, 0.28], [0.25, 0.36, 0.09], this.padMaterial, 0.12);
    }
    if (
      ["bench", "bench-fly", "pullover", "lying-extension"].includes(f) &&
      c.id !== "dumbbell_floor_press"
    )
      this.bench(c.id.includes("incline"));
    if (c.id.startsWith("smith_")) {
      const z = f === "bench" ? -0.34 : -0.09;
      this.base(1.8, 1.4, z);
      for (const x of [-0.76, 0.76]) {
        this.rod([x, 0.1, z], [x, 2.12, z], 0.022, this.bolt);
        this.block([x, 1.08, z - 0.1], [0.08, 2.1, 0.08]);
      }
      this.block([0, 2.13, z], [1.65, 0.08, 0.1]);
      this.weights(true, f === "squat");
    }
    if ((f === "row" && c.id === "dumbbell_row") || f === "triceps-kickback")
      this.bench(false, -0.07, 0.54);
    if (c.id === "incline_dumbbell_row" || c.id === "spider_curl")
      this.bench(true, -0.1, 0.59);
    if (f === "reverse-fly") {
      if (c.id === "reverse_fly") {
        this.seat(0, false);
        this.block([0, 0.97, 0.21], [0.28, 0.45, 0.08], this.padMaterial);
        for (const side of ["L", "R"] as const)
          this.link(
            vec([side === "L" ? 0.5 : -0.5, 1.6, 0.3]),
            () => this.hand(side),
            0.025,
          );
        this.base();
        this.stack(0.56, 0.32);
      } else if (c.mode === "dumbbell") this.bench(true, -0.23);
      else {
        this.tower(0.8, true, [0, 1.42, 0.8], null, false);
        for (const side of ["L", "R"] as const)
          this.cable(vec([side === "L" ? -0.9 : 0.9, 1.42, 0.8]), () =>
            this.hand(side),
          );
      }
    }
    if (
      f === "shoulder-press" &&
      !["overhead_press", "standing_dumbbell_press"].includes(c.id)
    )
      this.seat();
    if (f === "shoulder-press" && (!c.mode || c.mode === "machine")) {
      this.base();
      this.stack(0.52, -0.3);
      for (const side of ["L", "R"] as const) {
        const x = side === "L" ? 0.48 : -0.48;
        this.rod([x, 0.1, -0.3], [x, 1.65, -0.3], 0.035);
        this.link(vec([x, 1.6, -0.25]), () => this.hand(side), 0.025);
      }
    }
    if (
      f === "curl" &&
      [
        "incline_dumbbell_curl",
        "biceps_machine",
        "preacher_ez_curl",
        "preacher_dumbbell_curl",
        "concentration_curl",
      ].includes(c.id)
    ) {
      this.seat();
      if (c.id === "biceps_machine") {
        this.block([0, 0.83, 0.3], [0.5, 0.07, 0.33], this.padMaterial, 0.45);
        this.stack(0.5, 0.2);
      }
    }
    if (c.id.includes("preacher"))
      this.block([0, 0.81, 0.29], [0.5, 0.07, 0.35], this.padMaterial, 0.45);
    if (c.id === "biceps_machine")
      this.link(vec([0, 0.58, 0.42]), () => this.hands(), 0.028);
    if (
      ["cable_biceps", "cable_rope_curl"].includes(c.id) ||
      (f === "upright-row" && c.mode === "machine")
    )
      this.tower(0.78, false, [0, 0.12, 0.78]);
    if (f === "front-raise" && c.mode === "machine")
      this.tower(-0.65, false, [0, 0.12, -0.65]);
    if (["pull-up", "knee-raise"].includes(f)) {
      this.base(1.25, 1.0);
      for (const x of [-0.62, 0.62])
        this.rod([x, 0.1, -0.1], [x, 2.18, -0.1], 0.033);
      if (c.id === "neutral_grip_pull_up")
        for (const x of [-0.36, 0.36])
          this.rod([x, 2.14, -0.13], [x, 2.14, 0.23], 0.018, this.dark);
      else this.rod([-0.67, 2.14, 0.05], [0.67, 2.14, 0.05], 0.018, this.dark);
      this.rod([-0.62, 2.18, -0.1], [0.62, 2.18, -0.1], 0.03);
      if (c.mode === "assisted") {
        this.stack(0.47, -0.22);
        const pad = this.block(
          [0, 0.7, 0.1],
          [0.45, 0.09, 0.28],
          this.padMaterial,
        );
        this.animate.push(() =>
          pad.position
            .copy(
              midpoint(
                this.athlete.position("lowerleg01_L"),
                this.athlete.position("lowerleg01_R"),
              ),
            )
            .add(new T.Vector3(0, -0.07, 0)),
        );
      }
    }
    if (f === "dip") {
      this.base(1.1, 1.1);
      for (const x of [-0.32, 0.32]) {
        this.rod([x, 0.1, -0.27], [x, 1.12, -0.27], 0.03);
        this.rod([x, 1.12, -0.3], [x, 1.12, 0.35], 0.022, this.rubber);
      }
      if (c.mode === "assisted") {
        this.stack(0.5, -0.4);
        const pad = this.block(
          [0, 0.6, -0.1],
          [0.4, 0.08, 0.3],
          this.padMaterial,
        );
        this.animate.push(() => {
          pad.position.y = this.frame.hip[1] - 0.3;
        });
      }
    }
    if (f === "abduction")
      for (const side of ["L", "R"] as const) {
        const sign = side === "L" ? 1 : -1;
        const pad = this.block(
          [sign * 0.25, 0.55, 0.3],
          [0.1, 0.16, 0.24],
          this.padMaterial,
        );
        const position = () =>
          this.athlete
            .position(`lowerleg01_${side}`)
            .add(
              new T.Vector3(
                sign * (c.pattern === "hip-adduction" ? -0.05 : 0.05),
                0.03,
                -0.03,
              ),
            );
        this.animate.push(() => pad.position.copy(position()));
        this.link(vec([sign * 0.17, 0.34, -0.1]), position, 0.025);
      }
    if (f === "leg-press") {
      this.bench(true, -0.43, 0.35);
      this.base(1.0, 1.7, 0.25);
      for (const x of [-0.42, 0.42])
        this.rod([x, 0.42, 0.08], [x, 1.25, 1.04], 0.024, this.bolt);
      const sled = this.block(
        [0, 1, 0.7],
        [0.72, 0.09, 0.52],
        this.dark,
        -0.76,
      );
      this.animate.push(() => {
        const center = c.id.startsWith("single_leg")
          ? this.athlete.position("foot_L").setX(0)
          : midpoint(
              this.athlete.position("foot_L"),
              this.athlete.position("foot_R"),
            );
        sled.position.copy(center).add(new T.Vector3(0, -0.025, 0.1));
      });
    }
    if (["leg-extension", "seated-curl", "lying-curl"].includes(f)) {
      if (f === "lying-curl") {
        this.bench(false, -0.06, 0.59);
        this.base();
      }
      const roller = this.rod(
        [-0.34, 0.2, 0.4],
        [0.34, 0.2, 0.4],
        0.055,
        this.padMaterial,
      );
      this.animate.push(() => {
        const center = c.id.startsWith("single_leg")
          ? this.athlete.position("foot_L").setX(0)
          : midpoint(
              this.athlete.position("foot_L"),
              this.athlete.position("foot_R"),
            );
        center.y += 0.08;
        this.setRod(
          roller,
          center.clone().add(new T.Vector3(-0.34, 0, 0)),
          center.clone().add(new T.Vector3(0.34, 0, 0)),
          0.055,
        );
      });
      this.link(
        vec([0.38, 0.51, 0.31]),
        () =>
          midpoint(
            this.athlete.position("foot_L"),
            this.athlete.position("foot_R"),
          ).add(new T.Vector3(0.38, 0.08, 0)),
        0.024,
      );
    }
    if (f === "hip-thrust") {
      if (c.id !== "glute_bridge") this.bench(false, -0.59, 0.5);
      if (!c.mode || c.mode === "machine") {
        this.base();
        this.link(
          vec([0.48, 0.24, -0.27]),
          () => this.athlete.position("root").add(new T.Vector3(0.48, 0.05, 0)),
          0.04,
        );
      }
    }
    if (f === "step-up")
      this.block([0, 0.13, 0.34], [0.68, 0.26, 0.48], this.padMaterial);
    if (c.id === "rack_pull")
      for (const x of [-0.55, 0.55]) {
        this.rod([x, 0.1, 0.04], [x, 0.5, 0.04], 0.04);
        this.block([x, 0.5, 0.04], [0.13, 0.06, 0.6], this.dark);
      }
    if (c.id === "leaning_dumbbell_lateral_raise")
      this.rod([-0.43, 0.05, 0.07], [-0.43, 1.9, 0.07], 0.035);
    if (f === "hack-squat") {
      this.base(1.12, 1.1);
      for (const x of [-0.42, 0.42])
        this.rod([x, 0.11, -0.43], [x, 2.0, -0.67], 0.035, this.bolt);
      const back = this.block(
        [0, 1.1, -0.18],
        [0.32, 0.78, 0.1],
        this.padMaterial,
        -0.13,
      );
      this.animate.push(() => {
        back.position.y = this.frame.hip[1] + 0.24;
      });
    }
    if (f === "split-squat" && c.id === "bulgarian_split_squat")
      this.bench(false, -0.82, 0.35);
    if (f === "back-extension") {
      this.base(1, 1);
      this.block([0, 0.78, -0.04], [0.52, 0.16, 0.28], this.padMaterial, -0.2);
      this.rod([0, 0.12, -0.3], [0, 0.78, -0.04], 0.045);
      this.block([0, 0.1, -0.45], [0.62, 0.07, 0.3], this.dark);
    }
    if (f === "calf") {
      if (seatedCalf(c)) {
        this.seat();
        if (c.mode !== "dumbbell")
          this.block([0, 0.68, 0.32], [0.55, 0.09, 0.14], this.padMaterial);
      } else if (c.mode !== "dumbbell") {
        this.base();
        for (const x of [-0.24, 0.24])
          this.rod([x, 0.12, -0.3], [x, 1.7, -0.2], 0.03);
      }
      this.block(
        [0, 0.035, seatedCalf(c) ? 0.51 : 0.12],
        [0.58, 0.065, 0.18],
        this.dark,
      );
    }
    if (c.mode === "barbell")
      this.weights(true, f === "squat" || f === "split-squat");
    else if (c.mode === "dumbbell") this.weights(false);
    if (f === "lateral-raise" && c.mode !== "dumbbell")
      this.tower(0.76, true, [-0.9, 0.12, 0.76], () => this.hand("L"), false);
  }
  update(progress: number, frame: PoseFrame) {
    this.progress = progress;
    this.frame = frame;
    this.animate.forEach((animate) => animate());
  }
  dispose() {
    const geometries = new Set<T.BufferGeometry>();
    this.group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line)
        geometries.add(o.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    for (const material of [
      this.metal,
      this.dark,
      this.rubber,
      this.padMaterial,
      this.bolt,
      this.cableMaterial,
    ])
      material.dispose();
  }
}
