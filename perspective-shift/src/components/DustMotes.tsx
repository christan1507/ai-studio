/**
 * Ambient dust.
 *
 * Rendered *outside* the rotating structure group on purpose: motes belong to
 * the room, not the monument. Spinning them along with the geometry would read
 * as the whole world turning, which kills the illusion that the camera is
 * fixed and only the structure moves.
 *
 * Positions are seeded deterministically so a level looks identical on every
 * visit and in photo mode.
 */

import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Object3D } from 'three';

import { useSettingsStore } from '@/store/useSettingsStore';
import type { Bounds } from '@/systems/bounds';
import type { ChapterPalette } from '@/types';

interface Mote {
  readonly origin: readonly [number, number, number];
  readonly drift: number;
  readonly speed: number;
  readonly size: number;
}

/** Small deterministic PRNG so dust is stable across reloads. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DustMotesProps {
  readonly bounds: Bounds;
  readonly palette: ChapterPalette;
  readonly count?: number;
  readonly seed?: number;
}

export function DustMotes({
  bounds,
  palette,
  count = 90,
  seed = 1337,
}: DustMotesProps): React.ReactElement | null {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const refs = useRef<Array<Object3D | null>>([]);

  const motes = useMemo<Mote[]>(() => {
    const random = mulberry32(seed);
    const spread = bounds.radius * 2.2;
    return Array.from({ length: count }, () => ({
      origin: [
        (random() - 0.5) * spread,
        (random() - 0.4) * spread * 0.9,
        (random() - 0.5) * spread,
      ] as const,
      drift: random() * Math.PI * 2,
      speed: 0.08 + random() * 0.16,
      size: 0.012 + random() * 0.03,
    }));
  }, [bounds.radius, count, seed]);

  useFrame((state) => {
    if (reducedMotion) return;
    const time = state.clock.elapsedTime;
    for (let i = 0; i < motes.length; i += 1) {
      const instance = refs.current[i];
      if (!instance) continue;
      const mote = motes[i];
      instance.position.set(
        mote.origin[0] + Math.sin(time * mote.speed + mote.drift) * 0.6,
        mote.origin[1] + Math.sin(time * mote.speed * 0.7 + mote.drift * 1.7) * 0.5,
        mote.origin[2] + Math.cos(time * mote.speed * 0.9 + mote.drift) * 0.6,
      );
    }
  });

  if (count <= 0) return null;

  return (
    <Instances limit={count} range={count}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={palette.glow}
        transparent
        opacity={0.34}
        depthWrite={false}
        toneMapped={false}
      />
      {motes.map((mote, index) => (
        <Instance
          key={index}
          ref={(instance: Object3D | null) => {
            refs.current[index] = instance;
          }}
          position={[mote.origin[0], mote.origin[1], mote.origin[2]]}
          scale={mote.size}
        />
      ))}
    </Instances>
  );
}
