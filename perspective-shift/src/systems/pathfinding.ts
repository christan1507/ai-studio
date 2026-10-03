/**
 * Pathfinding over the walkable graph.
 *
 * Operates on whatever edges are active *right now* — the player rotates the
 * world to change the graph, then walks. Weights use each node's base local
 * position; group-attached nodes drift as their assembly animates, but that
 * only perturbs path aesthetics, never reachability, so the approximation is
 * deliberate and keeps this function pure.
 */

import { buildAdjacency, type Adjacency } from '@/systems/connections';
import type { Level, Vec3, WorldState } from '@/types';

function distance(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export type NodePositions = ReadonlyMap<string, Vec3>;

export function nodePositions(level: Level): NodePositions {
  return new Map(level.nodes.map((node) => [node.id, node.pos]));
}

/**
 * Shortest walkable route from `fromId` to `toId`, inclusive of both ends.
 * Returns `null` when no route exists under the current world state, and a
 * single-element path when source and target coincide.
 *
 * Dijkstra with a linear-scan frontier: levels hold on the order of a hundred
 * nodes, so the O(n^2) frontier is cheaper in practice than a heap and keeps
 * the implementation dependency-free.
 */
export function findPath(
  level: Level,
  state: WorldState,
  fromId: string,
  toId: string,
  adjacency: Adjacency = buildAdjacency(level, state),
): string[] | null {
  if (!adjacency.has(fromId) || !adjacency.has(toId)) return null;
  if (fromId === toId) return [fromId];

  const positions = nodePositions(level);
  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, string>();
  const settled = new Set<string>();

  for (;;) {
    let current: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (settled.has(id) || d >= best) continue;
      current = id;
      best = d;
    }
    if (current === null) return null;
    if (current === toId) break;
    settled.add(current);

    const currentPos = positions.get(current);
    for (const next of adjacency.get(current) ?? []) {
      if (settled.has(next)) continue;
      const nextPos = positions.get(next);
      const step =
        currentPos && nextPos ? distance(currentPos, nextPos) : 1;
      const candidate = best + step;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }
  }

  const path: string[] = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    const parent = prev.get(cursor);
    if (parent === undefined) return null;
    path.push(parent);
    cursor = parent;
  }
  return path.reverse();
}

/** Every node reachable from `fromId` under the current world state. */
export function reachableNodes(
  level: Level,
  state: WorldState,
  fromId: string,
  adjacency: Adjacency = buildAdjacency(level, state),
): Set<string> {
  const seen = new Set<string>();
  if (!adjacency.has(fromId)) return seen;

  const queue = [fromId];
  seen.add(fromId);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

/** Whether `toId` is walkable from `fromId` without rotating first. */
export function isReachable(
  level: Level,
  state: WorldState,
  fromId: string,
  toId: string,
): boolean {
  return reachableNodes(level, state, fromId).has(toId);
}
