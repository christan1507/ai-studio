/**
 * Persisted player progress: stars, unlocks and the daily streak.
 *
 * Kept separate from game state so that wiping a level in progress can never
 * disturb saved progress, and so the persisted shape stays small and stable.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LevelRecord {
  readonly stars: number;
  /** Fewest rotations the player has finished this level in. */
  readonly bestRotations: number;
}

export interface DailyRecord {
  /** ISO date (YYYY-MM-DD) of the most recently completed daily puzzle. */
  readonly lastCompleted: string | null;
  readonly streak: number;
  readonly bestStreak: number;
  readonly totalCompleted: number;
}

export interface ProgressStore {
  levels: Record<string, LevelRecord>;
  unlockedSkins: string[];
  selectedSkin: string;
  selectedTrail: string;
  daily: DailyRecord;

  recordCompletion: (levelId: string, stars: number, rotations: number) => void;
  recordDailyCompletion: (isoDate: string) => void;
  unlockSkin: (id: string) => void;
  selectSkin: (id: string) => void;
  selectTrail: (id: string) => void;
  starsInChapter: (chapter: number, levelIds: readonly string[]) => number;
  resetProgress: () => void;
}

/** Local calendar date as YYYY-MM-DD. Deliberately not UTC: a daily puzzle
 *  should roll over at the player's midnight, not somewhere else's. */
export function localIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whether `previous` is the calendar day immediately before `current`. */
export function isConsecutiveDay(previous: string, current: string): boolean {
  const prev = new Date(`${previous}T00:00:00`);
  const curr = new Date(`${current}T00:00:00`);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((curr.getTime() - prev.getTime()) / dayMs) === 1;
}

const INITIAL_DAILY: DailyRecord = {
  lastCompleted: null,
  streak: 0,
  bestStreak: 0,
  totalCompleted: 0,
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      levels: {},
      unlockedSkins: ['orb-pearl'],
      selectedSkin: 'orb-pearl',
      selectedTrail: 'trail-dust',
      daily: INITIAL_DAILY,

      recordCompletion: (levelId, stars, rotations) => {
        set((state) => {
          const existing = state.levels[levelId];
          // Only ever improve a record — replaying a level badly must not
          // erase a three-star run.
          const next: LevelRecord = {
            stars: Math.max(stars, existing?.stars ?? 0),
            bestRotations: Math.min(rotations, existing?.bestRotations ?? Infinity),
          };
          return { levels: { ...state.levels, [levelId]: next } };
        });
      },

      recordDailyCompletion: (isoDate) => {
        set((state) => {
          const { lastCompleted, streak, bestStreak, totalCompleted } = state.daily;
          if (lastCompleted === isoDate) return state;

          const nextStreak =
            lastCompleted !== null && isConsecutiveDay(lastCompleted, isoDate) ? streak + 1 : 1;

          return {
            daily: {
              lastCompleted: isoDate,
              streak: nextStreak,
              bestStreak: Math.max(bestStreak, nextStreak),
              totalCompleted: totalCompleted + 1,
            },
          };
        });
      },

      unlockSkin: (id) => {
        set((state) =>
          state.unlockedSkins.includes(id)
            ? state
            : { unlockedSkins: [...state.unlockedSkins, id] },
        );
      },

      selectSkin: (id) => {
        if (get().unlockedSkins.includes(id)) set({ selectedSkin: id });
      },

      selectTrail: (id) => set({ selectedTrail: id }),

      starsInChapter: (_chapter, levelIds) => {
        const { levels } = get();
        return levelIds.reduce((total, id) => total + (levels[id]?.stars ?? 0), 0);
      },

      resetProgress: () =>
        set({
          levels: {},
          unlockedSkins: ['orb-pearl'],
          selectedSkin: 'orb-pearl',
          selectedTrail: 'trail-dust',
          daily: INITIAL_DAILY,
        }),
    }),
    {
      name: 'perspective-shift:progress',
      version: 1,
    },
  ),
);
