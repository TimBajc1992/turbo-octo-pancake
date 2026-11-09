import * as T from "three";
import { muscleRegions, type Anatomy, type MuscleRegion } from "../exerciseAnatomy";
import rig from "../assets/athlete-rig.json";

const regions = Object.keys(muscleRegions) as MuscleRegion[];
const bones = rig.bones as Record<string, { head: number[]; tail: number[] }>;
const num = (n: number) => n.toFixed(6);
const vec = (v: number[]) => `vec3(${v.map(num).join(",")})`;
const joint = (name: string) => bones[name].head;
const hip = joint("upperleg01_L")[1], shoulder = joint("upperarm01_L")[1];
const ellipse = (c: number[], r: number[]) => `ellipsoid(p,${vec(c)},${vec(r)})`;
const both = (fn: (sign: number) => string) => `max(${fn(1)},${fn(-1)})`;
const capsule = (a: number[], b: number[], radius: number, side = 0) => `limbMask(p,${vec(a)},${vec(b)},${num(radius)},${num(side)})`;
const fields: Record<MuscleRegion, string> = {
  chest: both((s) => ellipse([s * .098, shoulder - .077, .125], [.108, .100, .105])),
  frontDelts: both((s) => { const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`); return ellipse([p[0] + s * .02, p[1] - .005, p[2] + .047], [.065, .095, .073]); }),
  sideDelts: both((s) => { const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`); return ellipse([p[0] + s * .039, p[1] - .02, p[2]], [.072, .10, .080]); }),
  rearDelts: both((s) => { const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`); return ellipse([p[0], p[1] - .008, p[2] - .053], [.095, .085, .07]); }),
  biceps: both((s) => capsule(joint(`upperarm01_${s > 0 ? "L" : "R"}`), joint(`lowerarm01_${s > 0 ? "L" : "R"}`), .085, 1)),
  triceps: both((s) => capsule(joint(`upperarm01_${s > 0 ? "L" : "R"}`), joint(`lowerarm01_${s > 0 ? "L" : "R"}`), .085, -1)),
  forearms: both((s) => capsule(joint(`lowerarm01_${s > 0 ? "L" : "R"}`), joint(`wrist_${s > 0 ? "L" : "R"}`), .07)),
  lats: both((s) => ellipse([s * .125, hip + .30, -.082], [.105, .19, .085])),
  upperBack: `max(${ellipse([0, shoulder - .073, -.076], [.20, .12, .075])},${ellipse([0, hip + .35, -.065], [.105, .18, .07])})`,
  spinalErectors: both((s) => ellipse([s * .04, hip + .20, -.072], [.033, .19, .064])),
  abs: ellipse([0, hip + .218, .137], [.095, .146, .090]),
  obliques: both((s) => ellipse([s * .145, hip + .19, .045], [.068, .17, .14])),
  glutes: both((s) => ellipse([s * .105, hip - .018, -.105], [.115, .13, .095])),
  hipAbductors: both((s) => ellipse([s * .187, hip + .012, -.025], [.068, .12, .105])),
  quads: both((s) => capsule(joint(`upperleg01_${s > 0 ? "L" : "R"}`), joint(`lowerleg01_${s > 0 ? "L" : "R"}`), .125, 1)),
  hamstrings: both((s) => capsule(joint(`upperleg01_${s > 0 ? "L" : "R"}`), joint(`lowerleg01_${s > 0 ? "L" : "R"}`), .125, -1)),
  adductors: both((s) => { const a = [...joint(`upperleg01_${s > 0 ? "L" : "R"}`)], b = [...joint(`lowerleg01_${s > 0 ? "L" : "R"}`)]; a[0] -= s * .05; b[0] -= s * .05; return capsule(a, b, .07); }),
  calves: both((s) => capsule(joint(`lowerleg01_${s > 0 ? "L" : "R"}`), joint(`foot_${s > 0 ? "L" : "R"}`), .095, -1)),
  hipFlexors: both((s) => ellipse([s * .095, hip + .06, .095], [.065, .082, .075])),
};
const shaderFields = `
float ellipsoid(vec3 p,vec3 c,vec3 radius){return 1.0-smoothstep(.73,1.0,length((p-c)/radius));}
float limbMask(vec3 p,vec3 a,vec3 b,float radius,float side){
 vec3 ab=b-a;float t=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);vec3 center=a+ab*t;
 float radial=1.0-smoothstep(radius*.75,radius,length(p-center));
 float ends=smoothstep(.03,.18,t)*(1.-smoothstep(.83,.98,t));
 float face=side==0.?1.:smoothstep(-.006,.03,(p.z-center.z)*side);
 return radial*ends*face;
}
float muscleMask(int index,vec3 p){
 ${regions.map((id, i) => `if(index==${i})return ${fields[id]};`).join("\n")}
 return 0.;
}`;

/** Smooth anatomical tint is evaluated in rest space and follows the skinned mesh. */
export class MuscleTint {
  private primary = new Float32Array(regions.length);
  private secondary = new Float32Array(regions.length);
  private selected = new Float32Array(regions.length);
  attach(material: T.MeshStandardMaterial) {
    material.customProgramCacheKey = () => "tezisce-anatomy-3d-v1";
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uMusclePrimary: { value: this.primary }, uMuscleSecondary: { value: this.secondary }, uMuscleSelected: { value: this.selected },
        uMusclePrimaryColor: { value: new T.Color("#7D8FA8") }, uMuscleSecondaryColor: { value: new T.Color("#A39E93") },
      });
      shader.vertexShader = `attribute vec3 _anatomy;varying vec3 vAnatomy;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvAnatomy=_anatomy;");
      shader.fragmentShader = `varying vec3 vAnatomy;uniform float uMusclePrimary[19];uniform float uMuscleSecondary[19];uniform float uMuscleSelected[19];uniform vec3 uMusclePrimaryColor;uniform vec3 uMuscleSecondaryColor;\n${shaderFields}\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        float mp=0.;float ms=0.;float picked=0.;
        for(int i=0;i<19;i++){if(uMusclePrimary[i]>0.||uMuscleSecondary[i]>0.){float mask=muscleMask(i,vAnatomy);mp=max(mp,mask*uMusclePrimary[i]);ms=max(ms,mask*uMuscleSecondary[i]);picked=max(picked,mask*uMuscleSelected[i]);}}
        vec3 tint=mix(uMuscleSecondaryColor,uMusclePrimaryColor,mp/(mp+ms+.00001));
        diffuseColor.rgb=mix(diffuseColor.rgb,tint,max(mp,ms)*(.82+.10*picked));`);
    };
  }
  update(anatomy: Anatomy, selected?: MuscleRegion) {
    regions.forEach((region, i) => {
      this.primary[i] = anatomy.primary.includes(region) ? 1 : 0;
      this.secondary[i] = anatomy.secondary.includes(region) ? 1 : 0;
      this.selected[i] = selected === region ? 1 : 0;
    });
  }
}
