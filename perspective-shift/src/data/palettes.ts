/**
 * Chapter identity: colour, atmosphere and musical key.
 *
 * Each chapter owns a palette and a scale, so adding a chapter means adding
 * one entry here rather than touching rendering or audio code.
 *
 * The palettes are built around **value separation**, which matters more than
 * hue for this art direction. An orthographic, flat-shaded scene has no
 * perspective cues at all, so the only thing telling a top face from a side
 * face is how light each one is. Keeping tones close together — the obvious
 * reading of "soft pastel" — collapses the whole monument into one flat
 * silhouette and the illusion stops reading. So each palette runs a deliberate
 * ladder:
 *
 *   shadow (darkest) → base → raised → glow (lightest)
 *
 * and `sky` sits clearly off that ladder so structures separate from the
 * background. `accent` is the one saturated hue, used sparingly for the
 * surfaces the player is meant to notice.
 */

import type { Chapter } from '@/types';

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 1,
    name: 'Floating Gardens',
    subtitle: 'Where the paths first learn to lie',
    palette: {
      base: '#d98f98',
      raised: '#f0b8b4',
      accent: '#f2865f',
      shadow: '#6e4450',
      glow: '#fff4e6',
      fog: '#edc8c0',
      sky: '#f7e2db',
      gradient: ['#fbeae5', '#dfaaa8'],
    },
    scale: [0, 2, 4, 7, 9],
    root: 'C3',
  },
  {
    id: 2,
    name: 'Crystal Caves',
    subtitle: 'Still water remembers every angle',
    palette: {
      base: '#3f8f88',
      raised: '#6fc3b7',
      accent: '#9ef0e0',
      shadow: '#17474b',
      glow: '#ccfff4',
      fog: '#123036',
      sky: '#0d2227',
      gradient: ['#1c3f44', '#0a1d21'],
    },
    scale: [0, 3, 5, 7, 10],
    root: 'A2',
  },
  {
    id: 3,
    name: 'Sky Temples',
    subtitle: 'Climb long enough and up becomes a choice',
    palette: {
      base: '#9183c9',
      raised: '#c3b8e8',
      accent: '#ffd9a8',
      shadow: '#4e4480',
      glow: '#f9f4ff',
      fog: '#d2c8ee',
      sky: '#ece6fa',
      gradient: ['#f0ebff', '#c2b7e4'],
    },
    scale: [0, 2, 4, 6, 7, 9, 11],
    root: 'D3',
  },
  {
    id: 4,
    name: 'Ember Reliquary',
    subtitle: 'What the lamplight joins, the dark undoes',
    palette: {
      base: '#c8873f',
      raised: '#eec186',
      accent: '#ffdf9e',
      shadow: '#6d4320',
      glow: '#fff1cf',
      fog: '#d79d5b',
      sky: '#f3d9ae',
      gradient: ['#fbe9cb', '#d2954e'],
    },
    scale: [0, 2, 4, 5, 7, 9, 10],
    root: 'F2',
  },
  {
    id: 5,
    name: 'The Inversion',
    subtitle: 'Every rule you learned, at once',
    palette: {
      base: '#414c83',
      raised: '#6f7cb8',
      accent: '#f0cf8a',
      shadow: '#1b2042',
      glow: '#ffe9b4',
      fog: '#1d2447',
      sky: '#12152c',
      gradient: ['#212950', '#0d1024'],
    },
    scale: [0, 2, 3, 5, 7, 8, 10],
    root: 'E2',
  },
];

export function chapterById(id: number): Chapter {
  const chapter = CHAPTERS.find((entry) => entry.id === id);
  if (!chapter) throw new Error(`Unknown chapter ${id}`);
  return chapter;
}

/** Palette used by the level-select and daily-puzzle screens. */
export const NEUTRAL_PALETTE = CHAPTERS[2].palette;
