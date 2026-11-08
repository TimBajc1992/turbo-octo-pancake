import * as T from "three";
import type { Candidate } from "../exerciseCatalog";
import type { Athlete } from "./rig";
import type { ExerciseFamily, PoseFrame, V3 } from "./motions";

const up = new T.Vector3(0, 1, 0);
const vector = (p: V3) => new T.Vector3(...p);
const midpoint = (a: T.Vector3, b: T.Vector3) => a.clone().add(b).multiplyScalar(.5);

/** Original gym equipment. Moving handles/cables attach to the actual skinned hands. */
export class Equipment {
  readonly group = new T.Group();
  private animate: (() => void)[] = [];
  private progress = 0;
  private frame!: PoseFrame;
  private metal = new T.MeshStandardMaterial({ color: "#969ba3", metalness: .27, roughness: .45 });
  private dark = new T.MeshStandardMaterial({ color: "#242a32", metalness: .45, roughness: .54 });
  private rubber = new T.MeshStandardMaterial({ color: "#161a20", roughness: .88 });
  private padMaterial = new T.MeshStandardMaterial({ color: "#25303c", roughness: .79 });
  private bolt = new T.MeshStandardMaterial({ color: "#a9adb3", metalness: .83, roughness: .25 });
  private cableMaterial = new T.LineBasicMaterial({ color: "#9aa3ae" });
  private cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  private box = new T.BoxGeometry(1, 1, 1);

  constructor(readonly candidate: Candidate, readonly family: ExerciseFamily, private athlete: Athlete) {
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
    m.position.fromArray(position); m.scale.fromArray(size); m.rotation.x = angle;
    return m;
  }
  private rod(a: V3, b: V3, radius = .022, material = this.metal) {
    const m = this.mesh(this.cylinder, material);
    this.setRod(m, vector(a), vector(b), radius); return m;
  }
  private setRod(m: T.Mesh, a: T.Vector3, b: T.Vector3, radius: number) {
    const delta = b.clone().sub(a);
    m.position.copy(midpoint(a, b)); m.quaternion.setFromUnitVectors(up, delta.clone().normalize());
    m.scale.set(radius, Math.max(.001, delta.length()), radius);
  }
  private link(a: () => T.Vector3, b: () => T.Vector3, radius = .018, material = this.metal) {
    const m = this.rod([0, 0, 0], [0, 1, 0], radius, material);
    this.animate.push(() => this.setRod(m, a(), b(), radius)); return m;
  }
  private cable(a: () => T.Vector3, b: () => T.Vector3) {
    const geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    const line = new T.Line(geometry, this.cableMaterial);
    this.group.add(line);
    this.animate.push(() => {
      const points = geometry.getAttribute("position");
      const x = a(), y = b(); points.setXYZ(0, x.x, x.y, x.z); points.setXYZ(1, y.x, y.y, y.z);
      points.needsUpdate = true; geometry.computeBoundingSphere();
    });
  }
  private hand(side: "L" | "R") {
    return this.athlete.position(`finger3-1_${side}`);
  }
  private hands() { return midpoint(this.hand("L"), this.hand("R")); }
  private pulley(position: V3) {
    const wheel = this.mesh(new T.TorusGeometry(.055, .011, 8, 20), this.dark);
    wheel.position.fromArray(position); wheel.rotation.y = Math.PI / 2;
    this.rod([position[0] - .06, position[1], position[2]], [position[0] + .06, position[1], position[2]], .012, this.bolt);
  }
  private foot(position: V3) {
    this.block(position, [.10, .04, .18], this.rubber);
  }
  private base(width = 1.1, depth = 1.1, z = .10) {
    for (const x of [-width / 2, width / 2]) {
      this.block([x, .06, z], [.07, .08, depth], this.dark);
      for (const edge of [-depth / 2, depth / 2]) this.foot([x, .035, z + edge]);
    }
    this.block([0, .07, z + depth / 2 - .10], [width, .07, .07]);
  }
  private stack(x: number, z: number, height = 1.9) {
    for (const offset of [-.105, .105]) this.rod([x + offset, .12, z], [x + offset, height, z], .011, this.bolt);
    for (let i = 0; i < 12; i++) this.block([x, .13 + i * .027, z], [.27, .022, .17], this.dark);
    const top = this.block([x, .48, z], [.28, .09, .18], this.dark);
    this.animate.push(() => { top.position.y = .48 + this.progress * .18; });
    this.rod([x, .53, z], [x, height, z], .004, this.dark);
  }
  private seat(z = -.02, back = true) {
    this.block([0, .455, z], [.38, .085, .43], this.padMaterial);
    this.block([0, .25, z], [.07, .4, .07]);
    this.block([0, .07, z], [.78, .08, .68], this.dark);
    if (back) {
      this.block([0, .91, z - .18], [.29, .78, .075], this.padMaterial, -.07);
      this.rod([0, .15, z - .24], [0, 1.30, z - .24], .026);
    }
  }
  private bench(incline = false, z = -.25, height = .50) {
    this.block([0, height, z], [.32, .085, .98], this.padMaterial, incline ? -.48 : 0);
    for (const edge of [-.55, .12]) {
      this.block([0, height / 2, z + edge], [.07, height, .07]);
      this.block([0, .06, z + edge], [.66, .07, .09], this.dark);
    }
  }
  private tower(z = .78, sideCable = false, pulley: V3 = [0, 2.10, z], endpoint: (() => T.Vector3) | null = () => this.hands(), handle = true) {
    const width = sideCable ? 1.8 : .94;
    this.base(width + .15, .75, z);
    for (const x of [-width / 2, width / 2]) {
      this.block([x, 1.10, z], [.065, 2.12, .08]);
      this.block([x, 1.1, z + .06], [.018, 1.92, .02], this.bolt);
      for (let i = 0; i < 14; i++) this.block([x, .30 + i * .105, z + .078], [.022, .013, .006], this.dark);
    }
    this.block([0, 2.15, z], [width + .12, .08, .12]);
    this.stack(-width / 2 + .22, z - .09);
    this.pulley(pulley);
    if (endpoint) this.cable(() => vector(pulley), endpoint);
    if (handle) this.link(() => this.hand("L"), () => this.hand("R"), .013, this.rubber);
  }

  private plate(position: V3, radius = .17) {
    const shape = new T.Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = new T.Path(); hole.absarc(0, 0, .027, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, { depth: .026, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 20 });
    const m = this.mesh(geometry, this.dark); m.position.fromArray(position); m.rotation.y = Math.PI / 2;
    return m;
  }
  private weights(barbell: boolean, atShoulders = false) {
    if (barbell) {
      const bar = this.rod([-.67, 1, 0], [.67, 1, 0], .013, this.bolt);
      const plates = [-.64, -.59, .59, .64].map((x) => this.plate([x, 1, 0], .19));
      this.animate.push(() => {
        const center = atShoulders ? this.athlete.position("spine01").add(new T.Vector3(0, .02, -.07)) : this.hands();
        this.setRod(bar, center.clone().add(new T.Vector3(-.76, 0, 0)), center.clone().add(new T.Vector3(.76, 0, 0)), .013);
        plates.forEach((plate, i) => plate.position.copy(center).add(new T.Vector3([-.64, -.59, .59, .64][i], 0, 0)));
      });
    } else {
      const single = ["goblet_squat", "dumbbell_overhead_extension"].includes(this.candidate.id);
      const sides = single || this.candidate.id === "dumbbell_row" ? ["L"] as const : ["L", "R"] as const;
      for (const side of sides) {
        const handle = this.rod([0, 0, 0], [.2, 0, 0], .014, this.bolt);
        const ends = [-1, 1].map(() => this.mesh(new T.CylinderGeometry(.065, .065, .055, 8), this.dark));
        this.animate.push(() => {
          const p = single ? this.hands() : this.hand(side);
          const axis = single ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0);
          this.setRod(handle, p.clone().addScaledVector(axis, -.1), p.clone().addScaledVector(axis, .1), .014);
          ends.forEach((end, i) => { end.position.copy(p).addScaledVector(axis, i ? .095 : -.095); end.rotation.z = single ? 0 : Math.PI / 2; });
        });
      }
    }
  }

  private build() {
    const f = this.family, c = this.candidate;
    const vec = (p: V3) => () => vector(p);
    if (["pushdown", "overhead-extension", "pulldown", "pallof", "crunch", "kickback"].includes(f) && c.mode !== "dumbbell") {
      const z = f === "overhead-extension" ? -.75 : f === "pallof" ? .25 : .78;
      const anchor: V3 = f === "pallof" ? [-.9, 1.27, z] : [0, f === "kickback" ? .12 : 2.10, z];
      this.tower(z, f === "pallof", anchor, f === "kickback" ? () => this.athlete.position("foot_R") : () => this.hands(), f !== "kickback");
      if (f === "pulldown") {
        this.seat();
        this.block([0, .66, .20], [.63, .09, .14], this.padMaterial);
      }
    }
    if (["chest-press", "pec-deck", "seated-row", "abduction", "leg-extension", "seated-curl"].includes(f)) {
      this.base(1.05, 1.4, .16); this.seat(0, f !== "seated-row");
      this.stack(.52, -.27);
      this.rod([.52, .14, -.27], [.52, 1.85, -.27], .026);
      this.block([.52, 1.10, -.42], [.36, 1.45, .05], this.dark);
    }
    if (["chest-press", "pec-deck"].includes(f)) {
      for (const side of ["L", "R"] as const) {
        const x = side === "L" ? .46 : -.46;
        const pivot: V3 = [x, 1.65, -.12];
        this.rod([x, .12, -.25], pivot, .033);
        this.link(vec(pivot), () => this.hand(side).clone().add(new T.Vector3(0, .15, 0)), .027);
        this.link(() => this.hand(side).clone().add(new T.Vector3(0, -.08, 0)), () => this.hand(side).clone().add(new T.Vector3(0, .15, 0)), .017, this.rubber);
        this.pulley(pivot);
      }
      this.block([0, 1.67, -.16], [1.06, .07, .12]);
    }
    if (f === "seated-row") {
      for (const x of [-.23, .23]) this.block([x, .18, .77], [.18, .26, .05], this.dark, -.3);
      this.cable(vec([0, .62, .90]), () => this.hands());
      this.link(() => this.hand("L"), () => this.hand("R"), .014, this.rubber);
      if (c.id === "chest_supported_row") this.block([0, .99, .28], [.25, .36, .09], this.padMaterial, .12);
    }
    if (f === "bench") this.bench(c.id.includes("incline"));
    if (f === "row" && c.id === "dumbbell_row") this.bench(false, -.07, .54);
    if (f === "reverse-fly") {
      if (c.id === "reverse_fly") {
        this.seat(0, false); this.block([0, .97, .21], [.28, .45, .08], this.padMaterial);
        for (const side of ["L", "R"] as const) this.link(vec([side === "L" ? .5 : -.5, 1.6, .30]), () => this.hand(side), .025);
        this.base(); this.stack(.56, .32);
      } else if (c.mode === "dumbbell") this.bench(true, -.23);
      else {
        this.tower(.80, true, [0, 1.42, .80], null, false);
        for (const side of ["L", "R"] as const) this.cable(vec([side === "L" ? -.9 : .9, 1.42, .80]), () => this.hand(side));
      }
    }
    if (f === "shoulder-press" && c.id !== "overhead_press") this.seat();
    if (f === "shoulder-press" && (!c.mode || c.mode === "machine")) {
      this.base(); this.stack(.52, -.3);
      for (const side of ["L", "R"] as const) {
        const x = side === "L" ? .48 : -.48;
        this.rod([x, .1, -.30], [x, 1.65, -.30], .035);
        this.link(vec([x, 1.60, -.25]), () => this.hand(side), .025);
      }
    }
    if (f === "curl" && ["incline_dumbbell_curl", "biceps_machine"].includes(c.id)) {
      this.seat();
      if (c.id === "biceps_machine") { this.block([0, .83, .30], [.5, .07, .33], this.padMaterial, .45); this.stack(.50, .20); }
    }
    if (c.id === "biceps_machine") this.link(vec([0, .58, .42]), () => this.hands(), .028);
    if (c.id === "cable_biceps") this.tower(.78, false, [0, .12, .78]);
    if (["pull-up", "knee-raise"].includes(f)) {
      this.base(1.25, 1.0);
      for (const x of [-.62, .62]) this.rod([x, .10, -.10], [x, 2.18, -.10], .033);
      this.rod([-.67, 2.14, .05], [.67, 2.14, .05], .018, this.dark);
      this.rod([-.62, 2.18, -.10], [.62, 2.18, -.10], .03);
      if (c.mode === "assisted") {
        this.stack(.47, -.22);
        const pad = this.block([0, .7, .1], [.45, .09, .28], this.padMaterial);
        this.animate.push(() => pad.position.copy(midpoint(this.athlete.position("lowerleg01_L"), this.athlete.position("lowerleg01_R"))).add(new T.Vector3(0, -.07, 0)));
      }
    }
    if (f === "abduction") for (const side of ["L", "R"] as const) {
      const sign = side === "L" ? 1 : -1;
      const pad = this.block([sign * .25, .55, .3], [.10, .16, .24], this.padMaterial);
      const position = () => this.athlete.position(`lowerleg01_${side}`).add(new T.Vector3(sign * .05, .03, -.03));
      this.animate.push(() => pad.position.copy(position()));
      this.link(vec([sign * .17, .34, -.10]), position, .025);
    }
    if (f === "leg-press") {
      this.bench(true, -.43, .35); this.base(1.0, 1.7, .25);
      for (const x of [-.42, .42]) this.rod([x, .42, .08], [x, 1.25, 1.04], .024, this.bolt);
      const sled = this.block([0, 1, .7], [.72, .09, .52], this.dark, -.76);
      this.animate.push(() => {
        const center = midpoint(this.athlete.position("foot_L"), this.athlete.position("foot_R"));
        sled.position.copy(center).add(new T.Vector3(0, -.025, .10));
      });
    }
    if (["leg-extension", "seated-curl", "lying-curl"].includes(f)) {
      if (f === "lying-curl") { this.bench(false, -.06, .59); this.base(); }
      const roller = this.rod([-.34, .2, .4], [.34, .2, .4], .055, this.padMaterial);
      this.animate.push(() => {
        const center = midpoint(this.athlete.position("foot_L"), this.athlete.position("foot_R"));
        center.y += .08;
        this.setRod(roller, center.clone().add(new T.Vector3(-.34, 0, 0)), center.clone().add(new T.Vector3(.34, 0, 0)), .055);
      });
      this.link(vec([.38, .51, .31]), () => midpoint(this.athlete.position("foot_L"), this.athlete.position("foot_R")).add(new T.Vector3(.38, .08, 0)), .024);
    }
    if (f === "hip-thrust") {
      this.bench(false, -.59, .50);
      if (!c.mode || c.mode === "machine") { this.base(); this.link(vec([.48, .24, -.27]), () => this.athlete.position("root").add(new T.Vector3(.48, .05, 0)), .04); }
    }
    if (f === "hack-squat") {
      this.base(1.12, 1.1);
      for (const x of [-.42, .42]) this.rod([x, .11, -.43], [x, 2.0, -.67], .035, this.bolt);
      const back = this.block([0, 1.1, -.18], [.32, .78, .10], this.padMaterial, -.13);
      this.animate.push(() => { back.position.y = this.frame.hip[1] + .24; });
    }
    if (f === "split-squat" && c.id === "bulgarian_split_squat") this.bench(false, -.82, .35);
    if (f === "back-extension") {
      this.base(1, 1); this.block([0, .78, -.04], [.52, .16, .28], this.padMaterial, -.2);
      this.rod([0, .12, -.30], [0, .78, -.04], .045);
      this.block([0, .10, -.45], [.62, .07, .3], this.dark);
    }
    if (f === "calf") {
      if (c.id === "seated_calf") { this.seat(); this.block([0, .68, .32], [.55, .09, .14], this.padMaterial); }
      else { this.base(); for (const x of [-.24, .24]) this.rod([x, .12, -.30], [x, 1.7, -.20], .03); }
      this.block([0, .035, c.id === "seated_calf" ? .51 : .12], [.58, .065, .18], this.dark);
    }
    if (c.mode === "barbell") this.weights(true, f === "squat");
    else if (c.mode === "dumbbell") this.weights(false);
    if (f === "lateral-raise" && c.mode !== "dumbbell") this.tower(.76, true, [-.9, .12, .76], () => this.hand("L"), false);
  }
  update(progress: number, frame: PoseFrame) {
    this.progress = progress; this.frame = frame;
    this.animate.forEach((animate) => animate());
  }
  dispose() {
    const geometries = new Set<T.BufferGeometry>();
    this.group.traverse((o) => { if (o instanceof T.Mesh || o instanceof T.Line) geometries.add(o.geometry); });
    geometries.forEach((geometry) => geometry.dispose());
    for (const material of [this.metal, this.dark, this.rubber, this.padMaterial, this.bolt, this.cableMaterial]) material.dispose();
  }
}
