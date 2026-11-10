import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Candidate } from "../exerciseCatalog";
import { anatomyForExercise, type MuscleRegion } from "../exerciseAnatomy";
import { athleteModel, Athlete } from "./rig";
import { Equipment } from "./equipment";
import { exerciseFamily, motionFor, type ExerciseFamily } from "./motions";
import { neutralBodyPose } from "./body-pose";

export class ExerciseScene {
  readonly renderer: T.WebGLRenderer;
  readonly ready: Promise<void>;
  readonly scene = new T.Scene();
  readonly camera: T.OrthographicCamera;
  readonly controls: OrbitControls;
  private athlete?: Athlete;
  private baseline?: Athlete;
  private bodyWaist?: number;
  private bodyWeight = 1;
  private compareBody = false;
  private equipment?: Equipment;
  private family: ExerciseFamily;
  private exercise: Candidate;
  private observer: ResizeObserver;
  private disposed = false;
  private generation = 0;
  private suspended = false;
  private progress = 0;
  private selected?: MuscleRegion;
  private floor: T.Mesh;
  private studio: T.Texture;
  private composer?: EffectComposer;
  private onChange = () => this.render();

  constructor(
    private container: HTMLElement,
    exercise: Candidate,
    private options: { body?: boolean; transparent?: boolean } = {},
  ) {
    const family = exerciseFamily(exercise);
    if (!family) throw new Error("Ta naprava potrebuje določeno izvedbo.");
    this.family = family;
    this.exercise = exercise;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: options.transparent ?? false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor("#52677D", options.transparent ? 0 : 1);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    const room = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.studio = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.studio;
    pmrem.dispose();
    room.dispose();
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.className = "exercise-3d-canvas";
    container.append(this.renderer.domElement);
    this.camera = new T.OrthographicCamera(-1.5, 1.5, 1.3, -1.3, 0.05, 30);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minZoom = 0.75;
    this.controls.maxZoom = 2.5;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.addEventListener("change", this.onChange);
    if (
      !options.body &&
      this.renderer.extensions.has("EXT_color_buffer_float")
    ) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(
        new UnrealBloomPass(new T.Vector2(480, 480), 0.32, 0.35, 0.75),
      );
      this.composer.addPass(new OutputPass());
    }
    this.scene.add(new T.HemisphereLight("#f0edf5", "#39303a", 0.65));
    const key = new T.DirectionalLight("#ffe8d6", 1.5);
    key.position.set(-2.7, 4, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -2.2;
    key.shadow.camera.right = key.shadow.camera.top = 2.2;
    key.shadow.normalBias = 0.018;
    this.scene.add(key);
    const rim = new T.DirectionalLight("#b9c7ef", 1.0);
    rim.position.set(2, 3, -3);
    this.scene.add(rim);
    const fill = new T.DirectionalLight("#e5e0ff", 0.3);
    fill.position.set(3, 1.4, 2);
    this.scene.add(fill);
    this.floor = new T.Mesh(
      new T.PlaneGeometry(12, 12),
      new T.ShadowMaterial({ color: "#1F2A44", opacity: 0.12 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.012;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.setCamera();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.ready = this.load();
  }

  private async load() {
    const generation = ++this.generation;
    const model = await athleteModel();
    if (this.disposed || generation !== this.generation) return;
    const previousEquipment = this.equipment;
    if (previousEquipment) this.scene.remove(previousEquipment.group);
    if (!this.athlete) {
      this.athlete = new Athlete(model);
      this.scene.add(this.athlete.group);
    }
    if (this.options.body) {
      if (!this.baseline) {
        this.baseline = new Athlete(model, true);
        this.baseline.pose(neutralBodyPose());
        this.scene.add(this.baseline.group);
      }
      this.baseline.group.visible = this.compareBody;
      this.athlete.bodyShape(this.bodyWaist, this.bodyWeight);
    } else {
      this.equipment = new Equipment(this.exercise, this.family, this.athlete);
      this.scene.add(this.equipment.group);
    }
    this.setProgress(this.progress);
    this.highlight(this.selected);
    // Retain the existing shader programs until the replacement has acquired
    // them; this avoids recompiling equipment shaders on every library change.
    if (previousEquipment) {
      this.renderer.compile(this.scene, this.camera);
      previousEquipment.dispose();
    }
  }
  async changeExercise(exercise: Candidate, progress = 0) {
    const family = exerciseFamily(exercise);
    if (!family) throw new Error("Ta naprava potrebuje določeno izvedbo.");
    this.suspended = true;
    try {
      this.exercise = exercise;
      this.family = family;
      this.progress = progress;
      this.selected = undefined;
      this.setCamera();
      this.resize();
      await this.load();
    } finally {
      this.suspended = false;
    }
    this.render();
  }
  private setCamera() {
    if (this.options.body) {
      this.controls.target.set(0, 0.895, 0);
      this.camera.position.set(0.45, 1.095, 4.8);
      this.controls.minZoom = 0.85;
      this.controls.maxZoom = 2.2;
      this.controls.update();
      return;
    }
    if (this.seatedDumbbellPress()) {
      this.controls.target.set(0, 0.83, 0);
      this.camera.position.set(0.8, 1.03, 4.8);
      this.controls.update();
      return;
    }
    const low = [
      "bench",
      "bench-fly",
      "pullover",
      "lying-extension",
      "push-up",
      "plank",
      "reverse-crunch",
      "hip-thrust",
      "lying-curl",
      "leg-press",
    ].includes(this.family);
    const seated = [
      "chest-press",
      "pec-deck",
      "seated-row",
      "leg-extension",
      "seated-curl",
      "abduction",
    ].includes(this.family);
    const targetY = low ? 0.54 : seated ? 0.92 : 1.08;
    this.controls.target.set(0, targetY, 0.08);
    this.camera.position.set(3.0, targetY + 1.0, 4.4);
    if (low) this.camera.position.set(2.8, targetY + 2.2, 3.8);
    if (
      [
        "row",
        "seated-row",
        "pulldown",
        "pull-up",
        "reverse-fly",
        "hinge",
        "hip-thrust",
        "lying-curl",
        "back-extension",
        "kickback",
        "calf",
        "triceps-kickback",
        "shrug",
      ].includes(this.family)
    ) {
      this.camera.position.x = -3;
      this.camera.position.z = -4.4;
    }
    if (this.family === "pushdown") this.camera.position.set(-4.2, 2.1, 3.0);
    if (this.family === "overhead-extension")
      this.camera.position.set(4.0, 2.4, 3.5);
    this.controls.update();
  }
  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth),
      height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    const low = [
      "bench",
      "bench-fly",
      "pullover",
      "lying-extension",
      "push-up",
      "plank",
      "reverse-crunch",
      "hip-thrust",
      "lying-curl",
      "leg-press",
    ].includes(this.family);
    const span = this.options.body
      ? 0.975
      : this.seatedDumbbellPress()
        ? 0.94
        : low
          ? 1.05
          : 1.4;
    this.camera.left = (-span * width) / height;
    this.camera.right = (span * width) / height;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  setProgress(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress));
    const frame = this.options.body
      ? neutralBodyPose()
      : motionFor(this.exercise, this.progress);
    if (this.athlete && frame) {
      this.athlete.pose(frame);
      this.equipment?.update(this.progress, frame);
    }
    this.render();
  }
  private seatedDumbbellPress() {
    return (
      this.family === "shoulder-press" &&
      this.exercise.mode === "dumbbell" &&
      this.exercise.id !== "standing_dumbbell_press"
    );
  }
  highlight(selected?: MuscleRegion) {
    this.selected = selected;
    this.athlete?.highlight(
      this.options.body
        ? { primary: [], secondary: [] }
        : anatomyForExercise(this.exercise),
      selected,
    );
    this.render();
  }
  rotate(radians: number) {
    const delta = this.camera.position.clone().sub(this.controls.target);
    delta.applyAxisAngle(new T.Vector3(0, 1, 0), radians);
    this.camera.position.copy(this.controls.target).add(delta);
    this.controls.update();
    this.render();
  }
  setBodyShape(waist?: number, weight = 1, comparison = false) {
    this.bodyWaist = waist;
    this.bodyWeight = weight;
    this.compareBody = comparison;
    this.athlete?.bodyShape(waist, weight);
    if (this.baseline) this.baseline.group.visible = comparison;
    this.render();
  }
  bodyView(back = false) {
    this.controls.target.set(0, 0.895, 0);
    this.camera.position.set(back ? -0.45 : 0.45, 1.095, back ? -4.8 : 4.8);
    this.controls.update();
    this.render();
  }
  render() {
    if (!this.disposed && !this.suspended) {
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    }
  }
  debug() {
    return {
      family: this.family,
      progress: this.progress,
      body: this.options.body
        ? {
            waist: this.bodyWaist,
            weight: this.bodyWeight,
            comparison: this.compareBody,
          }
        : undefined,
      renderer: this.renderer
        .getContext()
        .getParameter(this.renderer.getContext().VERSION),
      bones: this.athlete?.bones.size,
      hands: this.athlete
        ? [
            this.athlete.position("wrist_L").toArray(),
            this.athlete.position("wrist_R").toArray(),
          ]
        : [],
      shoulders: this.athlete
        ? [
            this.athlete.position("upperarm01_L").toArray(),
            this.athlete.position("upperarm01_R").toArray(),
          ]
        : [],
    };
  }
  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    this.controls.removeEventListener("change", this.onChange);
    this.controls.dispose();
    this.athlete?.dispose();
    this.baseline?.dispose();
    this.equipment?.dispose();
    this.floor.geometry.dispose();
    (this.floor.material as T.Material).dispose();
    this.studio.dispose();
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
