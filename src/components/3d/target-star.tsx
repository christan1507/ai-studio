"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, useEffect, Suspense } from "react";
import * as THREE from "three";

const MODEL_URL = "/assets/showreel/model.glb";
const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

// --- Procedural studio environment for polished chrome (ported from star.js makeChromeEnv) ---
// Large bright "softboxes" on a dark field -> crisp silver reflections + deep shadows.
function makeChromeEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d");
  if (!x) {
    return new THREE.Texture();
  }

  // Dark base — keeps chrome contrasty (silver on black), not "grey plastic".
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, "#3a4150"); // cool grey top
  g.addColorStop(0.45, "#10131a");
  g.addColorStop(1.0, "#020308"); // near-black bottom
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);

  // Bright horizontal "light shelf" (main softbox above the scene)
  const band = x.createLinearGradient(0, 110, 0, 215);
  band.addColorStop(0.0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(255,255,255,0.97)");
  band.addColorStop(1.0, "rgba(255,255,255,0)");
  x.fillStyle = band;
  x.fillRect(0, 110, 1024, 105);

  // Point softboxes — crisp white streak-reflections on the mirror surface
  const blob = (cx: number, cy: number, r: number, color: string) => {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = rg;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  blob(280, 150, 150, "rgba(255,255,255,0.95)");
  blob(740, 165, 130, "rgba(244,248,255,0.9)");
  blob(540, 340, 150, "rgba(200,214,235,0.45)"); // soft cool fill from below

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

function StarModel() {
  const { scene: gltfScene } = useGLTF(MODEL_URL, true) as unknown as {
    scene: THREE.Group;
  };
  const modelGroupRef = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const { gl, scene } = useThree();

  // Normalized + chromed clone of the loaded GLB (ported from star.js loader callback).
  const star = useMemo(() => {
    const root = gltfScene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        // Polished chrome: full metal, near-mirror, neutral silver, no rainbow.
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0xeef2f8,
          metalness: 1.0,
          roughness: 0.025,
          envMapIntensity: 1.35,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
        });
      }
    });
    // Center the model and normalize size into frame (base — scaled further by cfg).
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    root.scale.setScalar(2.4 / maxDim);
    return root;
  }, [gltfScene]);

  // Procedural environment map as the source of chrome reflections.
  useEffect(() => {
    const env = makeChromeEnv(gl);
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);

  // Transform + auto-rotate (ported from cfg + animate() in star.js).
  useFrame((_, delta) => {
    const group = modelGroupRef.current;
    if (!group) return;
    spin.current -= delta * (TWO_PI / 12); // clockwise, one revolution / 12s
    group.position.set(1.46, -0.43, -0.33);
    group.scale.setScalar(1.74);
    group.rotation.set(-44 * DEG, -44 * DEG, 0 * DEG + spin.current);
  });

  return (
    <group ref={modelGroupRef}>
      <primitive object={star} />
    </group>
  );
}

// --- Background mesh-gradient (same hero shader rendered behind the model) ---
const BG_VERT = /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BG_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  void addBlob(inout vec3 acc, inout float wsum, vec2 uv, vec2 center, float radius, vec3 color){
    float d = distance(uv, center);
    float w = exp(-(d*d)/(radius*radius));
    acc += color * w; wsum += w;
  }
  void main(){
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.22;
    vec2 uv = st;
    uv.x += 0.16 * snoise(st * 1.1 + vec2(0.0, t));
    uv.y += 0.16 * snoise(st * 1.1 + vec2(7.3, -t * 0.9));

    vec3 night    = vec3(0.020, 0.015, 0.045);
    vec3 indigo   = vec3(0.10,  0.08,  0.32);
    vec3 violet   = vec3(0.34,  0.14,  0.72);
    vec3 electric = vec3(0.52,  0.24,  0.92);
    vec3 glow     = vec3(0.82,  0.72,  0.99);

    vec3 acc = vec3(0.0); float wsum = 0.0;
    addBlob(acc, wsum, uv, vec2(0.5 + 0.05*sin(t*0.5), 1.18), 0.58, night);
    addBlob(acc, wsum, uv, vec2(-0.12, 1.05 + 0.05*cos(t*0.6)), 0.36, night);
    addBlob(acc, wsum, uv, vec2(1.12, 1.05 + 0.05*sin(t*0.6)), 0.36, night);
    addBlob(acc, wsum, uv, vec2(0.5 + 0.05*sin(t*0.4), 0.66 + 0.05*cos(t*0.5)), 0.40, indigo);
    addBlob(acc, wsum, uv, vec2(0.16 + 0.05*cos(t*0.8), 0.46), 0.26, indigo);
    addBlob(acc, wsum, uv, vec2(0.84 + 0.05*sin(t*0.8), 0.46), 0.26, indigo);
    addBlob(acc, wsum, uv, vec2(0.5 + 0.07*sin(t*0.6), 0.30 + 0.05*cos(t*0.6)), 0.42, violet);
    addBlob(acc, wsum, uv, vec2(0.5 + 0.06*sin(t*0.9), 0.12 + 0.04*cos(t*0.8)), 0.34, electric);
    addBlob(acc, wsum, uv, vec2(0.44 + 0.05*sin(t*1.1), 0.02 + 0.03*cos(t)), 0.17, glow);
    addBlob(acc, wsum, uv, vec2(-0.10, -0.05), 0.28, night);
    addBlob(acc, wsum, uv, vec2(1.10, -0.05), 0.28, night);

    vec3 col = acc / max(wsum, 0.0001);
    vec2 hot = vec2(0.44 + 0.05*sin(t*1.1), 0.02 + 0.03*cos(t));
    float hotGlow = exp(-distance(uv, hot) * 4.5);
    col += vec3(0.78, 0.68, 1.0) * hotGlow * 0.7;

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.4);
    col = max(col, 0.0); col = clamp(col, 0.0, 1.0);
    col = pow(col, vec3(0.90));
    float vig = smoothstep(1.20, 0.32, distance(st, vec2(0.5, 0.22)));
    col *= 0.50 + 0.50 * vig;
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_time * 0.5) * 43758.5453);
    col += (grain - 0.5) * 0.05;
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function BackgroundGradient() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl, size, viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_time: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    const dpr = viewport.dpr || gl.getPixelRatio();
    uniforms.u_resolution.value.set(
      Math.round(size.width * dpr),
      Math.round(size.height * dpr),
    );
  }, [gl, size, viewport.dpr, uniforms]);

  useFrame((state) => {
    uniforms.u_time.value = state.clock.getElapsedTime();
  });

  // Fullscreen triangle/quad rendered behind the model. The vertex shader ignores
  // the camera (clip-space positions), so this fills the viewport. renderOrder + depth
  // flags keep it behind the star without writing depth.
  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={BG_VERT}
        fragmentShader={BG_FRAG}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

useGLTF.preload(MODEL_URL, true);

export function TargetStar({
  className,
  active = true,
}: {
  className?: string;
  /** Pause the render loop when off-screen (see timeline `sceneVisibility`). */
  active?: boolean;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        // Buffer sized from the layout box, not the CSS-transformed rect (see
        // flame-background). The target block is zoomed into via the camera-rig
        // translateZ; tracking its scaled rect reallocated the framebuffer every
        // scroll frame, which froze the page on approach and stretched the scene.
        resize={{ offsetSize: true, scroll: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <BackgroundGradient />
        <ambientLight color={0xffffff} intensity={0.25} />
        <directionalLight color={0xffffff} intensity={2.0} position={[2.5, 3.0, 4.0]} />
        <directionalLight color={0xcfe0ff} intensity={0.9} position={[-3.0, -1.5, 2.0]} />
        <Suspense fallback={null}>
          <StarModel />
        </Suspense>
      </Canvas>
    </div>
  );
}
