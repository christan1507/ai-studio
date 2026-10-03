/**
 * Hand-built levels with known-correct answers, used to pin down the
 * connection predicate and the solvability checker. Each fixture is small
 * enough that its expected result can be reasoned out by hand.
 */

import { LevelBuilder } from '@/data/modules/kit';
import type { Level } from '@/types';

/**
 * Two walkways separated by a gap, joined only at yaw 90.
 * Start sits at the far end of the first run, exit at the far end of the
 * second, so the single alignment is unavoidable.
 * Optimal: 6 snap steps (6 x 15deg) to reach yaw 90.
 */
export function singleBridgeLevel(): Level {
  const b = new LevelBuilder('fixture-single-bridge', 1, 1, 'Single Bridge');
  const left = b.walkway('l', [0, 0, 0], 'x+', 3);
  const right = b.walkway('r', [6, 0, 0], 'x+', 3);
  b.alignedLink(left[2], right[0], 90);
  b.start(left[0]).exit(right[2]);
  return b.build();
}

/** The exit island has no edges at all, so no rotation can ever reach it. */
export function unsolvableLevel(): Level {
  const b = new LevelBuilder('fixture-unsolvable', 1, 2, 'Marooned');
  const left = b.walkway('l', [0, 0, 0], 'x+', 3);
  const island = b.walkway('i', [10, 0, 0], 'x+', 2);
  b.start(left[0]).exit(island[1]);
  return b.build();
}

/**
 * Two alignments at different angles must both be used, in order.
 * Optimal: 6 steps to yaw 90, then 6 more to yaw 180 — 12 total.
 */
export function twoBridgeLevel(): Level {
  const b = new LevelBuilder('fixture-two-bridge', 1, 3, 'Two Bridges');
  const first = b.walkway('a', [0, 0, 0], 'x+', 2);
  const middle = b.walkway('m', [5, 0, 0], 'x+', 2);
  const last = b.walkway('z', [10, 0, 0], 'x+', 2);
  b.alignedLink(first[1], middle[0], 90);
  b.alignedLink(middle[1], last[0], 180);
  b.start(first[0]).exit(last[1]);
  return b.build();
}

/**
 * A switch must be thrown to raise the only bridge to the exit. The switch
 * costs no rotations, but reaching it requires one alignment.
 * Optimal: 6 steps to yaw 90.
 */
export function switchLevel(): Level {
  const b = new LevelBuilder('fixture-switch', 3, 1, 'Lever');
  const entry = b.walkway('e', [0, 0, 0], 'x+', 2);
  const lever = b.walkway('v', [5, 0, 0], 'x+', 2);
  const goal = b.walkway('g', [5, 0, 5], 'x+', 2);
  b.alignedLink(entry[1], lever[0], 90);
  b.switchAt('sw1', 'gate', lever[1], 'toggle', false);
  b.flagLink(lever[1], goal[0], 'gate');
  b.start(entry[0]).exit(goal[1]);
  return b.build();
}

/**
 * A spinning ring ferries the character across. The checker treats the phase
 * window as waitable because the ring cycles unconditionally.
 * Optimal: 0 rotations.
 */
export function movingPlatformLevel(): Level {
  const b = new LevelBuilder('fixture-moving', 2, 1, 'Carousel');
  const entry = b.walkway('e', [0, 0, 0], 'x+', 2);
  b.group({ id: 'carousel', motion: 'spin', period: 6, axis: [0, 1, 0], pivot: [5, 0, 0], sweep: 360 });
  const ring = b.ring('c', [5, 0, 0], 2, 4, { group: 'carousel' });
  const goal = b.walkway('g', [9, 0, 0], 'x+', 2);
  b.phaseLink(entry[1], ring[0], 'carousel', [0.0, 0.2]);
  b.phaseLink(ring[2], goal[0], 'carousel', [0.4, 0.6]);
  b.start(entry[0]).exit(goal[1]);
  return b.build();
}

/**
 * A platform whose motion is frozen until a switch is thrown, where the
 * switch is only reachable *after* crossing the platform. Genuinely
 * unsolvable, and the case a naive "phases are always waitable" model would
 * wrongly report as solvable.
 */
export function frozenPlatformLevel(): Level {
  const b = new LevelBuilder('fixture-frozen', 5, 1, 'Stalled');
  const entry = b.walkway('e', [0, 0, 0], 'x+', 2);
  b.group({
    id: 'lift',
    motion: 'elevator',
    period: 5,
    from: [5, 0, 0],
    to: [5, 3, 0],
    requiresFlag: 'power',
  });
  const lift = b.walkway('f', [5, 0, 0], 'x+', 1, { group: 'lift' });
  const goal = b.walkway('g', [9, 0, 0], 'x+', 2);
  b.phaseLink(entry[1], lift[0], 'lift', [0, 0.2]);
  b.phaseLink(lift[0], goal[0], 'lift', [0.5, 0.7]);
  // The only switch sits past the lift, so 'power' can never be turned on.
  b.switchAt('sw-power', 'power', goal[1], 'once', false);
  b.start(entry[0]).exit(goal[1]);
  return b.build();
}
