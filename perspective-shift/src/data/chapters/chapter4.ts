/**
 * Chapter 4 — Ember Reliquary.
 *
 * Adds gravity flips and a second rotation axis. Two new ideas:
 *
 * - **Surfaces other than floors.** Undersides and walls are walkable, which
 *   costs the engine nothing: a node's `up` normal is the only thing that says
 *   which way is down for the character standing on it.
 * - **Tilt.** Levels here set `allowPitch`, so a vertical drag tilts the
 *   structure and some joins require a specific tilt as well as a turn.
 *
 * Pitch requirements stay inside the +/-60deg tilt limit; the validator
 * rejects anything further, since no gesture could reach it.
 */

import { LevelBuilder } from '@/data/modules/kit';
import type { Level } from '@/types';

/** Introduces the underside, with no tilt yet. */
function underside(): Level {
  const b = new LevelBuilder('ch4-1', 4, 1, 'Underside');
  const top = b.walkway('a', [0, 2, 0], 'x+', 4);
  const below = b.underside('u', [4, 2, 0], 'x+', 4, { tone: 'shadow' });
  const finish = b.walkway('z', [8, 0, 0], 'x+', 3, { tone: 'accent' });

  b.pillar([0, 1, 0], 3);
  b.pillar([9, -1, 0], 3);
  b.crystals([
    [3.5, 3.4, 0.5],
    [6, 0.6, -0.6],
  ]);

  b.alignedLink(top[3], below[0], 90);
  b.alignedLink(below[3], finish[0], 270);
  b.start(top[0]).exit(finish[2]);
  b.hint('The ceiling is a floor. Turn to step onto it.');
  return b.build();
}

/** Introduces walls. */
function theWall(): Level {
  const b = new LevelBuilder('ch4-2', 4, 2, 'The Wall');
  const ground = b.walkway('a', [0, 0, 0], 'x+', 3);
  const face = b.wallway('w', [4, 1, 0], 'z+', 4, 'x-', { tone: 'raised' });
  const ledge = b.walkway('z', [4, 5, 4], 'x+', 3, { tone: 'accent' });

  for (let y = 0; y < 6; y += 1) {
    b.decor({ shape: 'pillar', pos: [4, y, -1], tone: 'shadow' });
  }
  b.pillar([0, -1, 0], 3);
  b.crystals([
    [2.5, 1.8, 1],
    [3, 3.4, 3],
  ]);

  b.alignedLink(ground[2], face[0], 90);
  b.alignedLink(face[3], ledge[0], 180);
  b.start(ground[0]).exit(ledge[2]);
  b.hint('Walls count too.');
  return b.build();
}

/** Introduces tilt as a rotation axis in its own right. */
function tilt(): Level {
  const b = new LevelBuilder('ch4-3', 4, 3, 'Tilt');
  b.allowPitch();

  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  b.pad('m', [5, 1, -1], 2, 2, { tone: 'raised' });
  const finish = b.walkway('z', [5, 2, 4], 'x+', 3, { tone: 'accent' });

  b.pillar([0, -1, 0], 3).pillar([5, 0, -1], 4).pillar([6, 1, 4], 5);
  b.crystals([
    [3.5, 2.2, 0],
    [6, 3.6, 2],
  ]);

  b.alignedLink(start[2], 'm_0_0', 90);
  // Needs a turn *and* a tilt, so the vertical drag has to be discovered.
  b.alignedLink('m_1_1', finish[0], 90, { pitch: 30 });
  b.start(start[0]).exit(finish[2]);
  b.hint('Drag up and down as well as side to side.');
  return b.build();
}

/** Two tilts in opposite directions, around an inverted span. */
function twoAxes(): Level {
  const b = new LevelBuilder('ch4-4', 4, 4, 'Two Axes');
  b.allowPitch();

  const start = b.walkway('a', [0, 3, 0], 'x+', 3);
  const roof = b.underside('r', [4, 3, 0], 'z+', 4, { tone: 'shadow' });
  b.pad('s', [4, 0, 5], 2, 2, { tone: 'raised' });
  const finish = b.walkway('z', [0, 1, 8], 'x+', 3, { tone: 'glow' });

  b.pillar([0, 2, 0], 4);
  b.pillar([4, -1, 5], 3);
  b.pillar([1, 0, 8], 4);
  b.arch([1, 4.4, 4], 'x+', 4);
  b.crystals([
    [3.5, 4.2, 2],
    [5, 1.6, 4],
    [2, 2.6, 7],
  ]);

  b.alignedLink(start[2], roof[0], 60, { pitch: 330 });
  b.alignedLink(roof[3], 's_0_0', 240);
  b.alignedLink('s_1_1', finish[2], 150, { pitch: 45 });
  b.start(start[0]).exit(finish[0]);
  b.hint('Each span wants a different tilt.');
  return b.build();
}

/** A staircase climbed on its underside. */
function invertedStair(): Level {
  const b = new LevelBuilder('ch4-5', 4, 5, 'Inverted Stair');
  b.allowPitch();

  const base = b.walkway('a', [0, 0, 0], 'x+', 2);
  const stairs = b.staircase('s', [2, 1, 0], 'x+', 5, { tone: 'raised' });
  // The same flight, walked underneath, reaches a different landing.
  const beneath = b.underside('u', [2, 1, 3], 'x+', 5, { tone: 'shadow' });
  b.pad('l', [7, 5, 0], 2, 2, { tone: 'accent' });
  b.pad('v', [7, 0, 3], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 3);
  b.pillar([7, 4, 0], 6);
  b.pillar([7, -1, 3], 3);
  b.crystals([
    [4, 4.2, 1.5],
    [5, 1.2, 4],
    [8, 6.4, 1],
  ]);

  b.link(base[1], stairs[0]);
  b.link(stairs[4], 'l_0_0');
  b.alignedLink('l_1_1', beneath[0], 90, { pitch: 315 });
  b.alignedLink(beneath[4], 'v_0_0', 270);
  b.start(base[0]).exit('v_1_1');
  b.hint('Climb it, then go back under it.');
  return b.build();
}

/** Chapter finale: floor, wall and ceiling in one route. */
function reliquaryHeart(): Level {
  const b = new LevelBuilder('ch4-6', 4, 6, 'Reliquary Heart');
  b.allowPitch();

  b.pad('f', [0, 0, 0], 2, 3);
  const east = b.wallway('e', [3, 1, 0], 'z+', 4, 'x-', { tone: 'raised' });
  const ceiling = b.underside('c', [3, 6, 4], 'x+', 4, { tone: 'shadow' });
  const north = b.wallway('n', [7, 2, 3], 'z-', 4, 'x+', { tone: 'raised' });
  b.pad('h', [0, 2, 6], 2, 2, { tone: 'glow' });

  for (let y = 0; y < 7; y += 1) {
    b.decor({ shape: 'pillar', pos: [3, y, -1], tone: 'shadow' });
    b.decor({ shape: 'pillar', pos: [7, y, 4], tone: 'shadow' });
  }
  b.pillar([0, -1, 0], 3);
  b.pillar([1, 1, 6], 4);
  b.arch([4, 7.2, 1], 'x+', 4);
  b.crystals([
    [2, 2.4, 2],
    [5, 5.2, 4],
    [6, 3.4, 1],
    [1.5, 3.8, 5],
  ]);

  b.alignedLink('f_1_2', east[0], 90);
  b.alignedLink(east[3], ceiling[0], 90, { pitch: 30 });
  b.alignedLink(ceiling[3], north[0], 180, { pitch: 330 });
  b.alignedLink(north[3], 'h_1_1', 270);
  b.start('f_0_0').exit('h_0_0');
  b.hint('Floor, wall, ceiling, wall. Four turns, two tilts.');
  return b.build();
}

export const CHAPTER_4_LEVELS: readonly Level[] = [
  underside(),
  theWall(),
  tilt(),
  twoAxes(),
  invertedStair(),
  reliquaryHeart(),
];
