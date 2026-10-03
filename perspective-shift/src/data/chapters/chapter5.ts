/**
 * Chapter 5 — The Inversion.
 *
 * Everything at once: alignments, moving platforms, switches, inverted
 * surfaces and tilt. No new verbs — the difficulty comes from mechanics gating
 * each other: a lift dead until a plate is thrown, a plate only reachable
 * upside down, a bridge needing both a tilt and a flag.
 *
 * Two rules the validator enforces and these levels are built around:
 * a platform's docks must be one tile from where it parks, and two
 * independently moving assemblies can never be joined directly.
 */

import { LevelBuilder } from '@/data/modules/kit';
import { ringDockWindow } from '@/systems/groups';
import type { Level } from '@/types';

/** Platform is parked at its `from` end. */
const AT_START: readonly [number, number] = [0.88, 0.12];
/** Platform is parked at its `to` end. */
const AT_END: readonly [number, number] = [0.38, 0.62];

/** A lift that will not run until a plate is thrown. */
function stalled(): Level {
  const b = new LevelBuilder('ch5-1', 5, 1, 'Stalled');
  // a0 (0,.5,0) .. a2 (2,.5,0)
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  // Behind the start, so the detour is away from the goal.
  const plate = b.walkway('p', [-1, 0, 0], 'x-', 2, { tone: 'raised' });
  const ledge = b.walkway('l', [5, 0, 1], 'x+', 2, { tone: 'raised' });

  b.group({
    id: 'lift',
    motion: 'elevator',
    period: 6,
    from: [6, 0, 0],
    to: [6, 4, 0],
    requiresFlag: 'power',
  });
  const cage = b.walkway('c', [6, 0, 0], 'x+', 1, { group: 'lift', tone: 'accent' });
  const finish = b.walkway('z', [6, 4, 1], 'z+', 3, { tone: 'glow' });

  b.pillar([0, -1, 0], 3).pillar([-2, -1, 0], 3).pillar([5, -1, 1], 3);
  b.pillar([6, 3, 2], 7);
  b.crystals([
    [3.5, 2.2, 0.5],
    [6.5, 3.4, 2],
  ]);

  b.link(start[0], plate[0]);
  b.switchAt('sw', 'power', plate[1], 'once');
  b.alignedLink(start[2], ledge[0], 90);
  b.phaseLink(ledge[1], cage[0], 'lift', AT_START);
  b.phaseLink(cage[0], finish[0], 'lift', AT_END);
  b.start(start[0]).exit(finish[2]);
  b.hint('The lift is dead. Look behind you first.');
  return b.build();
}

/** The plate is on a ceiling, so the flip has to come first. */
function upsideFirst(): Level {
  const b = new LevelBuilder('ch5-2', 5, 2, 'Upside First');
  b.allowPitch();

  // a0 (0,3.5,0) .. a2 (2,3.5,0)
  const start = b.walkway('a', [0, 3, 0], 'x+', 3);
  // Blocks at y=3, walked underneath at y=2.5.
  const roof = b.underside('r', [4, 3, 0], 'x+', 4, { tone: 'shadow' });
  b.pad('s', [4, 0, 2], 2, 2, { tone: 'raised' });
  const finish = b.walkway('z', [8, 1, 4], 'x+', 3, { tone: 'glow' });

  b.pillar([0, 2, 0], 4);
  b.pillar([4, -1, 2], 3);
  b.pillar([9, 0, 4], 4);
  b.crystals([
    [3.5, 4.2, 0.5],
    [6, 1.4, 1.5],
    [7, 2.6, 3],
  ]);

  b.alignedLink(start[2], roof[0], 90);
  // The plate sits at the far end of the ceiling run.
  b.switchAt('sw', 'span', roof[3]);
  b.alignedLink(roof[0], 's_0_0', 270, { pitch: 30 });
  b.alignedFlagLink('s_1_1', finish[0], 135, 'span');
  b.start(start[0]).exit(finish[2]);
  b.hint('The plate is overhead. Get under the roof and walk to the end.');
  return b.build();
}

/** A ferry boarded from a wall. */
function crossCurrent(): Level {
  const b = new LevelBuilder('ch5-3', 5, 3, 'Cross Current');
  // a0 (0,.5,0) .. a2 (2,.5,0)
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  // Wall blocks at x=4; nodes stand off the -x face at (3.5, 1, z).
  const wall = b.wallway('w', [4, 1, 0], 'z+', 3, 'x-', { tone: 'raised' });

  b.group({ id: 'ferry', motion: 'slide', period: 8, from: [5, 1, 3], to: [5, 1, 9] });
  const deck = b.walkway('f', [5, 1, 3], 'x+', 1, { group: 'ferry', tone: 'accent' });
  b.pad('z', [5, 1, 10], 2, 2, { tone: 'glow' });

  for (let y = 0; y < 4; y += 1) b.decor({ shape: 'pillar', pos: [4, y, -1], tone: 'shadow' });
  b.pillar([0, -1, 0], 3);
  b.pillar([5, 0, 10], 3);
  b.crystals([
    [2.5, 1.8, 1],
    [5.5, 3.4, 6],
  ]);

  b.alignedLink(start[2], wall[0], 90);
  b.phaseLink(wall[2], deck[0], 'ferry', AT_START);
  b.phaseLink(deck[0], 'z_0_0', 'ferry', AT_END);
  b.start(start[0]).exit('z_1_1');
  b.hint('Board from the wall.');
  return b.build();
}

/** One lift is dead until a plate reachable only via the other is thrown. */
function theSwitchyard(): Level {
  const b = new LevelBuilder('ch5-4', 5, 4, 'The Switchyard');
  // a0 (0,.5,0) .. a2 (2,.5,0)
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);

  // The north lift holds still until 'routed' is set; the south one always runs.
  b.group({
    id: 'north',
    motion: 'elevator',
    period: 6,
    from: [3, 0, -1],
    to: [3, 4, -1],
    requiresFlag: 'routed',
  });
  b.group({ id: 'south', motion: 'elevator', period: 6, from: [3, 0, 1], to: [3, 4, 1] });

  const northDeck = b.walkway('n', [3, 0, -1], 'x+', 1, { group: 'north', tone: 'accent' });
  const southDeck = b.walkway('s', [3, 0, 1], 'x+', 1, { group: 'south', tone: 'accent' });

  b.pad('ng', [4, 4, -2], 2, 2, { tone: 'raised' });
  b.pad('sg', [4, 4, 1], 2, 2, { tone: 'raised' });
  const finish = b.walkway('z', [8, 5, -1], 'x+', 3, { tone: 'glow' });

  b.pillar([0, -1, 0], 3);
  b.pillar([4, 3, -2], 4).pillar([4, 3, 1], 4);
  b.pillar([9, 4, -1], 6);
  b.crystals([
    [3, 2.4, 0],
    [6, 5.2, -1],
    [6, 5.2, 2],
    [8, 6.4, 0],
  ]);

  b.phaseLink(start[2], southDeck[0], 'south', AT_START);
  b.phaseLink(southDeck[0], 'sg_0_0', 'south', AT_END);
  // The plate lives at the far corner of the south gallery.
  b.switchAt('sw', 'routed', 'sg_1_1', 'once');

  b.phaseLink(start[2], northDeck[0], 'north', AT_START);
  b.phaseLink(northDeck[0], 'ng_0_1', 'north', AT_END);
  b.alignedLink('ng_1_1', finish[0], 300);

  b.start(start[0]).exit(finish[2]);
  b.hint('One lift is dead. The plate that wakes it is up the other one.');
  return b.build();
}

/** A long route using every mechanic once. */
function theLongInversion(): Level {
  const b = new LevelBuilder('ch5-5', 5, 5, 'The Long Inversion');
  b.allowPitch();

  b.pad('g', [0, 0, 0], 2, 2);
  // e0 (4,1.5,1) .. e2 (6,1.5,1)
  const east = b.walkway('e', [4, 1, 1], 'x+', 3, { tone: 'raised' });
  // Blocks at y=5 from z=2; walked underneath at (6,4.5,z).
  const roof = b.underside('r', [6, 5, 2], 'z+', 4, { tone: 'shadow' });

  b.group({ id: 'ferry', motion: 'slide', period: 9, from: [7, 4, 5], to: [7, 4, 10] });
  const deck = b.walkway('f', [7, 4, 5], 'x+', 1, { group: 'ferry', tone: 'accent' });

  // Wall blocks along x at z=10; nodes stand off the +z face at (x, 5, 10.5).
  const wall = b.wallway('w', [8, 5, 10], 'x-', 3, 'z+', { tone: 'raised' });
  b.pad('c', [2, 6, 8], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 3).pillar([4, 0, 1], 4);
  for (let y = 0; y < 5; y += 1) b.decor({ shape: 'pillar', pos: [6, y, 1], tone: 'shadow' });
  b.pillar([2, 5, 8], 7);
  b.arch([3, 6.4, 4], 'z+', 4);
  b.crystals([
    [2, 2.4, 1],
    [6.5, 3.2, 3],
    [7.5, 5.6, 8],
    [4, 7.4, 8],
  ]);

  b.alignedLink('g_1_1', east[0], 90);
  b.switchAt('sw', 'latch', east[2], 'once');
  b.alignedLink(east[2], roof[0], 90, { pitch: 30 });
  b.phaseLink(roof[3], deck[0], 'ferry', AT_START);
  b.phaseLink(deck[0], wall[0], 'ferry', AT_END);
  b.alignedFlagLink(wall[2], 'c_1_1', 270, 'latch');
  b.start('g_0_0').exit('c_0_0');
  b.hint('Everything you have learned, in order.');
  return b.build();
}

/** The last level: a frozen carousel, a ceiling, a tilt and two plates. */
function theFinalShift(): Level {
  const b = new LevelBuilder('ch5-6', 5, 6, 'The Final Shift');
  b.allowPitch();

  // g_0_1 (-1,.5,0), g_1_1 (0,.5,0), g_2_1 (1,.5,0)
  b.pad('g', [-1, 0, -1], 3, 3);
  const westPlate = b.walkway('p', [-2, 0, 0], 'x-', 2, { tone: 'raised' });
  // e0 (3,1.5,0) .. e2 (5,1.5,0)
  const east = b.walkway('e', [3, 1, 0], 'x+', 3, { tone: 'raised' });

  const TILES = 6;
  // Parked at phase 0.5, both docks are shut — the ring is genuinely useless
  // until it is powered, rather than merely unable to carry you anywhere.
  b.group({
    id: 'wheel',
    motion: 'spin',
    period: 10,
    phaseOffset: 0.5,
    axis: [0, 1, 0],
    pivot: [9, 1, 0],
    sweep: 360,
    requiresFlag: 'spin',
  });
  const tiles = b.ring('t', [9, 1, 0], 3, TILES, { group: 'wheel', tone: 'accent' });

  b.pad('l', [9, 1, 4], 2, 2, { tone: 'raised' });
  // Blocks at y=6 from z=6; walked underneath at (9,5.5,z).
  const roof = b.underside('r', [9, 6, 6], 'z+', 4, { tone: 'shadow' });
  b.pad('c', [3, 5, 8], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 4).pillar([-3, -1, 0], 3).pillar([3, 0, 0], 4);
  for (let y = 0; y < 7; y += 1) b.decor({ shape: 'pillar', pos: [9, y, 0], tone: 'shadow' });
  b.pillar([9, 0, 4], 3).pillar([3, 4, 8], 6);
  b.arch([5, 6.4, 7], 'x+', 4);
  b.crystals([
    [-2, 2.2, 1],
    [6, 3.4, 0.5],
    [9, 4.6, 3],
    [6, 6.6, 7],
    [4, 6.8, 9],
  ]);

  b.link('g_0_1', westPlate[0]);
  b.switchAt('sw-spin', 'spin', westPlate[1], 'once');
  b.alignedLink('g_2_1', east[0], 90);

  // Tile 3 is authored at angle 180 (the ring's -x edge, beside the east run)
  // and swings round to the +z edge, beside the landing.
  b.phaseLink(east[2], tiles[3], 'wheel', ringDockWindow(3, TILES, 180));
  b.phaseLink(tiles[3], 'l_0_0', 'wheel', ringDockWindow(3, TILES, 90));

  b.alignedLink('l_0_1', roof[0], 90, { pitch: 30 });
  b.switchAt('sw-crown', 'crown', roof[3]);
  b.alignedFlagLink(roof[0], 'c_1_1', 225, 'crown');

  b.start('g_1_1').exit('c_0_0');
  b.hint('Power the ring, ride it round, then walk the ceiling to its end.');
  return b.build();
}

export const CHAPTER_5_LEVELS: readonly Level[] = [
  stalled(),
  upsideFirst(),
  crossCurrent(),
  theSwitchyard(),
  theLongInversion(),
  theFinalShift(),
];
