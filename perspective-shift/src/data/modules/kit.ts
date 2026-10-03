/**
 * The level authoring kit.
 *
 * Levels are composed from reusable structure modules rather than hand-placed
 * block by block. A walkway, a staircase or a ring emits its decorative
 * geometry, its walkable nodes and the fixed edges chaining them together in
 * one call, so an author only writes the interesting part: which ends connect
 * to which, and at what rotation.
 *
 * Coordinates are in tile units. A block's `pos` is its centre, so a unit
 * block at y=0 has its walking surface at y=0.5 — `surfaceOf` handles that
 * offset so authors never think about it.
 */

import type {
  Block,
  BlockTone,
  Edge,
  GroupDef,
  Level,
  SwitchDef,
  SwitchMode,
  Vec3,
  WalkNode,
} from '@/types';

export type Direction = 'x+' | 'x-' | 'z+' | 'z-';

const DIRECTION_VECTORS: Record<Direction, Vec3> = {
  'x+': [1, 0, 0],
  'x-': [-1, 0, 0],
  'z+': [0, 0, 1],
  'z-': [0, 0, -1],
};

export function directionVector(direction: Direction): Vec3 {
  return DIRECTION_VECTORS[direction];
}

/** Rotate a direction a quarter turn clockwise about Y. */
export function turnRight(direction: Direction): Direction {
  const order: Direction[] = ['x+', 'z+', 'x-', 'z-'];
  return order[(order.indexOf(direction) + 1) % order.length];
}

export function add(a: Vec3, b: Vec3, scale = 1): Vec3 {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

/** Walking surface above a block whose centre is at `pos`. */
export function surfaceOf(pos: Vec3, blockHeight = 1): Vec3 {
  return [pos[0], pos[1] + blockHeight / 2, pos[2]];
}

export interface ModuleOptions {
  readonly tone?: BlockTone;
  readonly group?: string;
  /** Surface normal for the emitted nodes. Defaults to [0,1,0]. */
  readonly up?: Vec3;
  /** Emit decorative geometry. Set false for invisible walkable links. */
  readonly solid?: boolean;
  /** Chain the emitted nodes together with fixed edges. Defaults to true. */
  readonly chain?: boolean;
}

/**
 * Fluent builder for a level. Each module method returns the ids of the nodes
 * it created, in order, so an author can wire the ends together immediately.
 */
export class LevelBuilder {
  private readonly blocks: Block[] = [];
  private readonly nodes: WalkNode[] = [];
  private readonly edges: Edge[] = [];
  private readonly groups: GroupDef[] = [];
  private readonly switches: SwitchDef[] = [];
  private startNode?: string;
  private exitNode?: string;
  private pitchAllowed = false;
  private hintText?: string;

  constructor(
    private readonly id: string,
    private readonly chapter: number,
    private readonly index: number,
    private readonly name: string,
  ) {}

  // ---------------------------------------------------------------- primitives

  /** Add a decorative block. Never consulted by gameplay. */
  decor(block: Block): this {
    this.blocks.push(block);
    return this;
  }

  /** Add a raw walkable node. */
  node(id: string, pos: Vec3, options: Pick<ModuleOptions, 'up' | 'group'> = {}): this {
    const node: WalkNode = {
      id,
      pos,
      ...(options.up ? { up: options.up } : {}),
      ...(options.group ? { group: options.group } : {}),
    };
    this.nodes.push(node);
    return this;
  }

  /** An always-walkable connection. */
  link(a: string, b: string): this {
    this.edges.push({ a, b, kind: 'fixed' });
    return this;
  }

  /**
   * The illusion: a connection that only exists at a specific structure yaw.
   * Rendered as a glowing bridge while active unless `bridge` is disabled.
   */
  alignedLink(
    a: string,
    b: string,
    yaw: number,
    options: { readonly pitch?: number; readonly tolerance?: number; readonly bridge?: boolean } = {},
  ): this {
    this.edges.push({
      a,
      b,
      kind: 'aligned',
      requiresYaw: yaw,
      ...(options.pitch !== undefined ? { requiresPitch: options.pitch } : {}),
      ...(options.tolerance !== undefined ? { tolerance: options.tolerance } : {}),
      bridge: options.bridge ?? true,
    });
    return this;
  }

  /** A connection gated on a switch flag. */
  flagLink(a: string, b: string, flag: string, whenOn = true): this {
    this.edges.push({
      a,
      b,
      kind: 'fixed',
      ...(whenOn ? { requiresFlag: flag } : { requiresFlagOff: flag }),
      bridge: true,
    });
    return this;
  }

  /** A connection available only while a moving assembly is in position. */
  phaseLink(
    a: string,
    b: string,
    group: string,
    window: readonly [number, number],
  ): this {
    this.edges.push({ a, b, kind: 'fixed', phaseGroup: group, requiresPhase: window });
    return this;
  }

  /** Both an alignment and a flag requirement — Chapter 5 territory. */
  alignedFlagLink(a: string, b: string, yaw: number, flag: string): this {
    this.edges.push({
      a,
      b,
      kind: 'aligned',
      requiresYaw: yaw,
      requiresFlag: flag,
      bridge: true,
    });
    return this;
  }

  group(def: GroupDef): this {
    this.groups.push(def);
    return this;
  }

  switchAt(id: string, flag: string, node: string, mode: SwitchMode = 'toggle', initial = false): this {
    this.switches.push({ id, flag, node, mode, initial });
    return this;
  }

  start(node: string): this {
    this.startNode = node;
    return this;
  }

  exit(node: string): this {
    this.exitNode = node;
    return this;
  }

  allowPitch(allow = true): this {
    this.pitchAllowed = allow;
    return this;
  }

  hint(text: string): this {
    this.hintText = text;
    return this;
  }

  // ------------------------------------------------------------------- modules

  /**
   * A flat run of tiles. Returns node ids in travel order.
   */
  walkway(
    prefix: string,
    origin: Vec3,
    direction: Direction,
    length: number,
    options: ModuleOptions = {},
  ): string[] {
    const step = directionVector(direction);
    const ids: string[] = [];
    for (let i = 0; i < length; i += 1) {
      const centre = add(origin, step, i);
      if (options.solid !== false) {
        this.decor({
          shape: 'box',
          pos: centre,
          tone: options.tone ?? 'base',
          ...(options.group ? { group: options.group } : {}),
        });
      }
      const id = `${prefix}${i}`;
      this.node(id, surfaceOf(centre), options);
      ids.push(id);
    }
    if (options.chain !== false) {
      for (let i = 1; i < ids.length; i += 1) this.link(ids[i - 1], ids[i]);
    }
    return ids;
  }

  /**
   * A rising run of tiles, one unit of height per step. Returns node ids from
   * bottom to top.
   */
  staircase(
    prefix: string,
    origin: Vec3,
    direction: Direction,
    steps: number,
    options: ModuleOptions & { readonly rise?: number } = {},
  ): string[] {
    const step = directionVector(direction);
    const rise = options.rise ?? 1;
    const ids: string[] = [];
    for (let i = 0; i < steps; i += 1) {
      const centre: Vec3 = [
        origin[0] + step[0] * i,
        origin[1] + rise * i,
        origin[2] + step[2] * i,
      ];
      if (options.solid !== false) {
        this.decor({
          shape: 'stair',
          pos: centre,
          rotY: yawForDirection(direction),
          tone: options.tone ?? 'raised',
          ...(options.group ? { group: options.group } : {}),
        });
      }
      const id = `${prefix}${i}`;
      this.node(id, surfaceOf(centre), options);
      ids.push(id);
    }
    if (options.chain !== false) {
      for (let i = 1; i < ids.length; i += 1) this.link(ids[i - 1], ids[i]);
    }
    return ids;
  }

  /**
   * A run walked along the *underside* of a slab — the simplest gravity flip.
   *
   * Nodes sit below their blocks with `up` pointing downward, so the character
   * orients itself to the ceiling. Nothing else in the engine needs to know:
   * "upside down" is entirely a property of the node's normal.
   */
  underside(
    prefix: string,
    origin: Vec3,
    direction: Direction,
    length: number,
    options: Omit<ModuleOptions, 'up'> = {},
  ): string[] {
    const step = directionVector(direction);
    const ids: string[] = [];
    for (let i = 0; i < length; i += 1) {
      const centre = add(origin, step, i);
      if (options.solid !== false) {
        this.decor({
          shape: 'box',
          pos: centre,
          tone: options.tone ?? 'shadow',
          ...(options.group ? { group: options.group } : {}),
        });
      }
      const id = `${prefix}${i}`;
      this.node(id, [centre[0], centre[1] - 0.5, centre[2]], {
        ...options,
        up: [0, -1, 0],
      });
      ids.push(id);
    }
    if (options.chain !== false) {
      for (let i = 1; i < ids.length; i += 1) this.link(ids[i - 1], ids[i]);
    }
    return ids;
  }

  /**
   * A run walked along a vertical face. `face` is the outward normal of the
   * wall and must be perpendicular to `direction`; the nodes stand off the
   * face by half a tile with `up` along it.
   */
  wallway(
    prefix: string,
    origin: Vec3,
    direction: Direction,
    length: number,
    face: Direction,
    options: Omit<ModuleOptions, 'up'> = {},
  ): string[] {
    const step = directionVector(direction);
    const normal = directionVector(face);
    if (step[0] * normal[0] + step[2] * normal[2] !== 0) {
      throw new Error(
        `wallway "${prefix}": direction ${direction} is not perpendicular to face ${face}`,
      );
    }

    const ids: string[] = [];
    for (let i = 0; i < length; i += 1) {
      const centre = add(origin, step, i);
      if (options.solid !== false) {
        this.decor({
          shape: 'box',
          pos: centre,
          tone: options.tone ?? 'raised',
          ...(options.group ? { group: options.group } : {}),
        });
      }
      const id = `${prefix}${i}`;
      this.node(
        id,
        [centre[0] + normal[0] * 0.5, centre[1], centre[2] + normal[2] * 0.5],
        { ...options, up: normal },
      );
      ids.push(id);
    }
    if (options.chain !== false) {
      for (let i = 1; i < ids.length; i += 1) this.link(ids[i - 1], ids[i]);
    }
    return ids;
  }

  /**
   * A rectangular pad. Nodes are named `${prefix}_${x}_${z}` and chained to
   * their orthogonal neighbours. Returns ids in row-major order.
   */
  pad(
    prefix: string,
    origin: Vec3,
    width: number,
    depth: number,
    options: ModuleOptions = {},
  ): string[] {
    const ids: string[] = [];
    const idAt = (x: number, z: number): string => `${prefix}_${x}_${z}`;
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) {
        const centre: Vec3 = [origin[0] + x, origin[1], origin[2] + z];
        if (options.solid !== false) {
          this.decor({
            shape: 'platform',
            pos: centre,
            tone: options.tone ?? 'base',
            ...(options.group ? { group: options.group } : {}),
          });
        }
        this.node(idAt(x, z), surfaceOf(centre), options);
        ids.push(idAt(x, z));
      }
    }
    if (options.chain !== false) {
      for (let x = 0; x < width; x += 1) {
        for (let z = 0; z < depth; z += 1) {
          if (x + 1 < width) this.link(idAt(x, z), idAt(x + 1, z));
          if (z + 1 < depth) this.link(idAt(x, z), idAt(x, z + 1));
        }
      }
    }
    return ids;
  }

  /**
   * A ring of tiles around a centre — the classic rotating carousel. Pair with
   * a `spin` group to make a Chapter 2 moving platform.
   */
  ring(
    prefix: string,
    centre: Vec3,
    radius: number,
    count: number,
    options: ModuleOptions = {},
  ): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const pos: Vec3 = [
        centre[0] + Math.cos(angle) * radius,
        centre[1],
        centre[2] + Math.sin(angle) * radius,
      ];
      if (options.solid !== false) {
        this.decor({
          shape: 'platform',
          pos,
          rotY: (-angle * 180) / Math.PI,
          tone: options.tone ?? 'accent',
          ...(options.group ? { group: options.group } : {}),
        });
      }
      const id = `${prefix}${i}`;
      this.node(id, surfaceOf(pos), options);
      ids.push(id);
    }
    if (options.chain !== false) {
      for (let i = 0; i < ids.length; i += 1) {
        this.link(ids[i], ids[(i + 1) % ids.length]);
      }
    }
    return ids;
  }

  /** Purely decorative support column, for visual mass beneath a structure. */
  pillar(at: Vec3, height: number, tone: BlockTone = 'shadow', group?: string): this {
    for (let i = 0; i < height; i += 1) {
      this.decor({
        shape: 'pillar',
        pos: [at[0], at[1] - i, at[2]],
        tone,
        ...(group ? { group } : {}),
      });
    }
    return this;
  }

  /** Decorative arch spanning a gap — sells an impossible join visually. */
  arch(origin: Vec3, direction: Direction, span: number, tone: BlockTone = 'raised'): this {
    const step = directionVector(direction);
    for (let i = 0; i < span; i += 1) {
      const lift = Math.sin(((i + 0.5) / span) * Math.PI) * 1.4;
      this.decor({
        shape: 'arch',
        pos: [origin[0] + step[0] * i, origin[1] + lift, origin[2] + step[2] * i],
        rotY: yawForDirection(direction),
        tone,
      });
    }
    return this;
  }

  /** Floating crystal accents — atmosphere only. */
  crystals(positions: readonly Vec3[], tone: BlockTone = 'glow'): this {
    for (const pos of positions) {
      this.decor({ shape: 'crystal', pos, tone, size: [0.4, 0.9, 0.4] });
    }
    return this;
  }

  // --------------------------------------------------------------------- build

  build(): Level {
    if (!this.startNode) throw new Error(`Level "${this.id}" has no start node`);
    if (!this.exitNode) throw new Error(`Level "${this.id}" has no exit node`);
    return {
      id: this.id,
      chapter: this.chapter,
      index: this.index,
      name: this.name,
      blocks: this.blocks,
      nodes: this.nodes,
      edges: this.edges,
      ...(this.groups.length > 0 ? { groups: this.groups } : {}),
      ...(this.switches.length > 0 ? { switches: this.switches } : {}),
      start: this.startNode,
      exit: this.exitNode,
      ...(this.pitchAllowed ? { allowPitch: true } : {}),
      ...(this.hintText ? { hint: this.hintText } : {}),
    };
  }
}

export function yawForDirection(direction: Direction): number {
  switch (direction) {
    case 'x+':
      return 0;
    case 'z+':
      return 90;
    case 'x-':
      return 180;
    case 'z-':
      return 270;
  }
}
