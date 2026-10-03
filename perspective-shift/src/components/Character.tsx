/**
 * The player's orb.
 *
 * Lives inside the structure group in *local* space, so rotating the world
 * carries the character with it and no movement maths ever has to account for
 * rotation — the same reason Monument Valley's geometry reads correctly.
 *
 * The trail is hand-rolled rather than using drei's `<Trail>` because that
 * samples world positions: spinning the structure after a walk would smear
 * the ribbon across the screen. Sampling local positions keeps the trail glued
 * to the path the character actually took.
 */

import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Mesh, Object3D } from 'three';

import { skinById, trailById } from '@/data/skins';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { WorldRuntime } from '@/systems/runtime';
import type { Vec3 } from '@/types';

/** Walking speed in tiles per second. */
const WALK_SPEED = 2.8;
/** How high the orb floats above the surface it stands on. */
const HOVER = 0.36;
/** Seconds between trail samples. */
const TRAIL_INTERVAL = 0.045;

const tmpFrom = new THREE.Vector3();
const tmpTo = new THREE.Vector3();
const tmpUp = new THREE.Vector3();

interface CharacterProps {
  readonly runtime: WorldRuntime;
}

export function Character({ runtime }: CharacterProps): React.ReactElement {
  const orbRef = useRef<Mesh>(null);
  const status = useGameStore((state) => state.status);
  const path = useGameStore((state) => state.path);
  const pathIndex = useGameStore((state) => state.pathIndex);
  const characterNode = useGameStore((state) => state.characterNode);
  const advancePath = useGameStore((state) => state.advancePath);

  const skinId = useProgressStore((state) => state.selectedSkin);
  const trailId = useProgressStore((state) => state.selectedTrail);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  const skin = useMemo(() => skinById(skinId), [skinId]);
  const trail = useMemo(() => trailById(trailId), [trailId]);

  // Ring buffer of recent local positions, newest last.
  const trailRefs = useRef<Array<Object3D | null>>([]);
  const samples = useRef<Vec3[]>([]);
  const sampleTimer = useRef(0);
  const segmentProgress = useRef(0);
  const segmentKey = useRef('');

  useFrame((state, rawDelta) => {
    const orb = orbRef.current;
    if (!orb) return;
    const dt = Math.min(rawDelta, 1 / 20);
    const time = state.clock.elapsedTime;

    const fromId = path[pathIndex];
    const toId = path[pathIndex + 1];
    const walking = status === 'walking' && fromId !== undefined && toId !== undefined;

    if (walking) {
      const key = `${pathIndex}:${fromId}->${toId}`;
      if (segmentKey.current !== key) {
        segmentKey.current = key;
        segmentProgress.current = 0;
      }

      const from = runtime.nodePosition(fromId);
      const to = runtime.nodePosition(toId);
      tmpFrom.set(from[0], from[1], from[2]);
      tmpTo.set(to[0], to[1], to[2]);

      const span = tmpFrom.distanceTo(tmpTo);
      // A degenerate segment would divide by zero and stall the walk; treat it
      // as instantly complete instead.
      const step = span < 1e-4 ? 1 : (WALK_SPEED * dt) / span;
      segmentProgress.current = Math.min(1, segmentProgress.current + step);
      const t = segmentProgress.current;

      orb.position.lerpVectors(tmpFrom, tmpTo, t);

      // Surface normals are interpolated alongside position so a gravity-flip
      // section reads as the orb rolling onto a new face rather than snapping.
      const upFrom = runtime.nodeUp(fromId);
      const upTo = runtime.nodeUp(toId);
      tmpUp
        .set(
          upFrom[0] + (upTo[0] - upFrom[0]) * t,
          upFrom[1] + (upTo[1] - upFrom[1]) * t,
          upFrom[2] + (upTo[2] - upFrom[2]) * t,
        )
        .normalize();

      // A single hop of the bob per tile travelled, plus a gentle squash at
      // the bottom of each step.
      const bob = reducedMotion ? 0 : Math.abs(Math.sin(t * Math.PI * 2)) * 0.12;
      orb.position.addScaledVector(tmpUp, HOVER + bob);
      const squash = reducedMotion ? 1 : 1 - Math.cos(t * Math.PI * 4) * 0.04;
      orb.scale.set(1 / squash, squash, 1 / squash);

      if (segmentProgress.current >= 1) advancePath();
    } else {
      const here = runtime.nodePosition(characterNode);
      const up = runtime.nodeUp(characterNode);
      tmpUp.set(up[0], up[1], up[2]).normalize();
      const idle = reducedMotion ? 0 : Math.sin(time * 1.7) * 0.035;
      orb.position.set(here[0], here[1], here[2]).addScaledVector(tmpUp, HOVER + idle);
      orb.scale.setScalar(1);
      segmentKey.current = '';
    }

    // Sample the trail on a timer rather than per frame so its length is a
    // consistent distance behind the orb regardless of framerate.
    sampleTimer.current += dt;
    if (sampleTimer.current >= TRAIL_INTERVAL) {
      sampleTimer.current = 0;
      samples.current.push([orb.position.x, orb.position.y, orb.position.z]);
      while (samples.current.length > trail.length) samples.current.shift();
    }

    for (let i = 0; i < trail.length; i += 1) {
      const instance = trailRefs.current[i];
      if (!instance) continue;
      // Oldest sample maps to the faintest, smallest ghost.
      const sample = samples.current[i];
      if (!sample) {
        instance.scale.setScalar(0);
        continue;
      }
      const age = i / Math.max(1, trail.length - 1);
      instance.position.set(sample[0], sample[1], sample[2]);
      instance.scale.setScalar(reducedMotion ? 0 : 0.17 * age * age);
    }
  });

  return (
    <group>
      <mesh ref={orbRef} castShadow>
        <icosahedronGeometry args={[0.26, 2]} />
        <meshStandardMaterial
          color={skin.color}
          emissive={skin.emissive}
          emissiveIntensity={2.2}
          roughness={0.25}
          metalness={0.05}
          toneMapped={false}
        />
        {/* Halo, parented to the orb so it needs no separate frame update.
            Chapter palettes range from near-white to near-black, and a bare
            orb disappears against the pale ones; an additive glow keeps the
            character findable on every background. */}
        <mesh scale={2.1}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshBasicMaterial
            color={skin.emissive}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </mesh>

      <Instances limit={trail.length} range={trail.length}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={trail.color}
          transparent
          opacity={0.42}
          depthWrite={false}
          toneMapped={false}
        />
        {Array.from({ length: trail.length }, (_, index) => (
          <Instance
            key={index}
            ref={(instance: Object3D | null) => {
              trailRefs.current[index] = instance;
            }}
            scale={0}
          />
        ))}
      </Instances>
    </group>
  );
}
