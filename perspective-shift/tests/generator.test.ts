/**
 * The daily puzzle must never hand out something unfinishable, and must be
 * identical for every player on a given date. Both properties are cheap to
 * check exhaustively over a year, so this suite does exactly that.
 */

import { describe, expect, it } from 'vitest';

import { dailyPuzzle, GENERATED_ANGLES_ARE_SNAPPABLE } from '@/systems/generator';
import { validateLevel } from '@/systems/levelLoader';
import { solve } from '@/systems/solvability';
import { localIsoDate } from '@/store/useProgressStore';

function datesAcross(days: number): string[] {
  const start = new Date('2026-01-01T00:00:00');
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return localIsoDate(date);
  });
}

describe('daily puzzle generator', () => {
  it('only uses angles the player can snap to', () => {
    expect(GENERATED_ANGLES_ARE_SNAPPABLE).toBe(true);
  });

  it('is deterministic for a date', () => {
    const a = dailyPuzzle('2026-03-14');
    const b = dailyPuzzle('2026-03-14');
    expect(a.level).toEqual(b.level);
    expect(a.parRotations).toBe(b.parRotations);
  });

  it('produces different puzzles on different dates', () => {
    const ids = new Set(datesAcross(30).map((date) => JSON.stringify(dailyPuzzle(date).level)));
    // Allowing a little collision tolerance would hide a seeding bug, so this
    // asserts every one of thirty consecutive days differs.
    expect(ids.size).toBe(30);
  });

  it('generates a valid, solvable, non-trivial puzzle for a full year', () => {
    const failures: string[] = [];

    for (const date of datesAcross(365)) {
      let puzzle;
      try {
        puzzle = dailyPuzzle(date);
      } catch (error) {
        failures.push(`${date}: ${(error as Error).message}`);
        continue;
      }

      const issues = validateLevel(puzzle.level);
      if (issues.length > 0) {
        failures.push(`${date}: ${issues.map((issue) => issue.message).join('; ')}`);
        continue;
      }

      const result = solve(puzzle.level);
      if (result.truncated) failures.push(`${date}: solver truncated`);
      else if (!result.solvable) failures.push(`${date}: unsolvable`);
      else if ((result.minRotations ?? 0) < 3) {
        failures.push(`${date}: trivial (${result.minRotations} rotations)`);
      } else if (result.minRotations !== puzzle.parRotations) {
        failures.push(
          `${date}: par ${puzzle.parRotations} disagrees with solver ${result.minRotations}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('records its par on the level so star thresholds match the solver', () => {
    const puzzle = dailyPuzzle('2026-07-04');
    expect(puzzle.level.parRotations).toBe(puzzle.parRotations);
  });
});
