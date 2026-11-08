import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Candidate } from "../exerciseCatalog";
import { anatomyForExercise, type MuscleRegion } from "../exerciseAnatomy";
import { athleteModel, Athlete } from "./rig";
import { Equipment } from "./equipment";
import { exerciseFamily, motionFor, type ExerciseFamily } from "./motions";

export class ExerciseScene {
  readonly renderer: T.WebGLRenderer;
  readonly ready: Promise<void>;
  readonly scene = new T.Scene();
  readonly camera: T.OrthographicCamera;
  readonly controls: OrbitControls;
  private athlete?: Athlete;
  private equipment?: Equipment;
  private family: ExerciseFamily;
  private exercise: Candidate;
  private observer: ResizeObserver;
  private disposed = false;
  private progress = 0;
  private selected?: MuscleRegion;
  private floor: T.Mesh;
  private onChange = () => this.render();

  constructor(private container: HTMLElement, exercise: Candidate) {
    const family = exerciseFamily(exercise);
    if (!family) throw new Error("Ta naprava potrebuje določeno izvedbo.");
    this.family = family; this.exercise = exercise;
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor("#10171f");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.className = "exercise-3d-canvas";
    container.append(this.renderer.domElement);
    this.camera = new T.OrthographicCamera(-1.5, 1.5, 1.3, -1.3, .05, 30);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minZoom = .75; this.controls.maxZoom = 2.5;
    this.controls.minPolarAngle = .3; this.controls.maxPolarAngle = Math.PI / 2 - .03;
    this.controls.addEventListener("change", this.onChange);
    this.scene.add(new T.HemisphereLight("#f0edf5", "#39303a", 1.05));
    const key = new T.DirectionalLight("#ffe8d6", 2.6);
    key.position.set(-2.7, 4, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -2.2;
    key.shadow.camera.right = key.shadow.camera.top = 2.2;
    key.shadow.normalBias = .018;
    this.scene.add(key);
    const rim = new T.DirectionalLight("#b9c7ef", 1.5); rim.position.set(2, 3, -3); this.scene.add(rim);
    const fill = new T.DirectionalLight("#e5e0ff", .6); fill.position.set(3, 1.4, 2); this.scene.add(fill);
    this.floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({ color: "#000000", opacity: .25 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = -.012; this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.setCamera();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.ready = this.load();
  }

  private async load() {
    const model = await athleteModel();
    if (this.disposed) return;
    this.athlete = new Athlete(model);
    this.scene.add(this.athlete.group);
    this.equipment = new Equipment(this.exercise, this.family, this.athlete);
    this.scene.add(this.equipment.group);
    this.setProgress(this.progress);
    this.highlight(this.selected);
  }
  private setCamera() {
    const low = ["bench", "push-up", "hip-thrust", "lying-curl", "leg-press"].includes(this.family);
    const seated = ["chest-press", "pec-deck", "seated-row", "leg-extension", "seated-curl", "abduction"].includes(this.family);
    const targetY = low ? .54 : seated ? .92 : 1.08;
    this.controls.target.set(0, targetY, .08);
    this.camera.position.set(3.0, targetY + 1.0, 4.4);
    if (["row", "seated-row", "pulldown", "pull-up", "reverse-fly", "hinge", "hip-thrust", "lying-curl", "back-extension", "kickback", "calf"].includes(this.family)) this.camera.position.z = -4.4;
    if (this.family === "pushdown") this.camera.position.set(-4.2, 2.1, 3.0);
    if (this.family === "overhead-extension") this.camera.position.set(4.0, 2.4, 3.5);
    this.controls.update();
  }
  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    const low = ["bench", "push-up", "hip-thrust", "lying-curl", "leg-press"].includes(this.family);
    const span = low ? 1.05 : 1.40;
    this.camera.left = -span * width / height; this.camera.right = span * width / height;
    this.camera.top = span; this.camera.bottom = -span;
    this.camera.updateProjectionMatrix(); this.render();
  }
  setProgress(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress));
    const frame = motionFor(this.exercise, this.progress);
    if (this.athlete && frame) {
      this.athlete.pose(frame);
      this.equipment?.update(this.progress, frame);
    }
    this.render();
  }
  highlight(selected?: MuscleRegion) {
    this.selected = selected;
    this.athlete?.highlight(anatomyForExercise(this.exercise), selected);
    this.render();
  }
  rotate(radians: number) {
    const delta = this.camera.position.clone().sub(this.controls.target);
    delta.applyAxisAngle(new T.Vector3(0, 1, 0), radians);
    this.camera.position.copy(this.controls.target).add(delta);
    this.controls.update(); this.render();
  }
  render() {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }
  debug() {
    return {
      family: this.family, progress: this.progress,
      renderer: this.renderer.getContext().getParameter(this.renderer.getContext().VERSION),
      bones: this.athlete?.bones.size,
      hands: this.athlete ? [this.athlete.position("wrist_L").toArray(), this.athlete.position("wrist_R").toArray()] : [],
      shoulders: this.athlete ? [this.athlete.position("upperarm01_L").toArray(), this.athlete.position("upperarm01_R").toArray()] : [],
    };
  }
  dispose() {
    this.disposed = true; this.observer.disconnect();
    this.controls.removeEventListener("change", this.onChange); this.controls.dispose();
    this.athlete?.dispose(); this.equipment?.dispose();
    this.floor.geometry.dispose(); (this.floor.material as T.Material).dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
