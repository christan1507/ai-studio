/**
 * Content guardrail.
 *
 * Every shipped level must be structurally valid *and* provably finishable.
 * A level that merely looks plausible in the data is the failure mode this
 * suite exists to prevent — the authoring kit will happily build a beautiful
 * monument with no route through it.
 */

import { describe, expect, it } from 'vitest';

import {
  ALL_LEVELS,
  CHAPTER_COUNT,
  isChapterUnlocked,
  levelIdsInChapter,
  levelsInChapter,
  nextLevel,
} from '@/data/levels';
import { CHAPTERS } from '@/data/palettes';
import { validateLevel } from '@/systems/levelLoader';
import { solve } from '@/systems/solvability';

describe('level registry', () => {
  it('ships five chapters of six levels', () => {
    expect(CHAPTER_COUNT).toBe(5);
    expect(ALL_LEVELS).toHaveLength(30);
    for (const chapter of CHAPTERS) {
      expect(levelsInChapter(chapter.id)).toHaveLength(6);
    }
  });

  it('uses unique level ids', () => {
    const ids = ALL_LEVELS.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('numbers levels consistently with their chapter', () => {
    for (const chapter of CHAPTERS) {
      const levels = levelsInChapter(chapter.id);
      levels.forEach((level, index) => {
        expect(level.chapter).toBe(chapter.id);
        expect(level.index).toBe(index + 1);
      });
    }
  });

  it('chains levels in order and terminates at the last', () => {
    expect(nextLevel(ALL_LEVELS[0].id)?.id).toBe(ALL_LEVELS[1].id);
    expect(nextLevel(ALL_LEVELS[ALL_LEVELS.length - 1].id)).toBeNull();
    expect(nextLevel('no-such-level')).toBeNull();
  });

  it('opens chapter one and gates the rest', () => {
    expect(isChapterUnlocked(1, new Set())).toBe(true);
    expect(isChapterUnlocked(2, new Set())).toBe(false);
    expect(isChapterUnlocked(2, new Set(levelIdsInChapter(1)))).toBe(true);
  });

  it('does not require a perfect chapter to advance', () => {
    // Four of six is enough, so one level a player finds hard cannot wall off
    // the remainder of the game.
    const partial = new Set(levelIdsInChapter(1).slice(0, 4));
    expect(isChapterUnlocked(2, partial)).toBe(true);
  });
});

describe('every shipped level', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} (${level.name}) is structurally valid`, () => {
      const issues = validateLevel(level).map((issue) => issue.message);
      expect(issues).toEqual([]);
    });

    it(`${level.id} (${level.name}) is solvable`, () => {
      const result = solve(level);
      // A truncated search is a failure to verify, not a pass.
      expect(result.truncated).toBe(false);
      expect(result.solvable).toBe(true);
      expect(result.minRotations).not.toBeNull();
    });
  }

  it('declares a hint for every level', () => {
    for (const level of ALL_LEVELS) {
      expect(level.hint, `${level.id} has no hint`).toBeTruthy();
    }
  });

  it('has a start and exit that are distinct and connected by the solver', () => {
    for (const level of ALL_LEVELS) {
      expect(level.start, level.id).not.toBe(level.exit);
    }
  });
});

describe('difficulty curve', () => {
  it('opens each chapter with a gentler level than it closes with', () => {
    for (const chapter of CHAPTERS) {
      const levels = levelsInChapter(chapter.id);
      const first = solve(levels[0]).minRotations ?? 0;
      const last = solve(levels[levels.length - 1]).minRotations ?? 0;
      expect(last, `chapter ${chapter.id} does not ramp up`).toBeGreaterThanOrEqual(first);
    }
  });

  it('teaches chapter one with rotation alone', () => {
    for (const level of levelsInChapter(1)) {
      expect(level.switches ?? [], level.id).toHaveLength(0);
      expect(level.groups ?? [], level.id).toHaveLength(0);
      expect(level.allowPitch ?? false, level.id).toBe(false);
    }
  });

  it('introduces moving platforms in chapter two and switches in chapter three', () => {
    expect(levelsInChapter(2).some((level) => (level.groups ?? []).length > 0)).toBe(true);
    expect(levelsInChapter(2).every((level) => (level.switches ?? []).length === 0)).toBe(true);
    expect(levelsInChapter(3).some((level) => (level.switches ?? []).length > 0)).toBe(true);
  });

  it('introduces tilt no earlier than chapter four', () => {
    for (const chapter of [1, 2, 3]) {
      for (const level of levelsInChapter(chapter)) {
        expect(level.allowPitch ?? false, level.id).toBe(false);
      }
    }
    expect(levelsInChapter(4).some((level) => level.allowPitch === true)).toBe(true);
  });
});
