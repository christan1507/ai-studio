import { describe, expect, it } from 'vitest';

import {
  activeEdges,
  angleDelta,
  angleMatches,
  buildAdjacency,
  isEdgeActive,
  normalizeAngle,
  phaseInWindow,
  significantYaws,
} from '@/systems/connections';
import { initialWorldState } from '@/systems/levelLoader';
import type { Edge, WorldState } from '@/types';
import { singleBridgeLevel, switchLevel } from './fixtures';

const baseState: WorldState = { yaw: 0, pitch: 0, flags: {}, phases: {} };
const at = (yaw: number, overrides: Partial<WorldState> = {}): WorldState => ({
  ...baseState,
  ...overrides,
  yaw,
});

describe('angle helpers', () => {
  it('normalises into [0, 360)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-15)).toBe(345);
    expect(normalizeAngle(725)).toBe(5);
  });

  it('treats angles either side of the wrap as close together', () => {
    expect(angleDelta(1, 359)).toBe(2);
    expect(angleDelta(359, 1)).toBe(-2);
    expect(Math.abs(angleDelta(180, 0))).toBe(180);
  });

  it('matches within tolerance across the wrap point', () => {
    expect(angleMatches(357, 0, 7.5)).toBe(true);
    expect(angleMatches(3, 0, 7.5)).toBe(true);
    expect(angleMatches(350, 0, 7.5)).toBe(false);
  });

  it('includes the tolerance boundary itself', () => {
    expect(angleMatches(97.5, 90, 7.5)).toBe(true);
    expect(angleMatches(97.6, 90, 7.5)).toBe(false);
  });
});

describe('phaseInWindow', () => {
  it('handles ordinary windows inclusively', () => {
    expect(phaseInWindow(0.3, [0.2, 0.4])).toBe(true);
    expect(phaseInWindow(0.2, [0.2, 0.4])).toBe(true);
    expect(phaseInWindow(0.4, [0.2, 0.4])).toBe(true);
    expect(phaseInWindow(0.5, [0.2, 0.4])).toBe(false);
  });

  it('handles windows that wrap past the cycle boundary', () => {
    expect(phaseInWindow(0.95, [0.9, 0.1])).toBe(true);
    expect(phaseInWindow(0.05, [0.9, 0.1])).toBe(true);
    expect(phaseInWindow(0.5, [0.9, 0.1])).toBe(false);
  });

  it('wraps out-of-range phases rather than rejecting them', () => {
    expect(phaseInWindow(1.3, [0.2, 0.4])).toBe(true);
    expect(phaseInWindow(-0.7, [0.2, 0.4])).toBe(true);
  });
});

describe('isEdgeActive', () => {
  const aligned: Edge = { a: 'a', b: 'b', kind: 'aligned', requiresYaw: 90 };

  it('activates an aligned edge only near its required yaw', () => {
    expect(isEdgeActive(aligned, at(90))).toBe(true);
    expect(isEdgeActive(aligned, at(85))).toBe(true);
    expect(isEdgeActive(aligned, at(75))).toBe(false);
    expect(isEdgeActive(aligned, at(0))).toBe(false);
    expect(isEdgeActive(aligned, at(270))).toBe(false);
  });

  it('respects a custom tolerance', () => {
    const tight: Edge = { ...aligned, tolerance: 1 };
    expect(isEdgeActive(tight, at(90))).toBe(true);
    expect(isEdgeActive(tight, at(93))).toBe(false);
  });

  it('keeps a fixed edge active at every rotation', () => {
    const fixed: Edge = { a: 'a', b: 'b', kind: 'fixed' };
    for (let yaw = 0; yaw < 360; yaw += 15) {
      expect(isEdgeActive(fixed, at(yaw))).toBe(true);
    }
  });

  it('gates on flags in both directions', () => {
    const on: Edge = { a: 'a', b: 'b', kind: 'fixed', requiresFlag: 'gate' };
    const off: Edge = { a: 'a', b: 'b', kind: 'fixed', requiresFlagOff: 'gate' };
    expect(isEdgeActive(on, at(0, { flags: { gate: true } }))).toBe(true);
    expect(isEdgeActive(on, at(0, { flags: { gate: false } }))).toBe(false);
    expect(isEdgeActive(on, at(0))).toBe(false);
    expect(isEdgeActive(off, at(0, { flags: { gate: true } }))).toBe(false);
    expect(isEdgeActive(off, at(0))).toBe(true);
  });

  it('requires every constraint at once', () => {
    const combined: Edge = {
      a: 'a',
      b: 'b',
      kind: 'aligned',
      requiresYaw: 90,
      requiresFlag: 'gate',
    };
    expect(isEdgeActive(combined, at(90, { flags: { gate: true } }))).toBe(true);
    expect(isEdgeActive(combined, at(90, { flags: { gate: false } }))).toBe(false);
    expect(isEdgeActive(combined, at(0, { flags: { gate: true } }))).toBe(false);
  });

  it('treats a missing phase group as a closed gate', () => {
    const phased: Edge = {
      a: 'a',
      b: 'b',
      kind: 'fixed',
      phaseGroup: 'ghost',
      requiresPhase: [0.4, 0.6],
    };
    expect(isEdgeActive(phased, at(0))).toBe(false);
    expect(isEdgeActive(phased, at(0, { phases: { ghost: 0.5 } }))).toBe(true);
  });

  it('checks pitch independently of yaw', () => {
    const tilted: Edge = { a: 'a', b: 'b', kind: 'aligned', requiresPitch: 30 };
    expect(isEdgeActive(tilted, { ...baseState, pitch: 30 })).toBe(true);
    expect(isEdgeActive(tilted, { ...baseState, pitch: 0 })).toBe(false);
  });
});

describe('graph assembly', () => {
  it('reports no active bridge at the starting rotation', () => {
    const level = singleBridgeLevel();
    const state = initialWorldState(level);
    expect(activeEdges(level, state)).toHaveLength(level.edges.length - 1);
    expect(activeEdges(level, { ...state, yaw: 90 })).toHaveLength(level.edges.length);
  });

  it('includes isolated nodes as keys so callers can tell them from typos', () => {
    const level = singleBridgeLevel();
    const adjacency = buildAdjacency(level, initialWorldState(level));
    for (const node of level.nodes) expect(adjacency.has(node.id)).toBe(true);
    expect(adjacency.has('no-such-node')).toBe(false);
  });

  it('builds symmetric adjacency', () => {
    const level = singleBridgeLevel();
    const adjacency = buildAdjacency(level, { yaw: 90, pitch: 0, flags: {}, phases: {} });
    expect(adjacency.get('l2')).toContain('r0');
    expect(adjacency.get('r0')).toContain('l2');
  });

  it('lists the yaw angles that matter for a level', () => {
    expect(significantYaws(singleBridgeLevel())).toEqual([90]);
    expect(significantYaws(switchLevel())).toEqual([90]);
  });
});
