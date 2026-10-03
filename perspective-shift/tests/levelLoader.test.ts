import { describe, expect, it } from 'vitest';

import { assertValidLevel, initialWorldState, validateLevel } from '@/systems/levelLoader';
import type { Level } from '@/types';
import { movingPlatformLevel, singleBridgeLevel, switchLevel } from './fixtures';

const messages = (level: Level): string[] =>
  validateLevel(level).map((issue) => issue.message);

describe('validateLevel', () => {
  it('accepts well-formed fixtures', () => {
    expect(validateLevel(singleBridgeLevel())).toEqual([]);
    expect(validateLevel(switchLevel())).toEqual([]);
    expect(validateLevel(movingPlatformLevel())).toEqual([]);
  });

  it('catches dangling edge references', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [...level.edges, { a: 'l0', b: 'ghost', kind: 'fixed' }],
    };
    expect(messages(broken).join()).toContain('unknown node "ghost"');
  });

  it('catches a missing start or exit', () => {
    const level = singleBridgeLevel();
    expect(messages({ ...level, start: 'ghost' }).join()).toContain('start node "ghost"');
    expect(messages({ ...level, exit: 'ghost' }).join()).toContain('exit node "ghost"');
  });

  it('catches an aligned edge with no angle requirement', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l0', b: 'r0', kind: 'aligned' }],
    };
    expect(messages(broken).join()).toContain('declares no yaw/pitch requirement');
  });

  it('catches a fixed edge that carries an angle requirement', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l0', b: 'r0', kind: 'fixed', requiresYaw: 90 }],
    };
    expect(messages(broken).join()).toContain('fixed but declares an angle requirement');
  });

  it('rejects a rotation the player could never snap onto', () => {
    // 7deg is more than the default 7.5deg tolerance away from both 0 and 15.
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l2', b: 'r0', kind: 'aligned', requiresYaw: 7.6, tolerance: 0.5 }],
    };
    expect(messages(broken).join()).toContain('no snap position can satisfy');
  });

  it('rejects a tolerance wide enough to span two snap positions', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l2', b: 'r0', kind: 'aligned', requiresYaw: 90, tolerance: 20 }],
    };
    expect(messages(broken).join()).toContain('snap');
  });

  it('rejects a pitch requirement on a level that forbids pitch', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l2', b: 'r0', kind: 'aligned', requiresPitch: 30 }],
    };
    expect(messages(broken).join()).toContain('does not allow pitch rotation');
  });

  it('rejects a flag no switch drives', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l2', b: 'r0', kind: 'fixed', requiresFlag: 'nobody' }],
    };
    expect(messages(broken).join()).toContain('is not driven by any switch');
  });

  it('rejects a phase window with no group', () => {
    const level = singleBridgeLevel();
    const broken: Level = {
      ...level,
      edges: [{ a: 'l2', b: 'r0', kind: 'fixed', requiresPhase: [0, 0.5] }],
    };
    expect(messages(broken).join()).toContain('no phaseGroup');
  });

  it('catches duplicate node ids', () => {
    const level = singleBridgeLevel();
    const broken: Level = { ...level, nodes: [...level.nodes, level.nodes[0]] };
    expect(messages(broken).join()).toContain('duplicate node id');
  });

  it('catches an animating group with no period', () => {
    const level = movingPlatformLevel();
    const broken: Level = {
      ...level,
      groups: (level.groups ?? []).map((group) => ({ ...group, period: 0 })),
    };
    expect(messages(broken).join()).toContain('no positive period');
  });

  it('throws with every problem listed', () => {
    const level = singleBridgeLevel();
    expect(() => assertValidLevel({ ...level, start: 'ghost', exit: 'phantom' })).toThrow(
      /start node "ghost"[\s\S]*exit node "phantom"/,
    );
  });

  it('returns the level unchanged when valid', () => {
    const level = singleBridgeLevel();
    expect(assertValidLevel(level)).toBe(level);
  });
});

describe('initialWorldState', () => {
  it('starts unrotated with switch flags at their authored defaults', () => {
    const state = initialWorldState(switchLevel());
    expect(state.yaw).toBe(0);
    expect(state.pitch).toBe(0);
    expect(state.flags).toEqual({ gate: false });
  });

  it('seeds group phases from their offsets', () => {
    const level = movingPlatformLevel();
    const withOffset: Level = {
      ...level,
      groups: (level.groups ?? []).map((group) => ({ ...group, phaseOffset: 0.25 })),
    };
    expect(initialWorldState(withOffset).phases).toEqual({ carousel: 0.25 });
  });
});
