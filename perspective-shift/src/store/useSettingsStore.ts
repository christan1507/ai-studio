/**
 * Persisted player settings.
 *
 * `reducedMotion` is seeded from the OS preference on first run rather than
 * defaulting to off — a floating, drifting, bloom-heavy scene is exactly what
 * someone setting that preference is asking not to receive.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsStore {
  hintsEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number;
  reducedMotion: boolean;
  /** Milliseconds of being stuck before a hint offers itself. */
  hintDelayMs: number;

  setHintsEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setReducedMotion: (reduced: boolean) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      hintsEnabled: true,
      musicEnabled: true,
      sfxEnabled: true,
      masterVolume: 0.7,
      reducedMotion: prefersReducedMotion(),
      hintDelayMs: 120_000,

      setHintsEnabled: (hintsEnabled) => set({ hintsEnabled }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
      setMasterVolume: (masterVolume) =>
        set({ masterVolume: Math.max(0, Math.min(1, masterVolume)) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: 'perspective-shift:settings',
      version: 1,
    },
  ),
);
