/**
 * Discrete per-level game state.
 *
 * Deliberately does *not* hold rotation angles or platform phases — those live
 * in {@link WorldRuntime} and are mutated per frame without re-rendering. What
 * lives here changes only on real events: the character arriving somewhere, a
 * switch flipping, a rotation settling, the level being solved.
 */

import { create } from 'zustand';

import { findPath } from '@/systems/pathfinding';
import { WorldRuntime } from '@/systems/runtime';
import { solve, starsForRotations, starThresholds } from '@/systems/solvability';
import type { Level } from '@/types';

export type LevelStatus = 'idle' | 'playing' | 'walking' | 'complete';

export interface GameStore {
  level: Level | null;
  runtime: WorldRuntime | null;
  status: LevelStatus;
  /** Node the character currently stands on. */
  characterNode: string;
  /** Remaining route, including the node currently being left. */
  path: string[];
  pathIndex: number;
  flags: Record<string, boolean>;
  rotationCount: number;
  /** Fewest rotations possible, computed once on load. */
  optimalRotations: number | null;
  starsEarned: number;
  hintVisible: boolean;
  /** Epoch ms when the level was loaded, for the idle-hint timer. */
  startedAt: number;
  /** Snap indices the last counted rotation came to rest at. */
  countedYawIndex: number;
  countedPitchIndex: number;

  loadLevel: (level: Level) => void;
  unload: () => void;
  /** Attempt to walk to a node. Returns false if it is not currently reachable. */
  requestMove: (target: string) => boolean;
  /** Called by the character animation as it reaches each node on its route. */
  advancePath: () => void;
  operateSwitchAt: (node: string) => boolean;
  /**
   * Report the current rotation each frame. Counts a rotation when the
   * structure comes to rest at a snap position it was not already at, and
   * returns true on the frame that happens so the caller can react (a chime,
   * say) without duplicating the bookkeeping.
   */
  syncRotation: (yawIndex: number, pitchIndex: number, settled: boolean) => boolean;
  setHintVisible: (visible: boolean) => void;
  restart: () => void;
}

const EMPTY: Pick<
  GameStore,
  | 'level'
  | 'runtime'
  | 'status'
  | 'characterNode'
  | 'path'
  | 'pathIndex'
  | 'flags'
  | 'rotationCount'
  | 'optimalRotations'
  | 'starsEarned'
  | 'hintVisible'
  | 'startedAt'
  | 'countedYawIndex'
  | 'countedPitchIndex'
> = {
  level: null,
  runtime: null,
  status: 'idle',
  characterNode: '',
  path: [],
  pathIndex: 0,
  flags: {},
  rotationCount: 0,
  optimalRotations: null,
  starsEarned: 0,
  hintVisible: false,
  startedAt: 0,
  countedYawIndex: 0,
  countedPitchIndex: 0,
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...EMPTY,

  loadLevel: (level) => {
    const flags: Record<string, boolean> = {};
    for (const sw of level.switches ?? []) flags[sw.flag] = sw.initial === true;

    // The runtime reads flags through a getter so the store stays the single
    // source of truth for them.
    const runtime = new WorldRuntime(level, () => get().flags);

    // Par is computed rather than authored, so a level edit can never leave a
    // stale star threshold behind. `parRotations` overrides it when present.
    const result = solve(level);
    const optimal = level.parRotations ?? result.minRotations;

    set({
      ...EMPTY,
      level,
      runtime,
      flags,
      status: 'playing',
      characterNode: level.start,
      optimalRotations: optimal,
      startedAt: Date.now(),
    });
  },

  unload: () => set({ ...EMPTY }),

  requestMove: (target) => {
    const { level, runtime, status, characterNode } = get();
    if (!level || !runtime) return false;
    // Rotation is locked during a walk, so a route can never be invalidated
    // underneath the character mid-step.
    if (status !== 'playing') return false;
    if (!runtime.settled) return false;
    if (target === characterNode) return false;

    const route = findPath(level, runtime.worldState(), characterNode, target);
    if (!route || route.length < 2) return false;

    set({ path: route, pathIndex: 0, status: 'walking', hintVisible: false });
    return true;
  },

  advancePath: () => {
    const { path, pathIndex, level, rotationCount, optimalRotations, flags } = get();
    const nextIndex = pathIndex + 1;
    const arrived = path[nextIndex];
    if (arrived === undefined) {
      set({ status: 'playing', path: [], pathIndex: 0 });
      return;
    }

    const finished = nextIndex >= path.length - 1;
    if (!finished) {
      set({ characterNode: arrived, pathIndex: nextIndex });
      return;
    }

    const reachedExit = level !== null && arrived === level.exit;
    const stars = reachedExit
      ? starsForRotations(rotationCount, starThresholds(optimalRotations ?? rotationCount))
      : 0;

    // Switches fire on *final* arrival only, never while passing through.
    // Flipping a plate the character merely walked over on the way somewhere
    // else would make routes unpredictable and undo the meditative feel.
    const nextFlags = { ...flags };
    for (const sw of level?.switches ?? []) {
      if (sw.node !== arrived) continue;
      const currentlyOn = nextFlags[sw.flag] === true;
      if (sw.mode === 'once' && currentlyOn) continue;
      nextFlags[sw.flag] = !currentlyOn;
    }

    set({
      characterNode: arrived,
      pathIndex: nextIndex,
      path: [],
      status: reachedExit ? 'complete' : 'playing',
      starsEarned: stars,
      flags: nextFlags,
    });
  },

  operateSwitchAt: (node) => {
    const { level, flags, status } = get();
    if (!level || status !== 'playing') return false;

    const here = (level.switches ?? []).filter((sw) => sw.node === node);
    if (here.length === 0) return false;

    const next = { ...flags };
    let changed = false;
    for (const sw of here) {
      const currentlyOn = next[sw.flag] === true;
      if (sw.mode === 'once' && currentlyOn) continue;
      next[sw.flag] = !currentlyOn;
      changed = true;
    }
    if (!changed) return false;

    set({ flags: next });
    return true;
  },

  syncRotation: (yawIndex, pitchIndex, settled) => {
    // Only a *resting* structure counts. Angles swept through mid-gesture are
    // not rotations the player chose, and counting them would make the star
    // rating a measure of how fast you flick.
    if (!settled) return false;
    const { countedYawIndex, countedPitchIndex } = get();
    if (yawIndex === countedYawIndex && pitchIndex === countedPitchIndex) return false;

    set((state) => ({
      rotationCount: state.rotationCount + 1,
      countedYawIndex: yawIndex,
      countedPitchIndex: pitchIndex,
    }));
    return true;
  },

  setHintVisible: (visible) => set({ hintVisible: visible }),

  restart: () => {
    const level = get().level;
    if (level) get().loadLevel(level);
  },
}));
