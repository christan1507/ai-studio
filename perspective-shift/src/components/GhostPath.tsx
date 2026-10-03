/**
 * The ghost path hint.
 *
 * Draws the span that *would* exist at the suggested rotation, as a faint
 * dotted line, plus a marker showing which way to turn. It shows the shape of
 * the answer without taking the move: the player still has to make the
 * rotation themselves.
 *
 * Recomputed on a slow throttle rather than per frame — the hint only changes
 * when the player does something, and the search is cheap but not free.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Object3D } from 'three';
import { Instance, Instances } from '@react-three/drei';

import { useGameStore } from '@/store/useGameStore';
import { nextHint, type Hint } from '@/systems/hint';
import type { WorldRuntime } from '@/systems/runtime';
import type { ChapterPalette } from '@/types';

/** Number of dots along the ghost span. */
const DOTS = 14;
/** Seconds between hint recomputations. */
const REFRESH_INTERVAL = 0.6;

const tmpFrom = new THREE.Vector3();
const tmpTo = new THREE.Vector3();

interface GhostPathProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
  readonly visible: boolean;
}

export function GhostPath({ runtime, palette, visible }: GhostPathProps): React.ReactElement {
  const dotRefs = useRef<Array<Object3D | null>>([]);
  const hint = useRef<Hint>({ kind: 'none' });
  const timer = useRef(REFRESH_INTERVAL);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20);
    const time = state.clock.elapsedTime;

    if (!visible) {
      for (const dot of dotRefs.current) dot?.scale.setScalar(0);
      // Force a fresh search the moment the hint is switched back on.
      timer.current = REFRESH_INTERVAL;
      return;
    }

    timer.current += dt;
    if (timer.current >= REFRESH_INTERVAL) {
      timer.current = 0;
      const { characterNode, status } = useGameStore.getState();
      hint.current =
        status === 'playing'
          ? nextHint(runtime.level, runtime.worldState(), characterNode)
          : { kind: 'none' };
    }

    const current = hint.current;
    if (current.kind !== 'rotate') {
      for (const dot of dotRefs.current) dot?.scale.setScalar(0);
      return;
    }

    const from = runtime.nodePosition(current.edge.a);
    const to = runtime.nodePosition(current.edge.b);
    tmpFrom.set(from[0], from[1], from[2]);
    tmpTo.set(to[0], to[1], to[2]);

    for (let i = 0; i < DOTS; i += 1) {
      const dot = dotRefs.current[i];
      if (!dot) continue;
      const t = i / (DOTS - 1);
      dot.position.lerpVectors(tmpFrom, tmpTo, t);
      // A travelling pulse reads as direction rather than a static dashed line.
      const pulse = Math.sin(time * 2.4 - t * Math.PI * 3);
      dot.scale.setScalar(0.05 + Math.max(0, pulse) * 0.055);
    }
  });

  return (
    <Instances limit={DOTS} range={DOTS}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={palette.glow}
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
      {Array.from({ length: DOTS }, (_, index) => (
        <Instance
          key={index}
          ref={(instance: Object3D | null) => {
            dotRefs.current[index] = instance;
          }}
          scale={0}
        />
      ))}
    </Instances>
  );
}
