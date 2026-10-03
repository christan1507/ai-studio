import { describe, expect, it } from 'vitest';

import {
  alignmentProximity,
  applyDrag,
  beginDrag,
  createRotationController,
  endDrag,
  isSettled,
  MAX_FLICK_SPEED,
  offsetFromSnap,
  snapAngle,
  snapIndex,
  stepRotation,
  stepsBetween,
} from '@/systems/rotation';

/** Run the controller forward until it settles, or give up. */
function settle(controller: ReturnType<typeof createRotationController>, allowPitch = false): number {
  for (let frame = 0; frame < 2000; frame += 1) {
    stepRotation(controller, 1 / 60, allowPitch);
    if (isSettled(controller, allowPitch)) return frame;
  }
  return -1;
}

describe('snapping', () => {
  it('snaps to the nearest 15 degree position', () => {
    expect(snapAngle(0)).toBe(0);
    expect(snapAngle(7)).toBe(0);
    expect(snapAngle(8)).toBe(15);
    expect(snapAngle(88)).toBe(90);
    expect(snapAngle(-7)).toBe(0);
    expect(snapAngle(354)).toBe(0);
  });

  it('indexes snap positions consistently', () => {
    expect(snapIndex(0)).toBe(0);
    expect(snapIndex(90)).toBe(6);
    expect(snapIndex(360)).toBe(0);
    expect(snapIndex(-15)).toBe(23);
  });

  it('counts steps the short way around', () => {
    expect(stepsBetween(0, 6)).toBe(6);
    expect(stepsBetween(0, 23)).toBe(1);
    expect(stepsBetween(23, 0)).toBe(1);
    expect(stepsBetween(0, 12)).toBe(12);
    expect(stepsBetween(0, 0)).toBe(0);
  });

  it('measures offset from the nearest snap position', () => {
    expect(offsetFromSnap(90)).toBeCloseTo(0);
    expect(offsetFromSnap(93)).toBeCloseTo(3);
    expect(offsetFromSnap(87)).toBeCloseTo(-3);
  });
});

describe('rotation controller', () => {
  it('starts settled and unrotated', () => {
    const controller = createRotationController();
    expect(controller.visualYaw).toBe(0);
    expect(isSettled(controller, false)).toBe(true);
  });

  it('follows the pointer while dragging and does not settle', () => {
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 100, 0, 1 / 60, false);
    expect(controller.visualYaw).toBeGreaterThan(0);
    expect(isSettled(controller, false)).toBe(false);
    // A drag in progress must not be dragged back by the snap spring.
    const held = controller.visualYaw;
    stepRotation(controller, 1 / 60, false);
    expect(controller.visualYaw).toBe(held);
  });

  it('comes to rest exactly on a snap position after release', () => {
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 60, 0, 1 / 60, false);
    endDrag(controller);
    expect(settle(controller)).toBeGreaterThanOrEqual(0);
    expect(controller.visualYaw % 15).toBeCloseTo(0);
    expect(controller.yawVelocity).toBe(0);
  });

  it('carries momentum from a flick before settling', () => {
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 200, 0, 1 / 60, false);
    endDrag(controller);
    const atRelease = controller.visualYaw;
    stepRotation(controller, 1 / 60, false);
    expect(controller.visualYaw).toBeGreaterThan(atRelease);
    expect(settle(controller)).toBeGreaterThanOrEqual(0);
  });

  it('ignores vertical drag unless the level allows pitch', () => {
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 0, 120, 1 / 60, false);
    expect(controller.visualPitch).toBe(0);

    const tilting = createRotationController();
    beginDrag(tilting);
    applyDrag(tilting, 0, 120, 1 / 60, true);
    expect(tilting.visualPitch).not.toBe(0);
  });

  it('clamps pitch to its limit', () => {
    const controller = createRotationController();
    beginDrag(controller);
    for (let i = 0; i < 40; i += 1) applyDrag(controller, 0, -100, 1 / 60, true);
    expect(controller.visualPitch).toBeLessThanOrEqual(60);
    for (let i = 0; i < 80; i += 1) applyDrag(controller, 0, 100, 1 / 60, true);
    expect(controller.visualPitch).toBeGreaterThanOrEqual(-60);
  });

  it('clamps flick speed so one huge pointer delta cannot launch the structure', () => {
    // A synthetic or coalesced pointermove can report a large delta over a
    // sub-millisecond gap. Unclamped, that is tens of thousands of deg/s and
    // the structure spins for seconds before landing somewhere arbitrary.
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 400, 0, 0.0005, false);
    expect(Math.abs(controller.yawVelocity)).toBeLessThanOrEqual(MAX_FLICK_SPEED);

    endDrag(controller);
    expect(settle(controller)).toBeGreaterThanOrEqual(0);
    expect(controller.visualYaw % 15).toBeCloseTo(0);
  });

  it('settles promptly even after the hardest possible flick', () => {
    const controller = createRotationController();
    beginDrag(controller);
    for (let i = 0; i < 10; i += 1) applyDrag(controller, 500, 0, 0.001, false);
    endDrag(controller);
    const frames = settle(controller);
    expect(frames).toBeGreaterThanOrEqual(0);
    // Under two seconds at 60fps, so the player is never left waiting.
    expect(frames).toBeLessThan(120);
  });

  it('cannot be flung across snap positions by one oversized frame', () => {
    const controller = createRotationController();
    controller.yawVelocity = 900;
    stepRotation(controller, 10, false);
    // dt is clamped to 1/20s, so a stalled frame advances at most ~45deg.
    expect(controller.visualYaw).toBeLessThan(60);
  });

  it('settles pitch as well when pitch is allowed', () => {
    const controller = createRotationController();
    beginDrag(controller);
    applyDrag(controller, 40, 40, 1 / 60, true);
    endDrag(controller);
    expect(settle(controller, true)).toBeGreaterThanOrEqual(0);
    expect(controller.visualPitch % 15).toBeCloseTo(0);
  });
});

describe('alignmentProximity', () => {
  it('peaks on alignment and falls off either side', () => {
    expect(alignmentProximity(90, 90)).toBeCloseTo(1);
    expect(alignmentProximity(90, 90) > alignmentProximity(80, 90)).toBe(true);
    expect(alignmentProximity(0, 90)).toBe(0);
  });

  it('is symmetric and wrap-aware', () => {
    expect(alignmentProximity(355, 0)).toBeCloseTo(alignmentProximity(5, 0));
  });
});
