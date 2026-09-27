import { create } from "zustand";

/**
 * Global "intro loader finished" flag. The loader flips `ready` as it begins
 * its exit, which un-gates the staggered hero/header entrance reveals
 * (`Appear`). Mirrors the Zustand pattern in `use-scroll.ts`.
 */
export interface LoaderState {
  /** Flips as the loader begins its exit — un-gates the page warm-up/uncover. */
  ready: boolean;
  setReady: (ready: boolean) => void;
  /** Flips when the loader has FULLY lifted (its exit settled). Gate post-loader
   *  entrances (e.g. the header) on this so their fade plays on the revealed
   *  page, not behind the still-opaque overlay. */
  revealed: boolean;
  setRevealed: (revealed: boolean) => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
  revealed: false,
  setRevealed: (revealed) => set({ revealed }),
}));
