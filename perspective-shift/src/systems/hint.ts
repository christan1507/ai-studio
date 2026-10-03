/**
 * The hint system.
 *
 * Answers "what should I do next?" from wherever the player actually is,
 * rather than replaying a canned solution — a hint that assumes you are at the
 * start is useless once you have wandered.
 *
 * It reuses the solver's key insight: only angles that change which edges are
 * active are worth considering, so the search space is a handful of rotations
 * rather than the whole circle.
 */

import { buildAdjacency, isEdgeActive, normalizeAngle } from '@/systems/connections';
import { reachableNodes } from '@/systems/pathfinding';
import { reachablePitchSnaps } from '@/systems/rotation';
import {
  DEFAULT_ANGLE_TOLERANCE,
  SNAP_DEGREES,
  type Edge,
  type Level,
  type WorldState,
} from '@/types';

export type Hint =
  | { readonly kind: 'walk'; readonly target: string }
  | {
      readonly kind: 'rotate';
      readonly yaw: number;
      readonly pitch: number;
      /** The edge that opens, for the ghost path to draw. */
      readonly edge: Edge;
    }
  | { readonly kind: 'wait' }
  | { readonly kind: 'none' };

const SNAP_STEPS = Math.round(360 / SNAP_DEGREES);

/** Snap positions that produce a distinct set of satisfied angle requirements. */
function candidateAngles(level: Level, axis: 'yaw' | 'pitch'): number[] {
  const requirements = level.edges.map((edge) => ({
    required: axis === 'yaw' ? edge.requiresYaw : edge.requiresPitch,
    tolerance: edge.tolerance ?? DEFAULT_ANGLE_TOLERANCE,
  }));
  const positions =
    axis === 'yaw'
      ? Array.from({ length: SNAP_STEPS }, (_, step) => normalizeAngle(step * SNAP_DEGREES))
      : reachablePitchSnaps();

  const seen = new Map<string, number>();
  for (const angle of positions) {
    let signature = '';
    for (const { required, tolerance } of requirements) {
      signature +=
        required !== undefined && Math.abs(angleGap(angle, required)) <= tolerance ? '1' : '0';
    }
    if (!seen.has(signature)) seen.set(signature, angle);
  }
  return [...seen.values()];
}

function angleGap(a: number, b: number): number {
  const diff = normalizeAngle(a - b);
  return diff > 180 ? diff - 360 : diff;
}

/**
 * What to do next from the current position.
 *
 * Prefers the cheapest useful action: walk if the exit is already reachable,
 * otherwise the single rotation that opens the most progress, otherwise wait
 * for a platform if one could still help.
 */
export function nextHint(level: Level, state: WorldState, from: string): Hint {
  const reachableNow = reachableNodes(level, state, from);
  if (reachableNow.has(level.exit)) return { kind: 'walk', target: level.exit };

  // Try every distinct rotation and keep the one that reveals the most new
  // ground, breaking ties toward the rotation that reaches the exit outright.
  let best: { yaw: number; pitch: number; gained: number; reachesExit: boolean } | null = null;

  const yaws = candidateAngles(level, 'yaw');
  const pitches = level.allowPitch === true ? candidateAngles(level, 'pitch') : [0];

  for (const yaw of yaws) {
    for (const pitch of pitches) {
      if (yaw === state.yaw && pitch === state.pitch) continue;
      const candidate: WorldState = { ...state, yaw, pitch };

      // Rotating does not move the character, so the search still starts from
      // the node underfoot.
      const reached = reachableNodes(level, candidate, from);
      let gained = 0;
      for (const node of reached) if (!reachableNow.has(node)) gained += 1;
      if (gained === 0) continue;

      const reachesExit = reached.has(level.exit);
      if (
        !best ||
        (reachesExit && !best.reachesExit) ||
        (reachesExit === best.reachesExit && gained > best.gained)
      ) {
        best = { yaw, pitch, gained, reachesExit };
      }
    }
  }

  if (best) {
    const target: WorldState = { ...state, yaw: best.yaw, pitch: best.pitch };
    const edge = openingEdge(level, state, target, reachableNow);
    if (edge) return { kind: 'rotate', yaw: best.yaw, pitch: best.pitch, edge };
    return { kind: 'rotate', yaw: best.yaw, pitch: best.pitch, edge: level.edges[0] };
  }

  // Nothing rotation can do. If a platform is still cycling, waiting is the
  // move; otherwise there is genuinely nothing to suggest.
  const hasMovingPlatform = (level.groups ?? []).some(
    (group) => group.motion !== 'none' && (group.period ?? 0) > 0,
  );
  return hasMovingPlatform ? { kind: 'wait' } : { kind: 'none' };
}

/**
 * The edge that becomes walkable at the target rotation and leads off the
 * ground the player can already stand on — the span the ghost path draws.
 */
function openingEdge(
  level: Level,
  current: WorldState,
  target: WorldState,
  reachableNow: ReadonlySet<string>,
): Edge | null {
  for (const edge of level.edges) {
    if (isEdgeActive(edge, current)) continue;
    if (!isEdgeActive(edge, target)) continue;
    const touchesReachable = reachableNow.has(edge.a) || reachableNow.has(edge.b);
    if (touchesReachable) return edge;
  }
  return null;
}

/**
 * Whether any move at all exists right now — used to decide whether tapping
 * a tile was refused because of geometry or because the player is boxed in.
 */
export function hasAnyMove(level: Level, state: WorldState, from: string): boolean {
  const adjacency = buildAdjacency(level, state);
  return (adjacency.get(from) ?? []).length > 0;
}
