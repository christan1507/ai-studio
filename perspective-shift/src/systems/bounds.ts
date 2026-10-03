/**
 * Level extents.
 *
 * The structure must rotate about its own centre, not the world origin, or a
 * level authored away from [0,0,0] swings around like a thrown hammer. Bounds
 * also set the orthographic zoom so every level frames itself nicely without
 * per-level camera tuning.
 */

import type { Level, Vec3 } from '@/types';

export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly centre: Vec3;
  readonly size: Vec3;
  /** Radius of the bounding sphere, used to pick a camera zoom. */
  readonly radius: number;
}

export function levelBounds(level: Level): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  const consider = (pos: Vec3): void => {
    minX = Math.min(minX, pos[0]);
    minY = Math.min(minY, pos[1]);
    minZ = Math.min(minZ, pos[2]);
    maxX = Math.max(maxX, pos[0]);
    maxY = Math.max(maxY, pos[1]);
    maxZ = Math.max(maxZ, pos[2]);
  };

  for (const block of level.blocks) consider(block.pos);
  for (const node of level.nodes) consider(node.pos);
  // A group's travel takes geometry beyond its authored position, so include
  // both ends of any motion or the camera clips a platform at full extension.
  for (const group of level.groups ?? []) {
    if (group.from) consider(group.from);
    if (group.to) consider(group.to);
  }

  if (!Number.isFinite(minX)) {
    const zero: Vec3 = [0, 0, 0];
    return { min: zero, max: zero, centre: zero, size: zero, radius: 1 };
  }

  const centre: Vec3 = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const size: Vec3 = [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1];
  const radius = Math.max(1, Math.hypot(size[0], size[1], size[2]) / 2);

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], centre, size, radius };
}

/**
 * Orthographic zoom that frames a level with a little breathing room.
 * Larger zoom means closer, so it falls off with the level's radius.
 */
export function zoomForBounds(bounds: Bounds, viewportHeight: number): number {
  const margin = 2.6;
  return Math.max(12, viewportHeight / (bounds.radius * margin));
}
