import * as T from "three";
import {
  muscleRegions,
  type Anatomy,
  type MuscleRegion,
} from "../exerciseAnatomy";
import rig from "../assets/athlete-rig.json";
import {
  medicalSurfaceGLSL,
  athleticVertex,
  anatomyAtlas,
} from "./medical-surface";
import { bodyShapeGLSL } from "../body-shape";

const regions = Object.keys(muscleRegions) as MuscleRegion[];
const bones = rig.bones as Record<string, { head: number[]; tail: number[] }>;
const num = (n: number) => n.toFixed(6);
const vec = (v: number[]) => `vec3(${v.map(num).join(",")})`;
const joint = (name: string) => bones[name].head;
const hip = joint("upperleg01_L")[1],
  shoulder = joint("upperarm01_L")[1];
const ellipse = (c: number[], r: number[]) =>
  `ellipsoid(p,${vec(c)},${vec(r)})`;
const both = (fn: (sign: number) => string) => `max(${fn(1)},${fn(-1)})`;
const capsule = (a: number[], b: number[], radius: number, side = 0) =>
  `limbMask(p,${vec(a)},${vec(b)},${num(radius)},${num(side)})`;
const fields: Record<MuscleRegion, string> = {
  chest: both((s) =>
    ellipse([s * 0.098, shoulder - 0.077, 0.125], [0.13, 0.11, 0.13]),
  ),
  frontDelts: both((s) => {
    const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`);
    return ellipse(
      [p[0] + s * 0.02, p[1] - 0.005, p[2] + 0.047],
      [0.085, 0.11, 0.1],
    );
  }),
  sideDelts: both((s) => {
    const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`);
    return ellipse([p[0] + s * 0.039, p[1] - 0.02, p[2]], [0.092, 0.12, 0.1]);
  }),
  rearDelts: both((s) => {
    const p = joint(`upperarm01_${s > 0 ? "L" : "R"}`);
    return ellipse([p[0], p[1] - 0.008, p[2] - 0.053], [0.095, 0.085, 0.07]);
  }),
  biceps: both((s) =>
    capsule(
      joint(`upperarm01_${s > 0 ? "L" : "R"}`),
      joint(`lowerarm01_${s > 0 ? "L" : "R"}`),
      0.085,
      1,
    ),
  ),
  triceps: both((s) =>
    capsule(
      joint(`upperarm01_${s > 0 ? "L" : "R"}`),
      joint(`lowerarm01_${s > 0 ? "L" : "R"}`),
      0.085,
      -1,
    ),
  ),
  forearms: both((s) =>
    capsule(
      joint(`lowerarm01_${s > 0 ? "L" : "R"}`),
      joint(`wrist_${s > 0 ? "L" : "R"}`),
      0.07,
    ),
  ),
  lats: both((s) =>
    ellipse([s * 0.125, hip + 0.3, -0.082], [0.105, 0.19, 0.085]),
  ),
  upperBack: `max(${ellipse([0, shoulder - 0.073, -0.076], [0.2, 0.12, 0.075])},${ellipse([0, hip + 0.35, -0.065], [0.105, 0.18, 0.07])})`,
  spinalErectors: both((s) =>
    ellipse([s * 0.04, hip + 0.2, -0.072], [0.033, 0.19, 0.064]),
  ),
  abs: ellipse([0, hip + 0.218, 0.137], [0.095, 0.146, 0.09]),
  obliques: both((s) =>
    ellipse([s * 0.145, hip + 0.19, 0.045], [0.068, 0.17, 0.14]),
  ),
  glutes: both((s) =>
    ellipse([s * 0.105, hip - 0.018, -0.105], [0.115, 0.13, 0.095]),
  ),
  hipAbductors: both((s) =>
    ellipse([s * 0.187, hip + 0.012, -0.025], [0.068, 0.12, 0.105]),
  ),
  quads: both((s) =>
    capsule(
      joint(`upperleg01_${s > 0 ? "L" : "R"}`),
      joint(`lowerleg01_${s > 0 ? "L" : "R"}`),
      0.125,
      1,
    ),
  ),
  hamstrings: both((s) =>
    capsule(
      joint(`upperleg01_${s > 0 ? "L" : "R"}`),
      joint(`lowerleg01_${s > 0 ? "L" : "R"}`),
      0.125,
      -1,
    ),
  ),
  adductors: both((s) => {
    const a = [...joint(`upperleg01_${s > 0 ? "L" : "R"}`)],
      b = [...joint(`lowerleg01_${s > 0 ? "L" : "R"}`)];
    a[0] -= s * 0.05;
    b[0] -= s * 0.05;
    return capsule(a, b, 0.07);
  }),
  calves: both((s) =>
    capsule(
      joint(`lowerleg01_${s > 0 ? "L" : "R"}`),
      joint(`foot_${s > 0 ? "L" : "R"}`),
      0.095,
      -1,
    ),
  ),
  hipFlexors: both((s) =>
    ellipse([s * 0.095, hip + 0.06, 0.095], [0.065, 0.082, 0.075]),
  ),
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
  private shape = new T.Vector3(0, 1, 1);
  attach(material: T.MeshStandardMaterial) {
    material.customProgramCacheKey = () => "tezisce-glass-anatomy-v3";
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uMusclePrimary: { value: this.primary },
        uMuscleSecondary: { value: this.secondary },
        uMuscleSelected: { value: this.selected },
        uMusclePrimaryColor: { value: new T.Color("#FF5B2D") },
        uMuscleSecondaryColor: { value: new T.Color("#CA9488") },
        uMuscleDark: { value: new T.Color("#5E2736") },
        uMuscleLight: { value: new T.Color("#A85655") },
        uFascia: { value: new T.Color("#D8E0DC") },
        uGlass: { value: new T.Color("#9BB9C8") },
        uClothed: { value: material.name.includes("shorts") ? 1 : 0 },
        uBodyShape: { value: this.shape },
        uAnatomyAtlas: { value: anatomyAtlas() },
      });
      shader.vertexShader =
        `varying vec3 vAnatomy;uniform vec3 uBodyShape;\n${bodyShapeGLSL}\n` +
        athleticVertex(shader.vertexShader);
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAnatomy=_anatomy;",
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        "transformed=measuredBody(transformed,uBodyShape);\n#include <project_vertex>",
      );
      shader.fragmentShader =
        `varying vec3 vAnatomy;uniform sampler2D uAnatomyAtlas;uniform float uMusclePrimary[19];uniform float uMuscleSecondary[19];uniform float uMuscleSelected[19];uniform vec3 uMusclePrimaryColor;uniform vec3 uMuscleSecondaryColor;uniform vec3 uMuscleDark;uniform vec3 uMuscleLight;uniform vec3 uFascia;uniform vec3 uGlass;uniform float uClothed;\n${shaderFields}\n${medicalSurfaceGLSL}\n` +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float mp=0.;float ms=0.;float picked=0.;float coverage=0.;
        int muscle=vAnatomy.y<.54?17:vAnatomy.y<.95?14:abs(vAnatomy.x)>.30?6:vAnatomy.y>1.47?19:10;
        for(int i=0;i<19;i++){float mask=muscleMask(i,vAnatomy);if(mask>coverage){coverage=mask;muscle=i;}mp=max(mp,mask*uMusclePrimary[i]);ms=max(ms,mask*uMuscleSecondary[i]);picked=max(picked,mask*uMuscleSelected[i]);}
        vec4 fibre=anatomicalFibre(vAnatomy,muscle);
        float briefLine=.83+.045*smoothstep(.04,.19,abs(vAnatomy.x));
        float clothing=uClothed*smoothstep(briefLine-.004,briefLine+.004,vAnatomy.y);
        float bodyTissue=smoothstep(.10,.17,vAnatomy.y)*(1.-smoothstep(1.50,1.61,vAnatomy.y))*(1.-smoothstep(.50,.58,abs(vAnatomy.x)));
        float tissue=max(smoothstep(.015,.38,coverage),bodyTissue*.94)*(1.-clothing);
        vec3 flesh=mix(uMuscleDark,uMuscleLight,.23+.45*fibre.x+.18*fibre.y);
        flesh=mix(flesh,uFascia,fibre.z*.65);
        vec3 restNormal=normalize(cross(dFdx(vAnatomy),dFdy(vAnatomy)));
        vec2 atlasUV=vec2((vAnatomy.x+.78)/1.56,(vAnatomy.y+.08)/1.95);
        vec4 frontSurface=texture2D(uAnatomyAtlas,vec2(atlasUV.x*.5,atlasUV.y));
        vec4 backSurface=texture2D(uAnatomyAtlas,vec2(.5+(1.-atlasUV.x)*.5,atlasUV.y));
        vec4 naturalSurface=mix(backSurface,frontSurface,smoothstep(-.25,.25,restNormal.z));
        flesh=mix(flesh,naturalSurface.rgb,naturalSurface.a*.97);
        flesh*=.78;
        diffuseColor.rgb=mix(diffuseColor.rgb,flesh,tissue);
        vec3 tint=mix(uMuscleSecondaryColor,uMusclePrimaryColor,mp/(mp+ms+.00001));
        diffuseColor.rgb=mix(diffuseColor.rgb,tint,ms*.38);
        float activeMuscle=smoothstep(.015,.40,mp);
        float naturalValue=dot(naturalSurface.rgb,vec3(.25,.55,.20));
        float fibreValue=mix(fibre.x,clamp(sqrt(naturalValue)*1.5,.3,1.),naturalSurface.a);
        vec3 activeFibre=uMusclePrimaryColor*(.52+.48*fibreValue);
        diffuseColor.rgb=mix(diffuseColor.rgb,activeFibre,activeMuscle*.92);
        float anatomicalRelief=mix(fibre.x*.00022-fibre.z*.00055,naturalValue*.0007,naturalSurface.a*.95)*tissue;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        normal=anatomicalNormal(-vViewPosition,normal,anatomicalRelief);
        float glassRim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
        diffuseColor.rgb=mix(diffuseColor.rgb,uGlass,glassRim*.4*(1.-clothing));`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance+=uMusclePrimaryColor*(activeMuscle*(1.35+.65*fibreValue)+mp*.18+picked*.1)+uGlass*glassRim*.025*(1.-clothing);`,
      );
    };
  }
  update(anatomy: Anatomy, selected?: MuscleRegion) {
    regions.forEach((region, i) => {
      this.primary[i] = anatomy.primary.includes(region) ? 1 : 0;
      this.secondary[i] = anatomy.secondary.includes(region) ? 1 : 0;
      this.selected[i] = selected === region ? 1 : 0;
    });
  }
  bodyShape(waist?: number, weight = 1) {
    this.shape.set(waist === undefined ? 0 : 1, waist ?? 1, weight);
  }
}
