/**
 * Level loading and validation.
 *
 * Levels are authored as plain JSON-shaped data, so the only line of defence
 * against a broken level is this validator. It is strict on purpose: an
 * unreachable rotation requirement or a dangling node reference produces a
 * level that *looks* fine and is quietly impossible, which is exactly the bug
 * that is hardest to spot by playing.
 */

import { angleMatches, normalizeAngle } from '@/systems/connections';
import { isPitchRequirementReachable, PITCH_LIMIT } from '@/systems/rotation';
import {
  DEFAULT_ANGLE_TOLERANCE,
  SNAP_DEGREES,
  type Level,
  type WorldState,
} from '@/types';

export interface ValidationIssue {
  readonly level: string;
  readonly message: string;
}

/**
 * Structural problems with a level. An empty array means the level is
 * well-formed — which is a weaker claim than being solvable; see
 * {@link import('@/systems/solvability').solve}.
 */
export function validateLevel(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const report = (message: string): void => {
    issues.push({ level: level.id, message });
  };

  const nodeIds = new Set<string>();
  for (const node of level.nodes) {
    if (nodeIds.has(node.id)) report(`duplicate node id "${node.id}"`);
    nodeIds.add(node.id);
  }

  const groupIds = new Set((level.groups ?? []).map((group) => group.id));
  for (const group of level.groups ?? []) {
    if (group.motion === 'slide' || group.motion === 'elevator') {
      if (!group.from || !group.to) {
        report(`group "${group.id}" uses ${group.motion} but lacks from/to`);
      }
    }
    if (group.motion === 'spin' || group.motion === 'orbit') {
      if (!group.axis) report(`group "${group.id}" uses ${group.motion} but lacks an axis`);
    }
    if (group.motion !== 'none' && (group.period ?? 0) <= 0) {
      report(`group "${group.id}" animates but has no positive period`);
    }
  }

  for (const node of level.nodes) {
    if (node.group !== undefined && !groupIds.has(node.group)) {
      report(`node "${node.id}" references unknown group "${node.group}"`);
    }
  }
  for (const block of level.blocks) {
    if (block.group !== undefined && !groupIds.has(block.group)) {
      report(`a block references unknown group "${block.group}"`);
    }
  }

  const declaredFlags = new Set((level.switches ?? []).map((sw) => sw.flag));
  const switchIds = new Set<string>();
  for (const sw of level.switches ?? []) {
    if (switchIds.has(sw.id)) report(`duplicate switch id "${sw.id}"`);
    switchIds.add(sw.id);
    if (!nodeIds.has(sw.node)) {
      report(`switch "${sw.id}" sits on unknown node "${sw.node}"`);
    }
  }

  const groupByNode = new Map(level.nodes.map((node) => [node.id, node.group]));
  const movingGroups = new Set(
    (level.groups ?? [])
      .filter((group) => group.motion !== 'none' && (group.period ?? 0) > 0)
      .map((group) => group.id),
  );

  for (const edge of level.edges) {
    const label = `edge ${edge.a}->${edge.b}`;
    if (!nodeIds.has(edge.a)) report(`${label} references unknown node "${edge.a}"`);
    if (!nodeIds.has(edge.b)) report(`${label} references unknown node "${edge.b}"`);
    if (edge.a === edge.b) report(`${label} is a self-loop`);

    const hasAngle = edge.requiresYaw !== undefined || edge.requiresPitch !== undefined;
    if (edge.kind === 'aligned' && !hasAngle) {
      report(`${label} is aligned but declares no yaw/pitch requirement`);
    }
    if (edge.kind === 'fixed' && hasAngle) {
      report(`${label} is fixed but declares an angle requirement`);
    }

    const tolerance = edge.tolerance ?? DEFAULT_ANGLE_TOLERANCE;
    if (tolerance >= SNAP_DEGREES) {
      report(
        `${label} has tolerance ${tolerance}deg, which is >= the ${SNAP_DEGREES}deg snap ` +
          `increment and would stay active across adjacent rotations`,
      );
    }
    // A requirement the player can never snap onto makes the level impossible
    // while looking perfectly reasonable in the data.
    if (edge.requiresYaw !== undefined) {
      const reachable = Array.from({ length: Math.round(360 / SNAP_DEGREES) }, (_, i) =>
        normalizeAngle(i * SNAP_DEGREES),
      ).some((snap) => angleMatches(snap, edge.requiresYaw as number, tolerance));
      if (!reachable) {
        report(
          `${label} requires yaw ${edge.requiresYaw}deg, which no snap position can satisfy`,
        );
      }
    }
    if (edge.requiresPitch !== undefined) {
      if (level.allowPitch !== true) {
        report(`${label} requires a pitch but the level does not allow pitch rotation`);
      } else if (!isPitchRequirementReachable(edge.requiresPitch, tolerance)) {
        // Pitch is clamped to +/-PITCH_LIMIT, so most of the circle is not a
        // tilt the player can produce.
        report(
          `${label} requires pitch ${edge.requiresPitch}deg, beyond the +/-${PITCH_LIMIT}deg tilt limit`,
        );
      }
    }

    for (const [kind, flag] of [
      ['requiresFlag', edge.requiresFlag],
      ['requiresFlagOff', edge.requiresFlagOff],
    ] as const) {
      if (flag !== undefined && !declaredFlags.has(flag)) {
        report(`${label} ${kind} "${flag}" is not driven by any switch`);
      }
    }

    // An edge touching a moving assembly must be phase-gated, unless both
    // ends ride the same assembly and so move together. Otherwise the
    // connection exists regardless of where the platform actually is, and the
    // character steps onto empty space — a bug the solvability checker cannot
    // see, because it reasons about the graph rather than the geometry.
    const groupA = groupByNode.get(edge.a);
    const groupB = groupByNode.get(edge.b);
    const touchesMoving =
      (groupA !== undefined && movingGroups.has(groupA)) ||
      (groupB !== undefined && movingGroups.has(groupB));
    if (touchesMoving && groupA !== groupB && edge.requiresPhase === undefined) {
      report(
        `${label} joins a moving assembly to something that does not move with it, ` +
          `but declares no phase window`,
      );
    }
    if (
      edge.requiresPhase !== undefined &&
      edge.phaseGroup !== undefined &&
      groupA !== edge.phaseGroup &&
      groupB !== edge.phaseGroup
    ) {
      report(
        `${label} is gated on group "${edge.phaseGroup}" but neither end rides it`,
      );
    }
    // Two assemblies moving independently cannot be joined: a single phase
    // window can only describe one of them.
    if (
      groupA !== undefined &&
      groupB !== undefined &&
      groupA !== groupB &&
      movingGroups.has(groupA) &&
      movingGroups.has(groupB)
    ) {
      report(
        `${label} joins two independently moving assemblies ("${groupA}" and "${groupB}"), ` +
          `which one phase window cannot describe`,
      );
    }

    if (edge.requiresPhase !== undefined) {
      if (edge.phaseGroup === undefined) {
        report(`${label} declares a phase window but no phaseGroup`);
      } else if (!groupIds.has(edge.phaseGroup)) {
        report(`${label} references unknown phaseGroup "${edge.phaseGroup}"`);
      }
      const [start, end] = edge.requiresPhase;
      if (start < 0 || start > 1 || end < 0 || end > 1) {
        report(`${label} has a phase window outside 0..1`);
      }
    }
  }

  if (!nodeIds.has(level.start)) report(`start node "${level.start}" does not exist`);
  if (!nodeIds.has(level.exit)) report(`exit node "${level.exit}" does not exist`);
  if (level.start === level.exit) report('start and exit are the same node');

  return issues;
}

/** Throws on a malformed level, listing every problem found. */
export function assertValidLevel(level: Level): Level {
  const issues = validateLevel(level);
  if (issues.length > 0) {
    throw new Error(
      `Level "${level.id}" is invalid:\n` + issues.map((i) => `  - ${i.message}`).join('\n'),
    );
  }
  return level;
}

/** The world state a level begins in. */
export function initialWorldState(level: Level): WorldState {
  const flags: Record<string, boolean> = {};
  for (const sw of level.switches ?? []) flags[sw.flag] = sw.initial === true;

  const phases: Record<string, number> = {};
  for (const group of level.groups ?? []) phases[group.id] = group.phaseOffset ?? 0;

  return { yaw: 0, pitch: 0, flags, phases };
}
