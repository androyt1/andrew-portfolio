import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { blobVertex, blobFragment } from "./blobShaders";

type PointerRef = MutableRefObject<{ x: number; y: number }>;

function Blob({
  pointer,
  reduced,
  lite,
}: {
  pointer: PointerRef;
  reduced: boolean;
  lite: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mouse = useRef(new THREE.Vector3(0, 0, 1));
  const pull = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.38 },
      uFreq: { value: 1.25 },
      uMouse: { value: new THREE.Vector3(0, 0, 1) },
      uMousePull: { value: 0 },
      uColorA: { value: new THREE.Color("#0a0402") },
      uColorB: { value: new THREE.Color("#6e1208") },
      uAccent: { value: new THREE.Color("#ff5a1f") },
      uHot: { value: new THREE.Color("#ffd24a") },
    }),
    [],
  );

  useFrame((_state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const dt = Math.min(delta, 0.05);
    u.uTime.value += dt * (reduced ? 0.3 : 1);

    // target pull rises while the pointer is off-centre
    const p = pointer.current;
    const intensity = reduced ? 0 : Math.min(Math.hypot(p.x, p.y), 1);
    pull.current += (intensity * 0.9 - pull.current) * 0.06;
    u.uMousePull.value = pull.current;

    mouse.current.set(p.x, p.y, 0.7).normalize();
    (u.uMouse.value as THREE.Vector3).lerp(mouse.current, 0.07);

    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.08;
      mesh.current.rotation.x = THREE.MathUtils.lerp(
        mesh.current.rotation.x,
        p.y * 0.25,
        0.04,
      );
      mesh.current.rotation.z = THREE.MathUtils.lerp(
        mesh.current.rotation.z,
        -p.x * 0.2,
        0.04,
      );
    }
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.25, reduced ? 24 : lite ? 44 : 72]} />
      <shaderMaterial
        ref={mat}
        vertexShader={blobVertex}
        fragmentShader={blobFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function Particles({
  pointer,
  reduced,
  lite,
}: {
  pointer: PointerRef;
  reduced: boolean;
  lite: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = reduced ? 240 : lite ? 300 : 560;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // shell distribution between r=2.0 and 3.4
      const r = 2.0 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.05);
    ref.current.rotation.y += dt * 0.04;
    ref.current.rotation.x = THREE.MathUtils.lerp(
      ref.current.rotation.x,
      pointer.current.y * 0.3,
      0.03,
    );
    ref.current.rotation.z = THREE.MathUtils.lerp(
      ref.current.rotation.z,
      -pointer.current.x * 0.3,
      0.03,
    );
    void reduced;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ff8a3d"
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Resize-aware DPR + subtle entrance scale. */
function Rig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.z += (4.1 - camera.position.z) * 0.05;
  });
  return null;
}

export default function GravScene({
  pointer,
  reduced,
  lite = false,
}: {
  pointer: PointerRef;
  reduced: boolean;
  lite?: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      dpr={[1, reduced ? 1.2 : lite ? 1.5 : 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Rig />
      <Blob pointer={pointer} reduced={reduced} lite={lite} />
      <Particles pointer={pointer} reduced={reduced} lite={lite} />
    </Canvas>
  );
}
