/**
 * Core domain types for Perspective Shift.
 *
 * The central idea: visual geometry (`Block`) and the walkable graph
 * (`WalkNode` + `Edge`) are completely separate. Blocks only exist to sell the
 * illusion and cast shadows; gameplay never reads them. All traversal logic
 * reads the explicit graph, which is what makes impossible geometry, gravity
 * flips and moving platforms expressible as data rather than special cases.
 */

export type Vec3 = readonly [number, number, number];

/**
 * Decorative geometry. Never consulted by gameplay.
 *
 * Every shape must have an entry in `SHAPE_GEOMETRY` in `Structure.tsx`, which
 * also defines the vertical offset keeping its walking surface aligned with
 * where the authoring kit places nodes. Adding a shape here without one is a
 * type error rather than an invisible block.
 */
export type BlockShape = 'box' | 'stair' | 'arch' | 'pillar' | 'platform' | 'crystal';

export interface Block {
  readonly shape: BlockShape;
  /** Position in structure-local space. */
  readonly pos: Vec3;
  readonly size?: Vec3;
  /** Y rotation in degrees. */
  readonly rotY?: number;
  /** Rotation about X in degrees — used for flipped/overhanging decoration. */
  readonly rotX?: number;
  /** Id of the animated sub-assembly this block rides on. */
  readonly group?: string;
  /** Palette slot override. */
  readonly tone?: BlockTone;
}

/** Which palette slot a block draws its colour from. */
export type BlockTone = 'base' | 'raised' | 'accent' | 'shadow' | 'glow';

/** A walkable point in the graph. */
export interface WalkNode {
  readonly id: string;
  readonly pos: Vec3;
  /**
   * Surface normal the character stands against. Defaults to [0,1,0].
   * Gravity-flip sections are expressed purely by giving nodes a different
   * `up`, which the character orients itself to while walking.
   */
  readonly up?: Vec3;
  readonly group?: string;
}

export type EdgeKind = 'fixed' | 'aligned';

/**
 * A traversable link between two nodes. Edges are bidirectional.
 *
 * `fixed` edges are always walkable. `aligned` edges are the illusion: they
 * only become walkable when the structure's rotation matches `requiresYaw`
 * (and optionally `requiresPitch`) within `tolerance` degrees.
 */
export interface Edge {
  readonly a: string;
  readonly b: string;
  readonly kind: EdgeKind;
  /** Required structure yaw in degrees, compared modulo 360. */
  readonly requiresYaw?: number;
  /** Required structure pitch in degrees. */
  readonly requiresPitch?: number;
  /** Angular slack in degrees. Defaults to {@link DEFAULT_ANGLE_TOLERANCE}. */
  readonly tolerance?: number;
  /** Edge is only active while this flag is set. */
  readonly requiresFlag?: string;
  /** Edge is only active while this flag is unset. */
  readonly requiresFlagOff?: string;
  /**
   * Edge is only active while the referenced group's cycle position lies in
   * this inclusive [start, end] window, each in 0..1. Wrapping windows
   * (start > end) are supported.
   */
  readonly requiresPhase?: readonly [number, number];
  /** Group whose phase `requiresPhase` refers to. */
  readonly phaseGroup?: string;
  /** Render a glowing bridge beam along this edge while it is active. */
  readonly bridge?: boolean;
}

/** An animated sub-assembly. Blocks and nodes tagged with its id ride along. */
export type GroupMotion = 'none' | 'slide' | 'spin' | 'elevator' | 'orbit';

export interface GroupDef {
  readonly id: string;
  readonly motion: GroupMotion;
  /** Seconds for one full cycle. */
  readonly period?: number;
  /** Normalised 0..1 offset into the cycle at level start. */
  readonly phaseOffset?: number;
  /** `slide` / `elevator`: travel endpoints in local space. */
  readonly from?: Vec3;
  readonly to?: Vec3;
  /** `spin` / `orbit`: axis of rotation. */
  readonly axis?: Vec3;
  /** `spin` / `orbit`: pivot point in local space. */
  readonly pivot?: Vec3;
  /** `spin` / `orbit`: degrees swept over a full cycle. */
  readonly sweep?: number;
  /** Group only animates while this flag is set. */
  readonly requiresFlag?: string;
}

export type SwitchMode = 'toggle' | 'once';

export interface SwitchDef {
  readonly id: string;
  /** The flag this switch drives. */
  readonly flag: string;
  /** Node the character must stand on to operate the switch. */
  readonly node: string;
  readonly mode: SwitchMode;
  readonly initial?: boolean;
}

export interface Level {
  readonly id: string;
  readonly chapter: number;
  /** 1-based position within the chapter. */
  readonly index: number;
  readonly name: string;
  readonly blocks: readonly Block[];
  readonly nodes: readonly WalkNode[];
  readonly edges: readonly Edge[];
  readonly groups?: readonly GroupDef[];
  readonly switches?: readonly SwitchDef[];
  readonly start: string;
  readonly exit: string;
  /** Whether the player may rotate about X as well as Y. */
  readonly allowPitch?: boolean;
  /** Target rotation count for a 3-star rating. Computed if omitted. */
  readonly parRotations?: number;
  /** One-line nudge shown by the hint system. */
  readonly hint?: string;
}

/** Everything the connection predicate needs to decide edge activity. */
export interface WorldState {
  /** Structure yaw in degrees. */
  readonly yaw: number;
  /** Structure pitch in degrees. */
  readonly pitch: number;
  readonly flags: Readonly<Record<string, boolean>>;
  /** Group id -> cycle position in 0..1. */
  readonly phases: Readonly<Record<string, number>>;
}

export const DEFAULT_ANGLE_TOLERANCE = 7.5;

/** Rotation snap increment in degrees. */
export const SNAP_DEGREES = 15;

export interface ChapterPalette {
  readonly base: string;
  readonly raised: string;
  readonly accent: string;
  readonly shadow: string;
  readonly glow: string;
  readonly fog: string;
  readonly sky: string;
  /** Background gradient stops for the HUD / letterboxing. */
  readonly gradient: readonly [string, string];
}

export interface Chapter {
  readonly id: number;
  readonly name: string;
  readonly subtitle: string;
  readonly palette: ChapterPalette;
  /** Scale degrees used by the ambient pad generator. */
  readonly scale: readonly number[];
  /** Root note for the chapter's ambient key. */
  readonly root: string;
}
