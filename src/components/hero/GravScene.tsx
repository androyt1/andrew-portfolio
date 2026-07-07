import { useEffect, useRef, type MutableRefObject } from "react";
import { Camera, Geometry, Mesh, Program, Renderer, Sphere, Transform } from "ogl";
import { blobVertex, blobFragment } from "./blobShaders";

type PointerRef = MutableRefObject<{ x: number; y: number }>;

// blobVertex relies on three.js's ShaderMaterial auto-injecting `position`,
// `normal`, `modelViewMatrix`, `normalMatrix` and `projectionMatrix` — ogl
// compiles whatever source it's given verbatim, so this prelude replaces
// that injection. The noise/shading GLSL itself is untouched.
const VERTEX_PRELUDE = `
attribute vec3 position;
attribute vec3 normal;
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
`;

const PARTICLE_VERTEX = `
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPixelHeight;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPixelHeight * 0.028 / -mv.z, 1.0, 6.0);
}
`;

const PARTICLE_FRAGMENT = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, uOpacity * smoothstep(0.5, 0.1, d));
}
`;

// shell distribution between r=2.0 and 3.4, same as the original
function makeParticlePositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.0 + Math.random() * 1.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

export default function GravScene({
  pointer,
  reduced,
  lite = false,
  active = true,
}: {
  pointer: PointerRef;
  reduced: boolean;
  lite?: boolean;
  active?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  // heavy setup — only re-runs when the quality tier changes (never during a
  // session in practice, since reduced/lite come from stable media queries),
  // NOT on every `active` (on-screen) toggle. That mirrors the previous
  // frameloop="always"/"never" approach: pause/resume, don't tear down.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1.2 : lite ? 1.5 : 1.8);
    const renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: !lite,
      dpr,
      powerPreference: "high-performance",
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 42, near: 0.1, far: 100 });
    camera.position.set(0, 0, 6);
    let camZ = 6;

    const scene = new Transform();

    // --- blob ---
    const [wSeg, hSeg] = reduced ? [40, 24] : lite ? [72, 40] : [112, 64];
    const blobGeometry = new Sphere(gl, { radius: 1.25, widthSegments: wSeg, heightSegments: hSeg });
    const uMouse = { x: 0, y: 0, z: 1 };
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.38 },
      uFreq: { value: 1.25 },
      uMouse: { value: [0, 0, 1] },
      uMousePull: { value: 0 },
      uColorA: { value: [0x0b / 255, 0x0a / 255, 0x09 / 255] },
      uColorB: { value: [0x35 / 255, 0x32 / 255, 0x2e / 255] },
      uAccent: { value: [0x9a / 255, 0x94 / 255, 0x8a / 255] },
      uHot: { value: [0xf3 / 255, 0xf0 / 255, 0xe9 / 255] },
    };
    const blobProgram = new Program(gl, {
      vertex: VERTEX_PRELUDE + blobVertex,
      fragment: blobFragment,
      uniforms,
    });
    const blob = new Mesh(gl, { geometry: blobGeometry, program: blobProgram });
    blob.setParent(scene);

    // --- particles ---
    const count = reduced ? 240 : lite ? 300 : 560;
    const particleGeometry = new Geometry(gl, {
      position: { size: 3, data: makeParticlePositions(count) },
    });
    const particleProgram = new Program(gl, {
      vertex: PARTICLE_VERTEX,
      fragment: PARTICLE_FRAGMENT,
      uniforms: {
        uPixelHeight: { value: canvas.clientHeight || 800 },
        uColor: { value: [0xec / 255, 0xe8 / 255, 0xdf / 255] },
        uOpacity: { value: 0.6 },
      },
      transparent: true,
      depthWrite: false,
      cullFace: false,
    });
    particleProgram.setBlendFunc(gl.ONE, gl.ONE); // additive
    const particles = new Mesh(gl, { geometry: particleGeometry, program: particleProgram, mode: gl.POINTS });
    particles.setParent(scene);

    // --- resize ---
    function resize() {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
      particleProgram.uniforms.uPixelHeight.value = h;
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    // --- render loop ---
    let raf = 0;
    let running = false;
    let last = performance.now();
    let pull = 0;
    let t = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt * (reduced ? 0.3 : 1);
      uniforms.uTime.value = t;

      const p = pointer.current;
      const intensity = reduced ? 0 : Math.min(Math.hypot(p.x, p.y), 1);
      pull += (intensity * 0.9 - pull) * 0.06;
      uniforms.uMousePull.value = pull;

      // normalize(p.x, p.y, 0.7)
      const len = Math.hypot(p.x, p.y, 0.7) || 1;
      const tx = p.x / len;
      const ty = p.y / len;
      const tz = 0.7 / len;
      uMouse.x += (tx - uMouse.x) * 0.07;
      uMouse.y += (ty - uMouse.y) * 0.07;
      uMouse.z += (tz - uMouse.z) * 0.07;
      const mv = uniforms.uMouse.value as number[];
      mv[0] = uMouse.x;
      mv[1] = uMouse.y;
      mv[2] = uMouse.z;

      blob.rotation.y += dt * 0.08;
      blob.rotation.x += (p.y * 0.25 - blob.rotation.x) * 0.04;
      blob.rotation.z += (-p.x * 0.2 - blob.rotation.z) * 0.04;

      particles.rotation.y += dt * 0.04;
      particles.rotation.x += (p.y * 0.3 - particles.rotation.x) * 0.03;
      particles.rotation.z += (-p.x * 0.3 - particles.rotation.z) * 0.03;

      camZ += (4.1 - camZ) * 0.05;
      camera.position.z = camZ;

      renderer.render({ scene, camera });
    }

    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    startRef.current = start;
    stopRef.current = stop;
    if (active) start();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("resize", resize);
      // deliberately not calling WEBGL_lose_context here: the canvas node is
      // owned by this component and is removed from the DOM on real unmount,
      // which reclaims the context naturally. Forcing loseContext() races
      // with React StrictMode's dev-only double-invoke (the same <canvas>
      // node gets a fresh getContext() call before the loss finishes
      // propagating), which left the second program's uniform locations
      // unset and crashed the render loop on every frame.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, lite]);

  // cheap: just pause/resume the existing loop, no context churn
  useEffect(() => {
    if (active) startRef.current();
    else stopRef.current();
  }, [active]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
