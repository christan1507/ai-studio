/**
 * Chapter 2 — Crystal Caves.
 *
 * Adds moving platforms. The new idea is *waiting*: some connections exist on
 * a schedule rather than at an angle.
 *
 * Phase windows are derived from the motion rather than guessed. A `slide` or
 * `elevator` group eases there-and-back with `pingPong`, so a platform sits at
 * its `from` end around phase 0 and at its `to` end around phase 0.5. The two
 * constants below name those windows once so every dock in the chapter is
 * geometrically honest.
 */

import { LevelBuilder } from '@/data/modules/kit';
import { ringDockWindow } from '@/systems/groups';
import type { Level } from '@/types';

/** Platform is parked at its `from` end. */
const AT_START: readonly [number, number] = [0.88, 0.12];
/** Platform is parked at its `to` end. */
const AT_END: readonly [number, number] = [0.38, 0.62];

/** Teaches waiting, with no rotation required at all. */
function ferry(): Level {
  const b = new LevelBuilder('ch2-1', 2, 1, 'Ferry');
  const near = b.walkway('a', [0, 0, 0], 'x+', 4);
  b.group({ id: 'ferry', motion: 'slide', period: 7, from: [5, 0, 0], to: [5, 0, 7] });
  const deck = b.walkway('f', [5, 0, 0], 'x+', 1, { group: 'ferry', tone: 'accent' });
  const far = b.walkway('z', [0, 0, 7], 'x+', 4, { tone: 'raised' });

  b.pillar([0, -1, 0], 3).pillar([3, -1, 0], 3);
  b.pillar([0, -1, 7], 3).pillar([3, -1, 7], 3);
  b.crystals([
    [6, 2.2, 3.5],
    [2, 2.6, 3.5],
  ]);

  b.phaseLink(near[3], deck[0], 'ferry', AT_START);
  b.phaseLink(deck[0], far[3], 'ferry', AT_END);
  b.start(near[0]).exit(far[0]);
  b.hint('Nothing to turn here. Wait for the platform.');
  return b.build();
}

/** Waiting and turning together for the first time. */
function tideAndTurn(): Level {
  const b = new LevelBuilder('ch2-2', 2, 2, 'Tide and Turn');
  const start = b.walkway('a', [0, 0, 0], 'x+', 3);
  const dock = b.walkway('d', [6, 0, 0], 'x+', 2, { tone: 'raised' });
  b.group({ id: 'barge', motion: 'slide', period: 8, from: [8, 0, 2], to: [8, 0, 8] });
  const deck = b.walkway('f', [8, 0, 2], 'x+', 1, { group: 'barge', tone: 'accent' });
  const far = b.walkway('z', [8, 0, 9], 'x+', 3, { tone: 'raised' });

  b.pillar([1, -1, 0], 3).pillar([6, -1, 0], 3).pillar([9, -1, 9], 3);
  b.crystals([
    [4.5, 2.1, 0.5],
    [8.5, 2.8, 5],
  ]);

  b.alignedLink(start[2], dock[0], 90);
  b.phaseLink(dock[1], deck[0], 'barge', AT_START);
  b.phaseLink(deck[0], far[0], 'barge', AT_END);
  b.start(start[0]).exit(far[2]);
  b.hint('Turn to reach the dock, then wait.');
  return b.build();
}

/** Vertical motion, with the alignment only available at the top. */
function theLift(): Level {
  const b = new LevelBuilder('ch2-3', 2, 3, 'The Lift');
  b.pad('g', [0, 0, 0], 2, 2);
  b.group({ id: 'lift', motion: 'elevator', period: 7, from: [3, 0, 0], to: [3, 5, 0] });
  const cage = b.walkway('f', [3, 0, 0], 'x+', 1, { group: 'lift', tone: 'accent' });
  const high = b.walkway('h', [3, 5, 2], 'z+', 3, { tone: 'raised' });
  const exitRun = b.walkway('z', [8, 6, 6], 'x+', 3, { tone: 'raised' });

  b.pillar([0, -1, 0], 4);
  for (let y = 0; y < 6; y += 1) b.decor({ shape: 'pillar', pos: [4, y, 0], tone: 'shadow' });
  b.pillar([9, 5, 6], 7);
  b.crystals([
    [2, 3.4, 1],
    [5.5, 6.2, 4],
  ]);

  b.phaseLink('g_1_0', cage[0], 'lift', AT_START);
  b.phaseLink(cage[0], high[0], 'lift', AT_END);
  b.alignedLink(high[2], exitRun[0], 225);
  b.start('g_0_0').exit(exitRun[2]);
  b.hint('Ride up. The bridge at the top needs an angle.');
  return b.build();
}

/**
 * Two lifts half a cycle apart: a rhythm rather than a single wait.
 *
 * Every dock sits one tile from where its platform parks, so the geometry and
 * the phase windows agree by construction.
 */
function counterweight(): Level {
  const b = new LevelBuilder('ch2-4', 2, 4, 'Counterweight');
  // a0 (0,.5,0) .. a1 (1,.5,0)
  const start = b.walkway('a', [0, 0, 0], 'x+', 2);

  b.group({ id: 'left', motion: 'elevator', period: 6, from: [2, 0, 0], to: [2, 4, 0] });
  b.group({
    id: 'right',
    motion: 'elevator',
    period: 6,
    phaseOffset: 0.5,
    from: [5, 0, 1],
    to: [5, 4, 1],
  });

  // Parks at (2,.5,0) and rises to (2,4.5,0).
  const leftDeck = b.walkway('p', [2, 0, 0], 'x+', 1, { group: 'left', tone: 'accent' });
  // Parks at (5,.5,1) and rises to (5,4.5,1).
  const rightDeck = b.walkway('q', [5, 0, 1], 'x+', 1, { group: 'right', tone: 'accent' });

  b.pad('m', [3, 4, 0], 2, 2, { tone: 'raised' });
  const lower = b.walkway('z', [6, 0, 1], 'x+', 2, { tone: 'raised' });
  b.pad('e', [10, 1, 1], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 0], 3);
  b.pillar([3, 3, 0], 4);
  b.pillar([6, -1, 1], 3);
  b.pillar([10, 0, 1], 4);
  b.crystals([
    [2, 2.6, 2],
    [4.5, 5.4, 1],
    [8, 2.4, 1.5],
  ]);

  b.phaseLink(start[1], leftDeck[0], 'left', AT_START);
  b.phaseLink(leftDeck[0], 'm_0_0', 'left', AT_END);
  // The right lift is at the top exactly when the left one is at the bottom,
  // so crossing the landing and descending is the only way onward.
  b.phaseLink('m_1_1', rightDeck[0], 'right', AT_END);
  b.phaseLink(rightDeck[0], lower[0], 'right', AT_START);
  b.alignedLink(lower[1], 'e_0_0', 300);
  b.start(start[0]).exit('e_1_1');
  b.hint('They are never level at the same time. Use that.');
  return b.build();
}

/** A spinning ring. Dock windows come straight from the tile geometry. */
function carousel(): Level {
  const b = new LevelBuilder('ch2-5', 2, 5, 'Carousel');
  const TILES = 6;
  const RADIUS = 3;
  const CENTRE = [6, 1, 0] as const;

  const approach = b.walkway('a', [0, 1, 0], 'x+', 3);
  b.group({
    id: 'wheel',
    motion: 'spin',
    period: 12,
    axis: [0, 1, 0],
    pivot: [CENTRE[0], CENTRE[1], CENTRE[2]],
    sweep: 360,
  });
  const tiles = b.ring('t', [CENTRE[0], CENTRE[1], CENTRE[2]], RADIUS, TILES, {
    group: 'wheel',
    tone: 'accent',
  });
  const exitRun = b.walkway('z', [6, 1, 4], 'z+', 3, { tone: 'raised' });

  b.pillar([1, 0, 0], 4);
  for (let y = 0; y < 5; y += 1) b.decor({ shape: 'pillar', pos: [6, y, 0], tone: 'shadow' });
  b.pillar([6, 0, 6], 4);
  b.crystals([
    [6, 4.2, 0],
    [3, 3.4, 2.5],
  ]);

  // The approach ends at x=2, beside the ring's -x edge (angle 180). The exit
  // run starts at z=4, beside its +z edge (angle 90). Tiles are chained into a
  // loop by `ring`, so boarding any tile reaches every tile — one tile index
  // is enough to describe both docks.
  b.phaseLink(approach[2], tiles[0], 'wheel', ringDockWindow(0, TILES, 180));
  b.phaseLink(tiles[0], exitRun[0], 'wheel', ringDockWindow(0, TILES, 90));

  b.start(approach[0]).exit(exitRun[2]);
  b.hint('Step on when a tile swings past, then ride it round.');
  return b.build();
}

/**
 * Chapter finale: a ferry, a lift and two alignments.
 *
 * The ferry hands off to a *static* landing rather than straight to the lift.
 * Two independently moving platforms cannot be joined — one phase window can
 * only describe one of them — and the validator rejects any level that tries.
 */
function deepCurrent(): Level {
  const b = new LevelBuilder('ch2-6', 2, 6, 'Deep Current');
  // a0 (0,.5,0) .. a2 (0,.5,2)
  const start = b.walkway('a', [0, 0, 0], 'z+', 3);
  b.pad('s', [3, 1, 1], 2, 2, { tone: 'raised' });

  b.group({ id: 'ferry', motion: 'slide', period: 9, from: [5, 1, 2], to: [5, 1, 9] });
  const deck = b.walkway('f', [5, 1, 2], 'x+', 1, { group: 'ferry', tone: 'accent' });

  b.pad('l', [5, 1, 10], 2, 2, { tone: 'raised' });

  b.group({ id: 'lift', motion: 'elevator', period: 7, from: [7, 1, 10], to: [7, 6, 10] });
  const cage = b.walkway('g', [7, 1, 10], 'x+', 1, { group: 'lift', tone: 'accent' });

  const upper = b.walkway('u', [7, 6, 9], 'z-', 3, { tone: 'raised' });
  b.pad('z', [3, 7, 5], 2, 2, { tone: 'glow' });

  b.pillar([0, -1, 1], 3);
  b.pillar([3, 0, 1], 3);
  b.pillar([5, 0, 10], 3);
  b.pillar([3, 6, 5], 8);
  b.crystals([
    [4, 3.2, 5],
    [8, 4.4, 10],
    [5, 8.2, 6],
  ]);

  b.alignedLink(start[2], 's_0_1', 90);
  b.phaseLink('s_1_1', deck[0], 'ferry', AT_START);
  b.phaseLink(deck[0], 'l_0_0', 'ferry', AT_END);
  b.phaseLink('l_1_0', cage[0], 'lift', AT_START);
  b.phaseLink(cage[0], upper[0], 'lift', AT_END);
  b.alignedLink(upper[2], 'z_1_1', 210);
  b.start(start[0]).exit('z_0_0');
  b.hint('Two rides, two turns. The order is forced.');
  return b.build();
}

export const CHAPTER_2_LEVELS: readonly Level[] = [
  ferry(),
  tideAndTurn(),
  theLift(),
  counterweight(),
  carousel(),
  deepCurrent(),
];
