// Classic Ashima 3D simplex noise — used for organic vertex displacement.
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const blobVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform vec3 uMouse;       // mouse direction in object space
uniform float uMousePull;  // 0..1 reaction strength

varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

${SIMPLEX}

void main(){
  vec3 pos = position;

  // layered noise — slow base swell + faster surface ripple + fine flame shimmer
  float t = uTime * 0.35;
  float n1 = snoise(pos * uFreq + vec3(t));
  float n2 = snoise(pos * (uFreq * 2.3) + vec3(-t * 1.4)) * 0.4;
  float n3 = snoise(pos * (uFreq * 4.5) + vec3(uTime * 1.6)) * 0.12;
  float noise = n1 + n2 + n3;

  // gravitational pull toward the cursor direction
  float pull = max(dot(normalize(position), normalize(uMouse + 0.0001)), 0.0);
  pull = pow(pull, 2.5) * uMousePull;

  float disp = noise * uAmp + pull * 0.55;
  pos += normal * disp;

  vDisp = disp;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const blobFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorA;   // near-black base
uniform vec3 uColorB;   // deep red
uniform vec3 uAccent;   // orange
uniform vec3 uHot;      // hot yellow
uniform float uTime;

varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

void main(){
  // fresnel rim
  float fres = 1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0);
  fres = pow(fres, 2.2);

  // heat = how raised the surface is, with a live flame flicker over time
  float flick = 0.82 + 0.18 * sin(uTime * 6.0 + vDisp * 12.0);
  float heat = clamp(smoothstep(-0.45, 0.78, vDisp) * flick, 0.0, 1.0);

  // fire ramp: black -> deep red -> orange -> hot yellow on the ridges
  vec3 col = uColorA;
  col = mix(col, uColorB, smoothstep(0.05, 0.45, heat));
  col = mix(col, uAccent, smoothstep(0.34, 0.72, heat));
  col = mix(col, uHot,    smoothstep(0.70, 1.0, heat));

  // molten fresnel rim — orange edge that flares hot
  col = mix(col, uAccent, fres * 0.55);
  col += uHot * pow(fres, 1.6) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
