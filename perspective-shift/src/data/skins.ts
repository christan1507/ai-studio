/**
 * Cosmetic unlocks.
 *
 * Purely visual — a skin never changes movement, reach or difficulty, so
 * collecting them can stay a reward rather than a power curve.
 */

export interface Skin {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly emissive: string;
  /** Chapter that must be completed to unlock, or null for the starting skin. */
  readonly unlockChapter: number | null;
  readonly description: string;
}

export interface TrailStyle {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  /** Number of trailing samples. */
  readonly length: number;
  readonly unlockChapter: number | null;
}

export const SKINS: readonly Skin[] = [
  {
    id: 'orb-pearl',
    name: 'Pearl',
    color: '#fdfbf7',
    emissive: '#fff4e2',
    unlockChapter: null,
    description: 'The first light.',
  },
  {
    id: 'orb-rose',
    name: 'Rosewake',
    color: '#ffd9d2',
    emissive: '#ff9f8a',
    unlockChapter: 1,
    description: 'Carried out of the gardens.',
  },
  {
    id: 'orb-tide',
    name: 'Tidewalker',
    color: '#c8f5ea',
    emissive: '#4fd8bd',
    unlockChapter: 2,
    description: 'Lit by water that never moves.',
  },
  {
    id: 'orb-vesper',
    name: 'Vesper',
    color: '#e4dcff',
    emissive: '#9f86ff',
    unlockChapter: 3,
    description: 'Kept by the temple at altitude.',
  },
  {
    id: 'orb-ember',
    name: 'Ember',
    color: '#ffe0b2',
    emissive: '#ff9b3d',
    unlockChapter: 4,
    description: 'Taken from the reliquary lamp.',
  },
  {
    id: 'orb-inverse',
    name: 'Inverse',
    color: '#1d2142',
    emissive: '#f4d27a',
    unlockChapter: 5,
    description: 'Dark where it should shine.',
  },
];

export const TRAILS: readonly TrailStyle[] = [
  { id: 'trail-dust', name: 'Dust', color: '#fff3e6', length: 10, unlockChapter: null },
  { id: 'trail-comet', name: 'Comet', color: '#ffd0a8', length: 16, unlockChapter: 2 },
  { id: 'trail-aurora', name: 'Aurora', color: '#b9f2e4', length: 20, unlockChapter: 4 },
];

export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}

export function trailById(id: string): TrailStyle {
  return TRAILS.find((trail) => trail.id === id) ?? TRAILS[0];
}

/** Everything unlocked by finishing a given chapter. */
export function unlocksForChapter(chapter: number): string[] {
  return [
    ...SKINS.filter((skin) => skin.unlockChapter === chapter).map((skin) => skin.id),
    ...TRAILS.filter((trail) => trail.unlockChapter === chapter).map((trail) => trail.id),
  ];
}
