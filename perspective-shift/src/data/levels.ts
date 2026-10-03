/**
 * The level registry.
 *
 * Chapters are plain arrays, so adding content means adding one import and one
 * entry. Every level is validated on module load: a structurally broken level
 * should fail loudly at startup rather than stranding a player halfway through
 * a chapter.
 */

import { CHAPTER_1_LEVELS } from '@/data/chapters/chapter1';
import { CHAPTER_2_LEVELS } from '@/data/chapters/chapter2';
import { CHAPTER_3_LEVELS } from '@/data/chapters/chapter3';
import { CHAPTER_4_LEVELS } from '@/data/chapters/chapter4';
import { CHAPTER_5_LEVELS } from '@/data/chapters/chapter5';
import { CHAPTERS } from '@/data/palettes';
import { validateLevel } from '@/systems/levelLoader';
import type { Level } from '@/types';

export const LEVELS_BY_CHAPTER: readonly (readonly Level[])[] = [
  CHAPTER_1_LEVELS,
  CHAPTER_2_LEVELS,
  CHAPTER_3_LEVELS,
  CHAPTER_4_LEVELS,
  CHAPTER_5_LEVELS,
];

export const ALL_LEVELS: readonly Level[] = LEVELS_BY_CHAPTER.flat();

const BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]));

/**
 * Validate the shipped content once, at import time. Authoring mistakes are
 * caught by `tests/levels.test.ts` too, but a developer running the app with
 * an uncommitted broken level deserves a clear error, not a silent dead end.
 */
const CONTENT_ISSUES = ALL_LEVELS.flatMap((level) => validateLevel(level));
if (CONTENT_ISSUES.length > 0 && import.meta.env.DEV) {
  console.error(
    `Perspective Shift: ${CONTENT_ISSUES.length} level validation issue(s):\n` +
      CONTENT_ISSUES.map((issue) => `  [${issue.level}] ${issue.message}`).join('\n'),
  );
}

export function levelById(id: string): Level | undefined {
  return BY_ID.get(id);
}

export function levelsInChapter(chapter: number): readonly Level[] {
  return LEVELS_BY_CHAPTER[chapter - 1] ?? [];
}

export function levelIdsInChapter(chapter: number): string[] {
  return levelsInChapter(chapter).map((level) => level.id);
}

/** The level after `id` in chapter order, or null at the end of the game. */
export function nextLevel(id: string): Level | null {
  const index = ALL_LEVELS.findIndex((level) => level.id === id);
  if (index === -1 || index + 1 >= ALL_LEVELS.length) return null;
  return ALL_LEVELS[index + 1];
}

/**
 * Chapter gating. The first chapter is always open; later ones need most of
 * the previous chapter finished — most, not all, so that one level a player
 * finds hard never walls off the rest of the game.
 */
export const LEVELS_REQUIRED_TO_ADVANCE = 4;

export function isChapterUnlocked(
  chapter: number,
  completedLevelIds: ReadonlySet<string>,
): boolean {
  if (chapter <= 1) return true;
  const previous = levelIdsInChapter(chapter - 1);
  if (previous.length === 0) return false;
  const done = previous.filter((id) => completedLevelIds.has(id)).length;
  return done >= Math.min(LEVELS_REQUIRED_TO_ADVANCE, previous.length);
}

export function isChapterComplete(
  chapter: number,
  completedLevelIds: ReadonlySet<string>,
): boolean {
  const ids = levelIdsInChapter(chapter);
  return ids.length > 0 && ids.every((id) => completedLevelIds.has(id));
}

export const CHAPTER_COUNT = CHAPTERS.length;
