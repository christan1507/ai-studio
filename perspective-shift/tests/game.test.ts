/**
 * End-to-end play, driven through the store.
 *
 * This exercises the same code path the game uses — load, rotate, walk,
 * arrive, complete — without a renderer. The components only translate frames
 * and pointer events into these calls, so if this passes, the loop works.
 *
 * It also pins the rotation *accounting*, which is what the star rating is
 * built on and is easy to get subtly wrong (counting mid-gesture angles, or
 * billing a new level for the previous one's final rotation).
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { ALL_LEVELS, levelById } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { snapIndex } from '@/systems/rotation';
import type { Level } from '@/types';

const store = useGameStore;

/** Point the structure at an angle and let it come to rest, as a player would. */
function rotateTo(yawDegrees: number, pitchDegrees = 0): boolean {
  const { runtime } = store.getState();
  if (!runtime) throw new Error('no runtime');
  runtime.rotation.visualYaw = yawDegrees;
  runtime.rotation.visualPitch = pitchDegrees;
  runtime.rotation.yawVelocity = 0;
  runtime.rotation.pitchVelocity = 0;
  runtime.rotation.dragging = false;
  return store.getState().syncRotation(snapIndex(yawDegrees), snapIndex(pitchDegrees), true);
}

/** Run the walk animation to completion without a renderer. */
function finishWalk(): void {
  for (let guard = 0; guard < 500; guard += 1) {
    if (store.getState().status !== 'walking') return;
    store.getState().advancePath();
  }
  throw new Error('walk did not finish');
}

/** Walk to a node, returning false if it was not reachable. */
function walkTo(node: string): boolean {
  if (!store.getState().requestMove(node)) return false;
  finishWalk();
  return true;
}

/**
 * Advance moving platforms. Levels built on `phaseLink` open their docks on a
 * schedule rather than at an angle, so a harness that never lets time pass can
 * never board one.
 */
function advanceTime(seconds: number): void {
  store.getState().runtime?.tick(seconds);
}

/**
 * A stand-in player.
 *
 * Tries every rotation the level's spans actually call for — including tilts,
 * which Chapter 4 onward requires — and lets time pass at each so phase-gated
 * docks can open. When the exit is in reach it goes straight there; otherwise
 * it moves to the *least-visited* reachable tile.
 *
 * That last rule matters more than it looks. A naive explorer that walks to
 * every reachable tile in order always finishes on the same one, which on a
 * level with a deliberate dead end (Chapter 1's decoy bridge) parks it in the
 * trap forever. Preferring unvisited ground makes it back out.
 */
function play(level: Level, passes = 6): void {
  const yaws = [0, ...new Set(level.edges.flatMap((e) => (e.requiresYaw === undefined ? [] : [e.requiresYaw])))];
  const pitches = [0, ...new Set(level.edges.flatMap((e) => (e.requiresPitch === undefined ? [] : [e.requiresPitch])))];
  const visits = new Map<string, number>();

  const movingGroups = new Set(
    (level.groups ?? [])
      .filter((group) => group.motion !== 'none' && (group.period ?? 0) > 0)
      .map((group) => group.id),
  );
  const movingNodes = new Set(
    level.nodes.filter((node) => node.group && movingGroups.has(node.group)).map((n) => n.id),
  );

  let ridingFor = 0;
  const done = (): boolean => store.getState().status === 'complete';

  for (let pass = 0; pass < passes && !done(); pass += 1) {
    for (const yaw of yaws) {
      for (const pitch of pitches) {
        if (done()) return;
        rotateTo(yaw, pitch);

        for (let step = 0; step < 20 && !done(); step += 1) {
          advanceTime(0.4);
          if (store.getState().status !== 'playing') break;

          // Always take the exit when it is available.
          if (walkTo(level.exit)) return;

          const here = store.getState().characterNode;
          // Standing on a platform, the sensible move is usually to wait and
          // ride it; an explorer that steps back onto the dock the moment it
          // can never gets ferried anywhere. But waiting forever is its own
          // trap, so patience runs out and it will take any exit after a
          // while.
          if (movingNodes.has(here)) ridingFor += 1;
          else ridingFor = 0;
          const beingPatient = ridingFor > 0 && ridingFor < 8;

          const candidates = level.nodes
            .map((node) => node.id)
            .filter((candidate) => candidate !== here)
            .filter((candidate) => !beingPatient || (visits.get(candidate) ?? 0) === 0)
            .sort((a, b) => (visits.get(a) ?? 0) - (visits.get(b) ?? 0));

          for (const candidate of candidates) {
            if (store.getState().requestMove(candidate)) {
              finishWalk();
              visits.set(candidate, (visits.get(candidate) ?? 0) + 1);
              break;
            }
          }
        }
      }
    }
  }
}

function load(id: string): Level {
  const level = levelById(id);
  if (!level) throw new Error(`missing level ${id}`);
  store.getState().loadLevel(level);
  return level;
}

beforeEach(() => {
  store.getState().unload();
});

describe('loading a level', () => {
  it('starts the character at the start node, unrotated and unscored', () => {
    const level = load('ch1-1');
    const state = store.getState();
    expect(state.status).toBe('playing');
    expect(state.characterNode).toBe(level.start);
    expect(state.rotationCount).toBe(0);
    expect(state.starsEarned).toBe(0);
    expect(state.runtime).not.toBeNull();
  });

  it('computes par from the solver rather than trusting the author', () => {
    load('ch1-1');
    expect(store.getState().optimalRotations).toBe(1);
  });
});

describe('rotation accounting', () => {
  beforeEach(() => {
    load('ch1-1');
  });

  it('counts one rotation per settle at a new angle', () => {
    expect(rotateTo(90)).toBe(true);
    expect(store.getState().rotationCount).toBe(1);
  });

  it('does not count settling at the angle it is already resting at', () => {
    rotateTo(90);
    expect(rotateTo(90)).toBe(false);
    expect(store.getState().rotationCount).toBe(1);
  });

  it('ignores angles swept through mid-gesture', () => {
    const { runtime } = store.getState();
    runtime!.rotation.visualYaw = 45;
    // `settled: false` — the structure is still moving.
    expect(store.getState().syncRotation(snapIndex(45), 0, false)).toBe(false);
    expect(store.getState().rotationCount).toBe(0);
  });

  it('charges the same for a long turn as a short one', () => {
    rotateTo(180);
    expect(store.getState().rotationCount).toBe(1);
  });

  it('resets the baseline on load so a new level is not billed for the last', () => {
    rotateTo(90);
    expect(store.getState().rotationCount).toBe(1);
    load('ch1-2');
    expect(store.getState().rotationCount).toBe(0);
    // Settling back at 0 on the fresh level must not count.
    expect(rotateTo(0)).toBe(false);
    expect(store.getState().rotationCount).toBe(0);
  });
});

describe('movement', () => {
  beforeEach(() => {
    load('ch1-1');
  });

  it('refuses a destination that is not currently connected', () => {
    const level = levelById('ch1-1')!;
    expect(store.getState().requestMove(level.exit)).toBe(false);
    expect(store.getState().status).toBe('playing');
  });

  it('refuses to move while the structure is still turning', () => {
    const { runtime } = store.getState();
    runtime!.rotation.dragging = true;
    // 'a1' is the next tile along the near run — reachable but for the drag.
    expect(store.getState().requestMove('a1')).toBe(false);
  });

  it('walks along a connected run without any rotation', () => {
    expect(walkTo('a3')).toBe(true);
    expect(store.getState().characterNode).toBe('a3');
    expect(store.getState().status).toBe('playing');
  });

  it('walks across a span once it is aligned, and arrives', () => {
    rotateTo(90);
    expect(walkTo('c0')).toBe(true);
    expect(store.getState().characterNode).toBe('c0');
    expect(store.getState().status).toBe('playing');
  });

  it('refuses a move to the node already underfoot', () => {
    expect(store.getState().requestMove(store.getState().characterNode)).toBe(false);
  });
});

describe('completing a level', () => {
  it('reaches the exit and scores three stars at par', () => {
    const level = load('ch1-1');
    rotateTo(90);
    expect(walkTo(level.exit)).toBe(true);

    const state = store.getState();
    expect(state.status).toBe('complete');
    expect(state.characterNode).toBe(level.exit);
    expect(state.rotationCount).toBe(1);
    expect(state.starsEarned).toBe(3);
  });

  it('awards fewer stars for a wasteful solution', () => {
    const level = load('ch1-1');
    // Wander through several angles before finding the right one.
    rotateTo(30);
    rotateTo(150);
    rotateTo(210);
    rotateTo(270);
    rotateTo(315);
    rotateTo(90);
    expect(walkTo(level.exit)).toBe(true);
    expect(store.getState().rotationCount).toBe(6);
    expect(store.getState().starsEarned).toBeLessThan(3);
    expect(store.getState().starsEarned).toBeGreaterThanOrEqual(1);
  });

  it('refuses further moves once the level is complete', () => {
    const level = load('ch1-1');
    rotateTo(90);
    walkTo(level.exit);
    expect(store.getState().requestMove(level.start)).toBe(false);
  });

  it('restart returns the level to its opening state', () => {
    const level = load('ch1-1');
    rotateTo(90);
    walkTo(level.exit);
    store.getState().restart();

    const state = store.getState();
    expect(state.status).toBe('playing');
    expect(state.characterNode).toBe(level.start);
    expect(state.rotationCount).toBe(0);
    expect(state.starsEarned).toBe(0);
  });
});

describe('switches', () => {
  it('fires on arriving at a plate and opens the gate it drives', () => {
    const level = load('ch3-1');
    expect(store.getState().flags.gate).toBe(false);

    // The plate is the far corner of the pad; the exit span needs it set.
    expect(walkTo('p_0_0')).toBe(true);
    expect(store.getState().requestMove(level.exit)).toBe(false);

    expect(walkTo('p_1_1')).toBe(true);
    expect(store.getState().flags.gate).toBe(true);
    expect(walkTo(level.exit)).toBe(true);
    expect(store.getState().status).toBe('complete');
  });

  it('does not fire for a plate merely passed over en route', () => {
    load('ch3-1');
    // Walking from one side of the pad to the other crosses p_1_1 only if the
    // route happens to; either way, the flag must reflect the *destination*.
    walkTo('p_0_1');
    expect(store.getState().characterNode).toBe('p_0_1');
    expect(store.getState().flags.gate).toBe(false);
  });
});

describe('every shipped level can actually be played to the end', () => {
  // The solvability checker proves a route exists in the abstract. This proves
  // the *store* can be driven along one: rotations settle, moves are accepted,
  // switches fire on arrival, platforms can be boarded, and the level reports
  // itself complete. A greedy explorer stands in for the player.
  for (const { id } of ALL_LEVELS) {
    it(`${id} can be driven to completion through the store`, () => {
      const level = load(id);
      play(level);

      expect(store.getState().status).toBe('complete');
    });
  }
});
