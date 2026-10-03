/**
 * Switch plates.
 *
 * A switch is a pressure plate the character operates by finishing a walk on
 * it. Its colour reads its flag directly, so the player can always see which
 * way a gate is currently set without remembering what they last stepped on.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';

import { useGameStore } from '@/store/useGameStore';
import type { WorldRuntime } from '@/systems/runtime';
import type { ChapterPalette } from '@/types';

const tmpColor = new THREE.Color();
const tmpOn = new THREE.Color();
const tmpOff = new THREE.Color();

interface SwitchesProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
}

export function Switches({ runtime, palette }: SwitchesProps): React.ReactElement | null {
  const switches = runtime.level.switches ?? [];
  const meshRefs = useRef<Array<Mesh | null>>([]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20);
    const flags = useGameStore.getState().flags;
    tmpOn.set(palette.glow);
    tmpOff.set(palette.shadow);

    for (let i = 0; i < switches.length; i += 1) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const sw = switches[i];

      const position = runtime.nodePosition(sw.node);
      const up = runtime.nodeUp(sw.node);
      mesh.position.set(
        position[0] + up[0] * 0.02,
        position[1] + up[1] * 0.02,
        position[2] + up[2] * 0.02,
      );

      const on = flags[sw.flag] === true;
      const material = mesh.material as MeshStandardMaterial;
      tmpColor.copy(on ? tmpOn : tmpOff);
      // Ease the colour so a flag flip pulses rather than cuts.
      material.emissive.lerp(tmpColor, Math.min(1, dt * 6));
      material.emissiveIntensity = on
        ? 0.85 + Math.sin(state.clock.elapsedTime * 2.4) * 0.12
        : 0.15;
      // A pressed plate sits slightly lower in its housing.
      mesh.scale.y += ((on ? 0.55 : 1) - mesh.scale.y) * Math.min(1, dt * 7);
    }
  });

  if (switches.length === 0) return null;

  return (
    <group>
      {switches.map((sw, index) => (
        <mesh
          key={sw.id}
          ref={(mesh: Mesh | null) => {
            meshRefs.current[index] = mesh;
          }}
          receiveShadow
        >
          <cylinderGeometry args={[0.3, 0.34, 0.1, 6]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.shadow}
            emissiveIntensity={0.15}
            roughness={0.5}
            metalness={0.1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
