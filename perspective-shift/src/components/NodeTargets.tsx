/**
 * Tappable destinations.
 *
 * Two instanced layers: an invisible-but-raycastable hit disc on every node,
 * and a visible dot whose size tracks whether that node is reachable right
 * now. Keeping the hit layer always full-size means tapping an unreachable
 * tile still registers, so the UI can answer with a refusal instead of
 * silently ignoring the player.
 *
 * Reachability is recomputed on a throttle inside `useFrame`, never in React
 * state — phase-gated edges change several times a second as platforms cycle,
 * and re-rendering the scene graph at that rate would undo the whole
 * instancing strategy.
 */

import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Object3D } from 'three';

import { useGameStore } from '@/store/useGameStore';
import { reachableNodes } from '@/systems/pathfinding';
import type { WorldRuntime } from '@/systems/runtime';
import { wasTap } from '@/systems/input';
import type { ChapterPalette } from '@/types';

/** Seconds between reachability recomputations. */
const REFRESH_INTERVAL = 0.12;

interface NodeTargetsProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
  readonly onRefused: () => void;
}

export function NodeTargets({
  runtime,
  palette,
  onRefused,
}: NodeTargetsProps): React.ReactElement {
  const nodes = runtime.level.nodes;
  const requestMove = useGameStore((state) => state.requestMove);

  const dotRefs = useRef<Array<Object3D | null>>([]);
  const hitRefs = useRef<Array<Object3D | null>>([]);
  const reachable = useRef<Set<string>>(new Set());
  const timer = useRef(REFRESH_INTERVAL);
  const scales = useRef<number[]>(nodes.map(() => 0));

  const exitId = runtime.level.exit;
  const switchNodes = useMemo(
    () => new Set((runtime.level.switches ?? []).map((sw) => sw.node)),
    [runtime.level],
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20);
    timer.current += dt;

    const { characterNode, status } = useGameStore.getState();
    if (timer.current >= REFRESH_INTERVAL) {
      timer.current = 0;
      reachable.current =
        status === 'playing' && runtime.settled
          ? reachableNodes(runtime.level, runtime.worldState(), characterNode)
          : new Set<string>();
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const position = runtime.nodePosition(node.id);
      const up = runtime.nodeUp(node.id);

      // Hit targets must ride along with moving platforms, or tapping a tile
      // on a carousel aims at where it used to be.
      const hit = hitRefs.current[i];
      if (hit && node.group !== undefined) {
        hit.position.set(position[0], position[1] + 0.04, position[2]);
      }

      const dot = dotRefs.current[i];
      if (!dot) continue;

      // The node underfoot and the exit have their own visuals; a dot there
      // just clutters the illusion.
      const wanted =
        node.id === characterNode || node.id === exitId
          ? 0
          : reachable.current.has(node.id)
            ? switchNodes.has(node.id)
              ? 1
              : 0.62
            : 0;

      // Ease toward the target so dots fade in as a bridge forms rather than
      // popping into existence the instant a rotation lands.
      scales.current[i] += (wanted - scales.current[i]) * Math.min(1, dt * 9);
      const scale = scales.current[i];

      dot.position.set(
        position[0] + up[0] * 0.06,
        position[1] + up[1] * 0.06,
        position[2] + up[2] * 0.06,
      );
      dot.scale.set(scale, scale, scale);
    }
  });

  const handleTap = (nodeId: string): void => {
    if (!wasTap()) return;
    if (!requestMove(nodeId)) onRefused();
  };

  return (
    <group>
      {/* Hit layer: fully transparent, full size, always raycastable. */}
      <Instances limit={Math.max(1, nodes.length)} range={nodes.length}>
        <cylinderGeometry args={[0.44, 0.44, 0.06, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {nodes.map((node, index) => (
          <Instance
            key={node.id}
            ref={(instance: Object3D | null) => {
              hitRefs.current[index] = instance;
            }}
            position={[node.pos[0], node.pos[1] + 0.04, node.pos[2]]}
            onClick={(event) => {
              event.stopPropagation();
              handleTap(node.id);
            }}
          />
        ))}
      </Instances>

      {/* Visible dots. Drawn in the palette's one saturated hue rather than
          its glow: glow is near-white in every chapter and vanishes against
          the pale ones, whereas accent is chosen to contrast with both the
          structures and the sky. */}
      <Instances limit={Math.max(1, nodes.length)} range={nodes.length}>
        <cylinderGeometry args={[0.17, 0.17, 0.03, 16]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
        {nodes.map((node, index) => (
          <Instance
            key={node.id}
            ref={(instance: Object3D | null) => {
              dotRefs.current[index] = instance;
            }}
            scale={0}
          />
        ))}
      </Instances>
    </group>
  );
}
