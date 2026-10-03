/**
 * Solvability checker.
 *
 * Proves a level can be finished and finds the fewest rotations needed, which
 * is what the star rating scores against.
 *
 * Four modelling choices make this both fast and faithful:
 *
 * 1. **A rotation is one action, not one snap step.** The player flicks the
 *    structure to wherever they want in a single gesture, so turning 90deg
 *    costs the same as turning 15deg. Counting the six intermediate snap
 *    positions would report a four-alignment level as "30 rotations", which
 *    is not what anyone means by a rotation.
 *
 * 2. **Only angles that can change something are considered.** Edge activity
 *    depends on angle solely through the `requiresYaw`/`requiresPitch` match,
 *    so two snap positions that satisfy exactly the same set of requirements
 *    are interchangeable. Collapsing them is exact, not an approximation, and
 *    shrinks the search from 24 (or 576) rotation states to a handful.
 *
 * 3. **Walking and flipping switches are free.** Only rotations are counted,
 *    so a layered search over rotation count yields the true minimum.
 *
 * 4. **Platform phase is optimistic, not enumerated.** A cycling platform
 *    eventually presents every phase and the game has no timer, so the player
 *    can simply wait. A phase-gated edge is therefore treated as traversable —
 *    but only when its group is actually moving. A group held still by an
 *    unset flag cannot be waited out, and that case is modelled honestly.
 */

import { angleMatches, normalizeAngle } from '@/systems/connections';
import { reachablePitchSnaps } from '@/systems/rotation';
import {
  DEFAULT_ANGLE_TOLERANCE,
  SNAP_DEGREES,
  type Edge,
  type GroupDef,
  type Level,
  type SwitchDef,
} from '@/types';

export interface SolveOptions {
  /** Abort once this many positions have been expanded. */
  readonly maxStates?: number;
  /** Abort after this many rotation layers. */
  readonly maxRotations?: number;
}

export interface SolveResult {
  readonly solvable: boolean;
  /** Fewest rotation actions needed to finish, or null if unsolvable. */
  readonly minRotations: number | null;
  readonly statesExplored: number;
  /**
   * True when the search hit a limit before finishing. A truncated result is
   * not a verdict — callers (and tests) must treat it as a failure to verify
   * rather than as "unsolvable".
   */
  readonly truncated: boolean;
}

export const DEFAULT_MAX_STATES = 2_000_000;
export const DEFAULT_MAX_ROTATIONS = 48;

const SNAP_STEPS = Math.round(360 / SNAP_DEGREES);

type Flags = Readonly<Record<string, boolean>>;

/**
 * Snap positions worth visiting on one axis.
 *
 * Each snap position is labelled by which angle requirements it satisfies;
 * positions sharing a label are interchangeable, so one representative of each
 * is kept. The neutral position — satisfying nothing — is included because
 * "rotate away so a bridge closes" is a legitimate move.
 */
function candidateAngles(level: Level, axis: 'yaw' | 'pitch'): number[] {
  const requirements = level.edges.map((edge) => ({
    required: axis === 'yaw' ? edge.requiresYaw : edge.requiresPitch,
    tolerance: edge.tolerance ?? DEFAULT_ANGLE_TOLERANCE,
  }));

  // Yaw turns freely; pitch is clamped, so only tilts the player can actually
  // produce may be considered or the checker would prove levels solvable by a
  // rotation no gesture can make.
  const positions =
    axis === 'yaw'
      ? Array.from({ length: SNAP_STEPS }, (_, step) => normalizeAngle(step * SNAP_DEGREES))
      : reachablePitchSnaps();

  const representatives = new Map<string, number>();
  for (const angle of positions) {
    let signature = '';
    for (const { required, tolerance } of requirements) {
      signature +=
        required !== undefined && angleMatches(angle, required, tolerance) ? '1' : '0';
    }
    // Prefer the lowest angle for a given signature so results are stable and
    // angle 0 (the starting rotation) always wins its class.
    if (!representatives.has(signature)) representatives.set(signature, angle);
  }
  return [...representatives.values()].sort((a, b) => a - b);
}

/**
 * Edge activity as the solver sees it: identical to the runtime predicate
 * except that a satisfiable phase window on a *moving* group is treated as
 * waitable. See the file header.
 */
function isEdgeActiveOptimistic(
  edge: Edge,
  yaw: number,
  pitch: number,
  flags: Flags,
  groups: ReadonlyMap<string, GroupDef>,
): boolean {
  const tolerance = edge.tolerance ?? DEFAULT_ANGLE_TOLERANCE;

  if (edge.requiresYaw !== undefined && !angleMatches(yaw, edge.requiresYaw, tolerance)) {
    return false;
  }
  if (edge.requiresPitch !== undefined && !angleMatches(pitch, edge.requiresPitch, tolerance)) {
    return false;
  }
  if (edge.requiresFlag !== undefined && flags[edge.requiresFlag] !== true) return false;
  if (edge.requiresFlagOff !== undefined && flags[edge.requiresFlagOff] === true) return false;

  if (edge.requiresPhase !== undefined) {
    const group = edge.phaseGroup ? groups.get(edge.phaseGroup) : undefined;
    if (!group) return false;
    if (group.motion === 'none' || (group.period ?? 0) <= 0) return false;
    if (group.requiresFlag !== undefined && flags[group.requiresFlag] !== true) return false;
  }
  return true;
}

function flagsKey(flags: Flags, names: readonly string[]): string {
  let key = '';
  for (const name of names) key += flags[name] === true ? '1' : '0';
  return key;
}

interface Position {
  readonly node: string;
  readonly flags: Flags;
}

/**
 * Expand positions under all zero-cost moves at a fixed rotation: walking
 * across active edges, and operating any switch the character finishes on.
 * `visited` is per-rotation and persists across layers, so a position already
 * explored at this rotation is never revisited.
 */
function closeUnderFreeMoves(
  level: Level,
  seeds: readonly Position[],
  yaw: number,
  pitch: number,
  groups: ReadonlyMap<string, GroupDef>,
  switchesByNode: ReadonlyMap<string, readonly SwitchDef[]>,
  flagNames: readonly string[],
  visited: Set<string>,
): Position[] {
  const results: Position[] = [];
  const stack = [...seeds];

  while (stack.length > 0) {
    const position = stack.pop() as Position;
    const key = `${position.node}|${flagsKey(position.flags, flagNames)}`;
    if (visited.has(key)) continue;
    visited.add(key);
    results.push(position);

    for (const edge of level.edges) {
      if (edge.a !== position.node && edge.b !== position.node) continue;
      if (!isEdgeActiveOptimistic(edge, yaw, pitch, position.flags, groups)) continue;
      stack.push({
        node: edge.a === position.node ? edge.b : edge.a,
        flags: position.flags,
      });
    }

    for (const sw of switchesByNode.get(position.node) ?? []) {
      const currentlyOn = position.flags[sw.flag] === true;
      if (sw.mode === 'once' && currentlyOn) continue;
      stack.push({
        node: position.node,
        flags: { ...position.flags, [sw.flag]: !currentlyOn },
      });
    }
  }
  return results;
}

/** Fewest rotation actions needed to walk from the level's start to its exit. */
export function solve(level: Level, options: SolveOptions = {}): SolveResult {
  const maxStates = options.maxStates ?? DEFAULT_MAX_STATES;
  const maxRotations = options.maxRotations ?? DEFAULT_MAX_ROTATIONS;

  const groups = new Map((level.groups ?? []).map((group) => [group.id, group]));
  const switchesByNode = new Map<string, SwitchDef[]>();
  for (const sw of level.switches ?? []) {
    const list = switchesByNode.get(sw.node);
    if (list) list.push(sw);
    else switchesByNode.set(sw.node, [sw]);
  }

  const flagNames = [...new Set((level.switches ?? []).map((sw) => sw.flag))].sort();
  const initialFlags: Record<string, boolean> = {};
  for (const sw of level.switches ?? []) initialFlags[sw.flag] = sw.initial === true;

  const yaws = candidateAngles(level, 'yaw');
  const pitches = level.allowPitch === true ? candidateAngles(level, 'pitch') : [0];

  const visitedByRotation = new Map<string, Set<string>>();
  const visitedFor = (yaw: number, pitch: number): Set<string> => {
    const key = `${yaw}:${pitch}`;
    let set = visitedByRotation.get(key);
    if (!set) {
      set = new Set<string>();
      visitedByRotation.set(key, set);
    }
    return set;
  };

  let statesExplored = 0;

  // Layer 0: whatever can be reached without rotating at all.
  let frontier = closeUnderFreeMoves(
    level,
    [{ node: level.start, flags: initialFlags }],
    0,
    0,
    groups,
    switchesByNode,
    flagNames,
    visitedFor(0, 0),
  );
  statesExplored += frontier.length;

  if (frontier.some((position) => position.node === level.exit)) {
    return { solvable: true, minRotations: 0, statesExplored, truncated: false };
  }

  // One rotation reaches *any* angle, so each layer re-seeds every candidate
  // rotation with everything reachable in the previous layer.
  for (let rotations = 1; rotations <= maxRotations; rotations += 1) {
    const next: Position[] = [];

    for (const yaw of yaws) {
      for (const pitch of pitches) {
        const reached = closeUnderFreeMoves(
          level,
          frontier,
          yaw,
          pitch,
          groups,
          switchesByNode,
          flagNames,
          visitedFor(yaw, pitch),
        );
        if (reached.length === 0) continue;
        statesExplored += reached.length;

        if (reached.some((position) => position.node === level.exit)) {
          return { solvable: true, minRotations: rotations, statesExplored, truncated: false };
        }
        next.push(...reached);
      }
    }

    if (statesExplored > maxStates) {
      return { solvable: false, minRotations: null, statesExplored, truncated: true };
    }
    // Nothing new became reachable, so no amount of further rotating will help.
    if (next.length === 0) {
      return { solvable: false, minRotations: null, statesExplored, truncated: false };
    }
    frontier = next;
  }

  return { solvable: false, minRotations: null, statesExplored, truncated: true };
}

/** Convenience wrapper for the common "can this be finished at all?" question. */
export function isSolvable(level: Level, options?: SolveOptions): boolean {
  return solve(level, options).solvable;
}

/**
 * Star thresholds for a level, derived from the optimal rotation count.
 * Three stars for matching the optimum, two for a small overshoot, one for
 * finishing at all — there is no fail state, so every completion earns a star.
 */
export interface StarThresholds {
  readonly three: number;
  readonly two: number;
}

export function starThresholds(optimalRotations: number): StarThresholds {
  return {
    three: optimalRotations,
    two: optimalRotations + Math.max(2, Math.ceil(optimalRotations * 0.5)),
  };
}

export function starsForRotations(rotations: number, thresholds: StarThresholds): number {
  if (rotations <= thresholds.three) return 3;
  if (rotations <= thresholds.two) return 2;
  return 1;
}
