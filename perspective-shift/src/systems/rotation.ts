/**
 * Rotation control: drag to spin the structure, with inertia and snapping.
 *
 * There are deliberately *two* notions of rotation:
 *
 * - `visualYaw` / `visualPitch` — continuous, drives the 3D transform. Lives
 *   in a mutable controller updated inside `useFrame`, so spinning the world
 *   never triggers a React render.
 * - the **snapped** angle — a multiple of {@link SNAP_DEGREES}, and the only
 *   thing the connection predicate ever sees.
 *
 * Gameplay reads the snapped angle so that runtime behaviour is identical to
 * what the solvability checker proved. The continuous angle is used only for
 * rendering, plus a "bridge forming" shimmer as the player approaches an
 * alignment. Movement is accepted only once rotation has settled, so the
 * character never walks a bridge whose geometry is still mid-swing.
 */

import { angleMatches, normalizeAngle } from '@/systems/connections';
import { DEFAULT_ANGLE_TOLERANCE, SNAP_DEGREES } from '@/types';

/** Degrees of rotation per pixel of pointer travel. */
export const DRAG_SENSITIVITY = 0.42;
/** Exponential velocity decay per second once the pointer is released. */
export const FRICTION = 5.5;
/** Stiffness of the pull toward the nearest snap position. */
export const SNAP_STIFFNESS = 13;
/** Below this angular speed and offset, rotation counts as settled. */
export const SETTLE_SPEED = 1.2;
export const SETTLE_OFFSET = 0.12;
/** Pitch is clamped so advanced levels can tilt without flipping wildly. */
export const PITCH_LIMIT = 60;
/**
 * Ceiling on flick speed, in degrees per second.
 *
 * Velocity is measured as pointer delta over the time between move events,
 * and that time can be vanishingly small — a coalesced move, a synthetic
 * event, or simply a fast browser can deliver a large delta with a sub-
 * millisecond gap, yielding tens of thousands of degrees per second. The
 * structure then spins for seconds and lands somewhere arbitrary. Two full
 * turns per second is already a hard flick.
 */
export const MAX_FLICK_SPEED = 720;
/** Weight given to the newest sample when smoothing flick velocity. */
const VELOCITY_SMOOTHING = 0.45;

export interface RotationController {
  visualYaw: number;
  visualPitch: number;
  yawVelocity: number;
  pitchVelocity: number;
  dragging: boolean;
  /** Snap index the controller was last settled at, for counting rotations. */
  settledYawIndex: number;
  settledPitchIndex: number;
}

export function createRotationController(yaw = 0, pitch = 0): RotationController {
  return {
    visualYaw: yaw,
    visualPitch: pitch,
    yawVelocity: 0,
    pitchVelocity: 0,
    dragging: false,
    settledYawIndex: snapIndex(yaw),
    settledPitchIndex: snapIndex(pitch),
  };
}

/** Number of distinct snap positions in a full turn. */
export const SNAP_STEPS = Math.round(360 / SNAP_DEGREES);

/** Nearest snap angle to `deg`, normalised into [0, 360). */
export function snapAngle(deg: number): number {
  return normalizeAngle(Math.round(deg / SNAP_DEGREES) * SNAP_DEGREES);
}

/** Index of the nearest snap position, in [0, SNAP_STEPS). */
export function snapIndex(deg: number): number {
  return ((Math.round(deg / SNAP_DEGREES) % SNAP_STEPS) + SNAP_STEPS) % SNAP_STEPS;
}

/**
 * Snap steps between two indices, taking the shorter way around.
 * This is the unit the star rating counts, and matches the rotation cost the
 * solvability checker minimises.
 */
export function stepsBetween(fromIndex: number, toIndex: number): number {
  const raw = Math.abs(toIndex - fromIndex) % SNAP_STEPS;
  return Math.min(raw, SNAP_STEPS - raw);
}

/**
 * Snap positions the player can actually tilt to, as normalised angles.
 *
 * Pitch is clamped to +/-{@link PITCH_LIMIT}, so most of the circle is out of
 * reach. Both the level validator and the solvability checker consult this:
 * without it, a level could require a tilt no gesture can produce and still
 * look like valid data.
 */
export function reachablePitchSnaps(): number[] {
  const angles: number[] = [];
  for (let step = 0; step < SNAP_STEPS; step += 1) {
    const raw = step * SNAP_DEGREES;
    const signed = raw > 180 ? raw - 360 : raw;
    if (Math.abs(signed) <= PITCH_LIMIT) angles.push(normalizeAngle(raw));
  }
  return angles.sort((a, b) => a - b);
}

/** Whether some reachable tilt satisfies a pitch requirement. */
export function isPitchRequirementReachable(
  required: number,
  tolerance: number = DEFAULT_ANGLE_TOLERANCE,
): boolean {
  return reachablePitchSnaps().some((snap) => angleMatches(snap, required, tolerance));
}

/** Signed offset from the current angle to its nearest snap position. */
export function offsetFromSnap(deg: number): number {
  const snapped = Math.round(deg / SNAP_DEGREES) * SNAP_DEGREES;
  return deg - snapped;
}

export function beginDrag(controller: RotationController): void {
  controller.dragging = true;
  controller.yawVelocity = 0;
  controller.pitchVelocity = 0;
}

/**
 * Apply pointer movement. Horizontal travel spins yaw; vertical travel tilts
 * pitch, but only on levels that opt in. Velocity is tracked so that releasing
 * mid-swipe carries momentum.
 */
export function applyDrag(
  controller: RotationController,
  deltaX: number,
  deltaY: number,
  dt: number,
  allowPitch: boolean,
): void {
  const yawChange = deltaX * DRAG_SENSITIVITY;
  controller.visualYaw = normalizeAngle(controller.visualYaw + yawChange);

  let pitchChange = 0;
  if (allowPitch) {
    const desired = controller.visualPitch - deltaY * DRAG_SENSITIVITY;
    const clamped = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, desired));
    pitchChange = clamped - controller.visualPitch;
    controller.visualPitch = clamped;
  }

  if (dt > 0) {
    // Smooth across samples, then clamp. Smoothing alone is not enough — one
    // enormous sample still dominates — and clamping alone leaves the motion
    // jittery on uneven event timing.
    controller.yawVelocity = clampSpeed(
      controller.yawVelocity +
        (yawChange / dt - controller.yawVelocity) * VELOCITY_SMOOTHING,
    );
    controller.pitchVelocity = clampSpeed(
      controller.pitchVelocity +
        (pitchChange / dt - controller.pitchVelocity) * VELOCITY_SMOOTHING,
    );
  }
}

function clampSpeed(speed: number): number {
  return Math.max(-MAX_FLICK_SPEED, Math.min(MAX_FLICK_SPEED, speed));
}

export function endDrag(controller: RotationController): void {
  controller.dragging = false;
}

/**
 * Advance the controller one frame. While dragging, the structure simply
 * follows the pointer. After release, inertia carries it, friction bleeds the
 * velocity off, and a spring eases it onto the nearest snap position.
 *
 * `dt` is clamped so that a stalled tab or a breakpoint cannot fling the
 * structure across several snap positions in a single oversized frame.
 */
export function stepRotation(
  controller: RotationController,
  rawDt: number,
  allowPitch: boolean,
): void {
  if (controller.dragging) return;
  const dt = Math.min(Math.max(rawDt, 0), 1 / 20);
  if (dt === 0) return;

  const decay = Math.exp(-FRICTION * dt);
  controller.yawVelocity *= decay;
  if (allowPitch) controller.pitchVelocity *= decay;
  else controller.pitchVelocity = 0;

  controller.visualYaw = normalizeAngle(controller.visualYaw + controller.yawVelocity * dt);
  if (allowPitch) {
    controller.visualPitch = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, controller.visualPitch + controller.pitchVelocity * dt),
    );
  }

  // Spring toward the nearest snap position, strengthening as inertia fades so
  // that a hard flick still coasts before locking in.
  const settleBlend = Math.min(1, Math.exp(-Math.abs(controller.yawVelocity) / 90));
  const yawPull = -offsetFromSnap(controller.visualYaw) * SNAP_STIFFNESS * settleBlend;
  controller.visualYaw = normalizeAngle(controller.visualYaw + yawPull * dt);

  if (allowPitch) {
    const pitchBlend = Math.min(1, Math.exp(-Math.abs(controller.pitchVelocity) / 90));
    const pitchPull = -offsetFromSnap(controller.visualPitch) * SNAP_STIFFNESS * pitchBlend;
    controller.visualPitch += pitchPull * dt;
  }

  if (isSettled(controller, allowPitch)) {
    controller.visualYaw = snapAngle(controller.visualYaw);
    controller.yawVelocity = 0;
    if (allowPitch) {
      controller.visualPitch = Math.round(controller.visualPitch / SNAP_DEGREES) * SNAP_DEGREES;
      controller.pitchVelocity = 0;
    }
  }
}

/** Whether rotation has come to rest on a snap position. */
export function isSettled(controller: RotationController, allowPitch: boolean): boolean {
  if (controller.dragging) return false;
  const yawRested =
    Math.abs(controller.yawVelocity) < SETTLE_SPEED &&
    Math.abs(offsetFromSnap(controller.visualYaw)) < SETTLE_OFFSET;
  if (!yawRested) return false;
  if (!allowPitch) return true;
  return (
    Math.abs(controller.pitchVelocity) < SETTLE_SPEED &&
    Math.abs(offsetFromSnap(controller.visualPitch)) < SETTLE_OFFSET
  );
}

/**
 * How close the structure is to a given required angle, as 0..1.
 * Drives the "bridge forming" shimmer: the beam brightens as the player nears
 * an alignment, well before the edge actually becomes walkable.
 */
export function alignmentProximity(
  currentAngle: number,
  requiredAngle: number,
  falloff = SNAP_DEGREES * 1.6,
): number {
  const delta = Math.abs(normalizeAngle(currentAngle - requiredAngle + 180) - 180);
  return Math.max(0, 1 - delta / falloff);
}
