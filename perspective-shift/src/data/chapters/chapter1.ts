/**
 * Chapter 1 — Floating Gardens.
 *
 * Teaches one idea only: the world turns, and turning it makes paths real.
 * No switches, no moving platforms, no pitch. Difficulty comes from how many
 * alignments a route needs and how far apart they sit, not from new verbs.
 */

import { LevelBuilder } from '@/data/modules/kit';
import type { Level } from '@/types';

/** A single alignment, telegraphed as plainly as possible. */
function firstLight(): Level {
  const b = new LevelBuilder('ch1-1', 1, 1, 'First Light');
  const near = b.walkway('a', [0, 0, 0], 'x+', 4);
  const far = b.walkway('c', [8, 0, 0], 'x+', 4, { tone: 'raised' });

  b.pillar([0, -1, 0], 3).pillar([3, -1, 0], 3);
  b.pillar([8, -1, 0], 3).pillar([11, -1, 0], 3);
  b.crystals([
    [4.5, 1.9, 0.4],
    [6.5, 2.4, -0.5],
  ]);

  b.alignedLink(near[3], far[0], 90);
  b.start(near[0]).exit(far[3]);
  b.hint('Drag anywhere to turn the world. Watch the gap.');
  return b.build();
}

/** Two alignments in opposite directions, so turning back is the lesson. */
function twoTurns(): Level {
  const b = new LevelBuilder('ch1-2', 1, 2, 'Two Turns');
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  const middle = b.walkway('m', [0, 1, 6], 'x+', 3, { tone: 'raised' });
  const end = b.walkway('z', [7, 2, 3], 'x+', 3, { tone: 'accent' });

  b.pillar([1, -1, 0], 3);
  b.pillar([1, 0, 6], 4);
  b.pillar([8, 1, 3], 5);
  b.crystals([
    [3, 2.6, 3],
    [5.5, 3.4, 1.5],
  ]);

  b.alignedLink(start[2], middle[0], 270);
  b.alignedLink(middle[2], end[0], 180);
  b.start(start[0]).exit(end[2]);
  b.hint('Two gaps, two different angles.');
  return b.build();
}

/** Height enters the picture: the alignment is only visible from above. */
function theAscent(): Level {
  const b = new LevelBuilder('ch1-3', 1, 3, 'The Ascent');
  const base = b.walkway('a', [0, 0, 0], 'x+', 3);
  const stairs = b.staircase('s', [3, 0, 0], 'x+', 5, { tone: 'raised' });
  b.pad('t', [8, 4, -1], 2, 3, { tone: 'accent' });
  const summit = b.walkway('z', [8, 5, 5], 'x+', 3, { tone: 'raised' });

  b.pillar([0, -1, 0], 4);
  b.arch([4, 3.2, 3], 'x+', 4);
  b.crystals([
    [6, 5.5, 2],
    [9, 6.8, 2.5],
  ]);

  b.link(base[2], stairs[0]);
  b.link(stairs[4], 't_0_0');
  b.alignedLink('t_1_2', summit[0], 135);
  b.start(base[0]).exit(summit[2]);
  b.hint('Climb first. The last gap only closes from one side.');
  return b.build();
}

/** Four arms around a hub; only two of the six possible joins exist. */
function theCrossing(): Level {
  const b = new LevelBuilder('ch1-4', 1, 4, 'The Crossing');
  const hub = b.pad('h', [-1, 0, -1], 3, 3);
  const east = b.walkway('e', [2, 0, 0], 'x+', 3, { tone: 'raised' });
  const north = b.walkway('n', [0, 0, -2], 'z-', 3, { tone: 'raised' });
  b.pad('i', [7, 1, -6], 2, 2, { tone: 'accent' });
  const west = b.walkway('w', [-3, 1, 0], 'x-', 4, { tone: 'raised' });

  b.pillar([0, -1, 0], 5);
  b.pillar([3, -1, 0], 3);
  b.pillar([0, -1, -3], 3);
  b.pillar([7, 0, -6], 4);
  b.crystals([
    [4, 2.4, -3],
    [-2, 2.8, -2],
    [6, 3.2, -1],
  ]);

  b.link(hub[5], east[0]);
  b.link(hub[1], north[0]);
  b.alignedLink(north[2], 'i_0_0', 45);
  b.alignedLink('i_1_1', west[0], 225);
  b.start('h_1_1').exit(west[3]);
  b.hint('Not every arm connects. Find the two that do.');
  return b.build();
}

/** The visually obvious route is a dead end; the real one needs three turns. */
function theLongWay(): Level {
  const b = new LevelBuilder('ch1-5', 1, 5, 'The Long Way');
  const start = b.walkway('a', [0, 0, 0], 'z+', 3);
  const decoy = b.walkway('d', [0, 0, 4], 'z+', 3, { tone: 'shadow' });
  const ledge = b.walkway('l', [5, 1, 1], 'z+', 3, { tone: 'raised' });
  b.pad('u', [8, 3, 5], 2, 2, { tone: 'accent' });
  const finish = b.walkway('z', [3, 4, 9], 'x+', 3, { tone: 'raised' });

  b.pillar([0, -1, 1], 3);
  b.pillar([5, 0, 2], 4);
  b.pillar([8, 2, 5], 6);
  b.pillar([4, 3, 9], 7);
  b.arch([1, 1.4, 6], 'z+', 3, 'shadow');
  b.crystals([
    [2.5, 2.2, 2],
    [7, 4.4, 3],
    [5.5, 5.6, 7],
  ]);

  // The decoy run is reachable and goes nowhere, which is the whole point.
  b.alignedLink(start[2], decoy[0], 0);
  b.alignedLink(start[2], ledge[0], 90);
  b.alignedLink(ledge[2], 'u_0_0', 300);
  b.alignedLink('u_1_1', finish[0], 150);
  b.start(start[0]).exit(finish[2]);
  b.hint('One of these bridges is a trap. The others climb.');
  return b.build();
}

/** Chapter finale: a spiral of four alignments around a central tower. */
function gardensEnd(): Level {
  const b = new LevelBuilder('ch1-6', 1, 6, "Garden's End");
  const ground = b.pad('g', [-1, 0, -1], 3, 3);
  const first = b.walkway('p', [3, 1, -1], 'x+', 3, { tone: 'raised' });
  const second = b.walkway('q', [6, 2, 3], 'z+', 3, { tone: 'raised' });
  const third = b.walkway('r', [2, 3, 7], 'x-', 3, { tone: 'accent' });
  const fourth = b.walkway('s', [-3, 4, 3], 'z-', 3, { tone: 'raised' });
  b.pad('c', [-1, 5, -2], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 4);
  for (let y = 0; y < 6; y += 1) b.decor({ shape: 'pillar', pos: [0, y, 3], tone: 'shadow' });
  b.arch([3, 2.6, 5], 'x-', 4);
  b.crystals([
    [4.5, 3.2, 1],
    [4, 4.4, 5.5],
    [-1.5, 5.4, 5],
    [1.5, 6.6, -1],
  ]);

  b.alignedLink(ground[8], first[0], 90);
  b.alignedLink(first[2], second[0], 180);
  b.alignedLink(second[2], third[0], 270);
  b.alignedLink(third[2], fourth[0], 0);
  b.alignedLink(fourth[2], 'c_0_0', 90);
  b.start('g_0_0').exit('c_1_1');
  b.hint('Keep turning the same way. The path spirals.');
  return b.build();
}

export const CHAPTER_1_LEVELS: readonly Level[] = [
  firstLight(),
  twoTurns(),
  theAscent(),
  theCrossing(),
  theLongWay(),
  gardensEnd(),
];
