/**
 * Geometric honesty.
 *
 * The solvability checker reasons about the walkable *graph* and deliberately
 * treats a cycling platform's phase window as waitable. That makes it blind to
 * the one authoring mistake moving platforms invite: a dock whose window opens
 * while the platform is somewhere else entirely. The level is then provably
 * "solvable" and visibly broken, with the character stepping into thin air.
 *
 * This suite checks the geometry the graph implies:
 * - an *ungated* edge claims two tiles are simply adjacent, so they must be
 *   within stepping distance
 * - a phase-gated edge must come within stepping distance at some point inside
 *   its declared window
 * - a gated edge is a bridge and may span a gap — that is the whole illusion —
 *   but not an absurd one, which catches transposed coordinates
 */

import { describe, expect, it } from 'vitest';

import { ALL_LEVELS } from '@/data/levels';
import { distanceBetween, resolvedNodePosition } from '@/systems/groups';
import { phaseInWindow } from '@/systems/connections';
import type { Edge, Level, Vec3 } from '@/types';

/** Generous enough for a diagonal or a one-unit stair rise. */
const MAX_STEP = 2.4;
/** An illusory span can be long, but not level-wide; this catches typos. */
const MAX_ILLUSORY_SPAN = 14;
/** Samples taken across a phase window. */
const PHASE_SAMPLES = 25;

function nodeMap(level: Level) {
  return new Map(level.nodes.map((node) => [node.id, node]));
}

function positionsAtPhase(level: Level, edge: Edge, phase: number): [Vec3, Vec3] | null {
  const nodes = nodeMap(level);
  const a = nodes.get(edge.a);
  const b = nodes.get(edge.b);
  if (!a || !b) return null;

  const phases: Record<string, number> = {};
  for (const group of level.groups ?? []) phases[group.id] = phase;

  return [resolvedNodePosition(level, a, phases), resolvedNodePosition(level, b, phases)];
}

/** Closest the two ends of an edge come within its phase window. */
function closestWithinWindow(level: Level, edge: Edge): number {
  const window = edge.requiresPhase;
  if (!window) return Infinity;

  let closest = Infinity;
  for (let i = 0; i < PHASE_SAMPLES; i += 1) {
    const phase = i / (PHASE_SAMPLES - 1);
    if (!phaseInWindow(phase, window)) continue;
    const pair = positionsAtPhase(level, edge, phase);
    if (!pair) continue;
    closest = Math.min(closest, distanceBetween(pair[0], pair[1]));
  }

  // A window narrower than the sample spacing can be missed entirely; fall
  // back to its exact endpoints and midpoint rather than passing vacuously.
  if (!Number.isFinite(closest)) {
    const [start, end] = window;
    for (const phase of [start, end, (start + end) / 2]) {
      const pair = positionsAtPhase(level, edge, phase);
      if (!pair) continue;
      closest = Math.min(closest, distanceBetween(pair[0], pair[1]));
    }
  }
  return closest;
}

describe('edge geometry', () => {
  for (const level of ALL_LEVELS) {
    const movingGroupIds = new Set(
      (level.groups ?? []).filter((group) => group.motion !== 'none').map((group) => group.id),
    );

    it(`${level.id} joins ungated edges within stepping distance`, () => {
      const nodes = nodeMap(level);
      const offenders: string[] = [];

      for (const edge of level.edges) {
        // Any gating makes the edge a bridge, which is meant to span a gap.
        if (
          edge.kind === 'aligned' ||
          edge.requiresPhase !== undefined ||
          edge.requiresFlag !== undefined ||
          edge.requiresFlagOff !== undefined
        ) {
          continue;
        }
        const a = nodes.get(edge.a);
        const b = nodes.get(edge.b);
        if (!a || !b) continue;
        // A node riding a moving assembly is only adjacent at certain phases,
        // which is what the phase-gated case below covers.
        if (movingGroupIds.has(a.group ?? '') || movingGroupIds.has(b.group ?? '')) continue;

        const distance = distanceBetween(a.pos, b.pos);
        if (distance > MAX_STEP) {
          offenders.push(`${edge.a}->${edge.b} is ${distance.toFixed(2)} apart`);
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${level.id} opens phase-gated docks only when the platform is there`, () => {
      const offenders: string[] = [];
      for (const edge of level.edges) {
        if (edge.requiresPhase === undefined) continue;
        const closest = closestWithinWindow(level, edge);
        if (!(closest <= MAX_STEP)) {
          offenders.push(
            `${edge.a}->${edge.b} never comes closer than ${closest.toFixed(2)} ` +
              `during phase [${edge.requiresPhase.join(', ')}]`,
          );
        }
      }
      expect(offenders).toEqual([]);
    });

    it(`${level.id} keeps bridged spans plausible`, () => {
      const nodes = nodeMap(level);
      const offenders: string[] = [];
      for (const edge of level.edges) {
        const gated =
          edge.kind === 'aligned' ||
          edge.requiresFlag !== undefined ||
          edge.requiresFlagOff !== undefined;
        if (!gated) continue;
        const a = nodes.get(edge.a);
        const b = nodes.get(edge.b);
        if (!a || !b) continue;
        if (movingGroupIds.has(a.group ?? '') || movingGroupIds.has(b.group ?? '')) continue;
        const distance = distanceBetween(a.pos, b.pos);
        if (distance > MAX_ILLUSORY_SPAN) {
          offenders.push(`${edge.a}->${edge.b} spans ${distance.toFixed(2)}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
