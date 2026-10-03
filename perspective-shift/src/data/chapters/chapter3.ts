/**
 * Chapter 3 — Sky Temples.
 *
 * Adds switches. The new idea is *state*: the structure remembers something
 * about what you have done, so the same angle can mean two different things.
 *
 * Switches fire when the character finishes a walk standing on them, so a
 * plate is always a deliberate destination rather than something tripped in
 * passing.
 */

import { LevelBuilder } from '@/data/modules/kit';
import type { Level } from '@/types';

/** One plate, one gate. */
function theLever(): Level {
  const b = new LevelBuilder('ch3-1', 3, 1, 'The Lever');
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  b.pad('p', [4, 0, 0], 2, 2, { tone: 'raised' });
  const finish = b.walkway('z', [4, 0, 5], 'x+', 3, { tone: 'accent' });

  b.pillar([0, -1, 0], 3).pillar([4, -1, 0], 3).pillar([5, -1, 5], 3);
  b.crystals([
    [3, 2.2, 2.5],
    [6, 2.6, 3],
  ]);

  b.link(start[2], 'p_0_0');
  b.switchAt('sw', 'gate', 'p_1_1');
  b.flagLink('p_1_1', finish[0], 'gate');
  b.start(start[0]).exit(finish[2]);
  b.hint('Stand on the plate. Something opens.');
  return b.build();
}

/** A plate behind an alignment, and a gate behind the plate. */
function theKeeper(): Level {
  const b = new LevelBuilder('ch3-2', 3, 2, 'The Keeper');
  const start = b.walkway('a', [0, 1, 0], 'x+', 3);
  b.pad('i', [6, 1, -1], 2, 2, { tone: 'raised' });
  const spur = b.walkway('s', [6, 1, 1], 'x+', 2, { tone: 'raised' });
  const finish = b.walkway('z', [0, 2, 6], 'x+', 3, { tone: 'accent' });

  b.pillar([1, 0, 0], 4).pillar([6, 0, -1], 4).pillar([1, 1, 6], 5);
  b.crystals([
    [4.5, 3.2, 1],
    [3, 4.4, 4],
  ]);

  b.alignedLink(start[2], 'i_0_0', 90);
  b.link('i_0_1', spur[0]);
  b.switchAt('sw', 'span', spur[1]);
  b.flagLink(spur[1], finish[2], 'span');
  b.start(start[0]).exit(finish[0]);
  b.hint('Turn, then walk to the plate, then look again.');
  return b.build();
}

/** A toggle that opens one way and closes the other. */
function eitherOr(): Level {
  const b = new LevelBuilder('ch3-3', 3, 3, 'Either Or');
  b.pad('h', [0, 0, 0], 2, 2);
  const left = b.walkway('l', [-4, 0, 0], 'x-', 3, { tone: 'raised' });
  const right = b.walkway('r', [3, 0, 0], 'x+', 3, { tone: 'raised' });
  const plate = b.walkway('p', [0, 0, 2], 'z+', 2, { tone: 'shadow' });
  b.pad('z', [3, 1, 5], 2, 2, { tone: 'accent' });

  b.pillar([0, -1, 0], 3).pillar([-4, -1, 0], 3).pillar([4, -1, 0], 3);
  b.pillar([4, 0, 5], 4);
  b.crystals([
    [-2, 2.2, 1],
    [2, 2.6, 2],
    [5, 3.4, 3],
  ]);

  b.link('h_0_1', plate[0]);
  b.switchAt('sw', 'swung', plate[1]);
  // Exactly one of these two spans exists at a time.
  b.flagLink('h_0_1', right[0], 'swung', true);
  b.flagLink('h_1_0', left[0], 'swung', false);
  b.alignedLink(right[2], 'z_0_0', 120);
  b.alignedLink(left[2], 'z_1_1', 300);
  b.start('h_1_1').exit('z_0_1');
  b.hint('The plate swaps which side is bridged.');
  return b.build();
}

/** Two plates whose order matters, because one locks permanently. */
function twoGates(): Level {
  const b = new LevelBuilder('ch3-4', 3, 4, 'Two Gates');
  const start = b.walkway('a', [0, 0, 0], 'z+', 2);
  b.pad('f', [0, 0, 3], 2, 2, { tone: 'raised' });
  const second = b.walkway('s', [5, 1, 3], 'x+', 2, { tone: 'raised' });
  b.pad('v', [5, 2, 7], 2, 2, { tone: 'accent' });
  const finish = b.walkway('z', [0, 3, 9], 'x+', 3, { tone: 'glow' });

  b.pillar([0, -1, 0], 3).pillar([0, -1, 3], 3).pillar([5, 0, 3], 4);
  b.pillar([5, 1, 7], 5).pillar([1, 2, 9], 6);
  b.crystals([
    [3, 2.4, 3],
    [6, 4.2, 5],
    [3, 5.4, 8],
  ]);

  b.link(start[1], 'f_0_0');
  b.switchAt('sw-a', 'inner', 'f_1_1', 'once');
  b.alignedLink('f_1_1', second[0], 90);
  b.switchAt('sw-b', 'outer', second[1], 'once');
  b.flagLink(second[1], 'v_0_0', 'inner');
  b.flagLink('v_1_1', finish[0], 'outer');
  b.start(start[0]).exit(finish[2]);
  b.hint('Both plates latch. Neither can be undone.');
  return b.build();
}

/** A plate that must be revisited from a different angle. */
function lockedSpiral(): Level {
  const b = new LevelBuilder('ch3-5', 3, 5, 'Locked Spiral');
  const ground = b.pad('g', [0, 0, 0], 2, 2);
  const east = b.walkway('e', [3, 1, 0], 'x+', 3, { tone: 'raised' });
  const north = b.walkway('n', [3, 2, -4], 'x+', 3, { tone: 'raised' });
  const west = b.walkway('w', [-4, 3, -4], 'x-', 3, { tone: 'raised' });
  b.pad('c', [-4, 4, 1], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 3).pillar([4, 0, 0], 4);
  b.pillar([4, 1, -4], 5).pillar([-4, 2, -4], 6).pillar([-4, 3, 1], 7);
  b.arch([0, 3.4, -2], 'x+', 4);
  b.crystals([
    [2, 3.2, -2],
    [-1, 5.2, -3],
    [-2, 6.2, 1],
  ]);

  b.alignedLink(ground[3], east[0], 90);
  b.switchAt('sw', 'rings', east[2]);
  b.alignedFlagLink(east[2], north[0], 180, 'rings');
  b.alignedLink(north[2], west[0], 270);
  b.alignedFlagLink(west[2], 'c_0_0', 0, 'rings');
  b.start('g_0_0').exit('c_1_1');
  b.hint('The plate is on the way, not off it.');
  return b.build();
}

/** Chapter finale: three plates, three alignments, one order. */
function templeCrown(): Level {
  const b = new LevelBuilder('ch3-6', 3, 6, 'Temple Crown');
  b.pad('b', [0, 0, 0], 3, 3);
  const eastWing = b.walkway('e', [4, 1, 1], 'x+', 3, { tone: 'raised' });
  const southWing = b.walkway('s', [1, 2, 5], 'x+', 3, { tone: 'raised' });
  const westWing = b.walkway('w', [-5, 3, 1], 'x+', 3, { tone: 'raised' });
  b.pad('p', [0, 5, -4], 2, 2, { tone: 'accent' });
  const crown = b.walkway('z', [0, 6, 0], 'x+', 2, { tone: 'glow' });

  b.pillar([1, -1, 1], 3);
  for (let y = 0; y < 7; y += 1) b.decor({ shape: 'pillar', pos: [1, y, -2], tone: 'shadow' });
  b.pillar([5, 0, 1], 4).pillar([2, 1, 5], 5).pillar([-5, 2, 1], 6);
  b.arch([-2, 4.2, 2], 'x+', 5);
  b.crystals([
    [3, 3.2, 3],
    [-2, 4.4, 3],
    [1, 6.4, -2],
    [2, 7.6, 0],
  ]);

  b.alignedLink('b_2_1', eastWing[0], 90);
  b.switchAt('sw-east', 'east', eastWing[2]);
  b.flagLink(eastWing[2], southWing[0], 'east');
  b.switchAt('sw-south', 'south', southWing[2]);
  b.alignedFlagLink(southWing[2], westWing[0], 225, 'south');
  b.switchAt('sw-west', 'west', westWing[2]);
  b.alignedFlagLink(westWing[2], 'p_0_0', 315, 'west');
  b.flagLink('p_1_1', crown[0], 'east');
  b.start('b_0_0').exit(crown[1]);
  b.hint('Each wing holds a plate. Collect them in turn.');
  return b.build();
}

export const CHAPTER_3_LEVELS: readonly Level[] = [
  theLever(),
  theKeeper(),
  eitherOr(),
  twoGates(),
  lockedSpiral(),
  templeCrown(),
];
