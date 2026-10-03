/**
 * The exit portal.
 *
 * Three counter-rotating rings plus a core, which flare outward and brighten
 * when the level is solved. The flare is driven off a local timer rather than
 * a transition library so it stays in step with the render loop and keeps
 * working if the tab throttles mid-animation.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Group, Mesh, MeshBasicMaterial } from 'three';

import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { WorldRuntime } from '@/systems/runtime';
import type { ChapterPalette } from '@/types';

/** Seconds the completion flare takes to bloom. */
const FLARE_DURATION = 1.6;

const tmpUp = new THREE.Vector3();

interface PortalProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
}

export function Portal({ runtime, palette }: PortalProps): React.ReactElement {
  const groupRef = useRef<Group>(null);
  const ringRefs = useRef<Array<Mesh | null>>([]);
  const coreRef = useRef<Mesh>(null);
  const flare = useRef(0);

  const status = useGameStore((state) => state.status);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(rawDelta, 1 / 20);
    const time = state.clock.elapsedTime;

    const exitPos = runtime.nodePosition(runtime.level.exit);
    const up = runtime.nodeUp(runtime.level.exit);
    group.position.set(exitPos[0], exitPos[1], exitPos[2]);
    tmpUp.set(up[0], up[1], up[2]).normalize();
    group.position.addScaledVector(tmpUp, 0.55);

    flare.current =
      status === 'complete'
        ? Math.min(1, flare.current + dt / FLARE_DURATION)
        : Math.max(0, flare.current - dt / 0.4);
    const eased = 1 - (1 - flare.current) ** 3;

    for (let i = 0; i < ringRefs.current.length; i += 1) {
      const ring = ringRefs.current[i];
      if (!ring) continue;
      const direction = i % 2 === 0 ? 1 : -1;
      const speed = reducedMotion ? 0 : 0.35 + i * 0.22;
      ring.rotation.z = time * speed * direction;
      ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.4 + i) * 0.22;
      const spread = 1 + eased * (0.9 + i * 0.5);
      ring.scale.setScalar(spread);
      const material = ring.material as MeshBasicMaterial;
      material.opacity = (0.5 - i * 0.1) * (1 - eased * 0.55);
    }

    const core = coreRef.current;
    if (core) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 2.1) * 0.06;
      core.scale.setScalar(pulse * (1 + eased * 1.8));
      const material = core.material as MeshBasicMaterial;
      material.opacity = 0.75 + eased * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(mesh: Mesh | null) => {
            ringRefs.current[index] = mesh;
          }}
        >
          <torusGeometry args={[0.42 + index * 0.16, 0.022, 8, 48]} />
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <pointLight color={palette.glow} intensity={1.4} distance={5} decay={2} />
    </group>
  );
}
