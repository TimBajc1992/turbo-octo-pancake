const l=(o,a,s)=>Math.max(a,Math.min(s,o)),p=o=>{const a=l(o,0,1);return a*a*(3-2*a)};function u(o,a,s,t=1){const c=l(Math.sqrt(Number.isFinite(t)&&t>0?t:1),.75,1.3),m=p((a-82)/40)*(1-p((a-398)/32)),e=1+(c-1)*m,n=Math.exp(-(((a-176)/29)**2))*Math.exp(-(((o-180)/57)**8)),h=s!==void 0&&Number.isFinite(s)&&s>0?l(s,.7,1.35):e,r=Math.min(h-e,e*.36);return[180+(o-180)*(e+r*n),a]}const x=`
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
`;export{x as a,u as b};
