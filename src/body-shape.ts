const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const ease = (n: number) => {
  const t = clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Symbolic fixed-height comparison, shared by the 2D fallback and 3D model. */
export function bodyPoint(
  x: number,
  y: number,
  waist?: number,
  weight = 1,
): [number, number] {
  const mass = clamp(
    Math.sqrt(Number.isFinite(weight) && weight > 0 ? weight : 1),
    0.75,
    1.3,
  );
  const body = ease((y - 82) / 40) * (1 - ease((y - 398) / 32));
  const volume = 1 + (mass - 1) * body;
  const local =
    Math.exp(-(((y - 176) / 29) ** 2)) * Math.exp(-(((x - 180) / 57) ** 8));
  const waistScale =
    waist !== undefined && Number.isFinite(waist) && waist > 0
      ? clamp(waist, 0.7, 1.35)
      : volume;
  const delta = Math.min(waistScale - volume, volume * 0.36);
  return [180 + (x - 180) * (volume + delta * local), y];
}

export const bodyShapeGLSL = `
vec3 measuredBody(vec3 p,vec3 shape){
 if(shape.z==1.&&(shape.x<.5||shape.y==1.))return p;
 float y=(1.87-p.y)*450./1.95;float x=p.x*360./1.56;
 float mass=clamp(sqrt(max(shape.z,.001)),.75,1.3);
 float body=smoothstep(0.,1.,(y-82.)/40.)*(1.-smoothstep(0.,1.,(y-398.)/32.));
 float volume=1.+(mass-1.)*body;
 float local=exp(-pow(abs((y-176.)/29.),2.))*exp(-pow(abs(x/57.),8.));
 float waist=shape.x>.5?clamp(shape.y,.7,1.35):volume;
 float scale=volume+min(waist-volume,volume*.36)*local;
 p.x*=scale;p.z=.02+(p.z-.02)*scale;return p;
}
`;
