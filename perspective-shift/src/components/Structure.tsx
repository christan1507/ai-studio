/**
 * The decorative geometry of a level.
 *
 * Blocks are grouped by (shape, tone) so each group renders as one instanced
 * draw call with its own material — per-instance colour cannot carry the
 * emissive glow that the accent and glow tones need.
 *
 * Each group runs exactly *one* `useFrame` that walks its own instances, and
 * all vector maths reuses module-level temporaries. A per-block frame callback
 * with fresh `Vector3`s allocates thousands of objects a second on a busy
 * level, and the resulting GC sawtooth is visible as stutter in a game whose
 * whole appeal is smoothness.
 *
 * Art direction note: geometry is deliberately hard-edged and flat-shaded
 * rather than rounded. Crisp polygon silhouettes are what make an orthographic
 * impossible-object illusion read; softened edges give away the depth.
 */

import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Object3D } from 'three';

import { useSettingsStore } from '@/store/useSettingsStore';
import type { WorldRuntime } from '@/systems/runtime';
import type { Block, BlockShape, BlockTone, ChapterPalette, Vec3 } from '@/types';

/**
 * Per-shape box dimensions and the vertical offset needed to keep the block's
 * walking surface exactly at `pos.y + 0.5`, which is where `surfaceOf` in the
 * authoring kit places nodes.
 */
const SHAPE_GEOMETRY: Record<BlockShape, { size: Vec3; offsetY: number }> = {
  box: { size: [1, 1, 1], offsetY: 0 },
  // A taller block whose top still lands at +0.5, giving stairs visual mass
  // without emitting fill blocks underneath every step.
  stair: { size: [1, 1.7, 1], offsetY: -0.35 },
  platform: { size: [1, 0.34, 1], offsetY: 0.33 },
  pillar: { size: [0.82, 1, 0.82], offsetY: 0 },
  arch: { size: [0.9, 0.46, 0.9], offsetY: 0 },
  crystal: { size: [0.4, 0.9, 0.4], offsetY: 0 },
};

const EMISSIVE_BY_TONE: Record<BlockTone, number> = {
  base: 0,
  raised: 0,
  shadow: 0,
  accent: 0.14,
  glow: 0.7,
};

const tmpPivot = new THREE.Vector3();
const tmpAxis = new THREE.Vector3();

interface ShapeGroup {
  readonly key: string;
  readonly shape: BlockShape;
  readonly tone: BlockTone;
  readonly blocks: readonly Block[];
}

function groupBlocks(blocks: readonly Block[]): ShapeGroup[] {
  const groups = new Map<string, Block[]>();
  for (const block of blocks) {
    const tone = block.tone ?? 'base';
    const key = `${block.shape}:${tone}`;
    const existing = groups.get(key);
    if (existing) existing.push(block);
    else groups.set(key, [block]);
  }
  return [...groups.entries()].map(([key, grouped]) => {
    const [shape, tone] = key.split(':') as [BlockShape, BlockTone];
    return { key, shape, tone, blocks: grouped };
  });
}

/** Stable pseudo-random phase so the idle float drifts instead of pulsing in unison. */
function driftSeedFor(block: Block): number {
  const raw = block.pos[0] * 12.9898 + block.pos[2] * 78.233 + block.pos[1] * 37.719;
  return raw % (Math.PI * 2);
}

interface StructureProps {
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
}

export function Structure({ runtime, palette }: StructureProps): React.ReactElement {
  const shapeGroups = useMemo(() => groupBlocks(runtime.level.blocks), [runtime.level]);

  return (
    <group>
      {shapeGroups.map((group) => (
        <ShapeInstances key={group.key} group={group} runtime={runtime} palette={palette} />
      ))}
    </group>
  );
}

function ShapeInstances({
  group,
  runtime,
  palette,
}: {
  readonly group: ShapeGroup;
  readonly runtime: WorldRuntime;
  readonly palette: ChapterPalette;
}): React.ReactElement {
  const geometry = SHAPE_GEOMETRY[group.shape];
  const color = palette[group.tone];
  const isGlow = group.tone === 'glow';
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  const instanceRefs = useRef<Array<Object3D | null>>([]);
  const seeds = useMemo(() => group.blocks.map(driftSeedFor), [group.blocks]);

  /** Nothing to animate when every block is static and drift is switched off. */
  const anyMoving = useMemo(
    () => group.blocks.some((block) => block.group !== undefined),
    [group.blocks],
  );

  useFrame((state) => {
    if (!anyMoving && reducedMotion) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < group.blocks.length; i += 1) {
      const instance = instanceRefs.current[i];
      if (!instance) continue;
      const block = group.blocks[i];
      const moving = block.group !== undefined;
      if (!moving && reducedMotion) continue;

      const transform = runtime.transformFor(block.group);
      const bob = reducedMotion ? 0 : Math.sin(time * 0.6 + seeds[i]) * 0.045;

      instance.position.set(
        block.pos[0] + transform.offset[0],
        block.pos[1] + geometry.offsetY + transform.offset[1] + bob,
        block.pos[2] + transform.offset[2],
      );

      if (transform.angle !== 0) {
        // Rotation about an arbitrary pivot: orbit the position, then spin the
        // block itself so it stays oriented with its assembly.
        tmpPivot.set(transform.pivot[0], transform.pivot[1], transform.pivot[2]);
        tmpAxis.set(transform.axis[0], transform.axis[1], transform.axis[2]).normalize();
        instance.position.sub(tmpPivot).applyAxisAngle(tmpAxis, transform.angle).add(tmpPivot);
        instance.rotation.set(
          THREE.MathUtils.degToRad(block.rotX ?? 0),
          THREE.MathUtils.degToRad(block.rotY ?? 0),
          0,
        );
        instance.rotateOnWorldAxis(tmpAxis, transform.angle);
      }
    }
  });

  return (
    <Instances
      limit={Math.max(1, group.blocks.length)}
      range={group.blocks.length}
      castShadow={!isGlow}
      receiveShadow={!isGlow}
    >
      <boxGeometry args={[geometry.size[0], geometry.size[1], geometry.size[2]]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={EMISSIVE_BY_TONE[group.tone]}
        roughness={isGlow ? 0.3 : 0.78}
        metalness={0.02}
        flatShading
      />
      {group.blocks.map((block, index) => (
        <Instance
          key={index}
          ref={(instance: Object3D | null) => {
            instanceRefs.current[index] = instance;
          }}
          position={[block.pos[0], block.pos[1] + geometry.offsetY, block.pos[2]]}
          rotation={[
            THREE.MathUtils.degToRad(block.rotX ?? 0),
            THREE.MathUtils.degToRad(block.rotY ?? 0),
            0,
          ]}
          scale={
            block.size
              ? [
                  block.size[0] / geometry.size[0],
                  block.size[1] / geometry.size[1],
                  block.size[2] / geometry.size[2],
                ]
              : [1, 1, 1]
          }
        />
      ))}
    </Instances>
  );
}
