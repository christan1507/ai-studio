/**
 * Screen navigation and transient UI flags.
 *
 * Separate from game and progress state so that navigating never risks
 * touching a save file, and so a screen transition cannot be confused with a
 * gameplay event.
 */

import { create } from 'zustand';

export type Screen = 'menu' | 'chapters' | 'levels' | 'play' | 'collection' | 'settings';

export interface UiStore {
  screen: Screen;
  /** Chapter whose level list is being browsed. */
  chapter: number;
  /** Photo mode hides the HUD so the scene can be captured clean. */
  photoMode: boolean;
  /** Whether the level being played is today's generated puzzle. */
  playingDaily: boolean;
  /** Transient message shown in the HUD, e.g. a refused move. */
  notice: string | null;

  go: (screen: Screen) => void;
  openChapter: (chapter: number) => void;
  setPhotoMode: (enabled: boolean) => void;
  setPlayingDaily: (daily: boolean) => void;
  setNotice: (notice: string | null) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  screen: 'menu',
  chapter: 1,
  photoMode: false,
  playingDaily: false,
  notice: null,

  go: (screen) => set({ screen, photoMode: false, notice: null }),
  openChapter: (chapter) => set({ chapter, screen: 'levels', notice: null }),
  setPhotoMode: (photoMode) => set({ photoMode }),
  setPlayingDaily: (playingDaily) => set({ playingDaily }),
  setNotice: (notice) => set({ notice }),
}));
