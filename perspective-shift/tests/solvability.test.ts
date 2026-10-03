import { describe, expect, it } from 'vitest';

import { isSolvable, solve, starsForRotations, starThresholds } from '@/systems/solvability';
import type { Level } from '@/types';
import {
  frozenPlatformLevel,
  movingPlatformLevel,
  singleBridgeLevel,
  switchLevel,
  twoBridgeLevel,
  unsolvableLevel,
} from './fixtures';

describe('solve', () => {
  it('counts one rotation per alignment, not per snap step', () => {
    // Reaching yaw 90 is six 15deg snaps but a single player gesture.
    const result = solve(singleBridgeLevel());
    expect(result.solvable).toBe(true);
    expect(result.minRotations).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it('needs one rotation per distinct angle the route requires', () => {
    const result = solve(twoBridgeLevel());
    expect(result.solvable).toBe(true);
    expect(result.minRotations).toBe(2);
  });

  it('charges nothing for an alignment the level already starts at', () => {
    const level = singleBridgeLevel();
    const edges = level.edges.map((edge) =>
      edge.kind === 'aligned' ? { ...edge, requiresYaw: 0 } : edge,
    );
    expect(solve({ ...level, edges }).minRotations).toBe(0);
  });

  it('reports an isolated exit as unsolvable without truncating', () => {
    const result = solve(unsolvableLevel());
    expect(result.solvable).toBe(false);
    expect(result.minRotations).toBeNull();
    expect(result.truncated).toBe(false);
  });

  it('throws switches for free, counting only rotations', () => {
    const result = solve(switchLevel());
    expect(result.solvable).toBe(true);
    expect(result.minRotations).toBe(1);
  });

  it('treats a continuously cycling platform as waitable', () => {
    const result = solve(movingPlatformLevel());
    expect(result.solvable).toBe(true);
    expect(result.minRotations).toBe(0);
  });

  it('does not let the player wait out a platform frozen by an unset flag', () => {
    const result = solve(frozenPlatformLevel());
    expect(result.solvable).toBe(false);
    expect(result.truncated).toBe(false);
  });

  it('treats a near-neighbour angle as costing the same as a distant one', () => {
    // Direction and distance are irrelevant now; both are one gesture.
    const level = singleBridgeLevel();
    const near = level.edges.map((edge) =>
      edge.kind === 'aligned' ? { ...edge, requiresYaw: 345 } : edge,
    );
    const far = level.edges.map((edge) =>
      edge.kind === 'aligned' ? { ...edge, requiresYaw: 180 } : edge,
    );
    expect(solve({ ...level, edges: near }).minRotations).toBe(1);
    expect(solve({ ...level, edges: far }).minRotations).toBe(1);
  });

  it('explores only the angles that can change something', () => {
    // One alignment means two interesting rotations exist: the one that opens
    // it and a representative that does not. The search must not grind through
    // all 24 snap positions.
    const result = solve(singleBridgeLevel());
    expect(result.statesExplored).toBeLessThan(40);
  });

  it('flags truncation instead of silently reporting unsolvable', () => {
    const result = solve(twoBridgeLevel(), { maxRotations: 1 });
    expect(result.truncated).toBe(true);
    expect(result.solvable).toBe(false);
    expect(result.minRotations).toBeNull();
  });

  it('flags truncation when the state budget runs out', () => {
    const result = solve(twoBridgeLevel(), { maxStates: 1 });
    expect(result.truncated).toBe(true);
  });

  it('handles a level whose start is its own exit neighbourhood', () => {
    const level = singleBridgeLevel();
    const adjacent: Level = { ...level, exit: 'l2' };
    expect(solve(adjacent).minRotations).toBe(0);
  });

  it('exposes a boolean convenience wrapper', () => {
    expect(isSolvable(singleBridgeLevel())).toBe(true);
    expect(isSolvable(unsolvableLevel())).toBe(false);
  });
});

describe('star rating', () => {
  it('awards three stars for matching the optimum', () => {
    const thresholds = starThresholds(3);
    expect(starsForRotations(3, thresholds)).toBe(3);
    expect(starsForRotations(2, thresholds)).toBe(3);
  });

  it('awards two stars for a modest overshoot and one for finishing at all', () => {
    const thresholds = starThresholds(4);
    expect(starsForRotations(6, thresholds)).toBe(2);
    expect(starsForRotations(20, thresholds)).toBe(1);
  });

  it('keeps a usable two-star band on zero-rotation levels', () => {
    const thresholds = starThresholds(0);
    expect(starsForRotations(0, thresholds)).toBe(3);
    expect(starsForRotations(2, thresholds)).toBe(2);
    expect(starsForRotations(3, thresholds)).toBe(1);
  });
});
