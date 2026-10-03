import { describe, expect, it } from 'vitest';

import { findPath, isReachable, reachableNodes } from '@/systems/pathfinding';
import { initialWorldState } from '@/systems/levelLoader';
import type { WorldState } from '@/types';
import { singleBridgeLevel, unsolvableLevel } from './fixtures';

describe('findPath', () => {
  const level = singleBridgeLevel();
  const closed: WorldState = initialWorldState(level);
  const open: WorldState = { ...closed, yaw: 90 };

  it('walks a straight run', () => {
    expect(findPath(level, closed, 'l0', 'l2')).toEqual(['l0', 'l1', 'l2']);
  });

  it('returns a single-element path for a no-op move', () => {
    expect(findPath(level, closed, 'l1', 'l1')).toEqual(['l1']);
  });

  it('refuses to cross a bridge that is not aligned', () => {
    expect(findPath(level, closed, 'l0', 'r2')).toBeNull();
  });

  it('crosses the bridge once the structure is aligned', () => {
    expect(findPath(level, open, 'l0', 'r2')).toEqual(['l0', 'l1', 'l2', 'r0', 'r1', 'r2']);
  });

  it('is symmetric — edges are bidirectional', () => {
    expect(findPath(level, open, 'r2', 'l0')).toEqual(['r2', 'r1', 'r0', 'l2', 'l1', 'l0']);
  });

  it('returns null for unknown nodes rather than throwing', () => {
    expect(findPath(level, open, 'l0', 'nope')).toBeNull();
    expect(findPath(level, open, 'nope', 'l0')).toBeNull();
  });
});

describe('reachableNodes', () => {
  it('covers only the current island', () => {
    const level = singleBridgeLevel();
    const state = initialWorldState(level);
    expect([...reachableNodes(level, state, 'l0')].sort()).toEqual(['l0', 'l1', 'l2']);
    expect([...reachableNodes(level, { ...state, yaw: 90 }, 'l0')].sort()).toEqual([
      'l0',
      'l1',
      'l2',
      'r0',
      'r1',
      'r2',
    ]);
  });

  it('returns an empty set for an unknown origin', () => {
    const level = singleBridgeLevel();
    expect(reachableNodes(level, initialWorldState(level), 'ghost').size).toBe(0);
  });

  it('never reaches a node with no edges at all', () => {
    const level = unsolvableLevel();
    const state = initialWorldState(level);
    for (let yaw = 0; yaw < 360; yaw += 15) {
      expect(isReachable(level, { ...state, yaw }, level.start, level.exit)).toBe(false);
    }
  });
});
