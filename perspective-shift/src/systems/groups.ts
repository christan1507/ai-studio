/**
 * Animated sub-assemblies.
 *
 * A group's transform is a *delta* applied on top of the authored positions of
 * the blocks and nodes tagged with it, so authors place geometry where it sits
 * at phase 0 and describe the motion separately. The same function drives both
 * rendering and the resolved position the character walks to, which is what
 * keeps a character standing on a moving platform visually glued to it.
 */

import type { GroupDef, Level, Vec3, WalkNode } from '@/types';

export interface GroupTransform {
  readonly offset: Vec3;
  /** Radians about `axis`, around `pivot`. */
  readonly angle: number;
  readonly axis: Vec3;
  readonly pivot: Vec3;
}

export const IDENTITY_TRANSFORM: GroupTransform = {
  offset: [0, 0, 0],
  angle: 0,
  axis: [0, 1, 0],
  pivot: [0, 0, 0],
};

/** Smooth there-and-back easing over a 0..1 cycle, resting at both ends. */
function pingPong(phase: number): number {
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
}

export function groupTransform(group: GroupDef, phase: number): GroupTransform {
  switch (group.motion) {
    case 'none':
      return IDENTITY_TRANSFORM;

    case 'slide':
    case 'elevator': {
      const from = group.from ?? [0, 0, 0];
      const to = group.to ?? from;
      const t = pingPong(phase);
      return {
        ...IDENTITY_TRANSFORM,
        offset: [
          (to[0] - from[0]) * t,
          (to[1] - from[1]) * t,
          (to[2] - from[2]) * t,
        ],
      };
    }

    case 'spin':
    case 'orbit': {
      const sweep = group.sweep ?? 360;
      return {
        offset: [0, 0, 0],
        angle: (sweep * phase * Math.PI) / 180,
        axis: group.axis ?? [0, 1, 0],
        pivot: group.pivot ?? [0, 0, 0],
      };
    }
  }
}

/** Rotate `point` about an axis through `pivot` by `angle` radians. */
function rotateAbout(point: Vec3, pivot: Vec3, axis: Vec3, angle: number): Vec3 {
  if (angle === 0) return point;

  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length === 0) return point;
  const [ax, ay, az] = [axis[0] / length, axis[1] / length, axis[2] / length];

  const px = point[0] - pivot[0];
  const py = point[1] - pivot[1];
  const pz = point[2] - pivot[2];

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = ax * px + ay * py + az * pz;

  // Rodrigues' rotation formula.
  const rx = px * cos + (ay * pz - az * py) * sin + ax * dot * (1 - cos);
  const ry = py * cos + (az * px - ax * pz) * sin + ay * dot * (1 - cos);
  const rz = pz * cos + (ax * py - ay * px) * sin + az * dot * (1 - cos);

  return [rx + pivot[0], ry + pivot[1], rz + pivot[2]];
}

/** Position of an authored point once its group's motion is applied. */
export function applyGroupTransform(pos: Vec3, transform: GroupTransform): Vec3 {
  const rotated = rotateAbout(pos, transform.pivot, transform.axis, transform.angle);
  return [
    rotated[0] + transform.offset[0],
    rotated[1] + transform.offset[1],
    rotated[2] + transform.offset[2],
  ];
}

/**
 * Where a node actually is at a given set of group phases.
 *
 * Pure counterpart to `WorldRuntime.nodePosition`, usable without a live
 * runtime — which is what lets tests check that a phase-gated dock really is
 * within stepping distance during the window it claims to be open.
 */
export function resolvedNodePosition(
  level: Level,
  node: WalkNode,
  phases: Readonly<Record<string, number>>,
): Vec3 {
  if (!node.group) return node.pos;
  const group = (level.groups ?? []).find((candidate) => candidate.id === node.group);
  if (!group) return node.pos;
  return applyGroupTransform(node.pos, groupTransform(group, phases[group.id] ?? 0));
}

export function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Advance a group's phase by `dt` seconds, wrapping at 1. */
export function advancePhase(group: GroupDef, phase: number, dt: number): number {
  const period = group.period ?? 0;
  if (group.motion === 'none' || period <= 0) return phase;
  const next = (phase + dt / period) % 1;
  return next < 0 ? next + 1 : next;
}

/**
 * The phase window during which a ring tile sits at a given dock angle.
 *
 * `ring` places tile `i` at angle `i/count` turns measured so that +angle runs
 * toward +z. A `spin` group applies Rodrigues rotation about +Y, which carries
 * a point toward *-z* for a positive angle — the opposite sense. So the tile's
 * angle at phase `p` is `a_i - sweep*p`, not `a_i + sweep*p`, and it reaches a
 * dock at `phase = (i/count - dockAngle/360) / sweepTurns`.
 *
 * Getting that sign backwards produces windows that open while the tile is on
 * the far side of the ring: provably "solvable", visibly broken. Levels derive
 * windows from this helper rather than guessing for exactly that reason.
 */
export function ringDockWindow(
  tileIndex: number,
  tileCount: number,
  dockAngleDeg = 0,
  sweepTurns = 1,
  halfWidth = 0.06,
): [number, number] {
  const centre = mod1((tileIndex / tileCount - dockAngleDeg / 360) / sweepTurns);
  return [round4(mod1(centre - halfWidth)), round4(mod1(centre + halfWidth))];
}

function mod1(value: number): number {
  const remainder = value % 1;
  return remainder < 0 ? remainder + 1 : remainder;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}
