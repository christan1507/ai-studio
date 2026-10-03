/**
 * Daily puzzle generator.
 *
 * Produces one level per calendar date, identical for everyone on that date
 * and — critically — *verified solvable before it is handed out*. Generation
 * is cheap and the solver is exact, so a candidate that fails any check is
 * simply discarded and the next sub-seed tried. A daily puzzle that cannot be
 * finished would be worse than having no daily puzzle at all.
 *
 * Segments are laid out along a golden-angle spiral rather than at random
 * positions. That guarantees they never overlap (no two segments share space,
 * so no accidental hidden shortcuts) and it happens to look like a floating
 * staircase, which suits the art direction.
 */

import { LevelBuilder, type Direction } from '@/data/modules/kit';
import { validateLevel } from '@/systems/levelLoader';
import { solve } from '@/systems/solvability';
import { SNAP_DEGREES, type Level, type Vec3 } from '@/types';

/** Deterministic PRNG. Same seed, same puzzle, on every device. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of the date string, so dates do not collide. */
function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const DIRECTIONS: readonly Direction[] = ['x+', 'x-', 'z+', 'z-'];

/** Angles a generated bridge may require. Coarse, so puzzles read clearly. */
const BRIDGE_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export interface DailyPuzzle {
  readonly level: Level;
  readonly isoDate: string;
  /** Fewest rotations needed — the par the streak scores against. */
  readonly parRotations: number;
}

/** Minimum rotations a daily puzzle must demand, so none is trivial. */
const MIN_ROTATIONS = 3;
const MAX_ATTEMPTS = 60;

function buildCandidate(isoDate: string, attempt: number): Level | null {
  const random = mulberry32(hashString(isoDate) + attempt * 7919);
  const segmentCount = 4 + Math.floor(random() * 3);

  // Daily puzzles borrow a chapter palette so they still feel authored; the
  // date picks which, so consecutive days look different.
  const chapter = 1 + (hashString(isoDate) % 5);
  const b = new LevelBuilder(`daily-${isoDate}`, chapter, 1, 'Daily Shift');

  const ends: string[] = [];
  const starts: string[] = [];
  const centres: Vec3[] = [];

  for (let i = 0; i < segmentCount; i += 1) {
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 5 + i * 0.9;
    const centre: Vec3 = [
      Math.round(Math.cos(angle) * radius),
      Math.round(i * 1.7),
      Math.round(Math.sin(angle) * radius),
    ];
    const direction = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
    const length = 2 + Math.floor(random() * 3);

    const ids = b.walkway(`s${i}_`, centre, direction, length, {
      tone: i === segmentCount - 1 ? 'glow' : i % 2 === 0 ? 'base' : 'raised',
    });
    starts.push(ids[0]);
    ends.push(ids[ids.length - 1]);
    centres.push(centre);

    b.pillar([centre[0], centre[1] - 1, centre[2]], 2 + Math.floor(random() * 3));
  }

  // One bridge per joint, each at a different angle from the last so that
  // every joint genuinely costs a rotation.
  let previousAngle = -1;
  for (let i = 0; i + 1 < segmentCount; i += 1) {
    let angle = previousAngle;
    for (let tries = 0; tries < 12 && angle === previousAngle; tries += 1) {
      angle = BRIDGE_ANGLES[Math.floor(random() * BRIDGE_ANGLES.length)];
    }
    if (angle === previousAngle) return null;
    previousAngle = angle;
    b.alignedLink(ends[i], starts[i + 1], angle);
  }

  for (let i = 0; i < centres.length; i += 1) {
    const centre = centres[i];
    b.crystals([[centre[0] + 0.5, centre[1] + 1.8, centre[2] - 0.5]]);
  }

  b.start(starts[0]).exit(ends[segmentCount - 1]);
  b.hint('Every joint needs its own angle.');
  return b.build();
}

/**
 * The puzzle for a given date. Throws only if no candidate passes in
 * {@link MAX_ATTEMPTS} tries, which would be a generator bug rather than bad
 * luck — the caller should not paper over it.
 */
export function dailyPuzzle(isoDate: string): DailyPuzzle {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = buildCandidate(isoDate, attempt);
    if (!candidate) continue;
    if (validateLevel(candidate).length > 0) continue;

    const result = solve(candidate);
    if (result.truncated || !result.solvable || result.minRotations === null) continue;
    // Reject the trivial, or the daily stops being worth a streak.
    if (result.minRotations < MIN_ROTATIONS) continue;

    return {
      level: { ...candidate, parRotations: result.minRotations },
      isoDate,
      parRotations: result.minRotations,
    };
  }
  throw new Error(`Could not generate a solvable daily puzzle for ${isoDate}`);
}

/** Sanity bound used by tests: generated angles must be snappable. */
export const GENERATED_ANGLES_ARE_SNAPPABLE = BRIDGE_ANGLES.every(
  (angle) => angle % SNAP_DEGREES === 0,
);
