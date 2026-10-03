/**
 * Glowing bridges along connection edges.
 *
 * Two visual states, driven by two different notions of rotation:
 *
 * - **Active** — decided by the *snapped* angle, exactly as gameplay and the
 *   solvability checker see it. A bridge that looks solid is always walkable.
 * - **Forming** — a faint shimmer scaled by how close the *continuous* angle
 *   is to the requirement. This is what makes rotating feel responsive: the
 *   player sees a connection gathering before it locks in, without ever being
 *   able to walk a half-formed path.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';

import { isEdgeActive } from '@/systems/connections';
import { alignmentProximity } from '@/systems/rotation';
import type { WorldRuntime } from '@/systems/runtime';
import type { ChapterPalette, Edge } from '@/types';

const BRIDGE_WIDTH = 0.72;
const BRIDGE_THICKNESS = 0.09;
/** How bright a fully-formed bridge glows versus one that is merely near. */
const ACTIVE_OPACITY = 0.92;
const FORMING_OPACITY = 0.3;

const tmpFrom = new THREE.Vector3();
const tmpTo = new THREE.Vector3();
const tmpDirection = new THREE.Vector3();
const tmpMid = new THREE.Vector3();
/** The bridge box is built with its length along local +Z. */
const FORWARD = new THREE.Vector3(0, 0, 1);

interface BridgesProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
}

export function Bridges({ runtime, palette }: BridgesProps): React.ReactElement {
  const bridgeEdges = useMemo(
    () => runtime.level.edges.filter((edge) => edge.bridge === true),
    [runtime.level],
  );

  const meshRefs = useRef<Array<Mesh | null>>([]);

  useFrame(() => {
    const snappedState = runtime.worldState();
    const visual = runtime.visualWorldState();

    for (let i = 0; i < bridgeEdges.length; i += 1) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const edge = bridgeEdges[i];

      const active = isEdgeActive(edge, snappedState);
      const strength = active ? 1 : formingStrength(edge, visual, runtime);

      const material = mesh.material as MeshBasicMaterial;
      if (strength <= 0.001) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      material.opacity = active
        ? ACTIVE_OPACITY
        : FORMING_OPACITY * strength;

      const from = runtime.nodePosition(edge.a);
      const to = runtime.nodePosition(edge.b);
      tmpFrom.set(from[0], from[1], from[2]);
      tmpTo.set(to[0], to[1], to[2]);
      tmpDirection.subVectors(tmpTo, tmpFrom);
      const length = tmpDirection.length();
      if (length < 1e-5) {
        mesh.visible = false;
        continue;
      }

      tmpMid.addVectors(tmpFrom, tmpTo).multiplyScalar(0.5);
      mesh.position.copy(tmpMid);
      // A forming bridge grows out from its midpoint rather than appearing at
      // full span, so the connection reads as assembling itself.
      mesh.scale.set(active ? 1 : 0.35 + strength * 0.65, 1, length);
      mesh.quaternion.setFromUnitVectors(FORWARD, tmpDirection.normalize());
    }
  });

  return (
    <group>
      {bridgeEdges.map((edge, index) => (
        <mesh
          key={`${edge.a}-${edge.b}-${index}`}
          ref={(mesh: Mesh | null) => {
            meshRefs.current[index] = mesh;
          }}
          visible={false}
        >
          <boxGeometry args={[BRIDGE_WIDTH, BRIDGE_THICKNESS, 1]} />
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * How close an inactive bridge is to forming, as 0..1.
 *
 * Only the angular requirement produces a shimmer — a bridge held shut by an
 * unthrown switch or a platform out of position should give no hint that
 * rotating further would help, because it wouldn't.
 */
function formingStrength(
  edge: Edge,
  visual: ReturnType<WorldRuntime['visualWorldState']>,
  runtime: WorldRuntime,
): number {
  if (edge.requiresFlag !== undefined && visual.flags[edge.requiresFlag] !== true) return 0;
  if (edge.requiresFlagOff !== undefined && visual.flags[edge.requiresFlagOff] === true) return 0;
  if (edge.requiresPhase !== undefined) return 0;

  // No angular requirement means there is nothing to approach, so nothing to
  // shimmer — the edge is held shut by something rotation cannot change.
  const hasYaw = edge.requiresYaw !== undefined;
  const hasPitch = edge.requiresPitch !== undefined && runtime.allowPitch;
  if (!hasYaw && !hasPitch) return 0;

  let strength = 1;
  if (hasYaw) strength *= alignmentProximity(visual.yaw, edge.requiresYaw as number);
  if (hasPitch) strength *= alignmentProximity(visual.pitch, edge.requiresPitch as number);
  return strength;
}
