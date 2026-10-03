/**
 * Per-level mutable runtime.
 *
 * Rotation and platform phase change every frame. Holding them in React state
 * would re-render the whole scene sixty times a second, so they live here in a
 * plain mutable object that `useFrame` advances and reads directly, mutating
 * three.js transforms in place.
 *
 * The store keeps only *discrete* state — which node the character stands on,
 * switch flags, rotation count, level status — because those change rarely and
 * genuinely should re-render the UI. Flags are read through a getter so there
 * is exactly one source of truth for them.
 */

import { advancePhase, applyGroupTransform, groupTransform, IDENTITY_TRANSFORM } from '@/systems/groups';
import {
  createRotationController,
  isSettled,
  snapAngle,
  snapIndex,
  type RotationController,
} from '@/systems/rotation';
import type { GroupDef, Level, Vec3, WalkNode, WorldState } from '@/types';

export type FlagReader = () => Readonly<Record<string, boolean>>;

export class WorldRuntime {
  readonly rotation: RotationController;
  readonly phases: Record<string, number> = {};

  private readonly nodesById: Map<string, WalkNode>;
  private readonly groupsById: Map<string, GroupDef>;

  constructor(
    readonly level: Level,
    private readonly readFlags: FlagReader,
  ) {
    this.rotation = createRotationController();
    this.nodesById = new Map(level.nodes.map((node) => [node.id, node]));
    this.groupsById = new Map((level.groups ?? []).map((group) => [group.id, group]));
    for (const group of level.groups ?? []) {
      this.phases[group.id] = group.phaseOffset ?? 0;
    }
  }

  get allowPitch(): boolean {
    return this.level.allowPitch === true;
  }

  /** Snapped yaw — the only yaw gameplay ever sees. */
  get yaw(): number {
    return snapAngle(this.rotation.visualYaw);
  }

  get pitch(): number {
    return this.allowPitch ? snapAngle(this.rotation.visualPitch) : 0;
  }

  get yawIndex(): number {
    return snapIndex(this.rotation.visualYaw);
  }

  get pitchIndex(): number {
    return this.allowPitch ? snapIndex(this.rotation.visualPitch) : 0;
  }

  get settled(): boolean {
    return isSettled(this.rotation, this.allowPitch);
  }

  /**
   * The authoritative world state: snapped angles, current flags, live phases.
   * Identical in form to what the solvability checker reasons about, so what
   * the player can do is exactly what was proved possible.
   */
  worldState(): WorldState {
    return {
      yaw: this.yaw,
      pitch: this.pitch,
      flags: this.readFlags(),
      phases: this.phases,
    };
  }

  /**
   * World state at the *continuous* rotation. Used only for visual effects —
   * never for deciding whether the character may move.
   */
  visualWorldState(): WorldState {
    return {
      yaw: this.rotation.visualYaw,
      pitch: this.allowPitch ? this.rotation.visualPitch : 0,
      flags: this.readFlags(),
      phases: this.phases,
    };
  }

  /** Advance continuous state by one frame. */
  tick(dt: number): void {
    const flags = this.readFlags();
    for (const group of this.level.groups ?? []) {
      // A group gated on a flag holds still until that flag is set — the case
      // the solvability checker models explicitly.
      if (group.requiresFlag !== undefined && flags[group.requiresFlag] !== true) continue;
      this.phases[group.id] = advancePhase(group, this.phases[group.id] ?? 0, dt);
    }
  }

  node(id: string): WalkNode | undefined {
    return this.nodesById.get(id);
  }

  /** Transform currently applied to a group, or identity for a static one. */
  transformFor(groupId: string | undefined) {
    if (!groupId) return IDENTITY_TRANSFORM;
    const group = this.groupsById.get(groupId);
    if (!group) return IDENTITY_TRANSFORM;
    return groupTransform(group, this.phases[group.id] ?? 0);
  }

  /**
   * A node's position in structure-local space, accounting for any moving
   * assembly it rides on. This is what the character actually walks toward.
   */
  nodePosition(id: string): Vec3 {
    const node = this.nodesById.get(id);
    if (!node) return [0, 0, 0];
    if (!node.group) return node.pos;
    return applyGroupTransform(node.pos, this.transformFor(node.group));
  }

  /** The surface normal the character stands against at a node. */
  nodeUp(id: string): Vec3 {
    return this.nodesById.get(id)?.up ?? [0, 1, 0];
  }
}
