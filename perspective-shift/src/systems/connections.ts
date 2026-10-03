/**
 * The connection predicate — the heart of Perspective Shift.
 *
 * Whether a path exists is a *pure function* of (level, world state). No
 * geometry is raycast, nothing is measured in screen space, and nothing
 * depends on render timing. That purity is what makes the solvability checker
 * and the daily-puzzle verifier possible, and it is why this file has no
 * imports beyond types.
 */

import {
  DEFAULT_ANGLE_TOLERANCE,
  type Edge,
  type Level,
  type WorldState,
} from '@/types';

/** Wrap an angle in degrees into [0, 360). */
export function normalizeAngle(deg: number): number {
  const wrapped = deg % 360;
  const positive = wrapped < 0 ? wrapped + 360 : wrapped;
  // Collapse -0 to 0: a negative zero is harmless arithmetically but leaks
  // into equality checks and serialised level data.
  return positive === 0 ? 0 : positive;
}

/**
 * Signed shortest angular difference `a - b`, in (-180, 180].
 * Used so that 359° and 1° are recognised as 2° apart.
 */
export function angleDelta(a: number, b: number): number {
  const diff = normalizeAngle(a - b);
  return diff > 180 ? diff - 360 : diff;
}

/** Whether `current` is within `tolerance` degrees of `required`, modulo 360. */
export function angleMatches(
  current: number,
  required: number,
  tolerance: number = DEFAULT_ANGLE_TOLERANCE,
): boolean {
  return Math.abs(angleDelta(current, required)) <= tolerance;
}

/**
 * Whether a normalised cycle position lies within an inclusive window.
 * Windows may wrap past 1 (e.g. [0.9, 0.1] spans the cycle boundary).
 */
export function phaseInWindow(
  phase: number,
  [start, end]: readonly [number, number],
): boolean {
  // Deliberately not `((phase % 1) + 1) % 1`: that round-trip loses precision
  // (0.2 comes back as 0.19999999999999996) and silently breaks inclusive
  // window boundaries, which are exactly the values authors write.
  const remainder = phase % 1;
  const p = remainder < 0 ? remainder + 1 : remainder;
  if (start <= end) return p >= start && p <= end;
  return p >= start || p <= end;
}

/**
 * Whether a single edge is currently traversable.
 *
 * Constraints are checked whenever present, so a `fixed` edge can still be
 * gated on a switch flag (a permanently raised bridge) while an `aligned` edge
 * carries the angle requirement that creates the illusion. `validateLevel`
 * enforces that `aligned` edges actually declare an angle and `fixed` ones
 * do not, so a mismatch is an authoring error rather than a silent surprise.
 */
export function isEdgeActive(edge: Edge, state: WorldState): boolean {
  const tolerance = edge.tolerance ?? DEFAULT_ANGLE_TOLERANCE;

  if (edge.requiresYaw !== undefined) {
    if (!angleMatches(state.yaw, edge.requiresYaw, tolerance)) return false;
  }
  if (edge.requiresPitch !== undefined) {
    if (!angleMatches(state.pitch, edge.requiresPitch, tolerance)) return false;
  }
  if (edge.requiresFlag !== undefined) {
    if (state.flags[edge.requiresFlag] !== true) return false;
  }
  if (edge.requiresFlagOff !== undefined) {
    if (state.flags[edge.requiresFlagOff] === true) return false;
  }
  if (edge.requiresPhase !== undefined) {
    // An unknown group reads as phase 0 rather than throwing: a level that
    // references a missing group is caught by validateLevel, and at runtime a
    // closed gate is the safe failure.
    const phase = edge.phaseGroup ? (state.phases[edge.phaseGroup] ?? 0) : 0;
    if (!phaseInWindow(phase, edge.requiresPhase)) return false;
  }
  return true;
}

/** Every currently-traversable edge in the level. */
export function activeEdges(level: Level, state: WorldState): Edge[] {
  return level.edges.filter((edge) => isEdgeActive(edge, state));
}

export type Adjacency = ReadonlyMap<string, readonly string[]>;

/**
 * Undirected adjacency list over the currently-active edges.
 * Every node in the level appears as a key, even if isolated, so callers can
 * distinguish "no neighbours right now" from "no such node".
 */
export function buildAdjacency(level: Level, state: WorldState): Adjacency {
  const adjacency = new Map<string, string[]>();
  for (const node of level.nodes) adjacency.set(node.id, []);

  for (const edge of level.edges) {
    if (!isEdgeActive(edge, state)) continue;
    adjacency.get(edge.a)?.push(edge.b);
    adjacency.get(edge.b)?.push(edge.a);
  }
  return adjacency;
}

/**
 * The yaw angles at which at least one `aligned` edge becomes active,
 * normalised and de-duplicated. Used by the hint system and by the star
 * rating's par computation to know which rotations are meaningful.
 */
export function significantYaws(level: Level): number[] {
  const seen = new Set<number>();
  for (const edge of level.edges) {
    if (edge.requiresYaw === undefined) continue;
    seen.add(normalizeAngle(edge.requiresYaw));
  }
  return [...seen].sort((a, b) => a - b);
}
