/**
 * The 3D scene.
 *
 * Camera notes, because they matter more than they look:
 *
 * - The camera is **orthographic** and never moves during play. Perspective
 *   foreshortening would break the impossible-object illusion outright — an
 *   Escher join only reads when parallel lines stay parallel on screen.
 * - Only the *structure* rotates, inside a pivot that is offset so the level
 *   spins about its own centre rather than the world origin.
 * - Rotation is applied as two nested groups (pitch outside, yaw inside)
 *   rather than one Euler, so tilting never corrupts the yaw the player is
 *   aiming at.
 */

import { OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Group, OrthographicCamera as OrthographicCameraImpl } from 'three';

import { Bridges } from '@/components/Bridge';
import { Character } from '@/components/Character';
import { DustMotes } from '@/components/DustMotes';
import { GhostPath } from '@/components/GhostPath';
import { NodeTargets } from '@/components/NodeTargets';
import { Portal } from '@/components/Portal';
import { Structure } from '@/components/Structure';
import { Switches } from '@/components/Switch';
import { chapterById } from '@/data/palettes';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';
import { levelBounds, zoomForBounds, type Bounds } from '@/systems/bounds';
import { activeEdges } from '@/systems/connections';
import {
  pointerInput,
  releasePointer,
  resetPointer,
  trackPointer,
  TAP_SLOP,
} from '@/systems/input';
import { applyDrag, beginDrag, endDrag, stepRotation } from '@/systems/rotation';
import type { WorldRuntime } from '@/systems/runtime';
import type { ChapterPalette } from '@/types';

/**
 * The camera's position *component* on each isometric axis. With an
 * orthographic projection this does not affect framing at all — only clipping
 * and fog — so it just needs to clear the structure comfortably.
 */
function cameraOffsetFor(bounds: Bounds): number {
  return bounds.radius * 4 + 12;
}

/**
 * Actual distance from the camera to the structure's centre.
 *
 * The camera sits at `[d, d, d]`, so this is `d * sqrt(3)` — not `d`. Fog is
 * measured in true view distance, and using `d` put the whole level past the
 * fog's far plane, which is what flattened every structure into a pale
 * silhouette.
 */
function cameraDistanceFor(bounds: Bounds): number {
  return cameraOffsetFor(bounds) * Math.sqrt(3);
}

export function World(): React.ReactElement | null {
  const runtime = useGameStore((state) => state.runtime);
  const level = useGameStore((state) => state.level);
  const status = useGameStore((state) => state.status);
  const hintVisible = useGameStore((state) => state.hintVisible);
  const setNotice = useUiStore((state) => state.setNotice);

  const palette = useMemo<ChapterPalette | null>(() => {
    if (!level) return null;
    try {
      return chapterById(level.chapter).palette;
    } catch {
      // Daily puzzles carry a chapter id outside the handcrafted range.
      return chapterById(3).palette;
    }
  }, [level]);

  const bounds = useMemo(() => (level ? levelBounds(level) : null), [level]);

  if (!runtime || !level || !palette || !bounds) return null;

  const locked = status === 'walking' || status === 'complete';

  /**
   * Distance the orthographic camera sits back along the isometric axis.
   *
   * Fog has to be expressed relative to *this*, not to the structure's own
   * size. Deriving fog from the bounds alone put every level deep inside the
   * fog band — the camera is far further back than a level is wide — and
   * blended the whole monument toward the fog colour until it read as a flat
   * pale silhouette.
   */
  const cameraDistance = cameraDistanceFor(bounds);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    void audio.unlock();
    resetPointer(event.clientX, event.clientY);
    if (!locked) beginDrag(runtime.rotation);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!pointerInput.down) return;
    const { dx, dy, dt } = trackPointer(event.clientX, event.clientY);
    // Hold off until the gesture has clearly committed to being a drag, so a
    // slightly shaky tap still reads as a tap.
    if (locked || pointerInput.travel < TAP_SLOP) return;
    applyDrag(runtime.rotation, dx, dy, dt, runtime.allowPitch);
  };

  const handlePointerUp = (): void => {
    endDrag(runtime.rotation);
    releasePointer();
  };

  /**
   * A tap on an unreachable tile. Distinguishing "there is no path yet" from
   * "the world is still spinning" matters: the first asks the player to think,
   * the second just asks them to wait a beat.
   */
  const handleRefused = (): void => {
    audio.refused();
    setNotice(
      runtime.settled ? 'No path there yet — try turning the world.' : 'Let the world settle first.',
    );
  };

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      // Photo mode reads pixels back off the canvas after the frame has been
      // presented, which only works if the drawing buffer is retained.
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        // Pastel palettes sit high in the value range, so without filmic tone
        // mapping and a little negative exposure the structures clip to white
        // and the flat-shaded faces stop separating — which is the whole
        // readability of the illusion.
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.82,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[palette.sky]} />
      {/* A narrow band straddling the structure: just enough to push far
          geometry back, never enough to tint the whole model. */}
      <fog
        attach="fog"
        args={[palette.fog, cameraDistance - bounds.radius, cameraDistance + bounds.radius * 3]}
      />

      <CameraRig bounds={bounds} complete={status === 'complete'} />
      <Lights palette={palette} bounds={bounds} />

      <StructurePivot runtime={runtime} bounds={bounds}>
        <Structure runtime={runtime} palette={palette} />
        <Bridges runtime={runtime} palette={palette} />
        <Switches runtime={runtime} palette={palette} />
        <NodeTargets runtime={runtime} palette={palette} onRefused={handleRefused} />
        <GhostPath runtime={runtime} palette={palette} visible={hintVisible} />
        <Character runtime={runtime} />
        <Portal runtime={runtime} palette={palette} />
      </StructurePivot>

      {/* Outside the pivot: atmosphere belongs to the room, not the monument. */}
      <DustMotes bounds={bounds} palette={palette} />

      <Postprocessing />
    </Canvas>
  );
}

/**
 * Applies rotation, advances platform phases, and reports settled rotations to
 * the store. The single place per frame where continuous state is driven.
 */
function StructurePivot({
  runtime,
  bounds,
  children,
}: {
  readonly runtime: WorldRuntime;
  readonly bounds: Bounds;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const pitchRef = useRef<Group>(null);
  const yawRef = useRef<Group>(null);
  const syncRotation = useGameStore((state) => state.syncRotation);

  const lastActiveCount = useRef(0);
  const wasSpinning = useRef(false);

  useFrame((_, rawDelta) => {
    const dt = Math.min(Math.max(rawDelta, 0), 1 / 20);

    runtime.tick(dt);
    stepRotation(runtime.rotation, dt, runtime.allowPitch);

    if (pitchRef.current) {
      pitchRef.current.rotation.x = THREE.MathUtils.degToRad(
        runtime.allowPitch ? runtime.rotation.visualPitch : 0,
      );
    }
    if (yawRef.current) {
      yawRef.current.rotation.y = THREE.MathUtils.degToRad(runtime.rotation.visualYaw);
    }

    // Air movement while actually turning, not while merely settling.
    const spinning = Math.abs(runtime.rotation.yawVelocity) > 25;
    if (spinning && !wasSpinning.current) {
      wasSpinning.current = true;
      audio.whoosh(Math.min(1, Math.abs(runtime.rotation.yawVelocity) / 400));
    } else if (!spinning) {
      wasSpinning.current = false;
    }

    // The store owns the accounting; this just reports what the structure is
    // doing and reacts on the frame a rotation is actually counted.
    const counted = syncRotation(runtime.yawIndex, runtime.pitchIndex, runtime.settled);
    if (!counted) return;

    // Chime only when rotating actually *gained* the player something.
    const active = activeEdges(runtime.level, runtime.worldState()).length;
    if (active > lastActiveCount.current) audio.connectChime();
    lastActiveCount.current = active;
  });

  useEffect(() => {
    lastActiveCount.current = activeEdges(runtime.level, runtime.worldState()).length;
  }, [runtime]);

  return (
    <group ref={pitchRef}>
      <group ref={yawRef}>
        <group position={[-bounds.centre[0], -bounds.centre[1], -bounds.centre[2]]}>
          {children}
        </group>
      </group>
    </group>
  );
}

/**
 * Fixed isometric orthographic camera. Zoom eases in on level load for a
 * cinematic settle, and pulls back slightly when the level is solved.
 */
function CameraRig({
  bounds,
  complete,
}: {
  readonly bounds: Bounds;
  readonly complete: boolean;
}): React.ReactElement {
  const cameraRef = useRef<OrthographicCameraImpl>(null);
  const viewportHeight = useThree((state) => state.size.height);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  const target = zoomForBounds(bounds, viewportHeight);
  const current = useRef(target);

  // Begin a little wide so the structure eases into frame on load.
  useEffect(() => {
    current.current = reducedMotion ? target : target * 0.78;
  }, [bounds, target, reducedMotion]);

  const distance = cameraOffsetFor(bounds);

  useFrame((_, rawDelta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dt = Math.min(rawDelta, 1 / 20);
    const wanted = complete ? target * 0.86 : target;
    current.current += (wanted - current.current) * Math.min(1, dt * 2.4);
    camera.zoom = current.current;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[distance, distance, distance]}
      near={0.1}
      far={distance * 4}
      zoom={target}
    />
  );
}

function Lights({
  palette,
  bounds,
}: {
  readonly palette: ChapterPalette;
  readonly bounds: Bounds;
}): React.ReactElement {
  const extent = bounds.radius * 1.9;
  return (
    <>
      {/* Kept deliberately dim. Flat-shaded faces separate by the *difference*
          between lit and unlit, so piling on fill light flattens the model
          into a single pale silhouette. */}
      <ambientLight color={palette.sky} intensity={0.26} />
      <hemisphereLight color={palette.glow} groundColor={palette.shadow} intensity={0.22} />
      <directionalLight
        castShadow
        position={[bounds.radius * 1.3, bounds.radius * 2.4, bounds.radius * 1.1]}
        intensity={1.45}
        color={palette.glow}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={bounds.radius * 9}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
      {/* Cool fill from the opposite side so shadowed faces stay pastel
          instead of going muddy. No shadow map: one is enough. */}
      <directionalLight
        position={[-bounds.radius * 1.6, bounds.radius * 0.8, -bounds.radius * 1.4]}
        intensity={0.22}
        color={palette.accent}
      />
    </>
  );
}

function Postprocessing(): React.ReactElement | null {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  return (
    <EffectComposer enableNormalPass={false}>
      {/* The threshold has to sit *above* the pastel structures or the whole
          monument blooms into a white blob. Only the emissive materials —
          bridges, portal, orb, crystals, all rendered with `toneMapped: false`
          and so unclamped — are meant to pass it. */}
      <Bloom
        intensity={reducedMotion ? 0.4 : 0.85}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={0.7}
      />
      <Vignette offset={0.22} darkness={0.5} eskil={false} />
    </EffectComposer>
  );
}
