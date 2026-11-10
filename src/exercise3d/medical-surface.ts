import * as T from "three";
import rig from "../assets/athlete-rig.json";
import atlasUrl from "../assets/anatomy-atlas.png?url";

let atlas: T.Texture | undefined;
let atlasPromise: Promise<T.Texture> | undefined;
const transparentAtlas = new T.DataTexture(
  new Uint8Array([0, 0, 0, 0]),
  1,
  1,
  T.RGBAFormat,
);
transparentAtlas.needsUpdate = true;
export function anatomyAtlas() {
  return atlas ?? transparentAtlas;
}
export function loadAnatomyAtlas() {
  if (!atlasPromise)
    atlasPromise = new T.TextureLoader()
      .loadAsync(atlasUrl)
      .then((texture) => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = 4;
        atlas = texture;
        return texture;
      })
      .catch((error) => {
        atlasPromise = undefined;
        throw error;
      });
  return atlasPromise;
}

/** Shared physical surface. Fibres use rest space and follow existing skinning. */
export function medicalMaterial(original: T.Material) {
  const shorts = original.name.includes("shorts");
  return new T.MeshPhysicalMaterial({
    name: original.name,
    color: shorts ? "#17202B" : "#4F6B80",
    metalness: shorts ? 0 : 0.08,
    roughness: shorts ? 0.83 : 0.36,
    clearcoat: 1,
    clearcoatRoughness: 0.22,
    ior: 1.42,
    specularIntensity: 0.8,
    envMapIntensity: 0.45,
  });
}
const bones = rig.bones as Record<string, { head: number[] }>;
const p = (name: string) =>
  `vec3(${bones[name].head.map((n) => n.toFixed(6)).join(",")})`;

export const athleticVolumeGLSL = `
float belly(vec3 p,vec3 a,vec3 b,float radius){
 vec3 shaft=b-a;float t=dot(p-a,shaft)/dot(shaft,shaft);
 vec3 centre=a+shaft*clamp(t,0.,1.);
 return exp(-pow(length(p-centre)/radius,4.))*exp(-pow(abs((t-.5)/.27),2.));
}
float athleticVolume(vec3 p){
 vec3 q=vec3(abs(p.x),p.y,p.z);
 float arm=belly(q,${p("upperarm01_L")},${p("lowerarm01_L")},.105);
 float delt=exp(-pow(length((q-${p("upperarm01_L")})/vec3(.10,.09,.09)),4.));
 float chest=exp(-pow(abs((q.x-.10)/.105),2.)-pow(abs((q.y-1.30)/.080),2.))*smoothstep(.035,.10,q.z);
 float thigh=belly(q,${p("upperleg01_L")},${p("lowerleg01_L")},.14);
 return arm*.014+delt*.012+chest*.007+thigh*.009;
}
`;

export function athleticVertex(source: string) {
  return (`attribute vec3 _anatomy;\n${athleticVolumeGLSL}\n` + source).replace(
    "#include <project_vertex>",
    "transformed += normalize(objectNormal)*athleticVolume(_anatomy);\n#include <project_vertex>",
  );
}

export const medicalSurfaceGLSL = `
float thinLine(float d,float width){return 1.-smoothstep(width,width*2.,abs(d));}
vec2 limbFibre(vec3 p,vec3 a,vec3 b){
 vec3 axis=normalize(b-a);float along=dot(p-a,axis)/length(b-a);
 vec3 u=normalize(cross(axis,vec3(0.,0.,1.)));vec3 w=normalize(cross(u,axis));
 vec3 r=p-a-axis*dot(p-a,axis);
 float angle=atan(dot(r,u),dot(r,w));
 return vec2(angle*43.+sin(along*7.)*1.5+along*2.,along);
}
vec4 anatomicalFibre(vec3 p,int region){
 vec3 q=vec3(abs(p.x),p.y,p.z);
 float phase=(p.y+p.x*.35)*710.;float tendon=0.;float septum=0.;
 if(region==0){
  vec2 d=q.xy-vec2(.245,1.365);phase=atan(d.y,d.x)*63.+length(d)*40.;
  septum=max(thinLine(p.x,.004),thinLine(p.y-(1.238+q.x*.12),.003));
 }else if(region>=1&&region<=3){
  vec3 c=${p("upperarm01_L")};vec3 d=q-c;
  phase=atan(d.x,d.z)*37.+d.y*50.;tendon=smoothstep(.075,.12,length(d));
 }else if(region==4||region==5){
  vec2 f=limbFibre(q,${p("upperarm01_L")},${p("lowerarm01_L")});phase=f.x;
  tendon=(1.-smoothstep(.07,.18,f.y))+smoothstep(.78,.96,f.y);
  septum=pow(abs(sin(f.x*.075+.5)),24.)*.45;
 }else if(region==6){
  vec2 f=limbFibre(q,${p("lowerarm01_L")},${p("wrist_L")});phase=f.x+f.y*9.;
  tendon=smoothstep(.69,.99,f.y)*.85;septum=pow(abs(sin(f.x*.095)),28.)*.5;
 }else if(region==7){phase=(q.y+q.x*.7)*720.;septum=thinLine(q.x-.055,.003)*.3;
 }else if(region==8||region==9){phase=(q.y-q.x*.68)*820.;septum=thinLine(p.x,.005);
 }else if(region==10){
  phase=p.x*1200.+sin(p.y*30.)*.2;
  float arch=cos(p.x*22.)*.008;
  septum=max(thinLine(p.x,.002),max(thinLine(p.y-1.095-arch,.0018),max(thinLine(p.y-1.155-arch,.0018),thinLine(p.y-1.215-arch,.0018))))*.75;
  septum=max(septum,thinLine(q.x-(.078+sin((p.y-1.07)*8.)*.012),.002)*.35);
 }else if(region==11){phase=(p.y-q.x*.85)*800.;septum=thinLine(q.x-.095,.003)*.45;
 }else if(region==12||region==13){phase=(q.y+q.x*.75)*750.;
 }else if(region>=14&&region<=16){
  vec2 f=limbFibre(q,${p("upperleg01_L")},${p("lowerleg01_L")});phase=f.x+f.y*2.5;
  tendon=smoothstep(.82,1.,f.y)*.78;septum=pow(abs(sin(f.x*.071+f.y*.5)),28.)*.7;
 }else if(region==17){
  vec2 f=limbFibre(q,${p("lowerleg01_L")},${p("foot_L")});phase=f.x+f.y*3.;
  tendon=smoothstep(.64,.98,f.y);septum=thinLine(q.x-.15,.003)*.45;
 }else if(region==18){phase=(p.y+q.x*.5)*850.;
 }else if(region==19){phase=(p.x+sin(p.y*22.)*.009)*1100.;}
 float aa=clamp(fwidth(phase)*.24,.04,.5);
 float strand=.5+.5*sin(phase+sin(phase*.117)*.5);
 float fine=1.-smoothstep(.04,.12+aa,strand);
 float bundles=.5+.5*sin(phase*.15);
 return vec4(strand,bundles,clamp(max(septum,tendon*.65)+fine*.10,0.,1.),fine);
}
vec3 anatomicalNormal(vec3 pos,vec3 norm,float height){
 vec3 dx=dFdx(pos),dy=dFdy(pos);vec3 a=cross(dy,norm),b=cross(norm,dx);
 float det=dot(dx,a);vec3 gradient=sign(det)*(dFdx(height)*a+dFdy(height)*b);
 return normalize(abs(det)*norm-gradient);
}
`;
